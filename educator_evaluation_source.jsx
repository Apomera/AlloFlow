/**
 * AlloFlow Educator Growth & Evaluation, in service, not a prototype.
 *
 * One React surface is used by the Leadership Hub modal, the standalone
 * principal-facing shell, and the authenticated district portal, with
 * framework profiles for Pennsylvania Act 13, Portland (Maine), and Maine PEPG.
 *
 * Two deployments, one workflow. WITH an injected repository it is the
 * district's shared, authenticated record store. WITHOUT one it stores in the
 * signed-in browser profile on that device only, real working records, not a
 * sample. Storage is scoped to the profile and never uploaded; AlloFlow adds
 * no encryption of its own, so it inherits whatever the device provides
 * (managed ChromeOS/Windows fleets encrypt the user profile at rest).
 *
 * Two claims stay true in every deployment and must NOT be edited away for
 * confidence: AlloFlow adds no encryption of its own, and no deployment makes
 * this a state-approved instrument (PDE approves instruments, not software).
 * Equally, do not re-add prototype framing, this tool is in service.
 * Both directions pinned by tests/educator_evaluation_in_service.test.js.
 *
 * Note on the legal frame (2026-08-17): these are PERSONNEL records, so FERPA
 *, which governs student education records, is largely the wrong lens. What
 * governs is state personnel-records law, collective bargaining agreements,
 * and district retention/discoverability policy.
 *
 * The component names below follow Pennsylvania's June 2021 classroom-teacher
 * framework. Full Danielson rubric descriptors are intentionally not embedded;
 * they require separate licensing/permission for use in a digital product.
 */

const AE_STORAGE_KEY = 'allo_educator_evaluation_workspace_v1';
const AE_ONBOARDING_KEY = 'allo_educator_evaluation_onboarding_v1';
const AE_EXPORT_KIND = 'alloflow-educator-evaluation-workspace';

// The evaluation surface is also shipped as a standalone bundle, so its
// copy needs a local fallback even when the host has no language service.  The
// host can inject the normal AlloFlow translator through `t` on the panel
// props.  Keeping this adapter module-local lets every child surface use the
// same translator without prop-drilling it through the ten workflow tabs.
let AE_TRANSLATOR = null;
function t(key, fallback) {
  let value = null;
  try { value = typeof AE_TRANSLATOR === 'function' ? AE_TRANSLATOR(key) : null; } catch (_) { value = null; }
  return value == null || value === key ? (fallback == null ? key : fallback) : value;
}
function aeSetTranslator(translator) {
  AE_TRANSLATOR = typeof translator === 'function' ? translator : null;
}
// ── Educator packets ────────────────────────────────────────────────────────────────────
// A packet is one educator's own evaluation, sent as an email attachment so a principal can
// share it without a district portal deployment. It ships as HTML with the data embedded in a
// script tag: opened directly it renders as a readable evaluation, and imported into AlloFlow
// it round-trips as structured records. Plain .json was the obvious choice but is stripped by
// some district mail filters, and an attachment nobody can open without the tool is worse for
// the educator than one they can just read.
const AE_PACKET_KIND = 'alloflow-educator-evaluation-packet';
const AE_PACKET_SCRIPT_ID = 'allo-evaluation-packet';
// Packet construction is a disclosure boundary, not merely a teacher-id filter. Every list is
// deliberately positive: adding a field to a workspace record never makes it leave the device
// until it is reviewed here and explicitly added to the appropriate release-state allow-list.
const AE_PACKET_TEACHER_FIELDS = ['educatorStatement', 'annualRationales', 'annualEvidenceRefs'];
const AE_PACKET_STATEMENT_FIELDS = ['text'];
const AE_PACKET_RECORD_FIELDS = ['reflection', 'acknowledged'];
const AE_PACKET_PROFILE_FIELDS = ['id', 'code', 'name', 'building', 'assignment', 'employeeType', 'evaluator', 'dueDate', 'cycleStatus', 'frameworkVersion'];
const AE_PACKET_WALKTHROUGH_FIELDS = ['id', 'teacherId', 'date', 'startedAt', 'durationMin', 'announced', 'lessonPhase', 'subject', 'evidence', 'interpretation', 'componentTags', 'publishedAt', 'teacherAcknowledgedAt', 'version'];
const AE_PACKET_OBSERVATION_BASE_FIELDS = ['id', 'teacherId', 'createdAt', 'frameworkVersion', 'version', 'preConferenceAt', 'observedAt'];
const AE_PACKET_PREWORK_FIELDS = ['plan', 'outcomes', 'resources', 'assessment', 'artifactReferences'];
const AE_PACKET_DOMAIN_FIELDS = ['d1', 'd2', 'd3', 'd4'];
const AE_PACKET_SPM_BASE_FIELDS = ['id', 'teacherId', 'createdAt', 'status', 'version'];
const AE_PACKET_SPM_PLAN_FIELDS = ['context', 'baseline', 'goal', 'measures', 'actionPlan'];
const AE_PACKET_COMMENT_FIELDS = ['id', 'teacherId', 'recordType', 'recordId', 'text', 'role', 'author', 'at', 'version'];
const AE_PACKET_RESPONSE_COMMENT_FIELDS = ['id', 'recordType', 'recordId', 'text'];
function aePacketPick(source, fields) {
  const value = source && typeof source === 'object' ? source : {};
  const picked = {};
  (fields || []).forEach(function (field) {
    if (!Object.prototype.hasOwnProperty.call(value, field) || value[field] == null) return;
    picked[field] = JSON.parse(JSON.stringify(value[field]));
  });
  return picked;
}
function aePacketEmbed(json) {
  // Escape '<' so the payload can never close the host script element early. The replacement
  // must be the literal six-character sequence, not '<', which is simply '<' again.
  return String(json).split('<').join('\\u003c');
}
function aePacketExtract(text) {
  // Index-based rather than a built RegExp: the string form needed doubled backslashes and
  // silently compiled to ([sS]*?), which matches only the letters s and S.
  const raw = String(text == null ? '' : text).trim();
  if (raw.charAt(0) === '{') return raw;
  const marker = raw.indexOf('id="' + AE_PACKET_SCRIPT_ID + '"');
  if (marker === -1) return raw;
  const opens = raw.indexOf('>', marker);
  const closes = raw.indexOf('</' + 'script>', opens);
  if (opens === -1 || closes === -1) return raw;
  return raw.slice(opens + 1, closes).trim();
}


// Runs inside the emailed attachment, not in AlloFlow. It reads the embedded packet, collects
// the educator's own words, and downloads a response file. No network, no storage, no account.
const AE_PACKET_FORM_JS = [
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
  '})();',
].join('');
function aeEducatorPacket(workspace, teacherId, options) {
  const opts = options || {};
  const source = workspace || {};
  const teacher = (source.teachers || []).filter(function (item) { return item && item.id === teacherId; })[0];
  if (!teacher) return null;
  const mine = function (list) {
    return (list || []).filter(function (item) { return item && item.teacherId === teacherId; });
  };
  const sourceStamp = function (item, fallback) { return item.updatedAt || fallback || null; };
  const packetTeacher = aePacketPick(teacher, AE_PACKET_PROFILE_FIELDS);
  if (teacher.educatorStatement && typeof teacher.educatorStatement.text === 'string' && teacher.educatorStatement.text) {
    packetTeacher.educatorStatement = {
      text: teacher.educatorStatement.text,
      updatedAt: teacher.educatorStatement.updatedAt || null,
    };
  }
  // Annual ratings are released only after the cycle itself has been finalized. Before that,
  // draft summative inputs remain evaluator work even if other records have been published.
  if (teacher.finalizedAt) {
    const teacherRatings = teacher.ratings || {};
    packetTeacher.finalizedAt = teacher.finalizedAt;
    packetTeacher.finalScore = teacher.finalScore == null ? null : teacher.finalScore;
    packetTeacher.ratings = {
      domains: aePacketPick(teacherRatings.domains, AE_PACKET_DOMAIN_FIELDS),
      building: teacherRatings.building == null ? null : teacherRatings.building,
      teacher: teacherRatings.teacher == null ? null : teacherRatings.teacher,
      lea: teacherRatings.lea == null ? null : teacherRatings.lea,
    };
    const annualRationales = aePacketPick(teacher.annualRationales, AE_PACKET_DOMAIN_FIELDS);
    const annualEvidenceRefs = {};
    AE_PACKET_DOMAIN_FIELDS.forEach(function (domainId) {
      annualEvidenceRefs[domainId] = (Array.isArray(teacher.annualEvidenceRefs && teacher.annualEvidenceRefs[domainId])
        ? teacher.annualEvidenceRefs[domainId] : []).filter(function (token) {
          return /^(walkthrough|formal_observation|spm):[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(String(token || ''));
        }).slice(0, 100);
    });
    const hasAnnualProvenance = AE_PACKET_DOMAIN_FIELDS.some(function (domainId) {
      return String(annualRationales[domainId] || '').trim() || annualEvidenceRefs[domainId].length;
    });
    // Historical finalized cycles predate annual provenance. Omit an entirely empty pair so the
    // hardened share helper can distinguish those legacy records from an incomplete new release.
    if (hasAnnualProvenance) {
      packetTeacher.annualRationales = annualRationales;
      packetTeacher.annualEvidenceRefs = annualEvidenceRefs;
    }
  }
  const config = source.config || {};
  if (!opts.includeNames) {
    packetTeacher.name = packetTeacher.code || 'Educator';
    packetTeacher.evaluator = 'Evaluator';
  }
  const walkthroughs = mine(source.walkthroughs).filter(function (item) {
    return !!item.publishedAt;
  }).map(function (item) {
    const copy = aePacketPick(item, AE_PACKET_WALKTHROUGH_FIELDS);
    copy.sourceUpdatedAt = sourceStamp(item, item.publishedAt);
    return copy;
  });
  const observations = mine(source.observations).map(function (item) {
    const copy = aePacketPick(item, AE_PACKET_OBSERVATION_BASE_FIELDS);
    if (item.preworkSubmittedAt) {
      copy.prework = aePacketPick(item.prework, AE_PACKET_PREWORK_FIELDS);
      copy.preworkSubmittedAt = item.preworkSubmittedAt;
    }
    if (item.evidencePublishedAt) {
      copy.evidence = item.evidence || '';
      copy.componentTags = Array.isArray(item.componentTags) ? item.componentTags.slice() : [];
      copy.evidencePublishedAt = item.evidencePublishedAt;
    }
    if (item.reflectionSubmittedAt) {
      copy.reflection = item.reflection || '';
      copy.reflectionSubmittedAt = item.reflectionSubmittedAt;
    }
    if (item.postConferenceAt) {
      copy.postConferenceNotes = item.postConferenceNotes || '';
      copy.postConferenceAt = item.postConferenceAt;
    }
    if (item.evaluatorSignedAt) {
      copy.ratings = aePacketPick(item.ratings, AE_PACKET_DOMAIN_FIELDS);
      copy.rationales = aePacketPick(item.rationales, AE_PACKET_DOMAIN_FIELDS);
      copy.evaluatorSignedAt = item.evaluatorSignedAt;
    }
    if (item.teacherAcknowledgedAt) copy.teacherAcknowledgedAt = item.teacherAcknowledgedAt;
    if (item.finalizedAt) copy.finalizedAt = item.finalizedAt;
    copy.sourceUpdatedAt = sourceStamp(item, item.evidencePublishedAt || item.evaluatorSignedAt || item.createdAt);
    return copy;
  });
  const spms = mine(source.spms).filter(function (item) {
    return item.status && item.status !== 'draft';
  }).map(function (item) {
    const copy = aePacketPick(item, AE_PACKET_SPM_BASE_FIELDS);
    // A returned plan may contain a new, unsubmitted draft. Use the most recent submitted
    // revision when available rather than copying the mutable working fields.
    const revisions = Array.isArray(item.revisions) ? item.revisions.filter(function (entry) { return entry && entry.submittedAt; }) : [];
    const submitted = revisions.length ? revisions[revisions.length - 1] : item;
    Object.assign(copy, aePacketPick(submitted, AE_PACKET_SPM_PLAN_FIELDS));
    copy.submittedAt = submitted.submittedAt || item.submittedAt || null;
    if (item.returnedAt) {
      copy.returnedAt = item.returnedAt;
      copy.returnReason = item.returnReason || '';
    }
    if (item.approvedAt) {
      copy.approvedAt = item.approvedAt;
      copy.approvedBy = opts.includeNames ? (item.approvedBy || 'Evaluator') : 'Evaluator';
    }
    if (item.resultsSubmittedAt) {
      copy.resultsSubmittedAt = item.resultsSubmittedAt;
      copy.results = item.results || '';
      copy.reflection = item.reflection || '';
    }
    if (item.lockedAt) {
      copy.lockedAt = item.lockedAt;
      copy.rating = item.rating == null ? null : item.rating;
      copy.ratingRationale = item.ratingRationale || '';
    }
    copy.sourceUpdatedAt = sourceStamp(item, item.lockedAt || item.resultsSubmittedAt || copy.submittedAt);
    return copy;
  });
  const visible = {
    walkthrough: new Set(walkthroughs.map(function (item) { return item.id; })),
    formal_observation: new Set(observations.map(function (item) { return item.id; })),
    spm: new Set(spms.map(function (item) { return item.id; })),
  };
  const comments = mine(source.comments).filter(function (item) {
    return item && visible[item.recordType] && visible[item.recordType].has(item.recordId);
  }).map(function (item) {
    const copy = aePacketPick(item, AE_PACKET_COMMENT_FIELDS);
    if (!opts.includeNames) copy.author = item.role === 'Teacher' ? 'Educator' : 'Evaluator';
    return copy;
  });
  return {
    kind: AE_PACKET_KIND,
    version: 1,
    packetType: 'educator',
    packetId: aeId('packet'),
    issuedAt: aeNow(),
    teacherId: teacherId,
    includeNames: !!opts.includeNames,
    config: {
      organization: config.organization || '',
      academicYear: config.academicYear || '',
      evaluatorName: opts.includeNames ? (config.evaluatorName || '') : 'Evaluator',
      frameworkProfile: config.frameworkProfile || 'maine_pepg',
    },
    teachers: [packetTeacher],
    walkthroughs: walkthroughs,
    observations: observations,
    spms: spms,
    comments: comments,
  };
}

function aeResponsePacket(workspace, teacherId, sourcePacketId) {
  const source = workspace || {};
  const teacher = (source.teachers || []).filter(function (item) { return item && item.id === teacherId; })[0];
  if (!teacher) return null;
  const records = [];
  ['walkthroughs', 'observations'].forEach(function (collection) {
    (source[collection] || []).forEach(function (item) {
      if (!item || item.teacherId !== teacherId) return;
      const entry = { collection: collection, recordId: item.id, sourceUpdatedAt: item.sourceUpdatedAt || item.updatedAt || item.publishedAt || null };
      let carries = false;
      if (collection === 'observations' && item.reflectionSubmittedAt && typeof item.reflection === 'string' && item.reflection.trim()) {
        entry.reflection = item.reflection.trim();
        carries = true;
      }
      if (item.teacherAcknowledgedAt) {
        entry.acknowledged = true;
        carries = true;
      }
      if (carries) records.push(entry);
    });
  });
  return {
    kind: AE_PACKET_KIND,
    version: 1,
    packetType: 'response',
    packetId: aeId('packet'),
    sourcePacketId: sourcePacketId || '',
    issuedAt: aeNow(),
    teacherId: teacherId,
    educatorStatement: teacher.educatorStatement && teacher.educatorStatement.text ? { text: teacher.educatorStatement.text } : null,
    records: records,
    comments: (source.comments || []).filter(function (item) {
      return item && item.teacherId === teacherId && item.role === 'Teacher' && item.text;
    }).map(function (item) { return aePacketPick(item, AE_PACKET_RESPONSE_COMMENT_FIELDS); }),
  };
}

// Applies ONLY the educator-owned fields. A response file is hand-editable JSON, so anything
// outside the allow-lists is counted and dropped rather than written. `stale` reports records
// the evaluator changed after the packet was issued, so a correction made in response to the
// educator is visible instead of silently overwriting what they replied to.
function aeMergeResponsePacket(workspace, packet) {
  const result = { applied: 0, ignored: 0, stale: [], teacherId: '', ok: false };
  if (!workspace || !packet || packet.kind !== AE_PACKET_KIND || Number(packet.version) !== 1 || packet.packetType !== 'response') return result;
  const teacherId = packet.teacherId;
  const teacher = (workspace.teachers || []).filter(function (item) { return item && item.id === teacherId; })[0];
  if (!teacher) return result;
  result.ok = true;
  result.teacherId = teacherId;
  const importedAt = aeNow();
  const statement = packet.educatorStatement;
  if (statement && typeof statement.text === 'string' && statement.text.trim()) {
    Object.keys(statement).forEach(function (key) {
      if (AE_PACKET_STATEMENT_FIELDS.indexOf(key) === -1) result.ignored += 1;
    });
    if (teacher.finalizedAt) result.ignored += 1;
    else {
      teacher.educatorStatement = { text: statement.text.trim().slice(0, 20000), updatedAt: importedAt };
      result.applied += 1;
    }
  }
  (Array.isArray(packet.records) ? packet.records : []).slice(0, 5000).forEach(function (entry) {
    const list = entry && workspace[entry.collection];
    if (!Array.isArray(list)) { result.ignored += 1; return; }
    const record = list.filter(function (item) {
      return item && item.id === entry.recordId && item.teacherId === teacherId;
    })[0];
    if (!record) { result.ignored += 1; return; }
    const liveStamp = record.updatedAt || record.publishedAt || null;
    if (entry.sourceUpdatedAt && liveStamp && entry.sourceUpdatedAt !== liveStamp) result.stale.push(entry.recordId);
    const applyAcknowledgement = function () {
      const canAcknowledgeWalkthrough = entry.collection === 'walkthroughs' && !!record.publishedAt;
      const canAcknowledgeObservation = entry.collection === 'observations' && !!record.evaluatorSignedAt && !record.finalizedAt;
      if (record.teacherAcknowledgedAt) return;
      if (!canAcknowledgeWalkthrough && !canAcknowledgeObservation) { result.ignored += 1; return; }
      record.teacherAcknowledgedAt = importedAt;
      result.applied += 1;
    };
    const legacyAcknowledgement = !Object.prototype.hasOwnProperty.call(entry, 'acknowledged')
      && typeof entry.teacherAcknowledgedAt === 'string' && !!entry.teacherAcknowledgedAt;
    Object.keys(entry).forEach(function (key) {
      if (key === 'collection' || key === 'recordId' || key === 'sourceUpdatedAt') return;
      if (AE_PACKET_RECORD_FIELDS.indexOf(key) === -1) { result.ignored += 1; return; }
      if (key === 'reflection') {
        const text = typeof entry.reflection === 'string' ? entry.reflection.trim().slice(0, 30000) : '';
        const eligible = entry.collection === 'observations' && !!record.evidencePublishedAt
          && !record.reflectionSubmittedAt && !record.postConferenceAt && !record.evaluatorSignedAt && !record.finalizedAt;
        if (!text || !eligible) { result.ignored += 1; return; }
        record.reflection = text;
        record.reflectionSubmittedAt = importedAt;
        result.applied += 1;
        return;
      }
      if (key === 'acknowledged') {
        if (entry.acknowledged !== true) { result.ignored += 1; return; }
        applyAcknowledgement();
      }
    });
    // v1 packets issued by earlier builds used a client timestamp as the acknowledgement field.
    // Preserve the educator's intent for those packets, but discard the supplied time and stamp
    // the action here after the same release-state checks used by the current boolean contract.
    if (legacyAcknowledgement) applyAcknowledgement();
  });
  (Array.isArray(packet.comments) ? packet.comments : []).slice(0, 5000).forEach(function (comment) {
    if (!comment || typeof comment.text !== 'string' || !comment.text.trim()) { result.ignored += 1; return; }
    Object.keys(comment).forEach(function (key) {
      if (AE_PACKET_RESPONSE_COMMENT_FIELDS.indexOf(key) === -1) result.ignored += 1;
    });
    const collection = { walkthrough: 'walkthroughs', formal_observation: 'observations', spm: 'spms' }[comment.recordType];
    const records = collection && workspace[collection];
    const parent = Array.isArray(records) ? records.filter(function (item) {
      return item && item.id === comment.recordId && item.teacherId === teacherId;
    })[0] : null;
    const released = parent && (comment.recordType === 'formal_observation'
      || (comment.recordType === 'walkthrough' && !!parent.publishedAt)
      || (comment.recordType === 'spm' && parent.status && parent.status !== 'draft'));
    if (!released) { result.ignored += 1; return; }
    if (!Array.isArray(workspace.comments)) workspace.comments = [];
    const suppliedId = typeof comment.id === 'string' && /^[a-zA-Z0-9._:-]{1,100}$/.test(comment.id) ? comment.id : '';
    if (suppliedId && workspace.comments.some(function (item) { return item && item.id === suppliedId; })) return;
    workspace.comments.push({
      id: suppliedId || aeId('comment'), recordType: comment.recordType, recordId: comment.recordId,
      teacherId: teacherId, text: comment.text.trim().slice(0, 3000), role: 'Teacher',
      author: teacher.name || teacher.code || 'Educator', at: importedAt, version: 1,
    });
    result.applied += 1;
  });
  return result;
}

const AE_FRAMEWORK = 'pa-act13-classroom-2021';

// ── Framework profiles (2026-08-16) ─────────────────────────────────────────
// The summative engine was born hardcoded to Pennsylvania Act 13. Profiles
// make the state framework a workspace configuration instead: PA stays the
// default with byte-identical behavior; the Maine PEPG profile reflects that
// Maine evaluation is governed by a LOCAL plan (20-A M.R.S.A. ch. 508 + DOE
// Rule Ch. 180, steering committee with a teacher majority): so its labels
// ship as State-Model defaults with confirm-against-your-plan caveats, and its
// two-category weights are entered by the district, never invented here.
const AE_FRAMEWORKS = {
  pa_act13: {
    id: 'pa_act13',
    name: 'Pennsylvania Act 13 (Danielson 2021)',
    versionTag: 'pa-act13-classroom-2021',
    practiceLabel: 'Observation & Practice',
    practiceShort: 'O&P',
    bands: [
      { min: 2.5, label: 'Distinguished' },
      { min: 1.5, label: 'Proficient' },
      { min: 0.5, label: 'Needs Improvement' },
      { min: 0, label: 'Failing' },
    ],
    domainWeighted: true, // 20/30/30/20 within practice, per 22 Pa. Code § 19.2a
  },
  portland_me: {
    id: 'portland_me',
    name: 'Portland ME (PEPG guidebook)',
    versionTag: 'me-portland-pepg-guidebook-v1',
    practiceLabel: 'Educator Practice',
    practiceShort: 'EP',
    // Guidebook: at least nine pieces per cycle across the full range of practice.
    evidenceTarget: 9,
    // Verified from the district's Educator Evaluation Gradual Implementation
    // Guidebook v1.0 (Portland Framework for Teaching): four levels, // Excellent / Proficient / Novice-Needs Improvement / Unsatisfactory.
    // The band thresholds below serve auxiliary numeric displays only; the
    // guidebook's OFFICIAL practice roll-up is the categorical decision
    // matrix implemented in aePortlandPracticeRating, not any average.
    bands: [
      { min: 2.5, label: 'Excellent' },
      { min: 1.5, label: 'Proficient' },
      { min: 0.5, label: 'Novice/Needs Improvement' },
      { min: 0, label: 'Unsatisfactory' },
    ],
    ratingLabels: { get 0() { return aeTranslatedRubricLabel('Unsatisfactory'); }, get 1() { return aeTranslatedRubricLabel('Novice/Needs Improvement'); }, get 2() { return aeTranslatedRubricLabel('Proficient'); }, get 3() { return aeTranslatedRubricLabel('Excellent'); } },
    domainWeighted: false,
    categoricalRollup: true,
    // Portland Framework for Teaching, Table 1 (22 components).
    components: {
      d1: [['1a', 'Demonstrating Knowledge of Content and Pedagogy'], ['1b', 'Demonstrating Knowledge of Students'], ['1c', 'Setting Instructional Outcomes'], ['1d', 'Demonstrating Knowledge of Resources'], ['1e', 'Designing Coherent Instruction'], ['1f', 'Designing Student Assessments']],
      d2: [['2a', 'Creating an Environment of Respect and Rapport'], ['2b', 'Establishing a Culture for Learning'], ['2c', 'Managing Classroom Procedures'], ['2d', 'Managing Student Behavior'], ['2e', 'Organizing Physical Space']],
      d3: [['3a', 'Communicating with Students'], ['3b', 'Using Questioning and Discussion Techniques'], ['3c', 'Engaging Students in Learning'], ['3d', 'Using Assessment in Instruction'], ['3e', 'Demonstrating Flexibility and Responsiveness']],
      d4: [['4a', 'Reflection on Teaching'], ['4b', 'Maintaining Accurate Records'], ['4c', 'Communicating with Families'], ['4d', 'Participating in a Professional Community'], ['4e', 'Growing and Developing Professionally'], ['4f', 'Showing Professionalism']],
    },
  },
  maine_pepg: {
    id: 'maine_pepg',
    name: 'Maine PEPG (district plan governs)',
    versionTag: 'me-pepg-local',
    practiceLabel: 'Professional Practice',
    practiceShort: 'PP',
    // Default four-level labels follow the Maine State Model. The DISTRICT
    // PEPG plan defines the official levels and cut points; these are display
    // defaults, flagged as such everywhere they appear.
    bands: [
      { min: 2.5, label: 'Distinguished' },
      { min: 1.5, label: 'Effective' },
      { min: 0.5, label: 'Developing' },
      { min: 0, label: 'Ineffective' },
    ],
    // Dropdown labels match the band vocabulary, otherwise a Maine evaluator
    // rates with PA words and reads results in State-Model words.
    ratingLabels: { get 0() { return aeTranslatedRubricLabel('Ineffective'); }, get 1() { return aeTranslatedRubricLabel('Developing'); }, get 2() { return aeTranslatedRubricLabel('Effective'); }, get 3() { return aeTranslatedRubricLabel('Distinguished'); } },
    domainWeighted: false, // no statutory within-practice weights; equal average, labeled as such
  },
};
// Active-framework pointer: refreshed from workspace config at the top of the
// panel render (and at normalize time), so the many small scoring/label
// helpers keep their existing signatures. Single-workspace panel, the pointer
// is always the rendering workspace's framework.
// Guidebook v1.0 domain-to-practice operating principles, verbatim logic:
// Excellent = two+ domains Excellent, remaining no lower than Proficient;
// Unsatisfactory = any domain Unsatisfactory; Novice/Needs Improvement =
// three+ domains at that level; otherwise Proficient. Returns the label and
// the rule that fired, so the UI can show its work.
function aePortlandPracticeRating(domains) {
  const values = AE_DOMAINS.map((domain) => aeNumberOrNull(domains && domains[domain.id]));
  if (values.some((value) => value === null)) return null;
  const levels = values.map((value) => value >= 2.5 ? 3 : value >= 1.5 ? 2 : value >= 0.5 ? 1 : 0);
  const count = (level) => levels.filter((item) => item === level).length;
  if (count(0) > 0) return { label: aeTranslatedRubricLabel('Unsatisfactory'), rule: t("educator_evaluation.any_domain_rated_unsatisfactory_1e3g5i7", 'any domain rated Unsatisfactory') };
  if (count(3) >= 2 && levels.every((level) => level >= 2)) return { label: aeTranslatedRubricLabel('Excellent'), rule: t("educator_evaluation.two_or_more_domains_excellent_none_below_proficient_1k2m4o6", 'two or more domains Excellent, none below Proficient') };
  if (count(1) >= 3) return { label: aeTranslatedRubricLabel('Novice/Needs Improvement'), rule: t("educator_evaluation.three_or_more_domains_at_novice_needs_improvement_1q3s5u7", 'three or more domains at Novice/Needs Improvement') };
  return { label: aeTranslatedRubricLabel('Proficient'), rule: t("educator_evaluation.no_more_than_two_domains_below_proficient_none_unsatisf_1w2y4a6", 'no more than two domains below Proficient, none Unsatisfactory') };
}

let AE_ACTIVE_FW = { ...AE_FRAMEWORKS.maine_pepg, practiceWeight: null };
function aeSetActiveFramework(config) {
  const profile = AE_FRAMEWORKS[config && config.frameworkProfile] || AE_FRAMEWORKS.maine_pepg;
  const rawWeight = config && config.pepgPracticeWeight;
  const weight = rawWeight != null && String(rawWeight) !== '' && Number.isFinite(Number(rawWeight)) && Number(rawWeight) >= 0 && Number(rawWeight) <= 100 ? Math.round(Number(rawWeight)) : null;
  const custom = aeNormalizeRubric(config && config.customRubric);
  if (custom) {
    AE_ACTIVE_FW = {
      ...profile,
      id: 'custom',
      name: custom.name,
      versionTag: custom.versionTag,
      practiceLabel: custom.practiceLabel,
      practiceShort: custom.practiceShort,
      domainWeighted: custom.domainWeighted,
      bands: custom.bands || profile.bands,
      components: null,
      practiceWeight: null,
    };
    AE_DOMAINS = custom.domains;
  } else {
    AE_ACTIVE_FW = { ...profile, practiceWeight: profile.id === 'maine_pepg' ? weight : null };
    AE_DOMAINS = Array.isArray(profile.domains) && profile.domains.length ? profile.domains : AE_DEFAULT_DOMAINS;
  }
  AE_COMPONENTS = aeBuildComponents(AE_DOMAINS);
  return AE_ACTIVE_FW;
}

const AE_DEFAULT_DOMAINS = [
  {
    id: 'd1', code: '1', label: 'Planning and Preparation', weight: 20, color: '#2563eb',
    components: [
      ['1A', 'Knowledge of Content and Pedagogy'],
      ['1B', 'Demonstrating Knowledge of Students'],
      ['1C', 'Setting Instructional Outcomes'],
      ['1D', 'Demonstrating Knowledge of Resources'],
      ['1E', 'Designing Coherent Instruction'],
      ['1F', 'Designing Student Assessment'],
    ],
  },
  {
    id: 'd2', code: '2', label: 'Classroom Environment', weight: 30, color: '#0f766e',
    components: [
      ['2A', 'Creating an Environment of Respect and Rapport'],
      ['2B', 'Establishing a Culture for Learning'],
      ['2C', 'Managing Classroom Procedures'],
      ['2D', 'Managing Student Behavior Expectations'],
      ['2E', 'Organizing Physical and Digital Space'],
    ],
  },
  {
    id: 'd3', code: '3', label: 'Instruction', weight: 30, color: '#7c3aed',
    components: [
      ['3A', 'Communicating with Students'],
      ['3B', 'Questioning and Discussion Techniques'],
      ['3C', 'Engaging Students in Learning Activities and Assignments'],
      ['3D', 'Using Assessment in Instruction'],
      ['3E', 'Demonstrating Flexibility and Responsiveness'],
    ],
  },
  {
    id: 'd4', code: '4', label: 'Professional Responsibilities', weight: 20, color: '#b45309',
    components: [
      ['4A', 'Reflecting on Teaching'],
      ['4B', 'Maintaining Accurate Records'],
      ['4C', 'Communicating with Families'],
      ['4D', 'Participating in a Professional Community'],
      ['4E', 'Growing and Developing Professionally'],
      ['4F', 'Showing Professionalism'],
    ],
  },
];

// AE_DOMAINS is swappable module state for the same reason AE_ACTIVE_FW is: a district on a
// non-Danielson instrument has to be able to supply its own domains, and every read site should
// keep working without being rewritten. aeSetActiveFramework is the single writer.
let AE_DOMAINS = AE_DEFAULT_DOMAINS;
function aeBuildComponents(domains) {
  return (domains || []).flatMap((domain) => (domain.components || []).map(([code, label]) => ({
    code, label, domainId: domain.id, domainLabel: domain.label,
  })));
}
let AE_COMPONENTS = aeBuildComponents(AE_DEFAULT_DOMAINS);

// Validates a district-supplied rubric. Returns null when it cannot be trusted, because a
// half-valid rubric would silently mis-score every educator rated against it.
function aeNormalizeRubric(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const domainsRaw = Array.isArray(raw.domains) ? raw.domains : null;
  if (!domainsRaw || domainsRaw.length !== 4) return null;
  const requiredIds = new Set(['d1', 'd2', 'd3', 'd4']);
  const seen = {};
  const domains = [];
  for (let i = 0; i < domainsRaw.length; i++) {
    const entry = domainsRaw[i] || {};
    const id = String(entry.id == null ? '' : entry.id).trim().toLowerCase();
    const label = String(entry.label == null ? '' : entry.label).trim().slice(0, 160);
    if (!requiredIds.has(id) || !label || seen[id]) return null;
    seen[id] = true;
    const weightNumber = Number(entry.weight);
    if (!Array.isArray(entry.components) || entry.components.length > 50) return null;
    const componentCodes = new Set();
    const components = [];
    for (let componentIndex = 0; componentIndex < entry.components.length; componentIndex++) {
      const pair = entry.components[componentIndex];
      if (!Array.isArray(pair) || pair.length < 2) return null;
      const code = String(pair[0] == null ? '' : pair[0]).trim().slice(0, 12);
      const componentLabel = String(pair[1] == null ? '' : pair[1]).trim().slice(0, 240);
      if (!code || !componentLabel || componentCodes.has(code.toLowerCase())) return null;
      componentCodes.add(code.toLowerCase()); components.push([code, componentLabel]);
    }
    domains.push({
      id,
      code: String(entry.code == null ? String(i + 1) : entry.code).trim().slice(0, 12) || String(i + 1),
      label,
      weight: Number.isFinite(weightNumber) && weightNumber > 0 ? weightNumber : 0,
      color: /^#[0-9a-fA-F]{3,8}$/.test(String(entry.color || '')) ? String(entry.color) : '#2563eb',
      components,
    });
  }
  if (Object.keys(seen).length !== requiredIds.size) return null;
  const domainWeighted = !!raw.domainWeighted;
  if (domainWeighted) {
    const total = domains.reduce((sum, domain) => sum + domain.weight, 0);
    if (domains.some((domain) => domain.weight <= 0) || Math.abs(total - 100) > 0.001) return null;
  } else domains.forEach((domain) => { domain.weight = 25; });
  if (raw.bands != null && !Array.isArray(raw.bands)) return null;
  if (Array.isArray(raw.bands) && raw.bands.length > 8) return null;
  const bands = [];
  const bandMins = new Set();
  (raw.bands || []).forEach((band) => {
    const min = Number(band && band.min); const label = String((band && band.label) || '').trim().slice(0, 80);
    if (!Number.isFinite(min) || min < 0 || min > 3 || !label || bandMins.has(min)) return;
    bandMins.add(min); bands.push({ min, label });
  });
  if (Array.isArray(raw.bands) && bands.length !== raw.bands.length) return null;
  bands.sort((a, b) => b.min - a.min);
  const name = String(raw.name == null ? '' : raw.name).trim().slice(0, 160) || 'Custom rubric';
  const rawVersion = String(raw.versionTag == null ? '' : raw.versionTag).trim().slice(0, 80);
  if (rawVersion && !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(rawVersion)) return null;
  return {
    name,
    versionTag: rawVersion || ('custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 80),
    practiceLabel: String(raw.practiceLabel == null ? '' : raw.practiceLabel).trim().slice(0, 120) || 'Professional Practice',
    practiceShort: String(raw.practiceShort == null ? '' : raw.practiceShort).trim().slice(0, 20) || 'PP',
    domainWeighted,
    bands: bands.length ? bands : null,
    domains,
  };
}

// Ratings are keyed by domain id, so a rubric swap can orphan them. Report before writing.
// Evidence sufficiency. Deliberately deterministic and offline: it counts what the evaluator
// documented and compares it against the rating they assigned. It never judges teaching, and it
// never sends a personnel record anywhere. "The tool counted three walkthroughs" is defensible to
// both an educator and an association in a way that "the model thinks" is not.
//
// The union-protective case is the one that matters most: an adverse rating resting on little or
// no documented evidence is exactly what a grievance overturns, so flagging it before the record
// is finalised serves the educator and the evaluator at the same time.
// AI reflection prompt. Two rules shape this and both are deliberate.
//
// 1. It analyses the DOCUMENTATION, never the person. The model is asked whether the evaluator's
//    own written evidence supports the rating the evaluator assigned, and what other readings the
//    same evidence allows. It is told not to rate, not to judge the educator, and not to suggest a
//    score, because a model scoring an educator is the thing a union should refuse.
// 2. The answer is advisory and is never written into the record. It prompts the human to think;
//    it does not author part of a personnel file.
//
// This sends evaluation text off the device, so it is opt-in per workspace and off by default.
function aeBuildReflectionPrompt(workspace, teacherId, domains, ratingLabels) {
  const source = workspace || {};
  const teacher = (source.teachers || []).filter(function (item) { return item && item.id === teacherId; })[0];
  if (!teacher) return null;
  const textOf = function (record) {
    return ['notes', 'summary', 'evidence', 'text', 'narrative', 'comment']
      .map(function (field) { return record && typeof record[field] === 'string' ? record[field].trim() : ''; })
      .filter(Boolean).join(' ').slice(0, 1200);
  };
  const published = []
    .concat((source.walkthroughs || []).filter(function (i) { return i && i.teacherId === teacherId && i.publishedAt; }))
    .concat((source.observations || []).filter(function (i) { return i && i.teacherId === teacherId && i.evidencePublishedAt; }));
  const evidenceLines = published.map(function (record, index) {
    const tags = (record.componentTags || []).join(', ');
    const body = textOf(record);
    return (index + 1) + '. ' + (tags ? '[' + tags + '] ' : '') + (body || '(no written detail recorded)');
  });
  if (!evidenceLines.length) return null;
  const rated = (teacher.ratings && teacher.ratings.domains) || {};
  const ratingLines = (domains || []).map(function (domain) {
    const value = rated[domain.id];
    if (value == null || value === '') return null;
    const label = ratingLabels && ratingLabels[String(value)] ? ratingLabels[String(value)] : String(value);
    return '- ' + domain.label + ': ' + label;
  }).filter(Boolean);
  return [
    'You are helping an evaluator check their own reasoning before they finalise an educator evaluation.',
    'You are NOT evaluating the educator. Do not assign, suggest, or imply a rating. Do not judge the',
    'quality of the teaching. Analyse only whether the written evidence below supports the ratings the',
    'evaluator has assigned, and what other reasonable readings that same evidence allows.',
    '',
    'Documented evidence:',
    evidenceLines.join('\n'),
    '',
    ratingLines.length ? 'Ratings the evaluator assigned:' : 'No ratings assigned yet.',
    ratingLines.join('\n'),
    '',
    'Reply with three short sections and nothing else:',
    '1. ALTERNATIVE READINGS - other plausible explanations for what was observed, including ones',
    '   favourable to the educator (context, a one-off lesson, a deliberate choice, missing context).',
    '2. WHERE THE EVIDENCE IS THIN OR CONTRADICTORY - any rating the written evidence does not clearly',
    '   support, and any place two pieces of evidence point different ways.',
    '3. WHAT TO GATHER NEXT - concrete evidence that would settle the question either way.',
    '',
    'Be brief and specific. If the evidence genuinely supports the ratings, say so plainly.',
  ].join('\n');
}

function aeEvidenceSufficiency(workspace, teacherId, options) {
  const opts = options || {};
  const adverseBelow = Number.isFinite(Number(opts.adverseBelow)) ? Number(opts.adverseBelow) : 2;
  const thinBelow = Number.isFinite(Number(opts.thinBelow)) ? Number(opts.thinBelow) : 2;
  const expectedPieces = Number.isFinite(Number(opts.expectedPieces)) ? Number(opts.expectedPieces) : 0;
  const domains = Array.isArray(opts.domains) ? opts.domains : [];
  const source = workspace || {};
  const teacher = (source.teachers || []).filter(function (item) { return item && item.id === teacherId; })[0];
  const findings = [];
  if (!teacher) return findings;

  const componentDomain = {};
  domains.forEach(function (domain) {
    ((opts.componentsByDomain && opts.componentsByDomain[domain.id]) || domain.components || [])
      .forEach(function (pair) { componentDomain[String(pair[0]).toLowerCase()] = domain.id; });
  });

  const published = []
    .concat((source.walkthroughs || []).filter(function (item) { return item && item.teacherId === teacherId && item.publishedAt; }))
    .concat((source.observations || []).filter(function (item) { return item && item.teacherId === teacherId && item.evidencePublishedAt; }));
  const perDomain = {};
  domains.forEach(function (domain) { perDomain[domain.id] = 0; });
  published.forEach(function (record) {
    // Count published source records, not component-tag associations. One
    // observation tagged to two components in the same domain remains one
    // evidence record for that domain; tags spanning domains cover each once.
    const coveredDomains = new Set();
    (record.componentTags || []).forEach(function (code) {
      const domainId = componentDomain[String(code).toLowerCase()];
      if (domainId && perDomain[domainId] != null) coveredDomains.add(domainId);
    });
    coveredDomains.forEach(function (domainId) { perDomain[domainId] += 1; });
  });

  const rated = (teacher.ratings && teacher.ratings.domains) || {};
  domains.forEach(function (domain) {
    const value = rated[domain.id];
    if (value == null || value === '') return;
    const numeric = Number(value);
    const count = perDomain[domain.id] || 0;
    if (count === 0) {
      findings.push({
        severity: 'high', domainId: domain.id, code: 'rated-without-evidence',
        message: domain.label + t("educator_evaluation.carries_a_rating_but_no_evidence_is_tagged_to_it_1q1d5mz", ' carries a rating but no evidence is tagged to it.'),
      });
      return;
    }
    if (Number.isFinite(numeric) && numeric < adverseBelow && count < thinBelow) {
      findings.push({
        severity: 'high', domainId: domain.id, code: 'adverse-on-thin-evidence',
        message: domain.label + t("educator_evaluation.is_rated_below_proficient_on_1q9m4x1", ' is rated below proficient on ') + count
          + (count === 1 ? t("educator_evaluation.published_evidence_record_20260824", ' published evidence record.') : t("educator_evaluation.published_evidence_records_20260824", ' published evidence records.')),
      });
    }
  });

  const untouched = domains.filter(function (domain) { return (perDomain[domain.id] || 0) === 0; });
  if (untouched.length && published.length) {
    findings.push({
      severity: 'medium', code: 'range-gap',
      message: t("educator_evaluation.no_evidence_is_tagged_to_1b4o7gq", 'No evidence is tagged to ') + untouched.map(function (d) { return d.label; }).join(', ') + '.',
    });
  }
  if (expectedPieces > 0 && published.length < expectedPieces) {
    findings.push({
      severity: 'medium', code: 'below-expected-volume',
      message: published.length + (published.length === 1 ? t("educator_evaluation.published_evidence_record_so_far_20260824", ' published evidence record') : t("educator_evaluation.published_evidence_records_so_far_20260824", ' published evidence records'))
        + t("educator_evaluation.so_far_this_plan_looks_for_20260824", ' so far; this plan looks for ') + expectedPieces + t("educator_evaluation.across_the_cycle_1d7u3xk", ' across the cycle.'),
    });
  }
  return findings;
}

function aeRubricOrphans(workspace, domains) {
  const keep = {};
  (domains || []).forEach((domain) => { keep[domain.id] = true; });
  const casualties = [];
  ((workspace && workspace.teachers) || []).forEach((teacher) => {
    const rated = (teacher && teacher.ratings && teacher.ratings.domains) || {};
    const lost = Object.keys(rated).filter((id) => !keep[id] && rated[id] != null);
    if (lost.length) casualties.push({ teacherId: teacher.id, name: teacher.name || teacher.code || teacher.id, domainIds: lost });
  });
  return casualties;
}

const AE_RATINGS = [
  { value: 0, get label() { return aeTranslatedRubricLabel('Failing'); } },
  { value: 1, get label() { return aeTranslatedRubricLabel('Needs Improvement'); } },
  { value: 2, get label() { return aeTranslatedRubricLabel('Proficient'); } },
  { value: 3, get label() { return aeTranslatedRubricLabel('Distinguished'); } },
];

function aeRatingLabel(value) {
  const rating = AE_RATINGS.find((item) => item.value === value);
  return rating ? aeTranslatedRubricLabel(rating.label) : t("educator_evaluation.unrecognized_rating_value_1j8r6w2", 'Unrecognized rating value');
}

function aeTranslatedRubricLabel(label) {
  switch (String(label || '')) {
    case 'Failing': return t("educator_evaluation.failing_1x2j4m8", 'Failing');
    case 'Needs Improvement': return t("educator_evaluation.needs_improvement_1n6p8r0", 'Needs Improvement');
    case 'Proficient': return t("educator_evaluation.proficient_1q7s9v2", 'Proficient');
    case 'Distinguished': return t("educator_evaluation.distinguished_1t3u5w7", 'Distinguished');
    case 'Excellent': return t("educator_evaluation.excellent_1y4a6c8", 'Excellent');
    case 'Novice/Needs Improvement': return t("educator_evaluation.novice_needs_improvement_1b5d7f9", 'Novice/Needs Improvement');
    case 'Unsatisfactory': return t("educator_evaluation.unsatisfactory_1h7j9l2", 'Unsatisfactory');
    case 'Effective': return t("educator_evaluation.effective_1m3o5q7", 'Effective');
    case 'Developing': return t("educator_evaluation.developing_1r4t6v8", 'Developing');
    case 'Ineffective': return t("educator_evaluation.ineffective_1w5y7a9", 'Ineffective');
    default: return label;
  }
}

function aeStatusLabel(status) {
  switch (status) {
    case 'finalized': return t("educator_evaluation.finalized_4cmc2p", 'Finalized');
    case 'awaiting_teacher': return t("educator_evaluation.awaiting_teacher_1a3c5e7", 'Awaiting teacher');
    case 'awaiting_evaluator': return t("educator_evaluation.awaiting_evaluator_1g9i2k4", 'Awaiting evaluator');
    case 'in_progress': return t("educator_evaluation.in_progress_bgdh5x", 'In progress');
    case 'overdue': return t("educator_evaluation.overdue_1l3n5p7", 'Overdue');
    default: return t("educator_evaluation.not_started_1mefwb3", 'Not started');
  }
}

// Rubric/framework values remain canonical in workspace records. This adapter
// is used only at visible display/export boundaries so a translated label never
// changes scoring, identifiers, or the official framework snapshot.
function aeRubricDisplayLabel(label) {
  switch (String(label || '')) {
    case 'Planning and Preparation': return t("educator_evaluation.rubric_planning_and_preparation", 'Planning and Preparation');
    case 'Classroom Environment': return t("educator_evaluation.rubric_classroom_environment", 'Classroom Environment');
    case 'Instruction': return t("educator_evaluation.rubric_instruction", 'Instruction');
    case 'Professional Responsibilities': return t("educator_evaluation.rubric_professional_responsibilities", 'Professional Responsibilities');
    case 'Observation & Practice': return t("educator_evaluation.factor_observation_and_practice", 'Observation & Practice');
    case 'Building Level Data': return t("educator_evaluation.factor_building_level_data", 'Building Level Data');
    case 'Teacher-Specific Data': return t("educator_evaluation.factor_teacher_specific_data", 'Teacher-Specific Data');
    case 'LEA Selected Measure / SPM': return t("educator_evaluation.factor_lea_selected_measure_spm", 'LEA Selected Measure / SPM');
    case 'Educator Practice (Portland Framework for Teaching)': return t("educator_evaluation.factor_educator_practice_portland_framework", 'Educator Practice (Portland Framework for Teaching)');
    case 'Professional Practice (100%, set an SLG split in About if your plan includes one)': return t("educator_evaluation.factor_professional_practice_full_weight", 'Professional Practice (100%, set an SLG split in About if your plan includes one)');
    case 'Professional Practice': return t("educator_evaluation.factor_professional_practice", 'Professional Practice');
    case 'Student Learning & Growth': return t("educator_evaluation.factor_student_learning_and_growth", 'Student Learning & Growth');
    case 'Knowledge of Content and Pedagogy': return t("educator_evaluation.component_knowledge_of_content_and_pedagogy", 'Knowledge of Content and Pedagogy');
    case 'Demonstrating Knowledge of Students': return t("educator_evaluation.component_demonstrating_knowledge_of_students", 'Demonstrating Knowledge of Students');
    case 'Setting Instructional Outcomes': return t("educator_evaluation.component_setting_instructional_outcomes", 'Setting Instructional Outcomes');
    case 'Demonstrating Knowledge of Resources': return t("educator_evaluation.component_demonstrating_knowledge_of_resources", 'Demonstrating Knowledge of Resources');
    case 'Designing Coherent Instruction': return t("educator_evaluation.component_designing_coherent_instruction", 'Designing Coherent Instruction');
    case 'Designing Student Assessment': return t("educator_evaluation.component_designing_student_assessment", 'Designing Student Assessment');
    case 'Creating an Environment of Respect and Rapport': return t("educator_evaluation.component_creating_environment_of_respect_and_rapport", 'Creating an Environment of Respect and Rapport');
    case 'Establishing a Culture for Learning': return t("educator_evaluation.component_establishing_a_culture_for_learning", 'Establishing a Culture for Learning');
    case 'Managing Classroom Procedures': return t("educator_evaluation.component_managing_classroom_procedures", 'Managing Classroom Procedures');
    case 'Managing Student Behavior': return t("educator_evaluation.component_managing_student_behavior", 'Managing Student Behavior');
    case 'Managing Student Behavior Expectations': return t("educator_evaluation.component_managing_student_behavior_expectations", 'Managing Student Behavior Expectations');
    case 'Organizing Physical Space': return t("educator_evaluation.component_organizing_physical_space", 'Organizing Physical Space');
    case 'Organizing Physical and Digital Space': return t("educator_evaluation.component_organizing_physical_and_digital_space", 'Organizing Physical and Digital Space');
    case 'Communicating with Students': return t("educator_evaluation.component_communicating_with_students", 'Communicating with Students');
    case 'Using Questioning and Discussion Techniques': return t("educator_evaluation.component_using_questioning_and_discussion_techniques", 'Using Questioning and Discussion Techniques');
    case 'Questioning and Discussion Techniques': return t("educator_evaluation.component_questioning_and_discussion_techniques", 'Questioning and Discussion Techniques');
    case 'Engaging Students in Learning': return t("educator_evaluation.component_engaging_students_in_learning", 'Engaging Students in Learning');
    case 'Engaging Students in Learning Activities and Assignments': return t("educator_evaluation.component_engaging_students_in_learning_activities", 'Engaging Students in Learning Activities and Assignments');
    case 'Using Assessment in Instruction': return t("educator_evaluation.component_using_assessment_in_instruction", 'Using Assessment in Instruction');
    case 'Demonstrating Flexibility and Responsiveness': return t("educator_evaluation.component_demonstrating_flexibility_and_responsiveness", 'Demonstrating Flexibility and Responsiveness');
    case 'Reflection on Teaching': return t("educator_evaluation.component_reflection_on_teaching", 'Reflection on Teaching');
    case 'Maintaining Accurate Records': return t("educator_evaluation.component_maintaining_accurate_records", 'Maintaining Accurate Records');
    case 'Communicating with Families': return t("educator_evaluation.component_communicating_with_families", 'Communicating with Families');
    case 'Participating in a Professional Community': return t("educator_evaluation.component_participating_in_a_professional_community", 'Participating in a Professional Community');
    case 'Growing and Developing Professionally': return t("educator_evaluation.component_growing_and_developing_professionally", 'Growing and Developing Professionally');
    case 'Showing Professionalism': return t("educator_evaluation.component_showing_professionalism", 'Showing Professionalism');
    default: return label;
  }
}

function aeWorkflowStatusLabel(status) {
  switch (status) {
    case 'draft': return t("educator_evaluation.draft_1pqt609", 'Draft');
    case 'returned': return t("educator_evaluation.returned_1q3s5u7", 'Returned');
    case 'submitted': return t("educator_evaluation.submitted_1w2y4a6", 'Submitted');
    case 'results_submitted': return t("educator_evaluation.results_submitted_1c3e5g7", 'Results submitted');
    case 'approved': return t("educator_evaluation.approved_1i4k6m8", 'Approved');
    case 'locked': return t("educator_evaluation.locked_1o5q7s9", 'Locked');
    default: return String(status || '').replace(/_/g, ' ');
  }
}

const AE_STATUS_META = {
  finalized: { get label() { return aeStatusLabel('finalized'); }, tone: 'good' },
  awaiting_teacher: { get label() { return aeStatusLabel('awaiting_teacher'); }, tone: 'purple' },
  awaiting_evaluator: { get label() { return aeStatusLabel('awaiting_evaluator'); }, tone: 'blue' },
  in_progress: { get label() { return aeStatusLabel('in_progress'); }, tone: 'amber' },
  overdue: { get label() { return aeStatusLabel('overdue'); }, tone: 'bad' },
  not_started: { get label() { return aeStatusLabel('not_started'); }, tone: 'neutral' },
};

function aeId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function aeNow() { return new Date().toISOString(); }

function aeToday() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function aeSchoolYear() {
  const d = new Date();
  const start = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return start + '-' + String(start + 1).slice(-2);
}

function aeDateTime(value) {
  if (!value) return 'Not yet';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function aeDate(value) {
  if (!value) return 'Not set';
  const d = new Date(value + (String(value).length === 10 ? 'T12:00:00' : ''));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString([], { dateStyle: 'medium' });
}

function aeReadLocalWorkspace() {
  let raw = '';
  try {
    raw = localStorage.getItem(AE_STORAGE_KEY) || '';
  } catch (error) {
    return { status: 'unavailable', workspace: null, raw: '', error: error && error.message ? error.message : t("educator_evaluation.browser_storage_is_unavailable_1c9wx7a", 'Browser storage is unavailable.') };
  }
  if (!raw) return { status: 'empty', workspace: null, raw: '', error: '' };
  try {
    const parsed = JSON.parse(raw);
    const workspace = aeNormalizeWorkspace(parsed);
    if (!workspace) return { status: 'corrupt', workspace: null, raw, error: t("educator_evaluation.the_saved_workspace_has_an_invalid_structure_1v5zq0b", 'The saved workspace has an invalid structure.') };
    return { status: 'ok', workspace, raw: '', error: '' };
  } catch (error) {
    return { status: 'corrupt', workspace: null, raw, error: error && error.message ? error.message : t("educator_evaluation.the_saved_workspace_is_not_valid_json_1r0u6nf", 'The saved workspace is not valid JSON.') };
  }
}

function aeLoad() {
  const result = aeReadLocalWorkspace();
  return result.status === 'ok' ? result.workspace : null;
}

function aeStore(workspace) {
  try {
    localStorage.setItem(AE_STORAGE_KEY, JSON.stringify(workspace));
    return { ok: true, error: '', savedAt: aeNow() };
  } catch (error) {
    const name = error && error.name ? String(error.name) : '';
    const quota = name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
    return {
      ok: false,
      error: quota
        ? t("educator_evaluation.this_browser_has_no_storage_space_left_for_the_evaluation_workspace_1e9c6w2", 'This browser has no storage space left for the evaluation workspace.')
        : t("educator_evaluation.this_browser_did_not_allow_the_evaluation_workspace_to_be_saved_1n7p3k4", 'This browser did not allow the evaluation workspace to be saved.'),
      detail: error && error.message ? error.message : '',
    };
  }
}

function aeReadOnboardingChoice() {
  try {
    const choice = localStorage.getItem(AE_ONBOARDING_KEY);
    return choice === 'blank' || choice === 'sample' ? choice : '';
  } catch (_) { return ''; }
}

function aeSaveOnboardingChoice(choice) {
  try { localStorage.setItem(AE_ONBOARDING_KEY, choice === 'sample' ? 'sample' : 'blank'); } catch (_) {}
}

function aeClone(value) { return JSON.parse(JSON.stringify(value)); }

function aeSameValue(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

function aePlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// Merge a stale optimistic edit against the newly fetched district record.
// Server state wins every overlapping field; only independently changed
// fields and newly-created id-addressable records are eligible for replay.
function aeThreeWayMerge(base, local, remote, path) {
  const rootPath = path || 'workspace';
  const conflicts = [];
  let appliedCount = 0;
  const copy = (value) => value === undefined ? undefined : aeClone(value);
  const merge = (before, attempted, current, currentPath) => {
    if (aeSameValue(attempted, before)) return copy(current);
    if (aeSameValue(current, before)) { appliedCount += 1; return copy(attempted); }
    if (aeSameValue(attempted, current)) return copy(current);
    if (aePlainObject(before) && aePlainObject(attempted) && aePlainObject(current)) {
      const result = {};
      const keys = Array.from(new Set(Object.keys(before).concat(Object.keys(attempted), Object.keys(current))));
      keys.forEach((key) => { result[key] = merge(before[key], attempted[key], current[key], currentPath + '.' + key); });
      return result;
    }
    const idArray = (value) => Array.isArray(value) && value.every((item) => aePlainObject(item) && aeSafeId(item.id, ''));
    if (idArray(before) && idArray(attempted) && idArray(current)) {
      const beforeById = new Map(before.map((item) => [item.id, item]));
      const attemptedById = new Map(attempted.map((item) => [item.id, item]));
      const currentById = new Map(current.map((item) => [item.id, item]));
      const result = current.map((item) => {
        const id = item.id;
        if (!attemptedById.has(id)) {
          if (beforeById.has(id) && aeSameValue(item, beforeById.get(id))) conflicts.push({ path: currentPath + '[' + id + ']', attempted: undefined, current: copy(item) });
          return copy(item);
        }
        return merge(beforeById.get(id), attemptedById.get(id), item, currentPath + '[' + id + ']');
      });
      attempted.forEach((item) => {
        if (currentById.has(item.id)) return;
        if (!beforeById.has(item.id)) { result.push(copy(item)); appliedCount += 1; return; }
        conflicts.push({ path: currentPath + '[' + item.id + ']', attempted: copy(item), current: undefined });
      });
      return result;
    }
    conflicts.push({ path: currentPath, attempted: copy(attempted), current: copy(current) });
    return copy(current);
  };
  return { workspace: merge(base, local, remote, rootPath), conflicts, appliedCount };
}

function aeConflictValue(value) {
  if (value === undefined) return '(removed)';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return aeString(text, 180, '(empty)') || '(empty)';
}

function aeString(value, maxLength, fallback) {
  const limit = Number(maxLength) > 0 ? Number(maxLength) : 10000;
  return typeof value === 'string' ? value.slice(0, limit) : (fallback == null ? '' : String(fallback).slice(0, limit));
}

function aeSafeId(value, fallback) {
  const clean = aeString(value, 100, '').replace(/[^a-zA-Z0-9._:-]/g, '');
  return clean || fallback;
}

function aeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : !!fallback;
}

function aeDateValue(value) {
  const text = aeString(value, 10, '');
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(new Date(text + 'T12:00:00').getTime()) ? text : '';
}

function aeTimestamp(value) {
  const text = aeString(value, 40, '');
  return text && !Number.isNaN(new Date(text).getTime()) ? new Date(text).toISOString() : null;
}

function aeRatingValue(value) {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 3 ? number : null;
}

function aeDomainRatings(value) {
  const source = aePlainObject(value) ? value : {};
  return { d1: aeRatingValue(source.d1), d2: aeRatingValue(source.d2), d3: aeRatingValue(source.d3), d4: aeRatingValue(source.d4) };
}
function aeAnnualEvidenceRefs(value) {
  const source = aePlainObject(value) ? value : {};
  const clean = {};
  ['d1', 'd2', 'd3', 'd4'].forEach((domainId) => {
    clean[domainId] = Array.from(new Set((Array.isArray(source[domainId]) ? source[domainId] : []).map((token) => aeString(token, 160, '')).filter((token) => /^(walkthrough|formal_observation|spm):[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(token)))).slice(0, 100);
  });
  return clean;
}

function aeComponentTags(value) {
  const allowed = new Set(AE_COMPONENTS.map((component) => component.code));
  return Array.isArray(value) ? Array.from(new Set(value.map((item) => aeString(item, 3, '')).filter((item) => allowed.has(item)))).slice(0, 22) : [];
}

function aeSafeWeightSnapshot(value) {
  if (!Array.isArray(value)) return null;
  const meta = {
    observation: { label: 'Observation & Practice', short: 'O&P', color: '#1d4ed8' },
    building: { label: 'Building Level Data', short: 'BLD', color: '#0f766e' },
    teacher: { label: 'Teacher-Specific Data', short: 'TSD', color: '#7c3aed' },
    lea: { label: 'LEA Selected Measure / SPM', short: 'SPM', color: '#b45309' },
  };
  const seen = new Set();
  const parts = value.map((part) => {
    if (!aePlainObject(part) || !meta[part.id] || seen.has(part.id)) return null;
    const weight = Number(part.weight);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) return null;
    seen.add(part.id);
    return { id: part.id, label: meta[part.id].label, short: meta[part.id].short, weight, color: meta[part.id].color };
  }).filter(Boolean);
  return parts.length && Math.abs(parts.reduce((sum, part) => sum + part.weight, 0) - 100) < 0.001 ? parts : null;
}

function aeNormalizeWorkspace(value) {
  if (!aePlainObject(value)) return null;
  const rawConfig = aePlainObject(value.config) ? value.config : {};
  const frameworkProfile = AE_FRAMEWORKS[rawConfig.frameworkProfile] ? rawConfig.frameworkProfile : 'maine_pepg';
  const customRubric = aeNormalizeRubric(rawConfig.customRubric);
  const config = {
    organization: aeString(rawConfig.organization, 160, 'Sample School'),
    building: aeString(rawConfig.building, 160, 'Main Building'),
    academicYear: aeString(rawConfig.academicYear, 20, aeSchoolYear()),
    evaluatorName: aeString(rawConfig.evaluatorName, 160, 'Principal'),
    evaluatorInitials: aeString(rawConfig.evaluatorInitials, 12, 'AP'),
    frameworkVersion: customRubric ? customRubric.versionTag : AE_FRAMEWORKS[frameworkProfile].versionTag,
    frameworkProfile,
    pepgPracticeWeight: (() => { const raw = rawConfig.pepgPracticeWeight; if (raw == null || String(raw) === '') return null; const n = Number(raw); return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : null; })(),
    aiReflectionEnabled: aeBoolean(rawConfig.aiReflectionEnabled, false),
    customRubric,
    sampleMode: aeBoolean(rawConfig.sampleMode, false),
    setupPath: rawConfig.setupPath == null || rawConfig.setupPath === '' ? '' : (['local', 'principal_share', 'district_portal'].includes(rawConfig.setupPath) ? rawConfig.setupPath : 'local'),
    shareHelperUrl: /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:[?#].*)?$/.test(aeString(rawConfig.shareHelperUrl, 500, '')) ? aeString(rawConfig.shareHelperUrl, 500, '') : '',
    shareHelperVerified: aeBoolean(rawConfig.shareHelperVerified, false),
    shareHelperChecklist: Array.from(new Set((Array.isArray(rawConfig.shareHelperChecklist) ? rawConfig.shareHelperChecklist : []).filter((step) => ['approval', 'project', 'code', 'index', 'manifest'].includes(step)))).slice(0, 5),
  };
  // Keep the framework pointer honest for everything normalized below
  // (weight snapshots, trend math) and for the render that follows.
  aeSetActiveFramework(config);
  const usedTeacherIds = new Set();
  const teachers = (Array.isArray(value.teachers) ? value.teachers : []).filter(aePlainObject).slice(0, 1000).map((raw, index) => {
    let id = aeSafeId(raw.id, 'teacher-' + (index + 1));
    while (usedTeacherIds.has(id)) id += '-' + (index + 1);
    usedTeacherIds.add(id);
    const ratings = aePlainObject(raw.ratings) ? raw.ratings : {};
    const annualRationales = aePlainObject(raw.annualRationales) ? raw.annualRationales : {};
    const status = aeString(raw.cycleStatus, 30, 'not_started');
    return {
      id,
      code: aeString(raw.code, 40, 'T-' + String(index + 1).padStart(2, '0')),
      name: aeString(raw.name, 160, 'Teacher ' + String(index + 1).padStart(2, '0')),
      building: aeString(raw.building, 160, config.building),
      assignment: aeString(raw.assignment, 240, ''),
      employeeType: raw.employeeType === 'temporary' ? 'temporary' : 'professional',
      buildingData: aeBoolean(raw.buildingData, true),
      teacherSpecificData: aeBoolean(raw.teacherSpecificData, true),
      active: aeBoolean(raw.active, true),
      evaluator: aeString(raw.evaluator, 160, config.evaluatorName),
      dueDate: aeDateValue(raw.dueDate),
      cycleStatus: AE_STATUS_META[status] ? status : 'not_started',
      lastActivityAt: aeTimestamp(raw.lastActivityAt),
      finalizedAt: aeTimestamp(raw.finalizedAt),
      cycleLockedAt: aeTimestamp(raw.cycleLockedAt),
      frameworkVersion: aeString(raw.frameworkVersion, 80, config.frameworkVersion),
      weightSnapshot: aeSafeWeightSnapshot(raw.weightSnapshot),
      finalScore: aeRatingValue(raw.finalScore),
      ratings: {
        domains: aeDomainRatings(ratings.domains),
        building: aeRatingValue(ratings.building),
        teacher: aeRatingValue(ratings.teacher),
        lea: aeRatingValue(ratings.lea),
      },
      annualRationales: { d1: aeString(annualRationales.d1, 15000, ''), d2: aeString(annualRationales.d2, 15000, ''), d3: aeString(annualRationales.d3, 15000, ''), d4: aeString(annualRationales.d4, 15000, '') },
      annualEvidenceRefs: aeAnnualEvidenceRefs(raw.annualEvidenceRefs),
      // Server-owned pointer to the released strengths-first summary shared to
      // the educator's Drive; the portal ignores client-sent values on save.
      releasedDoc: raw.releasedDoc && typeof raw.releasedDoc === 'object' ? {
        id: aeSafeId(raw.releasedDoc.id, ''),
        url: aeString(raw.releasedDoc.url, 400, ''),
        at: aeTimestamp(raw.releasedDoc.at),
        by: aeString(raw.releasedDoc.by, 160, ''),
        sharedWith: aeString(raw.releasedDoc.sharedWith, 320, ''),
        openedAt: aeTimestamp(raw.releasedDoc.openedAt),
        accessReviewedAt: aeTimestamp(raw.releasedDoc.accessReviewedAt),
        history: (Array.isArray(raw.releasedDoc.history) ? raw.releasedDoc.history : []).filter(aePlainObject).slice(-25).map((item) => ({
          id: aeSafeId(item.id, ''),
          url: aeString(item.url, 400, ''),
          at: aeTimestamp(item.at),
          by: aeString(item.by, 160, ''),
          openedAt: aeTimestamp(item.openedAt),
          status: item.status === 'superseded_unavailable' ? 'superseded_unavailable' : 'superseded',
          supersededAt: aeTimestamp(item.supersededAt),
        })),
      } : null,
      // Teacher-owned statement for the record; the portal adopts it only from
      // the educator's own saves and freezes it at finalization.
      educatorStatement: raw.educatorStatement && typeof raw.educatorStatement === 'object' && aeString(raw.educatorStatement.text, 20000, '') ? {
        text: aeString(raw.educatorStatement.text, 20000, ''),
        updatedAt: aeTimestamp(raw.educatorStatement.updatedAt),
      } : null,
    };
  });
  const teacherIds = new Set(teachers.map((teacher) => teacher.id));
  const teacherRef = (value) => teacherIds.has(aeString(value, 100, '')) ? aeString(value, 100, '') : '';
  const records = (value, max) => (Array.isArray(value) ? value : []).filter(aePlainObject).slice(0, max);

  const walkthroughs = records(value.walkthroughs, 5000).map((raw, index) => ({
    id: aeSafeId(raw.id, 'walk-' + (index + 1)),
    teacherId: teacherRef(raw.teacherId),
    createdAt: aeTimestamp(raw.createdAt) || aeNow(),
    updatedAt: aeTimestamp(raw.updatedAt),
    date: aeDateValue(raw.date) || aeToday(),
    startedAt: aeTimestamp(raw.startedAt) || aeTimestamp(raw.createdAt) || aeNow(),
    durationMin: String(Math.min(180, Math.max(1, Number.parseInt(raw.durationMin, 10) || 8))),
    announced: raw.announced === 'announced' ? 'announced' : 'unannounced',
    lessonPhase: ['opening', 'middle', 'guided_practice', 'independent_practice', 'closure'].includes(raw.lessonPhase) ? raw.lessonPhase : 'middle',
    subject: aeString(raw.subject, 240, ''),
    evidence: aeString(raw.evidence, 30000, ''),
    interpretation: aeString(raw.interpretation, 15000, ''),
    componentTags: aeComponentTags(raw.componentTags),
    privacyChecked: aeBoolean(raw.privacyChecked, false),
    observer: aeString(raw.observer, 160, config.evaluatorName),
    publishedAt: aeTimestamp(raw.publishedAt),
    teacherAcknowledgedAt: aeTimestamp(raw.teacherAcknowledgedAt),
    version: Math.min(1000, Math.max(1, Number.parseInt(raw.version, 10) || 1)),
  }));

  const observations = records(value.observations, 5000).map((raw, index) => {
    const prework = aePlainObject(raw.prework) ? raw.prework : {};
    const rationales = aePlainObject(raw.rationales) ? raw.rationales : {};
    const item = {
      id: aeSafeId(raw.id, 'formal-' + (index + 1)), teacherId: teacherRef(raw.teacherId),
      createdAt: aeTimestamp(raw.createdAt) || aeNow(), updatedAt: aeTimestamp(raw.updatedAt),
      frameworkVersion: aeString(raw.frameworkVersion, 80, config.frameworkVersion),
      version: Math.min(1000, Math.max(1, Number.parseInt(raw.version, 10) || 1)),
      prework: {
        plan: aeString(prework.plan, 30000, ''), outcomes: aeString(prework.outcomes, 20000, ''),
        resources: aeString(prework.resources, 20000, ''), assessment: aeString(prework.assessment, 20000, ''),
        artifactReferences: aeString(prework.artifactReferences, 10000, ''),
      },
      preConferenceNotes: aeString(raw.preConferenceNotes, 20000, ''), observedLocal: aeString(raw.observedLocal, 30, ''),
      evidence: aeString(raw.evidence, 50000, ''), reflection: aeString(raw.reflection, 30000, ''),
      postConferenceNotes: aeString(raw.postConferenceNotes, 30000, ''), ratings: aeDomainRatings(raw.ratings),
      rationales: { d1: aeString(rationales.d1, 15000, ''), d2: aeString(rationales.d2, 15000, ''), d3: aeString(rationales.d3, 15000, ''), d4: aeString(rationales.d4, 15000, '') },
      componentTags: aeComponentTags(raw.componentTags), privacyChecked: aeBoolean(raw.privacyChecked, false), ackChecked: aeBoolean(raw.ackChecked, false),
    };
    ['preworkSubmittedAt', 'preConferenceAt', 'observedAt', 'evidencePublishedAt', 'reflectionSubmittedAt', 'postConferenceAt', 'evaluatorSignedAt', 'teacherAcknowledgedAt', 'finalizedAt'].forEach((field) => { item[field] = aeTimestamp(raw[field]); });
    return item;
  });

  const statuses = new Set(['draft', 'submitted', 'returned', 'approved', 'results_submitted', 'locked']);
  const spms = records(value.spms, 1000).map((raw, index) => {
    const item = {
      id: aeSafeId(raw.id, 'spm-' + (index + 1)), teacherId: teacherRef(raw.teacherId),
      createdAt: aeTimestamp(raw.createdAt) || aeNow(), updatedAt: aeTimestamp(raw.updatedAt),
      status: statuses.has(raw.status) ? raw.status : 'draft',
      version: Math.min(1000, Math.max(1, Number.parseInt(raw.version, 10) || 1)),
      context: aeString(raw.context, 20000, ''), baseline: aeString(raw.baseline, 20000, ''), goal: aeString(raw.goal, 20000, ''),
      measures: aeString(raw.measures, 20000, ''), actionPlan: aeString(raw.actionPlan, 20000, ''),
      returnReason: aeString(raw.returnReason, 10000, ''), pendingReturnReason: aeString(raw.pendingReturnReason, 10000, ''),
      results: aeString(raw.results, 30000, ''), reflection: aeString(raw.reflection, 30000, ''),
      rating: aeRatingValue(raw.rating), ratingRationale: aeString(raw.ratingRationale, 15000, ''),
      approvedBy: aeString(raw.approvedBy, 160, ''),
      revisions: records(raw.revisions, 20).map((revision) => ({
        version: Math.min(1000, Math.max(1, Number.parseInt(revision.version, 10) || 1)),
        submittedAt: aeTimestamp(revision.submittedAt), context: aeString(revision.context, 20000, ''),
        baseline: aeString(revision.baseline, 20000, ''), goal: aeString(revision.goal, 20000, ''),
        measures: aeString(revision.measures, 20000, ''), actionPlan: aeString(revision.actionPlan, 20000, ''),
      })),
    };
    ['submittedAt', 'firstOpenedAt', 'returnedAt', 'approvedAt', 'resultsSubmittedAt', 'lockedAt'].forEach((field) => { item[field] = aeTimestamp(raw[field]); });
    return item;
  });

  const comments = records(value.comments, 5000).map((raw, index) => ({
    id: aeSafeId(raw.id, 'comment-' + (index + 1)), teacherId: teacherRef(raw.teacherId),
    recordType: ['walkthrough', 'formal_observation', 'spm'].includes(raw.recordType) ? raw.recordType : 'formal_observation',
    recordId: aeSafeId(raw.recordId, ''), text: aeString(raw.text, 3000, ''),
    role: raw.role === 'Teacher' ? 'Teacher' : 'Evaluator',
    author: aeString(raw.author, 160, raw.role === 'Teacher' ? 'Teacher' : config.evaluatorName),
    at: aeTimestamp(raw.at) || aeNow(), version: Math.min(1000, Math.max(1, Number.parseInt(raw.version, 10) || 1)),
  }));

  const audit = records(value.audit, 5000).map((raw, index) => ({
    id: aeSafeId(raw.id, 'audit-' + (index + 1)),
    event: aeString(raw.event, 60, 'UPDATED').replace(/[^A-Z0-9_]/g, '') || 'UPDATED',
    summary: aeString(raw.summary, 500, 'Record updated'), actor: aeString(raw.actor, 160, 'Unknown actor'),
    role: raw.role === 'Teacher' ? 'Teacher' : 'Evaluator', at: aeTimestamp(raw.at) || aeNow(),
    entityType: aeString(raw.entityType, 80, 'workspace').replace(/[^a-zA-Z0-9_:-]/g, '') || 'workspace',
    entityId: aeSafeId(raw.entityId, ''), teacherId: teacherRef(raw.teacherId),
    version: Math.min(1000, Math.max(1, Number.parseInt(raw.version, 10) || 1)),
  }));

  const cycleSnapshots = records(value.cycleSnapshots, AE_MAX_CYCLE_SNAPSHOTS).map((raw, index) => ({
    id: aeSafeId(raw.id, 'cycle-' + (index + 1)),
    teacherId: teacherRef(raw.teacherId),
    staffCodeSnapshot: aeString(raw.staffCodeSnapshot, 40, ''),
    academicYear: aeString(raw.academicYear, 20, ''),
    buildingSnapshot: aeString(raw.buildingSnapshot, 160, ''),
    employeeTypeSnapshot: raw.employeeTypeSnapshot === 'temporary' ? 'temporary' : 'professional',
    finalizedAt: aeTimestamp(raw.finalizedAt),
    finalScore: aeRatingValue(raw.finalScore),
    domainRatings: aeDomainRatings(raw.domainRatings),
    weightSnapshot: aeSafeWeightSnapshot(raw.weightSnapshot),
    frameworkVersion: aeString(raw.frameworkVersion, 80, config.frameworkVersion),
  })).filter((snapshot) => snapshot.teacherId && snapshot.finalizedAt);

  return {
    kind: AE_EXPORT_KIND,
    version: 1,
    config,
    teachers,
    walkthroughs,
    observations,
    spms,
    comments,
    audit,
    cycleSnapshots,
    educatorPacketMode: aeBoolean(value.educatorPacketMode, false),
    receivedPacketId: aeSafeId(value.receivedPacketId, ''),
  };
}
function aeSampleWorkspace() {
  const now = Date.now();
  const day = 86400000;
  const mkTeacher = (n, status, extra) => Object.assign({
    id: 'sample-t' + n, code: 'T-' + String(n).padStart(2, '0'), name: 'Teacher ' + String(n).padStart(2, '0'),
    building: n > 6 ? 'North Campus' : 'Main Building', assignment: n % 3 === 0 ? 'Mathematics' : (n % 2 === 0 ? 'ELA' : 'Elementary'),
    employeeType: 'professional', buildingData: true, teacherSpecificData: true, active: true,
    evaluator: n > 5 ? 'J. Rivera' : 'A. Principal', dueDate: '2027-05-' + String(10 + n).padStart(2, '0'),
    cycleStatus: status, lastActivityAt: new Date(now - n * day).toISOString(),
    ratings: { domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null },
  }, extra || {});
  const teachers = [
    mkTeacher(1, 'finalized', { finalizedAt: new Date(now - 28 * day).toISOString(), ratings: { domains: { d1: 2, d2: 3, d3: 2, d4: 2 }, building: 2.4, teacher: 2.3, lea: 2.5 } }),
    mkTeacher(2, 'finalized', { finalizedAt: new Date(now - 18 * day).toISOString(), ratings: { domains: { d1: 3, d2: 3, d3: 3, d4: 2 }, building: 2.6, teacher: 2.7, lea: 2.8 } }),
    mkTeacher(3, 'awaiting_teacher', { ratings: { domains: { d1: 2, d2: 2, d3: 2, d4: 2 }, building: 2.2, teacher: 2.1, lea: null } }),
    mkTeacher(4, 'awaiting_evaluator'),
    mkTeacher(5, 'in_progress'),
    mkTeacher(6, 'overdue', { dueDate: '2026-08-01' }),
    mkTeacher(7, 'not_started', { employeeType: 'temporary', buildingData: false, teacherSpecificData: false }),
    mkTeacher(8, 'not_started', { buildingData: false }),
  ];
  const iso = (daysAgo) => new Date(now - daysAgo * day).toISOString();
  const dstr = (daysAgo) => iso(daysAgo).slice(0, 10);
  const walkthroughs = [
    { id: 'sample-w1', teacherId: teachers[0].id, createdAt: iso(55), date: dstr(55), startedAt: iso(55), durationMin: '10', announced: 'unannounced', lessonPhase: 'guided_practice', subject: 'Grade 4 Mathematics', evidence: 'At 10:14 students moved to guided practice in under a minute using the posted routine. Teacher circulated with a checklist and conferred with three students; the sentence-frame chart was referenced twice without prompting.', interpretation: 'Transition routine is well established. Possible discussion point: how checklist notes feed small-group planning.', componentTags: ['2C', '3D'], privacyChecked: true, observer: 'A. Principal', publishedAt: iso(55), teacherAcknowledgedAt: iso(54), version: 1 },
    { id: 'sample-w2', teacherId: teachers[0].id, createdAt: iso(48), date: dstr(48), startedAt: iso(48), durationMin: '8', announced: 'announced', lessonPhase: 'opening', subject: 'Grade 4 Mathematics', evidence: 'Do-now was posted before entry; 21 of 24 students started within two minutes. The objective was read aloud and restated by a student volunteer.', interpretation: 'Strong opening routine. Wondered with the teacher about a quicker on-ramp for the three late starters.', componentTags: ['2B', '3A'], privacyChecked: true, observer: 'A. Principal', publishedAt: iso(48), teacherAcknowledgedAt: iso(47), version: 1 },
    { id: 'sample-w3', teacherId: teachers[2].id, createdAt: iso(9), date: dstr(9), startedAt: iso(9), durationMin: '12', announced: 'unannounced', lessonPhase: 'independent_practice', subject: 'Grade 6 ELA', evidence: 'Independent reading with a conference rotation; teacher met two students with logged goals. A student referenced the discussion-norms anchor chart without prompting.', interpretation: 'Conference notes are specific and dated. Sharing the goal-logging routine at a team meeting could be a bright spot.', componentTags: ['2B', '3D'], privacyChecked: true, observer: 'J. Rivera', publishedAt: iso(9), version: 1 },
    { id: 'sample-w4', teacherId: teachers[4].id, createdAt: iso(1), date: dstr(1), startedAt: iso(1), durationMin: '8', announced: 'unannounced', lessonPhase: 'middle', subject: 'Elementary Science', evidence: 'Draft notes: station rotation timing, journal use at stations 2 and 4.', interpretation: '', componentTags: ['2C'], privacyChecked: false, observer: 'A. Principal', version: 1 },
  ];
  const observations = [
    { id: 'sample-f1', teacherId: teachers[0].id, createdAt: iso(45), updatedAt: iso(28), version: 3,
      prework: { plan: 'Grade 4 fractions: compare unit fractions using one half as a benchmark; partner talk with number-line models, then independent practice.', outcomes: 'Students justify comparisons with a visual model and academic vocabulary (numerator, denominator, benchmark).', resources: 'Number-line strips, fraction cards, exit slip; co-planned supports for two students with IEP math goals.', assessment: 'Exit slip with two comparisons and a drawn model; conference notes for the small group.', artifactReferences: 'Unit 3 lesson plan (district curriculum portal, doc M4-U3-L7).' },
      preConferenceNotes: 'Discussed pacing of partner talk and how supports for the small group will be staged.',
      observedLocal: dstr(38),
      evidence: 'At 9:12 the posted objective read "Compare fractions using 1/2 as a benchmark." Teacher modeled 3/8 versus 5/8 on the class number line; 22 of 24 students placed their cards within two minutes. During partner talk the teacher conferred with two pairs and recorded notes. Three students used the sentence-frame chart unprompted. Exit slips were collected at 9:54.',
      reflection: 'Partner talk gave me clearer evidence than whole-group questioning. Next cycle I want to tighten the transition into independent practice, which took four minutes.',
      postConferenceNotes: 'Agreed: keep the benchmark routine, trial a two-minute transition timer, revisit small-group composition after the next unit assessment.',
      ratings: { d1: 2, d2: 3, d3: 2, d4: 2 },
      rationales: { d1: 'Plan aligned outcomes, model, and assessment; supports for IEP goals were specific.', d2: 'Routines ran without teacher redirection; students initiated tools and frames on their own.', d3: 'Questioning pressed for justification with the benchmark; pacing of the closing transition is the growth edge.', d4: 'Reflection identified a concrete next step tied to observed evidence.' },
      componentTags: ['1E', '2B', '3B', '3D'], privacyChecked: true, ackChecked: true,
      preworkSubmittedAt: iso(42), preConferenceAt: iso(40), observedAt: iso(38), evidencePublishedAt: iso(36), reflectionSubmittedAt: iso(34), postConferenceAt: iso(32), evaluatorSignedAt: iso(30), teacherAcknowledgedAt: iso(29), finalizedAt: iso(28) },
    { id: 'sample-f3', teacherId: teachers[2].id, createdAt: iso(20), updatedAt: iso(4), version: 2,
      prework: { plan: 'Grade 6 ELA: text-dependent questions on a shared article; annotation routine, then structured discussion.', outcomes: 'Students cite two pieces of text evidence in discussion and in writing.', resources: 'Article set at three reading levels; discussion tracker.', assessment: 'Discussion tracker plus written-response rubric.', artifactReferences: '' },
      preConferenceNotes: 'Teacher requested a focus on equitable talk time.',
      observedLocal: dstr(12),
      evidence: 'Annotation routine started at 10:03 with a two-minute model. The discussion tracker showed 14 of 26 students spoke at least once; teacher used cold-call cards for six students. Two table groups finished early without an extension task.',
      reflection: 'The tracker data surprised me. I want a clearer plan for early finishers and quieter voices.',
      postConferenceNotes: 'Reviewed the tracker together; agreed on an extension bin and a talk-goal routine for the next observed lesson.',
      ratings: { d1: 2, d2: 2, d3: 2, d4: 2 },
      rationales: { d1: 'Leveled texts matched the class profile.', d2: 'Routines were consistent; early-finisher structure is the gap.', d3: 'Cold-call broadened participation mid-lesson.', d4: 'Teacher brought their own tracker data to the conference.' },
      componentTags: ['2C', '3B', '3C'], privacyChecked: true, ackChecked: false,
      preworkSubmittedAt: iso(17), preConferenceAt: iso(15), observedAt: iso(12), evidencePublishedAt: iso(10), reflectionSubmittedAt: iso(8), postConferenceAt: iso(6), evaluatorSignedAt: iso(4) },
    { id: 'sample-f4', teacherId: teachers[3].id, createdAt: iso(14), updatedAt: iso(3), version: 1,
      prework: { plan: 'ELA writing conference cycle: mini-lesson on evidence-based claims, then individual conferences.', outcomes: 'Each conferred student names one revision they will make and why.', resources: 'Conference log, mentor texts.', assessment: 'Conference-log entries and revised drafts.', artifactReferences: '' },
      preConferenceNotes: '', observedLocal: dstr(8),
      evidence: 'Mini-lesson ran 9:31 to 9:39. Teacher held five conferences averaging four minutes; log entries captured a named revision for each. Two students off task during independent writing were redirected once each.',
      reflection: 'Conferences felt rushed by the end. I may cut to four and protect the closing share.',
      postConferenceNotes: '', ratings: { d1: null, d2: null, d3: null, d4: null }, rationales: { d1: '', d2: '', d3: '', d4: '' },
      componentTags: ['3A', '3D'], privacyChecked: true, ackChecked: false,
      preworkSubmittedAt: iso(12), preConferenceAt: iso(10), observedAt: iso(8), evidencePublishedAt: iso(6), reflectionSubmittedAt: iso(3) },
    { id: 'sample-f5', teacherId: teachers[4].id, createdAt: iso(4), updatedAt: iso(2), version: 1,
      prework: { plan: 'Elementary science: states-of-matter stations with observation journals.', outcomes: 'Students record one observation and one question per station.', resources: 'Four stations, journal pages, timer.', assessment: 'Journal check with a two-point scale.', artifactReferences: '' },
      preConferenceNotes: '', observedLocal: '', evidence: '', reflection: '', postConferenceNotes: '',
      ratings: { d1: null, d2: null, d3: null, d4: null }, rationales: { d1: '', d2: '', d3: '', d4: '' },
      componentTags: [], privacyChecked: false, ackChecked: false,
      preworkSubmittedAt: iso(2) },
  ];
  const spms = [
    { id: 'sample-s1', teacherId: teachers[0].id, createdAt: iso(130), updatedAt: iso(30), status: 'locked', version: 2,
      context: 'Grade 4 mathematics, 24 students, fractions and operations focus.',
      baseline: 'Beginning-of-year district screener: 9 of 24 students at or above benchmark on the fraction strand.',
      goal: 'By the spring administration, at least 17 of 24 students score at or above benchmark on the fraction strand.',
      measures: 'District screener (fall, winter, spring) plus unit assessments.',
      actionPlan: 'Benchmark-fraction routines three times weekly; small-group cycles regrouped after each unit assessment; family practice letters.',
      results: 'Spring screener: 18 of 24 students at or above benchmark. A winter dip in one small group was addressed by regrouping.',
      reflection: 'The regrouping cadence mattered more than total minutes. Keeping it next year.',
      rating: 2.5, ratingRationale: 'Goal met, with documented midcourse adjustments.', approvedBy: 'A. Principal',
      revisions: [{ version: 1, submittedAt: iso(120), context: '', baseline: '', goal: 'By spring, at least 15 of 24 students at or above benchmark on the fraction strand.', measures: '', actionPlan: '' }],
      submittedAt: iso(120), firstOpenedAt: iso(119), approvedAt: iso(112), resultsSubmittedAt: iso(35), lockedAt: iso(30) },
    { id: 'sample-s3', teacherId: teachers[2].id, createdAt: iso(16), updatedAt: iso(11), status: 'approved', version: 1,
      context: 'Grade 6 ELA, 26 students, reading evidence and discussion focus.',
      baseline: 'Fall writing sample: 11 of 26 students cited two or more pieces of text evidence.',
      goal: 'By spring, at least 19 of 26 students cite two or more pieces of text evidence in an on-demand response.',
      measures: 'Quarterly on-demand writing samples scored with the district rubric.',
      actionPlan: 'Weekly annotation routine, discussion tracker with talk goals, and conference cycles for the six students furthest from benchmark.',
      approvedBy: 'J. Rivera', revisions: [],
      submittedAt: iso(13), firstOpenedAt: iso(12), approvedAt: iso(11) },
    { id: 'sample-s4', teacherId: teachers[3].id, createdAt: iso(9), updatedAt: iso(3), status: 'submitted', version: 1,
      context: 'ELA writing, two sections, 48 students total.',
      baseline: 'Fall on-demand draft: 17 of 48 students met the evidence criterion on the district rubric.',
      goal: 'By spring, at least 31 of 48 students meet the evidence criterion on the district rubric.',
      measures: 'District rubric applied to fall, winter, and spring on-demand drafts, double-scored with a colleague.',
      actionPlan: 'Conference cycle prioritized by rubric data; mentor-text mini-lessons; winter checkpoint added to catch drift early.',
      revisions: [], submittedAt: iso(3), firstOpenedAt: iso(3) },
  ];
  const comments = [
    { id: 'sample-c1', teacherId: teachers[0].id, recordType: 'formal_observation', recordId: 'sample-f1', text: 'The benchmark routine is one of the strongest I have seen this year. Would you be willing to share it at the October PLC?', role: 'Evaluator', author: 'A. Principal', at: iso(31), version: 1 },
    { id: 'sample-c2', teacherId: teachers[0].id, recordType: 'formal_observation', recordId: 'sample-f1', text: 'Happy to. I will bring the number-line strips and the exit-slip data.', role: 'Teacher', author: 'Teacher 01', at: iso(30), version: 1 },
    { id: 'sample-c3', teacherId: teachers[2].id, recordType: 'formal_observation', recordId: 'sample-f3', text: 'Ratings and rationales are ready for your review. The acknowledgment step is yours whenever you are ready.', role: 'Evaluator', author: 'A. Principal', at: iso(4), version: 1 },
    { id: 'sample-c4', teacherId: teachers[3].id, recordType: 'spm', recordId: 'sample-s4', text: 'Submitted with the winter checkpoint added, as we discussed.', role: 'Teacher', author: 'Teacher 04', at: iso(3), version: 1 },
  ];
  const workspace = aeNormalizeWorkspace({
    config: { organization: 'Sample School District', building: 'Main Building', academicYear: '2026-27', evaluatorName: 'A. Principal', evaluatorInitials: 'AP', frameworkVersion: AE_FRAMEWORKS.maine_pepg.versionTag, frameworkProfile: 'maine_pepg', pepgPracticeWeight: null, sampleMode: true, setupPath: 'local' },
    teachers, walkthroughs, observations, spms, comments,
    cycleSnapshots: [
      { id: 'sample-cycle-1a', teacherId: teachers[0].id, staffCodeSnapshot: teachers[0].code, academicYear: '2024-25', buildingSnapshot: teachers[0].building, employeeTypeSnapshot: 'professional', finalizedAt: '2025-06-12T20:30:00.000Z', finalScore: 2.08, domainRatings: { d1: 2, d2: 2, d3: 2, d4: 2 }, frameworkVersion: AE_FRAMEWORKS.maine_pepg.versionTag },
      { id: 'sample-cycle-1b', teacherId: teachers[0].id, staffCodeSnapshot: teachers[0].code, academicYear: '2025-26', buildingSnapshot: teachers[0].building, employeeTypeSnapshot: 'professional', finalizedAt: '2026-06-11T20:30:00.000Z', finalScore: 2.22, domainRatings: { d1: 2, d2: 2, d3: 2.5, d4: 2 }, frameworkVersion: AE_FRAMEWORKS.maine_pepg.versionTag },
    ],
    audit: [
      { id: 'sample-a1', teacherId: teachers[0].id, event: 'ASSIGNED', summary: 'Formal observation assigned', actor: 'A. Principal', role: 'Evaluator', at: iso(45), entityType: 'formal_observation', entityId: 'sample-f1', version: 1 },
      { id: 'sample-a2', teacherId: teachers[0].id, event: 'PREWORK_SUBMITTED', summary: 'Prework submitted', actor: 'Teacher 01', role: 'Teacher', at: iso(42), entityType: 'formal_observation', entityId: 'sample-f1', version: 1 },
      { id: 'sample-a3', teacherId: teachers[0].id, event: 'OBSERVED', summary: 'Observation completed', actor: 'A. Principal', role: 'Evaluator', at: iso(38), entityType: 'formal_observation', entityId: 'sample-f1', version: 1 },
      { id: 'sample-a4', teacherId: teachers[0].id, event: 'EVIDENCE_PUBLISHED', summary: 'Observation evidence published to teacher', actor: 'A. Principal', role: 'Evaluator', at: iso(36), entityType: 'formal_observation', entityId: 'sample-f1', version: 1 },
      { id: 'sample-a5', teacherId: teachers[0].id, event: 'REFLECTION_SUBMITTED', summary: 'Teacher reflection submitted', actor: 'Teacher 01', role: 'Teacher', at: iso(34), entityType: 'formal_observation', entityId: 'sample-f1', version: 1 },
      { id: 'sample-a6', teacherId: teachers[0].id, event: 'SIGNED', summary: 'Ratings and rationales signed by evaluator', actor: 'A. Principal', role: 'Evaluator', at: iso(30), entityType: 'formal_observation', entityId: 'sample-f1', version: 2 },
      { id: 'sample-a7', teacherId: teachers[0].id, event: 'SPM_LOCKED', summary: 'SPM results locked after review', actor: 'A. Principal', role: 'Evaluator', at: iso(30), entityType: 'spm', entityId: 'sample-s1', version: 2 },
      { id: 'sample-a8', teacherId: teachers[0].id, event: 'ACKNOWLEDGED', summary: 'Teacher acknowledged the signed observation', actor: 'Teacher 01', role: 'Teacher', at: iso(29), entityType: 'formal_observation', entityId: 'sample-f1', version: 2 },
      { id: 'sample-a9', teacherId: teachers[0].id, event: 'FINALIZED', summary: 'Formal observation finalized', actor: 'A. Principal', role: 'Evaluator', at: iso(28), entityType: 'formal_observation', entityId: 'sample-f1', version: 3 },
      { id: 'sample-a10', teacherId: teachers[0].id, event: 'RELEASED', summary: 'Final evaluation released', actor: 'A. Principal', role: 'Evaluator', at: teachers[0].finalizedAt, entityType: 'evaluation', entityId: teachers[0].id, version: 1 },
      { id: 'sample-a11', teacherId: teachers[1].id, event: 'RELEASED', summary: 'Final evaluation released', actor: 'A. Principal', role: 'Evaluator', at: teachers[1].finalizedAt, entityType: 'evaluation', entityId: teachers[1].id, version: 1 },
      { id: 'sample-a12', teacherId: teachers[2].id, event: 'PUBLISHED', summary: 'Walkthrough published to teacher', actor: 'J. Rivera', role: 'Evaluator', at: iso(9), entityType: 'walkthrough', entityId: 'sample-w3', version: 1 },
      { id: 'sample-a13', teacherId: teachers[2].id, event: 'SIGNED', summary: 'Ratings and rationales signed by evaluator', actor: 'A. Principal', role: 'Evaluator', at: iso(4), entityType: 'formal_observation', entityId: 'sample-f3', version: 2 },
      { id: 'sample-a14', teacherId: teachers[3].id, event: 'SPM_SUBMITTED', summary: 'SPM submitted for approval', actor: 'Teacher 04', role: 'Teacher', at: iso(3), entityType: 'spm', entityId: 'sample-s4', version: 1 },
      { id: 'sample-a15', teacherId: teachers[4].id, event: 'PREWORK_SUBMITTED', summary: 'Prework submitted', actor: 'Teacher 05', role: 'Teacher', at: iso(2), entityType: 'formal_observation', entityId: 'sample-f5', version: 1 },
    ],
  });
  return workspace;
}

function aeSimulationClamp(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function aeSimulationDefaults(workspace) {
  const source = workspace && workspace.config && workspace.config.sampleMode ? workspace : aeSampleWorkspace();
  const staffCount = Math.max(1, (source.teachers || []).length);
  const finalizedCount = (source.teachers || []).filter((teacher) => !!teacher.finalizedAt).length;
  const overdueCount = (source.teachers || []).filter((teacher) => !teacher.finalizedAt && aeTeacherStatus(teacher) === 'overdue').length;
  const published = (source.walkthroughs || []).filter((item) => !!item.publishedAt).length;
  return {
    staffCount,
    buildingCount: Math.max(1, new Set((source.teachers || []).map((teacher) => teacher.building).filter(Boolean)).size),
    finalizedCount,
    overdueCount,
    walkthroughsPerTeacher: Math.max(0, Math.round(published / staffCount)),
    frameworkProfile: source.config.frameworkProfile || 'maine_pepg',
    thinEvidenceDomain: 'none',
  };
}

function aeNormalizeSimulationParams(rawParams) {
  const requested = Object.assign(aeSimulationDefaults(aeSampleWorkspace()), rawParams || {});
  const params = Object.assign({}, requested);
  params.staffCount = aeSimulationClamp(params.staffCount, 1, 60, 8);
  params.buildingCount = aeSimulationClamp(params.buildingCount, 1, Math.min(8, params.staffCount), 2);
  params.finalizedCount = aeSimulationClamp(params.finalizedCount, 0, params.staffCount, 2);
  params.overdueCount = aeSimulationClamp(params.overdueCount, 0, params.staffCount - params.finalizedCount, 1);
  params.walkthroughsPerTeacher = aeSimulationClamp(params.walkthroughsPerTeacher, 0, 8, 1);
  params.frameworkProfile = AE_FRAMEWORKS[params.frameworkProfile] ? params.frameworkProfile : 'maine_pepg';
  params.thinEvidenceDomain = /^d[1-4]$/.test(params.thinEvidenceDomain) ? params.thinEvidenceDomain : 'none';
  const labels = {
    staffCount: 'educators', buildingCount: 'buildings', finalizedCount: 'finalized cycles', overdueCount: 'overdue cycles',
    walkthroughsPerTeacher: 'walkthroughs per educator', frameworkProfile: 'framework', thinEvidenceDomain: 'thin-evidence domain',
  };
  const corrections = Object.keys(labels).filter((key) => String(requested[key]) !== String(params[key])).map((key) => ({
    key,
    label: labels[key],
    requested: requested[key],
    applied: params[key],
  }));
  return { params, corrections };
}

function aeParseSimulationRequest(text, current) {
  const request = aeString(text, 1200, '');
  const next = Object.assign({}, current || aeSimulationDefaults(aeSampleWorkspace()));
  const recognized = [];
  const take = (pattern, key, label) => {
    const match = request.match(pattern);
    if (!match) return;
    next[key] = Number.parseInt(match.slice(1).find((value) => value != null && value !== ''), 10);
    recognized.push(label + ': ' + next[key]);
  };
  take(/\b(?:(\d{1,3})\s+(?:fictional\s+)?(?:educators?|teachers?|staff(?:\s+members?)?)|(?:educators?|teachers?|staff(?:\s+members?)?)\s*(?:to|=|:)?\s*(\d{1,3}))\b/i, 'staffCount', 'staff');
  take(/\b(?:(\d{1,2})\s+(?:school\s+)?buildings?|buildings?\s*(?:to|=|:)?\s*(\d{1,2}))\b/i, 'buildingCount', 'buildings');
  take(/\b(?:(\d{1,3})\s+(?:cycles?\s+)?finali[sz]ed|finali[sz]ed(?:\s+cycles?)?\s*(?:to|=|:)?\s*(\d{1,3}))\b/i, 'finalizedCount', 'finalized');
  take(/\b(?:(\d{1,3})\s+(?:cycles?\s+)?overdue|overdue(?:\s+cycles?)?\s*(?:to|=|:)?\s*(\d{1,3}))\b/i, 'overdueCount', 'overdue');
  take(/\b(?:(\d{1,2})\s+(?:published\s+)?walkthroughs?(?:\s+per\s+(?:educator|teacher|staff(?:\s+member)?))?|walkthroughs?(?:\s+per\s+(?:educator|teacher|staff(?:\s+member)?))?\s*(?:to|=|:)?\s*(\d{1,2}))\b/i, 'walkthroughsPerTeacher', 'walkthroughs per educator');
  if (/\bportland\b/i.test(request)) { next.frameworkProfile = 'portland_me'; recognized.push('framework: Portland, Maine PEPG'); }
  else if (/\bmaine\b|\bpepg\b/i.test(request)) { next.frameworkProfile = 'maine_pepg'; recognized.push('framework: Maine PEPG'); }
  if (/\bpennsylvania\b|\bact\s*13\b/i.test(request)) { next.frameworkProfile = 'pa_act13'; recognized.push('framework: Pennsylvania Act 13'); }
  const domainMatch = request.match(/\b(?:thin|less|fewer|sparse)\s+(?:evidence\s+)?(?:in|for)?\s*(?:domain\s*)?([1-4])\b/i);
  if (domainMatch) { next.thinEvidenceDomain = 'd' + domainMatch[1]; recognized.push('thin evidence: Domain ' + domainMatch[1]); }
  if (/\b(?:balanced|even)\s+evidence\b|\bno\s+thin\s+domain\b/i.test(request)) { next.thinEvidenceDomain = 'none'; recognized.push('evidence: balanced'); }
  const knownClause = /(?:educators?|teachers?|staff|buildings?|finali[sz]ed|overdue|walkthroughs?|maine|pepg|portland|pennsylvania|act\s*13|evidence|domain)/i;
  const ignored = request.split(/[,;\n]+|\band\b/i).map((clause) => clause.trim()).filter((clause) => clause && !knownClause.test(clause));
  const normalized = aeNormalizeSimulationParams(next);
  return { params: normalized.params, recognized, ignored, corrections: normalized.corrections, ok: recognized.length > 0 };
}

function aeBuildSimulatedWorkspace(rawParams) {
  const params = aeNormalizeSimulationParams(rawParams).params;

  const next = aeClone(aeSampleWorkspace());
  next.config.sampleMode = true;
  next.config.frameworkProfile = params.frameworkProfile;
  next.config.organization = 'Fictional Simulation District';
  next.config.setupPath = 'local';
  aeSetActiveFramework(next.config);
  const buildings = ['Main Building', 'North Campus', 'Learning Center', 'West School', 'Middle School', 'High School', 'Early Learning', 'Virtual Academy'].slice(0, params.buildingCount);
  const existing = next.teachers.slice(0, params.staffCount);
  for (let index = existing.length; index < params.staffCount; index += 1) {
    const number = index + 1;
    existing.push({
      id: 'sim-t' + number, code: 'T-' + String(number).padStart(2, '0'), name: 'Teacher ' + String(number).padStart(2, '0'),
      building: buildings[index % buildings.length], assignment: ['Elementary', 'ELA', 'Mathematics', 'Science'][index % 4],
      employeeType: 'professional', buildingData: true, teacherSpecificData: true, active: true,
      evaluator: index % 4 === 3 ? 'J. Rivera' : 'A. Principal', dueDate: '', cycleStatus: 'not_started', lastActivityAt: null,
      finalizedAt: null, cycleLockedAt: null, finalScore: null,
      ratings: { domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null },
    });
  }
  const day = 86400000;
  existing.forEach((teacher, index) => {
    teacher.building = buildings[index % buildings.length];
    teacher.finalizedAt = null; teacher.cycleLockedAt = null; teacher.finalScore = null;
    teacher.ratings = { domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null };
    if (index < params.finalizedCount) {
      teacher.cycleStatus = 'finalized';
      teacher.finalizedAt = new Date(Date.now() - (index + 2) * day).toISOString();
      teacher.cycleLockedAt = teacher.finalizedAt;
      teacher.ratings = { domains: { d1: 2, d2: 2, d3: 2, d4: 2 }, building: 2.2, teacher: 2.1, lea: 2.3 };
    } else if (index < params.finalizedCount + params.overdueCount) {
      teacher.cycleStatus = 'overdue'; teacher.dueDate = new Date(Date.now() - 7 * day).toISOString().slice(0, 10);
    } else {
      teacher.cycleStatus = index % 3 === 0 ? 'in_progress' : 'not_started';
      teacher.dueDate = new Date(Date.now() + (60 + index) * day).toISOString().slice(0, 10);
    }
  });
  next.teachers = existing;
  const ids = new Set(existing.map((teacher) => teacher.id));
  next.observations = next.observations.filter((item) => ids.has(item.teacherId));
  next.spms = next.spms.filter((item) => ids.has(item.teacherId));
  next.comments = next.comments.filter((item) => ids.has(item.teacherId));
  next.cycleSnapshots = next.cycleSnapshots.filter((item) => ids.has(item.teacherId));

  const domainCodes = {};
  Object.keys(AE_ACTIVE_FW.components || {}).forEach((domainId) => {
    const first = (AE_ACTIVE_FW.components[domainId] || [])[0];
    if (first) domainCodes[domainId] = Array.isArray(first) ? first[0] : (typeof first === 'string' ? first : first.code);
  });
  const usableTags = Object.keys(domainCodes).filter((domainId) => domainId !== params.thinEvidenceDomain).map((domainId) => domainCodes[domainId]).filter(Boolean);
  next.walkthroughs = [];
  existing.forEach((teacher, teacherIndex) => {
    for (let index = 0; index < params.walkthroughsPerTeacher; index += 1) {
      const at = new Date(Date.now() - (teacherIndex * params.walkthroughsPerTeacher + index + 1) * day);
      next.walkthroughs.push({
        id: 'sim-w-' + (teacherIndex + 1) + '-' + (index + 1), teacherId: teacher.id, createdAt: at.toISOString(), date: at.toISOString().slice(0, 10), startedAt: at.toISOString(), durationMin: String(8 + (index % 3)),
        announced: index % 2 ? 'announced' : 'unannounced', lessonPhase: ['opening', 'middle', 'guided_practice'][index % 3], subject: teacher.assignment,
        evidence: 'Fictional evidence: students used the posted routine, the educator checked understanding, and the simulation recorded a dated observation without student names.',
        interpretation: 'Simulation-only reflection: compare the documented routine with the selected framework; this is not a rating.',
        componentTags: usableTags.length ? [usableTags[(teacherIndex + index) % usableTags.length]] : [], privacyChecked: true,
        observer: teacher.evaluator, publishedAt: at.toISOString(), version: 1,
      });
    }
  });
  next.audit = [{ id: 'simulation-generated', event: 'CONFIG_UPDATED', summary: 'Fictional simulation generated from adjustable parameters', actor: next.config.evaluatorName, role: 'Evaluator', at: aeNow(), entityType: 'workspace', entityId: 'simulation', teacherId: '', version: 1 }];
  return aeNormalizeWorkspace(next);
}

function aeSimulationSummary(workspace) {
  const teachers = (workspace && workspace.teachers) || [];
  return {
    staff: teachers.length,
    buildings: new Set(teachers.map((teacher) => teacher.building).filter(Boolean)).size,
    finalized: teachers.filter((teacher) => !!teacher.finalizedAt).length,
    overdue: teachers.filter((teacher) => !teacher.finalizedAt && aeTeacherStatus(teacher) === 'overdue').length,
    walkthroughs: ((workspace && workspace.walkthroughs) || []).filter((item) => !!item.publishedAt).length,
  };
}

function aeBlankWorkspace() {
  return aeNormalizeWorkspace({
    config: { organization: 'My School District', building: 'My School', academicYear: aeSchoolYear(), evaluatorName: 'Principal', evaluatorInitials: '', frameworkVersion: AE_FRAMEWORKS.maine_pepg.versionTag, frameworkProfile: 'maine_pepg', pepgPracticeWeight: null, sampleMode: false },
    teachers: [], walkthroughs: [], observations: [], spms: [], comments: [], audit: [], cycleSnapshots: [],
  });
}

function aeWeightProfile(teacher) {
  const snapshot = teacher && aeSafeWeightSnapshot(teacher.weightSnapshot);
  if (snapshot) return snapshot;
  if (AE_ACTIVE_FW.id === 'portland_me') {
    // Guidebook v1.0 publishes the categorical practice roll-up but left the
    // student-growth combination formula to later plan versions, so this
    // profile shows practice only and defers the combined score to the
    // district's current plan documents.
    return [
      { id: 'observation', label: 'Educator Practice (Portland Framework for Teaching)', short: 'EP', weight: 100, color: '#1d4ed8' },
    ];
  }
  if (AE_ACTIVE_FW.id === 'maine_pepg') {
    // Maine PEPG: two locally weighted categories, professional practice and
    // student learning & growth. The split comes from the district's plan via
    // configuration; until entered, practice shows 100% and the UI prompts for
    // the plan's split rather than inventing one. The SLG measure reuses the
    // generic `lea` rating slot.
    const practice = AE_ACTIVE_FW.practiceWeight;
    if (practice === null) return [
      // A practice-only configuration is legitimate: since Maine's 2019
      // amendments, student learning & growth measures are a district CHOICE,
      // not a mandate. The About field sets a split only if the plan has one.
      { id: 'observation', label: 'Professional Practice (100%, set an SLG split in About if your plan includes one)', short: 'PP', weight: 100, color: '#1d4ed8' },
    ];
    return [
      { id: 'observation', label: 'Professional Practice', short: 'PP', weight: practice, color: '#1d4ed8' },
      { id: 'lea', label: 'Student Learning & Growth', short: 'SLG', weight: 100 - practice, color: '#b45309' },
    ].filter((item) => item.weight > 0);
  }
  const temporary = teacher && teacher.employeeType === 'temporary';
  if (temporary) return [
    { id: 'observation', label: 'Observation & Practice', short: 'O&P', weight: 100, color: '#1d4ed8' },
  ];
  const hasBuilding = !teacher || teacher.buildingData !== false;
  const hasTeacher = !teacher || teacher.teacherSpecificData !== false;
  const observation = hasBuilding ? 70 : 80;
  const lea = hasTeacher ? 10 : 20;
  return [
    { id: 'observation', label: 'Observation & Practice', short: 'O&P', weight: observation, color: '#1d4ed8' },
    { id: 'building', label: 'Building Level Data', short: 'BLD', weight: hasBuilding ? 10 : 0, color: '#0f766e' },
    { id: 'teacher', label: 'Teacher-Specific Data', short: 'TSD', weight: hasTeacher ? 10 : 0, color: '#7c3aed' },
    { id: 'lea', label: 'LEA Selected Measure / SPM', short: 'SPM', weight: lea, color: '#b45309' },
  ].filter((item) => item.weight > 0);
}

function aeFreezeTeacherCycle(teacher) {
  if (!teacher || teacher.cycleLockedAt) return;
  teacher.weightSnapshot = aeWeightProfile(teacher).map((part) => ({
    id: part.id, label: part.label, short: part.short, weight: part.weight, color: part.color,
  }));
  teacher.frameworkVersion = AE_ACTIVE_FW.versionTag;
  teacher.cycleLockedAt = aeNow();
}

function aeNumberOrNull(value) {
  return aeRatingValue(value);
}
// Historical records must score under the framework they were created in, // a workspace profile switch may never move finalized history (domains
// 3,2,2,3 = 2.40 weighted vs 2.50 equal-average crosses a band boundary).
// PA-era tags (and all legacy/unknown stamps, which predate profiles) use the
// statutory 20/30/30/20 weighting; me-* tags use the equal average.
function aeObservationScoreFor(ratings, frameworkVersion) {
  const domains = (ratings && ratings.domains) || {};
  if (AE_DOMAINS.some((domain) => aeNumberOrNull(domains[domain.id]) === null)) return null;
  const tag = String(frameworkVersion || '');
  const currentCustom = AE_ACTIVE_FW.id === 'custom' && tag === AE_ACTIVE_FW.versionTag;
  const weighted = currentCustom ? !!AE_ACTIVE_FW.domainWeighted : !tag.startsWith('me-');
  if (!weighted) {
    const total = AE_DOMAINS.reduce((sum, domain) => sum + Math.round(aeNumberOrNull(domains[domain.id]) * 100), 0);
    return total / (AE_DOMAINS.length * 100);
  }
  const scaled = AE_DOMAINS.reduce((sum, domain) => sum + Math.round(aeNumberOrNull(domains[domain.id]) * domain.weight * 100), 0);
  return scaled / 10000;
}

function aeObservationScore(ratings) {
  const domains = (ratings && ratings.domains) || {};
  if (AE_DOMAINS.some((domain) => aeNumberOrNull(domains[domain.id]) === null)) return null;
  if (!AE_ACTIVE_FW.domainWeighted) {
    // No statutory within-practice weights in this framework: equal average,
    // and the UI says so wherever the composite is explained.
    const total = AE_DOMAINS.reduce((sum, domain) => sum + Math.round(aeNumberOrNull(domains[domain.id]) * 100), 0);
    return total / (AE_DOMAINS.length * 100);
  }
  const scaled = AE_DOMAINS.reduce((sum, domain) => sum + Math.round(aeNumberOrNull(domains[domain.id]) * domain.weight * 100), 0);
  return scaled / 10000;
}

function aeOverallScore(teacher) {
  if (!teacher) return null;
  const ratings = teacher.ratings || {};
  const observation = aeObservationScore(ratings);
  if (observation === null) return null;
  const factors = { observation, building: aeNumberOrNull(ratings.building), teacher: aeNumberOrNull(ratings.teacher), lea: aeNumberOrNull(ratings.lea) };
  const profile = aeWeightProfile(teacher);
  if (profile.some((part) => factors[part.id] === null)) return null;
  const scaled = profile.reduce((sum, part) => sum + Math.round(factors[part.id] * part.weight * 100), 0);
  return scaled / 10000;
}

function aeRoundedScore(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) return null;
  const value = Number(score);
  if (value < 0 || value > 3) return null;
  const truncatedToThree = Math.trunc((value + Number.EPSILON) * 1000) / 1000;
  return Math.round((truncatedToThree + Number.EPSILON) * 100) / 100;
}
function aeBand(score) {
  const n = aeRoundedScore(score);
  if (n === null) return null;
  const band = AE_ACTIVE_FW.bands.find((item) => n >= item.min);
  return band ? aeTranslatedRubricLabel(band.label) : aeTranslatedRubricLabel(AE_ACTIVE_FW.bands[AE_ACTIVE_FW.bands.length - 1].label);
}

function aeCycleFinalized(teacher) {
  return !!(teacher && (teacher.finalizedAt || teacher.cycleStatus === 'finalized'));
}

function aeTeacherStatus(teacher) {
  if (!teacher) return 'not_started';
  if (aeCycleFinalized(teacher)) return 'finalized';
  if (teacher.dueDate && teacher.dueDate < aeToday()) return 'overdue';
  if (teacher.cycleStatus && AE_STATUS_META[teacher.cycleStatus]) return teacher.cycleStatus;
  return 'not_started';
}
function aeCompletionSummary(teachers) {
  const eligible = (Array.isArray(teachers) ? teachers : []).filter((teacher) => teacher && teacher.active !== false);
  const statuses = { finalized: 0, awaiting_teacher: 0, awaiting_evaluator: 0, in_progress: 0, overdue: 0, not_started: 0 };
  eligible.forEach((teacher) => { const key = aeTeacherStatus(teacher); statuses[key] = (statuses[key] || 0) + 1; });
  return { total: eligible.length, finalized: statuses.finalized, open: eligible.length - statuses.finalized, statuses };
}

function aeStepOfObservation(observation) {
  if (!observation) return 0;
  if (observation.finalizedAt) return 9;
  if (observation.teacherAcknowledgedAt) return 8;
  if (observation.evaluatorSignedAt) return 7;
  if (observation.postConferenceAt) return 6;
  if (observation.reflectionSubmittedAt) return 5;
  if (observation.evidencePublishedAt) return 4;
  if (observation.observedAt) return 3;
  if (observation.preConferenceAt) return 2;
  if (observation.preworkSubmittedAt) return 1;
  return 0;
}

const AE_OBS_STEPS = ['Assigned', 'Prework', 'Pre-conference', 'Observation', 'Evidence review', 'Reflection', 'Post-conference', 'Ratings', 'Acknowledged', 'Finalized'];
const AE_REHEARSAL_STEP_GUIDANCE = [
  { owner: 'teacher', title: 'Fictional educator submits prework', text: 'Add a short lesson plan and expected outcomes, then submit the fictional pre-observation materials.' },
  { owner: 'evaluator', title: 'Evaluator records the pre-conference', text: 'Review the submitted plan, add a brief conference note, and mark the pre-conference complete.' },
  { owner: 'evaluator', title: 'Evaluator starts the observation', text: 'Use the current time or enter a fictional scheduled time, then start the observation.' },
  { owner: 'evaluator', title: 'Evaluator publishes factual evidence', text: 'Enter time-stamped fictional evidence, tag at least one component, complete the privacy check, and publish.' },
  { owner: 'teacher', title: 'Fictional educator reflects', text: 'Read the published evidence, add a fictional reflection, and submit it.' },
  { owner: 'evaluator', title: 'Evaluator records the post-conference', text: 'Read the reflection, document a fictional discussion and follow-up, and mark the conference complete.' },
  { owner: 'evaluator', title: 'Evaluator rates and signs', text: 'Choose all four observation ratings, link each rationale to the fictional evidence, and sign the assessment.' },
  { owner: 'teacher', title: 'Fictional educator acknowledges receipt', text: 'Review the assessment, confirm receipt, and acknowledge. This records receipt, not agreement.' },
  { owner: 'evaluator', title: 'Evaluator finalizes the observation', text: 'Confirm the acknowledgement is present, then finalize the locked formal-observation record.' },
  { owner: 'evaluator', title: 'Complete the annual release rehearsal', text: 'The formal record is locked. Return to Overview, enter the annual rating inputs, confirm the official-system rehearsal statement, and record the fictional final release.' },
];

function aeRehearsalGuidance(step) {
  const item = AE_REHEARSAL_STEP_GUIDANCE[step];
  if (!item) return null;
  const copy = [
    ["educator_evaluation.fictional_educator_submits_prework_1e2r4t6", "Fictional educator submits prework", "educator_evaluation.add_a_short_lesson_plan_and_expected_outcomes_then_submi_1y3u5w7", "Add a short lesson plan and expected outcomes, then submit the fictional pre-observation materials."],
    ["educator_evaluation.evaluator_records_the_pre_conference_1i4k6m8", "Evaluator records the pre-conference", "educator_evaluation.review_the_submitted_plan_add_a_brief_conference_note_and_m_1o5q7s9", "Review the submitted plan, add a brief conference note, and mark the pre-conference complete."],
    ["educator_evaluation.evaluator_starts_the_observation_1p2r4t6", "Evaluator starts the observation", "educator_evaluation.use_the_current_time_or_enter_a_fictional_scheduled_time_1v3x5z7", "Use the current time or enter a fictional scheduled time, then start the observation."],
    ["educator_evaluation.evaluator_publishes_factual_evidence_1b4d6f8", "Evaluator publishes factual evidence", "educator_evaluation.enter_time_stamped_fictional_evidence_tag_at_least_one_com_1h5j7l9", "Enter time-stamped fictional evidence, tag at least one component, complete the privacy check, and publish."],
    ["educator_evaluation.fictional_educator_reflects_1n2p4r6", "Fictional educator reflects", "educator_evaluation.read_the_published_evidence_add_a_fictional_reflection_and_1t3v5x7", "Read the published evidence, add a fictional reflection, and submit it."],
    ["educator_evaluation.evaluator_records_the_post_conference_1z2b4d6", "Evaluator records the post-conference", "educator_evaluation.read_the_reflection_document_a_fictional_discussion_and_fo_1f5h7j9", "Read the reflection, document a fictional discussion and follow-up, and mark the conference complete."],
    ["educator_evaluation.evaluator_rates_and_signs_1l2n4p6", "Evaluator rates and signs", "educator_evaluation.choose_all_four_observation_ratings_link_each_rationale_to_1r3t5v7", "Choose all four observation ratings, link each rationale to the fictional evidence, and sign the assessment."],
    ["educator_evaluation.fictional_educator_acknowledges_receipt_1x2z4b6", "Fictional educator acknowledges receipt", "educator_evaluation.review_the_assessment_confirm_receipt_and_acknowledge_this_1d3f5h7", "Review the assessment, confirm receipt, and acknowledge. This records receipt, not agreement."],
    ["educator_evaluation.evaluator_finalizes_the_observation_1j2l4n6", "Evaluator finalizes the observation", "educator_evaluation.confirm_the_acknowledgement_is_present_then_finalize_the_locked_1p3r5t7", "Confirm the acknowledgement is present, then finalize the locked formal-observation record."],
    ["educator_evaluation.complete_the_annual_release_rehearsal_1v2x4z6", "Complete the annual release rehearsal", "educator_evaluation.the_formal_record_is_locked_return_to_overview_enter_the_annual_r_1b3d5f7", "The formal record is locked. Return to Overview, enter the annual rating inputs, confirm the official-system rehearsal statement, and record the fictional final release."],
  ][step];
  return { owner: item.owner, title: t(copy[0], copy[1]), text: t(copy[2], copy[3]) };
}

function aeObservationStepLabel(index) {
  const labels = [
    ["educator_evaluation.assigned_1a2c4e6", 'Assigned'],
    ["educator_evaluation.prework_1g2i4k6", 'Prework'],
    ["educator_evaluation.pre_conference_1m3o5q7", 'Pre-conference'],
    ["educator_evaluation.observation_1s4u6w8", 'Observation'],
    ["educator_evaluation.evidence_review_1y2a4c6", 'Evidence review'],
    ["educator_evaluation.reflection_1e3g5i7", 'Reflection'],
    ["educator_evaluation.post_conference_1k2m4o6", 'Post-conference'],
    ["educator_evaluation.ratings_1q3s5u7", 'Ratings'],
    ["educator_evaluation.acknowledged_1w2y4a6", 'Acknowledged'],
    ["educator_evaluation.finalized_1c3e5g7", 'Finalized'],
  ];
  const entry = labels[index];
  return entry ? t(entry[0], entry[1]) : '';
}

function aeTeacherNextAction(workspace, teacher) {
  if (!workspace || !teacher) return { tab: 'overview', label: t("educator_evaluation.choose_an_educator_1l6d6bg", 'Choose an educator'), detail: t("educator_evaluation.no_educator_selected_1h3j5l7", 'No educator selected'), owner: 'none' };
  if (teacher.finalizedAt || teacher.cycleStatus === 'finalized') return { tab: 'audit', label: t("educator_evaluation.review_released_record_1n4p6r8", 'Review released record'), detail: t("educator_evaluation.cycle_finalized_1t2v4x6", 'Cycle finalized'), owner: 'complete' };
  const observations = (workspace.observations || []).filter((item) => item.teacherId === teacher.id && !item.finalizedAt)
    .sort((a, b) => String(b.createdAt || b.observedAt || '').localeCompare(String(a.createdAt || a.observedAt || '')));
  const evaluatorObservationLabels = {
    1: t("educator_evaluation.record_pre_conference_1z3b5d7", 'Record pre-conference'), 2: t("educator_evaluation.record_observation_1f4h6j8", 'Record observation'), 3: t("educator_evaluation.publish_observation_evidence_1l5n7p9", 'Publish observation evidence'),
    5: t("educator_evaluation.record_post_conference_1r2t4v6", 'Record post-conference'), 6: t("educator_evaluation.complete_ratings_and_sign_1x3z5b7", 'Complete ratings and sign'), 8: t("educator_evaluation.finalize_observation_1d4f6h8", 'Finalize observation'),
  };
  const waitingObservationLabels = { 0: t("educator_evaluation.waiting_for_prework_1j5l7n9", 'Waiting for prework'), 4: t("educator_evaluation.waiting_for_reflection_1p2r4t6", 'Waiting for reflection'), 7: t("educator_evaluation.waiting_for_educator_acknowledgment_1v3x5z7", 'Waiting for educator acknowledgment') };
  const teacherObservationLabels = { 0: 'Complete pre-observation work', 4: 'Submit your post-observation reflection', 7: 'Acknowledge the observation rating record' };
  const evaluatorObservation = observations.find((item) => evaluatorObservationLabels[aeStepOfObservation(item)]);
  if (evaluatorObservation) {
    const step = aeStepOfObservation(evaluatorObservation);
    return { tab: 'formal', label: evaluatorObservationLabels[step], detail: t("educator_evaluation.formal_observation_step_1b4d6f8", 'Formal observation step ') + (step + 1) + t("educator_evaluation.of_10_1af6cv5", ' of 10'), owner: 'evaluator' };
  }
  const spm = (workspace.spms || []).find((item) => item.teacherId === teacher.id && item.status !== 'locked');
  if (spm && spm.status === 'submitted') return { tab: 'spm', label: t("educator_evaluation.review_submitted_spm_slo_1h6j8l0", 'Review submitted SPM / SLO'), detail: t("educator_evaluation.educator_proposal_is_ready_1n2p4r6", 'Educator proposal is ready'), owner: 'evaluator' };
  if (spm && spm.status === 'results_submitted') return { tab: 'spm', label: t("educator_evaluation.rate_submitted_spm_slo_results_1t3v5x7", 'Rate submitted SPM / SLO results'), detail: t("educator_evaluation.results_and_reflection_are_ready_1z2b4d6", 'Results and reflection are ready'), owner: 'evaluator' };
  const privateWalkthrough = (workspace.walkthroughs || []).find((item) => item.teacherId === teacher.id && !item.publishedAt);
  if (privateWalkthrough) return { tab: 'walkthroughs', label: t("educator_evaluation.finish_walkthrough_draft_1f5h7j9", 'Finish walkthrough draft'), detail: t("educator_evaluation.private_evidence_draft_1l2n4p6", 'Private evidence draft'), owner: 'evaluator' };
  const waitingObservation = observations.find((item) => waitingObservationLabels[aeStepOfObservation(item)]);
  if (waitingObservation) {
    const step = aeStepOfObservation(waitingObservation);
    return { tab: 'formal', label: waitingObservationLabels[step], teacherLabel: teacherObservationLabels[step], detail: t("educator_evaluation.formal_observation_step_1b4d6f8", 'Formal observation step ') + (step + 1) + t("educator_evaluation.of_10_1af6cv5", ' of 10'), owner: 'teacher' };
  }
  if (spm && ['draft', 'returned'].includes(spm.status)) return { tab: 'spm', label: t("educator_evaluation.waiting_for_spm_slo_submission_1r3t5v7", 'Waiting for SPM / SLO submission'), teacherLabel: spm.status === 'returned' ? 'Revise and resubmit your SPM / SLO plan' : 'Complete and submit your SPM / SLO plan', detail: spm.status === 'returned' ? t("educator_evaluation.revision_requested_1x2z4b6", 'Revision requested') : t("educator_evaluation.educator_draft_1d3f5h7", 'Educator draft'), owner: 'teacher' };
  if (spm && spm.status === 'approved') return { tab: 'spm', label: t("educator_evaluation.waiting_for_spm_slo_results_1j2l4n6", 'Waiting for SPM / SLO results'), teacherLabel: 'Submit your year-end SPM / SLO results', detail: t("educator_evaluation.goal_approved_1p3r5t7", 'Goal approved'), owner: 'teacher' };
  const unacknowledgedWalkthrough = (workspace.walkthroughs || []).find((item) => item.teacherId === teacher.id && item.publishedAt && !item.teacherAcknowledgedAt);
  if (unacknowledgedWalkthrough) return { tab: 'walkthroughs', label: t("educator_evaluation.waiting_for_walkthrough_acknowledgment_1v2x4z6", 'Waiting for walkthrough acknowledgment'), teacherLabel: 'Acknowledge published walkthrough evidence', detail: t("educator_evaluation.published_evidence_available_1b3d5f7", 'Published evidence available'), owner: 'teacher' };
  if (!(workspace.observations || []).some((item) => item.teacherId === teacher.id)) return { tab: 'formal', label: t("educator_evaluation.assign_formal_observation_1h4j6l8", 'Assign formal observation'), detail: t("educator_evaluation.formal_cycle_not_started_1n5p7r9", 'Formal cycle not started'), owner: 'evaluator' };
  return { tab: 'overview', label: t("educator_evaluation.complete_final_evaluation_1t2v4x6", 'Complete final evaluation'), detail: t("educator_evaluation.review_ratings_and_release_status_1z3b5d7", 'Review ratings and release status'), owner: 'evaluator' };
}

function aeRecalculateCycleStatus(workspace, teacherId) {
  const teacher = workspace && workspace.teachers.find((item) => item.id === teacherId);
  if (!teacher || teacher.finalizedAt) return;
  const allObservations = workspace.observations.filter((item) => item.teacherId === teacherId);
  const observations = allObservations.filter((item) => !item.finalizedAt);
  const walkthroughs = workspace.walkthroughs.filter((item) => item.teacherId === teacherId);
  const allSpms = workspace.spms.filter((item) => item.teacherId === teacherId);
  const spms = allSpms.filter((item) => item.status !== 'locked');
  const evaluatorAction = observations.some((item) => [1, 2, 3, 5, 6, 8].includes(aeStepOfObservation(item)))
    || walkthroughs.some((item) => !item.publishedAt)
    || spms.some((item) => ['submitted', 'results_submitted'].includes(item.status));
  const teacherAction = observations.some((item) => [0, 4, 7].includes(aeStepOfObservation(item)))
    || walkthroughs.some((item) => item.publishedAt && !item.teacherAcknowledgedAt)
    || spms.some((item) => ['draft', 'returned', 'approved'].includes(item.status));
  const hasActivity = allObservations.length || walkthroughs.length || allSpms.length;
  teacher.cycleStatus = evaluatorAction ? 'awaiting_evaluator' : (teacherAction ? 'awaiting_teacher' : (hasActivity ? 'in_progress' : 'not_started'));
}
const AE_MIN_TREND_COHORT = 10;
const AE_MAX_CYCLE_SNAPSHOTS = 5000;

function aeMedian(values) {
  const sorted = (Array.isArray(values) ? values : []).map(aeRatingValue).filter((value) => value !== null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : aeRoundedScore((sorted[middle - 1] + sorted[middle]) / 2);
}

function aeTrendPointMetric(point, metric) {
  if (!point) return null;
  return aeRatingValue(metric === 'overall' ? point.overall : point[metric]);
}

function aeTeacherTrendPoints(workspace, teacherId, filters) {
  if (!workspace || !teacherId) return [];
  const options = filters || {};
  const from = aeDateValue(options.from);
  const to = aeDateValue(options.to);
  const sourceFilter = ['cycle_snapshot', 'formal_observation'].includes(options.source) ? options.source : '';
  const withinRange = (date) => !!date && (!from || date >= from) && (!to || date <= to);
  const points = [];
  (workspace.cycleSnapshots || []).filter((snapshot) => snapshot.teacherId === teacherId && snapshot.finalizedAt).forEach((snapshot) => {
    const domains = snapshot.domainRatings || {};
    const date = aeString(snapshot.finalizedAt, 10, '').slice(0, 10);
    points.push({
      teacherId, source: 'cycle_snapshot', recordId: snapshot.id, date,
      academicYear: snapshot.academicYear || '', overall: aeObservationScoreFor({ domains }, snapshot.frameworkVersion),
      d1: aeRatingValue(domains.d1), d2: aeRatingValue(domains.d2), d3: aeRatingValue(domains.d3), d4: aeRatingValue(domains.d4),
    });
  });
  (workspace.observations || []).filter((observation) => observation.teacherId === teacherId && observation.finalizedAt).forEach((observation) => {
    const domains = observation.ratings || {};
    const date = aeString(observation.observedAt || observation.finalizedAt, 10, '').slice(0, 10);
    const overall = aeObservationScoreFor({ domains }, observation.frameworkVersion);
    if (overall === null) return;
    points.push({
      teacherId, source: 'formal_observation', recordId: observation.id, date,
      academicYear: workspace.config && workspace.config.academicYear || '',
      overall: overall === null ? null : aeRoundedScore(overall),
      d1: aeRatingValue(domains.d1), d2: aeRatingValue(domains.d2), d3: aeRatingValue(domains.d3), d4: aeRatingValue(domains.d4),
    });
  });
  return points.filter((point) => (!sourceFilter || point.source === sourceFilter) && withinRange(point.date) && ['overall', 'd1', 'd2', 'd3', 'd4'].some((metric) => point[metric] !== null)).sort((a, b) => a.date.localeCompare(b.date) || a.recordId.localeCompare(b.recordId));
}

function aeDistinctTeacherMedian(points, metric) {
  const byTeacher = {};
  (Array.isArray(points) ? points : []).forEach((point) => {
    const teacherId = aeString(point && point.teacherId, 100, '');
    const value = aeTrendPointMetric(point, metric);
    if (!teacherId || value === null) return;
    byTeacher[teacherId] = byTeacher[teacherId] || [];
    byTeacher[teacherId].push(value);
  });
  const means = Object.values(byTeacher).map((values) => aeRoundedScore(values.reduce((sum, value) => sum + value, 0) / values.length));
  return { value: aeMedian(means), contributorCount: means.length };
}

function aeCohortMetric(points, selectedTeacherId, metric, minimum) {
  const threshold = Math.max(1, Number.parseInt(minimum, 10) || AE_MIN_TREND_COHORT);
  const peers = (Array.isArray(points) ? points : []).filter((point) => point && point.teacherId !== selectedTeacherId);
  const result = aeDistinctTeacherMedian(peers, metric);
  if (result.contributorCount < threshold) return { suppressed: true, value: null, contributorCount: null, minimum: threshold };
  return { suppressed: false, value: result.value, contributorCount: result.contributorCount, minimum: threshold };
}

function aeWorkspaceCohortMetric(workspace, selectedTeacherId, metric, filters) {
  const selected = (workspace && workspace.teachers || []).find((teacher) => teacher.id === selectedTeacherId);
  const selectedValues = aeTeacherTrendPoints(workspace, selectedTeacherId, filters).map((point) => aeTrendPointMetric(point, metric)).filter((value) => value !== null);
  const selectedMean = selectedValues.length ? aeRoundedScore(selectedValues.reduce((sum, value) => sum + value, 0) / selectedValues.length) : null;
  if (!selected) return Object.assign(aeCohortMetric([], selectedTeacherId, metric, AE_MIN_TREND_COHORT), { selectedMean });
  const peerIds = new Set((workspace.teachers || []).filter((teacher) => (
    teacher.id !== selectedTeacherId && teacher.active !== false
    && teacher.building === selected.building && teacher.employeeType === selected.employeeType
  )).map((teacher) => teacher.id));
  const peerPoints = [];
  peerIds.forEach((teacherId) => peerPoints.push(...aeTeacherTrendPoints(workspace, teacherId, filters)));
  const result = aeCohortMetric(peerPoints, selectedTeacherId, metric, AE_MIN_TREND_COHORT);
  return Object.assign(result, { selectedMean, median: result.value, peerCount: result.contributorCount });
}
function aeEsc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function aeCsv(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const cell = (value) => {
    let s = String(value == null ? '' : value);
    if (/^[\t ]*[=+\-@]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [headers.map(cell).join(','), ...rows.map((row) => headers.map((header) => cell(row[header])).join(','))].join('\r\n');
}
function aeDownload(name, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function aeAuditEvent(workspace, data, actor, role) {
  workspace.audit.unshift(Object.assign({
    id: aeId('audit'), event: 'UPDATED', summary: t("educator_evaluation.record_updated_4vfl5f", 'Record updated'), actor, role,
    at: aeNow(), entityType: 'workspace', entityId: '', teacherId: '', version: 1,
  }, data || {}));
  workspace.audit = workspace.audit.slice(0, 5000);
}

const AE_STYLES = `
.ae-shell{--ae-navy:#10233f;--ae-blue:#1d4ed8;--ae-ink:#172033;--ae-muted:#5b667a;--ae-line:#d8deea;--ae-bg:#f4f7fb;--ae-white:#fff;color:var(--ae-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:15px;line-height:1.45}
.ae-shell *{box-sizing:border-box}.ae-overlay{position:fixed;inset:0;z-index:270;background:rgba(7,18,38,.62);display:flex;align-items:center;justify-content:center;padding:12px}.ae-workspace{width:min(1480px,100%);height:min(94vh,980px);background:var(--ae-bg);border-radius:22px;box-shadow:0 30px 80px rgba(7,18,38,.35);overflow:hidden;display:flex;flex-direction:column}.ae-standalone{min-height:100vh;min-height:100dvh;background:var(--ae-bg)}.ae-standalone .ae-workspace{width:100%;height:100vh;height:100dvh;min-height:100vh;min-height:100dvh;border-radius:0;box-shadow:none}
.ae-top{background:linear-gradient(120deg,#10233f,#173e70);color:#fff;padding:14px 20px;display:flex;gap:16px;align-items:center;justify-content:space-between}.ae-brand{display:flex;gap:12px;align-items:center;min-width:0}.ae-mark{width:42px;height:42px;border-radius:13px;background:#fff;color:#173e70;display:grid;place-items:center;font-size:22px;font-weight:900;flex:0 0 auto}.ae-brand h1{font-size:19px;line-height:1.2;margin:0}.ae-brand p{margin:2px 0 0;color:#d9e8ff;font-size:12px}.ae-top-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.ae-role{display:flex;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);padding:3px;border-radius:11px}.ae-role button{border:0;background:transparent;color:#e7f0ff;padding:7px 12px;min-height:44px;border-radius:8px;font-weight:700}.ae-role button[aria-pressed=true]{background:#fff;color:#173e70}.ae-close{border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:10px;min-width:44px;min-height:44px;font-size:20px}.ae-top button:focus-visible,.ae-shell button:focus-visible,.ae-shell input:focus-visible,.ae-shell select:focus-visible,.ae-shell textarea:focus-visible,.ae-shell a:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}
.ae-local-banner{background:#fff7d6;border-bottom:1px solid #e3ca69;padding:8px 20px;font-size:12px;color:#60480a;display:flex;gap:8px;align-items:flex-start}.ae-local-banner strong{white-space:nowrap}.ae-sample{background:#ecfeff;border-bottom-color:#67e8f9;color:#164e63}.ae-remote-banner{background:#ecfdf5;border-bottom-color:#86efac;color:#14532d;align-items:center}.ae-remote-banner.ae-sync-error{background:#fff1f2;border-bottom-color:#fda4af;color:#881337}.ae-remote-banner .ae-btn{min-height:32px;padding:4px 9px;margin-left:auto;font-size:11px}.ae-tabs{background:#fff;border-bottom:1px solid var(--ae-line);display:flex;gap:2px;padding:0 14px;overflow-x:auto}.ae-tab{border:0;background:transparent;color:#4b5870;padding:12px 13px;min-height:48px;white-space:nowrap;font-weight:750;border-bottom:3px solid transparent}.ae-tab[aria-selected=true]{color:#173e70;border-bottom-color:#2563eb;background:#f8fbff}.ae-main{padding:20px;overflow:auto;flex:1}.ae-page{max-width:1320px;margin:0 auto}.ae-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.ae-heading h2{font-size:22px;margin:0 0 4px}.ae-heading p{margin:0;color:var(--ae-muted);font-size:13px}.ae-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ae-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}.ae-span-4{grid-column:span 4}.ae-span-5{grid-column:span 5}.ae-span-6{grid-column:span 6}.ae-span-7{grid-column:span 7}.ae-span-8{grid-column:span 8}.ae-span-12{grid-column:span 12}.ae-card{background:#fff;border:1px solid var(--ae-line);border-radius:16px;padding:16px;box-shadow:0 3px 12px rgba(19,41,75,.05)}.ae-card h3{font-size:16px;margin:0 0 5px}.ae-card h4{font-size:14px;margin:14px 0 6px}.ae-sub{color:var(--ae-muted);font-size:12px;margin:0}.ae-note{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a5f;padding:10px 12px;border-radius:11px;font-size:12px}.ae-warn{background:#fff8e8;border-color:#f2cc72;color:#624409}.ae-danger{background:#fff1f2;border-color:#fda4af;color:#881337}.ae-ok{background:#ecfdf5;border-color:#86efac;color:#14532d}.ae-btn{border:1px solid #b8c2d2;background:#fff;color:#24324a;border-radius:10px;padding:8px 12px;min-height:44px;font-weight:750;cursor:pointer}.ae-btn:hover{background:#f4f7fb}.ae-btn-primary{background:#1d4ed8;border-color:#1d4ed8;color:#fff}.ae-btn-primary:hover{background:#1e40af}.ae-btn-danger{background:#be123c;border-color:#be123c;color:#fff}.ae-btn-quiet{border-color:transparent;background:transparent}.ae-btn:disabled{opacity:.5;cursor:not-allowed}.ae-link{color:#1d4ed8;font-weight:700}.ae-field{display:block;margin-bottom:12px}.ae-field>span,.ae-legend-label{display:block;font-size:12px;font-weight:800;color:#38465e;margin-bottom:5px}.ae-input,.ae-select,.ae-textarea{width:100%;border:1px solid #aeb9ca;background:#fff;color:#172033;border-radius:10px;min-height:44px;padding:9px 10px;font:inherit}.ae-textarea{min-height:100px;resize:vertical}.ae-help{font-size:11px;color:#69758a;margin-top:4px}.ae-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}.ae-field-wide{grid-column:1/-1}.ae-check{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:8px 0}.ae-check input{width:24px;height:24px;flex:0 0 auto;margin-top:1px}.ae-chips{display:flex;gap:6px;flex-wrap:wrap}.ae-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;border:1px solid #c7d0de;background:#f6f8fb}.ae-chip-good{background:#dcfce7;border-color:#86efac;color:#166534}.ae-chip-bad{background:#ffe4e6;border-color:#fda4af;color:#9f1239}.ae-chip-amber{background:#fef3c7;border-color:#facc15;color:#713f12}.ae-chip-blue{background:#dbeafe;border-color:#93c5fd;color:#1e3a8a}.ae-chip-purple{background:#ede9fe;border-color:#c4b5fd;color:#5b21b6}.ae-chip-neutral{background:#f1f5f9;color:#475569}.ae-stat{border-left:4px solid #2563eb;padding:6px 10px}.ae-stat strong{display:block;font-size:20px}.ae-stat span{font-size:11px;color:var(--ae-muted)}
.ae-local-banner.ae-sync-error{background:#fff1f2;border-bottom-color:#fda4af;color:#881337}.ae-preview-banner{background:#eef2ff;border-bottom-color:#a5b4fc;color:#312e81}.ae-save-state{margin-left:auto;white-space:nowrap;border:1px solid currentColor;border-radius:999px;padding:2px 8px;font-weight:800}.ae-local-banner .ae-btn{min-height:32px;padding:4px 9px;font-size:11px}.ae-operation-notice{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 20px;background:#eff6ff;border-bottom:1px solid #bfdbfe;color:#1e3a5f;font-size:12px}.ae-operation-success{background:#ecfdf5;border-bottom-color:#86efac;color:#14532d}.ae-operation-error{background:#fff1f2;border-bottom-color:#fda4af;color:#881337}.ae-operation-notice .ae-btn{min-height:44px;padding:8px 12px}.ae-tour{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px 20px;background:#f5f3ff;border-bottom:1px solid #c4b5fd;color:#3b1d72}.ae-tour p{margin:3px 0 0;font-size:12px}.ae-tour .ae-actions{flex:0 0 auto}.ae-review-heading{margin:0 0 6px}.ae-review-heading:focus{outline:3px solid #fbbf24;outline-offset:3px;border-radius:4px}.ae-review-facts{display:grid;grid-template-columns:minmax(120px,auto) 1fr;gap:5px 12px;margin:10px 0}.ae-review-facts dt{font-weight:800}.ae-review-facts dd{margin:0;overflow-wrap:anywhere}
.ae-donut-wrap{display:flex;gap:18px;align-items:center;margin-top:12px}.ae-donut{width:178px;height:178px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;position:relative}.ae-donut:after{content:"";width:108px;height:108px;border-radius:50%;background:#fff;position:absolute;box-shadow:inset 0 0 0 1px #e2e8f0}.ae-donut-center{position:relative;z-index:1;text-align:center;line-height:1.15}.ae-donut-center strong{font-size:24px;display:block}.ae-donut-center span{font-size:11px;color:var(--ae-muted);display:block;max-width:86px}.ae-legend{display:grid;gap:7px;min-width:0}.ae-legend-row{display:grid;grid-template-columns:12px 1fr auto;gap:7px;align-items:center;font-size:12px}.ae-swatch{width:12px;height:12px;border-radius:3px;border:1px solid rgba(0,0,0,.15)}
.ae-table-wrap{width:100%;overflow:auto;border:1px solid var(--ae-line);border-radius:12px}.ae-table{border-collapse:collapse;width:100%;font-size:12px;background:#fff}.ae-table th,.ae-table td{padding:10px 11px;text-align:left;border-bottom:1px solid #e4e9f1;vertical-align:top}.ae-table th{background:#f2f5f9;color:#36445b;font-weight:850;white-space:nowrap}.ae-table tr:last-child td{border-bottom:0}.ae-table tbody tr:hover{background:#f8fbff}.ae-row-btn{border:0;background:transparent;color:#1d4ed8;text-align:left;font-weight:800;padding:6px 0;min-height:32px;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px}.ae-empty{text-align:center;padding:34px 16px;color:var(--ae-muted)}
.ae-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.ae-toolbar .ae-input,.ae-toolbar .ae-select{width:auto;min-width:170px}.ae-record{border:1px solid var(--ae-line);border-radius:13px;background:#fff;padding:13px;margin-bottom:10px}.ae-record-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ae-record h4{margin:0 0 3px}.ae-meta{font-size:11px;color:var(--ae-muted);display:flex;gap:8px;flex-wrap:wrap}.ae-evidence{white-space:pre-wrap;background:#f8fafc;border-left:4px solid #64748b;padding:10px 12px;margin:10px 0;border-radius:0 9px 9px 0}.ae-interpretation{border-left-color:#2563eb;background:#eff6ff}.ae-thread{border-top:1px solid var(--ae-line);margin-top:14px;padding-top:12px}.ae-comment{padding:9px 11px;border-radius:10px;background:#f3f6fa;margin:7px 0}.ae-comment-teacher{background:#f3e8ff}.ae-comment strong{font-size:12px}.ae-comment p{margin:3px 0;white-space:pre-wrap}.ae-comment time{font-size:10px;color:var(--ae-muted)}
.ae-stepper{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin:12px 0 18px;list-style:none;padding:0}.ae-step{font-size:9px;text-align:center;color:#69758a;position:relative;padding-top:24px}.ae-step:before{content:"";width:18px;height:18px;border-radius:50%;background:#d9e0ea;border:2px solid #fff;box-shadow:0 0 0 1px #aeb9ca;position:absolute;top:0;left:50%;transform:translateX(-50%)}.ae-step:after{content:"";height:2px;background:#ccd5e2;position:absolute;top:9px;left:calc(50% + 10px);right:calc(-50% + 10px)}.ae-step:last-child:after{display:none}.ae-step-done{color:#154e39;font-weight:750}.ae-step-done:before{background:#16a34a;box-shadow:0 0 0 1px #15803d}.ae-step-done:after{background:#16a34a}.ae-step-current:before{background:#2563eb;box-shadow:0 0 0 3px #bfdbfe}.ae-domain{border:1px solid var(--ae-line);border-radius:12px;margin:8px 0;overflow:hidden}.ae-domain summary{cursor:pointer;padding:11px 12px;font-weight:800;background:#f8fafc}.ae-domain-body{padding:8px 12px 12px}.ae-domain-component{display:flex;gap:7px;align-items:flex-start;padding:5px 0;font-size:12px}.ae-domain-component strong{min-width:26px}.ae-rating-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ae-rating-card{border:1px solid var(--ae-line);border-radius:12px;padding:10px}.ae-rating-card h4{min-height:40px;margin:0 0 8px}.ae-score{font-size:28px;font-weight:900;color:#173e70}.ae-timeline{border-left:2px solid #c8d2e1;margin:10px 0 0 8px;padding-left:18px}.ae-event{position:relative;padding:0 0 16px}.ae-event:before{content:"";position:absolute;width:11px;height:11px;border-radius:50%;background:#2563eb;left:-24.5px;top:4px;border:2px solid #fff;box-shadow:0 0 0 1px #2563eb}.ae-event h4{margin:0;font-size:12px}.ae-event p{margin:2px 0;font-size:11px;color:var(--ae-muted)}.ae-live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.ae-footer{padding:10px 20px;border-top:1px solid var(--ae-line);background:#fff;color:#667085;font-size:10px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.ae-footer a{color:#1d4ed8}
.ae-onboarding-overlay{position:fixed;inset:0;z-index:290;background:rgba(7,18,38,.72);display:flex;align-items:center;justify-content:center;padding:16px}.ae-onboarding-card{width:min(720px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:22px;box-shadow:0 30px 90px rgba(7,18,38,.42);padding:24px}.ae-onboarding-kicker{color:#1d4ed8;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.ae-onboarding-card h2{margin:5px 0 7px;color:#172033;font-size:24px;line-height:1.2}.ae-onboarding-card>p{margin:0;color:#5b667a;font-size:13px;line-height:1.55}.ae-onboarding-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:20px}.ae-onboarding-option{border:2px solid #d8deea;border-radius:16px;background:#fff;color:#172033;text-align:left;padding:16px;min-height:150px;cursor:pointer;display:flex;flex-direction:column;gap:8px}.ae-onboarding-option:hover{border-color:#2563eb;background:#f8fbff}.ae-onboarding-option strong{font-size:16px;color:#173e70}.ae-onboarding-option span{font-size:12px;line-height:1.5;color:#5b667a}.ae-onboarding-note{margin-top:16px;background:#fff8e8;border:1px solid #f2cc72;color:#624409;border-radius:12px;padding:11px 12px;font-size:11px;line-height:1.5}@media(max-width:640px){.ae-onboarding-card{padding:18px}.ae-onboarding-options{grid-template-columns:1fr}.ae-onboarding-card h2{font-size:21px}}
@media(max-width:1000px){.ae-span-4,.ae-span-5,.ae-span-6,.ae-span-7,.ae-span-8{grid-column:span 12}.ae-rating-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ae-workspace{height:97vh}.ae-main{padding:14px}.ae-stepper{grid-template-columns:repeat(10,minmax(72px,1fr));overflow-x:auto;padding-bottom:8px}.ae-step{font-size:9px;min-width:72px}.ae-step:before{width:16px;height:16px}.ae-step:after{top:8px}.ae-donut-wrap{justify-content:center}.ae-top{align-items:flex-start}.ae-brand p{display:none}}
@media(max-width:640px){.ae-overlay{padding:0}.ae-workspace{height:100vh;height:100dvh;border-radius:0}.ae-top{padding:11px 12px}.ae-brand h1{font-size:15px}.ae-mark{width:36px;height:36px}.ae-local-banner{padding:8px 12px;display:block}.ae-local-banner strong{margin-right:6px}.ae-save-state{display:inline-block;margin:6px 0 0}.ae-local-banner .ae-btn{margin-top:6px}.ae-operation-notice{padding:8px 12px}.ae-tour{display:block;padding:10px 12px}.ae-tour .ae-actions{margin-top:8px}.ae-tabs{padding:0 5px}.ae-tab{padding:10px 9px;font-size:12px}.ae-main{padding:10px}.ae-heading{display:block}.ae-heading .ae-actions{margin-top:10px}.ae-form-grid,.ae-rating-grid{grid-template-columns:1fr}.ae-review-facts{grid-template-columns:1fr;gap:2px}.ae-review-facts dd{margin-bottom:6px}.ae-donut-wrap{display:block}.ae-donut{margin:12px auto}.ae-legend{margin-top:12px}.ae-toolbar .ae-input,.ae-toolbar .ae-select{width:100%}.ae-top-actions{gap:4px}.ae-role button{padding:6px 7px;font-size:11px}.ae-top{align-items:flex-start}.ae-brand{min-width:0;flex:1 1 auto}.ae-top-actions{flex:0 0 auto;flex-wrap:nowrap;align-items:center}.ae-brand p{display:none}.ae-footer{padding:8px 12px}}
.ae-onboarding-card{width:min(940px,100%)}.ae-onboarding-options{grid-template-columns:repeat(3,minmax(0,1fr))}.ae-onboarding-progress{display:flex;align-items:center;gap:8px;color:#1d4ed8;font-size:11px;font-weight:850}.ae-onboarding-progress:after{content:"";height:4px;flex:1;border-radius:999px;background:linear-gradient(90deg,#2563eb 50%,#dbe5f1 50%)}.ae-onboarding-badge{order:-1;align-self:flex-start;border-radius:999px;background:#dbeafe;color:#1e3a8a;padding:3px 8px;font-size:10px!important;font-weight:850}.ae-setup-path{border-top:5px solid #64748b;transition:border-color .15s,box-shadow .15s}.ae-setup-path-primary{border-top-color:#2563eb}.ae-setup-path-selected{box-shadow:0 0 0 3px #bfdbfe;border-color:#60a5fa}.ae-setup-path ul{padding-left:17px;margin:9px 0;font-size:11px;color:var(--ae-muted)}.ae-setup-progress{height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden}.ae-setup-progress>span{display:block;height:100%;background:#2563eb;transition:width .2s}.ae-setup-task{display:grid;grid-template-columns:28px 1fr;gap:9px;padding:11px 0;border-top:1px solid #e4e9f1}.ae-setup-task:first-child{border-top:0}.ae-setup-task input{width:22px;height:22px;margin:1px 0}.ae-setup-task-complete strong{text-decoration:line-through;color:#64748b}.ae-setup-next{background:#eff6ff;border:1px solid #93c5fd;border-radius:11px;padding:11px 12px}.ae-copy-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ae-sim-diff{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.ae-sim-diff .ae-stat{background:#f8fafc;border-radius:8px}.ae-scenario-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ae-scenario{min-height:86px;text-align:left}.ae-scenario small{display:block;font-weight:500;color:#526078;margin-top:4px}@media(max-width:760px){.ae-onboarding-options,.ae-copy-grid,.ae-sim-diff,.ae-scenario-grid{grid-template-columns:1fr}}
.ae-release-review{width:min(700px,100%)}.ae-release-review:focus{outline:3px solid #fbbf24;outline-offset:3px}.ae-release-review .ae-review-facts{padding:12px;border:1px solid #dbe3ee;border-radius:12px;background:#f8fafc}.ae-release-confirm{display:flex;align-items:flex-start;gap:10px;margin:14px 0;padding:12px;border:1px solid #93c5fd;border-radius:12px;background:#eff6ff;color:#173e70;font-size:12px;line-height:1.5}.ae-release-confirm input{width:22px;height:22px;flex:0 0 auto;margin:0}.ae-release-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:16px}
.ae-stepper:focus-visible{outline:3px solid #fbbf24;outline-offset:4px;border-radius:8px}
@media(max-width:640px){.ae-top{align-items:flex-start;flex-wrap:wrap}.ae-brand{min-width:0;flex:1 1 210px}.ae-top-actions{flex:1 1 100%;min-width:0;flex-wrap:wrap;align-items:center;justify-content:flex-start}.ae-role{max-width:100%;flex-wrap:wrap}.ae-role button{flex:1 1 auto}.ae-close{margin-left:auto}}
@media(prefers-reduced-motion:reduce){.ae-shell *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;

function AeStyles() { return <style>{AE_STYLES}</style>; }

function AeLocalOnboarding({ onChoose }) {
  // Focus lands INSIDE the dialog on mount and Tab cycles within it, // aria-modal alone does not stop keyboard focus reaching the page behind.
  const firstRef = React.useRef(null);
  React.useEffect(() => { if (firstRef.current) firstRef.current.focus(); }, []);
  const trapTab = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); return; }
    if (event.key !== 'Tab') return;
    event.stopPropagation();
    const focusables = event.currentTarget.querySelectorAll('button');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className="ae-onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="ae-onboarding-title" aria-describedby="ae-onboarding-description" onKeyDown={trapTab}>
    <section className="ae-onboarding-card">
      <div className="ae-onboarding-progress">{t("educator_evaluation.choose_your_starting_point_cmxkd3", "Choose your starting point")}</div>
      <div className="ae-onboarding-kicker" style={{ marginTop: 10 }}>{t("educator_evaluation.first_time_setup_yt6nz4", "First-time setup")}</div>
      <h2 id="ae-onboarding-title">{t("educator_evaluation.choose_how_to_start_educator_evaluation_1ttmet2", "Choose how to start Educator Evaluation")}</h2>
      <p id="ae-onboarding-description">{t("educator_evaluation.choose_the_outcome_you_need_today_no_choice_shares_a_recor_30xck6", "Choose the outcome you need today. No choice shares a record automatically, and you can change the record path later from Setup.")}</p>
      <div className="ae-onboarding-options" role="group" aria-label={t("educator_evaluation.choose_evaluation_workspace_starting_point_1g4r803", "Choose evaluation workspace starting point")}>
        <button type="button" ref={firstRef} className="ae-onboarding-option" onClick={() => onChoose('sample')}>
          <strong>{t("educator_evaluation.start_a_guided_sample_tour_vc70j4", "Start a guided sample tour")}</strong>
          <span className="ae-onboarding-badge">{t("educator_evaluation.recommended_for_a_first_visit_1hk3zdt", "Recommended for a first visit")}</span>
          <span>{t("educator_evaluation.open_a_fictional_roster_and_then_shape_it_with_simulation__1sfyadv", "Open a fictional roster and then shape it with Simulation Studio. No real personnel data is used.")}</span>
        </button>
        <button type="button" className="ae-onboarding-option" onClick={() => onChoose('blank')}>
          <strong>{t("educator_evaluation.start_real_work_locally_u0hnhi", "Start real work locally")}</strong>
          <span className="ae-onboarding-badge">{t("educator_evaluation.private_no_sharing_nppjss", "Private · no sharing")}</span>
          <span>{t("educator_evaluation.begin_empty_add_your_educators_and_keep_records_on_this_de_7zkiud", "Begin empty, add your educators, and keep records on this device until your district approves a sharing path.")}</span>
        </button>
        <button type="button" className="ae-onboarding-option" onClick={() => onChoose('setup')}>
          <strong>{t("educator_evaluation.choose_a_record_path_1y1lhvj", "Choose a record path")}</strong>
          <span className="ae-onboarding-badge">{t("educator_evaluation.planning_and_deployment_17ye4gw", "Planning and deployment")}</span>
          <span>{t("educator_evaluation.compare_private_principal_managed_drive_and_district_porta_1p6own3", "Compare private, principal-managed Drive, and district-portal paths. The selected walkthrough opens next.")}</span>
        </button>
      </div>
      <div className="ae-onboarding-note"><strong>{t("educator_evaluation.where_this_lives_iztp53", "Where this lives:")}</strong> {t("educator_evaluation.in_your_browser_profile_on_this_device_protected_by_your_d_1k84fsq", "in your browser profile on this device, protected by your device sign-in rather than by encryption AlloFlow adds. Information leaves the device only when you deliberately export or share a file, connect an approved portal, or enable optional AI reflection. Keep a backup and follow district retention rules.")}</div>
    </section>
  </div>;
}

function AeReleaseReview({ state, onCancel, onConfirm }) {
  const review = state.review || {};
  const firstRef = React.useRef(null);
  const dialogRef = React.useRef(null);
  const [confirmed, setConfirmed] = React.useState(false);
  const busy = state.status === 'sending';
  const repositoryBlocked = !!state.actionsDisabled;
  const confirmationBlocked = busy || repositoryBlocked;
  React.useEffect(() => {
    const returnFocus = document.activeElement;
    setConfirmed(false);
    if (firstRef.current) firstRef.current.focus();
    return () => { if (returnFocus && typeof returnFocus.focus === 'function' && document.contains(returnFocus)) returnFocus.focus(); };
  }, [review.token]);
  React.useEffect(() => {
    if (busy && dialogRef.current && typeof dialogRef.current.focus === 'function') dialogRef.current.focus();
  }, [busy]);
  const trapFocus = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!busy) onCancel(); return; }
    if (event.key !== 'Tab') return;
    event.stopPropagation();
    const focusables = event.currentTarget.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])');
    if (!focusables.length) { event.preventDefault(); if (dialogRef.current) dialogRef.current.focus(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (document.activeElement === dialogRef.current) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const action = review.action === 'verify_existing'
    ? t("educator_evaluation.verify_the_current_document_and_restore_any_missing_view_a_65yyp8", 'Verify the current document and restore any missing view access. No duplicate will be created.')
    : review.action === 'replace_trashed'
      ? t("educator_evaluation.the_recorded_document_is_verified_trashed_remove_named_a_20260826", 'The recorded document is verified in Drive trash. Its named access will be removed and verified before a replacement is created; the old pointer stays in superseded history.')
      : t("educator_evaluation.create_the_first_strengths_first_summary_document_and_gran_1f9wron", 'Create the first strengths-first summary document and grant view-only access.');
  return <div className="ae-onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="ae-release-title" aria-describedby="ae-release-description" onKeyDown={trapFocus}>
    <section ref={dialogRef} tabIndex={-1} className="ae-onboarding-card ae-release-review" aria-labelledby="ae-release-title" aria-describedby="ae-release-description" aria-busy={busy ? 'true' : undefined}>
      <div className="ae-onboarding-kicker">{t("educator_evaluation.required_disclosure_review_ii2ol7", "Required disclosure review")}</div>
      <h2 id="ae-release-title">{t("educator_evaluation.confirm_released_summary_access_mvu68j", "Confirm released-summary access")}</h2>
      <p id="ae-release-description">{t("educator_evaluation.nothing_has_been_shared_by_opening_this_review_confirm_the_w4cqew", "Nothing has been shared by opening this review. Confirm the educator, managed account, record status, and disclosure before Google Drive access changes.")}</p>
      <dl className="ae-review-facts">
        <dt>{t("educator_evaluation.educator_8c1rq4", "Educator")}</dt><dd>{review.educatorName || t("educator_evaluation.educator_8c1rq4", 'Educator')}</dd>
        <dt>{t("educator_evaluation.drive_recipient_87kgp4", "Drive recipient")}</dt><dd><strong>{review.recipient || t("educator_evaluation.not_configured_4tqh3i", 'Not configured')}</strong></dd>
        <dt>{t("educator_evaluation.finalized_4cmc2p", "Finalized")}</dt><dd>{aeDateTime(review.finalizedAt)}</dd>
        <dt>{t("educator_evaluation.action_2wk0tb", "Action")}</dt><dd>{action}</dd>
        <dt>{t("educator_evaluation.access_ow1nnv", "Access")}</dt><dd>{t("educator_evaluation.educator_viewer_you_13aclhx", "Educator: viewer. You:")} {review.actorWillReceiveAccess ? 'viewer' : t("educator_evaluation.document_owner_1bh91wr", 'document owner')}.</dd>
        <dt>{t("educator_evaluation.email_notice_13jr5bl", "Email notice")}</dt><dd>{t("educator_evaluation.the_separate_content_free_portal_email_is_not_sent_by_this_g7oel3", "The separate content-free portal email is not sent by this action.")}</dd>
      </dl>
      {review.action === 'replace_trashed' && <div className="ae-note ae-danger"><strong>{t("educator_evaluation.replacement_requires_extra_care_fodon6", "Replacement requires extra care.")}</strong> {t("educator_evaluation.the_portal_confirmed_the_previous_file_is_trashed_confirm_20260826", "The portal confirmed the previous file is trashed. Confirm retention or legal-hold requirements before replacement. The prior file will remain trashed and owner-only.")}</div>}
      <div className="ae-note ae-warn"><strong>{t("educator_evaluation.personnel_record_disclosure_6atx3y", "Personnel-record disclosure:")}</strong> {t("educator_evaluation.this_grants_access_to_a_finalized_evaluation_summary_outsi_11y3f9a", "this grants access to a finalized evaluation summary outside the portal. Google may surface Drive access in its own activity or notification interfaces. Verify that the account above belongs to the intended educator.")}</div>
      <label className="ae-release-confirm"><input ref={firstRef} type="checkbox" checked={confirmed} disabled={confirmationBlocked} onChange={(event) => setConfirmed(event.target.checked)}/><span>{t("educator_evaluation.i_reviewed_the_recipient_and_understand_that_confirming_gr_2h5p2l", "I reviewed the recipient and understand that confirming grants view-only Drive access to this finalized personnel-record summary.")}</span></label>
      {busy && <div className="ae-note" role="status" aria-live="polite">{t("educator_evaluation.confirming_released_summary_access_wait_20260827", "Confirming released-summary access. Keep this review open until the portal reports the result.")}</div>}
      {repositoryBlocked && !busy && <div className="ae-note ae-warn" role="status" aria-live="polite">{t('educator_evaluation.release_repository_unavailable_20260830', 'Confirmation is paused until the district repository is saved and any error or concurrent edit is resolved.')}</div>}
      {state.error && <div className="ae-note ae-danger" role="alert">{state.error}</div>}
      <div className="ae-release-actions"><button type="button" className="ae-btn" disabled={busy} onClick={onCancel}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button><button type="button" className="ae-btn ae-btn-primary" disabled={!confirmed || confirmationBlocked} onClick={onConfirm}>{busy ? t("educator_evaluation.confirming_access_5itq6j", 'Confirming access…') : (review.action === 'verify_existing' ? t("educator_evaluation.confirm_and_verify_access_jas4xj", 'Confirm and verify access') : t("educator_evaluation.confirm_and_grant_access_1cd5aju", 'Confirm and grant access'))}</button></div>
    </section>
  </div>;
}

function AeNotificationReview({ state, onRecipientChange, onContinue, onCancel, onConfirm, actionsDisabled }) {
  const review = state.review || {};
  const selecting = ['selecting_recipient', 'reviewing_recipient'].includes(state.status);
  const busy = ['reviewing_recipient', 'sending'].includes(state.status);
  const dialogRef = React.useRef(null);
  const firstRef = React.useRef(null);
  const returnFocusRef = React.useRef(null);
  const [acknowledged, setAcknowledged] = React.useState(false);
  React.useEffect(() => {
    returnFocusRef.current = document.activeElement;
    return () => {
      const target = returnFocusRef.current;
      if (target && typeof target.focus === 'function' && document.contains(target)) target.focus();
    };
  }, []);
  React.useEffect(() => {
    setAcknowledged(false);
    if (firstRef.current && typeof firstRef.current.focus === 'function') firstRef.current.focus();
  }, [selecting, review.token]);
  React.useEffect(() => {
    if (busy && dialogRef.current && typeof dialogRef.current.focus === 'function') dialogRef.current.focus();
  }, [busy]);
  const trapFocus = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!busy) onCancel(); return; }
    if (event.key !== 'Tab') return;
    event.stopPropagation();
    const focusables = event.currentTarget.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]');
    if (!focusables.length) { event.preventDefault(); if (dialogRef.current) dialogRef.current.focus(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (document.activeElement === dialogRef.current) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className="ae-onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="ae-notification-review-title" aria-describedby="ae-notification-review-description" onKeyDown={trapFocus}>
    <section ref={dialogRef} tabIndex={-1} className="ae-onboarding-card ae-release-review" aria-labelledby="ae-notification-review-title" aria-describedby="ae-notification-review-description" aria-busy={busy ? 'true' : undefined}>
      <div className="ae-onboarding-kicker">{t('educator_evaluation.required_notice_review_20260827', 'Required notice review')}</div>
      <h2 id="ae-notification-review-title">{selecting ? t('educator_evaluation.choose_notice_recipient_20260827', 'Choose the authorized notice recipient') : t('educator_evaluation.confirm_content_free_portal_notice_20260827', 'Confirm content-free portal notice')}</h2>
      <p id="ae-notification-review-description">{t('educator_evaluation.notification_review_nothing_sent_20260827', 'Nothing has been emailed by opening this review. Confirm the authorized recipient and the exact content boundary before sending.')}</p>
      {selecting ? <label className="ae-field"><span>{t('educator_evaluation.authorized_recipient_20260827', 'Authorized recipient')}</span><select ref={firstRef} className="ae-select" value={state.recipient || ''} disabled={busy || actionsDisabled} onChange={(event) => onRecipientChange(event.target.value)}><option value="">{t('educator_evaluation.choose_authorized_recipient_20260827', 'Choose an authorized recipient')}</option>{(state.recipients || []).map((recipient) => <option key={recipient.email} value={recipient.email}>{recipient.displayName ? recipient.displayName + ' · ' : ''}{recipient.email}</option>)}</select></label> : <>
        <dl className="ae-review-facts">
          <dt>{t('educator_evaluation.educator_8c1rq4', 'Educator')}</dt><dd>{review.educatorName || t('educator_evaluation.educator_record_mmlsdd', 'Educator record')}</dd>
          <dt>{t('educator_evaluation.notice_recipient_20260827', 'Notice recipient')}</dt><dd><strong>{review.recipientDisplayName ? review.recipientDisplayName + ' · ' : ''}{review.recipient || t('educator_evaluation.not_configured_4tqh3i', 'Not configured')}</strong></dd>
          <dt>{t('educator_evaluation.notice_target_20260827', 'Notice target')}</dt><dd>{review.target === 'evaluator' ? t('educator_evaluation.assigned_evaluator_20260827', 'Assigned evaluator') : t('educator_evaluation.educator_district_account_20260827', 'Educator district account')}</dd>
          <dt>{t('educator_evaluation.portal_url_20260827', 'Portal URL')}</dt><dd><code>{review.portalUrl || t('educator_evaluation.not_configured_4tqh3i', 'Not configured')}</code></dd>
          <dt>{t('educator_evaluation.email_contents_20260827', 'Email contents')}</dt><dd>{t('educator_evaluation.content_free_notice_boundary_20260827', 'A generic portal-activity message and district portal link only. No educator name, ratings, evidence, comments, evaluation content, or attachments.')}</dd>
          <dt>{t('educator_evaluation.access_boundary_20260827', 'Access boundary')}</dt><dd>{t('educator_evaluation.notice_link_requires_district_sign_in_20260827', 'The link does not grant access. The recipient must sign in with an authorized district Google account.')}</dd>
        </dl>
        <label className="ae-release-confirm"><input ref={firstRef} type="checkbox" checked={acknowledged} disabled={busy || actionsDisabled} onChange={(event) => setAcknowledged(event.target.checked)}/><span>{t('educator_evaluation.confirm_notice_recipient_and_boundary_20260827', 'I verified the recipient and understand that confirming sends one content-free portal notice now.')}</span></label>
      </>}
      {busy && <div className="ae-note" role="status" aria-live="polite">{state.status === 'sending' ? t('educator_evaluation.sending_reviewed_notice_wait_20260827', 'Sending the reviewed notice. Keep this review open until the portal reports the exact outcome.') : t('educator_evaluation.preparing_recipient_review_wait_20260827', 'Preparing the recipient-specific notice review.')}</div>}
      {actionsDisabled && <div className="ae-note ae-warn" role="status">{t('educator_evaluation.notice_actions_wait_for_repository_20260827', 'Notice actions are paused until the district repository is available and any current save is resolved.')}</div>}
      {state.error && <div className="ae-note ae-danger" role="alert">{state.error}</div>}
      <div className="ae-release-actions"><button type="button" className="ae-btn" disabled={busy} onClick={onCancel}>{t('educator_evaluation.cancel_ew9em3', 'Cancel')}</button>{selecting ? <button type="button" className="ae-btn ae-btn-primary" disabled={!state.recipient || busy || actionsDisabled} onClick={onContinue}>{busy ? t('educator_evaluation.preparing_review_yfqhz1', 'Preparing review…') : t('educator_evaluation.continue_to_notice_review_20260827', 'Continue to notice review')}</button> : <button type="button" className="ae-btn ae-btn-primary" disabled={!acknowledged || busy || actionsDisabled} onClick={() => onConfirm(acknowledged)}>{busy ? t('educator_evaluation.sending_notice_1ksaxvj', 'Sending notice…') : t('educator_evaluation.confirm_and_send_notice_20260827', 'Confirm and send notice')}</button>}</div>
    </section>
  </div>;
}

function AeActionReview({ review, onCancel, onConfirm }) {
  const firstRef = React.useRef(null);
  const [confirmed, setConfirmed] = React.useState(false);
  React.useEffect(() => {
    const returnFocus = document.activeElement;
    setConfirmed(false);
    if (firstRef.current) firstRef.current.focus();
    return () => { if (returnFocus && typeof returnFocus.focus === 'function' && document.contains(returnFocus)) returnFocus.focus(); };
  }, [review.token]);
  const trapFocus = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel(); return; }
    if (event.key !== 'Tab') return;
    event.stopPropagation();
    const focusables = event.currentTarget.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className="ae-onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="ae-action-review-title" aria-describedby="ae-action-review-description" onKeyDown={trapFocus}>
    <section className="ae-onboarding-card ae-release-review">
      <div className="ae-onboarding-kicker">Review before recording</div>
      <h2 id="ae-action-review-title">{review.title}</h2>
      <p id="ae-action-review-description">{review.description}</p>
      {Array.isArray(review.facts) && review.facts.length > 0 && <dl className="ae-review-facts">{review.facts.map((fact, index) => <React.Fragment key={String(fact[0]) + index}><dt>{fact[0]}</dt><dd>{fact[1]}</dd></React.Fragment>)}</dl>}
      {review.warning && <div className={'ae-note ' + (review.danger ? 'ae-danger' : 'ae-warn')}><strong>{review.warning}</strong></div>}
      <label className="ae-release-confirm"><input ref={firstRef} type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/><span>{review.acknowledgement || 'I reviewed the educator, content, visibility, and lock effect shown above.'}</span></label>
      <div className="ae-release-actions"><button type="button" className="ae-btn" onClick={onCancel}>Cancel</button><button type="button" className={'ae-btn ' + (review.danger ? 'ae-btn-danger' : 'ae-btn-primary')} disabled={!confirmed} onClick={onConfirm}>{review.confirmLabel || 'Confirm and record'}</button></div>
    </section>
  </div>;
}

const AE_GUIDED_TOUR_STEPS = [
  { tab: 'overview', title: t("educator_evaluation.see_the_year_at_a_glance_1lkts3i", 'See the year at a glance'), text: t("educator_evaluation.review_completion_due_date_workload_framework_weighting_an_fhkim2", 'Review completion, due-date workload, framework weighting, and the currently selected fictional educator.') },
  { tab: 'trends', title: t("educator_evaluation.tour_trends_title_20260823", 'Plan visit coverage'), text: t("educator_evaluation.tour_trends_text_20260823", 'Trends pairs longitudinal educator views with roster-wide walkthrough coverage and domain documentation counts.') },
  { tab: 'staff', title: t("educator_evaluation.inspect_the_fictional_roster_606uzs", 'Inspect the fictional roster'), text: t("educator_evaluation.open_staff_to_see_cycle_profiles_assignments_due_dates_and_vh781t", 'Open Staff to see cycle profiles, assignments, due dates, and the inputs that control framework weighting.') },
  { tab: 'walkthroughs', title: t("educator_evaluation.trace_evidence_from_draft_to_publication_1bq6v71", 'Trace evidence from draft to publication'), text: t("educator_evaluation.compare_private_evaluator_drafts_with_published_evidence_a_og34n4", 'Compare private evaluator drafts with published evidence and the educator-visible conversation.') },
  { tab: 'formal', title: t("educator_evaluation.walk_through_the_formal_cycle_1dyhp97", 'Walk through the formal cycle'), text: t("educator_evaluation.follow_prework_conferences_published_evidence_reflection_r_768xf2", 'Follow prework, conferences, published evidence, reflection, ratings, acknowledgment, and finalization as distinct steps.') },
  { tab: 'audit', title: t("educator_evaluation.practice_backup_and_handoff_q3xu75", 'Practice backup and handoff'), text: t("educator_evaluation.reports_and_audit_shows_the_activity_timeline_safe_exports_wua3k4", 'Reports & audit shows the activity timeline, safe exports, educator packets, and reviewed imports.') },
  { tab: 'about', title: t("educator_evaluation.shape_the_simulation_and_choose_a_record_path_ohoqi5", 'Shape the simulation and choose a record path'), text: t("educator_evaluation.use_simulation_studio_with_natural_language_or_manual_cont_lwzk3y", 'Use Simulation Studio with natural language or manual controls, then compare private, principal-managed Drive, and district-portal paths.') },
];

function AeGuidedTour({ step, onMove, onFinish }) {
  const current = AE_GUIDED_TOUR_STEPS[step];
  if (!current) return null;
  return <section className="ae-tour" aria-labelledby="ae-tour-title" aria-live="polite">
    <div><div className="ae-onboarding-kicker">{t("educator_evaluation.guided_sample_2xc9yg", "Guided sample ·")} {step + 1} of {AE_GUIDED_TOUR_STEPS.length}</div><strong id="ae-tour-title">{current.title}</strong><p>{current.text}</p></div>
    <div className="ae-actions"><button type="button" className="ae-btn" disabled={step === 0} onClick={() => onMove(step - 1)}>{t("educator_evaluation.back_1hzmxtu", "Back")}</button>{step < AE_GUIDED_TOUR_STEPS.length - 1 ? <button type="button" className="ae-btn ae-btn-primary" onClick={() => onMove(step + 1)}>{t("educator_evaluation.next_1padbm0", "Next")}</button> : <button type="button" className="ae-btn ae-btn-primary" onClick={onFinish}>{t("educator_evaluation.finish_tour_1n84gmw", "Finish tour")}</button>}<button type="button" className="ae-btn ae-btn-quiet" onClick={onFinish}>{t("educator_evaluation.exit_tour_1ds4e2l", "Exit tour")}</button></div>
  </section>;
}


function AeStatus({ status }) {
  const meta = AE_STATUS_META[status] || AE_STATUS_META.not_started;
  return <span className={'ae-chip ae-chip-' + meta.tone}>{aeStatusLabel(status)}</span>;
}

function AeDonut({ segments, centerTop, centerBottom, label }) {
  const safe = (segments || []).filter((segment) => Number(segment.value) > 0);
  const total = safe.reduce((sum, segment) => sum + Number(segment.value), 0);
  let running = 0;
  const stops = safe.map((segment) => {
    const start = total ? (running / total) * 100 : 0;
    running += Number(segment.value);
    const end = total ? (running / total) * 100 : 0;
    return segment.color + ' ' + start.toFixed(2) + '% ' + end.toFixed(2) + '%';
  });
  const background = total ? t("educator_evaluation.conic_gradient_1c0j6ha", 'conic-gradient(') + stops.join(',') + ')' : '#dbe2ec';
  return (
    <div className="ae-donut-wrap">
      <div className="ae-donut" role="img" aria-label={label} style={{ background }}>
        <div className="ae-donut-center"><strong>{centerTop}</strong><span>{centerBottom}</span></div>
      </div>
      <div className="ae-legend" aria-hidden="true">
        {safe.map((segment) => <div className="ae-legend-row" key={segment.id || segment.label}>
          <span className="ae-swatch" style={{ background: segment.color }} />
          <span>{segment.label}</span><strong>{segment.display == null ? segment.value : segment.display}</strong>
        </div>)}
      </div>
    </div>
  );
}

const AeActionReviewContext = typeof React.createContext === 'function'
  ? React.createContext(null)
  : { Provider: ({ children }) => children };
const aeUseActionReview = () => typeof React.useContext === 'function' ? React.useContext(AeActionReviewContext) : null;

function AeFinalizedCycleNotice({ teacher, compact = false }) {
  if (!aeCycleFinalized(teacher)) return null;
  return <div className="ae-note ae-warn" data-finalized-cycle-readonly="true" style={compact ? { marginTop: 10 } : { marginBottom: 12 }}>
    <strong>{t("educator_evaluation.current_cycle_finalized_read_only_20260826", "Current cycle finalized.")}</strong>{' '}
    {t("educator_evaluation.current_cycle_finalized_read_only_detail_20260826", "Current-cycle records and comments are read-only until an authorized annual rollover opens the next academic year.")}
  </div>;
}

function AeThread({ workspace, recordType, recordId, teacherId, role, onAdd, readOnlyPreview = false }) {
  const [text, setText] = React.useState('');
  const requestActionReview = aeUseActionReview();
  const comments = workspace.comments.filter((comment) => comment.recordType === recordType && comment.recordId === recordId);
  const teacher = workspace.teachers.find((item) => item.id === teacherId);
  const cycleFinalized = aeCycleFinalized(teacher);
  const commentsReadOnly = readOnlyPreview || cycleFinalized;
  const beginPost = () => {
    const commentText = text.trim();
    if (!commentText || commentsReadOnly) return;
    const perform = () => { onAdd({ recordType, recordId, teacherId, text: commentText }); setText(''); };
    if (!requestActionReview) { perform(); return; }
    requestActionReview({
      title: 'Post this shared comment?',
      description: 'The comment will be appended to this record and visible to its authorized educator and evaluator participants.',
      facts: [['Educator', teacher ? teacher.name + ' · ' + teacher.code : teacherId], ['Record', recordType.replace(/_/g, ' ') + ' · ' + recordId], ['Comment', commentText], ['Editability', 'Append-only after posting']],
      warning: 'This does not alter the original evidence. If context changes later, add another comment rather than rewriting history.',
      acknowledgement: 'I reviewed the exact comment and the educator record that will receive it.',
      confirmLabel: 'Post shared comment',
      onConfirm: perform,
    });
  };
  return <div className="ae-thread">
    <h4>{t("educator_evaluation.conversation_17o4v1i", "Conversation")} <span className="ae-chip ae-chip-neutral">{comments.length}</span></h4>
    <p className="ae-sub">{t("educator_evaluation.published_comments_are_appended_to_this_record_and_cannot__1d8q75r", "Published comments are appended to this record and cannot alter the original evidence.")}</p>
    {comments.map((comment) => <div key={comment.id} className={'ae-comment ' + (comment.role === 'Teacher' ? 'ae-comment-teacher' : '')}>
      <strong>{comment.author} · {comment.role}</strong><p>{comment.text}</p><time>{aeDateTime(comment.at)}</time>
    </div>)}
    <label className="ae-field"><span>{t("educator_evaluation.add_a_shared_comment_177alq1", "Add a shared comment")}</span>
      <textarea className="ae-textarea" value={text} maxLength={3000} readOnly={commentsReadOnly} aria-describedby={cycleFinalized ? 'ae-finalized-comment-help-' + recordType + '-' + recordId : (readOnlyPreview ? 'ae-preview-readonly-help' : undefined)} onChange={(event) => setText(event.target.value)} placeholder={role === 'teacher' ? t("educator_evaluation.add_context_or_ask_a_question_1frz89c", 'Add context or ask a question…') : t("educator_evaluation.add_feedback_or_answer_a_question_9ojcfz", 'Add feedback or answer a question…')} />
    </label>
    <button type="button" className="ae-btn" disabled={commentsReadOnly || !text.trim()} onClick={beginPost}>{t("educator_evaluation.post_comment_4q20ym", "Review comment")}</button>
    {cycleFinalized ? <p className="ae-help" id={'ae-finalized-comment-help-' + recordType + '-' + recordId}>{t("educator_evaluation.finalized_cycle_comment_help_20260826", "Comments are closed for this finalized cycle. They reopen only after the authorized annual rollover.")}</p>
      : readOnlyPreview && <p className="ae-help" id="ae-preview-readonly-help">{t("educator_evaluation.preview_only_shared_comments_can_be_added_from_an_educator_ckoxtu", "Preview only. Shared comments can be added from an educator packet or the authenticated district portal.")}</p>}
  </div>;
}

function AeFrameworkReference() {
  return <div className="ae-card">
    <h3>{AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.evidence_map_pennsylvania_classroom_teacher_framework_1alupvp", 'Evidence map · Pennsylvania classroom-teacher framework') : t("educator_evaluation.evidence_map_rubric_domains_as_adapted_by_your_district_s__51xo8a", 'Evidence map · rubric domains (as adapted by your district’s PEPG plan)')}</h3>
    <p className="ae-sub">{t("educator_evaluation.component_names_organize_evidence_rubric_level_performance_1acv58k", "Component names organize evidence. Rubric-level performance descriptors are not reproduced in this workspace.")}{AE_ACTIVE_FW.id === 'pa_act13' ? '' : t("educator_evaluation.confirm_domain_and_component_names_against_your_district_s_1r17k8b", ' Confirm domain and component names against your district’s adapted rubric.')}</p>
    {AE_DOMAINS.map((domain) => <details className="ae-domain" key={domain.id}>
      <summary>{t("educator_evaluation.domain_1gqyxox", "Domain")} {domain.code} · {aeRubricDisplayLabel(domain.label)} <span className="ae-chip ae-chip-neutral">{AE_ACTIVE_FW.id === 'pa_act13' ? domain.weight + t("educator_evaluation.of_o_and_p_eiuk1e", "% of O&P") : t("educator_evaluation.equal_domain_weight", "equal weight")}</span></summary>
      <div className="ae-domain-body">{((AE_ACTIVE_FW.components && AE_ACTIVE_FW.components[domain.id]) || domain.components).map(([code, label]) => <div className="ae-domain-component" key={code}><strong>{code}</strong><span>{aeRubricDisplayLabel(label)}</span></div>)}</div>
    </details>)}
  </div>;
}

function aeAnnualEvidenceOptions(workspace, teacherId) {
  const options = [];
  (workspace.walkthroughs || []).filter((item) => item.teacherId === teacherId && item.publishedAt).forEach((item) => options.push({
    token: 'walkthrough:' + item.id,
    label: 'Walkthrough · ' + aeDate(item.date || item.publishedAt) + (item.subject ? ' · ' + item.subject : ''),
    tags: item.componentTags || [],
  }));
  (workspace.observations || []).filter((item) => item.teacherId === teacherId && item.evidencePublishedAt).forEach((item) => options.push({
    token: 'formal_observation:' + item.id,
    label: 'Formal observation · ' + aeDate(item.observedAt || item.evidencePublishedAt || item.createdAt),
    tags: item.componentTags || [],
  }));
  (workspace.spms || []).filter((item) => item.teacherId === teacherId && (item.lockedAt || item.status === 'locked')).forEach((item) => options.push({
    token: 'spm:' + item.id,
    label: 'Locked SPM / SLO' + (item.goal ? ' · ' + String(item.goal).slice(0, 90) : '') + ' · ' + aeDate(item.lockedAt),
    tags: [],
  }));
  return options;
}

function AeRatingComposer({ workspace, teacher, role, updateTeacher, evidenceFindings, aiReflectionEnabled, askForReflection, reflection, requestActionReview }) {
  const [releaseChecked, setReleaseChecked] = React.useState(false);
  React.useEffect(() => { setReleaseChecked(false); }, [teacher.id]);
  const profile = aeWeightProfile(teacher);
  const obs = aeObservationScore(teacher.ratings);
  const overall = aeOverallScore(teacher);
  const annualRationales = teacher.annualRationales || {};
  const annualEvidenceRefs = teacher.annualEvidenceRefs || {};
  const annualEvidence = React.useMemo(() => aeAnnualEvidenceOptions(workspace, teacher.id), [workspace, teacher.id]);
  const ratedDomains = AE_DOMAINS.filter((domain) => aeNumberOrNull(teacher.ratings.domains[domain.id]) !== null);
  const provenanceMissing = ratedDomains.filter((domain) => !String(annualRationales[domain.id] || '').trim() || !(annualEvidenceRefs[domain.id] || []).length);
  const missing = [];
  if (obs === null) missing.push('all four O&P domain ratings');
  profile.forEach((part) => {
    if (part.id !== 'observation' && aeNumberOrNull(teacher.ratings[part.id]) === null) missing.push(aeRubricDisplayLabel(part.label));
  });
  const setRating = (key, value) => {
    const rating = aeRatingValue(value);
    if (value !== '' && rating === null) return;
    updateTeacher(teacher.id, (draft) => {
      aeFreezeTeacherCycle(draft);
      if (key.startsWith('d')) draft.ratings.domains[key] = rating;
      else draft.ratings[key] = rating;
    }, 'RATING_UPDATED', 'Rating input updated');
  };
  const setAnnualRationale = (domainId, value) => updateTeacher(teacher.id, (draft) => {
    aeFreezeTeacherCycle(draft);
    draft.annualRationales = Object.assign({ d1: '', d2: '', d3: '', d4: '' }, draft.annualRationales || {}, { [domainId]: String(value).slice(0, 15000) });
  }, 'RATING_UPDATED', 'Annual domain rationale updated');
  const toggleAnnualEvidence = (domainId, token, checked) => updateTeacher(teacher.id, (draft) => {
    aeFreezeTeacherCycle(draft);
    const current = Object.assign({ d1: [], d2: [], d3: [], d4: [] }, draft.annualEvidenceRefs || {});
    const values = Array.isArray(current[domainId]) ? current[domainId] : [];
    current[domainId] = checked ? Array.from(new Set(values.concat(token))).slice(0, 100) : values.filter((item) => item !== token);
    draft.annualEvidenceRefs = current;
  }, 'RATING_UPDATED', 'Annual supporting evidence updated');
  const recordFinalRelease = () => updateTeacher(teacher.id, (draft) => {
    draft.finalizedAt = aeNow();
    draft.cycleStatus = 'finalized';
    draft.finalScore = aeRoundedScore(overall);
    draft.weightSnapshot = profile.map((part) => ({ id: part.id, label: part.label, weight: part.weight }));
    draft.frameworkVersion = AE_ACTIVE_FW.versionTag;
  }, 'RELEASED', 'Final rating release recorded');
  const beginFinalRelease = () => {
    if (!requestActionReview) { recordFinalRelease(); return; }
    requestActionReview({
    title: 'Record final annual release for ' + teacher.name + '?',
    description: 'This freezes the annual ratings, written rationales, supporting evidence references, calculation, framework, and weights for this cycle.',
    facts: [
      ['Educator', teacher.name + ' · ' + teacher.code],
      ['Final calculation', AE_ACTIVE_FW.id === 'portland_me' ? ((aePortlandPracticeRating(teacher.ratings.domains) || {}).label || 'Complete') : aeRoundedScore(overall).toFixed(2) + ' · ' + aeBand(overall)],
      ['Annual basis', ratedDomains.length + ' domain rationales · ' + ratedDomains.reduce((count, domain) => count + (annualEvidenceRefs[domain.id] || []).length, 0) + ' evidence references'],
      ['Lock effect', 'The cycle and annual provenance become read-only.'],
    ],
    warning: 'Confirm the official-system release separately. This action records and locks the local or portal cycle.',
    acknowledgement: 'I reviewed every annual rating, rationale, and supporting evidence reference and am ready to lock this cycle.',
    confirmLabel: 'Confirm final release',
    onConfirm: recordFinalRelease,
    });
  };
  return <div className="ae-card">
    <div className="ae-record-head"><div><h3>{role === 'evaluator' ? t("educator_evaluation.annual_summative_calculation_preview_uacw2w", 'Annual summative calculation preview') : t("educator_evaluation.how_your_final_rating_is_calculated_1opgwi1", 'How your final rating is calculated')}</h3><p className="ae-sub">{role === 'evaluator'
      ? t("educator_evaluation.enter_cycle_level_domain_judgments_after_reviewing_all_rel_9ulz1r", 'Enter cycle-level domain judgments after reviewing all relevant observations, walkthroughs, artifacts, and professional-practice evidence. Observation-specific ratings stay separate; the system performs arithmetic only.')
      : t("educator_evaluation.full_transparency_into_the_arithmetic_these_are_the_only_i_j6bml4", 'Full transparency into the arithmetic: these are the only inputs that enter your final rating, entered by your evaluator after reviewing your evidence. Nothing else affects the math.')}</p></div>
      <div>{overall === null ? <span className={'ae-chip ' + (role === 'evaluator' ? 'ae-chip-amber' : 'ae-chip-neutral')}>{role === 'evaluator' ? t("educator_evaluation.draft_1pqt609", 'Draft · ') + missing.length + ' input' + (missing.length === 1 ? '' : 's') + ' missing' : t("educator_evaluation.in_progress_irp8zc", 'In progress · ') + missing.length + ' component' + (missing.length === 1 ? '' : 's') + t("educator_evaluation.still_ahead_in_your_cycle_1c4dt54", ' still ahead in your cycle')}</span> : (AE_ACTIVE_FW.id === 'portland_me' ? <span className="ae-chip ae-chip-blue">{(aePortlandPracticeRating(teacher.ratings.domains) || {}).label}</span> : <span className="ae-chip ae-chip-blue">{aeRoundedScore(overall).toFixed(2)} · {aeBand(overall)}</span>)}</div>
    </div>
    {role === 'evaluator' && aiReflectionEnabled && <div className="ae-note ae-info" style={{ marginTop: 12 }}>
      <strong>{t("educator_evaluation.second_read_on_your_own_reasoning_1ftxo87", "Second read on your own reasoning")}</strong>
      <p className="ae-help" style={{ marginTop: 4 }}>{t("educator_evaluation.asks_a_model_whether_the_evidence_you_wrote_supports_the_r_77kvu4", "Asks a model whether the evidence you wrote supports the ratings you assigned, and what else it could mean. Advisory only: nothing it says is stored in the record.")}</p>
      <button type="button" className="ae-btn" onClick={askForReflection} disabled={reflection.status === 'working'} aria-describedby={reflection.status === 'idle' ? undefined : 'ae-ai-reflection-status-' + teacher.id}>{reflection.status === 'working' ? t("educator_evaluation.checking_vyewnp", 'Checking…') : t("educator_evaluation.ask_for_alternative_readings_1fflejn", 'Ask for alternative readings')}</button>
      {reflection.status === 'working' && <p id={'ae-ai-reflection-status-' + teacher.id} className="ae-help" style={{ marginTop: 8 }} role="status" aria-live="polite" aria-atomic="true">{t('educator_evaluation.ai_reflection_checking_selected_evidence_20260830', 'Checking this educator’s published evidence. The response will remain scoped to this educator.')}</p>}
      {reflection.status === 'done' && <div style={{ marginTop: 10 }}><p id={'ae-ai-reflection-status-' + teacher.id} className="ae-help" role="status" aria-live="polite" aria-atomic="true">{t('educator_evaluation.ai_reflection_ready_20260830', 'Alternative reading ready for this educator.')}</p><p className="ae-help" style={{ marginTop: 4 }}><strong>{t("educator_evaluation.suggestion_not_a_finding_jom4g2", "Suggestion, not a finding.")}</strong> {t("educator_evaluation.you_decide_what_if_anything_to_change_1tu60ru", "You decide what, if anything to change.")}</p><pre style={{ whiteSpace: 'pre-wrap', font: 'inherit', margin: 0 }}>{reflection.text}</pre></div>}
      {reflection.status === 'error' && <p id={'ae-ai-reflection-status-' + teacher.id} className="ae-help" style={{ marginTop: 8 }} role="alert" aria-live="assertive" aria-atomic="true">{reflection.text}</p>}
    </div>}    {evidenceFindings && evidenceFindings.length > 0 && <div className={'ae-note ' + (evidenceFindings.some((item) => item.severity === 'high') ? 'ae-warn' : 'ae-info')} style={{ marginTop: 12 }}><strong>{role === 'evaluator' ? t("educator_evaluation.check_the_evidence_before_you_finalise_h00wya", 'Check the evidence before you finalise') : t("educator_evaluation.what_the_documentation_shows_5puljg", 'What the documentation shows')}</strong><ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>{evidenceFindings.map((item, index) => <li key={item.code + '-' + (item.domainId || index)}>{item.message}</li>)}</ul><p className="ae-help" style={{ marginTop: 8 }}>{role === 'evaluator' ? t("educator_evaluation.counted_from_the_evidence_you_tagged_on_this_device_a_rati_1ej0m2l", 'Counted from the evidence you tagged, on this device. A rating resting on little documented evidence is the one most likely to be overturned, so this is a prompt to add evidence or revisit the rating, not a judgment about the educator.') : t("educator_evaluation.counted_from_the_evidence_tagged_to_your_record_you_can_ra_a31vfv", 'Counted from the evidence tagged to your record. You can raise any of these with your evaluator.')}</p></div>}
    <div className="ae-rating-grid" style={{ marginTop: 12 }}>
      {AE_DOMAINS.map((domain) => <div className="ae-rating-card" key={domain.id} style={{ borderTop: '4px solid ' + domain.color }}>
        <h4>{domain.code}. {aeRubricDisplayLabel(domain.label)} <span className="ae-chip ae-chip-neutral">{AE_ACTIVE_FW.id === 'pa_act13' ? domain.weight + t("educator_evaluation.of_o_and_p_eiuk1e", "% of O&P") : t("educator_evaluation.equal_domain_weight", "equal weight")}</span></h4>
        <label className="ae-field"><span>{t("educator_evaluation.human_selected_rating_1mz5eyx", "Human-selected rating")}</span><select className="ae-select" value={teacher.ratings.domains[domain.id] == null ? '' : teacher.ratings.domains[domain.id]} disabled={role !== 'evaluator' || !!teacher.finalizedAt} onChange={(event) => setRating(domain.id, event.target.value)}>
          <option value="">{t("educator_evaluation.not_rated_17t3qdk", "Not rated")}</option>{AE_RATINGS.map((rating) => <option key={rating.value} value={rating.value}>{rating.value} · {(AE_ACTIVE_FW.ratingLabels && AE_ACTIVE_FW.ratingLabels[rating.value]) || rating.label}</option>)}
        </select></label>
        {(role === 'evaluator' || teacher.finalizedAt) && <><label className="ae-field"><span>Annual rationale</span><textarea className="ae-textarea" style={{ minHeight: 90 }} maxLength={15000} value={annualRationales[domain.id] || ''} disabled={role !== 'evaluator' || !!teacher.finalizedAt} onChange={(event) => setAnnualRationale(domain.id, event.target.value)} placeholder="Explain how the cycle evidence supports this annual domain judgment."/></label>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }} disabled={role !== 'evaluator' || !!teacher.finalizedAt}><legend className="ae-legend-label">Supporting published or locked evidence</legend>{annualEvidence.length === 0 ? <p className="ae-help">Publish walkthrough or formal-observation evidence, or lock an SPM / SLO record, before final release.</p> : annualEvidence.map((item) => <label className="ae-check" key={domain.id + '-' + item.token}><input type="checkbox" checked={(annualEvidenceRefs[domain.id] || []).includes(item.token)} onChange={(event) => toggleAnnualEvidence(domain.id, item.token, event.target.checked)}/><span>{item.label}{item.tags.some((tag) => String(tag).startsWith(domain.code)) ? ' · tagged to this domain' : ''}</span></label>)}</fieldset></>}
      </div>)}
    </div>
    <div className="ae-form-grid" style={{ marginTop: 12 }}>
      {profile.filter((part) => part.id !== 'observation').map((part) => <label className="ae-field" key={part.id}><span>{aeRubricDisplayLabel(part.label)} · {part.weight}%</span>
        <input className="ae-input" type="number" min="0" max="3" step="0.01" value={teacher.ratings[part.id] == null ? '' : teacher.ratings[part.id]} disabled={role !== 'evaluator' || !!teacher.finalizedAt} onChange={(event) => setRating(part.id, event.target.value)} placeholder="0.00 to 3.00" />
      </label>)}
    </div>
    {AE_ACTIVE_FW.id === 'portland_me' && (() => { const rollup = aePortlandPracticeRating(teacher.ratings.domains); return rollup ? <div className="ae-note" style={{ marginTop: 10 }}><strong>{t("educator_evaluation.practice_rating_guidebook_roll_up_1gx63z6", "Practice rating (guidebook roll-up):")} {rollup.label}</strong>, {rollup.rule}. The guidebook derives this rating from the four domain ratings by rule, not by averaging; the numeric average never appears on official Portland forms. Student growth combines per the district’s current plan documents. Confirm against the current PEPG plan; this mirrors guidebook v1.0.</div> : null; })()}
    <div className="ae-note ae-warn">{AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.this_is_a_planning_preview_not_an_official_pde_13_1_form_f_10do9m2", 'This is a planning preview, not an official PDE 13-1 form. Follow your LEA’s approved process and enter/release the official summative form in PEERS or the district’s authorized record system.') : t("educator_evaluation.this_is_a_planning_preview_not_an_official_pepg_summative__foogxv", 'This is a planning preview, not an official PEPG summative form. Your district’s PEPG plan (developed with its teacher-majority steering committee) governs the official process, rating levels, and forms; record the official summative rating in the district-authorized system.')}</div>
    {teacher.finalizedAt && <div className="ae-note ae-ok" style={{ marginTop: 10 }}><strong>{t("educator_evaluation.final_release_recorded_11c3x9z", "Final release recorded ·")} {Number(teacher.finalScore == null ? aeRoundedScore(overall) : teacher.finalScore).toFixed(2)}</strong><br/>{t("educator_evaluation.released_i33a4u", "Released")} {aeDateTime(teacher.finalizedAt)}. This local receipt does not replace the official record.</div>}
    {!teacher.finalizedAt && role === 'evaluator' && overall !== null && <div style={{ marginTop: 12 }}>{provenanceMissing.length > 0 && <div className="ae-note ae-warn" style={{ marginBottom: 10 }}><strong>Annual basis incomplete.</strong> Add a written rationale and at least one eligible supporting record for {provenanceMissing.map((domain) => 'Domain ' + domain.code).join(', ')}.</div>}<label className="ae-check"><input type="checkbox" checked={releaseChecked} onChange={(event) => setReleaseChecked(event.target.checked)}/><span>{AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.i_confirm_the_official_final_rating_form_has_already_been__tji0m8", 'I confirm the official final rating form has already been released in PEERS or the LEA-authorized record system.') : t("educator_evaluation.i_confirm_the_official_summative_rating_has_already_been_r_ugj5jr", 'I confirm the official summative rating has already been recorded through the district-authorized PEPG process.')}</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!releaseChecked || provenanceMissing.length > 0} onClick={beginFinalRelease}>{t("educator_evaluation.record_final_release_q8qg6h", "Review final release")}</button><p className="ae-help">{t("educator_evaluation.this_locks_the_local_cycle_and_advances_the_teachers_evalu_1t38zzd", "This locks the local cycle and advances the “teachers evaluated” completion pie.")}</p></div>}
  </div>;
}

function AeEducatorStatement({ teacher, role, updateTeacher, readOnlyPreview = false }) {
  const saved = (teacher.educatorStatement && teacher.educatorStatement.text) || '';
  const [text, setText] = React.useState(saved);
  React.useEffect(() => { setText((teacher.educatorStatement && teacher.educatorStatement.text) || ''); }, [teacher.id, teacher.educatorStatement && teacher.educatorStatement.updatedAt]);
  const frozen = !!teacher.finalizedAt;
  const isOwner = role === 'teacher';
  if (!isOwner && !saved) return null;
  return <section className="ae-card ae-span-12">
    <div className="ae-record-head"><div><h3>{isOwner ? t("educator_evaluation.your_statement_for_the_record_m5rf00", 'Your statement for the record') : t("educator_evaluation.educator_s_statement_1jqtqe1", 'Educator’s statement')}</h3><p className="ae-sub">{isOwner
      ? t("educator_evaluation.optional_and_in_your_own_words_what_you_are_proud_of_this__as4g3y", 'Optional and in your own words: what you are proud of this year, and any context you want on the record. It appears verbatim: under "In your own words", in your released evaluation summary, and no one can edit it but you.')
      : t("educator_evaluation.written_by_the_educator_read_only_for_evaluators_it_appear_fwvdf4", 'Written by the educator; read-only for evaluators. It appears verbatim in the released summary.')}</p></div>
      {frozen && <span className="ae-chip ae-chip-neutral">{t("educator_evaluation.frozen_at_finalization_uvos18", "Frozen at finalization")}</span>}</div>
    {isOwner && !frozen ? <>
      <label className="ae-field"><span>{t("educator_evaluation.statement_lveg8m", "Statement")}</span><textarea className="ae-textarea" style={{ minHeight: 110 }} maxLength={20000} value={text} readOnly={readOnlyPreview} aria-describedby={readOnlyPreview ? 'ae-statement-preview-help' : undefined} onChange={(event) => setText(event.target.value)} placeholder={t("educator_evaluation.what_i_m_proud_of_this_year_context_i_want_alongside_my_ra_1tjgw28", "What I’m proud of this year… context I want alongside my ratings…")}/></label>
      <div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={readOnlyPreview || text.trim() === saved.trim()} onClick={() => updateTeacher(teacher.id, (draft) => { const trimmed = text.trim(); draft.educatorStatement = trimmed ? { text: trimmed, updatedAt: aeNow() } : null; }, 'STATEMENT_SAVED', 'Educator statement updated')}>{saved ? t("educator_evaluation.update_statement_1ac9pk9", 'Update statement') : t("educator_evaluation.save_statement_19yzt45", 'Save statement')}</button>{saved && <span className="ae-sub">{t("educator_evaluation.last_saved_12np9jq", "Last saved")} {aeDateTime(teacher.educatorStatement.updatedAt)}</span>}</div>
      {readOnlyPreview && <p className="ae-help" id="ae-statement-preview-help">{t("educator_evaluation.preview_only_the_educator_can_write_this_statement_in_thei_1shr111", "Preview only. The educator can write this statement in their response packet or authenticated district portal.")}</p>}
    </> : (saved ? <div className="ae-evidence">{saved}</div> : <div className="ae-empty">{t("educator_evaluation.no_statement_recorded_before_finalization_1ewf3fe", "No statement recorded before finalization.")}</div>)}
  </section>;
}

function AeSampleEvaluationRehearsal({ workspace, setSelectedTeacherId, setRole, setTab }) {
  const fictionalRoster = workspace.teachers.filter((teacher) => teacher.active !== false);
  // Keep one stable practice record even after it is finalized. The final
  // fictional roster member starts with no formal observation in the built-in
  // sample and remains the rehearsal target throughout the browser session.
  const teacher = fictionalRoster[fictionalRoster.length - 1] || null;
  if (!teacher) return null;
  const observation = (workspace.observations || []).filter((item) => item.teacherId === teacher.id)
    .slice().sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))[0] || null;
  const step = observation ? aeStepOfObservation(observation) : -1;
  const annualComplete = !!teacher.finalizedAt;
  const guidance = step >= 0 ? aeRehearsalGuidance(step) : null;
  const targetRole = annualComplete || step < 0 || step === 9 ? 'evaluator' : guidance.owner;
  const targetTab = annualComplete ? 'audit' : (step === 9 ? 'overview' : 'formal');
  const formalComplete = observation && observation.finalizedAt ? 10 : Math.max(0, step);
  const actionLabel = annualComplete ? t("educator_evaluation.review_completed_fictional_cycle_v24xsj", 'Review completed fictional cycle')
    : (step < 0 ? t("educator_evaluation.start_rehearsal_with_m2qc5g", 'Start rehearsal with ') + teacher.name
      : (step === 9 ? t("educator_evaluation.open_annual_rating_inputs_hojp9e", 'Open annual rating inputs')
        : (targetRole === 'teacher' ? t("educator_evaluation.continue_as_fictional_educator_15qb7vq", 'Continue as Fictional educator') : t("educator_evaluation.continue_as_evaluator_8xf4xx", 'Continue as Evaluator'))));
  const continueRehearsal = () => {
    setSelectedTeacherId(teacher.id);
    setRole(targetRole);
    setTab(targetTab);
    if (step === 9 && !annualComplete) setTimeout(() => {
      const composer = document.getElementById('ae-annual-rating-composer');
      if (composer && typeof composer.scrollIntoView === 'function') composer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };
  const prepareRealWorkspace = () => {
    setRole('evaluator');
    setTab('audit');
    setTimeout(() => {
      const transition = document.getElementById('ae-sample-to-real-transition');
      if (transition && typeof transition.scrollIntoView === 'function') transition.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };
  return <section className="ae-card ae-span-12" aria-labelledby="ae-rehearsal-title">
    <div className="ae-record-head"><div><h3 id="ae-rehearsal-title">{t("educator_evaluation.practice_one_complete_fictional_evaluation_10air0c", "Practice one complete fictional evaluation")}</h3><p className="ae-sub">{t("educator_evaluation.a_guided_evaluator_to_educator_rehearsal_using_1fwp3d2", "A guided evaluator-to-educator rehearsal using")} {teacher.name} ({teacher.code}{t("educator_evaluation.every_entry_stays_inside_simulated_data_3xuggt", "). Every entry stays inside simulated data.")}</p></div><span className={'ae-chip ' + (annualComplete ? 'ae-chip-good' : 'ae-chip-purple')}>{annualComplete ? t("educator_evaluation.rehearsal_complete_1t1iga3", 'Rehearsal complete') : (observation ? t("educator_evaluation.formal_step_miutz0", 'Formal step ') + (step + 1) + t("educator_evaluation.of_10_1af6cv5", ' of 10') : t("educator_evaluation.ready_to_begin_e1hn80", 'Ready to begin'))}</span></div>
    <div className="ae-grid" style={{ marginTop: 12 }}><div className="ae-span-4 ae-stat"><strong>{formalComplete} / 10</strong><span>{t("educator_evaluation.formal_steps_complete_1ay1f38", "formal steps complete")}</span></div><div className="ae-span-4 ae-stat"><strong>{annualComplete ? t("educator_evaluation.recorded_1bfaoyl", 'Recorded') : t("educator_evaluation.not_recorded_wm31ze", 'Not recorded')}</strong><span>{t("educator_evaluation.fictional_final_release_ny2qrn", "fictional final release")}</span></div><div className="ae-span-4 ae-stat"><strong>{annualComplete ? t("educator_evaluation.done_13cn9g1", 'Done') : (targetRole === 'teacher' ? t("educator_evaluation.fictional_educator_2qs1sj", 'Fictional educator') : t("educator_evaluation.evaluator_125q2ii", 'Evaluator'))}</strong><span>{t("educator_evaluation.next_owner_14eb4jz", "next owner")}</span></div></div>
    <div className={'ae-note ' + (annualComplete ? 'ae-ok' : 'ae-info')} style={{ marginTop: 12 }}><strong>{annualComplete ? t("educator_evaluation.full_rehearsal_completed_1uj394s", 'Full rehearsal completed.') : (guidance ? guidance.title : t("educator_evaluation.begin_with_an_evaluator_assignment_5f3dox", 'Begin with an evaluator assignment.'))}</strong><br/>{annualComplete ? t("educator_evaluation.the_observation_acknowledgement_annual_inputs_and_final_re_rvlfu2", 'The observation, acknowledgement, annual inputs, and final release are locked in this fictional cycle. Review the audit timeline to see the complete chain.') : (guidance ? guidance.text : t("educator_evaluation.assign_a_formal_observation_then_follow_the_role_prompts_t_1tgjlbm", 'Assign a formal observation, then follow the role prompts through educator prework, conferences, evidence, reflection, ratings, acknowledgement, finalization, and annual release.'))}</div>
    <div className="ae-actions" style={{ marginTop: 12 }}><button type="button" className="ae-btn ae-btn-primary" onClick={continueRehearsal}>{actionLabel}</button>{annualComplete && <button type="button" className="ae-btn" onClick={prepareRealWorkspace}>{t("educator_evaluation.prepare_a_clean_real_workspace_20260822", "Prepare a clean real workspace")}</button>}<span className="ae-help">{t("educator_evaluation.role_changes_are_interactive_only_because_this_workspace_i_12z18xv", "Role changes are interactive only because this workspace is explicitly fictional. Real local work keeps educator preview read-only.")}</span></div>
  </section>;
}

function AeRealWorkLaunch({ workspace, setTab }) {
  const pathReady = ['local', 'principal_share'].includes(workspace.config.setupPath);
  const detailsReady = [workspace.config.organization, workspace.config.building, workspace.config.academicYear, workspace.config.evaluatorName, workspace.config.evaluatorInitials]
    .every((value) => String(value || '').trim());
  const rosterReady = workspace.teachers.some((teacher) => teacher.active !== false);
  const steps = [
    { id: 'path', ready: pathReady, label: t("educator_evaluation.choose_an_approved_record_path_20260822", "Choose an approved record path"), detail: t("educator_evaluation.private_device_or_principal_helper_20260822", "Private on-device or principal-managed Drive") },
    { id: 'details', ready: detailsReady, label: t("educator_evaluation.confirm_workspace_details_20260822", "Confirm workspace details"), detail: t("educator_evaluation.organization_year_evaluator_framework_20260822", "Organization, year, evaluator, initials, and framework") },
    { id: 'roster', ready: rosterReady, label: t("educator_evaluation.add_the_first_educator_20260822", "Add the first educator"), detail: t("educator_evaluation.name_staff_code_assignment_due_date_20260822", "Name, unique staff code, assignment, and due date") },
  ];
  const completed = steps.filter((step) => step.ready).length;
  if (completed === steps.length || workspace.config.setupPath === 'district_portal') return null;
  const next = steps.find((step) => !step.ready);
  const openNext = () => {
    setTab(next.id === 'roster' ? 'staff' : 'about');
    if (next.id === 'path') setTimeout(() => {
      const setup = document.getElementById('ae-record-path-setup');
      if (setup && typeof setup.scrollIntoView === 'function') setup.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };
  return <section className="ae-card ae-span-12" aria-labelledby="ae-real-launch-title">
    <div className="ae-record-head"><div><div className="ae-onboarding-kicker">{t("educator_evaluation.real_work_launch_20260822", "Real-work launch")}</div><h3 id="ae-real-launch-title">{t("educator_evaluation.set_up_your_first_real_cycle_20260822", "Set up your first real cycle")}</h3><p className="ae-sub">{t("educator_evaluation.clean_workspace_no_fictional_records_20260822", "This clean workspace contains no fictional records. Complete these local readiness steps before assigning the first cycle.")}</p></div><span className="ae-chip ae-chip-blue">{completed} / {steps.length} {t("educator_evaluation.ready_20260822", "ready")}</span></div>
    <div className="ae-setup-progress" role="progressbar" aria-label={t("educator_evaluation.first_real_cycle_readiness_20260822", "First real cycle readiness")} aria-valuemin="0" aria-valuemax={steps.length} aria-valuenow={completed} style={{ marginTop: 12 }}><span style={{ width: Math.round(completed / steps.length * 100) + '%' }}/></div>
    <div className="ae-grid" style={{ marginTop: 12 }}>{steps.map((step, index) => <div className="ae-span-4 ae-stat" key={step.id} style={{ borderLeftColor: step.ready ? '#16815d' : (step.id === next.id ? '#2563eb' : '#94a3b8') }}><strong>{step.ready ? t("educator_evaluation.ready_status_20260822", 'Ready') : (index + 1) + '. ' + t("educator_evaluation.to_do_20260822", 'To do')}</strong><span>{step.label}<br/>{step.detail}</span></div>)}</div>
    <div className="ae-setup-next" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.next_step_ej8e9s", "Next step:")}</strong> {next.label}</div>
    <div className="ae-actions" style={{ marginTop: 12 }}><button type="button" className="ae-btn ae-btn-primary" onClick={openNext}>{next.id === 'roster' ? t("educator_evaluation.open_staff_and_add_an_educator_20260822", 'Open Staff and add an educator') : (next.id === 'details' ? t("educator_evaluation.review_workspace_details_20260822", 'Review workspace details') : t("educator_evaluation.choose_record_path_20260822", 'Choose record path'))}</button><span className="ae-help">{t("educator_evaluation.readiness_not_district_approval_20260822", "This checklist confirms workspace readiness, not district authorization. Follow the approved personnel-record process for the path you choose.")}</span></div>
  </section>;
}

function AeOverview({ workspace, selectedTeacher, setSelectedTeacherId, role, setRole, updateTeacher, setTab, aiReflectionEnabled, askForReflection, reflection, readOnlyPreview = false, isRemote = false, requestActionReview }) {
  const evidenceFindings = React.useMemo(() => (selectedTeacher ? aeEvidenceSufficiency(workspace, selectedTeacher.id, { domains: AE_DOMAINS, componentsByDomain: AE_ACTIVE_FW.components || null, expectedPieces: AE_ACTIVE_FW.evidenceTarget || 0 }) : []), [workspace, selectedTeacher]);
  const isEvaluator = role === 'evaluator';
  const visibleTeachers = isEvaluator ? workspace.teachers : (selectedTeacher ? [selectedTeacher] : []);
  const summary = aeCompletionSummary(visibleTeachers);
  const completionSegments = summary.total ? [
    { id: 'finalized', label: t("educator_evaluation.finalized_4cmc2p", 'Finalized'), value: summary.finalized, display: summary.finalized, color: '#16815d' },
    { id: 'open', label: t("educator_evaluation.not_finalized_rudl8g", 'Not finalized'), value: summary.open, display: summary.open, color: '#d6a321' },
  ] : [];
  const profile = selectedTeacher ? aeWeightProfile(selectedTeacher) : [];
  const profileLabel = selectedTeacher ? profile.map((part) => aeRubricDisplayLabel(part.label) + ' ' + part.weight + '%').join(', ') : '';
  const activeTeachers = visibleTeachers.filter((teacher) => teacher.active !== false);
  // Coming-due workload bands (SpEd Timelines urgency pattern): open cycles
  // only, keyed off each educator's due date. Descriptive triage, not a queue.
  const today = aeToday();
  const plusDays = (days) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
  const openWithDue = activeTeachers.filter((teacher) => !teacher.finalizedAt && teacher.dueDate);
  const workload = {
    overdue: openWithDue.filter((teacher) => teacher.dueDate < today).length,
    soon: openWithDue.filter((teacher) => teacher.dueDate >= today && teacher.dueDate <= plusDays(14)).length,
    month: openWithDue.filter((teacher) => teacher.dueDate > plusDays(14) && teacher.dueDate <= plusDays(30)).length,
  };
  const nextActions = new Map(activeTeachers.map((teacher) => [teacher.id, aeTeacherNextAction(workspace, teacher)]));
  const [showAllQueue, setShowAllQueue] = React.useState(false);
  const evaluatorQueueAll = activeTeachers.map((teacher) => ({ teacher, action: nextActions.get(teacher.id) }))
    .filter((item) => item.action.owner === 'evaluator')
    .sort((a, b) => String(a.teacher.dueDate || '9999-12-31').localeCompare(String(b.teacher.dueDate || '9999-12-31')) || a.teacher.name.localeCompare(b.teacher.name));
  const evaluatorQueue = showAllQueue ? evaluatorQueueAll : evaluatorQueueAll.slice(0, 6);
  const openNextAction = (teacher, action) => { setSelectedTeacherId(teacher.id); setTab(action.tab); setTimeout(() => { const panel = document.getElementById('ae-panel'); if (panel) panel.focus(); }, 0); };
  return <div className="ae-page">
    <div className="ae-heading"><div><h2>{isEvaluator ? t("educator_evaluation.evaluation_overview_qv05eq", 'Evaluation overview') : t("educator_evaluation.my_evaluation_gfi35n", 'My evaluation')}</h2><p>{t("educator_evaluation.completion_means_the_final_rating_record_has_been_finalize_1jispfg", "Completion means the final rating record has been finalized, not that a walkthrough occurred.")}</p></div>
      {isEvaluator && <label className="ae-field" style={{ minWidth: 230, margin: 0 }}><span>{t("educator_evaluation.selected_educator_2guy6p", "Selected educator")}</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => setSelectedTeacherId(event.target.value)}>
        <option value="">{t("educator_evaluation.choose_an_educator_1l6d6bg", "Choose an educator")}</option>{activeTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}
      </select></label>}
    </div>
    <div className="ae-grid">
      {workspace.config.sampleMode && <AeSampleEvaluationRehearsal workspace={workspace} setSelectedTeacherId={setSelectedTeacherId} setRole={setRole} setTab={setTab}/>}
      {!isRemote && isEvaluator && !workspace.educatorPacketMode && !workspace.config.sampleMode && <AeRealWorkLaunch workspace={workspace} setTab={setTab}/>}
      {!isEvaluator && selectedTeacher && (() => { const action = aeTeacherNextAction(workspace, selectedTeacher); const educatorLabel = action.teacherLabel || (action.owner === 'evaluator' ? 'No action required from you right now' : action.label); return <section className="ae-card ae-span-12" aria-labelledby="ae-educator-next-title"><div className="ae-record-head"><div><div className="ae-onboarding-kicker">Your next step</div><h3 id="ae-educator-next-title">{educatorLabel}</h3><p className="ae-sub">{action.detail}</p></div><span className={'ae-chip ' + (action.owner === 'teacher' ? 'ae-chip-purple' : action.owner === 'complete' ? 'ae-chip-good' : 'ae-chip-neutral')}>{action.owner === 'teacher' ? 'Your turn' : action.owner === 'complete' ? 'Complete' : 'Evaluator’s turn'}</span></div>{['teacher', 'complete'].includes(action.owner) && <div className="ae-actions" style={{ marginTop: 12 }}><button type="button" className="ae-btn ae-btn-primary" disabled={readOnlyPreview && action.owner === 'teacher'} onClick={() => openNextAction(selectedTeacher, action)}>{readOnlyPreview && action.owner === 'teacher' ? 'Preview only' : educatorLabel}</button></div>}</section>; })()}
      {isEvaluator && (workload.overdue > 0 || workload.soon > 0 || workload.month > 0) && <section className="ae-card ae-span-12" aria-labelledby="ae-workload-title"><h3 id="ae-workload-title">{t("educator_evaluation.coming_due_ry9pkk", "Coming due")}</h3><p className="ae-sub">{t("educator_evaluation.open_cycles_by_due_date_a_band_is_triage_for_your_calendar_15zfrim", "Open cycles by due date. A band is triage for your calendar, not a judgment about anyone.")}</p><div className="ae-grid" style={{ marginTop: 10 }}>
        <div className="ae-span-4 ae-stat" style={{ borderLeftColor: workload.overdue ? '#b91c1c' : undefined }}><strong>{workload.overdue}</strong><span>{t("educator_evaluation.past_due_date_1pu1i2t", "past due date")}</span></div>
        <div className="ae-span-4 ae-stat" style={{ borderLeftColor: workload.soon ? '#b45309' : undefined }}><strong>{workload.soon}</strong><span>{t("educator_evaluation.due_within_14_days_1xnpchg", "due within 14 days")}</span></div>
        <div className="ae-span-4 ae-stat"><strong>{workload.month}</strong><span>{t("educator_evaluation.due_in_15_30_days_1974v1z", "due in 15 to 30 days")}</span></div>
      </div></section>}
      {isEvaluator && <section className="ae-card ae-span-12" aria-labelledby="ae-next-actions-title"><div className="ae-record-head"><div><h3 id="ae-next-actions-title">{t("educator_evaluation.needs_your_attention_1ru7wgv", "Needs your attention")}</h3><p className="ae-sub">{t("educator_evaluation.your_next_evaluator_owned_steps_ordered_by_cycle_due_date__o610zt", "Your next evaluator-owned steps, ordered by cycle due date. Open an action to select the educator and go directly to the right workflow.")}</p></div><span className="ae-chip ae-chip-neutral">{evaluatorQueueAll.length > evaluatorQueue.length ? evaluatorQueue.length + t("educator_evaluation.of_20260823", ' of ') + evaluatorQueueAll.length + t("educator_evaluation.shown_20260823", ' shown') : evaluatorQueue.length + t("educator_evaluation.shown_20260823", ' shown')}</span></div>
        {evaluatorQueue.length === 0 ? <div className="ae-empty" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.no_evaluator_owned_steps_are_waiting_z6bvc5", "No evaluator-owned steps are waiting.")}</strong><p>{t("educator_evaluation.use_the_roster_below_to_see_educator_owned_steps_and_compl_16a3k8k", "Use the roster below to see educator-owned steps and completed cycles.")}</p></div> : <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.evaluator_next_action_queue_34xcyf", "Evaluator next-action queue")}</caption><thead><tr><th scope="col">{t("educator_evaluation.educator_8c1rq4", "Educator")}</th><th scope="col">{t("educator_evaluation.next_step_1bhqoze", "Next step")}</th><th scope="col">{t("educator_evaluation.why_y9m5zt", "Why")}</th><th scope="col">{t("educator_evaluation.cycle_due_mjzagf", "Cycle due")}</th></tr></thead><tbody>{evaluatorQueue.map(({ teacher, action }) => <tr key={teacher.id}><td><strong>{teacher.name}</strong><br/><span className="ae-sub">{teacher.code} · {teacher.building}</span></td><td><button type="button" className="ae-row-btn" onClick={() => openNextAction(teacher, action)}>{action.label}</button></td><td>{action.detail}</td><td>{aeDate(teacher.dueDate)}</td></tr>)}</tbody></table></div>}
        {evaluatorQueueAll.length > 6 && <div className="ae-actions" style={{ marginTop: 10 }}><button type="button" className="ae-btn" onClick={() => setShowAllQueue((value) => !value)}>{showAllQueue ? t("educator_evaluation.show_the_first_six_20260823", 'Show the first six') : t("educator_evaluation.show_all_20260823", 'Show all ') + evaluatorQueueAll.length}</button></div>}
      </section>}
      {isEvaluator && <section className="ae-card ae-span-5" aria-labelledby="ae-completion-title"><h3 id="ae-completion-title">{t("educator_evaluation.teachers_evaluated_fjk8wj", "Teachers evaluated")}</h3><p className="ae-sub">{t("educator_evaluation.active_educators_due_in_wk6o4y", "Active educators due in")} {workspace.config.academicYear}</p>
        {summary.total === 0 ? <div className="ae-empty" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.no_educators_yet_1wyu48u", "No educators yet")}</strong><p>{t("educator_evaluation.add_your_roster_in_staff_completion_tracking_begins_with_y_11da9la", "Add your roster in Staff, completion tracking begins with your first educator.")}</p></div> : <>
        <AeDonut segments={completionSegments} centerTop={summary.finalized + ' / ' + summary.total} centerBottom="finalized" label={summary.finalized + ' of ' + summary.total + t("educator_evaluation.eligible_teachers_finalized_1uhhk1a", ' eligible teachers finalized; ') + summary.open + t("educator_evaluation.not_finalized_1t1pp9c", ' not finalized')} />
        <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.evaluation_status_counts_198dv4l", "Evaluation status counts")}</caption><thead><tr><th>{t("educator_evaluation.status_3pd73", "Status")}</th><th>{t("educator_evaluation.teachers_suo8i", "Teachers")}</th></tr></thead><tbody>
          {Object.keys(AE_STATUS_META).map((status) => <tr key={status}><td><AeStatus status={status} /></td><td>{summary.statuses[status] || 0}</td></tr>)}
        </tbody></table></div>
        </>}
      </section>}
      <section className={'ae-card ' + (isEvaluator ? 'ae-span-7' : 'ae-span-12')} aria-labelledby="ae-composition-title"><h3 id="ae-composition-title">{t("educator_evaluation.weight_in_final_evaluation_c37rky", "Weight in final evaluation")}</h3>
        {!selectedTeacher ? <div className="ae-empty"><strong>{t("educator_evaluation.choose_an_educator_1l6d6bg", "Choose an educator")}</strong><p>{t("educator_evaluation.the_pie_recalculates_by_employee_category_and_data_availab_1xj4jfp", "The pie recalculates by employee category and data availability.")}</p></div> : <>
          <div className="ae-record-head"><p className="ae-sub">{selectedTeacher.name} · {selectedTeacher.employeeType === 'temporary' ? (AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.temporary_professional_employee_159tpp1", 'Temporary professional employee') : t("educator_evaluation.probationary_years_1_3_2t94tt", 'Probationary (years 1 to 3)')) : (AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.professional_classroom_teacher_1ar4m43", 'Professional classroom teacher') : t("educator_evaluation.continuing_contract_apv6ab", 'Continuing contract'))}</p><AeStatus status={aeTeacherStatus(selectedTeacher)} /></div>
          <AeDonut segments={profile.map((part) => ({ id: part.id, label: aeRubricDisplayLabel(part.label), value: part.weight, display: part.weight + '%', color: part.color }))} centerTop={profile[0] ? profile[0].weight + '%' : ''} centerBottom={aeRubricDisplayLabel(AE_ACTIVE_FW.practiceLabel)} label={t("educator_evaluation.weight_in_final_evaluation_1uba7pk", 'Weight in final evaluation: ') + profileLabel} />
          <div className="ae-note" style={{ marginTop: 10 }}>{AE_ACTIVE_FW.id === 'pa_act13' ? <>{t("educator_evaluation.within_observation_and_practice_planning_and_preparation_2_s1hcqg", "Within Observation & Practice: Planning & Preparation 20%, Classroom Environment 30%, Instruction 30%, Professional Responsibilities 20%.")}</> : (AE_ACTIVE_FW.id === 'portland_me' ? <>{t("educator_evaluation.portland_s_guidebook_rolls_the_four_domain_ratings_into_a__11p3ovg", "Portland’s guidebook rolls the four domain ratings into a categorical Professional Practice result by rule, not by averaging. Confirm the current district PEPG plan before official use.")}</> : <>{t("educator_evaluation.within_professional_practice_the_four_rubric_domains_avera_9rhhln", "Within Professional Practice the four rubric domains average equally in this generic planning profile; your district’s PEPG plan and adapted rubric govern any official aggregation.")}</>)}</div>
          {AE_ACTIVE_FW.id === 'pa_act13' && selectedTeacher.employeeType === 'temporary' && <div className="ae-note ae-warn" style={{ marginTop: 8 }}>{t("educator_evaluation.temporary_professional_employee_this_cycle_uses_100_observ_saotqm", "Temporary professional employee: this cycle uses 100% Observation & Practice.")}</div>}
          {AE_ACTIVE_FW.id === 'pa_act13' && selectedTeacher.employeeType !== 'temporary' && selectedTeacher.buildingData === false && <div className="ae-note ae-warn" style={{ marginTop: 8 }}>{t("educator_evaluation.no_building_level_data_its_10_is_reallocated_to_observatio_1cey1o2", "No Building Level Data: its 10% is reallocated to Observation & Practice.")}</div>}
          {AE_ACTIVE_FW.id === 'pa_act13' && selectedTeacher.employeeType !== 'temporary' && selectedTeacher.teacherSpecificData === false && <div className="ae-note ae-warn" style={{ marginTop: 8 }}>{t("educator_evaluation.no_attributable_teacher_specific_data_its_10_is_reallocate_d3k9uj", "No attributable Teacher-Specific Data: its 10% is reallocated to the LEA Selected Measure.")}</div>}
        </>}
      </section>
      {isEvaluator && <section className="ae-card ae-span-12"><div className="ae-record-head"><div><h3>{t("educator_evaluation.roster_status_2shoo8", "Roster status")}</h3><p className="ae-sub">{t("educator_evaluation.select_a_row_to_open_the_educator_s_working_record_av3e05", "Select a row to open the educator’s working record.")}</p></div><button type="button" className="ae-btn" onClick={() => setTab('staff')}>{t("educator_evaluation.manage_staff_1kpuiqg", "Manage staff")}</button></div>
        {activeTeachers.length === 0 ? <div className="ae-empty">{t("educator_evaluation.no_educators_yet_add_your_roster_in_staff_1pab6mk", "No educators yet. Add your roster in Staff.")}</div> : <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><thead><tr><th>{t("educator_evaluation.educator_8c1rq4", "Educator")}</th><th>{t("educator_evaluation.next_action_107tu5e", "Next action")}</th><th>{t("educator_evaluation.assignment_10eds7k", "Assignment")}</th><th>{t("educator_evaluation.evaluator_125q2ii", "Evaluator")}</th><th>{t("educator_evaluation.formal_observation_16nrpso", "Formal observation")}</th><th>{t("educator_evaluation.walkthroughs_12hordq", "Walkthroughs")}</th><th>{t("educator_evaluation.spm_slo_18l13ic", "SPM / SLO")}</th><th>{t("educator_evaluation.final_record_1awuyqk", "Final record")}</th><th>{t("educator_evaluation.next_due_wbbyhu", "Next due")}</th></tr></thead><tbody>
          {activeTeachers.map((teacher) => {
            const obs = workspace.observations.filter((item) => item.teacherId === teacher.id);
            const walks = workspace.walkthroughs.filter((item) => item.teacherId === teacher.id && item.publishedAt);
            const spm = workspace.spms.find((item) => item.teacherId === teacher.id);
            const action = nextActions.get(teacher.id);
            return <tr key={teacher.id}><td><button className="ae-row-btn" type="button" onClick={() => setSelectedTeacherId(teacher.id)}>{teacher.name}</button><br/><span className="ae-sub">{teacher.code} · {teacher.building}</span></td><td><button className="ae-row-btn" type="button" onClick={() => openNextAction(teacher, action)}>{action.label}</button><br/><span className="ae-sub">{action.detail}</span></td><td>{teacher.assignment || t("educator_evaluation.no_assignment_16215uj", 'No assignment')}</td><td>{teacher.evaluator || t("educator_evaluation.not_set_20260823", 'Not set')}</td><td>{obs.length ? (obs.some((item) => item.finalizedAt) ? t("educator_evaluation.finalized_4cmc2p", 'Finalized') : t("educator_evaluation.in_progress_bgdh5x", 'In progress')) : t("educator_evaluation.not_started_1mefwb3", 'Not started')}</td><td>{walks.length}</td><td>{spm ? aeWorkflowStatusLabel(spm.status) : t("educator_evaluation.not_started_1mefwb3", 'Not started')}</td><td><AeStatus status={aeTeacherStatus(teacher)} /></td><td>{aeDate(teacher.dueDate)}</td></tr>;
          })}
        </tbody></table></div>}
      </section>}
      {selectedTeacher && AE_ACTIVE_FW.id === 'portland_me' && (() => {
        const published = workspace.walkthroughs.filter((item) => item.teacherId === selectedTeacher.id && item.publishedAt).length;
        const observed = workspace.observations.filter((item) => item.teacherId === selectedTeacher.id && item.evidencePublishedAt).length;
        const pieces = published + observed;
        return <section className="ae-card ae-span-12" aria-labelledby="ae-evidence-count-title"><h3 id="ae-evidence-count-title">{t("educator_evaluation.evidence_collected_this_cycle_1i65e5v", "Evidence collected this cycle")}</h3><div className="ae-grid" style={{ marginTop: 10 }}><div className="ae-span-4 ae-stat"><strong>{pieces}</strong><span>{t("educator_evaluation.portal_tracked_evidence_pieces_1qci6ac", "portal-tracked evidence pieces")}</span></div><div className="ae-span-8"><p className="ae-sub">{t("educator_evaluation.the_guidebook_calls_for_at_least_nine_pieces_of_evidence_p_1pzljv9", "The guidebook calls for at least nine pieces of evidence per cycle across the full range of practice: including an observation cycle, and possibly walk-throughs, student materials, parent communication, surveys, and team-meeting performance. This counter sees only what lives in this portal (")}{published} {t("educator_evaluation.published_walkthrough_1fw5err", "published walkthrough")}{published === 1 ? '' : 's'} + {observed} observation{observed === 1 ? '' : 's'} {t("educator_evaluation.with_published_evidence_evidence_gathered_outside_it_count_hbhlh9", "with published evidence); evidence gathered outside it counts toward the nine as well.")}</p></div></div></section>;
      })()}
      {selectedTeacher && <AeEducatorStatement teacher={selectedTeacher} role={role} updateTeacher={updateTeacher} readOnlyPreview={readOnlyPreview} />}
      {selectedTeacher && <section className="ae-span-12" id="ae-annual-rating-composer"><AeRatingComposer workspace={workspace} teacher={selectedTeacher} role={role} updateTeacher={updateTeacher} evidenceFindings={evidenceFindings} aiReflectionEnabled={aiReflectionEnabled} askForReflection={askForReflection} reflection={reflection} requestActionReview={requestActionReview}/></section>}
    </div>
  </div>;
}

function AeTrendChart({ points, metric, label }) {
  const values = points.map((point) => ({ point, value: aeTrendPointMetric(point, metric) })).filter((item) => item.value !== null);
  if (!values.length) return <div className="ae-empty">{t("educator_evaluation.no_finalized_4dc00g", "No finalized")} {label.toLowerCase()} {t("educator_evaluation.points_in_this_date_range_7zw3ui", "points in this date range.")}</div>;
  const width = 720, height = 230, left = 44, right = 18, top = 22, bottom = 44;
  const x = (index) => values.length === 1 ? (left + width - right) / 2 : left + (index / (values.length - 1)) * (width - left - right);
  const y = (value) => top + ((3 - value) / 3) * (height - top - bottom);
  const polyline = values.map((item, index) => x(index) + ',' + y(item.value)).join(' ');
  return <div>
    <p className="ae-sub">{values.length} {t("educator_evaluation.finalized_point_1punnkr", "finalized point")}{values.length === 1 ? '' : 's'} {t("educator_evaluation.fixed_0_3_scale_missing_ratings_are_not_connected_sm6tpy", "· fixed 0 to 3 scale. Missing ratings are not connected.")}</p>
    <svg viewBox={'0 0 ' + width + ' ' + height} style={{ width: '100%', minHeight: 220, display: 'block' }} aria-hidden="true">
      {[0, 1, 2, 3].map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#d8deea"/><text x={left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#5b667a">{tick}</text></g>)}
      {values.length > 1 && <polyline points={polyline} fill="none" stroke="#1d4ed8" strokeWidth="3"/>}
      {values.map((item, index) => <g key={item.point.recordId}><circle cx={x(index)} cy={y(item.value)} r="6" fill="#fff" stroke="#1d4ed8" strokeWidth="3"/><text x={x(index)} y={y(item.value) - 11} textAnchor="middle" fontSize="11" fontWeight="700" fill="#172033">{item.value.toFixed(2)}</text><text x={x(index)} y={height - 17} textAnchor="middle" fontSize="10" fill="#5b667a">{item.point.source === 'cycle_snapshot' ? (item.point.academicYear || aeString(item.point.date, 10, '')).slice(0, 10) : aeString(item.point.date, 10, '')}</text></g>)}
    </svg>
    <div className="ae-table-wrap"><table className="ae-table"><caption className="ae-live">{label} {t("educator_evaluation.trend_data_punwew", "trend data")}</caption><thead><tr><th scope="col">{t("educator_evaluation.date_cycle_167h0iy", "Date / cycle")}</th><th scope="col">{t("educator_evaluation.record_186wx64", "Record")}</th><th scope="col">{label}</th></tr></thead><tbody>{values.map((item) => <tr key={item.point.recordId}><td><time dateTime={item.point.date}>{item.point.source === 'cycle_snapshot' ? (item.point.academicYear || aeDate(item.point.date)) : aeDate(item.point.date)}</time></td><td>{item.point.source === 'cycle_snapshot' ? t("educator_evaluation.final_cycle_release_oaoahs", 'Final cycle release') : t("educator_evaluation.finalized_formal_observation_1twgg72", 'Finalized formal observation')}</td><td>{item.value.toFixed(2)}</td></tr>)}</tbody></table></div>
  </div>;
}

function AeTrends({ workspace, selectedTeacher, setSelectedTeacherId, role, isRemote = false, repository = null }) {
  const isEvaluator = role === 'evaluator';
  const [metric, setMetric] = React.useState('overall');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [remoteCohort, setRemoteCohort] = React.useState({ status: 'idle', data: null, error: '' });
  const metricLabels = { overall: t("educator_evaluation.overall_ijbgyi", 'Overall ') + AE_ACTIVE_FW.practiceShort, d1: 'Planning & Preparation', d2: 'Classroom Environment', d3: 'Instruction', d4: 'Professional Responsibilities' };
  const filters = { from, to, source: 'formal_observation' };
  const points = selectedTeacher ? aeTeacherTrendPoints(workspace, selectedTeacher.id, filters) : [];
  const inRange = (value) => {
    const date = aeString(value, 10, '').slice(0, 10);
    return date && (!from || date >= from) && (!to || date <= to);
  };
  const walkthroughs = selectedTeacher ? workspace.walkthroughs.filter((item) => item.teacherId === selectedTeacher.id && item.publishedAt && inRange(item.publishedAt)) : [];
  const observations = selectedTeacher ? workspace.observations.filter((item) => item.teacherId === selectedTeacher.id && item.finalizedAt && inRange(item.finalizedAt)) : [];
  const snapshots = selectedTeacher ? (workspace.cycleSnapshots || []).filter((item) => item.teacherId === selectedTeacher.id && inRange(item.finalizedAt)) : [];
  const ackHours = walkthroughs.filter((item) => item.teacherAcknowledgedAt).map((item) => (new Date(item.teacherAcknowledgedAt).getTime() - new Date(item.publishedAt).getTime()) / 3600000).filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  const medianAck = ackHours.length ? (ackHours.length % 2 ? ackHours[Math.floor(ackHours.length / 2)] : (ackHours[ackHours.length / 2 - 1] + ackHours[ackHours.length / 2]) / 2) : null;
  React.useEffect(() => {
    let canceled = false;
    if (!isRemote || !isEvaluator || !selectedTeacher) { setRemoteCohort({ status: 'idle', data: null, error: '' }); return () => { canceled = true; }; }
    if (!repository || typeof repository.getCohortStats !== 'function') {
      setRemoteCohort({ status: 'error', data: null, error: t("educator_evaluation.authoritative_peer_context_is_unavailable_in_this_portal_b_pmzgk6", 'Authoritative peer context is unavailable in this portal build.') });
      return () => { canceled = true; };
    }
    setRemoteCohort({ status: 'loading', data: null, error: '' });
    repository.getCohortStats({ teacherId: selectedTeacher.id, metric, from, to }).then((result) => {
      if (canceled) return;
      if (!result || result.ok === false) throw new Error((result && (result.error || result.message)) || t("educator_evaluation.the_district_cohort_service_did_not_return_a_result_im1ngk", 'The district cohort service did not return a result.'));
      setRemoteCohort({ status: 'ready', error: '', data: {
        suppressed: result.suppressed !== false,
        minimum: Math.max(1, Number(result.minimum) || AE_MIN_TREND_COHORT),
        median: result.suppressed === false && Number.isFinite(Number(result.cohortMedian)) ? Number(result.cohortMedian) : null,
        selectedMean: Number.isFinite(Number(result.selectedMean)) ? Number(result.selectedMean) : null,
        peerCount: result.suppressed === false && Number.isInteger(Number(result.peerCount)) ? Number(result.peerCount) : null,
      } });
    }).catch((error) => {
      if (!canceled) setRemoteCohort({ status: 'error', data: null, error: String((error && error.message) || error || t("educator_evaluation.authoritative_peer_context_is_unavailable_moc28z", 'Authoritative peer context is unavailable.')) });
    });
    return () => { canceled = true; };
  }, [isRemote, isEvaluator, selectedTeacher && selectedTeacher.id, metric, from, to, repository]);
  const cohort = isRemote
    ? (remoteCohort.data || { suppressed: true, minimum: AE_MIN_TREND_COHORT, median: null, selectedMean: null })
    : (selectedTeacher ? aeWorkspaceCohortMetric(workspace, selectedTeacher.id, metric, filters) : { suppressed: true, minimum: AE_MIN_TREND_COHORT, median: null, selectedMean: null });
  const activity = {};
  walkthroughs.forEach((item) => { const month = item.publishedAt.slice(0, 7); activity[month] = activity[month] || { walkthroughs: 0, formals: 0 }; activity[month].walkthroughs += 1; });
  observations.forEach((item) => { const month = item.finalizedAt.slice(0, 7); activity[month] = activity[month] || { walkthroughs: 0, formals: 0 }; activity[month].formals += 1; });
  const months = Object.keys(activity).sort();
  // Building-wide coverage: activity and documentation counts only, mirroring
  // the growth snapshot's sources (published walkthroughs + observations with
  // published evidence). Ratings are never aggregated here.
  const activeTrendTeachers = workspace.teachers.filter((teacher) => teacher.active !== false);
  const activeTrendIds = new Set(activeTrendTeachers.map((teacher) => teacher.id));
  const coverageRows = isEvaluator ? activeTrendTeachers.map((teacher) => {
    const visits = workspace.walkthroughs.filter((item) => item.teacherId === teacher.id && item.publishedAt && inRange(item.publishedAt));
    const last = visits.reduce((max, item) => (String(item.publishedAt) > max ? String(item.publishedAt) : max), '');
    const daysSince = last ? Math.max(0, Math.floor((Date.now() - new Date(last).getTime()) / 86400000)) : null;
    return { teacher, count: visits.length, last, daysSince };
  }).sort((a, b) => (a.last || '').localeCompare(b.last || '') || a.teacher.name.localeCompare(b.teacher.name)) : [];
  const buildingTagCounts = {};
  if (isEvaluator) {
    workspace.walkthroughs.filter((item) => activeTrendIds.has(item.teacherId) && item.publishedAt && inRange(item.publishedAt))
      .concat(workspace.observations.filter((item) => activeTrendIds.has(item.teacherId) && item.evidencePublishedAt && inRange(item.evidencePublishedAt)))
      .forEach((record) => (record.componentTags || []).forEach((code) => { buildingTagCounts[code] = (buildingTagCounts[code] || 0) + 1; }));
  }
  const domainCoverage = isEvaluator ? AE_DOMAINS.map((domain) => {
    const comps = (AE_ACTIVE_FW.components && AE_ACTIVE_FW.components[domain.id]) || domain.components;
    const total = comps.reduce((sum, comp) => sum + (buildingTagCounts[comp[0]] || 0), 0);
    const missing = comps.filter((comp) => !buildingTagCounts[comp[0]]).map((comp) => comp[0]);
    return { domain, total, missing };
  }) : [];
  return <div className="ae-page">
    <div className="ae-heading"><div><h2>{isEvaluator ? t("educator_evaluation.teacher_trends_and_cohort_context_np8xyk", 'Teacher trends and cohort context') : t("educator_evaluation.my_trends_1vjgzgd", 'My trends')}</h2><p>{t("educator_evaluation.finalized_formal_observation_ratings_and_workflow_activity_170pnh7", "Finalized formal-observation ratings and workflow activity over time. Annual cycle releases are reported separately. Evidence text, comments, and rationales are never aggregated.")}</p></div></div>
    <div className="ae-note ae-warn" style={{ marginBottom: 16 }}><strong>{t("educator_evaluation.privacy_aware_aggregate_not_ferpa_certification_usil4c", "Privacy-aware aggregate, not FERPA certification.")}</strong> {t("educator_evaluation.formal_observation_cohort_values_appear_only_when_at_least_16kwdtd", "Formal-observation cohort values appear only when at least")} {AE_MIN_TREND_COHORT} {t("educator_evaluation.eligible_peers_contribute_small_groups_are_suppressed_resu_5j2kwi", "eligible peers contribute; small groups are suppressed. Results are descriptive and must not be the sole basis for personnel decisions.")} {isRemote ? t("educator_evaluation.district_authorization_retention_and_employment_policy_req_4mwnei", 'District authorization, retention, and employment-policy requirements still apply.') : t("educator_evaluation.on_this_device_cohort_context_reflects_only_this_workspace_iszwmv", 'On this device, cohort context reflects only this workspace; the district portal adds authenticated, permission-filtered comparisons.')}</div>
    <section className="ae-card" style={{ marginBottom: 16 }}><fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend style={{ fontWeight: 850, marginBottom: 10 }}>{t("educator_evaluation.trend_filters_17ntchv", "Trend filters")}</legend><div className="ae-form-grid">
      {isEvaluator && <label className="ae-field"><span>{t("educator_evaluation.educator_8c1rq4", "Educator")}</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => setSelectedTeacherId(event.target.value)}><option value="">{t("educator_evaluation.choose_an_educator_1l6d6bg", "Choose an educator")}</option>{workspace.teachers.filter((teacher) => teacher.active !== false).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label>}
      <label className="ae-field"><span>{t("educator_evaluation.metric_1esenmp", "Metric")}</span><select className="ae-select" value={metric} onChange={(event) => setMetric(event.target.value)}>{Object.keys(metricLabels).map((key) => <option key={key} value={key}>{metricLabels[key]}</option>)}</select></label>
      <label className="ae-field"><span>{t("educator_evaluation.from_6s9hn9", "From")}</span><input className="ae-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label>
      <label className="ae-field"><span>To</span><input className="ae-input" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)}/></label>
    </div></fieldset></section>
    {isEvaluator && coverageRows.length > 0 && <div className="ae-grid" style={{ marginBottom: 16 }}>
      <section className="ae-card ae-span-7" aria-labelledby="ae-coverage-title"><h3 id="ae-coverage-title">{t("educator_evaluation.walkthrough_coverage_across_roster_20260823", "Walkthrough coverage across the roster")}</h3><p className="ae-sub">{t("educator_evaluation.coverage_framing_20260823", "Published walkthroughs in the selected date range, sorted with the longest-unvisited educators first. A planning aid for spreading visits, not a judgment about anyone.")}</p>
        <div className="ae-table-wrap" style={{ marginTop: 10 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.coverage_caption_20260823", "Walkthrough coverage by educator")}</caption><thead><tr><th scope="col">{t("educator_evaluation.educator_8c1rq4", "Educator")}</th><th scope="col">{t("educator_evaluation.published_visits_20260823", "Published visits")}</th><th scope="col">{t("educator_evaluation.last_visit_20260823", "Last visit")}</th><th scope="col">{t("educator_evaluation.days_since_20260823", "Days since")}</th></tr></thead><tbody>{coverageRows.map((row) => <tr key={row.teacher.id}><td><button type="button" className="ae-row-btn" onClick={() => setSelectedTeacherId(row.teacher.id)}>{row.teacher.name}</button><br/><span className="ae-sub">{row.teacher.code}</span></td><td>{row.count}</td><td>{row.last ? aeDate(row.last) : t("educator_evaluation.no_published_visits_yet_20260823", 'No published visits yet')}</td><td>{row.daysSince == null ? '' : row.daysSince}</td></tr>)}</tbody></table></div>
      </section>
      <section className="ae-card ae-span-5" aria-labelledby="ae-domain-coverage-title"><h3 id="ae-domain-coverage-title">{t("educator_evaluation.documented_evidence_by_domain_20260823", "Documented evidence by domain")}</h3><p className="ae-sub">{t("educator_evaluation.domain_coverage_framing_20260823", "Evidence-tag counts on published records across the active roster. A domain nobody documents is a professional-development planning signal, never a rating.")}</p>
        {domainCoverage.map((entry) => <div className="ae-stat" key={entry.domain.id} style={{ marginTop: 10, borderLeftColor: entry.domain.color }}><strong>{entry.total}</strong><span>{entry.domain.code}. {aeRubricDisplayLabel(entry.domain.label)}{entry.missing.length ? t("educator_evaluation.no_evidence_tagged_yet_20260823", ' · no evidence tagged yet: ') + entry.missing.join(', ') : t("educator_evaluation.every_component_tagged_20260823", ' · every component has tagged evidence')}</span></div>)}
      </section>
    </div>}
    {!selectedTeacher ? <div className="ae-card ae-empty">{t("educator_evaluation.choose_an_educator_to_view_trends_1imi3bc", "Choose an educator to view trends.")}</div> : <div className="ae-grid">
      <section className="ae-card ae-span-12"><div className="ae-record-head"><div><h3>{selectedTeacher.name} {t("educator_evaluation.longitudinal_snapshot_d4cp8i", "· longitudinal snapshot")}</h3><p className="ae-sub">{workspace.config.academicYear} {t("educator_evaluation.current_workflow_plus_separately_reported_immutable_prior__1m7qy4f", "current workflow plus separately reported immutable prior-cycle releases.")}</p></div><AeStatus status={aeTeacherStatus(selectedTeacher)}/></div><div className="ae-grid" style={{ marginTop: 12 }}><div className="ae-span-4 ae-stat"><strong>{walkthroughs.length}</strong><span>{t("educator_evaluation.published_walkthroughs_1q06270", "published walkthroughs")}</span></div><div className="ae-span-4 ae-stat"><strong>{observations.length}</strong><span>{t("educator_evaluation.finalized_formal_observations_18xzo0n", "finalized formal observations")}</span></div><div className="ae-span-4 ae-stat"><strong>{snapshots.length}</strong><span>{t("educator_evaluation.released_cycle_snapshots_in_range_dm6l8l", "released cycle snapshots in range")}</span></div></div>{medianAck !== null && <p className="ae-sub" style={{ marginTop: 10 }}>{t("educator_evaluation.median_walkthrough_acknowledgment_y39z4o", "Median walkthrough acknowledgment:")} {medianAck < 48 ? medianAck.toFixed(1) + ' hours' : (medianAck / 24).toFixed(1) + ' days'} (n={ackHours.length}).</p>}</section>
      <section className="ae-card ae-span-12"><h3>{t("educator_evaluation.annual_cycle_releases_1scqmxm", "Annual cycle releases")}</h3><p className="ae-sub">{t("educator_evaluation.all_factor_final_evaluation_scores_are_listed_separately_a_9tzy7w", "All-factor final evaluation scores are listed separately and are not mixed into formal-observation O&P trajectories or peer comparisons.")}</p>{snapshots.length ? <div className="ae-table-wrap" style={{ marginTop: 10 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.annual_cycle_release_scores_mlxmco", "Annual cycle release scores")}</caption><thead><tr><th scope="col">{t("educator_evaluation.academic_year_ud1477", "Academic year")}</th><th scope="col">{t("educator_evaluation.released_i33a4u", "Released")}</th><th scope="col">{t("educator_evaluation.final_evaluation_score_fs97kd", "Final evaluation score")}</th></tr></thead><tbody>{snapshots.map((snapshot) => <tr key={snapshot.id}><td>{snapshot.academicYear || t("educator_evaluation.unspecified_year_19ggyad", 'Unspecified year')}</td><td>{aeDate(snapshot.finalizedAt)}</td><td>{snapshot.finalScore == null ? t("educator_evaluation.not_recorded_wm31ze", 'Not recorded') : Number(snapshot.finalScore).toFixed(2)}</td></tr>)}</tbody></table></div> : <div className="ae-empty">{t("educator_evaluation.no_released_annual_cycle_snapshots_in_this_date_range_tvl8b3", "No released annual cycle snapshots in this date range.")}</div>}</section>
      <section className={'ae-card ' + (isEvaluator ? 'ae-span-8' : 'ae-span-12')}><h3>Formal-observation {metricLabels[metric]} {t("educator_evaluation.over_time_11z83bw", "over time")}</h3><AeTrendChart points={points} metric={metric} label={metricLabels[metric]}/></section>
      {isEvaluator && <section className="ae-card ae-span-4"><h3>{t("educator_evaluation.de_identified_peer_context_1j1515n", "De-identified peer context")}</h3><p className="ae-sub">{t("educator_evaluation.same_building_and_employee_type_selected_educator_excluded_1uj3nez", "Same building and employee type; selected educator excluded. Each peer contributes one mean across finalized formal observations before the cohort median.")}</p>{isRemote && remoteCohort.status === 'loading' ? <div className="ae-note" role="status" style={{ marginTop: 12 }}>{t("educator_evaluation.loading_permission_filtered_district_aggregate_bx5efr", "Loading permission-filtered district aggregate…")}</div> : (isRemote && remoteCohort.status === 'error' ? <div className="ae-note ae-warn" role="alert" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.peer_context_unavailable_1cc8pua", "Peer context unavailable.")}</strong><br/>{remoteCohort.error} {t("educator_evaluation.no_local_approximation_is_shown_1gsl25z", "No local approximation is shown.")}</div> : (cohort.suppressed ? <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.suppressed_1k7oc63", "Suppressed.")}</strong><br/>{t("educator_evaluation.fewer_than_1ofnht9", "Fewer than")} {cohort.minimum || AE_MIN_TREND_COHORT} {t("educator_evaluation.eligible_peers_contributed_to_this_metric_and_date_range_t_nlvriq", "eligible peers contributed to this metric and date range. The exact small-group count is not exposed.")}</div> : <div style={{ marginTop: 14 }}><div className="ae-stat"><strong>{cohort.selectedMean == null ? t("educator_evaluation.not_available_20260823", 'Not available') : cohort.selectedMean.toFixed(2)}</strong><span>{t("educator_evaluation.selected_educator_mean_11m067i", "selected educator mean")}</span></div><div className="ae-stat" style={{ marginTop: 10, borderLeftColor: '#0f766e' }}><strong>{cohort.median.toFixed(2)}</strong><span>{t("educator_evaluation.peer_cohort_median_n_1torzie", "peer cohort median · n=")}{cohort.peerCount}</span></div></div>))}<div className="ae-note" style={{ marginTop: 14 }}>{t("educator_evaluation.no_ranking_percentile_peer_names_automated_judgment_or_per_1oxvxgr", "No ranking, percentile, peer names, automated judgment, or personnel recommendation is produced.")}</div></section>}
      <section className="ae-card ae-span-12"><h3>{t("educator_evaluation.observation_activity_by_month_17bprax", "Observation activity by month")}</h3><p className="ae-sub">{t("educator_evaluation.volume_indicates_documentation_activity_not_teaching_quali_1m93vd3", "Volume indicates documentation activity, not teaching quality.")}</p>{months.length ? <div className="ae-table-wrap" style={{ marginTop: 10 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.monthly_observation_activity_7hnyo1", "Monthly observation activity")}</caption><thead><tr><th scope="col">{t("educator_evaluation.month_1aqporp", "Month")}</th><th scope="col">{t("educator_evaluation.published_walkthroughs_recj3w", "Published walkthroughs")}</th><th scope="col">{t("educator_evaluation.finalized_formal_observations_vwek1j", "Finalized formal observations")}</th></tr></thead><tbody>{months.map((month) => <tr key={month}><th scope="row">{month}</th><td>{activity[month].walkthroughs}</td><td>{activity[month].formals}</td></tr>)}</tbody></table></div> : <div className="ae-empty">{t("educator_evaluation.no_published_finalized_observation_activity_in_this_date_r_zsf3ug", "No published/finalized observation activity in this date range.")}</div>}</section>
    </div>}
  </div>;
}
// One educator per line. Tab-separated lines (a spreadsheet paste) split on
// tabs only, so names containing commas survive; otherwise commas separate
// the fields. Order: name, staff code, assignment, due date (YYYY-MM-DD).
function aeParseRosterPaste(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = (line.indexOf('\t') >= 0 ? line.split('\t') : line.split(',')).map((part) => part.trim());
    const rawDueDate = parts[3] || '';
    return {
      name: parts[0] || '',
      code: parts[1] || '',
      assignment: parts[2] || '',
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(rawDueDate) ? rawDueDate : '',
      rawDueDate,
    };
  });
}

function AeStaff({ workspace, selectedTeacher, setSelectedTeacherId, role, updateTeacher, addTeacher, addTeachersBulk, isRemote = false, canAddStaff = true }) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [adding, setAdding] = React.useState(false);
  const [pasting, setPasting] = React.useState(false);
  const [pasteText, setPasteText] = React.useState('');
  const [draft, setDraft] = React.useState({ name: '', code: '', assignment: '', building: workspace.config.building || '', dueDate: '' });
  const [addError, setAddError] = React.useState('');
  const pasteRows = React.useMemo(() => {
    if (!pasting) return [];
    const existing = new Set(workspace.teachers.map((teacher) => teacher.code.toLowerCase()));
    const seen = new Set();
    return aeParseRosterPaste(pasteText).map((row) => {
      const key = row.code.toLowerCase();
      let status = '';
      if (!row.name || !row.code) status = t("educator_evaluation.skipped_name_and_code_required_20260823", 'Skipped: name and staff code are required');
      else if (existing.has(key)) status = t("educator_evaluation.skipped_code_in_workspace_20260823", 'Skipped: staff code already in this workspace');
      else if (seen.has(key)) status = t("educator_evaluation.skipped_duplicate_code_in_paste_20260823", 'Skipped: duplicate staff code in this paste');
      else seen.add(key);
      const note = !status && row.rawDueDate && !row.dueDate ? t("educator_evaluation.due_date_not_recognized_20260823", 'due date not recognized (use YYYY-MM-DD), left blank') : '';
      return Object.assign({}, row, { status, note });
    });
  }, [pasting, pasteText, workspace.teachers]);
  const readyRows = pasteRows.filter((row) => !row.status);
  const savePaste = () => {
    const added = addTeachersBulk(readyRows);
    if (added > 0) { setPasting(false); setPasteText(''); }
  };
  const matches = workspace.teachers.filter((teacher) => {
    const hay = (teacher.name + ' ' + teacher.code + ' ' + teacher.assignment + ' ' + teacher.building).toLowerCase();
    return hay.includes(search.toLowerCase()) && (statusFilter === 'all' || aeTeacherStatus(teacher) === statusFilter);
  });
  const set = (field, value) => updateTeacher(selectedTeacher.id, (draft) => { draft[field] = value; }, 'PROFILE_UPDATED', 'Educator assignment updated');
  const saveDraft = () => {
    const name = draft.name.trim();
    const code = draft.code.trim();
    if (!name || !code) { setAddError('Name and staff code are required.'); return; }
    if (workspace.teachers.some((teacher) => teacher.code.toLowerCase() === code.toLowerCase())) { setAddError('That staff code is already in this workspace.'); return; }
    const id = addTeacher(Object.assign({}, draft, { name, code }));
    if (!id) return;
    setAdding(false);
    setAddError('');
    setDraft({ name: '', code: '', assignment: '', building: workspace.config.building || '', dueDate: '' });
  };
  return <div className="ae-page"><div className="ae-heading"><div><h2>{isRemote ? t("educator_evaluation.staff_and_cycle_profiles_1o85lvs", 'Staff and cycle profiles') : t("educator_evaluation.staff_and_evaluation_assignments_qbjges", 'Staff and evaluation assignments')}</h2><p>{AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.configure_the_employee_category_and_data_availability_that_1pc840t", 'Configure the employee category and data availability that drive each educator’s Act 13 pie.') : t("educator_evaluation.configure_each_educator_s_profile_under_the_maine_pepg_pro_145i8ll", 'Configure each educator’s profile. Under the Maine PEPG profile, summative weights come from your district plan’s category split in About, not from these toggles.')}</p></div>{role === 'evaluator' && canAddStaff && <div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" onClick={() => { setAdding(true); setAddError(''); }}>{t("educator_evaluation.add_educator_1ym4hka", "+ Add educator")}</button>{!isRemote && typeof addTeachersBulk === 'function' && <button type="button" className="ae-btn" onClick={() => setPasting((value) => !value)}>{pasting ? t("educator_evaluation.close_roster_paste_20260823", 'Close roster paste') : t("educator_evaluation.paste_roster_20260823", 'Paste roster')}</button>}</div>}</div>
    {adding && <section className="ae-card" aria-labelledby="ae-add-educator-title" style={{ marginBottom: 16 }}><h3 id="ae-add-educator-title">{t("educator_evaluation.add_an_educator_38iunk", "Add an educator")}</h3><p className="ae-sub">{t("educator_evaluation.this_is_a_draft_until_you_choose_save_educator_cancel_crea_10l6she", "This is a draft until you choose Save educator. Cancel creates no record or audit event.")}</p><div className="ae-form-grid" style={{ marginTop: 12 }}><label className="ae-field"><span>{t("educator_evaluation.name_4el6o6", "Name")}</span><input className="ae-input" autoFocus value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}/></label><label className="ae-field"><span>{t("educator_evaluation.unique_staff_code_1e9a9q5", "Unique staff code")}</span><input className="ae-input" value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}/></label><label className="ae-field"><span>{t("educator_evaluation.assignment_10eds7k", "Assignment")}</span><input className="ae-input" value={draft.assignment} onChange={(event) => setDraft((current) => ({ ...current, assignment: event.target.value }))}/></label><label className="ae-field"><span>{t("educator_evaluation.building_12fqnbp", "Building")}</span><input className="ae-input" value={draft.building} onChange={(event) => setDraft((current) => ({ ...current, building: event.target.value }))}/></label><label className="ae-field"><span>{t("educator_evaluation.cycle_due_date_xn67v5", "Cycle due date")}</span><input className="ae-input" type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}/></label></div>{addError && <p className="ae-note ae-danger" role="alert">{addError}</p>}<div className="ae-actions"><button type="button" className="ae-btn" onClick={() => { setAdding(false); setAddError(''); }}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button><button type="button" className="ae-btn ae-btn-primary" onClick={saveDraft}>{t("educator_evaluation.save_educator_1adelqt", "Save educator")}</button></div></section>}
    {pasting && role === 'evaluator' && canAddStaff && !isRemote && <section className="ae-card" aria-labelledby="ae-paste-roster-title" style={{ marginBottom: 16 }}><h3 id="ae-paste-roster-title">{t("educator_evaluation.paste_your_roster_20260823", "Paste your roster")}</h3><p className="ae-sub">{t("educator_evaluation.paste_roster_format_help_20260823", "One educator per line: name, staff code, assignment (optional), cycle due date as YYYY-MM-DD (optional). Commas or tabs separate the fields, so pasting straight from a spreadsheet works; if a name contains a comma, paste tab-separated spreadsheet cells instead. Nothing is added until you review the preview and choose Add.")}</p>
      <label className="ae-field" style={{ marginTop: 12 }}><span>{t("educator_evaluation.pasted_roster_lines_20260823", "Pasted roster lines")}</span><textarea className="ae-textarea" value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={'Jordan Rivera, JR104, Grade 3, 2027-05-15\nSam Lee, SL221, Biology'}/></label>
      {pasteRows.length > 0 && <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.pasted_roster_preview_20260823", "Pasted roster preview")}</caption><thead><tr><th scope="col">{t("educator_evaluation.name_4el6o6", "Name")}</th><th scope="col">{t("educator_evaluation.staff_code_bhsu0q", "Staff code")}</th><th scope="col">{t("educator_evaluation.assignment_10eds7k", "Assignment")}</th><th scope="col">{t("educator_evaluation.due_lfawnp", "Due")}</th><th scope="col">{t("educator_evaluation.result_20260823", "Result")}</th></tr></thead><tbody>{pasteRows.map((row, index) => <tr key={index}><td>{row.name || t("educator_evaluation.missing_value_20260823", '(missing)')}</td><td>{row.code || t("educator_evaluation.missing_value_20260823", '(missing)')}</td><td>{row.assignment}</td><td>{row.dueDate || row.rawDueDate}</td><td>{row.status ? <span className="ae-chip ae-chip-amber">{row.status}</span> : <span className="ae-chip ae-chip-good">{t("educator_evaluation.ready_status_20260822", 'Ready')}{row.note ? ' · ' + row.note : ''}</span>}</td></tr>)}</tbody></table></div>}
      <div className="ae-actions" style={{ marginTop: 12 }}><button type="button" className="ae-btn" onClick={() => { setPasting(false); setPasteText(''); }}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button><button type="button" className="ae-btn ae-btn-primary" disabled={readyRows.length === 0} onClick={savePaste}>{t("educator_evaluation.add_educators_count_20260823", 'Add ') + readyRows.length + (readyRows.length === 1 ? t("educator_evaluation.educator_singular_20260823", ' educator') : t("educator_evaluation.educator_plural_20260823", ' educators'))}</button>{pasteRows.length > readyRows.length && <span className="ae-help">{(pasteRows.length - readyRows.length) + t("educator_evaluation.skipped_lines_stay_out_20260823", ' skipped line(s) above will not be added.')}</span>}</div>
    </section>}
    <div className="ae-grid"><section className="ae-card ae-span-7"><div className="ae-toolbar"><input className="ae-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("educator_evaluation.search_staff_1puhliv", "Search staff")} aria-label={t("educator_evaluation.search_staff_1puhliv", "Search staff")}/><select className="ae-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={t("educator_evaluation.filter_by_evaluation_status_jrlny4", "Filter by evaluation status")}><option value="all">{t("educator_evaluation.all_statuses_u1q98u", "All statuses")}</option>{Object.keys(AE_STATUS_META).map((key) => <option key={key} value={key}>{AE_STATUS_META[key].label}</option>)}</select></div>
      <div className="ae-table-wrap"><table className="ae-table"><thead><tr><th>{t("educator_evaluation.educator_8c1rq4", "Educator")}</th><th>{t("educator_evaluation.employee_type_1ridbwr", "Employee type")}</th><th>{t("educator_evaluation.status_3pd73", "Status")}</th><th>{t("educator_evaluation.due_lfawnp", "Due")}</th></tr></thead><tbody>{matches.map((teacher) => <tr key={teacher.id}><td><button type="button" className="ae-row-btn" onClick={() => setSelectedTeacherId(teacher.id)}>{teacher.name}</button><br/><span className="ae-sub">{teacher.code} · {teacher.assignment || t("educator_evaluation.no_assignment_16215uj", 'No assignment')}</span></td><td>{teacher.employeeType === 'temporary' ? t("educator_evaluation.temporary_12plq58", 'Temporary') : t("educator_evaluation.professional_1wvex2a", 'Professional')}</td><td><AeStatus status={aeTeacherStatus(teacher)} /></td><td>{aeDate(teacher.dueDate)}</td></tr>)}</tbody></table></div>
    </section><section className="ae-card ae-span-5"><h3>{t("educator_evaluation.selected_educator_2guy6p", "Selected educator")}</h3>{selectedTeacher && selectedTeacher.cycleLockedAt && <div className="ae-note ae-warn" style={{ marginBottom: 12 }}>{t("educator_evaluation.employee_category_data_availability_and_framework_weights__1cdamlp", "Employee category, data availability, and framework weights were frozen when cycle work began (")}{aeDateTime(selectedTeacher.cycleLockedAt)}).</div>}{!selectedTeacher ? <div className="ae-empty">{t("educator_evaluation.select_an_educator_to_review_the_assignment_blqh4w", "Select an educator to review the assignment.")}</div> : <fieldset disabled={role !== 'evaluator' || !!selectedTeacher.finalizedAt || !!selectedTeacher.cycleLockedAt} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="ae-form-grid"><label className="ae-field"><span>{t("educator_evaluation.name_4el6o6", "Name")}</span><input className="ae-input" value={selectedTeacher.name} onChange={(event) => set('name', event.target.value)} /></label><label className="ae-field"><span>{t("educator_evaluation.staff_code_bhsu0q", "Staff code")}</span><input className="ae-input" value={selectedTeacher.code} onChange={(event) => set('code', event.target.value)} /></label></div>
      <label className="ae-field"><span>{t("educator_evaluation.assignment_10eds7k", "Assignment")}</span><input className="ae-input" value={selectedTeacher.assignment || ''} onChange={(event) => set('assignment', event.target.value)} placeholder={t("educator_evaluation.grade_subject_role_h3sbnw", "Grade / subject / role")} /></label>
      <div className="ae-form-grid"><label className="ae-field"><span>{t("educator_evaluation.building_12fqnbp", "Building")}</span><input className="ae-input" value={selectedTeacher.building || ''} onChange={(event) => set('building', event.target.value)} /></label><label className="ae-field"><span>{isRemote ? t("educator_evaluation.lead_evaluator_display_label_1bvs5vu", 'Lead evaluator display label') : t("educator_evaluation.lead_evaluator_1fqpj36", 'Lead evaluator')}</span><input className="ae-input" value={selectedTeacher.evaluator || ''} readOnly={isRemote} onChange={isRemote ? undefined : (event) => set('evaluator', event.target.value)} /></label></div>{isRemote && <div className="ae-note ae-warn" style={{ marginBottom: 12 }}><strong>{t("educator_evaluation.portal_access_is_separate_from_this_profile_a1nk0b", "Portal access is separate from this profile.")}</strong><br/>{t("educator_evaluation.evaluator_assignments_are_managed_by_an_authorized_distric_1w0o9xa", "Evaluator assignments are managed by an authorized district administrator or IT. This display label does not grant or revoke access.")}</div>}
      <div className="ae-form-grid"><label className="ae-field"><span>{AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.employee_type_1ridbwr", 'Employee type') : t("educator_evaluation.contract_status_11nmb5n", 'Contract status')}</span><select className="ae-select" value={selectedTeacher.employeeType} onChange={(event) => set('employeeType', event.target.value)}><option value="professional">{AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.professional_classroom_teacher_1ar4m43", 'Professional classroom teacher') : t("educator_evaluation.continuing_contract_apv6ab", 'Continuing contract')}</option><option value="temporary">{AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.temporary_professional_employee_159tpp1", 'Temporary professional employee') : t("educator_evaluation.probationary_years_1_3_2t94tt", 'Probationary (years 1 to 3)')}</option></select></label><label className="ae-field"><span>{t("educator_evaluation.cycle_due_date_xn67v5", "Cycle due date")}</span><input className="ae-input" type="date" value={selectedTeacher.dueDate || ''} onChange={(event) => set('dueDate', event.target.value)} /></label></div>
      {AE_ACTIVE_FW.id === 'pa_act13' && <label className="ae-check"><input type="checkbox" checked={selectedTeacher.buildingData !== false} onChange={(event) => set('buildingData', event.target.checked)} /><span>{t("educator_evaluation.building_level_data_is_available_for_this_assignment_1u0956g", "Building Level Data is available for this assignment.")}</span></label>}
      {AE_ACTIVE_FW.id === 'pa_act13' && <label className="ae-check"><input type="checkbox" checked={selectedTeacher.teacherSpecificData !== false} onChange={(event) => set('teacherSpecificData', event.target.checked)} /><span>{t("educator_evaluation.teacher_specific_data_is_attributable_to_this_educator_14cghlb", "Teacher-Specific Data is attributable to this educator.")}</span></label>}{AE_ACTIVE_FW.id !== 'pa_act13' && selectedTeacher.employeeType === 'temporary' && <div className="ae-note" style={{ marginTop: 8 }}>{t("educator_evaluation.probationary_educators_are_evaluated_at_least_once_each_ye_18pjw7l", "Probationary educators are evaluated at least once each year of the three-year probationary period, with more frequent observation cycles than continuing-contract educators (board policy GCOA; PEPG guidebook).")}</div>}
      <label className="ae-check"><input type="checkbox" checked={selectedTeacher.active !== false} onChange={(event) => set('active', event.target.checked)} /><span>{t("educator_evaluation.include_in_the_current_cycle_denominator_1hmfq60", "Include in the current cycle denominator.")}</span></label>
      <div className="ae-note">{t("educator_evaluation.current_pie_1laighm", "Current pie:")} {aeWeightProfile(selectedTeacher).map((part) => part.short + ' ' + part.weight + '%').join(' · ')}</div>
    </fieldset>}</section></div>
  </div>;
}

function AeComponentChecks({ selected, onChange, disabled }) {
  const values = Array.isArray(selected) ? selected : [];
  return <div><span className="ae-legend-label">{t("educator_evaluation.evidence_tags_15n80ut", "Evidence tags")}</span>{AE_DOMAINS.map((domain) => <details className="ae-domain" key={domain.id}><summary>{domain.code}. {aeRubricDisplayLabel(domain.label)}</summary><div className="ae-domain-body">{((AE_ACTIVE_FW.components && AE_ACTIVE_FW.components[domain.id]) || domain.components).map(([code, label]) => <label className="ae-check" key={code}><input disabled={disabled} type="checkbox" checked={values.includes(code)} onChange={(event) => onChange(event.target.checked ? values.concat(code) : values.filter((item) => item !== code))}/><span><strong>{code}</strong> · {aeRubricDisplayLabel(label)}</span></label>)}</div></details>)}</div>;
}

const AE_WALK_DRAFT_KEY = 'alloflow_ae_walkthrough_draft_v1';
function aeMeaningfulWalkthroughDraft(value) {
  return !!(value && (String(value.evidence || '').trim() || String(value.interpretation || '').trim() || String(value.subject || '').trim() || (Array.isArray(value.componentTags) && value.componentTags.length)));
}
function aeHasWalkthroughDraft() {
  try {
    const raw = sessionStorage.getItem(AE_WALK_DRAFT_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    return !!(saved && typeof saved === 'object' && aeMeaningfulWalkthroughDraft(saved));
  } catch (_) { return false; }
}

// The visit form owns the draft so typing re-renders ONLY the form. When the
// draft lived in AeWalkthroughs, every keystroke re-rendered the whole tab
// including the visit-record list; with a year of records that measured
// ~117ms mean per keystroke at 4x CPU throttle.
function AeWalkthroughForm({ teachers, selectedTeacherId, createWalkthrough, editingRecord = null, updateWalkthroughDraft = null, requestActionReview, addTeacher = null, canAddStaff = false, onCreated }) {
  const blank = () => ({ teacherId: selectedTeacherId || (teachers[0] && teachers[0].id) || '', date: aeToday(), startedAt: '', durationMin: '8', announced: 'unannounced', lessonPhase: 'middle', subject: '', evidence: '', interpretation: '', componentTags: [], privacyChecked: false });
  // Switching tool tabs unmounts the walkthroughs tab: sessionStorage keeps
  // the typed evidence for the life of the browser tab so a mid-visit
  // interruption cannot erase it.
  const [draft, setDraft] = React.useState(() => {
    if (editingRecord) return Object.assign(blank(), editingRecord, { privacyChecked: !!editingRecord.privacyChecked });
    try {
      const raw = sessionStorage.getItem(AE_WALK_DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object' && typeof saved.evidence === 'string') {
          if (!Array.isArray(saved.componentTags)) saved.componentTags = [];
          if (saved.teacherId && !teachers.some((teacher) => teacher.id === saved.teacherId)) saved.teacherId = '';
          return Object.assign(blank(), saved);
        }
      }
    } catch (_) {}
    return blank();
  });
  React.useEffect(() => {
    try {
      if (editingRecord) return;
      if (aeMeaningfulWalkthroughDraft(draft)) sessionStorage.setItem(AE_WALK_DRAFT_KEY, JSON.stringify(draft));
      else sessionStorage.removeItem(AE_WALK_DRAFT_KEY);
    } catch (_) {}
  }, [draft, editingRecord]);
  React.useEffect(() => { if (selectedTeacherId) setDraft((value) => (value.teacherId ? value : Object.assign({}, value, { teacherId: selectedTeacherId }))); }, [selectedTeacherId]);
  const [quickAdd, setQuickAdd] = React.useState(false);
  const [quickName, setQuickName] = React.useState('');
  const [quickCode, setQuickCode] = React.useState('');
  const saveQuickAdd = () => {
    if (typeof addTeacher !== 'function') return;
    const id = addTeacher({ name: quickName, code: quickCode });
    if (!id) return;
    setDraft((current) => Object.assign({}, current, { teacherId: id }));
    setQuickAdd(false);
    setQuickName('');
    setQuickCode('');
  };
  const persist = (published) => {
    if (!draft.teacherId || !draft.evidence.trim()) return;
    if (published && !draft.privacyChecked) return;
    const payload = Object.assign({}, draft, { startedAt: draft.startedAt || aeNow(), published });
    const id = editingRecord && typeof updateWalkthroughDraft === 'function' ? updateWalkthroughDraft(editingRecord.id, payload) : createWalkthrough(payload);
    setDraft(blank());
    // onCreated() closes the form, unmounting this component in the SAME
    // commit, so the persistence effect never sees the blank draft: clear
    // the stored copy explicitly or the saved visit re-offers as a draft.
    try { sessionStorage.removeItem(AE_WALK_DRAFT_KEY); } catch (_) {}
    onCreated(id);
  };
  const submit = (published) => {
    if (!draft.teacherId || !draft.evidence.trim() || (published && !draft.privacyChecked)) return;
    if (!published) { persist(false); return; }
    const teacher = teachers.find((item) => item.id === draft.teacherId);
    if (!requestActionReview) { persist(true); return; }
    requestActionReview({
      title: 'Publish walkthrough evidence to ' + (teacher ? teacher.name : 'the educator') + '?',
      description: 'Review the exact evidence and interpretation that will become visible and append-only in the educator record.',
      facts: [['Educator', teacher ? teacher.name + ' · ' + teacher.code : draft.teacherId], ['Visit', aeDate(draft.date) + ' · ' + draft.durationMin + ' minutes · ' + draft.lessonPhase.replace(/_/g, ' ')], ['Direct evidence', draft.evidence], ['Interpretation', draft.interpretation || 'None'], ['Visibility', 'Published to the educator and eligible for annual evidence provenance']],
      warning: 'After publication, correct context with an appended comment; the evidence snapshot itself cannot be rewritten.',
      acknowledgement: 'I removed student-identifying information and reviewed the exact snapshot that will be published.',
      confirmLabel: 'Confirm publication',
      onConfirm: () => persist(true),
    });
  };
  return <section className="ae-card" style={{ marginBottom: 16 }}><h3>{editingRecord ? 'Edit private walkthrough draft' : t("educator_evaluation.new_walkthrough_evidence_1q2lsy4", "New walkthrough evidence")}</h3><p className="ae-sub">{t("educator_evaluation.keep_witnessed_evidence_separate_from_interpretation_or_fe_a6e0j0", "Keep witnessed evidence separate from interpretation or feedback.")}</p><div className="ae-form-grid" style={{ marginTop: 12 }}>
      <label className="ae-field"><span>{t("educator_evaluation.educator_8c1rq4", "Educator")}</span><select className="ae-select" value={draft.teacherId} onChange={(event) => setDraft(Object.assign({}, draft, { teacherId: event.target.value }))}><option value="">{t("educator_evaluation.choose_w4fyow", "Choose")}</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select>{canAddStaff && typeof addTeacher === 'function' && !quickAdd && <button type="button" className="ae-btn ae-btn-quiet" style={{ marginTop: 6, alignSelf: 'flex-start' }} onClick={() => setQuickAdd(true)}>{t("educator_evaluation.new_educator_quick_add_20260823", "+ New educator")}</button>}</label>
      {quickAdd && canAddStaff && typeof addTeacher === 'function' && <div className="ae-field ae-field-wide"><span>{t("educator_evaluation.quick_add_educator_20260823", "Quick-add educator")}</span><div className="ae-actions" style={{ alignItems: 'flex-end', marginTop: 6 }}><label className="ae-field" style={{ margin: 0 }}><span>{t("educator_evaluation.name_4el6o6", "Name")}</span><input className="ae-input" value={quickName} onChange={(event) => setQuickName(event.target.value)}/></label><label className="ae-field" style={{ margin: 0 }}><span>{t("educator_evaluation.unique_staff_code_1e9a9q5", "Unique staff code")}</span><input className="ae-input" value={quickCode} onChange={(event) => setQuickCode(event.target.value)}/></label><button type="button" className="ae-btn ae-btn-primary" disabled={!quickName.trim() || !quickCode.trim()} onClick={saveQuickAdd}>{t("educator_evaluation.add_and_select_20260823", "Add and select")}</button><button type="button" className="ae-btn" onClick={() => { setQuickAdd(false); setQuickName(''); setQuickCode(''); }}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button></div><span className="ae-help">{t("educator_evaluation.quick_add_finish_in_staff_20260823", "Adds the educator to Staff with default settings selected; finish the assignment details there later.")}</span></div>}
      <label className="ae-field"><span>{t("educator_evaluation.date_ggjuyh", "Date")}</span><input className="ae-input" type="date" value={draft.date} onChange={(event) => setDraft(Object.assign({}, draft, { date: event.target.value }))}/></label>
      <label className="ae-field"><span>{t("educator_evaluation.announced_3rxthr", "Announced?")}</span><select className="ae-select" value={draft.announced} onChange={(event) => setDraft(Object.assign({}, draft, { announced: event.target.value }))}><option value="unannounced">{t("educator_evaluation.unannounced_16wgx7b", "Unannounced")}</option><option value="announced">{t("educator_evaluation.announced_1wakucq", "Announced")}</option></select></label>
      <label className="ae-field"><span>{t("educator_evaluation.duration_minutes_1ionhwt", "Duration (minutes)")}</span><input className="ae-input" type="number" min="1" max="180" value={draft.durationMin} onChange={(event) => setDraft(Object.assign({}, draft, { durationMin: event.target.value }))}/></label>
      <label className="ae-field"><span>{t("educator_evaluation.lesson_phase_u303j2", "Lesson phase")}</span><select className="ae-select" value={draft.lessonPhase} onChange={(event) => setDraft(Object.assign({}, draft, { lessonPhase: event.target.value }))}><option value="opening">{t("educator_evaluation.opening_dfet3", "Opening")}</option><option value="middle">{t("educator_evaluation.middle_of_lesson_dw8wmv", "Middle of lesson")}</option><option value="guided_practice">{t("educator_evaluation.guided_practice_1ktqe32", "Guided practice")}</option><option value="independent_practice">{t("educator_evaluation.independent_practice_xnmxd2", "Independent practice")}</option><option value="closure">{t("educator_evaluation.closure_13sol0i", "Closure")}</option></select></label>
      <label className="ae-field"><span>{t("educator_evaluation.course_subject_1qvf7p9", "Course / subject")}</span><input className="ae-input" value={draft.subject} onChange={(event) => setDraft(Object.assign({}, draft, { subject: event.target.value }))}/></label>
    </div><label className="ae-field"><span>{t("educator_evaluation.directly_witnessed_evidence_3xyvim", "Directly witnessed evidence")}</span><textarea className="ae-textarea" value={draft.evidence} onChange={(event) => setDraft(Object.assign({}, draft, { evidence: event.target.value }))} placeholder={t("educator_evaluation.at_10_14_the_teacher_asked_six_students_the_posted_objecti_1ae0aom", "At 10:14, the teacher asked… Six students… The posted objective read…")}/><span className="ae-help">{t("educator_evaluation.record_observable_words_actions_artifacts_and_student_resp_u6okpa", "Record observable words, actions, artifacts, and student responses. Avoid student names.")}</span><span className="ae-help">{t("educator_evaluation.evidence_that_stems_from_a_parent_student_or_other_complai_eq7k2h", "Evidence that stems from a parent, student, or other complaint generally must be put in writing and promptly disclosed to the educator (e.g., PEA Article 16.B), note the complaint origin here.")}</span></label>
    <label className="ae-field"><span>{t("educator_evaluation.interpretation_feedback_separate_gnko5f", "Interpretation / feedback (separate)")}</span><textarea className="ae-textarea" value={draft.interpretation} onChange={(event) => setDraft(Object.assign({}, draft, { interpretation: event.target.value }))} placeholder={t("educator_evaluation.possible_strength_question_or_area_for_discussion_o2yuye", "Possible strength, question, or area for discussion…")}/></label>
    <AeComponentChecks selected={draft.componentTags} onChange={(componentTags) => setDraft(Object.assign({}, draft, { componentTags }))}/>
    <label className="ae-check"><input type="checkbox" checked={draft.privacyChecked} onChange={(event) => setDraft(Object.assign({}, draft, { privacyChecked: event.target.checked }))}/><span>{t("educator_evaluation.i_reviewed_these_notes_and_removed_student_identifying_inf_19fa1eo", "I reviewed these notes and removed student-identifying information.")}</span></label>
    <div className="ae-actions"><button type="button" className="ae-btn" disabled={!draft.teacherId || !draft.evidence.trim()} onClick={() => submit(false)}>{editingRecord ? 'Save draft changes' : t("educator_evaluation.save_private_draft_19fsvdc", "Save private draft")}</button>{!editingRecord && <button type="button" className="ae-btn ae-btn-primary" disabled={!draft.teacherId || !draft.evidence.trim() || !draft.privacyChecked} onClick={() => submit(true)}>{t("educator_evaluation.publish_to_teacher_3pztvz", "Review & publish to teacher")}</button>}</div>
    </section>;
}

function AeWalkthroughs({ workspace, selectedTeacher, setSelectedTeacherId, role, createWalkthrough, updateWalkthroughDraft, discardWalkthroughDraft, publishWalkthrough, addComment, acknowledgeWalkthrough, requestActionReview, addTeacher = null, canAddStaff = false, isRemote = false, readOnlyPreview = false }) {
  const teachers = workspace.teachers.filter((teacher) => teacher.active !== false && !aeCycleFinalized(teacher));
  const cycleFinalized = aeCycleFinalized(selectedTeacher);
  const [showForm, setShowForm] = React.useState(false);
  const [openId, setOpenId] = React.useState('');
  const [editingRecord, setEditingRecord] = React.useState(null);
  const [draftReleaseChecked, setDraftReleaseChecked] = React.useState(false);
  const records = workspace.walkthroughs.filter((record) => role !== 'teacher' || (selectedTeacher && record.teacherId === selectedTeacher.id && !!record.publishedAt)).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const startOrClose = () => { setEditingRecord(null); setShowForm((value) => !value); };
  React.useEffect(() => { if (cycleFinalized && showForm) { setShowForm(false); setEditingRecord(null); } }, [cycleFinalized, showForm]);
  return <div className="ae-page"><div className="ae-heading"><div><h2>{t("educator_evaluation.walkthrough_observations_ekug5k", "Walkthrough observations")}</h2><p>{t("educator_evaluation.a_middle_of_lesson_visit_captures_factual_evidence_it_does_qtq6s8", "A middle-of-lesson visit captures factual evidence. It does not replace a comprehensive observation or auto-score a rubric.")}</p></div>{role === 'evaluator' && <button type="button" className="ae-btn ae-btn-primary" disabled={cycleFinalized || (teachers.length === 0 && !canAddStaff)} title={cycleFinalized ? t("educator_evaluation.finalized_cycle_no_new_walkthrough_20260826", 'Annual rollover is required before starting another walkthrough for this educator.') : undefined} onClick={startOrClose}>{showForm ? t("educator_evaluation.close_draft_107v6z4", 'Close draft') : (aeHasWalkthroughDraft() ? t("educator_evaluation.resume_walkthrough_draft_1q8sho7", 'Resume walkthrough draft') : t("educator_evaluation.start_walkthrough_11gr9kg", '+ Start walkthrough'))}</button>}</div>
    <AeFinalizedCycleNotice teacher={selectedTeacher}/>
    {role === 'teacher' && <div className="ae-note"><strong>{selectedTeacher ? selectedTeacher.name : t("educator_evaluation.educator_record_mmlsdd", 'Educator record')}</strong> · {isRemote ? t("educator_evaluation.only_records_assigned_to_this_district_account_are_shown_p_qbheaj", 'Only records assigned to this district account are shown; private evaluator drafts remain hidden.') : t("educator_evaluation.teacher_view_shows_only_the_selected_educator_s_published__cddf6p", 'Teacher view shows only the selected educator’s published records. Role switching previews this perspective on the same device; it is not a sign-in.')}</div>}
    {showForm && role === 'evaluator' && !cycleFinalized && <AeWalkthroughForm teachers={teachers} selectedTeacherId={selectedTeacher ? selectedTeacher.id : ''} createWalkthrough={createWalkthrough} editingRecord={editingRecord} updateWalkthroughDraft={updateWalkthroughDraft} requestActionReview={requestActionReview} addTeacher={addTeacher} canAddStaff={canAddStaff} onCreated={(id) => { setOpenId(id); setEditingRecord(null); setShowForm(false); }}/>}
    {role === 'evaluator' && !showForm && openId && (() => { const draftRecord = records.find((item) => item.id === openId && !item.publishedAt); if (!draftRecord || aeCycleFinalized(workspace.teachers.find((item) => item.id === draftRecord.teacherId))) return null; return <div className="ae-note ae-warn" style={{ marginBottom: 12 }}><strong>Private draft controls</strong><p className="ae-help">Correct the saved note before publication, or discard it if it should not be retained.</p><div className="ae-actions"><button type="button" className="ae-btn" onClick={() => { setEditingRecord(draftRecord); setShowForm(true); }}>Edit draft</button><button type="button" className="ae-btn ae-btn-danger" onClick={() => discardWalkthroughDraft(draftRecord.id, () => setOpenId(''))}>Discard draft</button></div></div>; })()}
    <div className="ae-grid"><section className="ae-card ae-span-5"><h3>{t("educator_evaluation.visit_records_bic8za", "Visit records")}</h3>{records.length === 0 ? <div className="ae-empty">{t("educator_evaluation.no_walkthroughs_yet_1evk53z", "No walkthroughs yet.")}</div> : records.map((record) => { const teacher = workspace.teachers.find((item) => item.id === record.teacherId); return <button type="button" key={record.id} className="ae-record" style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setOpenId(record.id); setSelectedTeacherId(record.teacherId); }}><div className="ae-record-head"><div><h4>{teacher ? teacher.name : t("educator_evaluation.unknown_educator_3f7jiu", 'Unknown educator')}</h4><div className="ae-meta"><span>{aeDate(record.date)}</span><span>{record.durationMin} min</span><span>{record.announced}</span></div></div><span className={'ae-chip ' + (record.publishedAt ? 'ae-chip-good' : 'ae-chip-neutral')}>{record.publishedAt ? t("educator_evaluation.published_75k7c9", 'Published') : t("educator_evaluation.private_draft_11oqeav", 'Private draft')}</span></div><p className="ae-sub" style={{ marginTop: 8 }}>{record.evidence.slice(0, 120)}{record.evidence.length > 120 ? '…' : ''}</p></button>; })}</section>
      <section className="ae-card ae-span-7"><h3>{t("educator_evaluation.walkthrough_detail_o8078q", "Walkthrough detail")}</h3>{!openId ? <div className="ae-empty">{t("educator_evaluation.choose_a_visit_to_review_evidence_and_conversation_1vps0ym", "Choose a visit to review evidence and conversation.")}</div> : (() => { const record = records.find((item) => item.id === openId); if (!record) return <div className="ae-empty">{t("educator_evaluation.record_not_found_a5oa6l", "Record not found.")}</div>; const teacher = workspace.teachers.find((item) => item.id === record.teacherId); return <><div className="ae-record-head"><div><h4>{teacher ? teacher.name : t("educator_evaluation.unknown_educator_3f7jiu", 'Unknown educator')} · {aeDate(record.date)}</h4><div className="ae-meta"><span>{t("educator_evaluation.started_163dnb2", "Started")} {aeDateTime(record.startedAt)}</span><span>{record.durationMin} minutes</span><span>{record.lessonPhase.replace(/_/g, ' ')}</span></div></div><span className={'ae-chip ' + (record.publishedAt ? 'ae-chip-good' : ((Date.now() - new Date(record.startedAt).getTime()) > 14 * 86400000 ? 'ae-chip-amber' : 'ae-chip-neutral'))}>{record.publishedAt ? t("educator_evaluation.published_snapshot_1an1wnv", 'Published snapshot') : ((Date.now() - new Date(record.startedAt).getTime()) > 14 * 86400000 ? t("educator_evaluation.private_draft_1un9trq", 'Private draft · ') + Math.floor((Date.now() - new Date(record.startedAt).getTime()) / 86400000) + t("educator_evaluation.days_unpublished_1xvkbxt", ' days unpublished') : t("educator_evaluation.private_evaluator_draft_em0xyi", 'Private evaluator draft'))}</span></div><h4>{t("educator_evaluation.directly_witnessed_evidence_3xyvim", "Directly witnessed evidence")}</h4><div className="ae-evidence">{record.evidence}</div>{record.interpretation && <><h4>{t("educator_evaluation.interpretation_feedback_c0i2id", "Interpretation / feedback")}</h4><div className="ae-evidence ae-interpretation">{record.interpretation}</div></>}<div className="ae-chips">{record.componentTags.map((code) => <span className="ae-chip ae-chip-blue" key={code}>{code}</span>)}</div>{!record.publishedAt && role === 'evaluator' && !aeCycleFinalized(teacher) && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><label className="ae-check"><input type="checkbox" checked={draftReleaseChecked} onChange={(event) => setDraftReleaseChecked(event.target.checked)}/><span>{t("educator_evaluation.i_reviewed_this_saved_draft_and_removed_student_identifyin_x8dx3g", "I reviewed this saved draft and removed student-identifying information.")}</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!draftReleaseChecked} onClick={() => { publishWalkthrough(record.id); setDraftReleaseChecked(false); }}>{t("educator_evaluation.publish_saved_draft_to_teacher_4k4347", "Publish saved draft to teacher")}</button><p className="ae-help">{t("educator_evaluation.unpublished_drafts_never_enter_the_educator_s_record_docum_1gj0to6", "Unpublished drafts never enter the educator’s record, documents, or trends, but they also sit outside the educator’s review rights. Publish promptly, or clear notes you do not intend to publish.")}</p></div>}{record.publishedAt && role === 'teacher' && !record.teacherAcknowledgedAt && <div style={{ marginTop: 12 }}><button type="button" className="ae-btn ae-btn-primary" disabled={readOnlyPreview || aeCycleFinalized(teacher)} title={(readOnlyPreview || aeCycleFinalized(teacher)) ? t("educator_evaluation.preview_only_no_acknowledgment_is_recorded_1801uuq", 'Preview only; no acknowledgment is recorded.') : undefined} onClick={() => acknowledgeWalkthrough(record.id)}>{t("educator_evaluation.acknowledge_receipt_1erqgfr", "Acknowledge receipt")}</button><p className="ae-help">{t("educator_evaluation.acknowledgment_records_receipt_not_agreement_and_is_not_th_vqhr36", "Acknowledgment records receipt, not agreement, and is not the signature your district’s evaluation form asks for at the conference.")}</p></div>}{record.teacherAcknowledgedAt && <div className="ae-note ae-ok" style={{ marginTop: 12 }}>{t("educator_evaluation.teacher_acknowledged_receipt_tzqdjf", "Teacher acknowledged receipt")} {aeDateTime(record.teacherAcknowledgedAt)}.</div>}{record.publishedAt && <AeThread workspace={workspace} recordType="walkthrough" recordId={record.id} teacherId={record.teacherId} role={role} onAdd={addComment} readOnlyPreview={readOnlyPreview}/>}</>; })()}</section>
    </div>
  </div>;
}

function AeObservationStepper({ observation }) {
  const step = aeStepOfObservation(observation);
  return <ol className="ae-stepper" tabIndex={0} aria-label={t("educator_evaluation.formal_observation_progress_step_hlfrkj", 'Formal observation progress: step ') + (step + 1) + t("educator_evaluation.of_10_1tvy5tj", ' of 10, ') + aeObservationStepLabel(step)}>{AE_OBS_STEPS.map((label, index) => <li key={label} className={'ae-step ' + (index < step ? 'ae-step-done' : '') + (index === step ? ' ae-step-current' : '')} aria-current={index === step ? 'step' : undefined}>{aeObservationStepLabel(index)}</li>)}</ol>;
}

function AeFictionalRehearsalCoach({ observation, role, setRole, setTab }) {
  const step = aeStepOfObservation(observation);
  const guidance = aeRehearsalGuidance(step);
  const requiredRole = guidance.owner;
  const needsRoleChange = role !== requiredRole;
  const finishedFormal = step === 9;
  const roleLabel = requiredRole === 'teacher' ? t("educator_evaluation.fictional_educator_2qs1sj", 'Fictional educator') : t("educator_evaluation.evaluator_125q2ii", 'Evaluator');
  const continueAsOwner = () => {
    setRole(requiredRole);
    if (finishedFormal) setTab('overview');
  };
  return <section className="ae-card" style={{ marginTop: 16 }} aria-labelledby="ae-rehearsal-coach-title">
    <div className="ae-record-head"><div><h3 id="ae-rehearsal-coach-title">{t("educator_evaluation.full_cycle_rehearsal_coach_2tkku2", "Full-cycle rehearsal coach")}</h3><p className="ae-sub">{t("educator_evaluation.practice_only_the_coach_changes_perspective_only_inside_th_139y0xj", "Practice only. The coach changes perspective only inside this simulated workspace.")}</p></div><span className="ae-chip ae-chip-purple">{t("educator_evaluation.next_owner_gtinkf", "Next owner:")} {roleLabel}</span></div>
    <div className="ae-note" style={{ marginTop: 10 }}><strong>{guidance.title}</strong><br/>{guidance.text}</div>
    {finishedFormal ? <div className="ae-actions" style={{ marginTop: 10 }}><button type="button" className="ae-btn ae-btn-primary" onClick={continueAsOwner}>{t("educator_evaluation.continue_to_annual_rating_preview_1w97cjp", "Continue to annual rating preview")}</button></div>
      : (needsRoleChange ? <div className="ae-actions" style={{ marginTop: 10 }}><button type="button" className="ae-btn ae-btn-primary" onClick={continueAsOwner}>{t("educator_evaluation.continue_as_k6ga24", "Continue as")} {roleLabel}</button><span className="ae-help">{t("educator_evaluation.the_form_below_is_intentionally_unavailable_until_you_use__1ud078h", "The form below is intentionally unavailable until you use the role that owns this fictional step.")}</span></div>
        : <p className="ae-help" style={{ marginBottom: 0 }}>{t("educator_evaluation.you_are_in_the_correct_fictional_role_complete_the_current_9o8i3a", "You are in the correct fictional role. Complete the current workflow step below; the coach will update automatically.")}</p>)}
  </section>;
}

function AeFormalRecordSummary({ observation, role }) {
  const prework = observation.prework || {};
  const Item = ({ label, value }) => value ? <div style={{ marginTop: 10 }}><strong>{label}</strong><div className="ae-evidence">{value}</div></div> : null;
  const canSeePrework = role === 'teacher' || !!observation.preworkSubmittedAt;
  const canSeeEvidence = role === 'evaluator' || !!observation.evidencePublishedAt;
  const canSeeReflection = role === 'teacher' || !!observation.reflectionSubmittedAt;
  const canSeeConference = role === 'evaluator' || !!observation.postConferenceAt;
  return <div className="ae-card" style={{ marginTop: 16 }}><h3>{t("educator_evaluation.persistent_record_summary_rwnsvt", "Persistent record summary")}</h3><p className="ae-sub">{t("educator_evaluation.submitted_material_remains_visible_after_the_workflow_adva_ji4czg", "Submitted material remains visible after the workflow advances; unsubmitted teacher drafts stay private.")}</p>
    {canSeePrework ? <details className="ae-domain" open><summary>{t("educator_evaluation.pre_observation_materials_l7egaz", "Pre-observation materials")}</summary><div className="ae-domain-body"><Item label={t("educator_evaluation.lesson_unit_plan_1tio50t", "Lesson / unit plan")} value={prework.plan}/><Item label={t("educator_evaluation.expected_outcomes_1kgk87i", "Expected outcomes")} value={prework.outcomes}/><Item label={t("educator_evaluation.resources_and_planned_supports_1esd7w3", "Resources and planned supports")} value={prework.resources}/><Item label={t("educator_evaluation.assessment_evidence_of_learning_1n8hxiu", "Assessment / evidence of learning")} value={prework.assessment}/><Item label={t("educator_evaluation.secure_artifact_references_1oxmlog", "Secure artifact references")} value={prework.artifactReferences}/></div></details> : <div className="ae-note">{t("educator_evaluation.pre_observation_materials_have_not_been_submitted_u44zqt", "Pre-observation materials have not been submitted.")}</div>}
    {canSeeEvidence && <Item label={t("educator_evaluation.published_observation_evidence_1prec80", "Published observation evidence")} value={observation.evidence}/>}
    {canSeeReflection && <Item label={t("educator_evaluation.teacher_reflection_2fxaai", "Teacher reflection")} value={observation.reflection}/>}
    {canSeeConference && <Item label="Post-conference discussion and follow-up" value={observation.postConferenceNotes}/>}
    <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.references_only_in_every_workspace_path_1bm6lfj", "References only in every workspace path.")}</strong><br/>{t("educator_evaluation.file_upload_file_versioning_and_artifact_retention_are_not_1101s6u", "File upload, file versioning, and artifact retention are not implemented, including in the district portal. Keep artifacts in the district-approved repository and enter only access-controlled references without student-identifying text.")}</div>
  </div>;
}
function AeFormalObservations({ workspace, selectedTeacher, setSelectedTeacherId, role, setRole, setTab, createObservation, updateObservation, updateTeacher, addComment, readOnlyPreview = false, fictionalRehearsal = false }) {
  const [openId, setOpenId] = React.useState('');
  const teachers = workspace.teachers.filter((teacher) => teacher.active !== false);
  const cycleFinalized = aeCycleFinalized(selectedTeacher);
  const records = workspace.observations.filter((record) => role !== 'teacher' || (selectedTeacher && record.teacherId === selectedTeacher.id));
  const observationTime = (record) => Date.parse(record.finalizedAt || record.observedAt || record.createdAt || '') || 0;
  const recordsFor = (teacherId) => records.filter((record) => record.teacherId === teacherId).slice().sort((left, right) => observationTime(right) - observationTime(left) || right.id.localeCompare(left.id));
  const teacherRecords = selectedTeacher ? recordsFor(selectedTeacher.id) : [];
  const active = teacherRecords.find((record) => record.id === openId) || teacherRecords[0] || null;
  const teacherRecordKey = teacherRecords.map((record) => record.id).join('|');
  React.useEffect(() => {
    const nextId = teacherRecords.some((record) => record.id === openId) ? openId : ((teacherRecords[0] && teacherRecords[0].id) || '');
    if (nextId !== openId) setOpenId(nextId);
  }, [selectedTeacher && selectedTeacher.id, teacherRecordKey, openId]);
  const observationLabel = (record) => {
    const date = aeDate(record.observedAt || record.finalizedAt || record.createdAt);
    return date + ' · ' + (record.finalizedAt ? t("educator_evaluation.finalized_4cmc2p", 'Finalized') : (t("educator_evaluation.step_jtn9kf", 'Step ') + (aeStepOfObservation(record) + 1) + t("educator_evaluation.of_10_1af6cv5", ' of 10')));
  };
  const requestActionReview = aeUseActionReview();
  const performPatch = (changes, event, summary) => {
    if (cycleFinalized) return;
    updateObservation(active.id, changes, event, summary);
  };
  const patch = (changes, event, summary) => {
    const milestone = {
      EVIDENCE_PUBLISHED: { title: 'Publish formal-observation evidence?', description: 'The factual evidence and component tags will become visible to the educator and the evidence snapshot will lock.', confirmLabel: 'Publish formal evidence', warning: 'Remove student-identifying information before publication; later context belongs in appended comments.' },
      SIGNED: { title: 'Sign the evaluator assessment?', description: 'The four human-selected ratings and written rationales will become the signed educator-visible assessment.', confirmLabel: 'Sign assessment', warning: 'Review every rating and rationale. The educator will be asked to acknowledge receipt, not agreement.' },
      FINALIZED: { title: 'Finalize this formal observation?', description: 'The acknowledged formal-observation workflow will lock as a finalized record.', confirmLabel: 'Finalize observation', warning: 'After finalization, use appended comments or a new record for later context.' },
    }[event];
    if (!milestone || !requestActionReview) { performPatch(changes, event, summary); return; }
    const teacher = workspace.teachers.find((item) => item.id === active.teacherId);
    requestActionReview(Object.assign({}, milestone, {
      facts: [['Educator', teacher ? teacher.name + ' · ' + teacher.code : active.teacherId], ['Formal record', active.id], ['Workflow milestone', summary], ['Current step', (aeStepOfObservation(active) + 1) + ' of 10']],
      acknowledgement: 'I reviewed the educator, record content, visibility, and lock effect for this milestone.',
      onConfirm: () => performPatch(changes, event, summary),
    }));
  };
  return <div className="ae-page"><div className="ae-heading"><div><h2>{t("educator_evaluation.formal_comprehensive_observations_huzqzp", "Formal comprehensive observations")}</h2><p>{t("educator_evaluation.prework_conferences_observed_evidence_reflection_human_rat_1qxb7wr", "Prework, conferences, observed evidence, reflection, human ratings, acknowledgment, and finalization remain distinct.")}</p></div>{role === 'evaluator' && <button type="button" className="ae-btn ae-btn-primary" disabled={!selectedTeacher || cycleFinalized || records.some((record) => record.teacherId === selectedTeacher.id && !record.finalizedAt)} title={cycleFinalized ? t("educator_evaluation.finalized_cycle_no_new_formal_20260826", 'Annual rollover is required before assigning another formal observation for this educator.') : undefined} onClick={() => setOpenId(createObservation(selectedTeacher.id))}>{t("educator_evaluation.assign_formal_observation_1cwk6vs", "+ Assign formal observation")}</button>}</div>
    <AeFinalizedCycleNotice teacher={selectedTeacher}/>
    {role === 'evaluator' ? <div className="ae-toolbar"><label className="ae-field" style={{ minWidth: 260, margin: 0 }}><span>{t("educator_evaluation.educator_8c1rq4", "Educator")}</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => { const teacherId = event.target.value; setSelectedTeacherId(teacherId); const found = recordsFor(teacherId)[0]; setOpenId(found ? found.id : ''); }}><option value="">{t("educator_evaluation.choose_an_educator_1l6d6bg", "Choose an educator")}</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label>{selectedTeacher && teacherRecords.length > 0 && <label className="ae-field" style={{ minWidth: 280, margin: 0 }}><span>{t("educator_evaluation.observation_record_ihk066", "Observation record")}</span><select className="ae-select" value={active ? active.id : ''} onChange={(event) => setOpenId(event.target.value)}>{teacherRecords.map((record) => <option key={record.id} value={record.id}>{observationLabel(record)}</option>)}</select></label>}</div> : selectedTeacher && <div className="ae-toolbar"><div className="ae-note">{t("educator_evaluation.viewing_records_for_1hjcyfh", "Viewing records for")} {selectedTeacher.name} · {selectedTeacher.code}</div>{teacherRecords.length > 0 && <label className="ae-field" style={{ minWidth: 280, margin: 0 }}><span>{t("educator_evaluation.observation_record_ihk066", "Observation record")}</span><select className="ae-select" value={active ? active.id : ''} onChange={(event) => setOpenId(event.target.value)}>{teacherRecords.map((record) => <option key={record.id} value={record.id}>{observationLabel(record)}</option>)}</select></label>}</div>}
    {!active ? <div className="ae-card ae-empty">{selectedTeacher ? t("educator_evaluation.no_formal_observation_has_been_assigned_for_this_educator_1c5ay0f", 'No formal observation has been assigned for this educator.') : t("educator_evaluation.choose_an_educator_to_begin_151xqgy", 'Choose an educator to begin.')}</div> : (() => {
      const teacher = workspace.teachers.find((item) => item.id === active.teacherId);
      const step = aeStepOfObservation(active);
      return <><section className="ae-card"><div className="ae-record-head"><div><h3>{teacher ? teacher.name : t("educator_evaluation.educator_8c1rq4", 'Educator')} {t("educator_evaluation.formal_observation_uhv817", "· Formal observation")}</h3><p className="ae-sub">{t("educator_evaluation.assigned_c1fxel", "Assigned")} {aeDateTime(active.createdAt)} {t("educator_evaluation.framework_snapshot_6ec0x2", "· Framework snapshot")} {active.frameworkVersion}</p></div><span className="ae-chip ae-chip-blue">{t("educator_evaluation.step_jtn9kf", "Step")} {step + 1} {t("educator_evaluation.of_10_1af6cv5", "of 10")}</span></div><AeObservationStepper observation={active}/></section>
      {fictionalRehearsal && <AeFictionalRehearsalCoach observation={active} role={role} setRole={setRole} setTab={setTab}/>}
      <div className="ae-grid" style={{ marginTop: 16 }}>
        <section className="ae-card ae-span-7"><h3>{t("educator_evaluation.current_workflow_step_2r1qw7", "Current workflow step")}</h3><fieldset disabled={cycleFinalized} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          {step === 0 && role === 'teacher' && <fieldset disabled={readOnlyPreview} style={{ border: 0, padding: 0, margin: 0 }}><div className="ae-note">{t("educator_evaluation.submit_your_lesson_or_unit_plan_and_expected_learning_outc_1r54d0k", "Submit your lesson or unit plan and expected learning outcomes before the pre-conference.")}</div><label className="ae-field"><span>{t("educator_evaluation.lesson_unit_plan_summary_1cxc3ip", "Lesson / unit plan summary")}</span><textarea className="ae-textarea" value={(active.prework && active.prework.plan) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { plan: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>{t("educator_evaluation.expected_student_learning_outcomes_hczwil", "Expected student learning outcomes")}</span><textarea className="ae-textarea" value={(active.prework && active.prework.outcomes) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { outcomes: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>{t("educator_evaluation.resources_and_planned_supports_1esd7w3", "Resources and planned supports")}</span><textarea className="ae-textarea" value={(active.prework && active.prework.resources) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { resources: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>{t("educator_evaluation.assessment_evidence_of_learning_1n8hxiu", "Assessment / evidence of learning")}</span><textarea className="ae-textarea" value={(active.prework && active.prework.assessment) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { assessment: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>{t("educator_evaluation.secure_artifact_references_links_r29bvc", "Secure artifact references / links")}</span><textarea className="ae-textarea" value={(active.prework && active.prework.artifactReferences) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { artifactReferences: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')} placeholder={t("educator_evaluation.district_drive_document_id_or_approved_secure_link_no_stud_axga8u", "District Drive document ID or approved secure link, no student names")}/><span className="ae-help">{t("educator_evaluation.file_uploads_are_intentionally_unavailable_in_this_workspa_dtsv8m", "File uploads are intentionally unavailable in this workspace; use only district-approved secure references.")}</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.prework || !active.prework.plan || !active.prework.outcomes} onClick={() => patch({ preworkSubmittedAt: aeNow() }, 'SUBMITTED', 'Pre-observation materials submitted')}>{t("educator_evaluation.submit_pre_observation_materials_14etd95", "Submit pre-observation materials")}</button></fieldset>}
          {step === 0 && role === 'evaluator' && <div className="ae-empty">{workspace.config.sampleMode ? t("educator_evaluation.use_the_rehearsal_coach_to_continue_as_the_fictional_educa_idfw9r", 'Use the rehearsal coach to continue as the fictional educator and submit practice prework.') : t("educator_evaluation.waiting_for_educator_pre_observation_materials_educator_pr_pqg4hy", 'Waiting for educator pre-observation materials. Educator preview is read-only; use an educator response packet or the authenticated district portal for educator-owned input.')}</div>}
          {step === 1 && <div><h4>{t("educator_evaluation.teacher_submission_rcqour", "Teacher submission")}</h4><div className="ae-evidence">{active.prework && active.prework.plan}</div><h4>{t("educator_evaluation.expected_outcomes_1kgk87i", "Expected outcomes")}</h4><div className="ae-evidence">{active.prework && active.prework.outcomes}</div>{role === 'evaluator' ? <><label className="ae-field"><span>{t("educator_evaluation.pre_conference_notes_4ok7ju", "Pre-conference notes")}</span><textarea className="ae-textarea" value={active.preConferenceNotes || ''} onChange={(event) => patch({ preConferenceNotes: event.target.value }, 'DRAFT_SAVED', 'Pre-conference notes updated')}/></label><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ preConferenceAt: aeNow() }, 'CONFERENCED', 'Pre-conference completed')}>{t("educator_evaluation.mark_pre_conference_complete_fvan99", "Mark pre-conference complete")}</button></> : <div className="ae-note">{t("educator_evaluation.submitted_12at4de", "Submitted")} {aeDateTime(active.preworkSubmittedAt)}. Awaiting evaluator pre-conference.</div>}</div>}
          {step === 2 && role === 'evaluator' && <div><label className="ae-field"><span>{t("educator_evaluation.observation_date_and_time_1jl9vdb", "Observation date and time")}</span><input className="ae-input" type="datetime-local" value={active.observedLocal || ''} onChange={(event) => patch({ observedLocal: event.target.value }, 'DRAFT_SAVED', 'Observation schedule updated')}/></label><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ observedAt: active.observedLocal ? new Date(active.observedLocal).toISOString() : aeNow() }, 'OBSERVATION_STARTED', 'Formal observation started')}>{t("educator_evaluation.start_observation_1bmeso5", "Start observation")}</button></div>}
          {step === 2 && role === 'teacher' && <div className="ae-note">{t("educator_evaluation.pre_conference_completed_xctf5u", "Pre-conference completed")} {aeDateTime(active.preConferenceAt)}. The evaluator will record observed evidence.</div>}
          {step === 3 && role === 'evaluator' && <div><label className="ae-field"><span>{t("educator_evaluation.time_stamped_factual_evidence_1ts5zos", "Time-stamped factual evidence")}</span><textarea className="ae-textarea" style={{ minHeight: 180 }} value={active.evidence || ''} onChange={(event) => patch({ evidence: event.target.value }, 'DRAFT_SAVED', 'Observation evidence draft saved')} placeholder={t("educator_evaluation.10_04_posted_learning_outcome_n10_11_students_discussed_14o8euh", "10:04, Posted learning outcome…\n10:11, Students discussed…")}/><span className="ae-help">{t("educator_evaluation.evidence_that_stems_from_a_parent_student_or_other_complai_eq7k2h", "Evidence that stems from a parent, student, or other complaint generally must be put in writing and promptly disclosed to the educator (e.g., PEA Article 16.B), note the complaint origin here.")}</span></label><AeComponentChecks selected={active.componentTags || []} onChange={(componentTags) => patch({ componentTags }, 'DRAFT_SAVED', 'Evidence tags updated')}/><label className="ae-check"><input type="checkbox" checked={!!active.privacyChecked} onChange={(event) => patch({ privacyChecked: event.target.checked }, 'DRAFT_SAVED', 'Privacy review updated')}/><span>{t("educator_evaluation.i_reviewed_the_evidence_and_removed_student_identifying_in_gtgp7w", "I reviewed the evidence and removed student-identifying information.")}</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.evidence || !active.privacyChecked} onClick={() => patch({ evidencePublishedAt: aeNow() }, 'EVIDENCE_PUBLISHED', 'Formal observation evidence published')}>{t("educator_evaluation.publish_evidence_to_teacher_nqjc7s", "Publish evidence to teacher")}</button></div>}
          {step === 3 && role === 'teacher' && <div className="ae-note">{t("educator_evaluation.formal_observation_is_in_progress_evidence_remains_private_hiqcb7", "Formal observation is in progress. Evidence remains private until the evaluator publishes it.")}</div>}
          {step === 4 && <div><h4>{t("educator_evaluation.published_evidence_117j0fq", "Published evidence")}</h4><div className="ae-evidence">{active.evidence}</div><div className="ae-chips">{(active.componentTags || []).map((code) => <span className="ae-chip ae-chip-blue" key={code}>{code}</span>)}</div>{role === 'teacher' ? <fieldset disabled={readOnlyPreview} style={{ border: 0, padding: 0, margin: 0 }}><label className="ae-field"><span>{t("educator_evaluation.reflection_self_assessment_xobnpm", "Reflection / self-assessment")}</span><textarea className="ae-textarea" value={active.reflection || ''} onChange={(event) => patch({ reflection: event.target.value }, 'DRAFT_SAVED', 'Teacher reflection draft saved')} placeholder={t("educator_evaluation.what_worked_what_evidence_supports_that_and_what_would_you_pawfkv", "What worked, what evidence supports that, and what would you change?")}/></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.reflection} onClick={() => patch({ reflectionSubmittedAt: aeNow() }, 'SUBMITTED', 'Teacher reflection submitted')}>{t("educator_evaluation.submit_reflection_qe4w7e", "Submit reflection")}</button></fieldset> : <div className="ae-note">{t("educator_evaluation.awaiting_teacher_reflection_the_evidence_snapshot_remains__u9iyn1", "Awaiting teacher reflection. The evidence snapshot remains immutable; clarification belongs in the conversation.")}</div>}</div>}
          {step === 5 && role === 'evaluator' && <div><h4>{t("educator_evaluation.teacher_reflection_2fxaai", "Teacher reflection")}</h4><div className="ae-evidence">{active.reflection}</div><label className="ae-field"><span>Post-conference discussion and follow-up</span><textarea className="ae-textarea" value={active.postConferenceNotes || ''} onChange={(event) => patch({ postConferenceNotes: event.target.value }, 'DRAFT_SAVED', 'Post-conference notes updated')}/></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.postConferenceNotes} onClick={() => patch({ postConferenceAt: aeNow() }, 'CONFERENCED', 'Post-conference completed')}>{t("educator_evaluation.mark_post_conference_complete_lrh7c6", "Mark post-conference complete")}</button></div>}
          {step === 5 && role === 'teacher' && <div className="ae-note">{t("educator_evaluation.reflection_submitted_1fys4zd", "Reflection submitted")} {aeDateTime(active.reflectionSubmittedAt)}. Awaiting the post-conference.</div>}
          {step === 6 && role === 'evaluator' && <div><div className="ae-note ae-warn">{t("educator_evaluation.assign_each_rating_yourself_and_enter_an_evidence_linked_r_1kisgzr", "Assign each rating yourself and enter an evidence-linked rationale. The software performs arithmetic only.")}</div><div className="ae-rating-grid" style={{ marginTop: 12 }}>{AE_DOMAINS.map((domain) => <div className="ae-rating-card" key={domain.id}><h4>{domain.code}. {aeRubricDisplayLabel(domain.label)}</h4><label className="ae-field"><span>{t("educator_evaluation.rating_fph5dc", "Rating")}</span><select className="ae-select" value={(active.ratings && active.ratings[domain.id]) == null ? '' : active.ratings[domain.id]} onChange={(event) => patch({ ratings: Object.assign({}, active.ratings, { [domain.id]: event.target.value === '' ? null : Number(event.target.value) }) }, 'RATING_UPDATED', 'Formal observation rating updated')}><option value="">{t("educator_evaluation.not_rated_17t3qdk", "Not rated")}</option>{AE_RATINGS.map((rating) => <option key={rating.value} value={rating.value}>{rating.value} · {(AE_ACTIVE_FW.ratingLabels && AE_ACTIVE_FW.ratingLabels[rating.value]) || rating.label}</option>)}</select></label><label className="ae-field"><span>{t("educator_evaluation.rationale_763cte", "Rationale")}</span><textarea className="ae-textarea" style={{ minHeight: 82 }} value={(active.rationales && active.rationales[domain.id]) || ''} onChange={(event) => patch({ rationales: Object.assign({}, active.rationales, { [domain.id]: event.target.value }) }, 'DRAFT_SAVED', 'Rating rationale updated')}/></label></div>)}</div><button type="button" className="ae-btn ae-btn-primary" disabled={AE_DOMAINS.some((domain) => !active.ratings || active.ratings[domain.id] == null || !active.rationales || !active.rationales[domain.id])} onClick={() => patch({ evaluatorSignedAt: aeNow() }, 'SIGNED', 'Evaluator signed formal observation')}>{t("educator_evaluation.sign_evaluator_assessment_197qf4t", "Sign evaluator assessment")}</button></div>}
          {step === 6 && role === 'teacher' && <div className="ae-note">{t("educator_evaluation.post_conference_completed_15mjzsh", "Post-conference completed")} {aeDateTime(active.postConferenceAt)}. Awaiting evaluator ratings and rationale.</div>}
          {step === 7 && role === 'teacher' && <div><h4>{t("educator_evaluation.evaluator_assessment_lbwpa4", "Evaluator assessment")}</h4><div className="ae-rating-grid">{AE_DOMAINS.map((domain) => <div className="ae-rating-card" key={domain.id}><h4>{aeRubricDisplayLabel(domain.label)}</h4><div className="ae-score">{active.ratings[domain.id]}</div><p className="ae-sub">{aeRatingLabel(active.ratings[domain.id])}</p><p>{active.rationales[domain.id]}</p></div>)}</div><fieldset disabled={readOnlyPreview} style={{ border: 0, padding: 0, margin: 0 }}><label className="ae-check"><input type="checkbox" checked={!!active.ackChecked} onChange={(event) => patch({ ackChecked: event.target.checked }, 'DRAFT_SAVED', 'Acknowledgment confirmation updated')}/><span>{t("educator_evaluation.i_received_this_record_and_had_an_opportunity_to_discuss_i_1cyqf5r", "I received this record and had an opportunity to discuss it. I understand acknowledgment does not mean agreement.")}</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.ackChecked} onClick={() => patch({ teacherAcknowledgedAt: aeNow() }, 'ACKNOWLEDGED', 'Teacher acknowledged formal observation')}>{t("educator_evaluation.acknowledge_receipt_1erqgfr", "Acknowledge receipt")}</button></fieldset></div>}
          {step === 7 && role === 'evaluator' && <div className="ae-note">{t("educator_evaluation.evaluator_signed_1xmt0l6", "Evaluator signed")} {aeDateTime(active.evaluatorSignedAt)}. Awaiting teacher acknowledgment; acknowledgment does not indicate agreement.</div>}
          {step === 8 && role === 'evaluator' && <div><div className="ae-note ae-ok">{t("educator_evaluation.teacher_acknowledged_receipt_tzqdjf", "Teacher acknowledged receipt")} {aeDateTime(active.teacherAcknowledgedAt)}.</div><p>{t("educator_evaluation.this_finalizes_this_observation_snapshot_annual_o_and_p_do_1lco8nt", "This finalizes this observation snapshot. Annual O&P domain ratings remain a separate, explicit judgment informed by all cycle evidence; this observation does not overwrite them.")}</p><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ finalizedAt: aeNow() }, 'FINALIZED', 'Formal observation finalized')}>{t("educator_evaluation.finalize_formal_observation_3tjde8", "Finalize formal observation")}</button></div>}
          {step === 8 && role === 'teacher' && <div className="ae-note">{t("educator_evaluation.acknowledgment_recorded_awaiting_evaluator_finalization_3jswkv", "Acknowledgment recorded. Awaiting evaluator finalization.")}</div>}
          {step === 9 && <div className="ae-note ae-ok"><strong>{t("educator_evaluation.formal_observation_finalized_gycub8", "Formal observation finalized.")}</strong><br/>{t("educator_evaluation.finalized_4cmc2p", "Finalized")} {aeDateTime(active.finalizedAt)}. Published versions remain locked; later context appears as appended comments.</div>}
        </fieldset></section>
        <aside className="ae-span-5"><AeFrameworkReference/><AeFormalRecordSummary observation={active} role={role}/><div className="ae-card" style={{ marginTop: 16 }}><AeThread workspace={workspace} recordType="formal_observation" recordId={active.id} teacherId={active.teacherId} role={role} onAdd={addComment} readOnlyPreview={readOnlyPreview || cycleFinalized}/></div></aside>
      </div></>;
    })()}
  </div>;
}

function AeSpm({ workspace, selectedTeacher, setSelectedTeacherId, role, createSpm, updateSpm, updateTeacher, addComment, readOnlyPreview = false }) {
  const [openId, setOpenId] = React.useState('');
  const teachers = workspace.teachers.filter((teacher) => teacher.active !== false);
  const cycleFinalized = aeCycleFinalized(selectedTeacher);
  const records = workspace.spms.filter((record) => role !== 'teacher' || (selectedTeacher && record.teacherId === selectedTeacher.id));
  const active = (selectedTeacher && records.find((record) => record.id === openId && record.teacherId === selectedTeacher.id)) || (selectedTeacher && records.find((record) => record.teacherId === selectedTeacher.id)) || null;
  React.useEffect(() => { if (active && !openId) setOpenId(active.id); }, [active && active.id]);
  React.useEffect(() => {
    if (!cycleFinalized && active && role === 'evaluator' && active.status === 'submitted' && !active.firstOpenedAt) updateSpm(active.id, { firstOpenedAt: aeNow() }, 'OPENED', 'SPM plan first opened by evaluator');
  }, [active && active.id, active && active.status, role, cycleFinalized]);
  const requestActionReview = aeUseActionReview();
  const performPatch = (changes, event, summary) => {
    if (cycleFinalized) return;
    updateSpm(active.id, changes, event, summary);
  };
  const patch = (changes, event, summary) => {
    if (event !== 'APPROVED' || !requestActionReview) { performPatch(changes, event, summary); return; }
    const teacher = workspace.teachers.find((item) => item.id === active.teacherId);
    requestActionReview({
      title: 'Approve this SPM / SLO plan?',
      description: 'Approval locks the submitted plan version as the agreed goal and opens the year-end results stage.',
      facts: [['Educator', teacher ? teacher.name + ' · ' + teacher.code : active.teacherId], ['Plan version', active.version || 1], ['Goal', active.goal || 'Not recorded'], ['Measures', active.measures || 'Not recorded']],
      warning: 'A material plan change after approval requires a new submitted version and renewed approval.',
      acknowledgement: 'I reviewed the submitted goal, baseline, measures, and action plan for this educator.',
      confirmLabel: 'Approve plan version',
      onConfirm: () => performPatch(changes, event, summary),
    });
  };
  const lockSpm = () => {
    if (cycleFinalized) return;
    const teacher = workspace.teachers.find((item) => item.id === active.teacherId);
    const perform = () => {
      updateTeacher(active.teacherId, (draft) => { draft.ratings.lea = active.rating; }, 'RATING_UPDATED', 'LEA Selected Measure rating recorded');
      performPatch({ status: 'locked', lockedAt: aeNow() }, 'FINALIZED', 'SPM record rated and locked');
    };
    if (!requestActionReview) { perform(); return; }
    requestActionReview({
      title: 'Rate and lock this SPM / SLO record?',
      description: 'The year-end results, educator reflection, human-selected rating, and rationale will become a locked annual evidence record.',
      facts: [['Educator', teacher ? teacher.name + ' · ' + teacher.code : active.teacherId], ['Rating', active.rating + ' · ' + aeBand(active.rating)], ['Rationale', active.ratingRationale], ['Lock effect', 'The SPM / SLO becomes read-only and eligible for annual provenance.']],
      warning: 'Confirm the result and rationale against the submitted evidence before locking.',
      acknowledgement: 'I reviewed the results, reflection, rating, and rationale and am ready to lock this record.',
      confirmLabel: 'Rate and lock record',
      onConfirm: perform,
    });
  };
  const canEditPlan = active && role === 'teacher' && !readOnlyPreview && !cycleFinalized && ['draft', 'returned'].includes(active.status);
  return <div className="ae-page"><div className="ae-heading"><div><h2>{t("educator_evaluation.spm_slo_18l13ic", "SPM / SLO")}</h2><p>{AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.current_act_13_terminology_is_lea_selected_measure_student_81f9h8", 'Current Act 13 terminology is LEA Selected Measure · Student Performance Measure (SPM); SLO remains a familiar local alias.') : t("educator_evaluation.under_maine_pepg_this_record_holds_the_student_learning_an_k0ry7b", 'Under Maine PEPG this record holds the Student Learning &amp; Growth measure; SPM/SLO remain familiar aliases.')}</p></div>{role === 'teacher' && selectedTeacher && !cycleFinalized && !records.some((record) => record.teacherId === selectedTeacher.id) && <button type="button" className="ae-btn ae-btn-primary" disabled={readOnlyPreview} title={readOnlyPreview ? t("educator_evaluation.preview_only_no_proposal_is_created_10gjfc9", 'Preview only; no proposal is created.') : undefined} onClick={() => setOpenId(createSpm(selectedTeacher.id))}>{t("educator_evaluation.start_spm_proposal_9v6z62", "+ Start SPM proposal")}</button>}</div>
    <AeFinalizedCycleNotice teacher={selectedTeacher}/>
    {role === 'evaluator' ? <div className="ae-toolbar"><label className="ae-field" style={{ minWidth: 260, margin: 0 }}><span>{t("educator_evaluation.educator_8c1rq4", "Educator")}</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => { setSelectedTeacherId(event.target.value); const found = workspace.spms.find((record) => record.teacherId === event.target.value); setOpenId(found ? found.id : ''); }}><option value="">{t("educator_evaluation.choose_an_educator_1l6d6bg", "Choose an educator")}</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label></div> : selectedTeacher && <div className="ae-note">{t("educator_evaluation.viewing_records_for_1hjcyfh", "Viewing records for")} {selectedTeacher.name} · {selectedTeacher.code}</div>}
    {!active ? <div className="ae-card ae-empty">{selectedTeacher ? (cycleFinalized ? t("educator_evaluation.finalized_cycle_no_spm_20260826", 'This finalized cycle is read-only; annual rollover is required before a new SPM / SLO can begin.') : (role === 'teacher' ? t("educator_evaluation.start_a_proposal_for_the_selected_educator_1xqnpae", 'Start a proposal for the selected educator.') : t("educator_evaluation.no_spm_has_been_submitted_for_this_educator_124nzll", 'No SPM has been submitted for this educator.'))) : t("educator_evaluation.choose_an_educator_x8s9xy", 'Choose an educator.')}</div> : (() => { const teacher = workspace.teachers.find((item) => item.id === active.teacherId); return <div className="ae-grid"><section className="ae-card ae-span-7"><fieldset disabled={cycleFinalized} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><div className="ae-record-head"><div><h3>{teacher ? teacher.name : t("educator_evaluation.educator_8c1rq4", 'Educator')} {t("educator_evaluation.spm_plan_72fjsn", "· SPM plan")}</h3><p className="ae-sub">{t("educator_evaluation.version_q0zd4n", "Version")} {active.version || 1} {t("educator_evaluation.created_145lrzq", "· created")} {aeDateTime(active.createdAt)}</p></div><span className="ae-chip ae-chip-blue">{active.status.replace(/_/g, ' ')}</span></div>
      {active.returnReason && <div className="ae-note ae-danger" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.returned_for_revision_irng8w", "Returned for revision:")}</strong> {active.returnReason}</div>}
      <fieldset disabled={!canEditPlan} style={{ border: 0, padding: 0, margin: '14px 0 0' }}><label className="ae-field"><span>{t("educator_evaluation.classroom_context_and_priority_learning_need_1wozrno", "Classroom context and priority learning need")}</span><textarea className="ae-textarea" value={active.context || ''} onChange={(event) => patch({ context: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>{t("educator_evaluation.baseline_1ydg9r6", "Baseline")}</span><textarea className="ae-textarea" value={active.baseline || ''} onChange={(event) => patch({ baseline: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>{t("educator_evaluation.unit_goal_statement_and_expected_outcomes_ak6a40", "Unit / goal statement and expected outcomes")}</span><textarea className="ae-textarea" value={active.goal || ''} onChange={(event) => patch({ goal: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>{t("educator_evaluation.performance_measures_and_indicators_zr1zqf", "Performance measures and indicators")}</span><textarea className="ae-textarea" value={active.measures || ''} onChange={(event) => patch({ measures: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>{t("educator_evaluation.action_plan_supports_and_evidence_sources_l7keoe", "Action plan, supports, and evidence sources")}</span><textarea className="ae-textarea" value={active.actionPlan || ''} onChange={(event) => patch({ actionPlan: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label></fieldset>
      {canEditPlan && <button type="button" className="ae-btn ae-btn-primary" disabled={!active.context || !active.baseline || !active.goal || !active.measures || !active.actionPlan} onClick={() => patch({ status: 'submitted', submittedAt: aeNow(), version: (active.version || 1) + (active.status === 'returned' ? 1 : 0), returnReason: '' }, 'SUBMITTED', 'SPM plan submitted')}>{t("educator_evaluation.submit_plan_for_approval_yud07q", "Submit plan for approval")}</button>}
      {active.status === 'submitted' && role === 'evaluator' && <div style={{ marginTop: 14 }}><div className="ae-note">{t("educator_evaluation.submitted_by_teacher_18ylx7x", "Submitted by teacher")} {aeDateTime(active.submittedAt)}. Approval locks this version; a material revision will require renewed approval.</div><label className="ae-field"><span>{t("educator_evaluation.reason_if_returning_1fcdbay", "Reason if returning")}</span><textarea className="ae-textarea" value={active.pendingReturnReason || ''} onChange={(event) => patch({ pendingReturnReason: event.target.value }, 'DRAFT_SAVED', 'Return reason drafted')}/></label><div className="ae-actions"><button type="button" className="ae-btn" disabled={!active.pendingReturnReason} onClick={() => patch({ status: 'returned', returnedAt: aeNow(), returnReason: active.pendingReturnReason, pendingReturnReason: '' }, 'RETURNED', 'SPM plan returned for revision')}>{t("educator_evaluation.return_for_revision_1lmlgql", "Return for revision")}</button><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ status: 'approved', firstOpenedAt: active.firstOpenedAt || aeNow(), approvedAt: aeNow(), approvedBy: workspace.config.evaluatorName }, 'APPROVED', 'SPM plan approved')}>{t("educator_evaluation.approve_plan_1rh7h1x", "Approve plan")}</button></div></div>}
      {active.status === 'submitted' && role === 'teacher' && <div className="ae-note" style={{ marginTop: 12 }}>{t("educator_evaluation.submitted_12at4de", "Submitted")} {aeDateTime(active.submittedAt)}. Awaiting evaluator action.</div>}
      {active.status === 'approved' && role === 'teacher' && <fieldset disabled={readOnlyPreview} style={{ border: 0, padding: 0, margin: '14px 0 0' }}><div className="ae-note ae-ok">{t("educator_evaluation.plan_approved_by_j6ro4u", "Plan approved by")} {active.approvedBy} {aeDateTime(active.approvedAt)}.</div><label className="ae-field"><span>{t("educator_evaluation.year_end_results_ikr7ri", "Year-end results")}</span><textarea className="ae-textarea" value={active.results || ''} onChange={(event) => patch({ results: event.target.value }, 'DRAFT_SAVED', 'SPM results draft saved')}/></label><label className="ae-field"><span>{t("educator_evaluation.teacher_reflection_2fxaai", "Teacher reflection")}</span><textarea className="ae-textarea" value={active.reflection || ''} onChange={(event) => patch({ reflection: event.target.value }, 'DRAFT_SAVED', 'SPM reflection draft saved')}/></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.results || !active.reflection} onClick={() => patch({ status: 'results_submitted', resultsSubmittedAt: aeNow() }, 'SUBMITTED', 'SPM results submitted')}>{t("educator_evaluation.submit_results_and_reflection_2n81bf", "Submit results and reflection")}</button></fieldset>}
      {active.status === 'approved' && role === 'evaluator' && <div className="ae-note ae-ok" style={{ marginTop: 12 }}>{t("educator_evaluation.plan_approved_awaiting_year_end_results_from_the_teacher_84nklh", "Plan approved. Awaiting year-end results from the teacher.")}</div>}
      {active.status === 'results_submitted' && role === 'evaluator' && <div style={{ marginTop: 14 }}><h4>{t("educator_evaluation.year_end_results_ikr7ri", "Year-end results")}</h4><div className="ae-evidence">{active.results}</div><h4>{t("educator_evaluation.teacher_reflection_2fxaai", "Teacher reflection")}</h4><div className="ae-evidence">{active.reflection}</div><label className="ae-field"><span>{t("educator_evaluation.human_selected_spm_rating_o8r5z7", "Human-selected SPM rating")}</span><select className="ae-select" value={active.rating == null ? '' : active.rating} onChange={(event) => patch({ rating: event.target.value === '' ? null : Number(event.target.value) }, 'RATING_UPDATED', 'SPM rating updated')}><option value="">{t("educator_evaluation.not_rated_17t3qdk", "Not rated")}</option>{AE_RATINGS.map((rating) => <option value={rating.value} key={rating.value}>{rating.value} · {(AE_ACTIVE_FW.ratingLabels && AE_ACTIVE_FW.ratingLabels[rating.value]) || rating.label}</option>)}</select></label><label className="ae-field"><span>{t("educator_evaluation.rating_rationale_7du1ct", "Rating rationale")}</span><textarea className="ae-textarea" value={active.ratingRationale || ''} onChange={(event) => patch({ ratingRationale: event.target.value }, 'DRAFT_SAVED', 'SPM rating rationale updated')}/></label><button type="button" className="ae-btn ae-btn-primary" disabled={active.rating == null || !active.ratingRationale} onClick={lockSpm}>{t("educator_evaluation.review_rating_and_lock", "Review rating & lock")}</button></div>}
      {active.status === 'results_submitted' && role === 'teacher' && <div className="ae-note" style={{ marginTop: 12 }}>{t("educator_evaluation.results_submitted_nvv11s", "Results submitted")} {aeDateTime(active.resultsSubmittedAt)}. Awaiting evaluator rating.</div>}
      {active.status === 'locked' && <div className="ae-note ae-ok" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.rated_and_locked_145iw5n", "Rated and locked ·")} {active.rating} ({aeBand(active.rating)})</strong><br/>{t("educator_evaluation.locked_hvffeb", "Locked")} {aeDateTime(active.lockedAt)}. Plan approval and final result rating remain separate audit events.</div>}
      <AeThread workspace={workspace} recordType="spm" recordId={active.id} teacherId={active.teacherId} role={role} onAdd={addComment} readOnlyPreview={readOnlyPreview || cycleFinalized}/></fieldset>
    </section><aside className="ae-card ae-span-5"><h3>{t("educator_evaluation.submission_receipts_19d77qi", "Submission receipts")}</h3><div className="ae-timeline"><div className="ae-event"><h4>{t("educator_evaluation.created_2qkacb", "Created")}</h4><p>{aeDateTime(active.createdAt)}</p></div>{active.submittedAt && <div className="ae-event"><h4>{t("educator_evaluation.submitted_12at4de", "Submitted")}</h4><p>{aeDateTime(active.submittedAt)}</p></div>}{active.firstOpenedAt && <div className="ae-event"><h4>{t("educator_evaluation.first_opened_by_evaluator_1gept4m", "First opened by evaluator")}</h4><p>{aeDateTime(active.firstOpenedAt)}</p></div>}{active.approvedAt && <div className="ae-event"><h4>{t("educator_evaluation.approved_by_esl6dj", "Approved by")} {active.approvedBy}</h4><p>{aeDateTime(active.approvedAt)}</p></div>}{active.resultsSubmittedAt && <div className="ae-event"><h4>{t("educator_evaluation.results_submitted_nvv11s", "Results submitted")}</h4><p>{aeDateTime(active.resultsSubmittedAt)}</p></div>}{active.lockedAt && <div className="ae-event"><h4>{t("educator_evaluation.rated_and_locked_1fxynnu", "Rated and locked")}</h4><p>{aeDateTime(active.lockedAt)}</p></div>}</div><div className="ae-note ae-warn">{t("educator_evaluation.opened_is_an_automatic_access_receipt_it_does_not_claim_th_1ixjybh", "“Opened” is an automatic access receipt. It does not claim the person read or agreed with the contents; approval and acknowledgment are explicit actions.")}</div></aside></div>; })()}
  </div>;
}

function AeAuditExport({ workspace, selectedTeacher, exportWorkspace, exportCsv, exportDueDateCalendar, exportSummary, exportGrowthSnapshot, importWorkspace, pendingImport, confirmPendingImport, cancelPendingImport, importUndo, undoImport, archiveAndResetSample, role, isRemote = false, exportEducatorPacket, exportResponsePacket, packetIncludeNames, setPacketIncludeNames }) {
  const [filter, setFilter] = React.useState('selected');
  const [clearStep, setClearStep] = React.useState(false);
  const [clearAcknowledged, setClearAcknowledged] = React.useState(false);
  const fileRef = React.useRef(null);
  const isEvaluator = role === 'evaluator';
  const events = workspace.audit.filter((event) => isEvaluator && filter === 'all' ? true : (selectedTeacher && event.teacherId === selectedTeacher.id));
  return <div className="ae-page">
    <div className="ae-heading"><div><h2>{isEvaluator ? t("educator_evaluation.audit_reports_and_handoff_1xj4mmi", 'Audit, reports, and handoff') : t("educator_evaluation.my_evaluation_timeline_1h8yleq", 'My evaluation timeline')}</h2><p>{t("educator_evaluation.submission_approval_acknowledgment_comment_and_finalizatio_191hp4o", "Submission, approval, acknowledgment, comment, and finalization events are distinct.")}</p></div></div>
    <div className="ae-grid">
      <section className={'ae-card ' + (isEvaluator ? 'ae-span-7' : 'ae-span-12')}>
        <div className="ae-record-head"><div><h3>{t("educator_evaluation.audit_timeline_1z0rmvf", "Audit timeline")}</h3><p className="ae-sub">{isRemote ? t("educator_evaluation.this_permission_filtered_timeline_is_loaded_from_the_distr_gt59qm", 'This permission-filtered timeline is loaded from the district repository; the server owns the authoritative audit history.') : t("educator_evaluation.on_device_activity_history_the_district_portal_adds_server_15eogvb", 'On-device activity history; the district portal adds server-side tamper-evident logs.')}</p></div>{isEvaluator && <select className="ae-select" style={{ width: 'auto' }} value={filter} onChange={(event) => setFilter(event.target.value)} aria-label={t("educator_evaluation.filter_audit_timeline_1tq7d6o", "Filter audit timeline")}><option value="selected">{t("educator_evaluation.selected_educator_2guy6p", "Selected educator")}</option><option value="all">{t("educator_evaluation.all_educators_18bw6s6", "All educators")}</option></select>}</div>
        {events.length === 0 ? <div className="ae-empty">{t("educator_evaluation.no_matching_audit_events_tvdii7", "No matching audit events.")}</div> : <>{events.length > 150 && <p className="ae-sub">{t("educator_evaluation.showing_the_150_most_recent_of_1biq5tg", "Showing the 150 most recent of")} {events.length} {t("educator_evaluation.events_older_history_is_not_deleted_and_remains_in_the_127pmxj", "events; older history is not deleted and remains in the")} {isRemote ? t("educator_evaluation.district_repository_1i7yqul", 'district repository') : t("educator_evaluation.workspace_export_1cgtz7k", 'workspace export')}.</p>}<div className="ae-timeline">{events.slice(0, 150).map((event) => <div className="ae-event" key={event.id}><h4>{event.event.replace(/_/g, ' ')} · {event.summary}</h4><p>{event.actor} · {event.role} · {aeDateTime(event.at)}</p><p>{event.entityType} {t("educator_evaluation.version_13que5q", "· version")} {event.version || 1}</p></div>)}</div></>}
      </section>
      {isRemote ? <section className="ae-card ae-span-12"><h3>{t("educator_evaluation.district_controlled_exports_14zxefn", "District-controlled exports")}</h3><div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.direct_downloads_imports_and_reset_stay_disabled_in_the_po_11a55ea", "Direct downloads, imports, and reset stay disabled in the portal.")}</strong><br/>{t("educator_evaluation.authorized_administrators_can_create_reviewed_audited_priv_1vl508p", "Authorized administrators can create reviewed, audited, private exports from")} <strong>{t("educator_evaluation.setup_and_rarr_district_operations_center_mx93hz", "Setup &rarr; District operations center")}</strong>. Creating an export does not share it or designate it as the official record; district purpose, destination, retention, legal hold, and handoff rules still apply.</div></section> : isEvaluator ? <section className="ae-card ae-span-5">
        <h3>{t("educator_evaluation.export_and_transfer_1d54uu5", "Export and transfer")}</h3>
        <p className="ae-sub">{t("educator_evaluation.exports_can_contain_confidential_personnel_information_sto_ca6qg3", "Exports can contain confidential personnel information. Store and transmit them only through district-authorized systems.")}</p>
        <div className="ae-actions" style={{ marginTop: 12 }}><button type="button" className="ae-btn" onClick={exportWorkspace}>{t("educator_evaluation.export_workspace_json_1g2lrvc", "Export workspace JSON")}</button><button type="button" className="ae-btn" onClick={exportCsv}>{t("educator_evaluation.export_status_csv_aj3skr", "Export status CSV")}</button><button type="button" className="ae-btn" onClick={exportDueDateCalendar} title={t("educator_evaluation.calendar_export_title_20260823", "All-day events for every open cycle due date. Import the file into Google Calendar or Outlook; it contains names and due dates only.")}>{t("educator_evaluation.due_date_calendar_ics_20260823", "Due-date calendar (.ics)")}</button><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportSummary}>{t("educator_evaluation.workflow_summary_html_1lsjydx", "Workflow summary HTML")}</button><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportEducatorPacket}>{t("educator_evaluation.educator_packet_send_to_educator_18dqe6b", "Educator packet (send to educator)")}</button><label className="ae-field" style={{ marginTop: 8 }}><input type="checkbox" style={{ width: 24, height: 24 }} checked={packetIncludeNames} onChange={(event) => setPacketIncludeNames(event.target.checked)} /> <span>{t("educator_evaluation.include_profile_and_display_names_in_the_packet_1x86ned", "Include profile and display names in the packet")}</span></label><p className="ae-sub">{t("educator_evaluation.when_names_are_omitted_structured_names_become_the_educato_ahvgnm", "When names are omitted, structured names become the educator code and role labels.")} <strong>{t("educator_evaluation.free_text_evidence_comments_statements_and_reflections_are_s0jahn", "Free-text evidence, comments, statements, and reflections are unchanged and may still identify people.")}</strong> {t("educator_evaluation.review_the_packet_before_sending_it_through_a_district_aut_1kjysq9", "Review the packet before sending it through a district-authorized channel.")}</p><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportGrowthSnapshot} title={t("educator_evaluation.formative_no_ratings_published_bright_spots_evidence_progr_1fnamky", "Formative, no ratings: published bright spots, evidence progress, and documentation coverage, identical for educator and evaluator.")}>{t("educator_evaluation.growth_snapshot_formative_1knugio", "Growth snapshot (formative)")}</button></div>
        <hr style={{ border: 0, borderTop: '1px solid #d8deea', margin: '18px 0' }}/>
        <h4>{t("educator_evaluation.import_workspace_or_educator_response_17pa1h2", "Import workspace or educator response")}</h4>
        <p className="ae-sub">{t("educator_evaluation.selecting_a_file_only_prepares_a_review_nothing_changes_un_zumdn5", "Selecting a file only prepares a review. Nothing changes until you inspect the summary and confirm it.")}</p>
        <button type="button" className="ae-btn" onClick={() => fileRef.current && fileRef.current.click()}>{t("educator_evaluation.choose_json_or_educator_packet_1cmijl4", "Choose JSON or educator packet")}</button>
        <input ref={fileRef} hidden tabIndex={-1} aria-label={t("educator_evaluation.import_evaluation_workspace_or_educator_response_158pb3o", "Import evaluation workspace or educator response")} type="file" accept="application/json,.json,text/html,.html,.htm" onChange={(event) => { const file = event.target.files && event.target.files[0]; if (file) importWorkspace(file); event.target.value = ''; }}/>
        {pendingImport && <div className="ae-note ae-warn" role="region" aria-live="polite" aria-labelledby="ae-import-review-title" style={{ marginTop: 12 }}>
          <h4 id="ae-import-review-title" style={{ marginTop: 0 }}>{t("educator_evaluation.review_before_applying_b900ow", "Review before applying")}</h4>
          <p><strong>{pendingImport.label}</strong></p>
          <dl className="ae-review-facts">{pendingImport.facts.map((fact) => <React.Fragment key={fact[0]}><dt>{fact[0]}</dt><dd>{fact[1]}</dd></React.Fragment>)}</dl>
          {pendingImport.warning && <p><strong>{t("educator_evaluation.check_h8ofzb", "Check:")}</strong> {pendingImport.warning}</p>}
          <div className="ae-actions"><button type="button" className="ae-btn" onClick={cancelPendingImport}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button><button type="button" className="ae-btn ae-btn-primary" onClick={confirmPendingImport}>{pendingImport.replacesWorkspace ? t("educator_evaluation.download_backup_and_replace_workspace_8w0di9", 'Download backup and replace workspace') : t("educator_evaluation.apply_this_reviewed_response_r997bp", 'Apply this reviewed response')}</button></div>
        </div>}
        {importUndo && <div className="ae-note ae-ok" role="status" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.import_applied_jzna1p", "Import applied.")}</strong> {t("educator_evaluation.the_prior_workspace_remains_available_until_your_next_edit_1u7f8g1", "The prior workspace remains available until your next edit.")}<div className="ae-actions" style={{ marginTop: 8 }}><button type="button" className="ae-btn" onClick={undoImport}>{t("educator_evaluation.undo_import_s0uszg", "Undo import")}</button></div></div>}
        <div className="ae-note ae-warn" style={{ marginTop: 16 }}>{t("educator_evaluation.this_export_assists_front_end_supervision_work_102lr5k", "This export assists front-end supervision work.")} {AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.peers_or_your_lea_authorized_system_4t6ndj", 'PEERS or your LEA-authorized system') : t("educator_evaluation.your_district_authorized_pepg_record_system_1eecbc2", 'Your district-authorized PEPG record system')} {t("educator_evaluation.remains_the_official_summative_rating_record_for_this_mvp_1mw87t5", "remains the official summative rating record for this MVP.")}</div>
        {workspace.config.sampleMode && <div id="ae-sample-to-real-transition" style={{ marginTop: 18 }}><h4>{t("educator_evaluation.move_from_fictional_practice_to_real_work_20260822", "Move from fictional practice to real work")}</h4><p className="ae-sub">{t("educator_evaluation.simulated_records_never_become_personnel_records_20260822", "Simulated records are never converted into personnel records. This reviewed transition downloads a rehearsal backup, then opens a separate clean workspace.")}</p>{!clearStep ? <button type="button" className="ae-btn" onClick={() => { setClearAcknowledged(false); setClearStep(true); }}>{t("educator_evaluation.review_clean_workspace_transition_20260822", "Review clean-workspace transition")}</button> : <div className="ae-note ae-danger" role="region" aria-labelledby="ae-clean-transition-title"><strong id="ae-clean-transition-title">{t("educator_evaluation.review_before_leaving_fictional_practice_20260822", "Review before leaving fictional practice")}</strong><dl className="ae-review-facts"><dt>{t("educator_evaluation.fictional_educators_20260822", "Fictional educators")}</dt><dd>{workspace.teachers.length}</dd><dt>{t("educator_evaluation.fictional_workflow_records_20260822", "Fictional workflow records")}</dt><dd>{workspace.walkthroughs.length + workspace.observations.length + workspace.spms.length}</dd><dt>{t("educator_evaluation.current_planning_path_20260822", "Current planning path")}</dt><dd>{workspace.config.setupPath || t("educator_evaluation.not_selected_20260822", 'Not selected')}</dd><dt>{t("educator_evaluation.backup_20260822", "Backup")}</dt><dd>{t("educator_evaluation.downloaded_automatically_before_reset_20260822", "Downloaded automatically before the reset")}</dd></dl><label className="ae-check"><input type="checkbox" checked={clearAcknowledged} onChange={(event) => setClearAcknowledged(event.target.checked)}/><span>{t("educator_evaluation.understand_clean_workspace_starts_empty_20260822", "I understand the clean workspace starts empty and no fictional educator, evidence, rating, or audit event will be copied into it.")}</span></label><div className="ae-actions" style={{ marginTop: 8 }}><button className="ae-btn" type="button" onClick={() => { setClearAcknowledged(false); setClearStep(false); }}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button><button className="ae-btn ae-btn-danger" disabled={!clearAcknowledged} type="button" onClick={() => { setClearAcknowledged(false); setClearStep(false); archiveAndResetSample(); }}>{t("educator_evaluation.download_rehearsal_backup_and_start_clean_20260822", "Download rehearsal backup and start clean")}</button></div></div>}</div>}
      </section> : <section className="ae-card ae-span-12"><h3>{t("educator_evaluation.my_copy_1q7nxow", "My copy")}</h3><p className="ae-sub">{t("educator_evaluation.download_only_the_selected_educator_s_workflow_summary_zowbz5", "Download only the selected educator’s workflow summary.")}</p><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportSummary}>{t("educator_evaluation.download_my_summary_html_1oovbd6", "Download my summary HTML")}</button><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportResponsePacket}>{t("educator_evaluation.export_my_response_to_send_back_s03f22", "Export my response to send back")}</button><p className="ae-sub">{t("educator_evaluation.your_statement_reflections_and_acknowledgements_only_ratin_12a7d5k", "Your statement, reflections and acknowledgements only. Ratings and evidence are not included, and cannot be changed by this file.")}</p><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportGrowthSnapshot}>{t("educator_evaluation.download_my_growth_snapshot_krjq20", "Download my growth snapshot")}</button><div className="ae-note" style={{ marginTop: 12 }}>{t("educator_evaluation.teacher_view_cannot_export_or_import_the_full_workspace_or_1tt5ymx", "Teacher view cannot export or import the full workspace or view organization-wide audit events.")}</div></section>}
    </div>
  </div>;
}

// Share-by-QR: reuses the app's single QR implementation (window.__alloMakeQrSvg
// in the app shell; window.qrcode bundled into the standalone and portal pages).
// Remote mode encodes the district portal URL, sign-in still decides access.
// On-device mode encodes the public workspace page: each scan opens the
// scanner's OWN private workspace; nothing of yours is shared.
function AeCopyShareSource({ name, label, onCopied }) {
  const [state, setState] = React.useState('idle');
  const signatures = {
    'Code.gs': ['function verifyShareHelper', 'function shareEvaluationPacket', 'ALLOFLOW_EVALUATION_PACKET'],
    'Index.html': ['id="reviewPanel"', 'google.script.run', 'reviewedRequest = clone(req)', 'parsePacketSource'],
    'appsscript.json': ['"oauthScopes"', 'www.googleapis.com/auth/drive', '"Drive"'],
  };
  const copy = async () => {
    setState('loading');
    const path = t("educator_evaluation.apps_script_educator_evaluation_share_j4xz8j", 'apps_script/educator_evaluation_share/') + name;
    const urls = ['/' + path, 'https://alloflow-cdn.pages.dev/' + path];
    let source = '';
    for (const url of urls) {
      try {
        const response = await fetch(url, { credentials: 'omit' });
        if (response.ok) { source = await response.text(); break; }
      } catch (error) {}
    }
    const expected = signatures[name] || [];
    if (!source || !expected.every((token) => source.includes(token))) { setState('invalid'); return; }
    try {
      await navigator.clipboard.writeText(source);
      setState('copied');
      if (typeof onCopied === 'function') onCopied();
      window.setTimeout(() => setState('idle'), 2400);
    } catch (error) { setState('error'); }
  };
  return <div><button type="button" className="ae-btn" onClick={copy} disabled={state === 'loading'}>{state === 'loading' ? t("educator_evaluation.loading_source_10dacoa", 'Loading source…') : (state === 'copied' ? t("educator_evaluation.copied_13bzcw5", 'Copied ') + name : t("educator_evaluation.copy_s6g5lw", 'Copy ') + label)}</button><div className="ae-help">{name} · <a className="ae-link" href={'https://alloflow-cdn.pages.dev/apps_script/educator_evaluation_share/' + name} target="_blank" rel="noopener noreferrer">{t("educator_evaluation.view_source_1wouual", "view source")}</a>{state === 'error' ? <span className="ae-chip ae-chip-bad" style={{ marginLeft: 6 }}>{t("educator_evaluation.copy_failed_open_source_1w01hdn", "Copy failed; open source")}</span> : null}{state === 'invalid' ? <span className="ae-chip ae-chip-bad" style={{ marginLeft: 6 }}>{t("educator_evaluation.unexpected_source_received_nothing_copied_1y3oi0u", "Unexpected source received; nothing copied")}</span> : null}</div></div>;
}

function AePrincipalShareSetup({ workspace, updateConfig }) {
  const [url, setUrl] = React.useState(workspace.config.shareHelperUrl || '');
  const [urlMessage, setUrlMessage] = React.useState({ text: '', tone: 'info' });
  React.useEffect(() => { setUrl(workspace.config.shareHelperUrl || ''); }, [workspace.config.shareHelperUrl]);
  const storedSteps = Array.isArray(workspace.config.shareHelperChecklist) ? workspace.config.shareHelperChecklist : [];
  const completed = new Set(storedSteps);
  if (workspace.config.shareHelperUrl) completed.add('deployed');
  if (workspace.config.shareHelperVerified) completed.add('verified');
  const order = ['approval', 'project', 'code', 'index', 'manifest', 'deployed', 'verified'];
  const nextStep = order.find((step) => !completed.has(step));
  const nextLabels = {
    approval: 'Confirm district approval and the managed account you will use.',
    project: 'Open script.new and create the private Apps Script project.',
    code: 'Copy Code.gs into the project.',
    index: 'Add the Index HTML file and copy its source.',
    manifest: 'Show appsscript.json and copy the Drive v3 manifest.',
    deployed: 'Deploy privately, then save the /exec link below.',
    verified: 'Open the helper and run its deployment check.',
  };
  const progress = completed.size;
  const setStoredStep = (step, checked = true) => {
    const next = new Set(storedSteps);
    if (checked) next.add(step); else next.delete(step);
    updateConfig('shareHelperChecklist', order.filter((item) => next.has(item) && !['deployed', 'verified'].includes(item)));
    if (checked && ['code', 'index', 'manifest'].includes(step) && workspace.config.shareHelperVerified) {
      updateConfig('shareHelperVerified', false);
      setUrlMessage({ text: t("educator_evaluation.source_changed_create_a_new_deployment_version_then_run_th_s4gizk", 'Source changed. Create a new deployment version, then run the deployment check again.'), tone: 'warning' });
    }
  };
  const taskClass = (step) => 'ae-setup-task' + (completed.has(step) ? ' ae-setup-task-complete' : '');
  const saveUrl = () => {
    const value = String(url || '').trim();
    if (value && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:[?#].*)?$/.test(value)) {
      setUrlMessage({ text: t("educator_evaluation.paste_the_deployed_apps_script_url_ending_in_exec_preview__1pd18ow", 'Paste the deployed Apps Script URL ending in /exec. Preview and /dev links were rejected.'), tone: 'warning' });
      return;
    }
    if (value !== workspace.config.shareHelperUrl) updateConfig('shareHelperVerified', false);
    updateConfig('shareHelperUrl', value);
    setUrlMessage({ text: value ? t("educator_evaluation.helper_link_saved_on_this_device_run_the_deployment_check__1fqkbq8", 'Helper link saved on this device. Run the deployment check again for this exact link.') : t("educator_evaluation.helper_link_removed_deployment_verification_was_cleared_1ci4s13", 'Helper link removed; deployment verification was cleared.'), tone: value ? 'success' : 'info' });
  };
  const resetProgress = () => {
    updateConfig('shareHelperChecklist', []);
    updateConfig('shareHelperUrl', '');
    updateConfig('shareHelperVerified', false);
    setUrl('');
    setUrlMessage({ text: t("educator_evaluation.setup_checklist_reset_no_drive_file_or_deployment_was_chan_1mlx5ob", 'Setup checklist reset. No Drive file or deployment was changed.'), tone: 'info' });
  };
  return <section className="ae-card ae-span-12 ae-setup-path ae-setup-path-primary" id="ae-principal-share-setup">
    <div className="ae-record-head"><div><h3>{t("educator_evaluation.principal_managed_drive_share_helper_2sst46", "Principal-managed Drive share helper")}</h3><p className="ae-sub">{t("educator_evaluation.a_resumable_setup_for_one_principal_one_district_account_a_1v2lurv", "A resumable setup for one principal, one district account, and reviewed one-recipient packet sharing.")}</p></div><span className={'ae-chip ' + (progress === order.length ? 'ae-chip-good' : 'ae-chip-blue')}>{progress} of {order.length} complete</span></div>
    <div className="ae-setup-progress" role="progressbar" aria-label={t("educator_evaluation.principal_helper_setup_progress_8dy6lx", "Principal helper setup progress")} aria-valuemin="0" aria-valuemax={order.length} aria-valuenow={progress} style={{ marginTop: 12 }}><span style={{ width: Math.round(progress / order.length * 100) + '%' }}/></div>
    <div className={progress === order.length ? 'ae-note ae-ok' : 'ae-setup-next'} style={{ marginTop: 12 }}><strong>{progress === order.length ? t("educator_evaluation.setup_checklist_complete_n6fcy5", 'Setup checklist complete.') : t("educator_evaluation.next_step_ej8e9s", 'Next step:')}</strong>{' '}{progress === order.length ? t("educator_evaluation.use_open_my_share_helper_when_you_are_ready_to_file_and_re_jthg5o", 'Use Open my share helper when you are ready to file and review a packet.') : nextLabels[nextStep]}</div>
    <div className="ae-note ae-danger" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.personnel_record_boundary_1ajucwv", "Personnel-record boundary:")}</strong> {t("educator_evaluation.use_a_managed_district_account_and_obtain_approval_for_app_1mw0x3a", "use a managed district account and obtain approval for Apps Script, Drive storage, retention, and handoff. This helper is not a district repository.")}</div>
    <div aria-label={t("educator_evaluation.principal_share_helper_setup_checklist_c93h7n", "Principal share helper setup checklist")} style={{ marginTop: 8 }}>
      <label className={taskClass('approval')}><input type="checkbox" checked={completed.has('approval')} onChange={(event) => setStoredStep('approval', event.target.checked)}/><span><strong>{t("educator_evaluation.1_confirm_approval_and_account_1p1jx9z", "1. Confirm approval and account")}</strong><span className="ae-help">{t("educator_evaluation.i_have_district_approval_and_verified_the_managed_account__14y7dq7", "I have district approval and verified the managed account that will own these working files.")}</span></span></label>
      <label className={taskClass('project')}><input type="checkbox" checked={completed.has('project')} onChange={(event) => setStoredStep('project', event.target.checked)}/><span><strong>{t("educator_evaluation.2_create_the_private_project_18fbl0i", "2. Create the private project")}</strong><span className="ae-help">{t("educator_evaluation.open_n6hn1l", "Open")} <a className="ae-link" href="https://script.new/" target="_blank" rel="noopener noreferrer">script.new</a>{t("educator_evaluation.verify_the_account_again_and_name_the_project_8fvf4y", ", verify the account again, and name the project")} <code>{t("educator_evaluation.alloflow_evaluation_share_helper_1gddc6a", "AlloFlow evaluation share helper")}</code>.</span></span></label>
      <div className={taskClass('code')}><input type="checkbox" checked={completed.has('code')} disabled aria-label={t("educator_evaluation.code_gs_copied_1qstp64", "Code.gs copied")}/><span><strong>{t("educator_evaluation.3_replace_code_gs_1rdjyy7", "3. Replace Code.gs")}</strong><span className="ae-help">{t("educator_evaluation.select_all_starter_code_copy_this_source_paste_and_save_15rxgyb", "Select all starter code, copy this source, paste, and save.")}</span><AeCopyShareSource name="Code.gs" label="Code.gs" onCopied={() => setStoredStep('code')}/></span></div>
      <div className={taskClass('index')}><input type="checkbox" checked={completed.has('index')} disabled aria-label={t("educator_evaluation.index_html_copied_wg1hca", "Index.html copied")}/><span><strong>{t("educator_evaluation.4_add_the_index_page_n1brl6", "4. Add the Index page")}</strong><span className="ae-help">{t("educator_evaluation.choose_w4fyow", "Choose")} <strong>{t("educator_evaluation.html_1gq13m1", "+ → HTML")}</strong>{t("educator_evaluation.name_it_exactly_1ogmr93", ", name it exactly")} <code>{t("educator_evaluation.index_1chtu17", "Index")}</code>{t("educator_evaluation.then_paste_this_source_avwl9q", ", then paste this source.")}</span><AeCopyShareSource name="Index.html" label="Index.html" onCopied={() => setStoredStep('index')}/></span></div>
      <div className={taskClass('manifest')}><input type="checkbox" checked={completed.has('manifest')} disabled aria-label={t("educator_evaluation.appsscript_json_copied_4x2wwu", "appsscript.json copied")}/><span><strong>{t("educator_evaluation.5_enable_drive_api_v3_1vh82a8", "5. Enable Drive API v3")}</strong><span className="ae-help">{t("educator_evaluation.in_project_settings_show_ggpmeh", "In Project Settings, show")} <code>appsscript.json</code>{t("educator_evaluation.then_replace_it_with_this_manifest_104guku", ", then replace it with this manifest.")}</span><AeCopyShareSource name="appsscript.json" label="appsscript.json" onCopied={() => setStoredStep('manifest')}/></span></div>
      <div className={taskClass('deployed')}><input type="checkbox" checked={completed.has('deployed')} disabled aria-label={t("educator_evaluation.private_deployment_link_saved_1my3ip6", "Private deployment link saved")}/><span><strong>{t("educator_evaluation.6_deploy_privately_and_save_the_link_1tir9un", "6. Deploy privately and save the link")}</strong><span className="ae-help">{t("educator_evaluation.use_1fn0bdg", "Use")} <strong>{t("educator_evaluation.deploy_new_deployment_web_app_qxtgga", "Deploy → New deployment → Web app")}</strong>, <strong>{t("educator_evaluation.execute_as_me_1e5pvvs", "Execute as: Me")}</strong>{t("educator_evaluation.and_1b7kqwq", ", and")} <strong>{t("educator_evaluation.who_has_access_only_myself_1ee5jph", "Who has access: Only myself")}</strong>. Review the account and scopes before authorizing.</span><label className="ae-field" style={{ marginTop: 8 }}><span>{t("educator_evaluation.deployment_link_ending_in_exec_17clyuo", "Deployment link ending in /exec")}</span><input className="ae-input" value={url} onChange={(event) => { setUrl(event.target.value); setUrlMessage({ text: '', tone: 'info' }); }} placeholder="https://script.google.com/macros/s/.../exec"/></label><div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" onClick={saveUrl}>{t("educator_evaluation.save_private_helper_link_1nnra4v", "Save private helper link")}</button>{workspace.config.shareHelperUrl && <a className="ae-btn" href={workspace.config.shareHelperUrl} target="_blank" rel="noopener noreferrer">{t("educator_evaluation.open_my_share_helper_bwy822", "Open my share helper")}</a>}</div></span></div>
      <label className={taskClass('verified')}><input type="checkbox" disabled={!workspace.config.shareHelperUrl || !order.slice(0, 5).every((step) => completed.has(step))} checked={!!workspace.config.shareHelperVerified} onChange={(event) => updateConfig('shareHelperVerified', event.target.checked)}/><span><strong>{t("educator_evaluation.7_run_the_deployment_check_97mn0p", "7. Run the deployment check")}</strong><span className="ae-help">{t("educator_evaluation.open_this_exact_saved_link_the_helper_must_show_the_expect_ruappl", "Open this exact saved link. The helper must show the expected managed district account and Drive API v3 ready. This checkbox records your confirmation; changing the link clears it.")}</span></span></label>
    </div>
    {urlMessage.text && <p className={'ae-note ' + (urlMessage.tone === 'success' ? 'ae-ok' : (urlMessage.tone === 'warning' ? 'ae-warn' : ''))} role="status" style={{ marginTop: 8 }}>{urlMessage.text}</p>}
    {(progress > 0 || workspace.config.shareHelperUrl) && <button type="button" className="ae-btn ae-btn-quiet" onClick={resetProgress}>{t("educator_evaluation.reset_this_checklist_1wak50c", "Reset this checklist")}</button>}
    <details className="ae-domain"><summary>{t("educator_evaluation.warnings_delivery_and_updates_1tlwvof", "Warnings, delivery, and updates")}</summary><div className="ae-domain-body"><ul className="ae-sub"><li>{t("educator_evaluation.the_helper_accepts_only_a_validated_one_educator_alloflow__kmndm4", "The helper accepts only a validated one-educator AlloFlow packet. A names-limited packet can still identify people in free-text evidence; preview it before sharing.")}</li><li>{t("educator_evaluation.drive_previews_the_raw_html_packet_as_markup_instruct_the__hy24t7", "Drive previews the raw HTML packet as markup. Instruct the educator to")} <strong>{t("educator_evaluation.download_the_file_and_open_it_in_a_browser_18fph4", "download the file and open it in a browser")}</strong>.</li><li>{t("educator_evaluation.google_drive_is_asked_to_notify_the_recipient_a_success_me_6ef364", "Google Drive is asked to notify the recipient. A success message appears only after Drive re-reads the exact recipient, role, and access end. A failed or mismatched share is compensated and the private copy is trashed; follow any manual Drive recovery message immediately.")}</li><li>{t("educator_evaluation.no_expiration_means_access_continues_until_revoked_the_hel_xovhhi", "No expiration means access continues until revoked. The helper's filed-packet list rechecks live permissions and proves absence after revoke.")}</li><li>{t("educator_evaluation.for_an_update_replace_all_three_files_then_use_1770p68", "For an update, replace all three files, then use")} <strong>{t("educator_evaluation.deploy_manage_deployments_edit_new_version_105dj1n", "Deploy → Manage deployments → Edit → New version")}</strong> {t("educator_evaluation.and_run_the_check_again_5vug5i", "and run the check again.")}</li></ul><p><a className="ae-link" href="https://alloflow-cdn.pages.dev/apps_script/educator_evaluation_share/README.md" target="_blank" rel="noopener noreferrer">{t("educator_evaluation.open_the_complete_principal_helper_guide_1gnfgs5", "Open the complete principal helper guide")}</a></p></div></details>
  </section>;
}

function AeSetupPaths({ workspace, updateConfig }) {
  const choose = (path) => updateConfig('setupPath', path);
  const selected = workspace.config.setupPath || '';
  return <>
    <section className="ae-card ae-span-12" id="ae-record-path-setup"><div className="ae-record-head"><div><div className="ae-onboarding-kicker">{t("educator_evaluation.record_path_setup_js0v6y", "Record path setup")}</div><h3>{t("educator_evaluation.choose_what_happens_after_you_create_a_record_mxe4e6", "Choose what happens after you create a record")}</h3><p className="ae-sub">{t("educator_evaluation.only_the_selected_path_s_instructions_open_below_you_can_c_mmbrzi", "Only the selected path's instructions open below. You can change this planning choice later; no record is moved automatically.")}</p></div><span className={'ae-chip ' + (selected ? 'ae-chip-blue' : 'ae-chip-amber')}>{selected ? t("educator_evaluation.1_path_selected_122biig", '1 path selected') : t("educator_evaluation.choose_one_path_1jjnodn", 'Choose one path')}</span></div><div className="ae-grid" style={{ marginTop: 12 }}>
      <article className={'ae-card ae-span-4 ae-setup-path ' + (selected === 'local' ? 'ae-setup-path-selected' : '')}><h4>{t("educator_evaluation.1_private_on_device_15pvqpg", "1 · Private on-device")}</h4><p className="ae-sub">{t("educator_evaluation.draft_simulate_and_export_on_one_device_bgkgs4", "Draft, simulate, and export on one device.")}</p><ul><li>{t("educator_evaluation.starts_immediately_a63cgi", "Starts immediately")}</li><li>{t("educator_evaluation.no_educator_sign_in_o8m16o", "No educator sign-in")}</li><li>{t("educator_evaluation.you_manage_backups_and_handoff_1ta54n3", "You manage backups and handoff")}</li></ul><button type="button" className="ae-btn" aria-pressed={selected === 'local'} onClick={() => choose('local')}>{selected === 'local' ? t("educator_evaluation.selected_no_deployment_oq8my7", 'Selected · no deployment') : t("educator_evaluation.choose_private_path_jgtl4a", 'Choose private path')}</button></article>
      <article className={'ae-card ae-span-4 ae-setup-path ae-setup-path-primary ' + (selected === 'principal_share' ? 'ae-setup-path-selected' : '')}><h4>{t("educator_evaluation.2_principal_managed_drive_1yc2so6", "2 · Principal-managed Drive")}</h4><p className="ae-sub">{t("educator_evaluation.share_exported_packets_from_a_private_helper_164y35s", "Share exported packets from a private helper.")}</p><ul><li>{t("educator_evaluation.one_reviewed_recipient_at_a_time_pfzdow", "One reviewed recipient at a time")}</li><li>{t("educator_evaluation.optional_expiration_and_revoke_kflpkb", "Optional expiration and revoke")}</li><li>{t("educator_evaluation.no_roster_or_live_shared_workflow_ging2a", "No roster or live shared workflow")}</li></ul><button type="button" className="ae-btn ae-btn-primary" aria-pressed={selected === 'principal_share'} onClick={() => choose('principal_share')}>{selected === 'principal_share' ? t("educator_evaluation.selected_continue_below_f2kqkj", 'Selected · continue below') : t("educator_evaluation.choose_principal_helper_yq2peq", 'Choose principal helper')}</button></article>
      <article className={'ae-card ae-span-4 ae-setup-path ' + (selected === 'district_portal' ? 'ae-setup-path-selected' : '')}><h4>{t("educator_evaluation.3_district_portal_ue63sf", "3 · District portal")}</h4><p className="ae-sub">{t("educator_evaluation.use_managed_identity_and_shared_live_records_13frsz3", "Use managed identity and shared live records.")}</p><ul><li>{t("educator_evaluation.district_owned_deployment_bo2zfq", "District-owned deployment")}</li><li>{t("educator_evaluation.roles_and_evaluator_assignments_12mxx70", "Roles and evaluator assignments")}</li><li>{t("educator_evaluation.two_party_workflow_and_server_audit_a6bgmc", "Two-party workflow and server audit")}</li></ul><button type="button" className="ae-btn" aria-pressed={selected === 'district_portal'} onClick={() => choose('district_portal')}>{selected === 'district_portal' ? t("educator_evaluation.selected_district_steps_below_150cs6f", 'Selected · district steps below') : t("educator_evaluation.choose_district_portal_6y5qj0", 'Choose district portal')}</button></article>
    </div>{!selected && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.no_record_path_has_been_selected_1qmgonx", "No record path has been selected.")}</strong> {t("educator_evaluation.choose_the_boundary_your_district_has_approved_before_send_4swd4w", "Choose the boundary your district has approved before sending a personnel record to anyone else.")}</div>}</section>
    {selected === 'local' && <section className="ae-card ae-span-12 ae-setup-path ae-setup-path-selected"><h3>{t("educator_evaluation.private_path_selected_nothing_to_deploy_luub1k", "Private path selected · nothing to deploy")}</h3><div className="ae-grid"><div className="ae-span-4"><h4>{t("educator_evaluation.1_configure_hgzx7u", "1. Configure")}</h4><p className="ae-sub">{t("educator_evaluation.set_the_organization_year_evaluator_and_approved_framework_6a7154", "Set the organization, year, evaluator, and approved framework below.")}</p></div><div className="ae-span-4"><h4>{t("educator_evaluation.2_back_up_g37myh", "2. Back up")}</h4><p className="ae-sub">{t("educator_evaluation.use_reports_and_audit_to_export_workspace_json_before_chan_dazz6z", "Use Reports & audit to export workspace JSON before changing devices or clearing browser data.")}</p></div><div className="ae-span-4"><h4>{t("educator_evaluation.3_handoff_deliberately_1c7osja", "3. Handoff deliberately")}</h4><p className="ae-sub">{t("educator_evaluation.role_switching_is_only_a_preview_use_an_approved_packet_or_yu9mja", "Role switching is only a preview. Use an approved packet or portal path when another person needs access.")}</p></div></div></section>}
    {selected === 'principal_share' && <AePrincipalShareSetup workspace={workspace} updateConfig={updateConfig}/>}
    {selected === 'district_portal' && <section className="ae-card ae-span-12 ae-setup-path ae-setup-path-selected" id="ae-district-portal-setup"><h3>{t("educator_evaluation.connecting_the_district_portal_step_by_step_17mmn6z", "Connecting the district portal, step by step")}</h3><p className="ae-sub">{t("educator_evaluation.this_is_a_separate_deployment_from_the_class_mailbox_it_ne_awjuco", "This is a separate deployment from the Class Mailbox. It needs its own district review, project, repository setup, and health check.")}</p><div className="ae-note ae-danger" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.not_self_serve_1hlr94c", "Not self-serve:")}</strong> {t("educator_evaluation.a_district_controlled_account_and_authorized_administrator_welrhb", "a district-controlled account and authorized administrator must own this personnel-record deployment. Treat it as a reviewed pilot until backup/restore, retention, rollover, deletion, and owner-transfer procedures are tested.")}</div><ol className="ae-sub" style={{ margin: '12px 0 0 18px', display: 'grid', gap: 8 }}><li>{t("educator_evaluation.district_it_reviews_and_copies_all_four_required_files_fkzs3o", "District IT reviews and copies all four required files, ")}<code>Code.gs</code>, <code>Index.html</code>, <code>Portal.html</code>{t("educator_evaluation.and_1b7kqwq", ", and")} <code>appsscript.json</code>{t("educator_evaluation.from_1fxhykf", ", from")} <code>{t("educator_evaluation.apps_script_educator_evaluation_ueskev", "apps_script/educator_evaluation/")}</code> {t("educator_evaluation.into_a_district_owned_apps_script_project_3nmprm", "into a district-owned Apps Script project.")}</li><li>{t("educator_evaluation.an_administrator_temporarily_adds_the_manual_s_no_argument_ksb8j", "An administrator temporarily adds the manual's no-argument")} <code>runDistrictSetupOnce()</code> {t("educator_evaluation.wrapper_substitutes_the_managed_domain_members_educators_a_3cdw59", "wrapper, substitutes the managed domain, members, educators, and evaluator assignments, runs it once, records the returned IDs, then deletes the wrapper.")}</li><li>{t("educator_evaluation.they_deploy_with_1lehjbi", "They deploy with")} <strong>{t("educator_evaluation.execute_as_me_1e5pvvs", "Execute as: Me")}</strong> and <strong>{t("educator_evaluation.who_has_access_users_in_your_domain_1x8670n", "Who has access: users in your domain")}</strong>{t("educator_evaluation.never_anyone_1qim6am", ", never “Anyone.”")}</li><li>{t("educator_evaluation.they_run_11k1f1u", "They run")} <code>verifyDeploymentIdentity()</code> {t("educator_evaluation.and_the_in_portal_setup_health_checks_then_test_administra_1wdlfsb", "and the in-portal Setup health checks, then test administrator, evaluator, educator, unlisted-domain, and personal-account access before distributing the")} <code>/exec</code> {t("educator_evaluation.link_6bo1qd", "link.")}</li><li>{t("educator_evaluation.users_save_that_reviewed_link_in_project_settings_google_s_9ldvre", "Users save that reviewed link in Project Settings. Google sign-in and server assignments, not possession of the link, decide access.")}</li></ol><p><a className="ae-link" href="https://alloflow-cdn.pages.dev/educator-evaluation-manual#portal" target="_blank" rel="noopener noreferrer">{t("educator_evaluation.open_the_district_deployment_guide_and_setup_wrapper_1c4x75s", "Open the district deployment guide and setup wrapper")}</a></p></section>}
  </>;
}

function AeSimulationStudio({ workspace, onApply }) {
  const [params, setParams] = React.useState(() => aeSimulationDefaults(workspace));
  const [request, setRequest] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [preview, setPreview] = React.useState(null);
  const [undo, setUndo] = React.useState(null);
  const set = (key, value) => { setParams((current) => Object.assign({}, current, { [key]: value })); setPreview(null); };
  const loadScenario = (label, values) => {
    setParams(Object.assign({}, params, values));
    setPreview(null);
    setMessage(label + t("educator_evaluation.loaded_adjust_anything_you_want_then_preview_11oy67b", ' loaded. Adjust anything you want, then preview.'));
  };
  const interpret = () => {
    const parsed = aeParseSimulationRequest(request, params);
    if (!parsed.ok) { setMessage('Try a concrete request such as “18 educators, 3 buildings, 4 overdue, 2 finalized, 2 walkthroughs per educator, thin evidence in Domain 3.”'); return; }
    const correctionText = parsed.corrections.length ? t("educator_evaluation.adjusted_wwt3mn", ' Adjusted ') + parsed.corrections.map((item) => item.label + ' ' + item.requested + ' → ' + item.applied).join('; ') + '.' : '';
    const ignoredText = parsed.ignored.length ? t("educator_evaluation.not_understood_w6h9tf", ' Not understood: ') + parsed.ignored.join(' · ') + '.' : '';
    setParams(parsed.params); setPreview(null); setMessage(t("educator_evaluation.recognized_1s1ikbx", 'Recognized ') + parsed.recognized.join(' · ') + '.' + correctionText + ignoredText + t("educator_evaluation.review_the_controls_then_preview_1rqirrn", ' Review the controls, then preview.'));
  };
  const makePreview = () => { const normalized = aeNormalizeSimulationParams(params); setParams(normalized.params); const next = aeBuildSimulatedWorkspace(normalized.params); setPreview(next); setMessage((normalized.corrections.length ? t("educator_evaluation.applied_safe_limits_193u3qx", 'Applied safe limits: ') + normalized.corrections.map((item) => item.label + ' ' + item.requested + ' → ' + item.applied).join('; ') + '. ' : '') + t("educator_evaluation.preview_is_ready_no_workspace_records_have_changed_6m0x38", 'Preview is ready. No workspace records have changed.')); };
  const apply = () => { if (!preview) return; setUndo(aeClone(workspace)); onApply(preview); setPreview(null); setMessage('Simulation applied. Undo remains available while this Setup page is open.'); };
  const undoApply = () => { if (!undo) return; onApply(undo); setUndo(null); setMessage('Previous simulated workspace restored.'); };
  const summary = preview ? aeSimulationSummary(preview) : null;
  const staffLimit = Math.max(1, Number.parseInt(params.staffCount, 10) || 1);
  const overdueLimit = Math.max(0, staffLimit - Math.max(0, Number.parseInt(params.finalizedCount, 10) || 0));
  const validation = aeNormalizeSimulationParams(params);
  if (!workspace.config.sampleMode) return null;
  return <section className="ae-card ae-span-12"><div className="ae-record-head"><div><h3>{t("educator_evaluation.simulation_studio_1dltzgw", "Simulation Studio")}</h3><p className="ae-sub">{t("educator_evaluation.change_fictional_data_with_plain_language_manual_parameter_1kiciun", "Change fictional data with plain language, manual parameters, or both. Parsing runs locally; no prompt or record is sent to an AI service.")}</p></div><span className="ae-chip ae-chip-purple">{t("educator_evaluation.simulation_only_1oe9pdw", "Simulation only")}</span></div>
    <h4>{t("educator_evaluation.start_with_a_scenario_10uftlc", "Start with a scenario")}</h4><div className="ae-scenario-grid">
      <button type="button" className="ae-btn ae-scenario" onClick={() => loadScenario('Small-school tour', { staffCount: 8, buildingCount: 1, finalizedCount: 2, overdueCount: 1, walkthroughsPerTeacher: 1, thinEvidenceDomain: 'none' })}>{t("educator_evaluation.small_school_tour_15t5cyr", "Small-school tour")}<small>{t("educator_evaluation.8_educators_1_building_balanced_evidence_rnrjg1", "8 educators · 1 building · balanced evidence")}</small></button>
      <button type="button" className="ae-btn ae-scenario" onClick={() => loadScenario('Busy midyear', { staffCount: 24, buildingCount: 3, finalizedCount: 6, overdueCount: 4, walkthroughsPerTeacher: 2, thinEvidenceDomain: 'none' })}>{t("educator_evaluation.busy_midyear_eup7t3", "Busy midyear")}<small>{t("educator_evaluation.24_educators_3_buildings_mixed_progress_lcva5", "24 educators · 3 buildings · mixed progress")}</small></button>
      <button type="button" className="ae-btn ae-scenario" onClick={() => loadScenario('Evidence-gap review', { staffCount: 18, buildingCount: 2, finalizedCount: 2, overdueCount: 3, walkthroughsPerTeacher: 2, thinEvidenceDomain: 'd3' })}>{t("educator_evaluation.evidence_gap_review_um0ihr", "Evidence-gap review")}<small>{t("educator_evaluation.thin_domain_3_evidence_for_coaching_practice_1szj0e4", "Thin Domain 3 evidence for coaching practice")}</small></button>
    </div>
    <label className="ae-field" style={{ marginTop: 12 }}><span>{t("educator_evaluation.describe_the_scenario_168gepn", "Describe the scenario")}</span><textarea className="ae-textarea" value={request} onChange={(event) => setRequest(event.target.value)} placeholder={t("educator_evaluation.example_18_educators_3_buildings_4_overdue_2_finalized_2_w_1dqnuhl", "Example: 18 educators, 3 buildings, 4 overdue, 2 finalized, 2 walkthroughs per educator, thin evidence in Domain 3.")}/></label>
    <button type="button" className="ae-btn" onClick={interpret}>{t("educator_evaluation.interpret_request_locally_bbspgb", "Interpret request locally")}</button>
    <div className="ae-form-grid" style={{ marginTop: 14 }}>
      <label className="ae-field"><span>{t("educator_evaluation.fictional_educators_1uy8xeo", "Fictional educators")}</span><input className="ae-input" type="number" min="1" max="60" value={params.staffCount} onChange={(event) => set('staffCount', event.target.value)}/></label>
      <label className="ae-field"><span>{t("educator_evaluation.buildings_1xa6gia", "Buildings")}</span><input className="ae-input" type="number" min="1" max="8" value={params.buildingCount} onChange={(event) => set('buildingCount', event.target.value)}/></label>
      <label className="ae-field"><span>{t("educator_evaluation.finalized_cycles_wngnug", "Finalized cycles")}</span><input className="ae-input" type="number" min="0" max={staffLimit} value={params.finalizedCount} onChange={(event) => set('finalizedCount', event.target.value)}/><span className="ae-help">{t("educator_evaluation.cannot_exceed_the_fictional_educator_count_uxyeiw", "Cannot exceed the fictional educator count.")}</span></label>
      <label className="ae-field"><span>{t("educator_evaluation.overdue_cycles_27p4iq", "Overdue cycles")}</span><input className="ae-input" type="number" min="0" max={overdueLimit} value={params.overdueCount} onChange={(event) => set('overdueCount', event.target.value)}/><span className="ae-help">{t("educator_evaluation.at_most_1if49dz", "At most")} {overdueLimit} {t("educator_evaluation.after_finalized_cycles_sheag8", "after finalized cycles.")}</span></label>
      <label className="ae-field"><span>{t("educator_evaluation.published_walkthroughs_per_educator_1szdni8", "Published walkthroughs per educator")}</span><input className="ae-input" type="number" min="0" max="8" value={params.walkthroughsPerTeacher} onChange={(event) => set('walkthroughsPerTeacher', event.target.value)}/></label>
      <label className="ae-field"><span>{t("educator_evaluation.framework_ap167f", "Framework")}</span><select className="ae-select" value={params.frameworkProfile} onChange={(event) => set('frameworkProfile', event.target.value)}><option value="pa_act13">Pennsylvania Act 13</option><option value="maine_pepg">Maine PEPG</option><option value="portland_me">{t("educator_evaluation.portland_maine_pepg_b4y7bh", "Portland, Maine PEPG")}</option></select></label>
      <label className="ae-field ae-field-wide"><span>{t("educator_evaluation.make_published_evidence_intentionally_thin_in_w6giba", "Make published evidence intentionally thin in")}</span><select className="ae-select" value={params.thinEvidenceDomain} onChange={(event) => set('thinEvidenceDomain', event.target.value)}><option value="none">{t("educator_evaluation.no_domain_balance_tags_19ba5uo", "No domain; balance tags")}</option><option value="d1">{t("educator_evaluation.domain_1_1om7d5i", "Domain 1")}</option><option value="d2">{t("educator_evaluation.domain_2_1oc7rgj", "Domain 2")}</option><option value="d3">{t("educator_evaluation.domain_3_1o285rk", "Domain 3")}</option><option value="d4">{t("educator_evaluation.domain_4_1q05dmd", "Domain 4")}</option></select></label>
    </div>
    {validation.corrections.length > 0 && <div className="ae-note ae-warn" role="status"><strong>{t("educator_evaluation.values_will_be_normalized_before_preview_5xp9o8", "Values will be normalized before preview:")}</strong><ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>{validation.corrections.map((item) => <li key={item.key}>{item.label}{t("educator_evaluation.requested_1sycnt5", ": requested")} {String(item.requested)} {t("educator_evaluation.applied_1qxue5k", "→ applied")} {String(item.applied)}</li>)}</ul></div>}
    <div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" onClick={makePreview}>{t("educator_evaluation.preview_changes_15p9ypm", "Preview changes")}</button>{undo && <button type="button" className="ae-btn" onClick={undoApply}>{t("educator_evaluation.undo_last_simulation_1va4g3k", "Undo last simulation")}</button>}</div>
    {message && <p className="ae-note" role="status" style={{ marginTop: 10 }}>{message}</p>}
    {summary && <div style={{ marginTop: 14 }}><h4>{t("educator_evaluation.preview_nothing_applied_yet_ocaimg", "Preview · nothing applied yet")}</h4><div className="ae-sim-diff"><div className="ae-stat"><strong>{summary.staff}</strong><span>{t("educator_evaluation.fictional_educators_r8c0lc", "fictional educators")}</span></div><div className="ae-stat"><strong>{summary.buildings}</strong><span>buildings</span></div><div className="ae-stat"><strong>{summary.finalized}</strong><span>finalized</span></div><div className="ae-stat"><strong>{summary.overdue}</strong><span>overdue</span></div><div className="ae-stat"><strong>{summary.walkthroughs}</strong><span>{t("educator_evaluation.published_walkthroughs_1q06270", "published walkthroughs")}</span></div></div><div className="ae-note ae-warn" style={{ marginTop: 10 }}>{t("educator_evaluation.applying_replaces_the_current_1ctk6xo", "Applying replaces the current")} <strong>simulated</strong> {t("educator_evaluation.workspace_including_its_fictional_roster_and_sample_histor_1oss1ha", "workspace, including its fictional roster and sample history. It cannot run in a real workspace.")}</div><button type="button" className="ae-btn ae-btn-primary" onClick={apply} style={{ marginTop: 10 }}>{t("educator_evaluation.apply_this_simulated_scenario_l3yn3f", "Apply this simulated scenario")}</button></div>}
  </section>;
}

function AeShareQr({ isRemote, standalone, portalUrl }) {
  // Only a real web origin is scannable. Under file:// (desktop app, local
  // copy) location would encode a private disk path that no other device can
  // open, so fall back to the canonical published page.
  const loc = typeof window !== 'undefined' ? window.location : null;
  const webOrigin = !!loc && /^https?:$/.test(loc.protocol || '');
  const payload = isRemote
    ? aeString(portalUrl, 400, '')
    : (standalone && webOrigin && /educator-evaluation/.test(loc.pathname || '')
      ? loc.origin + loc.pathname
      : 'https://alloflow-cdn.pages.dev/educator-evaluation');
  const [svg, setSvg] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState('');
  React.useEffect(() => {
    let cancelled = false;
    setSvg('');
    if (!payload) return undefined;
    (async () => {
      try {
        let markup = '';
        if (typeof window !== 'undefined' && typeof window.__alloMakeQrSvg === 'function') {
          markup = await window.__alloMakeQrSvg(payload, 'Educator Evaluation');
        } else if (typeof window !== 'undefined' && typeof window.qrcode === 'function') {
          const qr = window.qrcode(0, 'M');
          qr.addData(payload);
          qr.make();
          markup = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, title: t("educator_evaluation.educator_evaluation_19spn2m", 'Educator Evaluation') });
        }
        if (!cancelled) setSvg(markup);
      } catch (err) { if (!cancelled) setSvg(''); }
    })();
    return () => { cancelled = true; };
  }, [payload]);
  if (!payload) return null;
  return <section className="ae-card ae-span-12" aria-labelledby="ae-share-qr-title"><div className="ae-record-head"><div><h3 id="ae-share-qr-title">{t("educator_evaluation.share_by_qr_h1feeg", "Share by QR")}</h3><p className="ae-sub">{isRemote
    ? t("educator_evaluation.colleagues_scan_this_to_reach_the_district_portal_their_di_o98b88", 'Colleagues scan this to reach the district portal. Their district sign-in still decides what they can see.')
    : t("educator_evaluation.anyone_can_scan_this_to_open_their_own_private_on_device_w_wbqoz1", 'Anyone can scan this to open their own private on-device workspace. Your data is not shared by the code.')}</p></div></div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', marginTop: 10 }}>
      {svg ? <figure style={{ margin: 0 }} aria-label={t("educator_evaluation.qr_code_linking_to_167a0uw", 'QR code linking to ') + payload}><div style={{ width: 176, height: 176, background: '#fff', padding: 6, border: '1px solid #ccd5e2', borderRadius: 10 }} dangerouslySetInnerHTML={{ __html: svg }} /></figure> : <div className="ae-note ae-warn" style={{ maxWidth: 260 }}>{t("educator_evaluation.the_qr_image_could_not_be_rendered_the_selectable_link_rem_1cbaohv", "The QR image could not be rendered. The selectable link remains available.")}</div>}
      <div style={{ minWidth: 220, flex: 1 }}>
        <label className="ae-field"><span>{t("educator_evaluation.share_link_kzs3eg", "Share link")}</span><input className="ae-input" readOnly value={payload} onFocus={(event) => event.target.select()} /></label>
        <button type="button" className="ae-btn" onClick={async () => { try { if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(payload); setCopyError(''); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (err) { setCopied(false); setCopyError('Copy failed. Select the link above and copy it manually.'); } }}>{copied ? t("educator_evaluation.link_copied_foo2qb", 'Link copied') : t("educator_evaluation.copy_link_9zccf0", 'Copy link')}</button>
        {copyError && <p className="ae-help" role="alert">{copyError}</p>}
      </div>
    </div>
  </section>;
}

function aeSetupHealthCount(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

function aeOperationRecoveryPending(result) {
  if (!result || typeof result !== 'object') return false;
  const status = String(result.status || '').toLowerCase();
  return result.recoveryPending === true || result.auditPending === true || result.configurationPending === true || status === 'recovery_pending' || status === 'audit_recovery_pending';
}

function aeArtifactOperationDefinitelyNotStarted(result) {
  return !!result && result.ok !== false && result.status === 'not_started' && result.reviewUsable === false;
}

function aeArtifactOperationCanReset(startedFromUnconfirmed, result) {
  return startedFromUnconfirmed !== true && !!result && result.ok !== false && result.status === 'not_started' && result.reviewUsable === false;
}

function aeUnconfirmedMutationMessage(label, error) {
  const detail = String((error && error.message) || error || '').trim();
  return label + ' outcome could not be confirmed. Do not repeat the operation. Reload current records, run Setup health, and verify the repository or created artifact before preparing a new review.' + (detail ? ' Technical detail: ' + detail : '');
}

function aeRecoverableArtifactOutcomeMessage(label, error) {
  const detail = String((error && error.message) || error || '').trim();
  return label + ' outcome could not be confirmed. Do not start a new review or create another artifact. Select the same confirmation again to check and recover this exact reviewed operation; the server will return the existing verified artifact instead of creating a duplicate.' + (detail ? ' Technical detail: ' + detail : '');
}

function aeArtifactReceiptUnavailableMessage(label, error) {
  const detail = String((error && error.message) || error || '').trim();
  return label + ' exact recovery receipt is no longer available. Keep this reviewed operation locked and do not create another artifact. Run Setup health and ask district IT to inspect the exact private artifact destination and audit ledger before preparing any new review.' + (detail ? ' Technical detail: ' + detail : '');
}

function aeValidReleasedAccessRecoveryReview(review) {
  if (!review || !['all', 'educator'].includes(review.scope) || typeof review.repairable !== 'boolean' || typeof review.manualReviewRequired !== 'boolean' || !review.counts || !Array.isArray(review.effects) || !Array.isArray(review.issueSamples)) return false;
  const fields = ['targetEducators', 'targetDocuments', 'batchDocuments', 'deferredDocuments', 'queuedItems', 'folderQueueItems', 'retirementCandidates', 'unavailableDocuments', 'orphanQueueItems', 'orphanCandidates', 'orphanManualReviewCandidates'];
  return fields.every((field) => Number.isFinite(Number(review.counts[field])) && Number(review.counts[field]) >= 0);
}

function aeValidAuthorizedExportsAclReview(review) {
  if (!review || typeof review.inspectable !== 'boolean' || typeof review.manualReviewRequired !== 'boolean' || typeof review.folderDrift !== 'boolean' || typeof review.status !== 'string') return false;
  return ['fileCount', 'driftedFileCount', 'explicitAccessCount'].every((field) => Number.isFinite(Number(review[field])) && Number(review[field]) >= 0);
}

function aeSetupHealthMetric(checks, ...names) {
  const source = checks && typeof checks.observability === 'object' ? checks.observability : {};
  for (const name of names) {
    if (source[name] !== null && source[name] !== undefined && source[name] !== '') return source[name];
    if (checks && checks[name] !== null && checks[name] !== undefined && checks[name] !== '') return checks[name];
  }
  return null;
}

function aeSetupHealthFreshness(value) {
  const at = Date.parse(String(value || ''));
  if (!Number.isFinite(at)) return t("educator_evaluation.unavailable_20260827", 'Unavailable');
  const minutes = Math.max(0, Math.floor((Date.now() - at) / 60000));
  if (minutes < 2) return t("educator_evaluation.just_checked_20260827", 'Just checked');
  if (minutes < 60) return minutes + t("educator_evaluation.minutes_ago_20260827", ' minutes ago');
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? hours + t("educator_evaluation.hours_ago_20260827", ' hours ago') : Math.floor(hours / 24) + t("educator_evaluation.days_ago_20260827", ' days ago');
}

function AeSetupObservability({ health }) {
  const checks = (health && health.checks) || {};
  const recoveryQueues = health && health.recoveryQueues && typeof health.recoveryQueues === 'object' ? health.recoveryQueues : null;
  const emailQuota = health && health.emailQuota && typeof health.emailQuota === 'object' ? health.emailQuota : {};
  const checkedAt = health && health.checkedAt ? health.checkedAt : aeSetupHealthMetric(checks, 'checkedAt');
  const workspaceRevision = aeSetupHealthMetric(checks, 'workspaceRevision');
  const auditVerified = aeSetupHealthMetric(checks, 'auditChainVerifiedRows', 'auditVerifiedRows');
  const auditTotal = aeSetupHealthMetric(checks, 'auditChainRows', 'auditTotalRows');
  const pendingRecoveryMetric = aeSetupHealthMetric(checks, 'pendingRecoveryTotal');
  const pendingRecoveryTotal = pendingRecoveryMetric !== null
    ? pendingRecoveryMetric
    : (recoveryQueues ? Object.values(recoveryQueues).reduce((sum, queue) => sum + aeSetupHealthCount(queue && queue.count), 0) : null);
  const queueOldestAt = recoveryQueues ? Object.values(recoveryQueues).map((queue) => queue && queue.oldestAt).filter((value) => Number.isFinite(Date.parse(String(value || '')))).sort()[0] || null : null;
  const oldestRecoveryAt = aeSetupHealthMetric(checks, 'oldestRecoveryAt') || queueOldestAt;
  const oldestRecoveryAgeMetric = aeSetupHealthMetric(checks, 'oldestRecoveryAgeHours');
  const oldestRecoveryAgeHours = oldestRecoveryAgeMetric !== null
    ? Number(oldestRecoveryAgeMetric)
    : (oldestRecoveryAt ? Math.max(0, (Date.now() - Date.parse(oldestRecoveryAt)) / 3600000) : null);
  const queuedOperationAudits = aeSetupHealthMetric(checks, 'secondaryOperationAuditCount', 'queuedOperationAuditCount');
  const releaseQueueMetric = aeSetupHealthMetric(checks, 'releaseQueueCount', 'releasedSummaryQueueCount', 'pendingReleaseQueueCount');
  const releaseQueueCount = releaseQueueMetric !== null ? releaseQueueMetric : (recoveryQueues && recoveryQueues.releasedSummary ? recoveryQueues.releasedSummary.count : null);
  const emailQuotaMetric = aeSetupHealthMetric(checks, 'emailQuotaRemaining', 'remainingDailyEmailQuota', 'mailRemainingDailyQuota');
  const emailQuotaRemaining = emailQuotaMetric !== null ? emailQuotaMetric : (emailQuota.remainingDaily == null ? null : emailQuota.remainingDaily);
  const emailQuotaAvailable = (aeSetupHealthMetric(checks, 'emailQuotaAvailable', 'mailQuotaAvailable') === true || emailQuota.available === true) && emailQuotaRemaining !== null;
  const unavailable = t("educator_evaluation.unavailable_20260827", 'Unavailable');
  const auditDisplay = auditVerified === null && auditTotal === null ? unavailable : aeSetupHealthCount(auditVerified, 0) + ' / ' + aeSetupHealthCount(auditTotal, 0);
  const pendingDisplay = pendingRecoveryTotal === null ? unavailable : String(aeSetupHealthCount(pendingRecoveryTotal, 0));
  const oldestDisplay = pendingRecoveryTotal === null
    ? unavailable
    : (aeSetupHealthCount(pendingRecoveryTotal, 0) === 0
      ? t("educator_evaluation.none_pending_20260827", 'None pending')
      : (Number.isFinite(oldestRecoveryAgeHours) ? oldestRecoveryAgeHours.toFixed(oldestRecoveryAgeHours >= 10 ? 0 : 1) + t("educator_evaluation.hours_old_20260827", ' hours old') : unavailable));
  const metrics = [
    { label: t("educator_evaluation.health_checked_at_20260827", 'Health checked at'), value: aeSetupHealthFreshness(checkedAt), detail: checkedAt ? aeDateTime(checkedAt) : unavailable },
    { label: t("educator_evaluation.workspace_revision_20260827", 'Workspace revision'), value: workspaceRevision === null ? unavailable : String(workspaceRevision) },
    { label: t("educator_evaluation.audit_rows_verified_20260827", 'Audit rows verified'), value: auditDisplay, detail: t("educator_evaluation.verified_total_20260827", 'verified / total') },
    { label: t("educator_evaluation.pending_recovery_total_20260827", 'Pending recovery total'), value: pendingDisplay, detail: oldestDisplay + (oldestRecoveryAt ? ' · ' + aeDateTime(oldestRecoveryAt) : '') },
    { label: t("educator_evaluation.queued_operation_audits_20260827", 'Queued operation audits'), value: queuedOperationAudits === null ? unavailable : String(aeSetupHealthCount(queuedOperationAudits, 0)) },
    { label: t("educator_evaluation.release_queue_20260827", 'Release queue'), value: releaseQueueCount === null ? unavailable : String(aeSetupHealthCount(releaseQueueCount, 0)) },
    { label: t("educator_evaluation.daily_email_quota_remaining_20260827", 'Daily email quota remaining'), value: emailQuotaAvailable ? String(aeSetupHealthCount(emailQuotaRemaining, 0)) : unavailable },
  ];
  return <section style={{ marginTop: 14 }} aria-labelledby="ae-setup-observability-title">
    <div className="ae-record-head"><div><h4 id="ae-setup-observability-title">{t("educator_evaluation.repository_observability_20260827", "Repository observability")}</h4><p className="ae-sub">{t("educator_evaluation.repository_observability_detail_20260827", "Operational counts only. No member names, email addresses, evidence, or comments are displayed.")}</p></div></div>
    <div className="ae-grid">{metrics.map((metric) => <div className="ae-span-3 ae-stat" key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span>{metric.detail && <small className="ae-help">{metric.detail}</small>}</div>)}</div>
  </section>;
}

function aeIntegritySampleLabel(sample, label, index) {
  const raw = sample && typeof sample === 'object' ? String(sample.ledger || sample.kind || sample.entityType || '').toLowerCase() : String(sample || '').toLowerCase();
  const ledger = raw.includes('message') ? t("educator_evaluation.message_ledger_20260827", 'message ledger')
    : (raw.includes('audit') ? t("educator_evaluation.audit_ledger_20260827", 'audit ledger')
      : (raw.includes('snapshot') ? t("educator_evaluation.cycle_snapshot_ledger_20260827", 'cycle snapshot ledger') : ''));
  return label + ' ' + (index + 1) + (ledger ? ' · ' + ledger : '');
}

function AeIntegrityRepairReview({ review, acknowledged, onAcknowledge, onConfirm, busy }) {
  const headingRef = React.useRef(null);
  React.useEffect(() => {
    if (review && headingRef.current) headingRef.current.focus();
  }, [review && review.token]);
  if (!review) return null;
  const parity = review.parity && typeof review.parity === 'object' ? review.parity : {};
  const configuration = review.configuration && typeof review.configuration === 'object' ? review.configuration : {};
  const outbox = review.outbox && typeof review.outbox === 'object' ? review.outbox : {};
  const counts = review.counts && typeof review.counts === 'object' ? review.counts : {};
  const samples = review.samples && typeof review.samples === 'object' ? review.samples : {};
  const effectPlan = review.effects && !Array.isArray(review.effects) && typeof review.effects === 'object' ? review.effects : {};
  const count = (name, parityName = name) => counts[name] === null || counts[name] === undefined ? aeSetupHealthCount(parity[parityName], 0) : aeSetupHealthCount(counts[name], 0);
  const comparisonRows = [
    [t("educator_evaluation.messages_20260827", 'Messages'), count('missingMessages'), count('mismatchedMessages'), count('duplicateMessages', 'duplicateMessageIds'), count('ledgerOnlyMessages')],
    [t("educator_evaluation.audit_rows_20260827", 'Audit rows'), count('missingAuditRows'), count('mismatchedAuditRows'), count('duplicateAuditRows', 'duplicateAuditIds'), count('ledgerOnlyAuditRows')],
    [t("educator_evaluation.cycle_snapshots_20260827", 'Cycle snapshots'), count('missingSnapshots'), count('mismatchedSnapshots'), count('duplicateSnapshots', 'duplicateSnapshotIds'), count('ledgerOnlySnapshots')],
  ];
  const issueSamples = Array.isArray(review.issueSamples) ? review.issueSamples.slice(0, 10) : [];
  const structuredSampleGroups = [
    [t("educator_evaluation.mismatch_sample_20260827", 'Mismatch sample'), Array.isArray(samples.mismatched) ? samples.mismatched.slice(0, 5) : []],
    [t("educator_evaluation.duplicate_sample_20260827", 'Duplicate sample'), Array.isArray(samples.duplicates) ? samples.duplicates.slice(0, 5) : []],
    [t("educator_evaluation.ledger_only_snapshot_sample_20260827", 'Ledger-only snapshot sample'), Array.isArray(samples.ledgerOnlySnapshots) ? samples.ledgerOnlySnapshots.slice(0, 5) : []],
  ].filter((entry) => entry[1].length);
  const sampleGroups = structuredSampleGroups.length ? structuredSampleGroups : (issueSamples.length ? [[t("educator_evaluation.issue_sample_20260827", 'Issue sample'), issueSamples]] : []);
  const effectCount = (name) => aeSetupHealthCount(effectPlan[name], 0);
  const fallbackEffects = [
    effectPlan.completePendingCommit && t("educator_evaluation.complete_pending_commit_20260827", 'Complete the reviewed pending canonical commit'),
    effectCount('appendMissingMessageRows') > 0 && t("educator_evaluation.append_missing_message_rows_20260827", 'Append missing message rows') + ': ' + effectCount('appendMissingMessageRows'),
    effectCount('appendMissingAuditRows') > 0 && t("educator_evaluation.append_missing_audit_rows_20260827", 'Append missing audit rows') + ': ' + effectCount('appendMissingAuditRows'),
    effectCount('appendMissingSnapshotRows') > 0 && t("educator_evaluation.append_missing_snapshot_rows_20260827", 'Append missing cycle-snapshot rows') + ': ' + effectCount('appendMissingSnapshotRows'),
    effectCount('appendOperationAuditEntries') > 0 && t("educator_evaluation.append_operation_audit_entries_20260827", 'Append queued operation-audit entries') + ': ' + effectCount('appendOperationAuditEntries'),
    effectCount('clearAlreadyPresentOperationAuditEntries') > 0 && t("educator_evaluation.clear_present_operation_audits_20260827", 'Clear already-present operation-audit recovery entries') + ': ' + effectCount('clearAlreadyPresentOperationAuditEntries'),
    effectPlan.synchronizeAcademicYear && t("educator_evaluation.synchronize_academic_year_projection_20260827", 'Synchronize the academic-year projection'),
  ].filter(Boolean);
  const suppliedEffects = (Array.isArray(review.effects) ? review.effects : []).map((effect) => String(effect || '').replace(/\s+/g, ' ').trim().slice(0, 240)).filter(Boolean).slice(0, 8);
  const effects = suppliedEffects.length ? suppliedEffects : fallbackEffects;
  const repairableItemCount = counts.totalRepairable === null || counts.totalRepairable === undefined ? fallbackEffects.length : aeSetupHealthCount(counts.totalRepairable, 0);
  const ambiguousItemCount = counts.totalAmbiguous === null || counts.totalAmbiguous === undefined ? (review.manualReviewRequired === true ? 1 : 0) : aeSetupHealthCount(counts.totalAmbiguous, 0);
  const configurationMismatch = counts.configurationMismatch === null || counts.configurationMismatch === undefined ? configuration.ok === false : counts.configurationMismatch === true;
  const pendingCommit = counts.pendingCommit === null || counts.pendingCommit === undefined ? effectPlan.completePendingCommit === true : counts.pendingCommit === true;
  const operationAuditEntries = counts.operationAuditEntries === null || counts.operationAuditEntries === undefined ? aeSetupHealthCount(outbox.queued, 0) : aeSetupHealthCount(counts.operationAuditEntries, 0);
  const repairable = review.repairable === true;
  return <section className="ae-card" style={{ marginTop: 14 }} aria-labelledby="ae-ledger-repair-review-title">
    <div className="ae-record-head"><div><h4 id="ae-ledger-repair-review-title" ref={headingRef} tabIndex={-1}>{t("educator_evaluation.ledger_repair_review_20260827", "Ledger repair review")}</h4><p className="ae-sub">{t("educator_evaluation.review_revision_expiry_20260827", "Review snapshot at workspace revision")} {review.revision == null ? t("educator_evaluation.unavailable_20260827", 'Unavailable') : review.revision} · {t("educator_evaluation.expires_20260827", "expires")} {aeDateTime(review.expiresAt)}</p></div><span className={'ae-chip ' + (repairable ? 'ae-chip-good' : 'ae-chip-amber')}>{repairable ? t("educator_evaluation.repairable_20260827", 'Repairable') : t("educator_evaluation.manual_review_20260827", 'Manual review')}</span></div>
    <div className="ae-grid" style={{ marginTop: 10 }}><div className="ae-span-4 ae-stat"><strong>{repairableItemCount}</strong><span>{t("educator_evaluation.repairable_items_20260827", "repairable items")}</span></div><div className="ae-span-4 ae-stat"><strong>{ambiguousItemCount}</strong><span>{t("educator_evaluation.ambiguous_items_20260827", "ambiguous items")}</span></div><div className="ae-span-4 ae-stat"><strong>{review.auditChainIntact === false ? t("educator_evaluation.not_intact_20260827", 'Not intact') : t("educator_evaluation.intact_tvmrgc", 'Intact')}</strong><span>{t("educator_evaluation.audit_chain_20260827", "audit chain")}</span></div></div>
    <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.ledger_parity_comparison_20260827", "Ledger parity comparison")}</caption><thead><tr><th scope="col">{t("educator_evaluation.ledger_20260827", "Ledger")}</th><th scope="col">{t("educator_evaluation.missing_20260827", "Missing")}</th><th scope="col">{t("educator_evaluation.mismatched_20260827", "Mismatched")}</th><th scope="col">{t("educator_evaluation.duplicate_20260827", "Duplicate")}</th><th scope="col">{t("educator_evaluation.ledger_only_20260827", "Ledger-only")}</th></tr></thead><tbody>{comparisonRows.map((row) => <tr key={row[0]}><th scope="row">{row[0]}</th>{row.slice(1).map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table></div>
    <div className="ae-chips" style={{ marginTop: 10 }}><span className="ae-chip ae-chip-neutral">{t("educator_evaluation.queued_operation_audits_20260827", "Queued operation audits")} · {operationAuditEntries}</span><span className="ae-chip ae-chip-neutral">{t("educator_evaluation.configuration_mismatch_20260827", "Configuration mismatch")} · {configurationMismatch ? t("educator_evaluation.yes_1dudzcg", 'Yes') : t("educator_evaluation.no_20260827", 'No')}</span><span className="ae-chip ae-chip-neutral">{t("educator_evaluation.pending_commit_20260827", "Pending commit")} · {pendingCommit ? t("educator_evaluation.yes_1dudzcg", 'Yes') : t("educator_evaluation.no_20260827", 'No')}</span></div>
    {sampleGroups.length > 0 && <div style={{ marginTop: 12 }}><strong>{t("educator_evaluation.bounded_issue_samples_20260827", "Bounded issue samples")}</strong><p className="ae-help">{t("educator_evaluation.sample_categories_no_pii_20260827", "Categories and ordinals only; no educator names, emails, evidence, or comments.")}</p><ul className="ae-sub">{sampleGroups.flatMap(([label, items]) => items.map((sample, index) => <li key={label + '-' + index}>{aeIntegritySampleLabel(sample, label, index)}</li>))}</ul></div>}
    {effects.length > 0 && <div style={{ marginTop: 12 }}><strong>{t("educator_evaluation.reviewed_repair_effects_20260827", "Reviewed repair effects")}</strong><ul className="ae-sub">{effects.map((effect, index) => <li key={index}>{effect}</li>)}</ul></div>}
    {!repairable && <div className="ae-note ae-danger" role="status" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.automatic_ledger_repair_unavailable_20260827", "Automatic ledger repair is unavailable.")}</strong> {t("educator_evaluation.district_it_manual_ledger_review_20260827", "District IT must inspect the ambiguous parity items or audit-chain break and complete a manual repository review. This screen will not submit a repair.")}</div>}
    {repairable && review.manualReviewRequired && <div className="ae-note ae-warn" role="status" style={{ marginTop: 12 }}>{t("educator_evaluation.repairable_items_with_manual_followup_20260827", "The reviewed repair can restore deterministic items, but district IT must still resolve the separately identified ambiguous items.")}</div>}
    <fieldset disabled={!repairable || busy} style={{ border: 0, padding: 0, margin: '12px 0 0' }}><legend className="ae-legend-label">{t("educator_evaluation.repair_confirmation_20260827", "Repair confirmation")}</legend><label className="ae-check"><input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledge(event.target.checked)}/><span>{t("educator_evaluation.reviewed_ledger_repair_acknowledgment_20260827", "I reviewed the bounded parity counts, issue samples, repair effects, audit-chain state, and workspace revision shown above.")}</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!repairable || !acknowledged || busy} onClick={onConfirm}>{busy ? t("educator_evaluation.reconciling_workspace_ledgers_20260826", 'Reconciling workspace ledgers…') : t("educator_evaluation.confirm_reviewed_repair_20260827", 'Confirm reviewed repair')}</button></fieldset>
  </section>;
}

function AeReleasedAccessRecoveryReview({ review, acknowledged, onAcknowledge, onConfirm, busy }) {
  const headingRef = React.useRef(null);
  React.useEffect(() => {
    if (headingRef.current) headingRef.current.focus();
  }, [review && review.token]);
  const counts = review && review.counts && typeof review.counts === 'object' ? review.counts : {};
  const effects = review && Array.isArray(review.effects) ? review.effects : [];
  const issueSamples = review && Array.isArray(review.issueSamples) ? review.issueSamples : [];
  const manualReviewRequired = !review || review.manualReviewRequired === true || review.repairable !== true;
  const countItems = [
    [t('educator_evaluation.target_educators_20260827', 'Target educators'), counts.targetEducators],
    [t('educator_evaluation.target_documents_20260827', 'Target documents'), counts.targetDocuments],
    [t('educator_evaluation.documents_in_this_batch_20260827', 'Documents in this batch'), counts.batchDocuments],
    [t('educator_evaluation.deferred_documents_20260827', 'Deferred documents'), counts.deferredDocuments],
    [t('educator_evaluation.queued_recovery_items_20260827', 'Queued recovery items'), counts.queuedItems],
    [t('educator_evaluation.folder_recovery_items_20260827', 'Folder recovery items'), counts.folderQueueItems],
    [t('educator_evaluation.retirement_candidates_20260827', 'Retirement candidates'), counts.retirementCandidates],
    [t('educator_evaluation.unavailable_documents_20260827', 'Unavailable documents'), counts.unavailableDocuments],
    [t('educator_evaluation.orphan_queue_items_20260827', 'Unregistered queue items'), counts.orphanQueueItems],
    [t('educator_evaluation.orphan_candidates_20260827', 'Reviewed quarantine candidates'), counts.orphanCandidates],
    [t('educator_evaluation.orphan_manual_review_candidates_20260827', 'Quarantine candidates needing district IT'), counts.orphanManualReviewCandidates],
  ];
  return <section className="ae-note ae-warn" style={{ marginTop: 12 }} aria-labelledby="ae-released-access-recovery-review-title">
    <h4 id="ae-released-access-recovery-review-title" ref={headingRef} tabIndex={-1}>{t('educator_evaluation.released_summary_access_recovery_review_20260827', 'Released-summary access recovery review')}</h4>
    <p className="ae-sub">{t('educator_evaluation.released_access_review_content_free_20260827', 'This read-only preview contains aggregate counts and bounded issue categories only. It never displays educator names, member emails, document IDs, or document content.')}</p>
    <div className="ae-actions" style={{ marginTop: 10 }}><span className="ae-chip ae-chip-neutral">{t('educator_evaluation.scope_20260827', 'Scope')} · {review.scope === 'educator' ? t('educator_evaluation.one_educator_20260827', 'One educator') : t('educator_evaluation.all_released_summaries_20260827', 'All released summaries')}</span><span className="ae-chip ae-chip-neutral">{t('educator_evaluation.workspace_revision_20260827', 'Workspace revision')} · {review.revision == null ? t('educator_evaluation.unavailable_20260827', 'Unavailable') : review.revision}</span></div>
    <div className="ae-actions" style={{ marginTop: 10 }}>{countItems.map(([label, value]) => <span className="ae-chip ae-chip-neutral" key={label}>{label} · {aeSetupHealthCount(value)}</span>)}</div>
    {issueSamples.length > 0 && <div style={{ marginTop: 12 }}><strong>{t('educator_evaluation.bounded_access_issue_categories_20260827', 'Bounded access issue categories')}</strong><ul className="ae-sub">{issueSamples.map((sample, index) => <li key={index}>{String((sample && sample.category) || t('educator_evaluation.access_policy_issue_20260827', 'Access policy issue')).replace(/_/g, ' ')} · {t('educator_evaluation.item_20260827', 'item')} {aeSetupHealthCount(sample && sample.ordinal, index + 1)}</li>)}</ul></div>}
    {effects.length > 0 && <div style={{ marginTop: 12 }}><strong>{t('educator_evaluation.reviewed_access_recovery_effects_20260827', 'Reviewed access-recovery effects')}</strong><ul className="ae-sub">{effects.map((effect, index) => <li key={index}>{effect}</li>)}</ul></div>}
    {manualReviewRequired && <div className="ae-note ae-danger" role="status" style={{ marginTop: 12 }}><strong>{t('educator_evaluation.automatic_access_recovery_unavailable_20260827', 'Automatic access recovery is unavailable.')}</strong> {t('educator_evaluation.district_it_inspect_released_access_20260827', 'District IT must inspect the identified access-policy category before any automated changes can be confirmed.')}</div>}
    <fieldset disabled={manualReviewRequired || busy} style={{ border: 0, padding: 0, margin: '12px 0 0' }}><legend className="ae-legend-label">{t('educator_evaluation.access_recovery_confirmation_20260827', 'Access recovery confirmation')}</legend><label className="ae-check"><input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledge(event.target.checked)}/><span>{t('educator_evaluation.reviewed_access_policy_acknowledgment_20260827', 'I reviewed the scope, aggregate counts, bounded issue categories, effects, workspace revision, and expiration shown above.')}</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={manualReviewRequired || !acknowledged || busy} onClick={onConfirm}>{busy ? t('educator_evaluation.reconciling_released_summary_access_20260827', 'Reconciling released-summary access…') : t('educator_evaluation.confirm_reviewed_access_recovery_20260827', 'Confirm reviewed access recovery')}</button></fieldset>
    <p className="ae-help">{t('educator_evaluation.review_expires_1t7v0zx', 'Review expires')} {aeDateTime(review.expiresAt)}. {t('educator_evaluation.access_review_stale_after_workspace_change_20260827', 'Any relevant workspace or access-policy change makes it stale.')}</p>
  </section>;
}

function AeSetupHealth({ repository }) {
  const [state, setState] = React.useState({ status: 'idle', result: null, review: null, acknowledged: false, error: '', message: '', messageTone: '' });
  const [accessState, setAccessState] = React.useState({ status: 'idle', review: null, acknowledged: false, error: '', message: '', messageTone: '', result: null });
  const accessBusy = ['reviewing', 'reconciling'].includes(accessState.status);
  const run = async () => {
    if (['running', 'reviewing', 'reconciling'].includes(state.status)) return;
    setState({ status: 'running', result: null, review: null, acknowledged: false, error: '', message: '' });
    try {
      const result = await repository.getSetupHealth();
      if (!result || result.ok === false) throw new Error((result && (result.error || result.message)) || t("educator_evaluation.the_setup_health_check_could_not_run_1m3fhyu", 'The setup health check could not run.'));
      setState({ status: 'done', result, review: null, acknowledged: false, error: '', message: '' });
    } catch (error) {
      setState({ status: 'error', result: null, review: null, acknowledged: false, error: String((error && error.message) || error), message: '' });
    }
  };
  const reviewRepair = async () => {
    if (!state.result || ['running', 'reviewing', 'reconciling'].includes(state.status) || typeof repository.reviewWorkspaceIntegrity !== 'function') return;
    setState((current) => ({ ...current, status: 'reviewing', review: null, acknowledged: false, error: '', message: '' }));
    try {
      const response = await repository.reviewWorkspaceIntegrity();
      const ticket = response && response.review;
      if (!response || response.ok === false || !ticket || !ticket.token) throw new Error((response && (response.error || response.message)) || t("educator_evaluation.ledger_repair_review_unavailable_20260827", 'The ledger repair review could not be prepared.'));
      const review = Object.assign({}, response, ticket);
      setState((current) => ({ ...current, status: 'done', review, acknowledged: false, error: '', message: '' }));
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', review: null, acknowledged: false, error: String((error && error.message) || error), message: '' }));
    }
  };
  const confirmRepair = async () => {
    const review = state.review;
    if (!review || review.repairable !== true || !state.acknowledged || accessBusy || ['running', 'reviewing', 'reconciling'].includes(state.status) || typeof repository.reconcileWorkspaceIntegrity !== 'function') return;
    setState((current) => ({ ...current, status: 'reconciling', error: '', message: '' }));
    let repair;
    try {
      repair = await repository.reconcileWorkspaceIntegrity({ reviewToken: review.token, acknowledgeRepair: true });
      if (!repair || repair.ok === false) throw new Error((repair && (repair.error || repair.message)) || t('educator_evaluation.workspace_ledger_repair_unconfirmed_20260827', 'The workspace ledger repair was not confirmed.'));
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', review: null, acknowledged: false, error: String((error && error.message) || error), message: '' }));
      return;
    }
    try {
      const result = await repository.getSetupHealth();
      const message = repair.status === 'manual_review_required'
        ? t('educator_evaluation.recoverable_workspace_ledgers_were_reconciled_but_district_it_review_is_still_required_20260826', 'Recoverable workspace ledgers were reconciled, but district IT review is still required for an ambiguous legacy or overflow item.')
        : (repair.status === 'recovery_pending'
          ? t('educator_evaluation.some_workspace_ledger_recovery_work_remains_20260826', 'Some workspace ledger recovery work remains. Run Setup health again after the underlying service is available, then prepare a new repair review.')
          : (repair.status === 'none'
            ? t('educator_evaluation.no_pending_workspace_ledger_recovery_was_found_20260826', 'No pending workspace ledger recovery was found.')
            : t('educator_evaluation.workspace_ledger_reconciliation_completed_and_was_verified_20260826', 'Workspace ledger reconciliation completed and was verified.')));
      setState({ status: 'done', result, review: null, acknowledged: false, error: '', message, messageTone: aeOperationRecoveryPending(repair) || repair.status === 'manual_review_required' ? 'warn' : 'ok' });
    } catch (error) {
      const message = aeOperationRecoveryPending(repair)
        ? t('educator_evaluation.ledger_repair_returned_recovery_pending_health_refresh_failed_20260827', 'The reviewed ledger repair returned with recovery still pending, but Setup health could not refresh. Do not repeat the repair; run Setup health again and prepare a new review only for the remaining work.')
        : t('educator_evaluation.ledger_repair_returned_health_refresh_failed_20260827', 'The reviewed ledger repair returned successfully, but Setup health could not refresh. Do not repeat the repair; run Setup health again to verify the current repository state.');
      setState((current) => ({ ...current, status: 'done', review: null, acknowledged: false, error: '', message, messageTone: 'warn' }));
    }
  };
  const reviewReleasedAccess = async () => {
    if (!state.result || accessBusy || ['running', 'reviewing', 'reconciling'].includes(state.status) || typeof repository.reviewReleasedAccessRecovery !== 'function') return;
    setAccessState({ status: 'reviewing', review: null, acknowledged: false, error: '', message: '', result: null });
    try {
      const response = await repository.reviewReleasedAccessRecovery({});
      const ticket = response && response.review;
      if (!response || response.ok === false || !ticket || !ticket.token || !aeValidReleasedAccessRecoveryReview(ticket)) throw new Error((response && (response.error || response.message)) || t('educator_evaluation.released_access_review_incomplete_20260827', 'The released-summary access recovery review was incomplete. Ask district IT to deploy the current portal and Apps Script package before confirming recovery.'));
      const review = Object.assign({}, response, ticket);
      setAccessState({ status: 'reviewed', review, acknowledged: false, error: '', message: '', result: null });
    } catch (error) {
      setAccessState({ status: 'error', review: null, acknowledged: false, error: String((error && error.message) || error), message: '', result: null });
    }
  };
  const confirmReleasedAccess = async () => {
    const review = accessState.review;
    if (!review || review.manualReviewRequired === true || review.repairable !== true || !accessState.acknowledged || accessBusy || ['running', 'reviewing', 'reconciling'].includes(state.status) || typeof repository.reconcileReleasedAccess !== 'function') return;
    setAccessState((current) => ({ ...current, status: 'reconciling', error: '', message: '' }));
    let recovery;
    try {
      recovery = await repository.reconcileReleasedAccess({ reviewToken: review.token, acknowledgeAccessPolicy: true });
      if (!recovery || recovery.ok === false) throw new Error((recovery && (recovery.error || recovery.message)) || t('educator_evaluation.released_access_recovery_unconfirmed_20260827', 'Released-summary access recovery was not confirmed.'));
    } catch (error) {
      setAccessState({ status: 'error', review: null, acknowledged: false, error: String((error && error.message) || error), message: '', result: null });
      return;
    }
    try {
      const result = await repository.getSetupHealth();
      const recoveryPending = !!(result && result.checks && result.checks.releasedSummaryRecoveryRequired);
      setState({ status: 'done', result, review: null, acknowledged: false, error: '', message: '' });
      setAccessState({ status: 'completed', review: null, acknowledged: false, error: '', result: recovery, message: recoveryPending ? t('educator_evaluation.released_access_recovery_work_remains_20260827', 'The reviewed batch completed, but released-summary access recovery work remains. Prepare a new review for the next bounded batch.') : t('educator_evaluation.released_access_recovery_verified_20260827', 'Released-summary access recovery completed and Setup health verified that no recovery item remains.'), messageTone: recoveryPending ? 'warn' : 'ok' });
    } catch (error) {
      const message = aeOperationRecoveryPending(recovery)
        ? t('educator_evaluation.released_access_returned_pending_health_refresh_failed_20260827', 'The reviewed access-recovery batch returned with recovery still pending, but Setup health could not refresh. Do not repeat this batch; run Setup health and prepare a new review only for the remaining work.')
        : t('educator_evaluation.released_access_returned_health_refresh_failed_20260827', 'The reviewed access recovery returned successfully, but Setup health could not refresh. Do not repeat the recovery; run Setup health again to verify the current access state.');
      setAccessState({ status: 'completed', review: null, acknowledged: false, error: '', message, messageTone: 'warn', result: recovery });
    }
  };
  const checks = state.result && state.result.checks;
  const parityCounts = checks ? {
    missing: aeSetupHealthCount(checks.secondaryMissingMessageCount) + aeSetupHealthCount(checks.secondaryMissingAuditCount) + aeSetupHealthCount(checks.secondaryMissingSnapshotCount),
    mismatched: aeSetupHealthCount(checks.secondaryMismatchedMessageCount) + aeSetupHealthCount(checks.secondaryMismatchedAuditCount) + aeSetupHealthCount(checks.secondaryMismatchedSnapshotCount),
    duplicate: aeSetupHealthCount(checks.secondaryDuplicateMessageIdCount) + aeSetupHealthCount(checks.secondaryDuplicateAuditIdCount) + aeSetupHealthCount(checks.secondaryDuplicateSnapshotIdCount),
    ledgerOnlySnapshots: aeSetupHealthCount(checks.secondaryLedgerOnlySnapshotCount),
    historicalLedgerOnly: aeSetupHealthCount(checks.secondaryLedgerOnlyMessageCount) + aeSetupHealthCount(checks.secondaryLedgerOnlyAuditCount),
    ambiguous: aeSetupHealthCount(checks.secondaryAmbiguousIssueCount),
  } : { missing: 0, mismatched: 0, duplicate: 0, ledgerOnlySnapshots: 0, historicalLedgerOnly: 0, ambiguous: 0 };
  const parityIssueTotal = parityCounts.missing + parityCounts.mismatched + parityCounts.duplicate + parityCounts.ledgerOnlySnapshots + parityCounts.ambiguous;
  const parityFingerprint = checks && checks.secondaryParityFingerprint ? String(checks.secondaryParityFingerprint).slice(0, 16) : '';
  const rows = checks ? [
    ['Workspace commit journal', checks.workspaceCommitRecoveryRequired ? t('educator_evaluation.pending_primary_commit_review_ledger_repair_20260827', 'Pending primary commit; prepare a ledger repair review before another dependent operation') : t('educator_evaluation.no_pending_primary_workspace_commit_20260826', 'No pending primary workspace commit'), !checks.workspaceCommitRecoveryRequired],
    ['Workspace derived ledgers', checks.secondaryManualReviewRequired || parityCounts.ambiguous > 0
      ? t('educator_evaluation.district_it_review_required_for_ambiguous_secondary_recovery_metadata_20260826', 'District IT review required for ambiguous or non-deterministic ledger parity')
      : (checks.secondaryInspectionUnavailable
        ? t('educator_evaluation.workspace_ledgers_could_not_be_inspected_until_the_pending_commit_is_repaired_20260826', 'Workspace ledgers could not be inspected until the pending commit is repaired')
        : (checks.secondaryReconciliationRequired || parityIssueTotal > 0
        ? t('educator_evaluation.ledger_parity_review_needed_20260827', 'Ledger parity review needed') + ' · ' + parityCounts.missing + ' missing · ' + parityCounts.mismatched + ' mismatched · ' + parityCounts.duplicate + ' duplicate · ' + parityCounts.ledgerOnlySnapshots + ' ledger-only snapshot · ' + parityCounts.ambiguous + ' ambiguous · ' + aeSetupHealthCount(checks.secondaryOperationAuditCount) + ' queued operation audit' + (parityCounts.historicalLedgerOnly ? ' · ' + parityCounts.historicalLedgerOnly + ' historical Message/Audit extra (informational)' : '') + (parityFingerprint ? ' · fingerprint ' + parityFingerprint : '')
        : t('educator_evaluation.all_canonical_ledger_ids_and_the_academic_year_projection_are_present_20260826', 'All canonical message, audit, and snapshot entries and the academic-year projection match') + (parityCounts.historicalLedgerOnly ? ' · ' + parityCounts.historicalLedgerOnly + ' historical Message/Audit extra (informational)' : ''))), !(checks.secondaryManualReviewRequired || checks.secondaryInspectionUnavailable || checks.secondaryReconciliationRequired || parityIssueTotal > 0)],
    ['District domain configured', checks.allowedDomain ? t("educator_evaluation.yes_5c7udh", 'Yes · ') + checks.allowedDomain : t("educator_evaluation.no_run_setup_with_alloweddomain_6z9nda", 'No, run setup with allowedDomain'), !!checks.allowedDomain],
    ['Portal web-app URL known', checks.webAppUrlConfigured ? t("educator_evaluation.yes_1dudzcg", 'Yes') : t("educator_evaluation.no_deploy_as_a_web_app_and_re_run_setup_1juiha4", 'No, deploy as a web app and re-run setup'), !!checks.webAppUrlConfigured],
    ['Repository Drive folder reachable', checks.repositoryFolderAccessible ? t("educator_evaluation.yes_1dudzcg", 'Yes') : t("educator_evaluation.no_the_service_cannot_open_its_own_folder_ucy0pn", 'No, the service cannot open its own folder'), !!checks.repositoryFolderAccessible],
    ['Workspace integrity metadata', checks.workspaceMetadataIntact ? t("educator_evaluation.intact_revision_vlyglw", 'Intact · revision ') + checks.workspaceRevision : t("educator_evaluation.missing_re_run_setup_as_the_bootstrap_administrator_laokq3", 'Missing, re-run setup as the bootstrap administrator'), !!checks.workspaceMetadataIntact],
    ['Deployment owner continuity', checks.deploymentOwnerMatchesBootstrapAdmin ? t("educator_evaluation.current_deployment_owner_matches_the_bootstrap_administrat_9xs437", 'Current deployment owner matches the bootstrap administrator') : t("educator_evaluation.needs_district_it_review_the_effective_deployment_owner_no_12ht6g8", 'Needs district IT review, the effective deployment owner no longer matches the bootstrap administrator; verify Drive and Apps Script custody before rollover or handoff'), !!checks.deploymentOwnerMatchesBootstrapAdmin],
    ['Released-summary recovery', checks.releasedSummaryRecoveryRequired ? t("educator_evaluation.needs_administrator_review_inspect_the_released_evaluation_x8128a", 'Needs administrator review, inspect the Released evaluations folder and pending repository commit before another release') : t("educator_evaluation.no_unresolved_release_recovery_item_ybjqy2", 'No unresolved release recovery item'), !checks.releasedSummaryRecoveryRequired],
    ['Annual rollover recovery', checks.annualRolloverRecoveryRequired ? t("educator_evaluation.stop_and_use_recheck_interrupted_rollover_in_the_annual_ro_1u3xjpb", 'Stop and use Recheck interrupted rollover in the Annual rollover center before another attempt') : (checks.lastAnnualRolloverAt ? t("educator_evaluation.no_unresolved_item_last_completed_1ngrybu", 'No unresolved item · last completed ') + checks.lastAnnualRolloverFromYear + ' → ' + checks.lastAnnualRolloverToYear + ' on ' + aeDateTime(checks.lastAnnualRolloverAt) : t("educator_evaluation.no_unresolved_annual_rollover_item_1jav5ag", 'No unresolved annual rollover item')), !checks.annualRolloverRecoveryRequired],
    ['Active members', (checks.memberCounts.admin + t("educator_evaluation.admin_1i7bott", ' admin · ') + checks.memberCounts.evaluator + t("educator_evaluation.evaluator_2xsigr", ' evaluator · ') + checks.memberCounts.teacher + ' teacher' + (checks.memberCounts.inactive ? ' · ' + checks.memberCounts.inactive + ' inactive' : '')), checks.memberCounts.admin > 0],
    ['Educators with a portal account', (checks.activeEducators - checks.educatorsWithoutMemberAccount) + ' of ' + checks.activeEducators + (checks.educatorsWithoutMemberAccount ? ', ' + checks.educatorsWithoutMemberAccount + t("educator_evaluation.cannot_sign_in_or_receive_shared_summaries_yet_gl84td", ' cannot sign in or receive shared summaries yet') : ''), checks.educatorsWithoutMemberAccount === 0],
    ['Audit log integrity', checks.auditChainIntact
      ? t("educator_evaluation.intact_tvmrgc", 'Intact. ') + checks.auditChainRows + t("educator_evaluation.entries_re_hashed_and_linked_16wn6nm", ' entries re-hashed and linked.')
      : (checks.auditChainBreakReason === 'unavailable'
        ? t("educator_evaluation.could_not_be_checked_open_the_audit_sheet_and_confirm_it_e_1d9ufm8", 'Could not be checked. Open the audit sheet and confirm it exists.')
        : t("educator_evaluation.broken_at_sheet_row_s6flm", 'Broken at sheet row ') + checks.auditChainBrokenAtRow + ' (' + (checks.auditChainBreakReason === 'link' ? t("educator_evaluation.a_row_was_deleted_inserted_or_reordered_cey017", 'a row was deleted, inserted, or reordered') : t("educator_evaluation.a_row_was_edited_after_it_was_written_4lwa6r", 'a row was edited after it was written')) + t("educator_evaluation.investigate_and_restore_from_a_reviewed_backup_1u2x1vu", '). Investigate and restore from a reviewed backup.')),
      !!checks.auditChainIntact],
    ['Educators with an assigned evaluator', (checks.activeEducators - checks.educatorsWithoutEvaluatorAssignment) + ' of ' + checks.activeEducators + (checks.educatorsWithoutEvaluatorAssignment ? t("educator_evaluation.assign_evaluators_before_their_cycles_begin_nwanr1", ', assign evaluators before their cycles begin') : ''), checks.educatorsWithoutEvaluatorAssignment === 0],
    ['Private artifact recovery', checks.artifactRecoveryManualRequired
      ? t('educator_evaluation.artifact_recovery_manual_review_20260827', 'Manual district IT review required; verify the recovery journal, exact Drive artifact, owner-only custody, and audit entry before any new export or restore candidate')
      : (checks.artifactRecoveryRequired
        ? t('educator_evaluation.artifact_recovery_exact_replay_20260827', 'An export or restore-candidate outcome is pending. In the original unchanged tab, use Check exact outcome with the retained review; if that review is unavailable, stop and have district IT perform manual recovery')
        : t('educator_evaluation.no_unresolved_artifact_operation_20260827', 'No unresolved private export or restore-candidate operation')), !checks.artifactRecoveryRequired],
  ] : [];
  const busy = ['running', 'reviewing', 'reconciling'].includes(state.status) || accessBusy;
  return <section className="ae-card ae-span-12" aria-busy={busy ? 'true' : undefined}><div className="ae-record-head"><div><h3>{t("educator_evaluation.setup_health_1dy2p2g", "Setup health")}</h3><p className="ae-sub">{t("educator_evaluation.setup_health_read_only_counts_20260827", "Read-only bootstrap, parity, and operations checks. Counts and bounded categories only; never member emails, educator names, evidence, or comments.")}</p></div>
    <div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={busy} onClick={run}>{state.status === 'running' ? t("educator_evaluation.checking_vyewnp", 'Checking…') : t("educator_evaluation.run_setup_health_check_jz903f", 'Run setup health check')}</button><button type="button" className="ae-btn" disabled={busy || !checks || typeof repository.reviewWorkspaceIntegrity !== 'function'} onClick={reviewRepair}>{state.status === 'reviewing' ? t('educator_evaluation.reviewing_ledger_parity_20260827', 'Reviewing ledger parity…') : t('educator_evaluation.review_ledger_repair_20260827', 'Review ledger repair')}</button><button type="button" className="ae-btn" disabled={busy || !checks || typeof repository.reviewReleasedAccessRecovery !== 'function'} onClick={reviewReleasedAccess}>{accessState.status === 'reviewing' ? t('educator_evaluation.reviewing_released_access_20260827', 'Reviewing released access…') : t('educator_evaluation.review_released_access_recovery_20260827', 'Review released-access recovery')}</button></div></div>
    {state.status === 'error' && <div className="ae-note ae-danger" role="alert" style={{ marginTop: 10 }}>{state.error}</div>}
    {state.message && <div className={'ae-note ' + (state.messageTone === 'warn' || (checks && checks.secondaryReconciliationRequired) ? 'ae-warn' : 'ae-ok')} role="status" aria-live="polite" style={{ marginTop: 10 }}>{state.message}</div>}
    {accessState.error && <div className="ae-note ae-danger" role="alert" style={{ marginTop: 10 }}>{accessState.error}</div>}
    {accessState.message && <div className={'ae-note ' + (accessState.messageTone === 'warn' || (checks && checks.releasedSummaryRecoveryRequired) ? 'ae-warn' : 'ae-ok')} role="status" aria-live="polite" style={{ marginTop: 10 }}>{accessState.message}</div>}
    {checks && <AeSetupObservability health={state.result}/>}
    {accessState.review && <AeReleasedAccessRecoveryReview review={accessState.review} acknowledged={accessState.acknowledged} onAcknowledge={(acknowledged) => setAccessState((current) => ({ ...current, acknowledged }))} onConfirm={confirmReleasedAccess} busy={accessState.status === 'reconciling' || ['running', 'reviewing', 'reconciling'].includes(state.status)}/>}
    {state.review && <AeIntegrityRepairReview review={state.review} acknowledged={state.acknowledged} onAcknowledge={(acknowledged) => setState((current) => ({ ...current, acknowledged }))} onConfirm={confirmRepair} busy={state.status === 'reconciling' || accessBusy}/>}
    {checks && <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.setup_health_results_13s7jsm", "Setup health results")}</caption><thead><tr><th scope="col">{t("educator_evaluation.check_oqqg2v", "Check")}</th><th scope="col">{t("educator_evaluation.result_ma0s3o", "Result")}</th><th scope="col">{t("educator_evaluation.status_3pd73", "Status")}</th></tr></thead><tbody>
      {rows.map(([label, detail, ok]) => <tr key={label}><th scope="row">{label}</th><td>{detail}</td><td>{ok ? <span className="ae-chip ae-chip-good">OK</span> : <span className="ae-chip ae-chip-amber">{t("educator_evaluation.needs_attention_pwuroc", "Needs attention")}</span>}</td></tr>)}
    </tbody></table></div>}
  </section>;
}

function aeNextAcademicYear(value) {
  const match = String(value || '').replace(/[, ]/g, '-').match(/^(\d{4})-(\d{2})$/);
  if (!match) return '';
  const start = Number(match[1]) + 1;
  return start + '-' + String(start + 1).slice(-2);
}

function AeDistrictOperations({ workspace, repository, onReload }) {
  const [directoryState, setDirectoryState] = React.useState({ status: 'loading', directory: null, error: '' });
  const [memberDraft, setMemberDraft] = React.useState({ email: '', displayName: '', role: 'teacher', teacherId: '', active: true });
  const [assignmentDraft, setAssignmentDraft] = React.useState({ teacherId: '', evaluatorEmail: '', active: true });
  const [directoryReview, setDirectoryReview] = React.useState(null);
  const [directoryDraftFingerprint, setDirectoryDraftFingerprint] = React.useState('');
  const [directoryAck, setDirectoryAck] = React.useState(false);
  const [directoryBusy, setDirectoryBusy] = React.useState(false);
  const [directoryNotice, setDirectoryNotice] = React.useState({ tone: '', text: '' });
  const [scheduleDraft, setScheduleDraft] = React.useState({ dueDate: '', applyTo: 'missing', building: '' });
  const [scheduleState, setScheduleState] = React.useState({ status: 'idle', review: null, error: '', result: null });
  const [scheduleAck, setScheduleAck] = React.useState(false);
  const [exportDraft, setExportDraft] = React.useState({ scope: 'status_csv', teacherId: '', purpose: '' });
  const [exportState, setExportState] = React.useState({ status: 'idle', review: null, error: '', result: null });
  const [exportAck, setExportAck] = React.useState(false);
  const [archiveState, setArchiveState] = React.useState({ status: 'idle', archives: [], review: null, error: '', result: null });
  const [rehearsalAck, setRehearsalAck] = React.useState(false);
  const directoryReviewHeadingRef = React.useRef(null);
  const scheduleReviewHeadingRef = React.useRef(null);
  const exportReviewHeadingRef = React.useRef(null);
  const rehearsalReviewHeadingRef = React.useRef(null);
  const focusedReviewTokensRef = React.useRef({ directory: '', schedule: '', export: '', rehearsal: '' });
  const reviewPreparationRef = React.useRef(false);
  const directoryReviewToken = directoryReview && directoryReview.token;
  const scheduleReviewToken = scheduleState.review && scheduleState.review.token;
  const exportReviewToken = exportState.review && exportState.review.token;
  const rehearsalReviewToken = archiveState.review && archiveState.review.token;

  React.useEffect(() => {
    const scheduledFrames = [];
    [
      ['directory', directoryReviewToken, directoryReviewHeadingRef],
      ['schedule', scheduleReviewToken, scheduleReviewHeadingRef],
      ['export', exportReviewToken, exportReviewHeadingRef],
      ['rehearsal', rehearsalReviewToken, rehearsalReviewHeadingRef],
    ].forEach(([kind, token, headingRef]) => {
      const exactToken = String(token || '');
      if (!exactToken || focusedReviewTokensRef.current[kind] === exactToken) return;
      const focusHeading = () => {
        const heading = headingRef.current;
        if (!heading || typeof heading.focus !== 'function') return;
        const disclosure = typeof heading.closest === 'function' ? heading.closest('details') : null;
        if (disclosure && !disclosure.open) disclosure.open = true;
        heading.focus();
        if (typeof document === 'undefined' || document.activeElement === heading) focusedReviewTokensRef.current[kind] = exactToken;
      };
      if (typeof requestAnimationFrame === 'function') scheduledFrames.push(requestAnimationFrame(focusHeading));
      else focusHeading();
    });
    return () => {
      if (typeof cancelAnimationFrame === 'function') scheduledFrames.forEach((frame) => cancelAnimationFrame(frame));
    };
  }, [directoryReviewToken, scheduleReviewToken, exportReviewToken, rehearsalReviewToken]);

  const loadDirectory = React.useCallback(async () => {
    setDirectoryState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const response = await repository.getAdminOperations();
      setDirectoryState({ status: 'done', directory: response.directory, error: '' });
    } catch (error) { setDirectoryState({ status: 'error', directory: null, error: String((error && error.message) || error) }); }
  }, [repository]);
  React.useEffect(() => { loadDirectory(); }, [loadDirectory]);
  const directory = directoryState.directory;
  const activeEvaluators = directory ? directory.members.filter((item) => item.active && (item.role === 'admin' || item.role === 'evaluator')) : [];
  const educatorNameFor = (teacherId) => {
    const teacher = directory && directory.educators.find((item) => item.id === teacherId);
    return teacher ? teacher.name + ' · ' + teacher.code : (teacherId || t("educator_evaluation.unknown_educator_3f7jiu", 'Unknown educator'));
  };

  React.useEffect(() => {
    if (!directoryReview || !directoryDraftFingerprint) return;
    const candidate = directoryReview.kind === 'member'
      ? { ...memberDraft, teacherId: memberDraft.role === 'teacher' ? memberDraft.teacherId : '' }
      : assignmentDraft;
    if (JSON.stringify({ kind: directoryReview.kind, candidate }) === directoryDraftFingerprint) return;
    setDirectoryReview(null);
    setDirectoryAck(false);
    setDirectoryDraftFingerprint('');
    setDirectoryNotice({ tone: 'warn', text: t('educator_evaluation.directory_draft_changed_review_invalidated_20260827', 'The directory draft changed, so its prior review was discarded. Prepare a new review before applying the change.') });
  }, [memberDraft, assignmentDraft, directoryReview, directoryDraftFingerprint]);

  const beginDirectoryReview = async (kind) => {
    if (directoryBusy || reviewPreparationRef.current) return;
    reviewPreparationRef.current = true;
    setDirectoryBusy(true);
    setDirectoryNotice({ tone: '', text: '' }); setDirectoryReview(null); setDirectoryAck(false);
    try {
      const candidate = kind === 'member' ? { ...memberDraft, teacherId: memberDraft.role === 'teacher' ? memberDraft.teacherId : '' } : assignmentDraft;
      const response = await repository.reviewDirectoryChange({ kind, candidate });
      setDirectoryReview(response.review);
      setDirectoryDraftFingerprint(JSON.stringify({ kind, candidate }));
    } catch (error) { setDirectoryNotice({ tone: 'error', text: String((error && error.message) || error) }); }
    finally { reviewPreparationRef.current = false; setDirectoryBusy(false); }
  };
  const confirmDirectory = async () => {
    if (!directoryReview || !directoryAck || directoryBusy) return;
    setDirectoryBusy(true);
    setDirectoryNotice({ tone: '', text: '' });
    try {
      const response = await repository.performDirectoryChange({ reviewToken: directoryReview.token, acknowledgeImpact: true });
      setDirectoryState({ status: 'done', directory: response.directory, error: '' });
      setDirectoryReview(null); setDirectoryAck(false);
      const recoveryPending = aeOperationRecoveryPending(response);
      setDirectoryNotice({
        tone: recoveryPending ? 'warn' : 'success',
        text: recoveryPending
          ? t('educator_evaluation.directory_change_applied_recovery_pending_20260827', 'The directory change was applied, but audit or released-summary recovery remains. Do not repeat the change. Run Setup health and complete the reviewed recovery.')
          : t("educator_evaluation.the_reviewed_directory_change_was_applied_and_audited_1ntupo5", 'The reviewed directory change was applied and audited.'),
      });
    } catch (error) { setDirectoryReview(null); setDirectoryAck(false); setDirectoryNotice({ tone: 'warn', text: aeUnconfirmedMutationMessage('Directory change', error) }); }
    finally { setDirectoryBusy(false); }
  };

  const beginScheduleReview = async () => {
    if (reviewPreparationRef.current || ['reviewing', 'performing'].includes(scheduleState.status)) return;
    reviewPreparationRef.current = true;
    setScheduleAck(false); setScheduleState({ status: 'reviewing', review: null, error: '', result: null });
    try { const response = await repository.reviewCycleSchedule(scheduleDraft); setScheduleState({ status: 'reviewed', review: response.review, error: '', result: null }); }
    catch (error) { setScheduleState({ status: 'error', review: null, error: String((error && error.message) || error), result: null }); }
    finally { reviewPreparationRef.current = false; }
  };
  const confirmSchedule = async () => {
    if (!scheduleState.review || !scheduleAck || scheduleState.status === 'performing') return;
    setScheduleState((current) => ({ ...current, status: 'performing', error: '' }));
    try { const response = await repository.performCycleSchedule({ reviewToken: scheduleState.review.token, acknowledgeImpact: true }); setScheduleState({ status: 'completed', review: null, error: '', result: response }); }
    catch (error) { setScheduleAck(false); setScheduleState({ status: 'unconfirmed', review: null, error: aeUnconfirmedMutationMessage('Schedule change', error), result: null }); }
  };

  const beginExportReview = async () => {
    if (reviewPreparationRef.current || ['reviewing', 'performing'].includes(exportState.status)) return;
    reviewPreparationRef.current = true;
    setExportAck(false); setExportState({ status: 'reviewing', review: null, error: '', result: null });
    try {
      const response = await repository.reviewDistrictExport(exportDraft);
      const review = response && response.review;
      if (!response || response.ok === false || !review || !review.token || !aeValidAuthorizedExportsAclReview(review.authorizedExportsAcl)) throw new Error((response && (response.error || response.message)) || t('educator_evaluation.export_review_incomplete_20260827', 'The private-export review was incomplete. Ask district IT to deploy the current portal and Apps Script package before confirming an export.'));
      setExportState({ status: 'reviewed', review, error: '', result: null });
    }
    catch (error) { setExportState({ status: 'error', review: null, error: String((error && error.message) || error), result: null }); }
    finally { reviewPreparationRef.current = false; }
  };
  const confirmExport = async () => {
    const acl = exportState.review && exportState.review.authorizedExportsAcl;
    if (!exportState.review || !exportAck || exportState.status === 'performing' || !aeValidAuthorizedExportsAclReview(acl) || acl.inspectable !== true || acl.manualReviewRequired !== false) return;
    const startedFromUnconfirmed = exportState.status === 'unconfirmed';
    const exactReview = exportState.review;
    setExportState((current) => ({ ...current, status: 'performing', error: '' }));
    try {
      const response = await repository.performDistrictExport({ reviewToken: exactReview.token, acknowledgePolicy: true });
      const recoveryPending = aeOperationRecoveryPending(response);
      setExportAck(recoveryPending);
      setExportState({ status: recoveryPending ? 'unconfirmed' : 'completed', review: recoveryPending ? exactReview : null, error: '', result: response });
    }
    catch (error) {
      let outcome = null;
      try {
        if (typeof repository.getArtifactOperationOutcome === 'function') outcome = await repository.getArtifactOperationOutcome({ kind: 'district_export', reviewToken: exactReview.token });
      } catch (probeError) {}
      if (aeArtifactOperationCanReset(startedFromUnconfirmed, outcome)) {
        setExportAck(false);
        setExportState({ status: 'error', review: null, error: String((error && error.message) || error), result: null });
        return;
      }
      setExportAck(true);
      setExportState({ status: 'unconfirmed', review: exactReview, error: startedFromUnconfirmed && aeArtifactOperationDefinitelyNotStarted(outcome) ? aeArtifactReceiptUnavailableMessage('Private export', error) : aeRecoverableArtifactOutcomeMessage('Private export', error), result: null });
    }
  };

  const loadArchives = async () => {
    if (['loading', 'reviewing', 'performing', 'unconfirmed'].includes(archiveState.status)) return;
    setArchiveState({ status: 'loading', archives: [], review: null, error: '', result: null });
    try { const response = await repository.getAnnualArchives(); setArchiveState({ status: 'done', archives: response.archives || [], review: null, error: '', result: null }); }
    catch (error) { setArchiveState({ status: 'error', archives: [], review: null, error: String((error && error.message) || error), result: null }); }
  };
  const reviewRehearsal = async (archiveId) => {
    if (reviewPreparationRef.current || ['loading', 'reviewing', 'performing', 'unconfirmed'].includes(archiveState.status)) return;
    reviewPreparationRef.current = true;
    setRehearsalAck(false); setArchiveState((current) => ({ ...current, status: 'reviewing', review: null, error: '', result: null }));
    try { const response = await repository.reviewArchiveRestoreRehearsal({ archiveId }); setArchiveState((current) => ({ ...current, status: 'reviewed', review: response.review, error: '', result: null })); }
    catch (error) { setArchiveState((current) => ({ ...current, status: 'error', review: null, error: String((error && error.message) || error), result: null })); }
    finally { reviewPreparationRef.current = false; }
  };
  const createRehearsal = async () => {
    if (!archiveState.review || !rehearsalAck || archiveState.status === 'performing') return;
    const startedFromUnconfirmed = archiveState.status === 'unconfirmed';
    const exactReview = archiveState.review;
    setArchiveState((current) => ({ ...current, status: 'performing', error: '' }));
    try {
      const response = await repository.performArchiveRestoreRehearsal({ reviewToken: exactReview.token, acknowledgeNoLiveRestore: true });
      const recoveryPending = aeOperationRecoveryPending(response);
      setRehearsalAck(recoveryPending);
      setArchiveState((current) => ({ ...current, status: recoveryPending ? 'unconfirmed' : 'completed', review: recoveryPending ? exactReview : null, error: '', result: response }));
    }
    catch (error) {
      let outcome = null;
      try {
        if (typeof repository.getArtifactOperationOutcome === 'function') outcome = await repository.getArtifactOperationOutcome({ kind: 'restore_rehearsal', reviewToken: exactReview.token });
      } catch (probeError) {}
      if (aeArtifactOperationCanReset(startedFromUnconfirmed, outcome)) {
        setRehearsalAck(false);
        setArchiveState((current) => ({ ...current, status: 'error', review: null, error: String((error && error.message) || error), result: null }));
        return;
      }
      setRehearsalAck(true);
      setArchiveState((current) => ({ ...current, status: 'unconfirmed', review: exactReview, error: startedFromUnconfirmed && aeArtifactOperationDefinitelyNotStarted(outcome) ? aeArtifactReceiptUnavailableMessage('Restore rehearsal candidate', error) : aeRecoverableArtifactOutcomeMessage('Restore rehearsal candidate', error), result: null }));
    }
  };

  const exportAclReview = exportState.review && exportState.review.authorizedExportsAcl && typeof exportState.review.authorizedExportsAcl === 'object' ? exportState.review.authorizedExportsAcl : null;
  const exportAclBlocked = !exportAclReview || !aeValidAuthorizedExportsAclReview(exportAclReview) || exportAclReview.inspectable !== true || exportAclReview.manualReviewRequired !== false;
  const scheduleRecoveryPending = aeOperationRecoveryPending(scheduleState.result);
  const exportRecoveryPending = aeOperationRecoveryPending(exportState.result);
  const rehearsalRecoveryPending = aeOperationRecoveryPending(archiveState.result);
  const directoryDraftLocked = directoryBusy || !!directoryReview;
  const scheduleDraftLocked = !!scheduleState.review || ['reviewing', 'performing'].includes(scheduleState.status);
  const exportDraftLocked = !!exportState.review || ['reviewing', 'performing'].includes(exportState.status);
  const reviewPreparationBusy = (directoryBusy && !directoryReview) || scheduleState.status === 'reviewing' || exportState.status === 'reviewing' || archiveState.status === 'reviewing';
  const operationsBusy = directoryBusy || ['reviewing', 'performing'].includes(scheduleState.status) || ['reviewing', 'performing'].includes(exportState.status) || ['loading', 'reviewing', 'performing'].includes(archiveState.status);

  return <section className="ae-card ae-span-12" aria-labelledby="ae-district-operations-title" aria-busy={operationsBusy ? 'true' : undefined}>
    <div className="ae-record-head"><div><h3 id="ae-district-operations-title">{t("educator_evaluation.district_operations_center_1vcx1dw", "District operations center")}</h3><p className="ae-sub">{t("educator_evaluation.administrator_only_reviewed_directory_changes_audited_priv_1jhh19b", "Administrator-only · reviewed directory changes · audited private exports · schedule and recovery tools")}</p></div><span className="ae-chip ae-chip-blue">{t("educator_evaluation.operational_controls_1dk4gbv", "Operational controls")}</span></div>
    <div className="ae-note" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.routine_administration_without_editing_apps_script_1cu7lnu", "Routine administration without editing Apps Script.")}</strong> {t("educator_evaluation.each_sensitive_change_is_reviewed_against_current_server_s_jwqlak", "Each sensitive change is reviewed against current server state, expires after ten minutes, and is applied only after an explicit confirmation. The browser never supplies the acting identity.")}</div>
    <fieldset data-testid="ae-operations-body" disabled={reviewPreparationBusy} aria-disabled={reviewPreparationBusy ? 'true' : undefined} style={{ display: 'grid', gap: 12, margin: '14px 0 0', border: 0, padding: 0, minWidth: 0 }}>
      <details className="ae-domain" open><summary>{t("educator_evaluation.1_accounts_and_evaluator_assignments_siesdh", "1 · Accounts and evaluator assignments")}</summary><div className="ae-domain-body">
        {directoryState.status === 'loading' && <p role="status">{t("educator_evaluation.loading_the_authorized_directory_iaeeo4", "Loading the authorized directory…")}</p>}
        {directoryState.error && <div className="ae-note ae-danger" role="alert">{directoryState.error}</div>}
        {directory && <><div className="ae-grid"><div className="ae-span-6"><h4>{t("educator_evaluation.create_or_update_a_member_1n1srh6", "Create or update a member")}</h4><div className="ae-form-grid"><label className="ae-field"><span>{t("educator_evaluation.managed_district_email_17ymibc", "Managed district email")}</span><input className="ae-input" type="email" value={memberDraft.email} onChange={(event) => setMemberDraft((current) => ({ ...current, email: event.target.value }))}/></label><label className="ae-field"><span>{t("educator_evaluation.display_name_lnzwr0", "Display name")}</span><input className="ae-input" value={memberDraft.displayName} onChange={(event) => setMemberDraft((current) => ({ ...current, displayName: event.target.value }))}/></label><label className="ae-field"><span>{t("educator_evaluation.role_1402mgp", "Role")}</span><select className="ae-select" value={memberDraft.role} onChange={(event) => setMemberDraft((current) => ({ ...current, role: event.target.value, teacherId: event.target.value === 'teacher' ? current.teacherId : '' }))}><option value="teacher">{t("educator_evaluation.educator_8c1rq4", "Educator")}</option><option value="evaluator">{t("educator_evaluation.evaluator_125q2ii", "Evaluator")}</option><option value="admin">{t("educator_evaluation.administrator_1d03gh6", "Administrator")}</option></select></label>{memberDraft.role === 'teacher' && <label className="ae-field"><span>{t("educator_evaluation.linked_educator_record_1rtoblq", "Linked educator record")}</span><select className="ae-select" value={memberDraft.teacherId} onChange={(event) => setMemberDraft((current) => ({ ...current, teacherId: event.target.value }))}><option value="">{t("educator_evaluation.choose_educator_1j9yd9p", "Choose educator")}</option>{directory.educators.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label>}</div><label className="ae-check"><input type="checkbox" checked={memberDraft.active} onChange={(event) => setMemberDraft((current) => ({ ...current, active: event.target.checked }))}/><span>{t("educator_evaluation.active_member_access_17af64v", "Active member access")}</span></label><button type="button" className="ae-btn" disabled={directoryBusy || !memberDraft.email || !memberDraft.displayName || (memberDraft.role === 'teacher' && !memberDraft.teacherId)} onClick={() => beginDirectoryReview('member')}>{directoryBusy ? t("educator_evaluation.working_1hfa4bu", 'Working…') : t("educator_evaluation.review_member_change_gi2wjr", 'Review member change')}</button></div>
          <div className="ae-span-6"><h4>{t("educator_evaluation.create_or_update_an_evaluator_assignment_1ogb36w", "Create or update an evaluator assignment")}</h4><label className="ae-field"><span>{t("educator_evaluation.educator_record_mmlsdd", "Educator record")}</span><select className="ae-select" value={assignmentDraft.teacherId} disabled={directoryDraftLocked} onChange={(event) => setAssignmentDraft((current) => ({ ...current, teacherId: event.target.value }))}><option value="">{t("educator_evaluation.choose_educator_1j9yd9p", "Choose educator")}</option>{directory.educators.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label><label className="ae-field"><span>{t("educator_evaluation.authorized_evaluator_1ruhwr9", "Authorized evaluator")}</span><select className="ae-select" value={assignmentDraft.evaluatorEmail} disabled={directoryDraftLocked} onChange={(event) => setAssignmentDraft((current) => ({ ...current, evaluatorEmail: event.target.value }))}><option value="">{t("educator_evaluation.choose_evaluator_cfpsyx", "Choose evaluator")}</option>{activeEvaluators.map((member) => <option value={member.email} key={member.email}>{member.displayName} · {member.email}</option>)}</select></label><label className="ae-check"><input type="checkbox" checked={assignmentDraft.active} disabled={directoryDraftLocked} onChange={(event) => setAssignmentDraft((current) => ({ ...current, active: event.target.checked }))}/><span>{t("educator_evaluation.active_assignment_it3zvs", "Active assignment")}</span></label><button type="button" className="ae-btn" disabled={directoryDraftLocked || !assignmentDraft.teacherId || !assignmentDraft.evaluatorEmail} onClick={() => beginDirectoryReview('assignment')}>{directoryBusy ? t("educator_evaluation.working_1hfa4bu", 'Working…') : t("educator_evaluation.review_assignment_change_xfq1gq", 'Review assignment change')}</button></div></div>
          <div className="ae-table-wrap" style={{ marginTop: 14 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.current_portal_members_pf16dr", "Current portal members")}</caption><thead><tr><th scope="col">{t("educator_evaluation.member_1yqqear", "Member")}</th><th scope="col">{t("educator_evaluation.role_1402mgp", "Role")}</th><th scope="col">{t("educator_evaluation.linked_educator_yvnd65", "Linked educator")}</th><th scope="col">{t("educator_evaluation.access_ow1nnv", "Access")}</th><th scope="col">{t("educator_evaluation.action_2wk0tb", "Action")}</th></tr></thead><tbody>{directory.members.map((member) => <tr key={member.email}><td>{member.displayName}<br/><span className="ae-sub">{member.email}</span></td><td>{member.role}</td><td>{educatorNameFor(member.teacherId)}</td><td>{member.active ? <span className="ae-chip ae-chip-good">{t("educator_evaluation.active_8qzyhb", "Active")}</span> : <span className="ae-chip ae-chip-neutral">{t("educator_evaluation.inactive_13zf5vc", "Inactive")}</span>}</td><td><button type="button" className="ae-btn" onClick={() => { setMemberDraft({ ...member }); setDirectoryReview(null); setDirectoryAck(false); setDirectoryNotice({ tone: '', text: '' }); }}>{t("educator_evaluation.load_for_review_vg8182", "Load for review")}</button></td></tr>)}</tbody></table></div>
          <div className="ae-table-wrap" style={{ marginTop: 14 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.current_evaluator_assignments_yqy7kp", "Current evaluator assignments")}</caption><thead><tr><th scope="col">{t("educator_evaluation.educator_8c1rq4", "Educator")}</th><th scope="col">{t("educator_evaluation.evaluator_account_18zhe7l", "Evaluator account")}</th><th scope="col">{t("educator_evaluation.access_ow1nnv", "Access")}</th><th scope="col">{t("educator_evaluation.action_2wk0tb", "Action")}</th></tr></thead><tbody>{directory.assignments.length ? directory.assignments.map((assignment) => <tr key={assignment.teacherId + '|' + assignment.evaluatorEmail}><td>{educatorNameFor(assignment.teacherId)}</td><td>{assignment.evaluatorEmail}</td><td>{assignment.active ? <span className="ae-chip ae-chip-good">{t("educator_evaluation.active_8qzyhb", "Active")}</span> : <span className="ae-chip ae-chip-neutral">{t("educator_evaluation.inactive_13zf5vc", "Inactive")}</span>}</td><td><button type="button" className="ae-btn" onClick={() => { setAssignmentDraft({ ...assignment }); setDirectoryReview(null); setDirectoryAck(false); setDirectoryNotice({ tone: '', text: '' }); }}>{t("educator_evaluation.load_for_review_vg8182", "Load for review")}</button></td></tr>) : <tr><td colSpan="4">{t("educator_evaluation.no_evaluator_assignments_yet_1id577f", "No evaluator assignments yet.")}</td></tr>}</tbody></table></div></>}
        {directoryReview && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><h4 ref={directoryReviewHeadingRef} className="ae-review-heading" tabIndex={-1}>{t("educator_evaluation.review_tnr3lt", "Review")} {directoryReview.action} {directoryReview.kind}.</h4><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(directoryReview.candidate, null, 2)}</pre>{directoryReview.current && <p className="ae-sub">{t("educator_evaluation.a_current_entry_exists_and_will_be_replaced_for_this_key_1uaec21", "A current entry exists and will be replaced for this key.")}</p>}{directoryReview.impacts && directoryReview.impacts.removesPortalAccess && <p><strong>{t("educator_evaluation.this_removes_the_member_s_portal_access_62q5ah", "This removes the member's portal access.")}</strong></p>}{directoryReview.impacts && directoryReview.impacts.changesRole && <p><strong>{t("educator_evaluation.this_changes_the_member_s_authorization_role_1s7a5uy", "This changes the member's authorization role.")}</strong></p>}{directoryReview.impacts && directoryReview.impacts.activeEvaluatorAssignments > 0 && <p>{t("educator_evaluation.this_account_currently_has_w623hg", "This account currently has")} {directoryReview.impacts.activeEvaluatorAssignments} {t("educator_evaluation.active_evaluator_assignment_furv77", "active evaluator assignment")}{directoryReview.impacts.activeEvaluatorAssignments === 1 ? '' : 's'}.</p>}{directoryReview.impacts && directoryReview.impacts.removesEvaluatorAccess && <p><strong>{t("educator_evaluation.this_removes_evaluator_access_for_1vhtsgq", "This removes evaluator access for")} {directoryReview.impacts.educatorName}.</strong></p>}<label className="ae-check"><input type="checkbox" checked={directoryAck} onChange={(event) => setDirectoryAck(event.target.checked)}/><span>{t("educator_evaluation.i_verified_the_managed_account_role_linked_educator_active_ydpnt2", "I verified the managed account, role, linked educator, active status, and legitimate educational interest.")}</span></label><div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={!directoryAck || directoryBusy} onClick={confirmDirectory}>{directoryBusy ? t("educator_evaluation.applying_m2sarl", 'Applying…') : t("educator_evaluation.confirm_directory_change_u7wi2g", 'Confirm directory change')}</button><button type="button" className="ae-btn" disabled={directoryBusy} onClick={() => setDirectoryReview(null)}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button></div><p className="ae-help">{t("educator_evaluation.review_expires_1t7v0zx", "Review expires")} {aeDateTime(directoryReview.expiresAt)}. Any membership or assignment change makes it stale.</p></div>}
        {directoryNotice.text && <div className={'ae-note ' + (directoryNotice.tone === 'error' ? 'ae-danger' : (directoryNotice.tone === 'warn' ? 'ae-warn' : 'ae-ok'))} role={directoryNotice.tone === 'error' ? 'alert' : 'status'} aria-live="polite" style={{ marginTop: 12 }}>{directoryNotice.text}</div>}
      </div></details>

      <details className="ae-domain"><summary>{t("educator_evaluation.2_annual_cycle_due_date_schedule_5wc3aj", "2 · Annual cycle due-date schedule")}</summary><div className="ae-domain-body"><p className="ae-sub">{t("educator_evaluation.apply_one_reviewed_due_date_to_eligible_active_non_finaliz_ndzt99", "Apply one reviewed due date to eligible active, non-finalized cycles. Finalized cycles are always skipped.")}</p><div className="ae-form-grid" style={{ marginTop: 12 }}><label className="ae-field"><span>{t("educator_evaluation.cycle_due_date_xn67v5", "Cycle due date")}</span><input className="ae-input" type="date" value={scheduleDraft.dueDate} disabled={scheduleDraftLocked} onChange={(event) => setScheduleDraft((current) => ({ ...current, dueDate: event.target.value }))}/></label><label className="ae-field"><span>{t("educator_evaluation.apply_to_hwjuu8", "Apply to")}</span><select className="ae-select" value={scheduleDraft.applyTo} disabled={scheduleDraftLocked} onChange={(event) => setScheduleDraft((current) => ({ ...current, applyTo: event.target.value }))}><option value="missing">{t("educator_evaluation.open_cycles_without_a_due_date_1ylcnrn", "Open cycles without a due date")}</option><option value="all_open">{t("educator_evaluation.all_open_cycles_replacing_existing_due_dates_ivfkz4", "All open cycles, replacing existing due dates")}</option></select></label><label className="ae-field"><span>{t("educator_evaluation.building_filter_optional_1gefjok", "Building filter (optional)")}</span><input className="ae-input" value={scheduleDraft.building} disabled={scheduleDraftLocked} onChange={(event) => setScheduleDraft((current) => ({ ...current, building: event.target.value }))} placeholder={t("educator_evaluation.all_buildings_128o54d", "All buildings")}/></label></div><button type="button" className="ae-btn" disabled={!scheduleDraft.dueDate || scheduleDraftLocked} onClick={beginScheduleReview}>{scheduleState.status === 'reviewing' ? t("educator_evaluation.preparing_review_yfqhz1", 'Preparing review…') : t("educator_evaluation.review_schedule_impact_rprqs4", 'Review schedule impact')}</button>
        {scheduleState.error && <div className="ae-note ae-danger" role="alert" style={{ marginTop: 12 }}>{scheduleState.error}</div>}{scheduleState.review && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><h4 ref={scheduleReviewHeadingRef} className="ae-review-heading" tabIndex={-1}>{scheduleState.review.affectedEducators} {t("educator_evaluation.educator_cycle_w00ya2", "educator cycle")}{scheduleState.review.affectedEducators === 1 ? '' : 's'} {t("educator_evaluation.will_receive_1y2by7g", "will receive")} {scheduleState.review.dueDate}.</h4><p>{scheduleState.review.skippedFinalized} {t("educator_evaluation.finalized_cycle_1jhgvi3", "finalized cycle")}{scheduleState.review.skippedFinalized === 1 ? '' : 's'} {t("educator_evaluation.skipped_2efu1n", "skipped.")} {scheduleState.review.sample.length ? t("educator_evaluation.sample_1o0h6iv", 'Sample: ') + scheduleState.review.sample.map((item) => item.name + (item.previousDueDate ? ' (' + item.previousDueDate + ')' : '')).join(', ') : t("educator_evaluation.no_eligible_cycles_93ig3o", 'No eligible cycles.')}</p><label className="ae-check"><input type="checkbox" checked={scheduleAck} disabled={scheduleState.status === 'performing'} onChange={(event) => setScheduleAck(event.target.checked)}/><span>{t("educator_evaluation.i_reviewed_the_scope_and_understand_existing_open_cycle_da_fv7zow", "I reviewed the scope and understand existing open-cycle dates may be replaced when “all open cycles” is selected.")}</span></label><div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={!scheduleAck || !scheduleState.review.affectedEducators || scheduleState.status === 'performing'} onClick={confirmSchedule}>{scheduleState.status === 'performing' ? t('educator_evaluation.applying_reviewed_schedule_20260827', 'Applying reviewed schedule...') : t("educator_evaluation.apply_reviewed_schedule_lxbmpd", "Apply reviewed schedule")}</button><button type="button" className="ae-btn" disabled={scheduleState.status === 'performing'} onClick={() => setScheduleState({ status: 'idle', review: null, error: '', result: null })}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button></div><p className="ae-help">{t("educator_evaluation.review_expires_1t7v0zx", "Review expires")} {aeDateTime(scheduleState.review.expiresAt)}. Any intervening workspace save makes it stale.</p></div>}{scheduleState.result && <div className={'ae-note ' + (scheduleRecoveryPending ? 'ae-warn' : 'ae-ok')} role="status" aria-live="polite" style={{ marginTop: 12 }}><strong>{scheduleRecoveryPending ? t('educator_evaluation.schedule_applied_recovery_pending_20260827', 'Schedule accepted; repository recovery is pending.') : t("educator_evaluation.schedule_applied_1entiid", "Schedule applied.")}</strong> {scheduleState.result.affectedEducators} {t("educator_evaluation.cycles_now_use_67j841", "cycles now use")} {scheduleState.result.dueDate}.{scheduleRecoveryPending && <p className="ae-help">{t('educator_evaluation.schedule_no_repeat_recovery_pending_20260827', 'Do not apply the schedule again. Reload, run Setup health, and reconcile the remaining repository work.')}</p>} {typeof onReload === 'function' && <button type="button" className="ae-btn" style={{ marginLeft: 8 }} onClick={onReload}>{t("educator_evaluation.reload_scheduled_records_1swnchp", "Reload scheduled records")}</button>}</div>}
      </div></details>

      <details className="ae-domain"><summary>{t("educator_evaluation.3_audited_private_exports_and_official_record_handoff_j3k62n", "3 · Audited private exports and official-record handoff")}</summary><div className="ae-domain-body"><div className="ae-note ae-warn"><strong>{t("educator_evaluation.exports_remain_private_by_default_kl6bk5", "Exports remain private by default.")}</strong> {t("educator_evaluation.creating_one_does_not_declare_it_the_official_record_or_sh_1og8dzh", "Creating one does not declare it the official record or share it with HR. The district must approve the purpose, destination, retention, legal-hold treatment, and handoff.")}</div><div className="ae-form-grid" style={{ marginTop: 12 }}><label className="ae-field"><span>{t("educator_evaluation.export_scope_qry6zb", "Export scope")}</span><select className="ae-select" value={exportDraft.scope} disabled={exportDraftLocked} onChange={(event) => setExportDraft((current) => ({ ...current, scope: event.target.value }))}><option value="status_csv">{t("educator_evaluation.roster_and_cycle_status_csv_1tdhu8h", "Roster and cycle status CSV")}</option><option value="educator_record">{t("educator_evaluation.one_educator_s_complete_portal_record_1y0g0wk", "One educator’s complete portal record")}</option><option value="repository_backup">{t("educator_evaluation.complete_repository_workspace_backup_h21ju3", "Complete repository workspace backup")}</option></select></label>{exportDraft.scope === 'educator_record' && <label className="ae-field"><span>{t("educator_evaluation.educator_8c1rq4", "Educator")}</span><select className="ae-select" value={exportDraft.teacherId} disabled={exportDraftLocked} onChange={(event) => setExportDraft((current) => ({ ...current, teacherId: event.target.value }))}><option value="">{t("educator_evaluation.choose_educator_1j9yd9p", "Choose educator")}</option>{workspace.teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label>}<label className="ae-field ae-field-wide"><span>{t("educator_evaluation.authorized_purpose_8shvyy", "Authorized purpose")}</span><input className="ae-input" value={exportDraft.purpose} disabled={exportDraftLocked} onChange={(event) => setExportDraft((current) => ({ ...current, purpose: event.target.value }))} placeholder={t("educator_evaluation.example_annual_hr_records_handoff_under_policy_mum17c", "Example: annual HR records handoff under policy …")} maxLength={240}/></label></div><button type="button" className="ae-btn" disabled={!exportDraft.purpose.trim() || (exportDraft.scope === 'educator_record' && !exportDraft.teacherId) || exportDraftLocked} onClick={beginExportReview}>{exportState.status === 'reviewing' ? t("educator_evaluation.preparing_review_yfqhz1", 'Preparing review…') : (exportState.status === 'performing' ? t('educator_evaluation.creating_verified_private_export_20260827', 'Creating verified private export...') : t("educator_evaluation.review_private_export_ie93so", 'Review private export'))}</button>
        {exportState.error && <div className="ae-note ae-danger" role="alert" style={{ marginTop: 12 }}>{exportState.error}</div>}
        {exportState.review && <div className="ae-note ae-warn" style={{ marginTop: 12 }}>
          <h4 ref={exportReviewHeadingRef} className="ae-review-heading" tabIndex={-1}>{t("educator_evaluation.review_tnr3lt", "Review")} {exportState.review.scope.replace(/_/g, ' ')}.</h4>
          <p>{t("educator_evaluation.purpose_l5xibl", "Purpose:")} {exportState.review.purpose}</p>
          <p>{t("educator_evaluation.destination_1d51ren", "Destination:")} {exportState.review.destination}. {exportState.review.educatorName ? t("educator_evaluation.educator_1uhnh3m", 'Educator: ') + exportState.review.educatorName + '.' : t("educator_evaluation.active_educators_5750sd", 'Active educators: ') + exportState.review.activeEducators + '.'}</p>
          {exportAclReview && <div className="ae-card" style={{ marginTop: 10 }}>
            <strong>{t("educator_evaluation.authorized_exports_access_review_20260827", "Authorized Exports access review")}</strong>
            <p className="ae-help">{t("educator_evaluation.authorized_exports_access_review_detail_20260827", "Read-only aggregate permission checks for the managed folder and existing export files. No principal names or file identifiers are shown.")}</p>
            <div className="ae-actions">
              <span className="ae-chip ae-chip-neutral">{t("educator_evaluation.access_status_20260827", "Access status")} · {String(exportAclReview.status || 'unavailable').replace(/_/g, ' ')}</span>
              <span className="ae-chip ae-chip-neutral">{t("educator_evaluation.existing_files_20260827", "Existing files")} · {aeSetupHealthCount(exportAclReview.fileCount)}</span>
              <span className="ae-chip ae-chip-neutral">{t("educator_evaluation.drifted_files_20260827", "Drifted files")} · {aeSetupHealthCount(exportAclReview.driftedFileCount)}</span>
              <span className="ae-chip ae-chip-neutral">{t("educator_evaluation.explicit_access_grants_20260827", "Explicit access grants")} · {aeSetupHealthCount(exportAclReview.explicitAccessCount)}</span>
              <span className="ae-chip ae-chip-neutral">{t("educator_evaluation.folder_drift_20260827", "Folder drift")} · {exportAclReview.folderDrift ? t("educator_evaluation.yes_1dudzcg", 'Yes') : t("educator_evaluation.no_20260827", 'No')}</span>
            </div>
            {exportAclBlocked && <div className="ae-note ae-danger" role="status" style={{ marginTop: 10 }}><strong>{t("educator_evaluation.authorized_exports_manual_review_required_20260827", "District IT permission review required.")}</strong> {t("educator_evaluation.authorized_exports_manual_review_detail_20260827", "The folder or an existing export could not be safely inspected. No export can be confirmed from this review.")}</div>}
          </div>}
          <label className="ae-check"><input type="checkbox" checked={exportAck} disabled={exportAclBlocked || exportState.status === 'unconfirmed'} onChange={(event) => setExportAck(event.target.checked)}/><span>{t("educator_evaluation.i_confirmed_district_authorization_purpose_private_destina_avce48", "I confirmed district authorization, purpose, private destination, retention, legal hold, and official-record handoff procedure.")}</span></label>
          <div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={!exportAck || exportAclBlocked || exportState.status === 'performing'} onClick={confirmExport}>{exportState.status === 'performing' ? t('educator_evaluation.creating_verified_private_export_20260827', 'Creating verified private export...') : (exportState.status === 'unconfirmed' ? t('educator_evaluation.check_exact_export_outcome_20260827', 'Check exact export outcome') : t("educator_evaluation.create_verified_private_export_16s5m7i", "Create verified private export"))}</button><button type="button" className="ae-btn" disabled={['performing', 'unconfirmed'].includes(exportState.status)} onClick={() => setExportState({ status: 'idle', review: null, error: '', result: null })}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button></div>
          <p className="ae-help">{t("educator_evaluation.review_expires_1t7v0zx", "Review expires")} {aeDateTime(exportState.review.expiresAt)}. Any intervening workspace or Authorized Exports access change makes it stale.</p>
        </div>}
{exportState.result && <div className={'ae-note ' + (exportRecoveryPending ? 'ae-warn' : 'ae-ok')} role="status" aria-live="polite" style={{ marginTop: 12 }}><strong>{exportRecoveryPending ? t('educator_evaluation.private_export_created_audit_recovery_pending_20260827', 'Verified private export created; audit recovery is pending.') : t("educator_evaluation.verified_private_export_created_and_audited_1hbayf7", "Verified private export created and audited.")}</strong>{exportRecoveryPending && <p className="ae-help">{t('educator_evaluation.private_export_no_repeat_recovery_pending_20260827', 'Do not create another export. Keep this review open, run Setup health, reconcile the queued audit entry, then select Check exact export outcome.')}</p>}<div className="ae-actions" style={{ marginTop: 8 }}><a className="ae-btn" href={exportState.result.export.url} target="_blank" rel="noopener noreferrer">{t("educator_evaluation.open_export_in_drive_17qm8wo", "Open export in Drive")}</a></div><p className="ae-help">{t("educator_evaluation.sha_256_dt80lh", "SHA-256:")} <code>{exportState.result.export.sha256}</code></p></div>}
      </div></details>

      <details className="ae-domain"><summary>{t("educator_evaluation.4_annual_archive_inventory_and_restore_rehearsal_tn55t7", "4 · Annual archive inventory and restore rehearsal")}</summary><div className="ae-domain-body"><div className="ae-note"><strong>{t("educator_evaluation.a_restore_rehearsal_never_overwrites_the_live_workspace_1at253b", "A restore rehearsal never overwrites the live workspace.")}</strong> {t("educator_evaluation.it_verifies_an_annual_archive_compares_its_counts_and_revi_1nchxwq", "It verifies an annual archive, compares its counts and revision to the active workspace, and creates a separate private candidate for district IT inspection.")}</div><button type="button" className="ae-btn" style={{ marginTop: 12 }} disabled={['loading', 'reviewing', 'performing', 'unconfirmed'].includes(archiveState.status)} onClick={loadArchives}>{archiveState.status === 'loading' ? t("educator_evaluation.checking_archives_m2me62", 'Checking archives…') : t("educator_evaluation.load_and_verify_annual_archives_bsnbcv", 'Load and verify annual archives')}</button>{archiveState.error && <div className="ae-note ae-danger" role="alert" style={{ marginTop: 12 }}>{archiveState.error}</div>}{archiveState.archives.length > 0 && <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.verified_annual_archive_inventory_1488716", "Verified annual archive inventory")}</caption><thead><tr><th scope="col">{t("educator_evaluation.archive_w0suw5", "Archive")}</th><th scope="col">{t("educator_evaluation.year_5xgri4", "Year")}</th><th scope="col">{t("educator_evaluation.revision_1pi2b08", "Revision")}</th><th scope="col">{t("educator_evaluation.integrity_t3xhzw", "Integrity")}</th><th scope="col">{t("educator_evaluation.action_2wk0tb", "Action")}</th></tr></thead><tbody>{archiveState.archives.map((archive) => <tr key={archive.id}><td><a className="ae-link" href={archive.url} target="_blank" rel="noopener noreferrer">{archive.name}</a><br/><span className="ae-sub">{aeDateTime(archive.archivedAt)}</span></td><td>{archive.fromAcademicYear || t("educator_evaluation.unknown_1kmy72x", 'Unknown')} → {archive.plannedNextAcademicYear || t("educator_evaluation.unknown_1kmy72x", 'Unknown')}</td><td>{archive.sourceRevision == null ? t("educator_evaluation.unknown_1kmy72x", 'Unknown') : archive.sourceRevision}</td><td>{archive.verified ? <span className="ae-chip ae-chip-good">{t("educator_evaluation.verified_1jnn2zp", "Verified")}</span> : <span className="ae-chip ae-chip-bad">{t("educator_evaluation.failed_npsixg", "Failed")}</span>}</td><td><button type="button" className="ae-btn" disabled={!archive.verified || ['loading', 'reviewing', 'performing', 'unconfirmed'].includes(archiveState.status)} onClick={() => reviewRehearsal(archive.id)}>{t("educator_evaluation.review_rehearsal_3tzywy", "Review rehearsal")}</button></td></tr>)}</tbody></table></div>}{archiveState.status === 'done' && !archiveState.archives.length && <div className="ae-empty" style={{ marginTop: 12 }}>{t("educator_evaluation.no_annual_archives_exist_yet_18w8gg9", "No annual archives exist yet.")}</div>}{archiveState.review && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><h4 ref={rehearsalReviewHeadingRef} className="ae-review-heading" tabIndex={-1}>{t("educator_evaluation.restore_rehearsal_review_11q8vbk", "Restore rehearsal review.")}</h4><p>{t("educator_evaluation.archive_year_goj0tm", "Archive year")} {archiveState.review.fromAcademicYear}{t("educator_evaluation.revision_3k2y84", ", revision")} {archiveState.review.archivedRevision}{t("educator_evaluation.active_year_t7cskx", "; active year")} {archiveState.review.activeAcademicYear}{t("educator_evaluation.revision_3k2y84", ", revision")} {archiveState.review.activeRevision}.</p><p>{t("educator_evaluation.archived_1evao7f", "Archived:")} {archiveState.review.archivedCounts.activeEducators} {t("educator_evaluation.active_educators_and_if1uig", "active educators and")} {archiveState.review.archivedCounts.records.total} {t("educator_evaluation.current_records_active_ekk68u", "current records. Active:")} {archiveState.review.currentCounts.activeEducators} {t("educator_evaluation.active_educators_and_if1uig", "active educators and")} {archiveState.review.currentCounts.records.total} {t("educator_evaluation.current_records_1ibbeqq", "current records.")}</p><label className="ae-check"><input type="checkbox" checked={rehearsalAck} disabled={['performing', 'unconfirmed'].includes(archiveState.status)} onChange={(event) => setRehearsalAck(event.target.checked)}/><span>{t("educator_evaluation.i_understand_this_creates_a_separate_private_candidate_for_23cfnp", "I understand this creates a separate private candidate for inspection and does not restore or overwrite the live workspace.")}</span></label><div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={!rehearsalAck || archiveState.status === 'performing'} onClick={createRehearsal}>{archiveState.status === 'performing' ? t('educator_evaluation.creating_private_restore_candidate_20260827', 'Creating private candidate...') : (archiveState.status === 'unconfirmed' ? t('educator_evaluation.check_exact_restore_candidate_outcome_20260827', 'Check exact candidate outcome') : t("educator_evaluation.create_private_restore_candidate_1o6o3yx", "Create private restore candidate"))}</button><button type="button" className="ae-btn" disabled={['performing', 'unconfirmed'].includes(archiveState.status)} onClick={() => setArchiveState((current) => ({ ...current, status: 'done', review: null }))}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button></div></div>}{archiveState.result && <div className={'ae-note ' + (rehearsalRecoveryPending ? 'ae-warn' : 'ae-ok')} role="status" aria-live="polite" style={{ marginTop: 12 }}><strong>{rehearsalRecoveryPending ? t('educator_evaluation.restore_candidate_created_audit_recovery_pending_20260827', 'Restore rehearsal candidate created; audit recovery is pending.') : t("educator_evaluation.restore_rehearsal_candidate_verified_1522fpd", "Restore rehearsal candidate verified.")}</strong> {t("educator_evaluation.the_live_workspace_was_not_changed_10xcy1b", "The live workspace was not changed.")}{rehearsalRecoveryPending && <p className="ae-help">{t('educator_evaluation.restore_candidate_no_repeat_recovery_pending_20260827', 'Do not create another candidate. Keep this review open, run Setup health, reconcile the queued audit entry, then select Check exact candidate outcome.')}</p>}<div className="ae-actions" style={{ marginTop: 8 }}><a className="ae-btn" href={archiveState.result.candidate.url} target="_blank" rel="noopener noreferrer">{t("educator_evaluation.open_private_candidate_eqwrar", "Open private candidate")}</a></div><p className="ae-help">{t("educator_evaluation.sha_256_dt80lh", "SHA-256:")} <code>{archiveState.result.candidate.sha256}</code></p></div>}
      </div></details>
      <p className="ae-help" style={{ margin: 0 }}><a className="ae-link" href="https://alloflow-cdn.pages.dev/educator-evaluation-manual#district-operations" target="_blank" rel="noopener noreferrer">{t("educator_evaluation.open_the_district_operations_runbook_i0co32", "Open the district operations runbook")}</a></p>
    </fieldset>
  </section>;
}

function AeAnnualRollover({ workspace, repository, onReload }) {
  const [nextYear, setNextYear] = React.useState(() => aeNextAcademicYear(workspace.config && workspace.config.academicYear));
  const [state, setState] = React.useState({ status: 'idle', review: null, result: null, error: '', errorCode: '' });
  const [custodyAccepted, setCustodyAccepted] = React.useState(false);
  const [openCyclesAccepted, setOpenCyclesAccepted] = React.useState(false);
  const reviewRequestRef = React.useRef(false);
  const performRequestRef = React.useRef(false);
  const reconcileRequestRef = React.useRef(false);
  const review = state.review;
  const counts = review && review.counts;
  const resumableArchiveRetry = !!(state.result && state.result.status === 'archive_only' && state.result.resumable);
  const recoveryPending = !!(state.result && state.result.recoveryPending) && !resumableArchiveRetry;
  const recognizedRecoveryError = ['rollover_recovery_required', 'manual_recovery_required'].includes(state.errorCode);
  const ambiguousError = state.status === 'error' && recognizedRecoveryError;
  const outcomeLocked = recoveryPending || ambiguousError || ['performing', 'recovery', 'unconfirmed', 'reconciling', 'completed'].includes(state.status);
  const yearLocked = state.status === 'reviewing' || outcomeLocked;
  const runReview = async () => {
    if (reviewRequestRef.current || yearLocked) return;
    reviewRequestRef.current = true;
    setState({ status: 'reviewing', review: null, result: null, error: '', errorCode: '' });
    setCustodyAccepted(false);
    setOpenCyclesAccepted(false);
    try {
      const response = await repository.reviewAnnualRollover({ nextAcademicYear: nextYear });
      setState({ status: 'reviewed', review: response.review, result: null, error: '', errorCode: '' });
    } catch (error) {
      setState({ status: 'error', review: null, result: null, error: String((error && error.message) || error), errorCode: String((error && error.code) || '') });
    } finally {
      reviewRequestRef.current = false;
    }
  };
  const confirm = async () => {
    if (performRequestRef.current || !review || outcomeLocked || !custodyAccepted || (counts.openCycles > 0 && !openCyclesAccepted)) return;
    performRequestRef.current = true;
    setState((current) => ({ ...current, status: 'performing', error: '', errorCode: '' }));
    try {
      const response = await repository.performAnnualRollover({
        reviewToken: review.token,
        acknowledgeArchive: custodyAccepted,
        acknowledgeOpenCycles: counts.openCycles > 0 ? openCyclesAccepted : true,
      });
      setState({ status: response.recoveryPending ? 'recovery' : 'completed', review: null, result: response, error: '', errorCode: '' });
    } catch (error) {
      setState({ status: 'unconfirmed', review: null, result: null, error: aeUnconfirmedMutationMessage('Annual rollover', error), errorCode: String((error && error.code) || '') });
    } finally {
      performRequestRef.current = false;
    }
  };
  const reconcile = async () => {
    if (reconcileRequestRef.current || ['reviewing', 'performing', 'reconciling'].includes(state.status)) return;
    const priorStatus = state.status;
    const priorResult = state.result;
    const priorAmbiguous = priorStatus === 'unconfirmed' || (priorStatus === 'error' && recognizedRecoveryError);
    reconcileRequestRef.current = true;
    setState((current) => ({ ...current, status: 'reconciling', error: '', errorCode: '' }));
    try {
      const response = await repository.reconcileAnnualRollover();
      const message = response.status === 'completed'
        ? t("educator_evaluation.the_active_workspace_commit_was_confirmed_reload_to_open_t_ot0x3w", 'The active workspace commit was confirmed. Reload to open the new year.')
        : (response.status === 'archive_only'
          ? t("educator_evaluation.the_active_workspace_was_unchanged_the_verified_archive_wa_1rbnl8k", 'The active workspace was unchanged. The verified archive was kept, and a fresh review may now be started.')
          : (response.recoveryPending
            ? (response.message || (priorResult && priorResult.message) || t("educator_evaluation.a_verified_archive_exists_but_the_active_year_commit_is_no_4ui0yz", 'A verified archive exists, but the active-year commit is not yet confirmed. Do not retry.'))
            : t("educator_evaluation.no_unresolved_annual_rollover_was_found_wiocyu", 'No unresolved annual rollover was found.')));
      const retryReady = response.status === 'archive_only' && response.resumable === true;
      const nextStatus = response.status === 'completed' ? 'completed' : (response.recoveryPending && !retryReady ? 'recovery' : 'reconciled');
      setState({ status: nextStatus, review: null, result: { ...(priorResult || {}), ...response, message }, error: '', errorCode: '' });
    } catch (error) {
      setState((current) => ({ ...current, status: priorStatus === 'recovery' ? 'recovery' : (priorAmbiguous ? 'unconfirmed' : 'error'), review: null, error: String((error && error.message) || error), errorCode: String((error && error.code) || '') }));
    } finally {
      reconcileRequestRef.current = false;
    }
  };
  const archiveUrl = state.result && state.result.archive && /^https:\/\/drive\.google\.com\//.test(state.result.archive.url || '') ? state.result.archive.url : '';
  return <section className="ae-card ae-span-12" aria-labelledby="ae-rollover-title" aria-busy={['reviewing', 'performing', 'reconciling'].includes(state.status) ? 'true' : undefined}>
    <div className="ae-record-head"><div><h3 id="ae-rollover-title">{t("educator_evaluation.annual_rollover_and_continuity_18pcrtd", "Annual rollover & continuity")}</h3><p className="ae-sub">{t("educator_evaluation.administrator_only_review_first_verified_private_archive_b_16qv4mg", "Administrator-only · review first · verified private archive before the active year changes")}</p></div><span className="ae-chip ae-chip-amber">{t("educator_evaluation.high_impact_workflow_13s9dif", "High-impact workflow")}</span></div>
    <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.this_is_a_staged_recoverable_rollover_not_records_destruct_1tvubbu", "This is a staged, recoverable rollover, not records destruction.")}</strong> {t("educator_evaluation.the_portal_keeps_the_educator_roster_and_immutable_cycle_s_hlms9b", "The portal keeps the educator roster and immutable cycle snapshots, archives the complete current workspace, resets active-cycle fields and records, and never deletes released Drive documents. District retention, legal hold, official-record handoff, backup, and account ownership remain district responsibilities.")}</div>
    <ol className="ae-sub" style={{ margin: '12px 0 0 18px', display: 'grid', gap: 7 }}>
      <li>{t("educator_evaluation.run_setup_health_and_resolve_repository_audit_owner_contin_wm1upq", "Run Setup health and resolve repository, audit, owner-continuity, or recovery warnings.")}</li>
      <li>{t("educator_evaluation.enter_the_immediately_following_academic_year_and_review_t_1wx898y", "Enter the immediately following academic year and review the live counts. The review is valid for up to 10 minutes; it may expire earlier if the workspace changes.")}</li>
      <li>{t("educator_evaluation.confirm_custody_and_any_open_cycle_impact_the_server_creat_pkztgy", "Confirm custody and any open-cycle impact. The server creates and re-reads a private JSON archive before writing the new active year.")}</li>
      <li>{t("educator_evaluation.open_the_returned_archive_link_record_its_location_under_d_1ec7x39", "Open the returned archive link, record its location under district procedure, then reload the portal.")}</li>
    </ol>
    <fieldset disabled={yearLocked} onChangeCapture={(event) => { if (!yearLocked) return; event.preventDefault(); event.stopPropagation(); }} style={{ border: 0, padding: 0, margin: 0 }}>
    <div className="ae-form-grid" style={{ marginTop: 14 }}><label className="ae-field"><span>{t("educator_evaluation.next_academic_year_yyyy_yy_1rmi83o", "Next academic year (YYYY-YY)")}</span><input className="ae-input" value={nextYear} onChange={(event) => { setNextYear(event.target.value); setState({ status: 'idle', review: null, result: null, error: '', errorCode: '' }); }} placeholder="2027-28" inputMode="numeric" aria-describedby="ae-rollover-year-help" /></label><div className="ae-field"><span>&nbsp;</span><button type="button" className="ae-btn ae-btn-primary" disabled={!nextYear || ['reviewing', 'performing', 'reconciling'].includes(state.status)} onClick={runReview}>{state.status === 'reviewing' ? t("educator_evaluation.preparing_review_yfqhz1", 'Preparing review…') : t("educator_evaluation.review_annual_rollover_1ibiag9", 'Review annual rollover')}</button></div></div>
    <p className="ae-help" id="ae-rollover-year-help">{t("educator_evaluation.active_year_sqto9m", "Active year:")} <strong>{workspace.config.academicYear || t("educator_evaluation.not_configured_1kvw1a", 'not configured')}</strong>. The server permits exactly one-year advancement.</p>
    </fieldset>
    {state.error && <div className="ae-note ae-danger" role="alert" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.rollover_did_not_complete_vwmpu3", "Rollover did not complete.")}</strong> {state.error}{state.status !== 'recovery' && recognizedRecoveryError && <div className="ae-actions" style={{ marginTop: 10 }}><button type="button" className="ae-btn" onClick={reconcile}>{t("educator_evaluation.recheck_interrupted_rollover_tswi2r", "Recheck interrupted rollover")}</button></div>}</div>}
    {review && counts && <div className="ae-note" style={{ marginTop: 14 }}><h4 style={{ margin: '0 0 8px' }}>{t("educator_evaluation.review_tnr3lt", "Review")} {review.currentAcademicYear} → {review.nextAcademicYear}</h4>
      <div className="ae-grid"><div className="ae-span-3 ae-stat"><strong>{counts.activeEducators}</strong><span>{t("educator_evaluation.active_educators_retained_13ea9xr", "active educators retained")}</span></div><div className="ae-span-3 ae-stat"><strong>{counts.finalizedCycles}</strong><span>{t("educator_evaluation.finalized_cycles_archived_nx8yfa", "finalized cycles archived")}</span></div><div className="ae-span-3 ae-stat"><strong>{counts.openCycles}</strong><span>{t("educator_evaluation.open_cycles_archived_1u2riz2", "open cycles archived")}</span></div><div className="ae-span-3 ae-stat"><strong>{counts.records.total}</strong><span>{t("educator_evaluation.active_records_archived_yu18j5", "active records archived")}</span></div></div>
      <p className="ae-sub" style={{ marginTop: 10 }}>{counts.records.walkthroughs} {t("educator_evaluation.walkthroughs_104ymgn", "walkthroughs ·")} {counts.records.observations} {t("educator_evaluation.formal_observations_et5kak", "formal observations ·")} {counts.records.spms} {t("educator_evaluation.spms_1lohcxb", "SPMs ·")} {counts.records.comments} {t("educator_evaluation.comments_u6eszq", "comments ·")} {counts.retainedCycleSnapshots} {t("educator_evaluation.prior_cycle_snapshots_retained_119x57l", "prior cycle snapshots retained ·")} {counts.releasedDocuments} {t("educator_evaluation.released_drive_document_references_archived_u0p0hn", "released Drive document references archived.")}</p>
      <label className="ae-check"><input type="checkbox" checked={custodyAccepted} onChange={(event) => setCustodyAccepted(event.target.checked)} /><span>{t("educator_evaluation.i_verified_district_backup_restore_retention_legal_hold_of_14qu6g", "I verified district backup/restore, retention, legal-hold, official-record handoff, and deployment-owner responsibility. I understand the archive remains private in the deployment owner’s Drive until the district handles it.")}</span></label>
      {counts.openCycles > 0 && <label className="ae-check"><input type="checkbox" checked={openCyclesAccepted} onChange={(event) => setOpenCyclesAccepted(event.target.checked)} /><span>{t("educator_evaluation.i_understand_sqae7y", "I understand")} {counts.openCycles} {t("educator_evaluation.open_cycle_ns2kar", "open cycle")}{counts.openCycles === 1 ? '' : 's'} {t("educator_evaluation.will_be_archived_and_will_not_carry_into_the_new_active_ye_56m5y3", "will be archived and will not carry into the new active year.")}</span></label>}
      <div className="ae-note ae-danger" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.final_confirmation_ycj46y", "Final confirmation:")}</strong> {t("educator_evaluation.the_current_active_records_will_be_replaced_by_clean_new_y_19dn382", "the current active records will be replaced by clean new-year cycles only after the private archive is verified. Released Drive documents are not deleted.")}</div>
      <div className="ae-actions" style={{ marginTop: 12 }}><button type="button" className="ae-btn ae-btn-danger" disabled={!custodyAccepted || (counts.openCycles > 0 && !openCyclesAccepted) || state.status === 'performing'} onClick={confirm}>{state.status === 'performing' ? t("educator_evaluation.archiving_and_rolling_over_ba3quy", 'Archiving and rolling over…') : t("educator_evaluation.create_archive_and_start_lkp3q1", 'Create archive & start ') + review.nextAcademicYear}</button><button type="button" className="ae-btn" disabled={state.status === 'performing'} onClick={() => setState({ status: 'idle', review: null, result: null, error: '', errorCode: '' })}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button></div>
      <p className="ae-help">{t("educator_evaluation.review_expires_1t7v0zx", "Review expires")} {aeDateTime(review.expiresAt)}. Any intervening save makes it stale.</p>
    </div>}
    {state.result && <div className={'ae-note ' + (recoveryPending ? 'ae-danger' : 'ae-ok')} role="status" style={{ marginTop: 14 }}><strong>{recoveryPending ? t("educator_evaluation.recovery_recheck_required_1w2vfxs", 'Recovery recheck required.') : (state.status === 'completed' ? t("educator_evaluation.annual_rollover_confirmed_l8il64", 'Annual rollover confirmed.') : t("educator_evaluation.recovery_status_checked_in2em1", 'Recovery status checked.'))}</strong> {state.result.message || (recoveryPending ? t("educator_evaluation.a_verified_archive_exists_but_the_active_year_commit_is_no_4ui0yz", 'A verified archive exists, but the active-year commit is not yet confirmed. Do not retry.') : (t("educator_evaluation.the_active_year_moved_from_96rk8", 'The active year moved from ') + (state.result.fromAcademicYear || '') + ' to ' + (state.result.toAcademicYear || state.result.activeAcademicYear || '') + '.'))}
      <div className="ae-actions" style={{ marginTop: 10 }}>{archiveUrl && <a className="ae-btn" href={archiveUrl} target="_blank" rel="noopener noreferrer">{t("educator_evaluation.open_verified_private_archive_1pa6cd6", "Open verified private archive")}</a>}{state.status === 'recovery' && <button type="button" className="ae-btn" onClick={reconcile}>{t("educator_evaluation.recheck_interrupted_rollover_tswi2r", "Recheck interrupted rollover")}</button>}{state.status === 'completed' && typeof onReload === 'function' && <button type="button" className="ae-btn ae-btn-primary" onClick={onReload}>{t("educator_evaluation.reload_active_year_c5s6rz", "Reload active year")}</button>}</div>
    </div>}
    <div className="ae-actions" style={{ marginTop: 12 }}>{state.status !== 'recovery' && !recognizedRecoveryError && <button type="button" className="ae-btn ae-btn-quiet" disabled={['reviewing', 'performing', 'reconciling', 'completed'].includes(state.status)} onClick={reconcile}>{state.status === 'reconciling' ? t("educator_evaluation.rechecking_17d0cya", 'Rechecking…') : t("educator_evaluation.recheck_interrupted_rollover_tswi2r", 'Recheck interrupted rollover')}</button>}<a className="ae-link" href="https://alloflow-cdn.pages.dev/educator-evaluation-manual#annual-rollover" target="_blank" rel="noopener noreferrer">{t("educator_evaluation.open_the_rollover_recovery_guide_u66u8a", "Open the rollover recovery guide")}</a></div>
  </section>;
}

function aeWorkspaceConfigurationDraft(config) {
  const source = config || {};
  return {
    organization: source.organization || '', building: source.building || '', academicYear: source.academicYear || '',
    evaluatorName: source.evaluatorName || '', evaluatorInitials: source.evaluatorInitials || '',
    frameworkProfile: AE_FRAMEWORKS[source.frameworkProfile] ? source.frameworkProfile : 'maine_pepg',
    pepgPracticeWeight: source.pepgPracticeWeight == null || source.pepgPracticeWeight === '' ? null : Number(source.pepgPracticeWeight),
    aiReflectionEnabled: !!source.aiReflectionEnabled,
  };
}

function AeReviewedWorkspaceConfiguration({ workspace, repository, onReload }) {
  const sourceDraft = aeWorkspaceConfigurationDraft(workspace.config);
  const sourceKey = JSON.stringify(sourceDraft);
  const [draft, setDraft] = React.useState(sourceDraft);
  const [state, setState] = React.useState({ status: 'idle', review: null, result: null, error: '' });
  const [acknowledged, setAcknowledged] = React.useState(false);
  React.useEffect(() => { setDraft(aeWorkspaceConfigurationDraft(workspace.config)); }, [sourceKey]);
  const locked = ['reviewed', 'performing'].includes(state.status);
  const changed = JSON.stringify(draft) !== sourceKey;
  const set = (field, value) => setDraft((current) => {
    const next = { ...current, [field]: value };
    if (field === 'frameworkProfile' && value !== 'maine_pepg') next.pepgPracticeWeight = null;
    return next;
  });
  const resetDraft = () => { setDraft(aeWorkspaceConfigurationDraft(workspace.config)); setAcknowledged(false); setState({ status: 'idle', review: null, result: null, error: '' }); };
  const beginReview = async () => {
    if (!repository || typeof repository.reviewConfiguration !== 'function') { setState({ status: 'error', review: null, result: null, error: t("educator_evaluation.this_portal_build_does_not_expose_reviewed_district_config_1gc30oy", 'This portal build does not expose reviewed district configuration. Ask district IT to deploy the current package.') }); return; }
    setAcknowledged(false); setState({ status: 'reviewing', review: null, result: null, error: '' });
    try {
      const response = await repository.reviewConfiguration({ config: draft });
      if (!response || response.ok === false || !response.review || !response.review.token) throw new Error((response && (response.error || response.message)) || t("educator_evaluation.the_district_configuration_review_could_not_be_prepared_z49s6s", 'The district configuration review could not be prepared.'));
      setState({ status: 'reviewed', review: response.review, result: null, error: '' });
    } catch (error) { setState({ status: 'error', review: null, result: null, error: error && error.message ? error.message : t("educator_evaluation.the_district_configuration_review_could_not_be_prepared_z49s6s", 'The district configuration review could not be prepared.') }); }
  };
  const confirm = async () => {
    if (!state.review || !repository || typeof repository.performConfiguration !== 'function') return;
    setState((current) => ({ ...current, status: 'performing', error: '' }));
    try {
      const response = await repository.performConfiguration({ reviewToken: state.review.token, acknowledgeImpact: true });
      if (!response || response.ok === false) throw new Error((response && (response.error || response.message)) || t("educator_evaluation.the_reviewed_district_configuration_could_not_be_applied_1oyz12d", 'The reviewed district configuration could not be applied.'));
      setState({ status: 'completed', review: null, result: response, error: '' }); setAcknowledged(false);
    } catch (error) { setState({ status: 'unconfirmed', review: null, result: null, error: aeUnconfirmedMutationMessage('District configuration', error) }); setAcknowledged(false); }
  };
  return <section className="ae-card ae-span-6" aria-labelledby="ae-reviewed-config-title" aria-busy={['reviewing', 'performing'].includes(state.status) ? 'true' : undefined}>
    <h3 id="ae-reviewed-config-title">{t("educator_evaluation.workspace_setup_1nnvlnz", "Workspace setup")}</h3>
    <div className="ae-note ae-warn" style={{ marginBottom: 12 }}><strong>{t("educator_evaluation.administrator_only_district_configuration_1ws2ih9", "Administrator-only district configuration.")}</strong><br/>{t("educator_evaluation.these_settings_apply_across_the_portal_edit_a_draft_review_9ybru", "These settings apply across the portal. Edit a draft, review the server-produced before-and-after list, then explicitly confirm. Finalized records and frozen cycle snapshots keep their original framework and weights.")}</div>
    <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0 }}>
      <label className="ae-field"><span>{t("educator_evaluation.organization_lea_1qjo0jx", "Organization / LEA")}</span><input className="ae-input" value={draft.organization} maxLength={160} onChange={(event) => set('organization', event.target.value)}/></label>
      <div className="ae-form-grid"><label className="ae-field"><span>{t("educator_evaluation.building_12fqnbp", "Building")}</span><input className="ae-input" value={draft.building} maxLength={160} onChange={(event) => set('building', event.target.value)}/></label><label className="ae-field"><span>{t("educator_evaluation.academic_year_ud1477", "Academic year")}</span><input className="ae-input" value={draft.academicYear} maxLength={20} onChange={(event) => set('academicYear', event.target.value)}/></label><label className="ae-field"><span>{t("educator_evaluation.evaluator_name_18o703x", "Evaluator name")}</span><input className="ae-input" value={draft.evaluatorName} maxLength={160} onChange={(event) => set('evaluatorName', event.target.value)}/></label><label className="ae-field"><span>{t("educator_evaluation.evaluator_initials_kj8ht7", "Evaluator initials")}</span><input className="ae-input" value={draft.evaluatorInitials} maxLength={12} onChange={(event) => set('evaluatorInitials', event.target.value)}/></label><label className="ae-field ae-field-wide"><span>{t("educator_evaluation.evaluation_framework_s7z0k3", "Evaluation framework")}</span><select className="ae-select" value={draft.frameworkProfile} onChange={(event) => set('frameworkProfile', event.target.value)}>{Object.keys(AE_FRAMEWORKS).map((id) => <option key={id} value={id}>{AE_FRAMEWORKS[id].name}</option>)}</select></label>{draft.frameworkProfile === 'maine_pepg' && <label className="ae-field ae-field-wide"><span>{t("educator_evaluation.professional_practice_weight_optional_ixm9bs", "Professional Practice weight (%) - optional")}</span><input className="ae-input" type="number" min="0" max="100" step="1" value={draft.pepgPracticeWeight == null ? '' : draft.pepgPracticeWeight} onChange={(event) => set('pepgPracticeWeight', event.target.value === '' ? null : Number(event.target.value))} placeholder={t("educator_evaluation.example_75_student_learning_and_growth_gets_the_rest_kh2st5", "Example: 75; Student Learning and Growth gets the rest")}/></label>}</div>
      <div className="ae-field ae-field-wide"><span>{t("educator_evaluation.ai_reflection_policy_optional_1un2rr1", "AI reflection policy (optional)")}</span><label className="ae-check"><input type="checkbox" checked={draft.aiReflectionEnabled} onChange={(event) => set('aiReflectionEnabled', event.target.checked)}/><span>{t("educator_evaluation.allow_evaluators_to_send_selected_evidence_notes_and_ratin_1iezdg0", "Allow evaluators to send selected evidence notes and ratings to the configured AI provider for advisory reflection. Nothing is auto-scored or written into the record.")}</span></label></div>
    </fieldset>
    <div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={!changed || ['reviewing', 'performing'].includes(state.status) || locked} onClick={beginReview}>{state.status === 'reviewing' ? t("educator_evaluation.preparing_review_yfqhz1", 'Preparing review…') : t("educator_evaluation.review_district_configuration_5vrl3n", 'Review district configuration')}</button><button type="button" className="ae-btn" disabled={!changed || locked} onClick={resetDraft}>{t("educator_evaluation.reset_draft_1on97k3", "Reset draft")}</button></div>
    {state.error && <div className="ae-note ae-danger" role="alert" style={{ marginTop: 12 }}>{state.error}</div>}
    {state.review && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.review_tnr3lt", "Review")} {state.review.changes.length} {t("educator_evaluation.district_wide_change_djd78n", "district-wide change")}{state.review.changes.length === 1 ? '' : 's'}.</strong><div className="ae-table-wrap" style={{ marginTop: 10 }}><table className="ae-table"><caption className="ae-live">{t("educator_evaluation.district_configuration_changes_awaiting_confirmation_1qfoehr", "District configuration changes awaiting confirmation")}</caption><thead><tr><th scope="col">{t("educator_evaluation.setting_11worij", "Setting")}</th><th scope="col">{t("educator_evaluation.current_1dw4k8q", "Current")}</th><th scope="col">{t("educator_evaluation.proposed_1bv6k83", "Proposed")}</th></tr></thead><tbody>{state.review.changes.map((change) => <tr key={change.field}><th scope="row">{change.label}</th><td>{change.current}</td><td><strong>{change.candidate}</strong></td></tr>)}</tbody></table></div><p>{state.review.impacts.activeEducators} {t("educator_evaluation.active_educator_vrd2lg", "active educator")}{state.review.impacts.activeEducators === 1 ? '' : 's'} and {state.review.impacts.openCycles} {t("educator_evaluation.open_cycle_ns2kar", "open cycle")}{state.review.impacts.openCycles === 1 ? '' : 's'} {t("educator_evaluation.use_this_portal_189qtkw", "use this portal.")} {state.review.impacts.protectedSnapshots} {t("educator_evaluation.cycle_record_1w3m6xe", "cycle record")}{state.review.impacts.protectedSnapshots === 1 ? '' : 's'} {t("educator_evaluation.already_have_protected_weights_or_finalization_history_8dkgsr", "already have protected weights or finalization history.")}</p>{state.review.impacts.frameworkOrWeightChange && <p><strong>{t("educator_evaluation.framework_or_weight_policy_is_changing_for_eligible_future_8gqiyn", "Framework or weight policy is changing for eligible future work.")}</strong> {t("educator_evaluation.existing_frozen_snapshots_are_not_recalculated_1yfdkg1", "Existing frozen snapshots are not recalculated.")}</p>}<label className="ae-check"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)}/><span>{t("educator_evaluation.i_compared_every_current_and_proposed_value_confirmed_the__pufln9", "I compared every current and proposed value, confirmed the approved district plan, and understand the portal-wide impact.")}</span></label><div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={!acknowledged || state.status === 'performing'} onClick={confirm}>{state.status === 'performing' ? t("educator_evaluation.applying_reviewed_configuration_qdykq", 'Applying reviewed configuration…') : t("educator_evaluation.confirm_reviewed_configuration_1jg4f82", 'Confirm reviewed configuration')}</button><button type="button" className="ae-btn" disabled={state.status === 'performing'} onClick={resetDraft}>{t("educator_evaluation.cancel_ew9em3", "Cancel")}</button></div><p className="ae-help">{t("educator_evaluation.review_expires_1t7v0zx", "Review expires")} {aeDateTime(state.review.expiresAt)}. Any intervening workspace change makes it stale.</p></div>}
    {state.result && <div className={'ae-note ' + (state.result.recoveryPending ? 'ae-warn' : 'ae-ok')} role="status" style={{ marginTop: 12 }}><strong>{state.result.recoveryPending ? t("educator_evaluation.configuration_accepted_repository_recovery_is_pending_3na1gz", 'Configuration accepted; repository recovery is pending.') : t("educator_evaluation.district_configuration_updated_and_audited_2pst25", 'District configuration updated and audited.')}</strong>{state.result.recoveryPending ? t("educator_evaluation.reload_and_run_setup_health_before_relying_on_the_new_sett_1allin3", ' Reload and run Setup health before relying on the new settings.') : t("educator_evaluation.reload_once_to_display_the_confirmed_values_everywhere_3pyj78", ' Reload once to display the confirmed values everywhere.')}{typeof onReload === 'function' && <div className="ae-actions" style={{ marginTop: 8 }}><button type="button" className="ae-btn" onClick={onReload}>{t("educator_evaluation.reload_confirmed_settings_44jp6y", "Reload confirmed settings")}</button></div>}</div>}
  </section>;
}

function AeAbout({ workspace, updateConfig, role, isRemote = false, currentUser = null, repository = null, standalone = false, portalUrl = '', exportRubric, importRubric, clearRubric, onApplySimulation, onReload = null }) {
  const set = (field, value) => updateConfig(field, value);
  const rubricFileRef = React.useRef(null);
  const canConfigure = role === 'evaluator' && (!isRemote || !!(currentUser && currentUser.role === 'admin'));
  return <div className="ae-page">
    {/* One panel serves both roles, but the tab that opens it is labelled
        "Setup" for an evaluator and "About" for an educator: so the heading
        has to follow the label, and an educator is not configuring anything
        (caught demoing the teacher view, 2026-08-17). */}
    <div className="ae-heading"><div><h2>{role === 'teacher' ? t("educator_evaluation.about_this_workspace_k0ohsf", 'About this workspace') : (t("educator_evaluation.setup_sources_and_11y232x", 'Setup, sources, and ') + (isRemote ? t("educator_evaluation.district_records_1as8w5", 'district records') : 'sharing'))}</h2><p>{role === 'teacher' ? t("educator_evaluation.where_your_records_live_who_can_see_them_and_how_to_reach__32h3nh", 'Where your records live, who can see them, and how to reach the full manual.') : (isRemote ? t("educator_evaluation.review_the_authenticated_repository_boundary_and_the_appro_1e5mlw3", 'Review the authenticated repository boundary and the approvals that still belong to your district.') : t("educator_evaluation.configure_the_private_workspace_and_compare_all_three_reco_18k6o9l", 'Configure the private workspace and compare all three record-sharing paths.'))}</p><p><a className="ae-link" target="_blank" rel="noopener noreferrer" href="https://alloflow-cdn.pages.dev/educator-evaluation-manual">{t("educator_evaluation.user_manual_private_principal_managed_and_district_portal__156sksy", "User manual: private, principal-managed, and district portal paths")}</a></p></div></div>
    <div className="ae-grid">
      {!isRemote && role === 'evaluator' && <AeSetupPaths workspace={workspace} updateConfig={updateConfig}/>}
      {!isRemote && role === 'evaluator' && workspace.config.sampleMode && <AeSimulationStudio workspace={workspace} onApply={onApplySimulation}/>}
      {isRemote && canConfigure ? <AeReviewedWorkspaceConfiguration workspace={workspace} repository={repository} onReload={onReload}/> : <section className="ae-card ae-span-6"><h3>{t("educator_evaluation.workspace_setup_1nnvlnz", "Workspace setup")}</h3><fieldset disabled={!canConfigure} style={{ border: 0, padding: 0, margin: 0 }}><label className="ae-field"><span>{t("educator_evaluation.organization_lea_1qjo0jx", "Organization / LEA")}</span><input className="ae-input" value={workspace.config.organization} onChange={(event) => set('organization', event.target.value)}/></label><div className="ae-form-grid"><label className="ae-field"><span>{t("educator_evaluation.building_12fqnbp", "Building")}</span><input className="ae-input" value={workspace.config.building} onChange={(event) => set('building', event.target.value)}/></label><label className="ae-field"><span>{t("educator_evaluation.academic_year_ud1477", "Academic year")}</span><input className="ae-input" value={workspace.config.academicYear} onChange={(event) => set('academicYear', event.target.value)}/></label><label className="ae-field"><span>{t("educator_evaluation.evaluator_name_18o703x", "Evaluator name")}</span><input className="ae-input" value={workspace.config.evaluatorName} onChange={(event) => set('evaluatorName', event.target.value)}/></label><label className="ae-field"><span>{t("educator_evaluation.evaluator_initials_kj8ht7", "Evaluator initials")}</span><input className="ae-input" value={workspace.config.evaluatorInitials} onChange={(event) => set('evaluatorInitials', event.target.value)}/></label><label className="ae-field ae-field-wide"><span>{t("educator_evaluation.evaluation_framework_s7z0k3", "Evaluation framework")}</span><select className="ae-select" value={workspace.config.frameworkProfile || 'pa_act13'} onChange={(event) => set('frameworkProfile', event.target.value)}>{Object.keys(AE_FRAMEWORKS).map((id) => <option key={id} value={id}>{AE_FRAMEWORKS[id].name}</option>)}</select></label>{workspace.config.frameworkProfile === 'maine_pepg' && <label className="ae-field ae-field-wide"><span>{t("educator_evaluation.professional_practice_weight_optional_slg_measures_are_a_d_1lfqc4y", "Professional Practice weight (%), optional; SLG measures are a district choice under the 2019 amendments")}</span><input className="ae-input" type="number" min="0" max="100" step="1" value={workspace.config.pepgPracticeWeight == null ? '' : workspace.config.pepgPracticeWeight} onChange={(event) => set('pepgPracticeWeight', event.target.value)} placeholder={t("educator_evaluation.e_g_75_student_learning_and_growth_gets_the_rest_1upk9dh", "e.g. 75, Student Learning & Growth gets the rest")}/></label>}</div></fieldset>{isRemote && <div className="ae-note ae-warn" style={{ marginBottom: 12 }}><strong>{t("educator_evaluation.district_configuration_is_read_only_here_l2osuy", "District configuration is read-only here.")}</strong><br/>{t("educator_evaluation.an_authorized_portal_administrator_must_review_and_explici_mbmyir", "An authorized portal administrator must review and explicitly confirm any organization, year, framework, weight, or AI-policy change.")}</div>}<div className="ae-note">{AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.framework_snapshot_pennsylvania_act_13_classroom_teacher_f_iou943", 'Framework snapshot: Pennsylvania Act 13 classroom-teacher framework, June 2021. Full performance-level rubric text is not bundled.') : (AE_ACTIVE_FW.id === 'portland_me' ? t("educator_evaluation.framework_portland_pepg_guidebook_profile_the_current_dist_jnitnw", 'Framework: Portland PEPG guidebook profile; the current district plan governs. Summative Professional Practice uses the guidebook’s categorical decision matrix, not a numeric average. Confirm the guidebook version and evidence expectations before official use.') : t("educator_evaluation.framework_maine_pepg_the_district_plan_governs_rating_leve_1ftr3t5", 'Framework: Maine PEPG; the district plan governs. Rating-level labels shown are Maine State Model defaults; confirm labels, cut points, and category weights against your district’s PEPG plan. Full rubric text is not bundled.'))}</div></section>}
      <section className="ae-card ae-span-6"><h3>{t("educator_evaluation.official_references_6ap9m", "Official references")}</h3>{AE_ACTIVE_FW.id === 'pa_act13' ? <ul><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.pa.gov/agencies/education/programs-and-services/educators/educator-effectiveness">{t("educator_evaluation.pennsylvania_department_of_education_educator_effectivenes_rv8e04", "Pennsylvania Department of Education · Educator Effectiveness")}</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.pacodeandbulletin.gov/secure/pacode/data/022/chapter19/s19.2a.html">{t("educator_evaluation.22_pa_code_19_2a_classroom_teachers_2sbofk", "22 Pa. Code § 19.2a · Classroom teachers")}</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.pdesas.org/Page/Viewer/ViewPage/75">{t("educator_evaluation.pde_sas_act_13_toolkit_1mlqgks", "PDE/SAS Act 13 Toolkit")}</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://danielsongroup.org/the-framework-for-teaching/">{t("educator_evaluation.danielson_group_framework_access_and_licensing_cgrunz", "Danielson Group · Framework access and licensing")}</a></li></ul> : <ul><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.maine.gov/doe/educators/educatoreval/educator">{t("educator_evaluation.maine_doe_educator_effectiveness_pepg_g3l1y6", "Maine DOE · Educator Effectiveness (PEPG)")}</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://legislature.maine.gov/statutes/20-A/title20-Ach508sec0.html">{t("educator_evaluation.20_a_m_r_s_a_ch_508_educator_effectiveness_lk8cna", "20-A M.R.S.A. ch. 508 · Educator Effectiveness")}</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.law.cornell.edu/regulations/maine/department-05/division-071/chapter-180">{t("educator_evaluation.doe_rule_chapter_180_pepg_systems_1sqgdzk", "DOE Rule Chapter 180 · PEPG Systems")}</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://danielsongroup.org/the-framework-for-teaching/">{t("educator_evaluation.danielson_group_framework_access_and_licensing_cgrunz", "Danielson Group · Framework access and licensing")}</a></li></ul>}{AE_ACTIVE_FW.id === 'pa_act13' ? <div className="ae-note ae-warn">{t("educator_evaluation.the_older_50_observation_model_is_not_the_default_current__16agmve", "The older 50% observation model is not the default current Act 13 classroom-teacher composition. This workspace uses assignment-aware 70/10/10/10, 80% O&P where Building Level Data is unavailable, and 100% O&P for temporary classroom teachers.")}</div> : <div className="ae-note ae-warn">Maine PEPG systems are LOCAL: the district plan defines the rubric, rating levels, category weights, and process. That plan is built with a steering committee that must have a teacher majority, chosen by the local bargaining unit representative where teachers are covered by an agreement, and any revisions are reached by consensus. Since the 2019 amendments, student learning &amp; growth measures are a district choice, not a state mandate. This workspace mirrors that plan; it never substitutes for it. Enter the plan’s Professional Practice / Student Learning &amp; Growth split above.</div>}</section>
      {canConfigure && !isRemote && <section className="ae-card ae-span-12"><details><summary>{t("educator_evaluation.advanced_workspace_options_ai_reflection_and_custom_rubric_19lpqnj", "Advanced workspace options · AI reflection and custom rubric")}</summary><div style={{ paddingTop: 12 }}>{/* Off by default: this is the only feature that sends evaluation text off the device. */}<div className="ae-field ae-field-wide"><span>{t("educator_evaluation.ai_reflection_optional_k41h6r", "AI reflection (optional)")}</span><label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 6 }}><input type="checkbox" style={{ width: 24, height: 24, flex: '0 0 auto' }} checked={!!workspace.config.aiReflectionEnabled} onChange={(event) => updateConfig('aiReflectionEnabled', event.target.checked)} /><span className="ae-help" style={{ margin: 0 }}>{t("educator_evaluation.let_an_evaluator_ask_a_model_to_check_whether_the_evidence_10ic6oo", "Let an evaluator ask a model to check whether the evidence they wrote supports the ratings they assigned, and what other readings it allows.")} <strong>{t("educator_evaluation.this_sends_the_selected_educator_s_evidence_notes_and_rati_1wi7gdz", "This sends the selected educator's evidence notes and ratings to your configured AI provider.")}</strong> {t("educator_evaluation.the_reply_is_advisory_shown_to_the_evaluator_only_and_neve_1idqpos", "The reply is advisory, shown to the evaluator only, and never written into the record. Leave this off if policy does not permit AI in evaluation.")}</span></label></div><div className="ae-field ae-field-wide"><span>{t("educator_evaluation.custom_rubric_1637ee3", "Custom rubric")}</span><p className="ae-help">{t("educator_evaluation.using_4b72xz", "Using")} <strong>{AE_ACTIVE_FW.name}</strong> <code>{AE_ACTIVE_FW.versionTag}</code>. Load district-approved domains and components as JSON.</p><div className="ae-btn-row"><button type="button" className="ae-btn" onClick={exportRubric}>{t("educator_evaluation.download_current_rubric_xcgwnx", "Download current rubric")}</button><button type="button" className="ae-btn" onClick={() => rubricFileRef.current && rubricFileRef.current.click()}>{t("educator_evaluation.load_a_custom_rubric_cmb3ga", "Load a custom rubric")}</button><input ref={rubricFileRef} type="file" accept="application/json,.json" hidden tabIndex={-1} aria-label={t("educator_evaluation.choose_custom_evaluation_rubric_json_1pkk7ci", "Choose custom evaluation rubric JSON")} onChange={(event) => { const file = event.target.files && event.target.files[0]; if (file) importRubric(file); event.target.value = ''; }}/>{workspace.config.customRubric && <button type="button" className="ae-btn" onClick={clearRubric}>{t("educator_evaluation.restore_the_built_in_rubric_1tdh6uz", "Restore the built-in rubric")}</button>}</div></div></div></details></section>}
      {isRemote && canConfigure && <section className="ae-card ae-span-12"><h3>{t("educator_evaluation.approved_rubric_boundary_ja2glj", "Approved rubric boundary")}</h3><p className="ae-sub">{t("educator_evaluation.the_district_portal_persists_the_approved_built_in_framewo_17mxti4", "The district portal persists the approved built-in framework profiles shown above. Custom rubric JSON import is available only in a private on-device workspace and is intentionally unavailable here until the server can validate, version, license-review, and preserve that rubric for every affected record.")}</p><div className="ae-actions"><button type="button" className="ae-btn" onClick={exportRubric}>{t("educator_evaluation.download_current_rubric_reference_1th708k", "Download current rubric reference")}</button></div></section>}
      {(isRemote || (!isRemote && workspace.config.setupPath === 'local')) && <AeShareQr isRemote={isRemote} standalone={standalone} portalUrl={portalUrl}/>}
      {isRemote && currentUser && currentUser.role === 'admin' && repository && typeof repository.getSetupHealth === 'function' && <AeSetupHealth repository={repository}/>}
      {isRemote && currentUser && currentUser.role === 'admin' && repository && typeof repository.getAdminOperations === 'function' && <AeDistrictOperations workspace={workspace} repository={repository} onReload={onReload}/>}
      {isRemote && currentUser && currentUser.role === 'admin' && repository && typeof repository.reviewAnnualRollover === 'function' && typeof repository.performAnnualRollover === 'function' && typeof repository.reconcileAnnualRollover === 'function' && <AeAnnualRollover workspace={workspace} repository={repository} onReload={onReload}/>}
      {isRemote && <section className="ae-card ae-span-12"><h3>{t("educator_evaluation.district_hosted_portal_boundary_19z24k5", "District-hosted portal boundary")}</h3><div className="ae-grid"><div className="ae-span-4"><h4>{t("educator_evaluation.verified_identity_1f3c5yp", "Verified identity")}</h4><p className="ae-sub">{t("educator_evaluation.signed_in_as_pgomd8", "Signed in as")} {currentUser && currentUser.email ? currentUser.email : t("educator_evaluation.a_managed_district_user_1vu9uz0", 'a managed district user')}. The server, not an emailed link, determines role and record assignments.</p></div><div className="ae-span-4"><h4>{t("educator_evaluation.repository_and_audit_gch0lj", "Repository and audit")}</h4><p className="ae-sub">{t("educator_evaluation.the_district_repository_validates_authorized_mutations_ver_bcjfv7", "The district repository validates authorized mutations, versions saves, filters reads, and records server-side audit events.")}</p></div><div className="ae-span-4"><h4>{t("educator_evaluation.district_responsibilities_1jyp5ab", "District responsibilities")}</h4><p className="ae-sub">{t("educator_evaluation.the_lea_still_controls_deployment_membership_assignments_r_1go11zf", "The LEA still controls deployment, membership, assignments, retention, legal hold, incident response, approved forms, and licensed content.")}</p></div></div><div className="ae-note ae-warn"><strong>{t("educator_evaluation.google_workspace_does_not_make_a_custom_app_automatically__6upfw2", "Google Workspace does not make a custom app automatically FERPA compliant.")}</strong> {t("educator_evaluation.use_real_records_only_after_lea_authorization_and_review_18ku402", "Use real records only after LEA authorization and review.")}</div></section>}
    </div>
  </div>;
}
function AeRemoteConflictReview({ conflict, onUseDistrict, onReplay }) {
  const headingRef = React.useRef(null);
  React.useEffect(() => {
    if (conflict && headingRef.current && typeof headingRef.current.focus === 'function') headingRef.current.focus();
  }, [conflict]);
  if (!conflict) return null;
  const collisions = Array.isArray(conflict.conflicts) ? conflict.conflicts : [];
  return <div style={{ padding: '12px 20px 0' }}><section className="ae-card ae-danger" role="alert" aria-labelledby="ae-conflict-title">
    <h3 ref={headingRef} id="ae-conflict-title" tabIndex={-1}>{t("educator_evaluation.this_record_changed_in_another_session_16bw0q", "This record changed in another session")}</h3>
    <p>{t("educator_evaluation.the_newest_district_version_is_loaded_now_your_attempted_w_krg1ob", "The newest district version is loaded now. Your attempted work is held only in this page while you review it; nothing will overwrite the district record automatically.")}</p>
    {conflict.appliedCount > 0 && <div className="ae-note ae-ok" style={{ marginTop: 10 }}><strong>{conflict.appliedCount} {t("educator_evaluation.non_conflicting_change_1vqi0y5", "non-conflicting change")}{conflict.appliedCount === 1 ? '' : 's'} {t("educator_evaluation.can_be_safely_replayed_vav95c", "can be safely replayed.")}</strong><br/>{t("educator_evaluation.any_overlapping_fields_listed_below_will_remain_at_the_cur_5m0s97", "Any overlapping fields listed below will remain at the current district value.")}</div>}
    {collisions.length > 0 && <div style={{ marginTop: 12 }}><h4>{t("educator_evaluation.overlapping_changes_kept_from_the_district_version_1s15kzg", "Overlapping changes kept from the district version")}</h4><dl className="ae-review-facts">{collisions.slice(0, 12).map((item, index) => <React.Fragment key={item.path + index}><dt>{item.path}</dt><dd><strong>{t("educator_evaluation.district_now_onsm67", "District now:")}</strong> {aeConflictValue(item.current)}<br/><strong>{t("educator_evaluation.your_attempt_wyan6r", "Your attempt:")}</strong> {aeConflictValue(item.attempted)}</dd></React.Fragment>)}</dl>{collisions.length > 12 && <p className="ae-sub">{collisions.length - 12} {t("educator_evaluation.additional_overlapping_fields_are_also_being_kept_from_the_86r499", "additional overlapping fields are also being kept from the district version.")}</p>}</div>}
    <div className="ae-actions" style={{ marginTop: 14 }}><button type="button" className="ae-btn" onClick={onUseDistrict}>{t("educator_evaluation.use_district_version_1oumuxi", "Use district version")}</button>{conflict.appliedCount > 0 && <button type="button" className="ae-btn ae-btn-primary" onClick={onReplay}>{t("educator_evaluation.reapply_only_my_non_conflicting_work_15jt0nd", "Reapply only my non-conflicting work")}</button>}</div>
  </section></div>;
}
function aeRemoteScopedWorkspace(value, currentUser) {
  const normalized = aeNormalizeWorkspace(value);
  if (!normalized) return null;
  if (!currentUser || currentUser.role !== 'teacher') return normalized;
  const teacherId = aeSafeId(currentUser.teacherId, '');
  if (!teacherId || !normalized.teachers.some((teacher) => teacher.id === teacherId)) return null;
  normalized.teachers = normalized.teachers.filter((teacher) => teacher.id === teacherId);
  normalized.walkthroughs = normalized.walkthroughs.filter((item) => item.teacherId === teacherId && item.publishedAt);
  normalized.observations = normalized.observations.filter((item) => item.teacherId === teacherId);
  normalized.spms = normalized.spms.filter((item) => item.teacherId === teacherId);
  normalized.comments = normalized.comments.filter((item) => item.teacherId === teacherId);
  normalized.audit = normalized.audit.filter((item) => item.teacherId === teacherId);
  normalized.cycleSnapshots = normalized.cycleSnapshots.filter((item) => item.teacherId === teacherId);
  return normalized;
}
function aeRemoteSaveJobMeta(mutation) {
  const event = aeString(mutation && mutation.event, 40, '').toUpperCase();
  const debounced = ['DRAFT_SAVED', 'PROFILE_UPDATED', 'CONFIG_UPDATED', 'RATING_UPDATED'].includes(event);
  const material = ['PROFILE_UPDATED', 'RATING_UPDATED'].includes(event);
  return {
    debounced,
    material,
    coalescingScope: JSON.stringify([
      event,
      aeSafeId(mutation && mutation.teacherId, ''),
      aeString(mutation && mutation.entityType, 60, ''),
      aeSafeId(mutation && mutation.entityId, ''),
    ]),
  };
}
function aeRemoteSaveScopeBoundary(left, right) {
  return !!left && !!right && (left.material || right.material) && left.coalescingScope !== right.coalescingScope;
}
function EducatorEvaluationPanel(props) {
  const { onClose = (() => {}), addToast = (() => {}), standalone = false, repository = null, initialRoute = null, t: hostTranslator = null } = props || {};
  aeSetTranslator(hostTranslator);
  const isRemote = !!repository && typeof repository.bootstrap === 'function' && typeof repository.saveWorkspace === 'function';
  const [initialLocalLoad] = React.useState(() => isRemote ? { status: 'remote', workspace: null, raw: '', error: '' } : aeReadLocalWorkspace());
  const [initialOnboardingChoice] = React.useState(() => isRemote ? '' : aeReadOnboardingChoice());
  const firstLocalWorkspace = initialLocalLoad.status === 'ok' ? initialLocalLoad.workspace : null;
  const [workspace, setWorkspace] = React.useState(() => {
    if (isRemote) return aeBlankWorkspace();
    if (firstLocalWorkspace) return firstLocalWorkspace;
    return initialOnboardingChoice === 'sample' ? aeSampleWorkspace() : aeBlankWorkspace();
  });
  // Refresh the module-level framework pointer for this render pass, so every
  // scoring/label helper below reflects THIS workspace's configured framework.
  aeSetActiveFramework(workspace.config);
  const [showLocalOnboarding, setShowLocalOnboarding] = React.useState(() => !isRemote && initialLocalLoad.status === 'empty' && !initialOnboardingChoice);
  const [role, setRole] = React.useState(() => workspace.educatorPacketMode ? 'teacher' : 'evaluator');
  const [tab, setTab] = React.useState('overview');
  const [tourStep, setTourStep] = React.useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = React.useState(() => (workspace.teachers[0] && workspace.teachers[0].id) || '');
  const [liveMessage, setLiveMessage] = React.useState({ text: '', id: 0 });
  const [operationNotice, setOperationNotice] = React.useState({ text: '', type: 'info', id: 0 });
  const [localRecovery, setLocalRecovery] = React.useState(() => !isRemote && ['corrupt', 'unavailable'].includes(initialLocalLoad.status) ? initialLocalLoad : null);
  const [localRecoveryResetArmed, setLocalRecoveryResetArmed] = React.useState(false);
  const [localSaveState, setLocalSaveState] = React.useState(() => ({
    status: initialLocalLoad.status === 'ok' ? 'saved' : (initialLocalLoad.status === 'unavailable' ? 'error' : 'idle'),
    error: initialLocalLoad.status === 'unavailable' ? t("educator_evaluation.browser_storage_is_unavailable_changes_cannot_be_saved_on__1w0v96b", 'Browser storage is unavailable. Changes cannot be saved on this device.') : '',
    savedAt: initialLocalLoad.status === 'ok' ? aeNow() : '',
  }));
  const [pendingImport, setPendingImport] = React.useState(null);
  const [importUndo, setImportUndo] = React.useState(null);
  const [remoteState, setRemoteState] = React.useState(() => ({ status: isRemote ? 'loading' : 'local', error: '', currentUser: null, deployment: null, inFlight: false }));
  const [remoteConflict, setRemoteConflict] = React.useState(null);
  const [notificationState, setNotificationState] = React.useState({ status: 'idle', key: '', teacherId: '', target: '', recipient: '', recipients: [], review: null, error: '' });
  const [notificationReceipts, setNotificationReceipts] = React.useState({});
  const [releaseShareState, setReleaseShareState] = React.useState({ status: 'idle', error: '', review: null, result: null });
  const [reflection, setReflection] = React.useState({ status: 'idle', text: '', teacherId: '', requestId: 0 });
  const [actionReview, setActionReview] = React.useState(null);
  const dialogRef = React.useRef(null);
  const workspaceRef = React.useRef(workspace);
  const remoteRevisionRef = React.useRef(0);
  const remoteSaveQueueRef = React.useRef(Promise.resolve());
  const remoteSaveGenerationRef = React.useRef(0);
  const remoteDebounceRef = React.useRef(null);
  const remotePendingRef = React.useRef(null);
  const remoteQueuedSaveRef = React.useRef([]);
  const remoteActiveSaveRef = React.useRef(null);
  const remoteMountedRef = React.useRef(true);
  const remoteUserRef = React.useRef(null);
  const remoteInFlightRef = React.useRef(false);
  const notificationRequestRef = React.useRef(false);
  const releaseRequestRef = React.useRef(false);
  const reflectionRequestRef = React.useRef({ teacherId: '', requestId: 0 });
  const notificationReceiptRef = React.useRef(null);
  const focusedNotificationReceiptRef = React.useRef('');
  const activeTabRef = React.useRef(tab);
  const requestCloseRef = React.useRef(null);
  activeTabRef.current = tab;
  const restoreRemoteWorkspaceFocus = React.useCallback(() => {
    requestAnimationFrame(() => {
      if (!remoteMountedRef.current) return;
      const activeTab = document.getElementById('ae-tab-' + activeTabRef.current);
      const panel = document.getElementById('ae-panel');
      const target = activeTab || (panel && !panel.hasAttribute('inert') ? panel : null);
      if (target && typeof target.focus === 'function') target.focus();
    });
  }, []);
  const selectedTeacher = workspace.teachers.find((teacher) => teacher.id === selectedTeacherId) || null;
  const selectedTeacherIdRef = React.useRef(selectedTeacherId);
  selectedTeacherIdRef.current = selectedTeacherId;
  // Local role switching is normally a read-only visibility preview because it
  // is not authentication. The guided sample is the one deliberate exception:
  // every record is fictional and explicitly marked simulated, so principals
  // can rehearse the educator-owned steps of a full cycle without weakening the
  // boundary around a real local workspace.
  const localFictionalRehearsal = !isRemote && role === 'teacher' && !workspace.educatorPacketMode && !!workspace.config.sampleMode;
  const localTeacherPreview = !isRemote && role === 'teacher' && !workspace.educatorPacketMode && !workspace.config.sampleMode;
  const notify = React.useCallback((message, type) => {
    const tone = type || 'info';
    try { addToast(message, tone); } catch (_) {}
    setOperationNotice({ text: String(message || ''), type: tone, id: Date.now() });
    setLiveMessage({ text: String(message || ''), id: Date.now() });
  }, [addToast]);
  const requestClose = React.useCallback(() => {
    if (notificationRequestRef.current || releaseRequestRef.current) {
      const message = notificationRequestRef.current
        ? t('educator_evaluation.close_blocked_notification_outcome_pending_20260831', 'Close blocked while the portal-notice outcome is being prepared, sent, or checked. Keep this window open until the exact notification outcome is confirmed.')
        : t('educator_evaluation.close_blocked_release_outcome_pending_20260831', 'Close blocked while released-summary access is being reviewed or changed. Keep this window open until the exact disclosure outcome is confirmed.');
      notify(message, 'error');
      return false;
    }
    if (isRemote) {
      const savePending = remoteInFlightRef.current
        || remoteState.status === 'saving'
        || !!remoteDebounceRef.current
        || !!remotePendingRef.current
        || remoteQueuedSaveRef.current.length > 0
        || !!remoteActiveSaveRef.current;
      const connectedSaveFailure = !!remoteState.currentUser && ['error', 'conflict'].includes(remoteState.status);
      if (savePending || connectedSaveFailure) {
        const message = remoteState.status === 'conflict'
          ? t('educator_evaluation.close_blocked_resolve_concurrent_edit_20260830', 'Close blocked because a concurrent edit still needs review. Choose which district version to keep before closing.')
          : (remoteState.status === 'error'
            ? t('educator_evaluation.close_blocked_remote_change_unconfirmed_20260830', 'Close blocked because the last district change is not confirmed. Review the save error and recover or reload the district copy before closing.')
            : t('educator_evaluation.close_blocked_remote_save_pending_20260830', 'Close blocked while a district save is still pending. Keep this window open until saving finishes.'));
        notify(message, 'error');
        return false;
      }
      onClose();
      return true;
    }
    if (showLocalOnboarding || localRecovery) {
      onClose();
      return true;
    }
    if (localSaveState.status === 'error') {
      notify(t('educator_evaluation.close_blocked_local_save_error_20260830', 'Close blocked because changes are not saved. Use Retry save or Download emergency backup before closing.'), 'error');
      return false;
    }
    if (['idle', 'saving'].includes(localSaveState.status)) {
      const result = aeStore(workspaceRef.current);
      if (!result.ok) {
        setLocalSaveState({ status: 'error', error: result.error, detail: result.detail || '', savedAt: '' });
        notify(result.error + ' ' + t('educator_evaluation.close_blocked_use_local_recovery_actions_20260830', 'Close blocked. Use Retry save or Download emergency backup before closing.'), 'error');
        return false;
      }
      setLocalSaveState({ status: 'saved', error: '', savedAt: result.savedAt });
    }
    onClose();
    return true;
  }, [isRemote, localRecovery, localSaveState.status, notify, onClose, remoteState.currentUser, remoteState.status, showLocalOnboarding]);
  requestCloseRef.current = requestClose;
  const requestActionReview = React.useCallback((review) => {
    if (!review || typeof review.onConfirm !== 'function') return;
    setActionReview(Object.assign({}, review, { token: aeId('review') }));
  }, []);
  const cancelActionReview = React.useCallback(() => setActionReview(null), []);
  const confirmActionReview = React.useCallback(() => {
    const current = actionReview;
    setActionReview(null);
    if (current && typeof current.onConfirm === 'function') current.onConfirm();
  }, [actionReview]);

  React.useEffect(() => {
    workspaceRef.current = workspace;
    if (isRemote || showLocalOnboarding || localRecovery) return undefined;
    setLocalSaveState((current) => ({ ...current, status: 'saving', error: '' }));
    const timer = setTimeout(() => {
      const result = aeStore(workspace);
      setLocalSaveState(result.ok
        ? { status: 'saved', error: '', savedAt: result.savedAt }
        : { status: 'error', error: result.error, detail: result.detail || '', savedAt: '' });
    }, 250);
    return () => clearTimeout(timer);
  }, [workspace, isRemote, showLocalOnboarding, localRecovery]);
  React.useEffect(() => {
    if (isRemote) return undefined;
    const warnBeforeUnload = (event) => {
      if (!['saving', 'error'].includes(localSaveState.status)) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isRemote, localSaveState.status]);
  React.useEffect(() => {
    if (!selectedTeacher && workspace.teachers[0]) setSelectedTeacherId(workspace.teachers[0].id);
    if (!isRemote && workspace.educatorPacketMode && role !== 'teacher') setRole('teacher');
    if (isRemote && role === 'teacher' && remoteState.currentUser && remoteState.currentUser.teacherId && selectedTeacherId !== remoteState.currentUser.teacherId) {
      setSelectedTeacherId(remoteState.currentUser.teacherId);
    }
  }, [workspace.teachers.length, workspace.educatorPacketMode, selectedTeacherId, role, isRemote, remoteState.currentUser]);
  React.useEffect(() => {
    if (!Number.isInteger(tourStep) || !AE_GUIDED_TOUR_STEPS[tourStep]) return;
    setRole('evaluator');
    setTab(AE_GUIDED_TOUR_STEPS[tourStep].tab);
    requestAnimationFrame(() => { const panel = document.getElementById('ae-panel'); if (panel) panel.focus(); });
  }, [tourStep]);
  const loadRemoteWorkspace = React.useCallback(async () => {
    if (!isRemote) return;
    setRemoteState((current) => ({ ...current, status: 'loading', error: '', inFlight: false }));
    try {
      const payload = await repository.bootstrap();
      if (!payload || payload.ok === false) throw new Error((payload && payload.error) || t("educator_evaluation.the_district_portal_did_not_return_a_workspace_1fquciu", 'The district portal did not return a workspace.'));
      const normalized = aeNormalizeWorkspace(payload.workspace);
      if (!normalized) throw new Error('The district portal returned an invalid workspace.');
      const currentUser = aePlainObject(payload.currentUser) ? payload.currentUser : null;
      const nextRole = currentUser && currentUser.role === 'teacher' ? 'teacher' : 'evaluator';
      if (!currentUser || !aeString(currentUser.email, 320, '')) throw new Error('The district portal could not verify your managed Google account.');
      if (nextRole === 'teacher') {
        const teacherId = aeSafeId(currentUser.teacherId, '');
        if (!teacherId || !normalized.teachers.some((teacher) => teacher.id === teacherId)) throw new Error('No educator evaluation assignment is linked to this account.');
        normalized.teachers = normalized.teachers.filter((teacher) => teacher.id === teacherId);
        normalized.walkthroughs = normalized.walkthroughs.filter((item) => item.teacherId === teacherId && item.publishedAt);
        normalized.observations = normalized.observations.filter((item) => item.teacherId === teacherId);
        normalized.spms = normalized.spms.filter((item) => item.teacherId === teacherId);
        normalized.comments = normalized.comments.filter((item) => item.teacherId === teacherId);
        normalized.audit = normalized.audit.filter((item) => item.teacherId === teacherId);
        normalized.cycleSnapshots = normalized.cycleSnapshots.filter((item) => item.teacherId === teacherId);
      }
      const route = aePlainObject(initialRoute) ? initialRoute : (typeof repository.getInitialRoute === 'function' ? repository.getInitialRoute() : null);
      const requestedTeacherId = aeSafeId(route && route.teacherId, '');
      const nextTeacherId = nextRole === 'teacher'
        ? aeSafeId(currentUser.teacherId, '')
        : (requestedTeacherId && normalized.teachers.some((teacher) => teacher.id === requestedTeacherId)
          ? requestedTeacherId
          : ((normalized.teachers[0] && normalized.teachers[0].id) || ''));
      const allowedViews = nextRole === 'teacher'
        ? ['overview', 'trends', 'walkthroughs', 'formal', 'spm', 'audit', 'about']
        : ['overview', 'trends', 'staff', 'walkthroughs', 'formal', 'spm', 'audit', 'about'];
      const requestedView = aeString(route && route.view, 24, '').toLowerCase();
      const revision = Number(payload.revision);
      remoteRevisionRef.current = Number.isInteger(revision) && revision >= 0 ? revision : 0;
      workspaceRef.current = normalized;
      setWorkspace(normalized);
      setRemoteConflict(null);
      setRole(nextRole);
      setSelectedTeacherId(nextTeacherId);
      setTab(allowedViews.includes(requestedView) ? requestedView : 'overview');
      remoteUserRef.current = currentUser;
      setRemoteState({ status: 'saved', error: '', currentUser, deployment: aePlainObject(payload.deployment) ? payload.deployment : null, inFlight: false });
    } catch (error) {
      if (!remoteMountedRef.current) return;
      setRemoteState((current) => ({ ...current, status: 'error', error: String((error && error.message) || error || t("educator_evaluation.unable_to_open_the_district_portal_17504d4", 'Unable to open the district portal.')), inFlight: false }));
    }
  }, [isRemote, repository, initialRoute]);

  React.useEffect(() => {
    remoteMountedRef.current = true;
    if (isRemote) loadRemoteWorkspace();
    return () => {
      remoteMountedRef.current = false;
      if (remoteDebounceRef.current) clearTimeout(remoteDebounceRef.current);
      remotePendingRef.current = null;
      remoteQueuedSaveRef.current = [];
      remoteActiveSaveRef.current = null;
    };
  }, [isRemote, loadRemoteWorkspace]);

  React.useEffect(() => {
    if (!isRemote) return undefined;
    const beforeUnload = (event) => {
      const pending = remoteInFlightRef.current || remoteState.status === 'saving' || !!remoteDebounceRef.current || !!remotePendingRef.current || remoteQueuedSaveRef.current.length > 0 || !!remoteActiveSaveRef.current;
      const unresolved = !!remoteState.currentUser && ['error', 'conflict'].includes(remoteState.status);
      const externalActionPending = notificationRequestRef.current || releaseRequestRef.current;
      if (!pending && !unresolved && !externalActionPending) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isRemote, remoteState.status]);

  React.useEffect(() => {
    if (standalone) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previous = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const focusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((el) => !el.closest('[hidden],[inert],[aria-hidden="true"]'));
    (focusable()[0] || dialog).focus();
    const keydown = (event) => {
      if (event.defaultPrevented || !isTopTrap() || dialog.closest('[inert],[aria-hidden="true"]')) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); requestCloseRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); dialog.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      const wasTop = isTopTrap();
      const index = trapStack.indexOf(trap);
      if (index !== -1) trapStack.splice(index, 1);
      if (wasTop && previous && previous !== document.body && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    };
  }, [standalone]);

  const announce = React.useCallback((message) => {
    setLiveMessage((current) => ({ text: '', id: current.id + 1 }));
    setTimeout(() => setLiveMessage((current) => ({ text: message, id: current.id + 1 })), 0);
  }, []);

  const notificationTarget = role === 'teacher' ? 'evaluator' : 'teacher';
  const notificationKey = selectedTeacher ? selectedTeacher.id + '|' + notificationTarget : '';
  const notificationReceipt = notificationKey ? (notificationReceipts[notificationKey] || null) : null;
  const notificationActionsDisabled = ['saving', 'error', 'conflict'].includes(remoteState.status);
  const releaseActionsDisabled = ['loading', 'saving', 'error', 'conflict'].includes(remoteState.status) || !!remoteConflict;
  const notificationBusy = ['reviewing', 'reviewing_recipient', 'sending', 'checking_outcome'].includes(notificationState.status);

  const recordNotificationOutcome = React.useCallback((lookup, result) => {
    let status = String(result && result.status || '').toLowerCase();
    if (status === 'audit_recovery_pending' || (result && (result.auditPending || result.recoveryPending))) status = 'recovery_pending';
    if (result && result.deliveryUnknown) status = 'delivery_unknown';
    const serverReceipt = result && result.receipt;
    const suppliedMessage = typeof serverReceipt === 'string' ? serverReceipt : ((serverReceipt && serverReceipt.message) || (result && result.message));
    const key = lookup.teacherId + '|' + lookup.target;
    if (status === 'not_started') {
      const message = aeString(suppliedMessage, 1200, t('educator_evaluation.notice_not_started_exact_20260827', 'The district repository confirms that no notice send began. You may start a fresh reviewed notice.'));
      setNotificationReceipts((current) => {
        if (!current[key]) return current;
        const next = Object.assign({}, current);
        delete next[key];
        return next;
      });
      setNotificationState({ status: 'idle', key: '', teacherId: '', target: '', recipient: '', recipients: [], review: null, error: '' });
      announce(message);
      notify(message, 'info');
      return status;
    }
    if (!['completed', 'recovery_pending', 'delivery_unknown'].includes(status)) status = 'delivery_unknown';
    const fallbackMessage = status === 'completed'
      ? (result && result.idempotent
        ? t('educator_evaluation.notice_exact_prior_completion_confirmed_20260827', 'The district repository confirmed the prior reviewed notice. No duplicate notice was sent.')
        : (lookup.target === 'evaluator' ? t('educator_evaluation.a_content_free_portal_notice_was_emailed_to_your_evaluator_1pmpu2x', 'A content-free portal notice was emailed to your evaluator.') : t('educator_evaluation.a_content_free_portal_notice_was_emailed_to_the_educator_y0bpi3', 'A content-free portal notice was emailed to the educator.')))
      : (status === 'recovery_pending'
        ? t('educator_evaluation.portal_notice_audit_recovery_pending_20260826', 'The portal notice was emailed, but audit recovery is pending. Do not resend this notice; an administrator should reconcile workspace ledgers.')
        : t('educator_evaluation.notice_delivery_unknown_do_not_resend_20260827', 'The exact delivery outcome is still unknown. Do not resend this notice; check the exact notice outcome.'));
    const receipt = {
      key,
      teacherId: lookup.teacherId,
      target: lookup.target,
      reviewToken: lookup.reviewToken,
      status,
      message: aeString(suppliedMessage, 1200, fallbackMessage),
      idempotent: !!(result && result.idempotent),
      recipient: aeString((result && result.recipient) || (serverReceipt && serverReceipt.recipient), 320, ''),
      completedAt: aeString(result && result.completedAt, 80, ''),
      repeatEligible: !!(result && result.repeatEligible),
      checkError: '',
    };
    setNotificationReceipts((current) => Object.assign({}, current, { [key]: receipt }));
    setNotificationState({ status: 'idle', key: '', teacherId: '', target: '', recipient: '', recipients: [], review: null, error: '' });
    announce(receipt.message);
    notify(receipt.message, status === 'completed' ? 'success' : (status === 'delivery_unknown' ? 'error' : 'info'));
    return status;
  }, [announce, notify]);

  const beginNotificationReview = React.useCallback(async (chosenRecipient, repeatPriorNotice) => {
    const teacher = selectedTeacher;
    const target = role === 'teacher' ? 'evaluator' : 'teacher';
    const key = teacher ? teacher.id + '|' + target : '';
    const priorReceipt = key ? notificationReceipts[key] : null;
    const repeatApproved = repeatPriorNotice === true && !!priorReceipt && priorReceipt.status === 'completed' && priorReceipt.repeatEligible === true;
    if (!isRemote || !teacher || notificationActionsDisabled || notificationRequestRef.current || (priorReceipt && !repeatApproved)
      || typeof repository.reviewNotification !== 'function' || typeof repository.sendNotification !== 'function' || typeof repository.getNotificationOutcome !== 'function') return;
    notificationRequestRef.current = true;
    const recipient = aeString(chosenRecipient, 320, '');
    setNotificationState((current) => ({
      status: recipient ? 'reviewing_recipient' : 'reviewing',
      key,
      teacherId: teacher.id,
      target,
      recipient,
      recipients: recipient ? current.recipients : [],
      review: null,
      repeatPrior: repeatApproved,
      error: '',
    }));
    try {
      if (!repeatApproved) {
        const prior = await repository.getNotificationOutcome({ teacherId: teacher.id, target });
        if (!prior || prior.ok === false || !prior.status) {
          const priorError = new Error((prior && (prior.error || prior.message)) || t('educator_evaluation.notice_outcome_preflight_failed_20260828', 'The portal could not verify whether an earlier notice is unresolved. Nothing was sent.'));
          if (prior && typeof prior.code === 'string') priorError.code = prior.code;
          throw priorError;
        }
        if (!remoteMountedRef.current) return;
        if (!['not_started', 'no_unresolved'].includes(String(prior.status).toLowerCase())) {
          recordNotificationOutcome({ teacherId: teacher.id, target, reviewToken: '' }, prior);
          return;
        }
      }
      const request = { teacherId: teacher.id, target };
      if (recipient) request.recipient = recipient;
      const result = await repository.reviewNotification(request);
      if (!result || result.ok === false) {
        const reviewError = new Error((result && (result.error || result.message)) || t('educator_evaluation.notice_review_could_not_be_prepared_20260827', 'The notice review could not be prepared. Nothing was sent.'));
        if (result && typeof result.code === 'string') reviewError.code = result.code;
        throw reviewError;
      }
      if (!remoteMountedRef.current) return;
      if (result.status === 'recipient_selection_required') {
        const recipients = (Array.isArray(result.recipients) ? result.recipients : []).map((item) => ({
          email: aeString(item && item.email, 320, ''),
          displayName: aeString(item && item.displayName, 200, ''),
        })).filter((item, index, values) => item.email && values.findIndex((candidate) => candidate.email === item.email) === index);
        if (!recipients.length) throw new Error(t('educator_evaluation.no_authorized_notice_recipients_20260827', 'No authorized notice recipients are available for this record.'));
        setNotificationState({ status: 'selecting_recipient', key, teacherId: teacher.id, target, recipient: '', recipients, review: null, repeatPrior: repeatApproved, error: '' });
        announce(t('educator_evaluation.choose_authorized_notice_recipient_20260827', 'Choose the authorized notice recipient. Nothing has been sent.'));
        return;
      }
      const review = result.review;
      if (!review || !review.token || !review.portalUrl || review.teacherId !== teacher.id || review.target !== target || (recipient && review.recipient !== recipient)) throw new Error(t('educator_evaluation.notice_review_invalid_20260827', 'The district repository returned an invalid notice review. Nothing was sent.'));
      if (repeatApproved) {
        setNotificationReceipts((current) => {
          if (!current[key]) return current;
          const next = Object.assign({}, current);
          delete next[key];
          return next;
        });
      }
      setNotificationState({ status: 'ready', key, teacherId: teacher.id, target, recipient: review.recipient || recipient, recipients: [], review, repeatPrior: repeatApproved, error: '' });
      announce(t('educator_evaluation.notice_review_opened_nothing_sent_20260827', 'Notice review opened. Nothing has been emailed yet.'));
    } catch (error) {
      if (!remoteMountedRef.current) return;
      let failure = error;
      if (failure && failure.code === 'notification_recovery_required') {
        try {
          const recovered = await repository.getNotificationOutcome({ teacherId: teacher.id, target });
          if (recovered && recovered.ok !== false && recovered.status && !['not_started', 'no_unresolved'].includes(String(recovered.status).toLowerCase())) {
            if (remoteMountedRef.current) recordNotificationOutcome({ teacherId: teacher.id, target, reviewToken: '' }, recovered);
            return;
          }
        } catch (recoveryError) {
          failure = recoveryError;
        }
      }
      const message = String((failure && failure.message) || failure || t('educator_evaluation.notice_review_could_not_be_prepared_20260827', 'The notice review could not be prepared. Nothing was sent.'));
      setNotificationState({ status: 'idle', key: '', teacherId: '', target: '', recipient: '', recipients: [], review: null, error: '' });
      notify(message, 'error');
    } finally {
      notificationRequestRef.current = false;
    }
  }, [isRemote, selectedTeacher, role, notificationActionsDisabled, notificationReceipts, repository, recordNotificationOutcome, announce, notify]);
  const cancelNotificationReview = React.useCallback(() => {
    if (notificationRequestRef.current || ['reviewing_recipient', 'sending'].includes(notificationState.status)) return;
    setNotificationState({ status: 'idle', key: '', teacherId: '', target: '', recipient: '', recipients: [], review: null, error: '' });
    announce(t('educator_evaluation.notice_review_cancelled_nothing_sent_20260827', 'Notice review canceled. Nothing was sent.'));
  }, [notificationState, announce]);

  const confirmNotification = React.useCallback(async (acknowledged) => {
    const review = notificationState.review;
    if (!acknowledged || !review || notificationState.status !== 'ready' || notificationActionsDisabled || notificationRequestRef.current) return;
    const lookup = { teacherId: notificationState.teacherId, target: notificationState.target, reviewToken: aeString(review.token, 500, '') };
    notificationRequestRef.current = true;
    setNotificationState((current) => Object.assign({}, current, { status: 'sending', error: '' }));
    try {
      const result = await repository.sendNotification({ teacherId: lookup.teacherId, target: lookup.target, reviewToken: lookup.reviewToken, acknowledged: true });
      if (!result || result.ok === false || !result.status) {
        const responseError = new Error((result && (result.error || result.message)) || 'unconfirmed notification response');
        if (result && typeof result.code === 'string') responseError.code = result.code;
        if (result && result.preDispatch === true) responseError.preDispatch = true;
        throw responseError;
      }
      if (!remoteMountedRef.current) return;
      recordNotificationOutcome(lookup, result);
    } catch (error) {
      if (!remoteMountedRef.current) return;
      const key = lookup.teacherId + '|' + lookup.target;
      if (error && error.preDispatch === true) {
        let scopedOutcome = null;
        try {
          scopedOutcome = await repository.getNotificationOutcome({ teacherId: lookup.teacherId, target: lookup.target });
          if (!scopedOutcome || scopedOutcome.ok === false || !scopedOutcome.status) throw new Error((scopedOutcome && (scopedOutcome.error || scopedOutcome.message)) || 'scope outcome unavailable');
        } catch (outcomeError) {
          if (!remoteMountedRef.current) return;
          const message = t('educator_evaluation.notice_scope_outcome_unconfirmed_20260828', 'This send was refused before dispatch, but the portal could not verify whether an earlier notice for this educator and target is unresolved. Do not send another notice; check the exact outcome.');
          setNotificationReceipts((current) => Object.assign({}, current, { [key]: { key, teacherId: lookup.teacherId, target: lookup.target, reviewToken: '', status: 'transport_unknown', message, idempotent: false, recipient: aeString(review.recipient, 320, ''), checkError: String((outcomeError && outcomeError.message) || outcomeError || '') } }));
          setNotificationState({ status: 'idle', key: '', teacherId: '', target: '', recipient: '', recipients: [], review: null, error: '' });
          announce(message);
          notify(message, 'error');
          return;
        }
        if (!remoteMountedRef.current) return;
        if (!['not_started', 'no_unresolved'].includes(String(scopedOutcome.status).toLowerCase())) {
          recordNotificationOutcome({ teacherId: lookup.teacherId, target: lookup.target, reviewToken: '' }, scopedOutcome);
          return;
        }
        const detail = String(error.message || '').trim();
        const message = t('educator_evaluation.notice_refused_before_dispatch_20260828', 'The district repository refused this notice before mail dispatch. Nothing was sent; you may prepare a fresh review.') + (detail ? ' ' + detail : '');
        setNotificationReceipts((current) => {
          if (!current[key]) return current;
          const next = Object.assign({}, current);
          delete next[key];
          return next;
        });
        setNotificationState({ status: 'idle', key: '', teacherId: '', target: '', recipient: '', recipients: [], review: null, error: '' });
        announce(message);
        notify(message, 'error');
        return;
      }
      const message = t('educator_evaluation.notice_response_lost_check_exact_outcome_20260827', 'The notice response was lost. Do not resend this notice. Check the exact notice outcome before taking any other action.');
      setNotificationReceipts((current) => Object.assign({}, current, { [key]: { key, teacherId: lookup.teacherId, target: lookup.target, reviewToken: lookup.reviewToken, status: 'transport_unknown', message, idempotent: false, recipient: aeString(review.recipient, 320, ''), checkError: String((error && error.message) || error || '') } }));
      setNotificationState({ status: 'idle', key: '', teacherId: '', target: '', recipient: '', recipients: [], review: null, error: '' });
      announce(message);
      notify(message, 'error');
    } finally {
      notificationRequestRef.current = false;
    }
  }, [notificationState, notificationActionsDisabled, repository, recordNotificationOutcome, announce, notify]);
  const checkNotificationOutcome = React.useCallback(async () => {
    const receipt = notificationReceipt;
    if (!receipt || notificationActionsDisabled || notificationRequestRef.current || typeof repository.getNotificationOutcome !== 'function') return;
    notificationRequestRef.current = true;
    setNotificationState({ status: 'checking_outcome', key: receipt.key, teacherId: receipt.teacherId, target: receipt.target, recipient: '', recipients: [], review: null, error: '' });
    try {
      const outcomeRequest = { teacherId: receipt.teacherId, target: receipt.target };
      if (receipt.reviewToken) outcomeRequest.reviewToken = receipt.reviewToken;
      const result = await repository.getNotificationOutcome(outcomeRequest);
      if (!result || result.ok === false || !result.status) throw new Error((result && (result.error || result.message)) || t('educator_evaluation.notice_outcome_not_available_20260827', 'The exact notice outcome is not available yet.'));
      if (!remoteMountedRef.current) return;
      recordNotificationOutcome(receipt, result);
    } catch (error) {
      if (!remoteMountedRef.current) return;
      const message = String((error && error.message) || error || t('educator_evaluation.notice_outcome_not_available_20260827', 'The exact notice outcome is not available yet.'));
      setNotificationReceipts((current) => current[receipt.key] ? Object.assign({}, current, { [receipt.key]: Object.assign({}, current[receipt.key], { checkError: message }) }) : current);
      setNotificationState({ status: 'idle', key: '', teacherId: '', target: '', recipient: '', recipients: [], review: null, error: '' });
      notify(message, 'error');
    } finally {
      notificationRequestRef.current = false;
    }
  }, [notificationReceipt, notificationActionsDisabled, repository, recordNotificationOutcome, notify]);

  React.useEffect(() => {
    if (!notificationReceipt) return;
    const marker = notificationReceipt.key + '|' + notificationReceipt.status + '|' + notificationReceipt.message;
    if (focusedNotificationReceiptRef.current === marker) return;
    focusedNotificationReceiptRef.current = marker;
    requestAnimationFrame(() => {
      if (notificationReceiptRef.current && typeof notificationReceiptRef.current.focus === 'function') notificationReceiptRef.current.focus();
    });
  }, [notificationReceipt]);

  // Share the finalized evaluation with the educator as a view-only,
  // strengths-first Google Doc (server-built; see sharePortalReleasedEvaluation
  // in Code.gs). Reloads the district copy afterwards so the record's
  // releasedDoc link appears for both parties.
  const beginReleasedEvaluationReview = React.useCallback(async () => {
    const teacherId = selectedTeacher && selectedTeacher.id;
    if (!isRemote || !teacherId || releaseActionsDisabled || releaseRequestRef.current || typeof repository.reviewReleasedEvaluation !== 'function' || ['reviewing', 'sending'].includes(releaseShareState.status)) return;
    releaseRequestRef.current = true;
    setReleaseShareState({ status: 'reviewing', error: '', review: null, result: null });
    try {
      const result = await repository.reviewReleasedEvaluation({ teacherId });
      if (!result || result.ok === false || !result.review || !result.review.token) throw new Error((result && (result.error || result.message)) || t("educator_evaluation.the_release_disclosure_could_not_be_prepared_13mhibq", 'The release disclosure could not be prepared.'));
      const returnedTeacherId = aeSafeId(result.review.teacherId, '');
      if (returnedTeacherId && returnedTeacherId !== teacherId) throw new Error(t('educator_evaluation.release_review_educator_mismatch_20260830', 'The district repository returned a disclosure review for a different educator. Nothing was shared.'));
      if (!remoteMountedRef.current) return;
      if (selectedTeacherIdRef.current !== teacherId) {
        const message = t('educator_evaluation.release_review_selection_changed_20260830', 'The selected educator changed while the disclosure review was being prepared. The review was canceled; nothing was shared.');
        setReleaseShareState({ status: 'idle', error: '', review: null, result: null });
        announce(message);
        notify(message, 'info');
        return;
      }
      setReleaseShareState({ status: 'ready', error: '', review: Object.assign({}, result.review, { teacherId }), result: null });
      announce(t("educator_evaluation.released_summary_disclosure_review_opened_nothing_has_been_590j1", 'Released-summary disclosure review opened. Nothing has been shared yet.'));
    } catch (error) {
      if (!remoteMountedRef.current) return;
      const message = String((error && error.message) || error || t("educator_evaluation.the_release_disclosure_could_not_be_prepared_13mhibq", 'The release disclosure could not be prepared.'));
      setReleaseShareState({ status: 'error', error: message, review: null, result: null });
      notify(message, 'error');
    } finally {
      releaseRequestRef.current = false;
    }
  }, [isRemote, selectedTeacher, repository, releaseShareState.status, releaseActionsDisabled, announce, notify]);

  const shareReleasedEvaluation = React.useCallback(async () => {
    const review = releaseShareState.review;
    const reviewedTeacherId = aeSafeId(review && review.teacherId, '');
    if (!isRemote || !review || !reviewedTeacherId || typeof repository.shareReleasedEvaluation !== 'function' || releaseRequestRef.current || releaseShareState.status === 'sending') return;
    if (selectedTeacherIdRef.current !== reviewedTeacherId) {
      const message = t('educator_evaluation.release_review_stale_selection_20260830', 'The selected educator no longer matches this disclosure review. The review was canceled; nothing was shared.');
      setReleaseShareState({ status: 'error', error: message, review: null, result: null });
      announce(message);
      notify(message, 'error');
      return;
    }
    if (releaseActionsDisabled) {
      const message = t('educator_evaluation.release_wait_for_repository_20260830', 'Wait until the district repository is saved and any error or concurrent edit is resolved before sharing a released summary.');
      setReleaseShareState((current) => ({ ...current, status: 'ready', error: message }));
      announce(message);
      notify(message, 'error');
      return;
    }
    releaseRequestRef.current = true;
    setReleaseShareState((current) => ({ ...current, status: 'sending', error: '' }));
    try {
      const result = await repository.shareReleasedEvaluation({ teacherId: reviewedTeacherId, reviewToken: review.token });
      if (!result || result.ok === false) throw new Error((result && (result.error || result.message)) || t("educator_evaluation.the_released_evaluation_could_not_be_shared_16kckh", 'The released evaluation could not be shared.'));
      if (!remoteMountedRef.current) return;
      const pending = !!result.recoveryPending;
      setReleaseShareState({ status: pending ? 'recovery' : 'sent', error: '', review: null, result });
      const message = pending
        ? t("educator_evaluation.drive_access_was_granted_but_the_repository_confirmation_i_1r2jio2", 'Drive access was granted, but the repository confirmation is still recovering. Do not repeat the release; ask an administrator to run Setup health.')
        : (result.idempotent ? t("educator_evaluation.the_existing_released_summary_was_verified_missing_view_ac_snpmpb", 'The existing released summary was verified; missing view access was restored without creating a duplicate.') : t("educator_evaluation.a_view_only_released_summary_was_created_and_recorded_for__i0kqcx", 'A view-only released summary was created and recorded for the educator district account.'));
      announce(message);
      notify(message, pending ? 'error' : 'success');
      if (!pending) loadRemoteWorkspace();
    } catch (error) {
      if (!remoteMountedRef.current) return;
      const message = String((error && error.message) || error || t("educator_evaluation.the_released_evaluation_could_not_be_shared_16kckh", 'The released evaluation could not be shared.'));
      setReleaseShareState((current) => ({ ...current, status: 'ready', error: message }));
      notify(message, 'error');
    } finally {
      releaseRequestRef.current = false;
    }
  }, [isRemote, repository, releaseShareState, releaseActionsDisabled, announce, notify, loadRemoteWorkspace]);

  const cancelReleasedEvaluationReview = React.useCallback(() => {
    if (releaseShareState.status === 'sending' || releaseRequestRef.current) return;
    setReleaseShareState({ status: 'idle', error: '', review: null, result: null });
    announce(t("educator_evaluation.released_summary_review_canceled_nothing_was_shared_pk5bmb", 'Released-summary review canceled. Nothing was shared.'));
  }, [releaseShareState.status, announce]);
  const enqueueRemoteSave = React.useCallback((job) => {
    if (!isRemote || !job) return;
    if (remoteInFlightRef.current) {
      const queue = remoteQueuedSaveRef.current;
      const active = remoteActiveSaveRef.current;
      const queued = queue.length ? queue[queue.length - 1] : null;
      if (queued && queued.debounced && job.debounced && !aeRemoteSaveScopeBoundary(queued, job)) {
        queue[queue.length - 1] = Object.assign({}, job, {
          baseWorkspace: aeClone(queued.baseWorkspace || job.baseWorkspace || job.workspace),
          restoreFocusOnSuccess: !!(queued.restoreFocusOnSuccess || job.restoreFocusOnSuccess),
        });
      } else {
        const predecessor = queued || active;
        queue.push(Object.assign({}, job, {
          baseWorkspace: aeClone((predecessor && predecessor.workspace) || job.baseWorkspace || job.workspace),
        }));
      }
      setRemoteState((current) => ({ ...current, status: 'saving', error: '', inFlight: true }));
      return;
    }
    remoteInFlightRef.current = true;
    remoteActiveSaveRef.current = job;
    setRemoteState((current) => ({ ...current, status: 'saving', error: '', inFlight: true }));
    remoteSaveQueueRef.current = remoteSaveQueueRef.current.catch(() => undefined).then(async () => {
      const result = await repository.saveWorkspace({
        workspace: job.workspace,
        expectedVersion: remoteRevisionRef.current,
        mutation: job.mutation,
      });
      if (!result || result.ok === false) {
        const error = new Error((result && (result.error || result.message)) || t("educator_evaluation.the_district_portal_did_not_save_the_change_1im4rlk", 'The district portal did not save the change.'));
        if (result && result.code) error.code = result.code;
        throw error;
      }
      const revision = Number(result.revision);
      if (!Number.isInteger(revision) || revision < 0) throw new Error('The district portal returned an invalid record version.');
      const reconciliationPending = !!result.reconciliationPending;
      let canonical = null;
      if (result.workspace) {
        canonical = aeRemoteScopedWorkspace(result.workspace, remoteUserRef.current);
        if (!canonical) throw new Error('The district portal returned an invalid saved workspace.');
      }
      remoteRevisionRef.current = revision;
      if (!remoteMountedRef.current) {
        remoteInFlightRef.current = false;
        remoteActiveSaveRef.current = null;
        remoteQueuedSaveRef.current = [];
        return;
      }
      const queued = remoteQueuedSaveRef.current.shift() || null;
      remoteInFlightRef.current = false;
      remoteActiveSaveRef.current = null;
      if (queued) {
        if (job.restoreFocusOnSuccess) queued.restoreFocusOnSuccess = true;
        queued.baseWorkspace = aeClone(canonical || job.workspace);
        enqueueRemoteSave(queued);
        return;
      }
      if (job.generation === remoteSaveGenerationRef.current && canonical) {
        workspaceRef.current = canonical;
        setWorkspace(canonical);
      }
      if (job.generation === remoteSaveGenerationRef.current) {
        setRemoteState((current) => ({ ...current, status: reconciliationPending ? 'reconciliation' : 'saved', error: '', inFlight: false }));
        if (job.restoreFocusOnSuccess) restoreRemoteWorkspaceFocus();
      } else {
        setRemoteState((current) => ({ ...current, inFlight: false }));
      }
    }).catch(async (error) => {
      const recoveryJob = [job].concat(remoteQueuedSaveRef.current, remotePendingRef.current || []).filter(Boolean).reduce((latest, candidate) => (
        candidate.generation > latest.generation ? candidate : latest
      ));
      if (recoveryJob !== job) recoveryJob.baseWorkspace = aeClone(job.baseWorkspace || recoveryJob.baseWorkspace || job.workspace);
      if (remoteDebounceRef.current) clearTimeout(remoteDebounceRef.current);
      remoteDebounceRef.current = null;
      remotePendingRef.current = null;
      remoteQueuedSaveRef.current = [];
      remoteActiveSaveRef.current = null;
      remoteInFlightRef.current = false;
      if (!remoteMountedRef.current || recoveryJob.generation !== remoteSaveGenerationRef.current) return;
      if (error && error.code === 'conflict') {
        setRemoteState((current) => ({ ...current, status: 'conflict', error: t("educator_evaluation.another_authorized_session_saved_this_record_first_1pv9m1x", 'Another authorized session saved this record first.'), inFlight: false }));
        try {
          const payload = await repository.bootstrap();
          if (!payload || payload.ok === false) throw new Error((payload && (payload.error || payload.message)) || t("educator_evaluation.the_current_district_record_could_not_be_retrieved_l9w1of", 'The current district record could not be retrieved.'));
          const currentUser = aePlainObject(payload.currentUser) ? payload.currentUser : remoteUserRef.current;
          const latest = aeRemoteScopedWorkspace(payload.workspace, currentUser);
          const revision = Number(payload.revision);
          if (!latest || !Number.isInteger(revision) || revision < 0) throw new Error('The district portal returned an invalid current record.');
          const merged = aeThreeWayMerge(recoveryJob.baseWorkspace || recoveryJob.workspace, recoveryJob.workspace, latest);
          remoteRevisionRef.current = revision;
          remoteUserRef.current = currentUser;
          workspaceRef.current = latest;
          setWorkspace(latest);
          setRemoteConflict({ latestWorkspace: latest, mergedWorkspace: merged.workspace, mutation: recoveryJob.mutation, conflicts: merged.conflicts, appliedCount: merged.appliedCount });
          setRemoteState((current) => ({ ...current, status: 'conflict', error: t("educator_evaluation.another_authorized_session_saved_this_record_first_1pv9m1x", 'Another authorized session saved this record first.'), currentUser, deployment: aePlainObject(payload.deployment) ? payload.deployment : current.deployment, inFlight: false }));
          notify(t("educator_evaluation.another_authorized_session_saved_first_the_current_distric_1bkr4ad", 'Another authorized session saved first. The current district version is loaded; review whether to reapply only your non-conflicting work.'), 'error');
          return;
        } catch (recoveryError) {
          error = recoveryError;
        }
      }
      const message = String((error && error.message) || error || t("educator_evaluation.the_district_portal_could_not_save_this_change_1pznr7t", 'The district portal could not save this change.'));
      setRemoteState((current) => ({ ...current, status: 'error', error: message, inFlight: false }));
      notify(message, 'error');
    });
  }, [isRemote, repository, notify, restoreRemoteWorkspaceFocus]);

  const queueRemoteSave = React.useCallback((snapshot, audit, baseSnapshot) => {
    if (!isRemote) return;
    const generation = ++remoteSaveGenerationRef.current;
    const mutation = audit ? {
      teacherId: aeSafeId(audit.teacherId, ''), event: aeString(audit.event, 40, ''),
      summary: aeString(audit.summary, 240, ''), entityType: aeString(audit.entityType, 60, ''),
      entityId: aeSafeId(audit.entityId, ''), version: Math.max(1, parseInt(audit.version, 10) || 1),
    } : null;
    const meta = aeRemoteSaveJobMeta(mutation);
    const priorPending = remotePendingRef.current;
    const scopeBoundary = !!priorPending && meta.debounced && aeRemoteSaveScopeBoundary(priorPending, meta);
    const carriedBase = priorPending && !scopeBoundary ? priorPending.baseWorkspace : null;
    const job = Object.assign({ workspace: aeClone(snapshot), baseWorkspace: aeClone(carriedBase || baseSnapshot || workspaceRef.current), mutation, generation }, meta);
    if (meta.debounced) {
      if (scopeBoundary) {
        if (remoteDebounceRef.current) clearTimeout(remoteDebounceRef.current);
        remoteDebounceRef.current = null;
        remotePendingRef.current = null;
        enqueueRemoteSave(priorPending);
      }
      remotePendingRef.current = job;
      if (remoteDebounceRef.current) clearTimeout(remoteDebounceRef.current);
      setRemoteState((current) => ({ ...current, status: 'saving', error: '' }));
      remoteDebounceRef.current = setTimeout(() => {
        remoteDebounceRef.current = null;
        const pending = remotePendingRef.current;
        remotePendingRef.current = null;
        enqueueRemoteSave(pending);
      }, 700);
      return;
    }
    if (remoteDebounceRef.current) clearTimeout(remoteDebounceRef.current);
    remoteDebounceRef.current = null;
    const pending = remotePendingRef.current;
    remotePendingRef.current = null;
    if (pending) enqueueRemoteSave(pending);
    enqueueRemoteSave(job);
  }, [isRemote, enqueueRemoteSave]);

  const commit = React.useCallback((mutator, audit, message) => {
    if (localTeacherPreview) {
      notify(t("educator_evaluation.read_only_educator_preview_switch_back_to_evaluator_use_an_12d5ri1", 'Read-only educator preview: switch back to Evaluator, use an educator response packet, or open the authenticated district portal to make changes.'), 'info');
      return;
    }
    if (isRemote && (remoteState.status === 'error' || remoteState.status === 'conflict' || remoteConflict)) {
      const waitMessage = remoteState.status === 'conflict' || remoteConflict
        ? t("educator_evaluation.review_the_concurrent_edit_comparison_before_making_anothe_kq52fe", 'Review the concurrent-edit comparison before making another change.')
        : (remoteState.status === 'error'
        ? t("educator_evaluation.reload_the_district_copy_before_making_another_change_12u2ndx", 'Reload the district copy before making another change.')
        : t("educator_evaluation.please_wait_for_the_current_district_save_to_finish_before_18vsezb", 'Please wait for the current district save to finish before making another change.'));
      announce(waitMessage);
      notify(waitMessage, 'error');
      return;
    }
    const base = aeClone(workspaceRef.current);
    const next = aeClone(base);
    mutator(next);
    const durableAudit = audit && !['DRAFT_SAVED', 'PROFILE_UPDATED', 'CONFIG_UPDATED'].includes(audit.event);
    if (durableAudit && !isRemote) {
      aeAuditEvent(next, audit, role === 'teacher' ? ((next.teachers.find((teacher) => teacher.id === (audit.teacherId || selectedTeacherId)) || {}).name || t("educator_evaluation.teacher_7cu1px", 'Teacher')) : (next.config.evaluatorName || t("educator_evaluation.evaluator_125q2ii", 'Evaluator')), role === 'teacher' ? t("educator_evaluation.teacher_7cu1px", 'Teacher') : t("educator_evaluation.evaluator_125q2ii", 'Evaluator'));
    }
    workspaceRef.current = next;
    setWorkspace(next);
    setImportUndo(null);
    if (isRemote) queueRemoteSave(next, audit, base);
    if (message) {
      announce(message);
      notify(message, 'success');
      if (audit && ['SUBMITTED', 'CONFERENCED', 'EVIDENCE_PUBLISHED', 'SIGNED', 'ACKNOWLEDGED', 'FINALIZED', 'APPROVED', 'RETURNED', 'RELEASED'].includes(audit.event)) {
        requestAnimationFrame(() => { const panel = document.getElementById('ae-panel'); if (panel) panel.focus(); });
      }
    }
  }, [role, selectedTeacherId, announce, isRemote, queueRemoteSave, remoteState.status, remoteConflict, localTeacherPreview, notify]);

  const updateTeacher = (id, mutator, event, summary) => commit((next) => {
    const teacher = next.teachers.find((item) => item.id === id);
    if (!teacher || teacher.finalizedAt) return;
    mutator(teacher);
    teacher.lastActivityAt = aeNow();
    if (event === 'RATING_UPDATED' && teacher.cycleStatus !== 'finalized') teacher.cycleStatus = 'in_progress';
    if (event === 'RELEASED' && teacher.finalizedAt) {
      next.cycleSnapshots = Array.isArray(next.cycleSnapshots) ? next.cycleSnapshots : [];
      const academicYear = next.config.academicYear;
      const existing = next.cycleSnapshots.find((snapshot) => snapshot.teacherId === id && snapshot.academicYear === academicYear);
      const snapshot = {
        id: existing ? existing.id : aeId('cycle'), teacherId: id, staffCodeSnapshot: teacher.code,
        academicYear, buildingSnapshot: teacher.building, employeeTypeSnapshot: teacher.employeeType,
        finalizedAt: teacher.finalizedAt, finalScore: aeRatingValue(teacher.finalScore),
        domainRatings: aeClone(teacher.ratings.domains), weightSnapshot: aeClone(teacher.weightSnapshot || aeWeightProfile(teacher)),
        annualRationales: aeClone(teacher.annualRationales || { d1: '', d2: '', d3: '', d4: '' }),
        annualEvidenceRefs: aeClone(teacher.annualEvidenceRefs || { d1: [], d2: [], d3: [], d4: [] }),
        frameworkVersion: teacher.frameworkVersion || next.config.frameworkVersion || AE_ACTIVE_FW.versionTag,
      };
      if (existing) Object.assign(existing, snapshot); else next.cycleSnapshots.push(snapshot);
    }
  }, { teacherId: id, event, summary, entityType: 'educator_cycle', entityId: id }, null);

  const addTeacher = (details) => {
    const input = aePlainObject(details) ? details : {};
    const name = aeString(input.name, 160, '').trim();
    const code = aeString(input.code, 40, '').trim();
    if (!name || !code) { notify(t("educator_evaluation.educator_was_not_added_name_and_staff_code_are_required_lbvmma", 'Educator was not added: name and staff code are required.'), 'error'); return ''; }
    if (workspaceRef.current.teachers.some((teacher) => teacher.code.toLowerCase() === code.toLowerCase())) { notify(t("educator_evaluation.educator_was_not_added_that_staff_code_already_exists_10k25li", 'Educator was not added: that staff code already exists.'), 'error'); return ''; }
    const id = aeId('teacher');
    commit((next) => { next.teachers.push({ id, code, name, building: aeString(input.building, 160, next.config.building), assignment: aeString(input.assignment, 240, ''), employeeType: 'professional', buildingData: true, teacherSpecificData: true, active: true, evaluator: next.config.evaluatorName, dueDate: aeString(input.dueDate, 10, ''), cycleStatus: 'not_started', ratings: { domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null } }); }, { teacherId: id, event: 'CREATED', summary: t("educator_evaluation.educator_evaluation_assignment_created_1or42h7", 'Educator evaluation assignment created'), entityType: 'educator_cycle', entityId: id }, 'Educator added');
    setSelectedTeacherId(id);
    return id;
  };

  // Bulk path for the Staff-tab roster paste: every valid row lands in ONE
  // commit (one clone, one audit entry, one announcement) instead of one
  // commit per educator. Local mode only; the district portal roster stays
  // admin-managed one record at a time.
  const addTeachersBulk = (rows) => {
    const clean = (Array.isArray(rows) ? rows : []).map((row) => {
      const input = aePlainObject(row) ? row : {};
      return {
        name: aeString(input.name, 160, '').trim(),
        code: aeString(input.code, 40, '').trim(),
        assignment: aeString(input.assignment, 240, '').trim(),
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(aeString(input.dueDate, 10, '')) ? aeString(input.dueDate, 10, '') : '',
      };
    }).filter((row) => row.name && row.code);
    const taken = new Set(workspaceRef.current.teachers.map((teacher) => teacher.code.toLowerCase()));
    const unique = [];
    clean.forEach((row) => {
      const key = row.code.toLowerCase();
      if (taken.has(key)) return;
      taken.add(key);
      unique.push(row);
    });
    if (!unique.length) { notify(t("educator_evaluation.no_educators_added_from_paste_20260823", 'No educators were added: every pasted line was missing a name or code, or reused an existing staff code.'), 'error'); return 0; }
    const ids = [];
    commit((next) => {
      unique.forEach((row) => {
        const id = aeId('teacher');
        ids.push(id);
        next.teachers.push({ id, code: row.code, name: row.name, building: next.config.building, assignment: row.assignment, employeeType: 'professional', buildingData: true, teacherSpecificData: true, active: true, evaluator: next.config.evaluatorName, dueDate: row.dueDate, cycleStatus: 'not_started', ratings: { domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null } });
      });
    }, { teacherId: ids[0] || '', event: 'CREATED', summary: t("educator_evaluation.roster_paste_created_assignments_20260823", 'Educator evaluation assignments created from pasted roster: ') + unique.length, entityType: 'educator_cycle', entityId: ids[0] || '' }, unique.length + (unique.length === 1 ? t("educator_evaluation.educator_added_singular_20260823", ' educator added') : t("educator_evaluation.educators_added_plural_20260823", ' educators added')));
    if (ids[0]) setSelectedTeacherId(ids[0]);
    // commit() can refuse without running the mutator (read-only preview,
    // remote hold): report what actually landed, not what was requested.
    return ids.length;
  };

  const isTeacherCycleClosed = (teacherId) => aeCycleFinalized(workspaceRef.current.teachers.find((teacher) => teacher.id === teacherId));

  const createWalkthrough = (data) => {
    if (isTeacherCycleClosed(data && data.teacherId)) return '';
    const id = aeId('walk'); const now = aeNow();
    commit((next) => {
      next.walkthroughs.unshift(Object.assign({
        id, createdAt: now, observer: next.config.evaluatorName, version: 1, teacherAcknowledgedAt: null,
      }, data, { startedAt: data.startedAt || now, publishedAt: data.published ? now : null }));
      const teacher = next.teachers.find((item) => item.id === data.teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = now; }
      aeRecalculateCycleStatus(next, data.teacherId);
    }, { teacherId: data.teacherId, event: data.published ? 'EVIDENCE_PUBLISHED' : 'DRAFT_SAVED', summary: data.published ? t("educator_evaluation.walkthrough_published_to_teacher_144kzgu", 'Walkthrough published to teacher') : t("educator_evaluation.private_walkthrough_draft_saved_1qfmgdu", 'Private walkthrough draft saved'), entityType: 'walkthrough', entityId: id }, data.published ? t("educator_evaluation.walkthrough_published_ug62ln", 'Walkthrough published') : t("educator_evaluation.draft_saved_hox9mn", 'Draft saved'));
    return id;
  };

  const updateWalkthroughDraft = (id, data) => {
    const record = workspaceRef.current.walkthroughs.find((item) => item.id === id);
    if (!record || record.publishedAt || isTeacherCycleClosed(record.teacherId)) return '';
    const fields = ['teacherId', 'date', 'startedAt', 'durationMin', 'announced', 'lessonPhase', 'subject', 'evidence', 'interpretation', 'componentTags', 'privacyChecked'];
    commit((next) => {
      const item = next.walkthroughs.find((value) => value.id === id);
      if (!item || item.publishedAt) return;
      fields.forEach((field) => { if (Object.prototype.hasOwnProperty.call(data, field)) item[field] = aeClone(data[field]); });
      item.updatedAt = aeNow();
      const teacher = next.teachers.find((value) => value.id === item.teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = item.updatedAt; }
      aeRecalculateCycleStatus(next, item.teacherId);
    }, { teacherId: record.teacherId, event: 'DRAFT_SAVED', summary: 'Private walkthrough draft updated', entityType: 'walkthrough', entityId: id, version: record.version || 1 }, 'Draft changes saved');
    return id;
  };

  const discardWalkthroughDraft = (id, onDiscarded) => {
    const record = workspaceRef.current.walkthroughs.find((item) => item.id === id);
    if (!record || record.publishedAt || isTeacherCycleClosed(record.teacherId)) return;
    const teacher = workspaceRef.current.teachers.find((item) => item.id === record.teacherId);
    requestActionReview({
      title: 'Discard this private walkthrough draft?',
      description: 'This removes the unpublished note from the working workspace. Published records cannot be discarded here.',
      facts: [['Educator', teacher ? teacher.name + ' · ' + teacher.code : record.teacherId], ['Visit', aeDate(record.date) + ' · ' + record.durationMin + ' minutes'], ['Evidence preview', String(record.evidence || '').slice(0, 500)], ['Visibility', 'Private evaluator draft; never published to the educator']],
      warning: 'Discard cannot be undone from the interface. Follow district retention or legal-hold requirements before removing a personnel-work draft.',
      danger: true,
      acknowledgement: 'I confirmed this is the exact unpublished draft I intend to remove.',
      confirmLabel: 'Discard private draft',
      onConfirm: () => {
        commit((next) => {
          next.walkthroughs = next.walkthroughs.filter((item) => item.id !== id);
          aeRecalculateCycleStatus(next, record.teacherId);
        }, { teacherId: record.teacherId, event: 'DRAFT_DISCARDED', summary: 'Private walkthrough draft discarded', entityType: 'walkthrough', entityId: id, version: record.version || 1 }, 'Private draft discarded');
        if (typeof onDiscarded === 'function') onDiscarded();
      },
    });
  };

  const performPublishWalkthrough = (id) => {
    const record = workspaceRef.current.walkthroughs.find((item) => item.id === id);
    if (!record || record.publishedAt || isTeacherCycleClosed(record.teacherId)) return;
    commit((next) => {
      const item = next.walkthroughs.find((value) => value.id === id);
      if (!item || item.publishedAt) return;
      item.privacyChecked = true;
      item.publishedAt = aeNow();
      item.updatedAt = item.publishedAt;
      const teacher = next.teachers.find((value) => value.id === item.teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = item.updatedAt; }
      aeRecalculateCycleStatus(next, item.teacherId);
    }, { teacherId: record.teacherId, event: 'EVIDENCE_PUBLISHED', summary: t("educator_evaluation.saved_walkthrough_draft_published_to_teacher_2eg8mi", 'Saved walkthrough draft published to teacher'), entityType: 'walkthrough', entityId: id, version: record.version || 1 }, 'Walkthrough published');
  };
  const publishWalkthrough = (id) => {
    const record = workspaceRef.current.walkthroughs.find((item) => item.id === id);
    if (!record || record.publishedAt || isTeacherCycleClosed(record.teacherId)) return;
    const teacher = workspaceRef.current.teachers.find((item) => item.id === record.teacherId);
    requestActionReview({
      title: 'Publish saved walkthrough draft to ' + (teacher ? teacher.name : 'the educator') + '?',
      description: 'This saved draft will become an educator-visible, append-only evidence snapshot.',
      facts: [['Educator', teacher ? teacher.name + ' · ' + teacher.code : record.teacherId], ['Visit', aeDate(record.date) + ' · ' + record.durationMin + ' minutes · ' + String(record.lessonPhase || '').replace(/_/g, ' ')], ['Direct evidence', record.evidence], ['Interpretation', record.interpretation || 'None'], ['Visibility', 'Published to the educator and eligible for annual evidence provenance']],
      warning: 'After publication, correct context with an appended comment; the evidence snapshot itself cannot be rewritten.',
      acknowledgement: 'I removed student-identifying information and reviewed the exact saved snapshot that will be published.',
      confirmLabel: 'Confirm publication',
      onConfirm: () => performPublishWalkthrough(id),
    });
  };

  const acknowledgeWalkthrough = (id) => {
    const record = workspace.walkthroughs.find((item) => item.id === id);
    if (!record || !record.publishedAt || record.teacherAcknowledgedAt || isTeacherCycleClosed(record.teacherId)) return;
    commit((next) => {
      const item = next.walkthroughs.find((value) => value.id === id);
      if (!item) return;
      item.teacherAcknowledgedAt = aeNow();
      aeRecalculateCycleStatus(next, item.teacherId);
    }, { teacherId: record.teacherId, event: 'ACKNOWLEDGED', summary: t("educator_evaluation.teacher_acknowledged_walkthrough_receipt_d7q63p", 'Teacher acknowledged walkthrough receipt'), entityType: 'walkthrough', entityId: id }, 'Receipt acknowledged');
  };

  const createObservation = (teacherId) => {
    if (isTeacherCycleClosed(teacherId)) return '';
    const id = aeId('formal'); const now = aeNow();
    commit((next) => {
      next.observations.unshift({ id, teacherId, createdAt: now, frameworkVersion: next.config.frameworkVersion || AE_ACTIVE_FW.versionTag, version: 1, prework: {}, ratings: { d1: null, d2: null, d3: null, d4: null }, rationales: {}, componentTags: [] });
      const teacher = next.teachers.find((item) => item.id === teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = now; }
      aeRecalculateCycleStatus(next, teacherId);
    }, { teacherId, event: 'ASSIGNED', summary: t("educator_evaluation.formal_observation_assigned_1fh7owg", 'Formal observation assigned'), entityType: 'formal_observation', entityId: id }, 'Formal observation assigned');
    return id;
  };

  const updateObservation = (id, changes, event, summary) => {
    const record = workspace.observations.find((item) => item.id === id);
    if (!record || record.finalizedAt || isTeacherCycleClosed(record.teacherId)) return;
    commit((next) => {
      const item = next.observations.find((value) => value.id === id);
      if (!item || item.finalizedAt) return;
      Object.assign(item, changes);
      item.updatedAt = aeNow();
      const teacher = next.teachers.find((value) => value.id === item.teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = item.updatedAt; }
      aeRecalculateCycleStatus(next, item.teacherId);
    }, { teacherId: record.teacherId, event, summary, entityType: 'formal_observation', entityId: id, version: record.version || 1 }, event !== 'DRAFT_SAVED' ? summary : null);
  };

  const createSpm = (teacherId) => {
    if (isTeacherCycleClosed(teacherId)) return '';
    const existing = workspace.spms.find((item) => item.teacherId === teacherId);
    if (existing) return existing.id;
    const id = aeId('spm'); const now = aeNow();
    commit((next) => {
      next.spms.unshift({ id, teacherId, createdAt: now, status: 'draft', version: 1, context: '', baseline: '', goal: '', measures: '', actionPlan: '', revisions: [] });
      const teacher = next.teachers.find((item) => item.id === teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = now; }
      aeRecalculateCycleStatus(next, teacherId);
    }, { teacherId, event: 'CREATED', summary: t("educator_evaluation.spm_proposal_created_1qhu4pd", 'SPM proposal created'), entityType: 'spm', entityId: id }, 'SPM proposal started');
    return id;
  };

  const updateSpm = (id, changes, event, summary) => {
    const record = workspace.spms.find((item) => item.id === id);
    if (!record || record.status === 'locked' || isTeacherCycleClosed(record.teacherId)) return;
    commit((next) => {
      const item = next.spms.find((value) => value.id === id);
      if (!item || item.status === 'locked') return;
      const now = aeNow();
      if (event === 'SUBMITTED' && changes.status === 'submitted') {
        const revision = {
          version: changes.version || item.version || 1, submittedAt: changes.submittedAt || now,
          context: item.context || '', baseline: item.baseline || '', goal: item.goal || '',
          measures: item.measures || '', actionPlan: item.actionPlan || '',
        };
        item.revisions = (Array.isArray(item.revisions) ? item.revisions : []).concat(revision).slice(-20);
      }
      Object.assign(item, changes);
      item.updatedAt = now;
      const teacher = next.teachers.find((value) => value.id === item.teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = now; }
      aeRecalculateCycleStatus(next, item.teacherId);
    }, { teacherId: record.teacherId, event, summary, entityType: 'spm', entityId: id, version: changes.version || record.version || 1 }, event !== 'DRAFT_SAVED' ? summary : null);
  };
  const addComment = ({ recordType, recordId, teacherId, text }) => {
    if (isTeacherCycleClosed(teacherId)) return;
    commit((next) => { next.comments.push({ id: aeId('comment'), recordType, recordId, teacherId, text, role: role === 'teacher' ? t("educator_evaluation.teacher_7cu1px", 'Teacher') : t("educator_evaluation.evaluator_125q2ii", 'Evaluator'), author: role === 'teacher' ? ((next.teachers.find((teacher) => teacher.id === teacherId) || {}).name || t("educator_evaluation.teacher_7cu1px", 'Teacher')) : next.config.evaluatorName, at: aeNow(), version: 1 }); }, { teacherId, event: 'COMMENTED', summary: t("educator_evaluation.shared_comment_posted_1v4vgr8", 'Shared comment posted'), entityType: recordType, entityId: recordId }, 'Comment posted');
  };

  const updateConfig = (field, value) => commit((next) => { next.config[field] = value; }, { event: 'CONFIG_UPDATED', summary: t("educator_evaluation.workspace_configuration_updated_1a7s0f3", 'Workspace configuration updated'), entityType: 'workspace', entityId: 'config' }, null);

  const applySimulationWorkspace = (value) => {
    const next = aeNormalizeWorkspace(value);
    if (!next || !next.config.sampleMode) { notify(t("educator_evaluation.simulation_was_not_applied_only_fictional_workspaces_are_a_4m4hjb", 'Simulation was not applied: only fictional workspaces are accepted.'), 'error'); return; }
    workspaceRef.current = next;
    setWorkspace(next);
    setSelectedTeacherId((next.teachers[0] && next.teachers[0].id) || '');
    aeSaveOnboardingChoice('sample');
    announce(t("educator_evaluation.simulated_scenario_applied_with_ap3c5w", 'Simulated scenario applied with ') + next.teachers.length + t("educator_evaluation.fictional_educators_r8c0lc", ' fictional educators'));
    notify(t("educator_evaluation.simulated_scenario_applied_j6apsk", 'Simulated scenario applied'), 'success');
  };

  const chooseLocalStart = (mode) => {
    const next = mode === 'sample' ? aeSampleWorkspace() : aeBlankWorkspace();
    aeSaveOnboardingChoice(mode);
    const initialSave = aeStore(next);
    setLocalSaveState(initialSave.ok
      ? { status: 'saved', error: '', savedAt: initialSave.savedAt }
      : { status: 'error', error: initialSave.error, detail: initialSave.detail || '', savedAt: '' });
    workspaceRef.current = next;
    setWorkspace(next);
    setSelectedTeacherId((next.teachers[0] && next.teachers[0].id) || '');
    setTab(mode === 'setup' ? 'about' : 'overview');
    setTourStep(mode === 'sample' ? 0 : null);
    setShowLocalOnboarding(false);
    announce(mode === 'sample' ? t("educator_evaluation.simulated_evaluation_workspace_opened_1jqhg5l", 'Simulated evaluation workspace opened') : (mode === 'setup' ? t("educator_evaluation.sharing_setup_opened_g0m1z3", 'Sharing setup opened') : t("educator_evaluation.blank_evaluation_workspace_started_1451erh", 'Blank evaluation workspace started')));
    notify(mode === 'sample' ? t("educator_evaluation.simulated_data_loaded_7c6it0", 'Simulated data loaded') : (mode === 'setup' ? t("educator_evaluation.choose_a_sharing_path_1ky51wu", 'Choose a sharing path') : t("educator_evaluation.blank_workspace_started_18ygkp1", 'Blank workspace started')), 'success');
  };

  const resetWorkspace = () => {
    const blank = aeBlankWorkspace();
    const initialSave = aeStore(blank);
    setLocalSaveState(initialSave.ok
      ? { status: 'saved', error: '', savedAt: initialSave.savedAt }
      : { status: 'error', error: initialSave.error, detail: initialSave.detail || '', savedAt: '' });
    workspaceRef.current = blank;
    setWorkspace(blank);
    setSelectedTeacherId('');
    setTab('overview');
    setTourStep(null);
    aeSaveOnboardingChoice('blank');
    announce(t("educator_evaluation.blank_evaluation_workspace_started_1451erh", 'Blank evaluation workspace started'));
    notify(t("educator_evaluation.clean_real_work_workspace_started_20260822", 'Clean real-work workspace started. Choose an approved record path, confirm workspace details, and add the first educator.'), 'success');
  };

  const exportWorkspace = () => { const payload = Object.assign({}, workspace, { kind: AE_EXPORT_KIND, exportedAt: aeNow() }); aeDownload('alloflow-evaluation-' + aeToday() + '.json', 'application/json', JSON.stringify(payload, null, 2)); commit(() => {}, { event: 'EXPORTED', summary: t("educator_evaluation.workspace_json_exported_rs18wj", 'Workspace JSON exported'), entityType: 'workspace', entityId: 'workspace' }, 'Workspace export created'); };
  const archiveAndResetSample = () => {
    if (!workspace.config.sampleMode) { notify(t("educator_evaluation.clean_transition_requires_simulated_workspace_20260822", 'The clean-workspace transition is available only from simulated data.'), 'error'); return; }
    const payload = Object.assign({}, workspace, { kind: AE_EXPORT_KIND, exportedAt: aeNow(), recoveryReason: 'Fictional rehearsal backup before clean real-work workspace' });
    aeDownload('alloflow-fictional-rehearsal-backup-' + aeToday() + '.json', 'application/json', JSON.stringify(payload, null, 2));
    resetWorkspace();
  };
  const exportCsv = () => { const rows = workspace.teachers.map((teacher) => ({ staff_code: teacher.code, educator: teacher.name, building: teacher.building, assignment: teacher.assignment, employee_type: teacher.employeeType, evaluation_status: aeTeacherStatus(teacher), due_date: teacher.dueDate, evaluator: teacher.evaluator, walkthroughs: workspace.walkthroughs.filter((item) => item.teacherId === teacher.id && item.publishedAt).length, formal_observation: workspace.observations.some((item) => item.teacherId === teacher.id && item.finalizedAt) ? 'finalized' : (workspace.observations.some((item) => item.teacherId === teacher.id) ? 'in_progress' : 'not_started'), spm_status: (workspace.spms.find((item) => item.teacherId === teacher.id) || {}).status || 'not_started' })); aeDownload('evaluation-status-' + aeToday() + '.csv', 'text/csv;charset=utf-8', '\uFEFF' + aeCsv(rows)); commit(() => {}, { event: 'EXPORTED', summary: t("educator_evaluation.evaluation_status_csv_exported_8n3zje", 'Evaluation status CSV exported'), entityType: 'workspace', entityId: 'workspace' }, 'Status CSV created'); };
  // Cycle due dates as an iCalendar file (all-day events) so the evaluator's
  // real calendar carries the deadlines. Names and due dates only; open,
  // active cycles only. RFC 5545 wants CRLF line endings and escaped commas.
  const exportDueDateCalendar = () => {
    const rows = workspaceRef.current.teachers.filter((teacher) => teacher.active !== false && !teacher.finalizedAt && /^\d{4}-\d{2}-\d{2}$/.test(teacher.dueDate || ''));
    if (!rows.length) { notify(t("educator_evaluation.no_open_cycles_with_due_dates_20260823", 'No open cycles with due dates to export. Add cycle due dates in Staff first.'), 'error'); return; }
    const escapeIcsText = (value) => String(value).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const events = rows.map((teacher) => {
      const dayStart = teacher.dueDate.replace(/-/g, '');
      const nextDay = new Date(teacher.dueDate + 'T00:00:00Z');
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const dayEnd = nextDay.toISOString().slice(0, 10).replace(/-/g, '');
      return [
        'BEGIN:VEVENT',
        'UID:alloflow-ae-due-' + teacher.id + '@alloflow',
        'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + dayStart,
        'DTEND;VALUE=DATE:' + dayEnd,
        'SUMMARY:' + escapeIcsText(t("educator_evaluation.evaluation_cycle_due_prefix_20260823", 'Evaluation cycle due: ') + teacher.name + ' (' + teacher.code + ')'),
        'END:VEVENT',
      ];
    });
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AlloFlow//Educator Evaluation//EN', 'CALSCALE:GREGORIAN'].concat(...events, 'END:VCALENDAR').join('\r\n') + '\r\n';
    aeDownload('evaluation-due-dates-' + aeToday() + '.ics', 'text/calendar;charset=utf-8', ics);
    commit(() => {}, { event: 'EXPORTED', summary: t("educator_evaluation.due_date_calendar_exported_20260823", 'Due-date calendar exported'), entityType: 'workspace', entityId: 'workspace' }, 'Calendar file created');
  };
  // Formative growth snapshot: the growth-first companion to the released
  // summary, available at ANY point in the cycle. Published records only, no
  // ratings and no bands anywhere: evidence, the educator's own words, and
  // derived (never invented) observations about where documentation is rich
  // or thin. Both roles generate the identical document.
  const exportGrowthSnapshot = () => {
    if (!selectedTeacher) return;
    const walks = workspace.walkthroughs.filter((item) => item.teacherId === selectedTeacher.id && item.publishedAt);
    const observations = workspace.observations.filter((item) => item.teacherId === selectedTeacher.id);
    const publishedObs = observations.filter((item) => item.evidencePublishedAt);
    const spm = workspace.spms.find((item) => item.teacherId === selectedTeacher.id);
    const componentLookup = {};
    AE_DOMAINS.forEach((domain) => ((AE_ACTIVE_FW.components && AE_ACTIVE_FW.components[domain.id]) || domain.components).forEach(([code, label]) => { componentLookup[code] = { label: aeRubricDisplayLabel(label), domain: aeRubricDisplayLabel(domain.label) }; }));
    const tagCounts = {};
    walks.concat(publishedObs).forEach((record) => (record.componentTags || []).forEach((code) => { tagCounts[code] = (tagCounts[code] || 0) + 1; }));
    const topTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 3);
    const domainsWithTags = new Set(Object.keys(tagCounts).map((code) => (componentLookup[code] || {}).domain).filter(Boolean));
    const quietDomains = AE_DOMAINS.map((domain) => aeRubricDisplayLabel(domain.label)).filter((label) => !domainsWithTags.has(label));
    const interpretations = walks.filter((item) => item.interpretation).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 8);
    const statement = selectedTeacher.educatorStatement && selectedTeacher.educatorStatement.text;
    const pieces = walks.length + publishedObs.length;
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Growth snapshot (formative)</title><style>body{font:14px system-ui;color:#172033;max-width:850px;margin:40px auto;padding:0 24px}h1{color:#14532d}h2{color:#173e70}blockquote{margin:8px 0;padding:8px 14px;border-left:4px solid #16815d;background:#f2faf6}.notice{padding:12px;background:#eef6ff;border:1px solid #93b8e8}ul{padding-left:22px}</style></head><body>'
      + t("educator_evaluation.h1_growth_snapshot_formative_h1_amqd0o", '<h1>Growth snapshot, formative</h1>')
      + t("educator_evaluation.p_strong_1qpg7me", '<p><strong>') + aeEsc(selectedTeacher.name) + t("educator_evaluation.strong_60hewm", '</strong> · ') + aeEsc(workspace.config.organization) + ' · ' + aeEsc(workspace.config.academicYear) + '</p>'
      + t("educator_evaluation.p_class_notice_strong_this_is_a_growth_document_not_an_eva_zfoig9", '<p class="notice"><strong>This is a growth document, not an evaluation.</strong> It contains no ratings, is generated identically for educator and evaluator, and only reflects records already published to the educator. It exists to support a growth conversation partway through the cycle.</p>')
      + (statement ? t("educator_evaluation.h2_in_the_educator_s_own_words_h2_blockquote_on0lx5", '<h2>In the educator’s own words</h2><blockquote>') + aeEsc(statement) + t("educator_evaluation.blockquote_1rkcsvv", '</blockquote>') : '')
      + t("educator_evaluation.h2_bright_spots_from_published_walkthroughs_h2_1wrl13k", '<h2>Bright spots from published walkthroughs</h2>')
      + (interpretations.length ? t("educator_evaluation.ul_13qr138", '<ul>') + interpretations.map((item) => t("educator_evaluation.li_strong_v8tut1", '<li><strong>') + aeEsc(aeDate(item.date || item.publishedAt)) + t("educator_evaluation.strong_oen40f", ':</strong> ') + aeEsc(item.interpretation) + t("educator_evaluation.li_hc5csf", '</li>')).join('') + t("educator_evaluation.ul_1ieb8pt", '</ul>') : t("educator_evaluation.p_no_published_walkthrough_feedback_yet_this_cycle_p_1othtws", '<p>No published walkthrough feedback yet this cycle.</p>'))
      + t("educator_evaluation.h2_evidence_so_far_h2_164nsl2", '<h2>Evidence so far</h2>')
      + '<p>' + pieces + t("educator_evaluation.portal_tracked_evidence_piece_dxdx9r", ' portal-tracked evidence piece') + (pieces === 1 ? '' : 's') + ' (' + walks.length + t("educator_evaluation.published_walkthrough_1fw5err", ' published walkthrough') + (walks.length === 1 ? '' : 's') + ' + ' + publishedObs.length + ' observation' + (publishedObs.length === 1 ? '' : 's') + t("educator_evaluation.with_published_evidence_x0ku7", ' with published evidence).')
      + (AE_ACTIVE_FW.id === 'portland_me' ? t("educator_evaluation.the_guidebook_calls_for_at_least_nine_pieces_per_cycle_acr_14syo02", ' The guidebook calls for at least nine pieces per cycle across the full range of practice; evidence gathered outside this portal counts toward that as well.') : '')
      + (spm ? t("educator_evaluation.student_measure_record_status_j0gmsi", ' Student-measure record status: ') + aeEsc(aeWorkflowStatusLabel(spm.status)) + '.' : '') + '</p>'
      + t("educator_evaluation.h2_where_the_documentation_is_rich_and_thin_h2_4y3zz4", '<h2>Where the documentation is rich, and thin</h2>')
      + (topTags.length ? t("educator_evaluation.p_most_documented_areas_so_far_1cdyk60", '<p>Most-documented areas so far: ') + topTags.map((code) => t("educator_evaluation.strong_pzmi8u", '<strong>') + aeEsc(code) + ' ' + aeEsc((componentLookup[code] || {}).label || '') + t("educator_evaluation.strong_1454j87", '</strong> (') + tagCounts[code] + ')').join(', ') + '.</p>' : t("educator_evaluation.p_no_evidence_tags_recorded_yet_p_wuya1r", '<p>No evidence tags recorded yet.</p>'))
      + (quietDomains.length && pieces > 0 ? t("educator_evaluation.p_little_or_no_tagged_evidence_yet_in_19hjz11", '<p>Little or no tagged evidence yet in: ') + quietDomains.map(aeEsc).join(', ') + '. That is a documentation gap to look at together, not a judgment about practice.</p>' : '')
      + t("educator_evaluation.p_generated_1iiah2y", '<p>Generated ') + aeEsc(aeDateTime(aeNow())) + t("educator_evaluation.identical_for_educator_and_evaluator_the_13dxre1", ' · identical for educator and evaluator · the ') + (isRemote ? t("educator_evaluation.district_portal_s2zbs3", 'district portal') : 'workspace') + t("educator_evaluation.remains_the_record_p_body_html_re79mu", ' remains the record.</p></body></html>');
    aeDownload('growth-snapshot-' + selectedTeacher.code + '-' + aeToday() + '.html', 'text/html;charset=utf-8', html);
    commit(() => {}, { teacherId: selectedTeacher.id, event: 'EXPORTED', summary: t("educator_evaluation.formative_growth_snapshot_exported_ezhkr8", 'Formative growth snapshot exported'), entityType: 'evaluation', entityId: selectedTeacher.id }, 'Growth snapshot created');
  };
  const exportSummary = () => {
    if (!selectedTeacher) return;
    const score = selectedTeacher.finalizedAt && selectedTeacher.finalScore != null ? selectedTeacher.finalScore : aeOverallScore(selectedTeacher);
    const profile = aeWeightProfile(selectedTeacher);
    const isPortland = AE_ACTIVE_FW.id === 'portland_me';
    const portlandRollup = isPortland ? aePortlandPracticeRating(selectedTeacher.ratings.domains) : null;
    const domainColumn = AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.weight_within_o_and_amp_p_j8olta", 'Weight within O&amp;P') : (isPortland ? t("educator_evaluation.guidebook_input_f5n29y", 'Guidebook input') : t("educator_evaluation.share_in_this_planning_profile_6jtsqr", 'Share in this planning profile'));
    const domainRows = AE_DOMAINS.map((domain) => t("educator_evaluation.tr_td_1g3q9ur", '<tr><td>') + aeEsc(aeRubricDisplayLabel(domain.label)) + t("educator_evaluation.td_td_18jyb6g", '</td><td>') + (AE_ACTIVE_FW.id === 'pa_act13' ? domain.weight + '%' : (isPortland ? t("educator_evaluation.categorical_domain_rating_1qlgmra", 'Categorical domain rating') : '25%')) + t("educator_evaluation.td_td_18jyb6g", '</td><td>') + aeEsc(selectedTeacher.ratings.domains[domain.id] == null ? t("educator_evaluation.not_rated_17t3qdk", 'Not rated') : selectedTeacher.ratings.domains[domain.id]) + t("educator_evaluation.td_tr_1thzd9l", '</td></tr>')).join('');
    const calculation = isPortland
      ? (portlandRollup ? t("educator_evaluation.portland_professional_practice_roll_up_1h5ppvi", 'Portland Professional Practice roll-up: ') + portlandRollup.label + ', ' + portlandRollup.rule : t("educator_evaluation.incomplete_t03g3p", 'Incomplete'))
      : (score == null ? t("educator_evaluation.incomplete_t03g3p", 'Incomplete') : score.toFixed(2) + ' · ' + aeBand(score));
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Evaluation workflow summary</title><style>body{font:14px system-ui;color:#172033;max-width:850px;margin:40px auto;padding:0 24px}h1{color:#173e70}table{border-collapse:collapse;width:100%;margin:14px 0}th,td{border:1px solid #ccd5e2;padding:8px;text-align:left}.notice{padding:12px;background:#fff8e8;border:1px solid #e5bd59}</style></head><body><h1>Educator evaluation workflow summary</h1><p><strong>' + aeEsc(workspace.config.organization) + t("educator_evaluation.strong_60hewm", '</strong> · ') + aeEsc(workspace.config.academicYear) + '</p><h2>' + aeEsc(selectedTeacher.name) + ' · ' + aeEsc(selectedTeacher.code) + '</h2><p>' + aeEsc(selectedTeacher.assignment) + t("educator_evaluation.evaluator_1ytzpr7", ' · evaluator ') + aeEsc(selectedTeacher.evaluator) + t("educator_evaluation.p_h2_weighting_snapshot_h2_table_thead_tr_th_factor_th_th__1599hsa", '</p><h2>Weighting snapshot</h2><table><thead><tr><th>Factor</th><th>Weight</th></tr></thead><tbody>') + profile.map((part) => t("educator_evaluation.tr_td_1g3q9ur", '<tr><td>') + aeEsc(aeRubricDisplayLabel(part.label)) + t("educator_evaluation.td_td_18jyb6g", '</td><td>') + part.weight + t("educator_evaluation.td_tr_l9swhk", '%</td></tr>')).join('') + t("educator_evaluation.tbody_table_h2_c6xgxt", '</tbody></table><h2>') + aeEsc(aeRubricDisplayLabel(AE_ACTIVE_FW.practiceLabel)) + t("educator_evaluation.ratings_h2_table_thead_tr_th_domain_th_th_1ypdek7", ' ratings</h2><table><thead><tr><th>Domain</th><th>') + domainColumn + t("educator_evaluation.th_th_rating_th_tr_thead_tbody_qzy9bu", '</th><th>Rating</th></tr></thead><tbody>') + domainRows + t("educator_evaluation.tbody_table_p_strong_calculation_preview_strong_1od32ch", '</tbody></table><p><strong>Calculation preview:</strong> ') + aeEsc(calculation) + t("educator_evaluation.p_p_class_notice_strong_workflow_aid_only_strong_c1lwgn", '</p><p class="notice"><strong>Workflow aid only.</strong> ') + (AE_ACTIVE_FW.id === 'pa_act13' ? t("educator_evaluation.this_is_not_an_official_pde_rating_form_or_proof_of_peers__1y4a2ed", 'This is not an official PDE rating form or proof of PEERS release. Verify all inputs and complete the LEA-authorized process.') : t("educator_evaluation.this_is_not_an_official_pepg_summative_form_verify_all_inp_1w8tx29", 'This is not an official PEPG summative form. Verify all inputs against your district’s PEPG plan and complete the district-authorized process.')) + t("educator_evaluation.p_p_generated_i8zqd", '</p><p>Generated ') + aeEsc(aeDateTime(aeNow())) + t("educator_evaluation.p_body_html_us1kuj", '</p></body></html>');
    aeDownload('evaluation-summary-' + selectedTeacher.code + '-' + aeToday() + '.html', 'text/html;charset=utf-8', html); commit(() => {}, { teacherId: selectedTeacher.id, event: 'EXPORTED', summary: t("educator_evaluation.educator_workflow_summary_exported_1qnrsc", 'Educator workflow summary exported'), entityType: 'evaluation', entityId: selectedTeacher.id }, 'Summary export created');
  };
  const [packetIncludeNames, setPacketIncludeNames] = React.useState(true);
  const exportEducatorPacket = () => {
    if (!selectedTeacher) return;
    const packet = aeEducatorPacket(workspace, selectedTeacher.id, { includeNames: packetIncludeNames });
    if (!packet) { notify(t("educator_evaluation.export_failed_no_record_for_that_educator_1yd8k9r", 'Export failed: no record for that educator.'), 'error'); return; }
    const who = packetIncludeNames ? selectedTeacher.name : selectedTeacher.code;
    // The attachment is self-contained: an educator reads it, types a response, and downloads a
    // reply file without installing anything, signing in, or opening AlloFlow. That is the whole
    // point of the packet -- asking a teacher to learn a tool in order to write two paragraphs is
    // worse than the Google Form it replaces.
    const packetTeacher = (packet.teachers && packet.teachers[0]) || {};
    const field = (label, value) => value == null || value === '' ? '' : t("educator_evaluation.div_class_field_h4_iod7f1", '<div class="field"><h4>') + aeEsc(label) + t("educator_evaluation.h4_div_class_evidence_12hg1hb", '</h4><div class="evidence">') + aeEsc(value) + t("educator_evaluation.div_div_p49kdp", '</div></div>');
    const tags = (values) => Array.isArray(values) && values.length ? t("educator_evaluation.p_class_tags_strong_evidence_tags_strong_sn9n38", '<p class="tags"><strong>Evidence tags:</strong> ') + values.map(aeEsc).join(', ') + '</p>' : '';
    const acknowledged = (value) => value ? t("educator_evaluation.p_class_receipt_acknowledged_4iavpy", '<p class="receipt">Acknowledged ') + aeEsc(aeDateTime(value)) + '. Acknowledgment records receipt, not agreement.</p>' : '';
    const releasedRatingLabel = (value) => (AE_ACTIVE_FW.ratingLabels && AE_ACTIVE_FW.ratingLabels[value]) || aeRatingLabel(value);
    const ackControl = (collection, item, id, words) => item.teacherAcknowledgedAt ? acknowledged(item.teacherAcknowledgedAt)
      : t("educator_evaluation.div_class_ackrow_input_type_checkbox_id_706n5s", '<div class="ackrow"><input type="checkbox" id="') + id + t("educator_evaluation.data_collection_nxw9gp", '" data-collection="') + collection + t("educator_evaluation.data_ack_record_piv8ws", '" data-ack-record="') + aeEsc(item.id) + t("educator_evaluation.label_for_1hb2von", '"><label for="') + id + '">' + aeEsc(words) + t("educator_evaluation.label_div_p_class_fine_this_records_receipt_not_agreement__krgyxz", '</label></div><p class="fine">This records receipt, not agreement, and does not replace any signature required by your district.</p>');
    const domainRows = (ratings, rationales) => AE_DOMAINS.map((domain) => {
      const rating = ratings && ratings[domain.id];
      if (rating == null) return '';
      return t("educator_evaluation.tr_th_scope_row_x183ow", '<tr><th scope="row">') + aeEsc(domain.code + '. ' + aeRubricDisplayLabel(domain.label)) + t("educator_evaluation.th_td_1qtl7j8", '</th><td>') + aeEsc(String(rating) + ' · ' + releasedRatingLabel(rating)) + t("educator_evaluation.td_td_18jyb6g", '</td><td>') + aeEsc((rationales && rationales[domain.id]) || '') + t("educator_evaluation.td_tr_1thzd9l", '</td></tr>');
    }).join('');
    const walkthroughRows = (packet.walkthroughs || []).map((item, index) => t("educator_evaluation.section_class_card_rec_aria_labelledby_ae_walk_title_hulocm", '<section class="card rec" aria-labelledby="ae-walk-title-') + index + '">'
      + t("educator_evaluation.h3_id_ae_walk_title_ppfwoi", '<h3 id="ae-walk-title-') + index + t("educator_evaluation.published_walkthrough_1201ug2", '">Published walkthrough · ') + aeEsc(aeDate(item.date || item.publishedAt)) + '</h3>'
      + t("educator_evaluation.p_class_meta_156h81z", '<p class="meta">') + aeEsc((item.durationMin || '') + t("educator_evaluation.minutes_34xnwn", ' minutes · ') + String(item.announced || '').replace(/_/g, ' ') + (item.subject ? ' · ' + item.subject : '')) + '</p>'
      + field('Directly witnessed evidence', item.evidence)
      + field('Published interpretation / feedback', item.interpretation)
      + tags(item.componentTags)
      + ackControl('walkthroughs', item, 'ae-walk-ack-' + index, 'I acknowledge receipt of this published walkthrough.')
      + t("educator_evaluation.section_1xpnem7", '</section>')).join('');
    const observationRows = (packet.observations || []).map((item, index) => {
      const prework = item.prework || {};
      const preworkHtml = item.preworkSubmittedAt ? t("educator_evaluation.details_summary_submitted_pre_observation_materials_summar_rq0x63", '<details><summary>Submitted pre-observation materials</summary>')
        + field('Lesson / unit plan', prework.plan) + field('Expected outcomes', prework.outcomes)
        + field('Resources and planned supports', prework.resources) + field('Assessment / evidence of learning', prework.assessment)
        + field('Secure artifact references', prework.artifactReferences) + t("educator_evaluation.details_1le3a18", '</details>') : '';
      const assessment = item.evaluatorSignedAt ? t("educator_evaluation.h4_released_evaluator_assessment_h4_div_class_tablewrap_ta_17isk8", '<h4>Released evaluator assessment</h4><div class="tablewrap" tabindex="0" role="region" aria-label="Released formal-observation ratings"><table><thead><tr><th>Domain</th><th>Rating</th><th>Rationale</th></tr></thead><tbody>') + domainRows(item.ratings, item.rationales) + t("educator_evaluation.tbody_table_div_p_class_meta_evaluator_signed_1grrvmu", '</tbody></table></div><p class="meta">Evaluator signed ') + aeEsc(aeDateTime(item.evaluatorSignedAt)) + '.</p>' : '';
      const reflection = item.reflectionSubmittedAt ? field('Your submitted reflection', item.reflection) + t("educator_evaluation.p_class_meta_submitted_1fu7zbs", '<p class="meta">Submitted ') + aeEsc(aeDateTime(item.reflectionSubmittedAt)) + '.</p>'
        : (item.evidencePublishedAt && !item.postConferenceAt && !item.evaluatorSignedAt && !item.finalizedAt
          ? t("educator_evaluation.label_class_lbl_for_ae_refl_10f0hcp", '<label class="lbl" for="ae-refl-') + index + t("educator_evaluation.your_reflection_on_this_observation_optional_label_textare_12oihgp", '">Your reflection on this observation (optional)</label><textarea id="ae-refl-') + index + '" data-collection="observations" data-record="' + aeEsc(item.id) + t("educator_evaluation.rows_4_textarea_nwycci", '" rows="4"></textarea>') : '');
      const ack = item.evaluatorSignedAt ? ackControl('observations', item, 'ae-obs-ack-' + index, 'I acknowledge receipt of this formal-observation assessment and had an opportunity to discuss it.') : '';
      return t("educator_evaluation.section_class_card_rec_aria_labelledby_ae_obs_title_zirg21", '<section class="card rec" aria-labelledby="ae-obs-title-') + index + t("educator_evaluation.h3_id_ae_obs_title_lkp6x5", '"><h3 id="ae-obs-title-') + index + t("educator_evaluation.formal_observation_se1bld", '">Formal observation · ') + aeEsc(aeDate(item.observedAt || item.createdAt)) + '</h3>'
        + t("educator_evaluation.p_class_meta_156h81z", '<p class="meta">') + (item.finalizedAt ? t("educator_evaluation.finalized_4cmc2p", 'Finalized ') + aeEsc(aeDateTime(item.finalizedAt)) : t("educator_evaluation.workflow_record_issued_with_the_released_material_availabl_274fx7", 'Workflow record issued with the released material available below.')) + '</p>'
        + preworkHtml
        + (item.evidencePublishedAt ? field('Published observation evidence', item.evidence) + tags(item.componentTags) + t("educator_evaluation.p_class_meta_published_fljia7", '<p class="meta">Published ') + aeEsc(aeDateTime(item.evidencePublishedAt)) + '.</p>' : t("educator_evaluation.p_class_fine_no_observation_evidence_has_been_released_in__1u8l5ms", '<p class="fine">No observation evidence has been released in this record yet.</p>'))
        + reflection + field('Released post-conference discussion and follow-up', item.postConferenceNotes)
        + assessment + ack + t("educator_evaluation.section_1xpnem7", '</section>');
    }).join('');
    const spmRows = (packet.spms || []).map((item, index) => t("educator_evaluation.section_class_card_rec_aria_labelledby_ae_spm_title_1r9icgd", '<section class="card rec" aria-labelledby="ae-spm-title-') + index + t("educator_evaluation.h3_id_ae_spm_title_1d53j65", '"><h3 id="ae-spm-title-') + index + t("educator_evaluation.spm_slo_record_1pxkzqo", '">SPM / SLO record · ') + aeEsc(aeWorkflowStatusLabel(item.status)) + '</h3>'
      + t("educator_evaluation.p_class_meta_submitted_plan_version_1bm3qbv", '<p class="meta">Submitted plan version ') + aeEsc(item.version || 1) + (item.submittedAt ? ' · ' + aeEsc(aeDateTime(item.submittedAt)) : '') + '</p>'
      + field('Classroom context and priority learning need', item.context) + field('Baseline', item.baseline)
      + field('Goal and expected outcomes', item.goal) + field('Performance measures and indicators', item.measures)
      + field('Action plan, supports, and evidence sources', item.actionPlan)
      + field('Returned for revision', item.returnReason)
      + (item.approvedAt ? t("educator_evaluation.p_class_receipt_plan_approved_by_dorqit", '<p class="receipt">Plan approved by ') + aeEsc(item.approvedBy || t("educator_evaluation.evaluator_125q2ii", 'Evaluator')) + ' · ' + aeEsc(aeDateTime(item.approvedAt)) + '.</p>' : '')
      + field('Submitted year-end results', item.results) + field('Your submitted SPM reflection', item.reflection)
      + (item.lockedAt ? t("educator_evaluation.h4_released_spm_rating_h4_p_strong_56p61t", '<h4>Released SPM rating</h4><p><strong>') + aeEsc(String(item.rating) + ' · ' + releasedRatingLabel(item.rating)) + t("educator_evaluation.strong_p_dgjddc", '</strong></p>') + field('Rating rationale', item.ratingRationale) + t("educator_evaluation.p_class_meta_locked_c1wvw1", '<p class="meta">Locked ') + aeEsc(aeDateTime(item.lockedAt)) + '.</p>' : '')
      + t("educator_evaluation.section_1xpnem7", '</section>')).join('');
    const comments = (packet.comments || []).length ? t("educator_evaluation.section_class_card_h2_shared_conversation_h2_1rqgjm4", '<section class="card"><h2>Shared conversation</h2>') + packet.comments.map((item) => t("educator_evaluation.article_class_comment_p_strong_l7ww3e", '<article class="comment"><p><strong>') + aeEsc(item.author || item.role || t("educator_evaluation.participant_1jddysu", 'Participant')) + t("educator_evaluation.strong_60hewm", '</strong> · ') + aeEsc(aeDateTime(item.at)) + t("educator_evaluation.p_div_class_evidence_1p09vbf", '</p><div class="evidence">') + aeEsc(item.text || '') + t("educator_evaluation.div_article_sddgg6", '</div></article>')).join('') + t("educator_evaluation.section_1xpnem7", '</section>') : '';
    const annualEvidenceIndex = aeAnnualEvidenceOptions(packet, packetTeacher.id).reduce((index, item) => { index[item.token] = item.label; return index; }, Object.create(null));
    const annualEvidenceDetails = packetTeacher.finalizedAt && packetTeacher.annualEvidenceRefs ? '<section class="card"><h2>Annual evidence provenance</h2><p class="fine">These are the released records selected as evidence for each finalized annual rating.</p>' + AE_DOMAINS.map((domain) => {
      if (!packetTeacher.ratings || !packetTeacher.ratings.domains || packetTeacher.ratings.domains[domain.id] == null) return '';
      const refs = packetTeacher.annualEvidenceRefs[domain.id] || [];
      return '<article><h3>' + aeEsc(domain.code + '. ' + aeRubricDisplayLabel(domain.label)) + '</h3>' + (refs.length ? '<ul>' + refs.map((token) => '<li><strong>' + aeEsc(annualEvidenceIndex[token] || 'Released evidence record') + '</strong><br><span class="meta">Reference: ' + aeEsc(token) + '</span></li>').join('') + '</ul>' : '<p class="fine">No evidence references were recorded.</p>') + '</article>';
    }).join('') + '</section>' : '';
    const annualRatings = packetTeacher.finalizedAt && packetTeacher.ratings ? t("educator_evaluation.section_class_card_h2_finalized_annual_ratings_h2_div_clas_e6yych", '<section class="card"><h2>Finalized annual ratings</h2><div class="tablewrap" tabindex="0" role="region" aria-label="Finalized annual domain ratings"><table><thead><tr><th>Domain</th><th>Rating</th><th>Rationale</th></tr></thead><tbody>') + domainRows(packetTeacher.ratings.domains, packetTeacher.annualRationales) + t("educator_evaluation.tbody_table_div_u57d8f", '</tbody></table></div>')
      + (packetTeacher.finalScore == null ? '' : t("educator_evaluation.p_strong_final_calculation_1wz79wz", '<p><strong>Final calculation: ') + aeEsc(Number(packetTeacher.finalScore).toFixed(2)) + ' · ' + aeEsc(aeBand(packetTeacher.finalScore)) + t("educator_evaluation.strong_p_dgjddc", '</strong></p>'))
      + t("educator_evaluation.p_class_meta_finalized_c70m6r", '<p class="meta">Finalized ') + aeEsc(aeDateTime(packetTeacher.finalizedAt)) + '.</p></section>' + annualEvidenceDetails : '';
    const existingStatement = packetTeacher.educatorStatement && packetTeacher.educatorStatement.text ? packetTeacher.educatorStatement.text : '';
    const statementControl = packetTeacher.finalizedAt
      ? field('Your educator statement', existingStatement) + t("educator_evaluation.p_class_fine_the_annual_cycle_is_finalized_so_this_stateme_1q4ssim", '<p class="fine">The annual cycle is finalized, so this statement is shown read-only. Follow your district process if an addendum is needed.</p>')
      : t("educator_evaluation.label_class_lbl_for_ae_statement_your_statement_in_your_ow_k494lx", '<label class="lbl" for="ae-statement">Your statement (in your own words)</label><textarea id="ae-statement" rows="6">') + aeEsc(existingStatement) + t("educator_evaluation.textarea_1cksj6w", '</textarea>');
    const nameNotice = packet.includeNames
      ? t("educator_evaluation.this_packet_includes_profile_display_names_and_released_fr_gzfcfd", 'This packet includes profile/display names and released free text.')
      : t("educator_evaluation.strong_profile_display_names_were_replaced_with_the_educat_12wqjp0", '<strong>Profile/display names were replaced with the educator code and role labels.</strong> Free-text evidence, comments, statements, and reflections were not de-identified and may still name or identify people.');
    const readable = t("educator_evaluation.doctype_html_html_lang_en_head_meta_charset_utf_8_7un36s", '<!doctype html><html lang="en"><head><meta charset="utf-8">')
      + '<meta name="viewport" content="width=device-width, initial-scale=1">'
      + t("educator_evaluation.title_your_evaluation_title_1pwgui7", '<title>Your evaluation</title>')
      + t("educator_evaluation.style_body_font_16px_1_6_system_ui_sans_serif_color_172033_1jkfe2t", '<style>body{font:16px/1.6 system-ui,sans-serif;color:#172033;background:#f6f8fb;max-width:900px;margin:0 auto;padding:24px}')
      + t("educator_evaluation.h1_color_173e70_font_size_1_7rem_h2_color_173e70_font_size_1fmca8o", 'h1{color:#173e70;font-size:1.7rem}h2{color:#173e70;font-size:1.25rem;margin-top:28px}h3{color:#173e70;font-size:1.05rem;margin:0 0 8px}h4{margin:14px 0 5px}')
      + '.card{background:#fff;border:1px solid #d7dee8;border-radius:10px;padding:18px;margin:16px 0}'
      + '.notice{background:#eef6ff;border:1px solid #93b8e8}.warning{background:#fff8e8;border-color:#e5bd59}'
      + '.evidence{white-space:pre-wrap;background:#f8fafc;border-left:4px solid #93b8e8;padding:10px 12px}.field{margin:12px 0}.meta,.fine{font-size:.9rem;color:#475569}.tags{font-size:.92rem}.receipt{background:#edf9f2;border:1px solid #86c9a5;padding:9px 11px}.comment{border-top:1px solid #d7dee8;padding-top:8px;margin-top:12px}'
      + '.tablewrap{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;border:1px solid #cbd5e1;padding:8px}th{background:#f1f5f9}'
      + '.lbl{display:block;font-weight:600;margin:12px 0 6px}'
      + 'textarea{box-sizing:border-box;width:100%;font:inherit;padding:10px;border:1px solid #94a3b8;border-radius:8px;min-height:96px}'
      + '.ackrow{display:flex;align-items:flex-start;gap:12px;margin:14px 0}'
      + '.ackrow input{width:24px;height:24px;flex:0 0 auto;margin:0}'
      + 'button{font:inherit;font-weight:700;min-height:48px;padding:12px 20px;border:0;border-radius:10px;background:#1d4ed8;color:#fff;cursor:pointer}'
      + 'button:focus-visible,textarea:focus-visible,input:focus-visible{outline:3px solid #b45309;outline-offset:2px}'
      + '.done{margin-top:12px;font-weight:600;color:#14532d}</style></head><body>'
      + t("educator_evaluation.h1_your_evaluation_h1_55wd4r", '<h1>Your evaluation</h1>')
      + t("educator_evaluation.p_strong_1qpg7me", '<p><strong>') + aeEsc(who) + t("educator_evaluation.strong_60hewm", '</strong> · ') + aeEsc(packet.config.organization) + ' · ' + aeEsc(packet.config.academicYear) + '</p>'
      + '<div class="card notice"><p><strong>This is a released, educator-visible copy.</strong> It excludes private walkthrough drafts, unpublished observation evidence, unsigned ratings, unsubmitted reflections, mutable SPM drafts, internal receipts, and organization-wide records.</p><p>If you respond below, this page creates a response file on your device. Nothing is uploaded from this page and no account is needed.</p></div>'
      + t("educator_evaluation.p_class_card_warning_1z0v2rk", '<p class="card warning">') + nameNotice + t("educator_evaluation.review_this_attachment_and_use_only_a_district_authorized__q8bcbp", ' Review this attachment and use only a district-authorized channel.</p>')
      + annualRatings
      + t("educator_evaluation.h2_published_walkthrough_evidence_h2_1aq7tu3", '<h2>Published walkthrough evidence</h2>') + (walkthroughRows || t("educator_evaluation.p_class_card_no_published_walkthroughs_were_included_p_1n4kkis", '<p class="card">No published walkthroughs were included.</p>'))
      + t("educator_evaluation.h2_formal_observation_records_h2_fqfq26", '<h2>Formal-observation records</h2>') + (observationRows || t("educator_evaluation.p_class_card_no_formal_observation_records_were_included_p_ehbfuh", '<p class="card">No formal-observation records were included.</p>'))
      + t("educator_evaluation.h2_spm_slo_records_h2_1qn1v2d", '<h2>SPM / SLO records</h2>') + (spmRows || t("educator_evaluation.p_class_card_no_submitted_spm_slo_records_were_included_p_xgo9nd", '<p class="card">No submitted SPM / SLO records were included.</p>'))
      + comments
      + t("educator_evaluation.h2_add_your_response_h2_1hcku8l", '<h2>Add your response</h2>')
      + t("educator_evaluation.div_class_card_1uxw7v", '<div class="card">') + statementControl
      + t("educator_evaluation.p_class_fine_reflection_and_acknowledgement_controls_appea_176ory3", '<p class="fine">Reflection and acknowledgement controls appear with the individual eligible records above. Each acknowledgement applies only to the record beside it.</p>')
      + t("educator_evaluation.button_type_button_id_ae_send_download_my_response_button_16kbio9", '<button type="button" id="ae-send">Download my response</button>')
      + t("educator_evaluation.p_class_done_id_ae_status_role_status_p_div_d55c4n", '<p class="done" id="ae-status" role="status"></p></div>')
      + t("educator_evaluation.p_issued_x1clpw", '<p>Issued ') + aeEsc(aeDateTime(packet.issuedAt)) + '.</p>'
      + '<' + t("educator_evaluation.script_type_application_json_id_h0f7zc", 'script type="application/json" id="') + AE_PACKET_SCRIPT_ID + '">' + aePacketEmbed(JSON.stringify(packet)) + '<' + '/script>'
      + '<' + t("educator_evaluation.script_nxwj5o", 'script>') + AE_PACKET_FORM_JS + '<' + '/script>'
      + t("educator_evaluation.body_html_1o0q8b8", '</body></html>');
    aeDownload('evaluation-packet-' + selectedTeacher.code + '-' + aeToday() + '.html', 'text/html;charset=utf-8', readable);
    commit(() => {}, { teacherId: selectedTeacher.id, event: 'EXPORTED', summary: t("educator_evaluation.educator_packet_issued_1ypdouh", 'Educator packet issued') + (packetIncludeNames ? '' : t("educator_evaluation.structured_profile_names_withheld_free_text_unchanged_9u45ss", ' (structured profile names withheld; free text unchanged)')), entityType: 'evaluation', entityId: selectedTeacher.id }, 'Educator packet created');
  };
  const exportResponsePacket = () => {
    if (!selectedTeacher) return;
    const packet = aeResponsePacket(workspace, selectedTeacher.id, workspace.receivedPacketId || '');
    if (!packet) { notify(t("educator_evaluation.export_failed_no_record_to_respond_to_qz92fr", 'Export failed: no record to respond to.'), 'error'); return; }
    aeDownload('evaluation-response-' + selectedTeacher.code + '-' + aeToday() + '.json', 'application/json', JSON.stringify(packet, null, 2));
    commit(() => {}, { teacherId: selectedTeacher.id, event: 'EXPORTED', summary: t("educator_evaluation.educator_response_packet_created_1dxrsw9", 'Educator response packet created'), entityType: 'evaluation', entityId: selectedTeacher.id }, 'Response packet created');
  };
  const aiReflectionEnabled = !!(workspace.config && workspace.config.aiReflectionEnabled);
  const askForReflection = () => {
    const teacherId = selectedTeacher && selectedTeacher.id;
    if (!teacherId) return;
    const requestId = (Number(reflectionRequestRef.current.requestId) || 0) + 1;
    reflectionRequestRef.current = { teacherId, requestId };
    const setScopedReflection = (status, text) => {
      const currentRequest = reflectionRequestRef.current;
      if (!remoteMountedRef.current || selectedTeacherIdRef.current !== teacherId || currentRequest.requestId !== requestId || currentRequest.teacherId !== teacherId) return false;
      setReflection({ status, text, teacherId, requestId });
      return true;
    };
    const ask = typeof window !== 'undefined' ? window.callGemini : null;
    if (typeof ask !== 'function') {
      setScopedReflection('error', t("educator_evaluation.no_ai_backend_is_configured_in_this_copy_so_this_stays_una_1bghxda", 'No AI backend is configured in this copy, so this stays unavailable.'));
      return;
    }
    const labels = {};
    AE_RATINGS.forEach((entry) => { labels[String(entry.value)] = entry.label; });
    const prompt = aeBuildReflectionPrompt(workspaceRef.current, teacherId, AE_DOMAINS, labels);
    if (!prompt) {
      setScopedReflection('error', t("educator_evaluation.there_is_no_published_evidence_yet_for_this_educator_so_th_10adzy7", 'There is no published evidence yet for this educator, so there is nothing to check.'));
      return;
    }
    setScopedReflection('working', '');
    Promise.resolve()
      .then(() => ask(prompt))
      .then((answer) => {
        const text = typeof answer === 'string' ? answer : (answer && (answer.text || answer.output)) || '';
        if (!setScopedReflection(text ? 'done' : 'error', text || t("educator_evaluation.the_model_returned_nothing_t0z2ap", 'The model returned nothing.'))) return;
        if (text) {
          // Record that assistance was used. The answer itself is never written into the record.
          commit(() => {}, {
            teacherId, event: 'CONFIG_UPDATED',
            summary: t("educator_evaluation.ai_reflection_requested_on_the_documented_evidence_the_rep_dcuexu", 'AI reflection requested on the documented evidence; the reply was shown to the evaluator and not stored in the record.'),
            entityType: 'evaluation', entityId: teacherId,
          }, null);
        }
      })
      .catch((error) => {
        setScopedReflection('error', t("educator_evaluation.that_request_failed_1crcmpk", 'That request failed: ') + ((error && error.message) || t("educator_evaluation.unknown_error_1r8cjdv", 'unknown error')));
      });
  };
  const exportRubric = () => {
    aeDownload('evaluation-rubric-' + (AE_ACTIVE_FW.versionTag || 'current') + '.json', 'application/json',
      JSON.stringify({
        name: AE_ACTIVE_FW.name, versionTag: AE_ACTIVE_FW.versionTag,
        practiceLabel: AE_ACTIVE_FW.practiceLabel, practiceShort: AE_ACTIVE_FW.practiceShort,
        domainWeighted: !!AE_ACTIVE_FW.domainWeighted, bands: AE_ACTIVE_FW.bands || null,
        domains: AE_DOMAINS.map((domain) => ({
          id: domain.id, code: domain.code, label: domain.label, weight: domain.weight, color: domain.color,
          components: (AE_ACTIVE_FW.components && AE_ACTIVE_FW.components[domain.id]) || domain.components || [],
        })),
      }, null, 2));
    notify(t("educator_evaluation.rubric_downloaded_1v73hvp", 'Rubric downloaded'), 'success');
  };
  const applyRubric = (rubric, label) => {
    // Ratings are keyed by domain id, so say exactly whose scores would be stranded before writing.
    const orphans = aeRubricOrphans(workspaceRef.current, rubric ? rubric.domains : AE_DEFAULT_DOMAINS);
    if (orphans.length) {
      const names = orphans.map((entry) => entry.name).join(', ');
      const ok = typeof window !== 'undefined' && window.confirm
        ? window.confirm(t("educator_evaluation.this_rubric_does_not_include_every_domain_that_already_car_6to6w1", 'This rubric does not include every domain that already carries a rating. ')
          + t("educator_evaluation.existing_ratings_for_lb9cox", 'Existing ratings for ') + names + t("educator_evaluation.would_no_longer_be_shown_or_scored_though_nothing_is_9imlcj", ' would no longer be shown or scored, though nothing is ')
          + t("educator_evaluation.deleted_and_restoring_the_previous_rubric_brings_them_back_1xsmw5s", 'deleted and restoring the previous rubric brings them back. Apply it anyway?'))
        : true;
      if (!ok) return;
    }
    commit((next) => {
      next.config = Object.assign({}, next.config, { customRubric: rubric || null });
      aeSetActiveFramework(next.config);
    }, {
      event: 'CONFIG_UPDATED',
      summary: rubric
        ? (t("educator_evaluation.rubric_changed_to_lkc7td", 'Rubric changed to ') + rubric.name + ' (' + rubric.versionTag + ')'
          + (orphans.length ? '; ' + orphans.length + t("educator_evaluation.educator_record_s_hold_ratings_outside_it_1fvwn6y", ' educator record(s) hold ratings outside it') : ''))
        : t("educator_evaluation.rubric_restored_to_the_built_in_set_1li4fu0", 'Rubric restored to the built-in set'),
      entityType: 'workspace', entityId: 'workspace',
    }, label);
  };
  const clearRubric = () => applyRubric(null, 'Built-in rubric restored');
  const importRubric = (file) => {
    if (!file || file.size > 1024 * 1024) { notify(t("educator_evaluation.rubric_import_failed_choose_a_json_file_under_1_mb_wgl1aw", 'Rubric import failed: choose a JSON file under 1 MB.'), 'error'); return; }
    const reader = new FileReader();
    reader.onerror = () => notify(t("educator_evaluation.rubric_import_failed_the_file_could_not_be_read_19uye8a", 'Rubric import failed: the file could not be read.'), 'error');
    reader.onload = () => {
      let rubric = null;
      try { rubric = aeNormalizeRubric(JSON.parse(String(reader.result || ''))); }
      catch (error) { notify(t("educator_evaluation.rubric_import_failed_that_file_is_not_valid_json_pe01r0", 'Rubric import failed: that file is not valid JSON.'), 'error'); return; }
      if (!rubric) {
        notify(t("educator_evaluation.rubric_import_failed_use_exactly_d1_d2_d3_and_d4_include_b_s84l4r", 'Rubric import failed: use exactly d1, d2, d3, and d4; include bounded unique components; weighted domains must total 100%.'), 'error');
        return;
      }
      applyRubric(rubric, t("educator_evaluation.rubric_loaded_dwtpch", 'Rubric loaded: ') + rubric.name);
    };
    reader.readAsText(file);
  };
  const importWorkspace = (file) => {
    if (!file || file.size > 5 * 1024 * 1024) { notify(t("educator_evaluation.import_failed_choose_an_export_or_packet_smaller_than_5_mb_ma18m5", 'Import failed: choose an export or packet smaller than 5 MB.'), 'error'); return; }
    const reader = new FileReader();
    reader.onerror = () => notify(t("educator_evaluation.import_failed_the_selected_file_could_not_be_read_15d3w26", 'Import failed: the selected file could not be read.'), 'error');
    reader.onload = () => {
      try {
        const parsed = JSON.parse(aePacketExtract(String(reader.result || '')));
        if (parsed.kind === AE_PACKET_KIND && Number(parsed.version) === 1) {
          if (parsed.packetType === 'response') {
            const merged = aeClone(workspaceRef.current);
            const outcome = aeMergeResponsePacket(merged, parsed);
            if (!outcome.ok) throw new Error('This response does not match an educator in this workspace.');
            const teacher = merged.teachers.find((item) => item.id === outcome.teacherId);
            setPendingImport({
              kind: 'response',
              label: t("educator_evaluation.educator_response_packet_odq1at", 'Educator response packet'),
              replacesWorkspace: false,
              nextWorkspace: merged,
              teacherId: outcome.teacherId,
              packetId: aeSafeId(parsed.packetId, 'unknown'),
              issuedAt: aeTimestamp(parsed.issuedAt),
              outcome,
              facts: [
                ['Educator', teacher ? (teacher.name + ' · ' + teacher.code) : outcome.teacherId],
                ['Educator-owned fields ready', String(outcome.applied)],
                ['Changed source records', String(outcome.stale.length)],
                ['Ignored fields', String(outcome.ignored)],
                ['Packet issued', aeDateTime(parsed.issuedAt)],
              ],
              warning: outcome.stale.length ? t("educator_evaluation.one_or_more_evaluator_records_changed_after_this_response__zrnxww", 'One or more evaluator records changed after this response packet was issued. Review those records after applying.') : '',
            });
            return;
          }
          if (parsed.packetType === 'educator') {
            const own = aeNormalizeWorkspace(Object.assign({}, parsed, {
              kind: AE_EXPORT_KIND,
              educatorPacketMode: true,
              receivedPacketId: parsed.packetId || '',
            }));
            if (!own) throw new Error('Invalid packet structure.');
            own.receivedPacketId = parsed.packetId || '';
            own.educatorPacketMode = true;
            const teacher = own.teachers[0];
            setPendingImport({
              kind: 'educator',
              label: t("educator_evaluation.educator_only_evaluation_packet_1tuqc4b", 'Educator-only evaluation packet'),
              replacesWorkspace: true,
              nextWorkspace: own,
              teacherId: teacher ? teacher.id : '',
              facts: [
                ['Educator', teacher ? (teacher.name + ' · ' + teacher.code) : t("educator_evaluation.not_identified_1uacsyz", 'Not identified')],
                ['Organization', own.config.organization || t("educator_evaluation.not_specified_als0rs", 'Not specified')],
                ['Academic year', own.config.academicYear || t("educator_evaluation.not_specified_als0rs", 'Not specified')],
                ['Published walkthroughs', String(own.walkthroughs.length)],
                ['Formal observations', String(own.observations.length)],
                ['SPM / SLO records', String(own.spms.length)],
              ],
              warning: 'This replaces the current local workspace and then remains locked to educator-only mode. A recovery download is created first.',
            });
            return;
          }
          throw new Error('Unrecognised packet type.');
        }
        if (parsed.kind !== AE_EXPORT_KIND || Number(parsed.version) !== 1) throw new Error('Not an AlloFlow Educator Evaluation v1 export.');
        const normalized = aeNormalizeWorkspace(parsed);
        if (!normalized) throw new Error('Invalid workspace structure.');
        const helperBindingRemoved = !!(normalized.config.shareHelperUrl || normalized.config.shareHelperVerified);
        normalized.config.shareHelperUrl = '';
        normalized.config.shareHelperVerified = false;
        normalized.educatorPacketMode = false;
        setPendingImport({
          kind: 'workspace',
          label: t("educator_evaluation.complete_evaluation_workspace_backup_8ojgz5", 'Complete evaluation workspace backup'),
          replacesWorkspace: true,
          nextWorkspace: normalized,
          teacherId: (normalized.teachers[0] && normalized.teachers[0].id) || '',
          facts: [
            ['Organization', normalized.config.organization || t("educator_evaluation.not_specified_als0rs", 'Not specified')],
            ['Academic year', normalized.config.academicYear || t("educator_evaluation.not_specified_als0rs", 'Not specified')],
            ['Educators', String(normalized.teachers.length)],
            ['Walkthroughs', String(normalized.walkthroughs.length)],
            ['Formal observations', String(normalized.observations.length)],
            ['SPM / SLO records', String(normalized.spms.length)],
            ['Exported', aeDateTime(parsed.exportedAt)],
          ],
          warning: (helperBindingRemoved ? t("educator_evaluation.a_device_specific_apps_script_helper_link_and_its_verifica_v2ysmc", 'A device-specific Apps Script helper link and its verification were removed and must be verified again. ') : '') + t("educator_evaluation.a_recovery_download_of_the_current_workspace_is_created_be_12vayz4", 'A recovery download of the current workspace is created before replacement.'),
        });
      } catch (error) {
        setPendingImport(null);
        notify(t("educator_evaluation.import_failed_215ktt", 'Import failed: ') + error.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  const cancelPendingImport = () => {
    setPendingImport(null);
    notify(t("educator_evaluation.import_cancelled_the_current_workspace_was_not_changed_stxo2i", 'Import cancelled. The current workspace was not changed.'), 'info');
  };
  const confirmPendingImport = () => {
    if (!pendingImport || !pendingImport.nextWorkspace) return;
    const previous = aeClone(workspaceRef.current);
    if (pendingImport.replacesWorkspace) {
      const checkpoint = Object.assign({}, previous, { kind: AE_EXPORT_KIND, exportedAt: aeNow(), recoveryReason: 'Automatic checkpoint before import' });
      aeDownload('alloflow-before-import-' + aeToday() + '.json', 'application/json', JSON.stringify(checkpoint, null, 2));
    }
    const next = aeClone(pendingImport.nextWorkspace);
    if (pendingImport.kind === 'response') {
      const outcome = pendingImport.outcome;
      const staleNote = outcome.stale.length ? ' ' + outcome.stale.length + t("educator_evaluation.record_s_changed_after_the_packet_was_issued_mngtqz", ' record(s) changed after the packet was issued.') : '';
      const droppedNote = outcome.ignored ? ' ' + outcome.ignored + t("educator_evaluation.field_s_outside_the_educator_owned_set_were_ignored_5546hp", ' field(s) outside the educator-owned set were ignored.') : '';
      aeAuditEvent(next, {
        teacherId: outcome.teacherId,
        event: 'IMPORTED',
        summary: t("educator_evaluation.reviewed_educator_response_imported_from_packet_gojzm0", 'Reviewed educator response imported from packet ') + pendingImport.packetId + ' issued ' + aeDate(pendingImport.issuedAt) + '.' + staleNote + droppedNote,
        entityType: 'evaluation',
        entityId: outcome.teacherId,
      }, (next.teachers.find((item) => item.id === outcome.teacherId) || {}).name || t("educator_evaluation.educator_8c1rq4", 'Educator'));
    } else if (pendingImport.kind === 'workspace') {
      aeAuditEvent(next, { event: 'IMPORTED', summary: t("educator_evaluation.reviewed_workspace_imported_from_json_guwjmd", 'Reviewed workspace imported from JSON'), entityType: 'workspace', entityId: 'workspace' }, next.config.evaluatorName || t("educator_evaluation.evaluator_125q2ii", 'Evaluator'), 'Evaluator');
    }
    setImportUndo({ workspace: previous, selectedTeacherId, role, tab });
    workspaceRef.current = next;
    setWorkspace(next);
    setSelectedTeacherId(pendingImport.teacherId || ((next.teachers[0] && next.teachers[0].id) || ''));
    setRole(next.educatorPacketMode ? 'teacher' : 'evaluator');
    setTab(pendingImport.kind === 'response' ? 'audit' : 'overview');
    const appliedLabel = pendingImport.kind === 'response' ? t("educator_evaluation.educator_response_applied_after_review_5so1ge", 'Educator response applied after review.') : (pendingImport.kind === 'educator' ? t("educator_evaluation.educator_only_packet_opened_after_review_i3085g", 'Educator-only packet opened after review.') : t("educator_evaluation.workspace_replaced_after_review_the_prior_workspace_was_do_hpndsb", 'Workspace replaced after review; the prior workspace was downloaded.'));
    setPendingImport(null);
    notify(appliedLabel, 'success');
  };
  const undoImport = () => {
    if (!importUndo || !importUndo.workspace) return;
    const previous = aeClone(importUndo.workspace);
    workspaceRef.current = previous;
    setWorkspace(previous);
    setSelectedTeacherId(importUndo.selectedTeacherId || ((previous.teachers[0] && previous.teachers[0].id) || ''));
    setRole(previous.educatorPacketMode ? 'teacher' : importUndo.role);
    setTab(importUndo.tab || 'overview');
    setImportUndo(null);
    notify(t("educator_evaluation.import_undone_the_previous_workspace_has_been_restored_bl7f3q", 'Import undone. The previous workspace has been restored.'), 'success');
  };
  const tabs = role === 'teacher' ? [
    ['overview', 'My evaluation'], ['trends', 'My trends'], ['walkthroughs', 'My evidence'], ['formal', 'Formal observation'], ['spm', 'SPM / SLO'], ['audit', 'Timeline'], ['about', 'About'],
  ] : [
    ['overview', 'Overview'], ['trends', 'Trends'], ['staff', 'Staff'], ['walkthroughs', 'Walkthroughs'], ['formal', 'Formal observations'], ['spm', 'SPM / SLO'], ['audit', 'Reports & audit'], ['about', 'Setup'],
  ];
  React.useEffect(() => { if (!tabs.some((item) => item[0] === tab)) setTab('overview'); }, [role]);
  const useDistrictConflictVersion = () => {
    if (!remoteConflict) return;
    setRemoteConflict(null);
    setRemoteState((current) => ({ ...current, status: 'saved', error: '', inFlight: false }));
    announce(t("educator_evaluation.current_district_version_kept_wcosr4", 'Current district version kept'));
    notify(t("educator_evaluation.current_district_version_kept_your_conflicting_attempt_was_ryvf9b", 'Current district version kept. Your conflicting attempt was not applied.'), 'success');
    restoreRemoteWorkspaceFocus();
  };
  const replayRemoteConflict = () => {
    if (!remoteConflict || remoteConflict.appliedCount < 1) return;
    const replay = aeRemoteScopedWorkspace(remoteConflict.mergedWorkspace, remoteUserRef.current);
    if (!replay) { notify(t("educator_evaluation.the_safe_replay_could_not_be_validated_keep_the_district_v_1qgo2io", 'The safe replay could not be validated. Keep the district version and re-enter the change manually.'), 'error'); return; }
    const baseWorkspace = aeClone(remoteConflict.latestWorkspace);
    const mutation = remoteConflict.mutation;
    const generation = ++remoteSaveGenerationRef.current;
    workspaceRef.current = replay;
    setWorkspace(replay);
    setRemoteConflict(null);
    announce(t("educator_evaluation.reapplying_non_conflicting_work_lad1n5", 'Reapplying non-conflicting work'));
    restoreRemoteWorkspaceFocus();
    enqueueRemoteSave({ workspace: aeClone(replay), baseWorkspace, mutation, generation, restoreFocusOnSuccess: true });
  };
  const remotePanelUnavailable = isRemote && ['error', 'conflict'].includes(remoteState.status);
  const visibleReflection = selectedTeacher && reflection.teacherId === selectedTeacher.id
    ? reflection
    : { status: 'idle', text: '', teacherId: selectedTeacher ? selectedTeacher.id : '', requestId: 0 };
  const blockRemoteMutation = (event) => { if (!isRemote || !remotePanelUnavailable) return; event.preventDefault(); event.stopPropagation(); };
  const tabKey = (event, index) => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); let next = index; if (event.key === 'ArrowRight') next = (index + 1) % tabs.length; if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length; if (event.key === 'Home') next = 0; if (event.key === 'End') next = tabs.length - 1; setTab(tabs[next][0]); requestAnimationFrame(() => { const el = document.getElementById('ae-tab-' + tabs[next][0]); if (el) el.focus(); }); };

  const retryLocalRecovery = () => {
    const result = aeReadLocalWorkspace();
    if (result.status === 'ok') {
      workspaceRef.current = result.workspace;
      setWorkspace(result.workspace);
      setSelectedTeacherId((result.workspace.teachers[0] && result.workspace.teachers[0].id) || '');
      setRole(result.workspace.educatorPacketMode ? 'teacher' : 'evaluator');
      setLocalRecovery(null);
      setLocalSaveState({ status: 'saved', error: '', savedAt: aeNow() });
      notify(t("educator_evaluation.saved_workspace_recovered_q1q4iy", 'Saved workspace recovered.'), 'success');
      return;
    }
    if (result.status === 'empty') {
      setLocalRecovery(null);
      setShowLocalOnboarding(true);
      setLocalSaveState({ status: 'idle', error: '', savedAt: '' });
      notify(t("educator_evaluation.no_saved_workspace_was_found_choose_a_starting_point_168rzd9", 'No saved workspace was found. Choose a starting point.'), 'info');
      return;
    }
    setLocalRecovery(result);
    setLocalSaveState({ status: 'error', error: result.status === 'corrupt' ? t("educator_evaluation.the_saved_workspace_needs_recovery_1kzo7dg", 'The saved workspace needs recovery.') : t("educator_evaluation.browser_storage_remains_unavailable_2uzfjh", 'Browser storage remains unavailable.'), savedAt: '' });
  };
  const downloadDamagedWorkspace = () => {
    if (!localRecovery || !localRecovery.raw) return;
    aeDownload('alloflow-damaged-workspace-' + aeToday() + '.txt', 'text/plain;charset=utf-8', localRecovery.raw);
    notify(t("educator_evaluation.damaged_raw_workspace_downloaded_for_recovery_1dsqy60", 'Damaged raw workspace downloaded for recovery.'), 'success');
  };
  const startFreshAfterRecovery = () => {
    if (!localRecoveryResetArmed) { setLocalRecoveryResetArmed(true); return; }
    try { localStorage.removeItem(AE_STORAGE_KEY); } catch (_) {}
    const blank = aeBlankWorkspace();
    workspaceRef.current = blank;
    setWorkspace(blank);
    setSelectedTeacherId('');
    setRole('evaluator');
    setLocalRecovery(null);
    setLocalRecoveryResetArmed(false);
    setShowLocalOnboarding(false);
    aeSaveOnboardingChoice('blank');
    setLocalSaveState({ status: 'idle', error: '', savedAt: '' });
    notify(t("educator_evaluation.a_new_blank_workspace_was_started_after_explicit_recovery__vfm7dj", 'A new blank workspace was started after explicit recovery reset.'), 'success');
  };
  const continueTemporarySession = () => {
    setLocalRecovery(null);
    setLocalSaveState({ status: 'error', error: t("educator_evaluation.temporary_session_changes_are_not_confirmed_on_this_device_1eeezaa", 'Temporary session: changes are not confirmed on this device.'), savedAt: '' });
    notify(t("educator_evaluation.temporary_session_started_export_a_recovery_copy_before_cl_1dyyt3d", 'Temporary session started. Export a recovery copy before closing this page.'), 'error');
  };
  const retryLocalSave = () => {
    const result = aeStore(workspaceRef.current);
    setLocalSaveState(result.ok
      ? { status: 'saved', error: '', savedAt: result.savedAt }
      : { status: 'error', error: result.error, detail: result.detail || '', savedAt: '' });
    notify(result.ok ? t("educator_evaluation.workspace_saved_on_this_device_vht8ei", 'Workspace saved on this device.') : result.error, result.ok ? 'success' : 'error');
  };

  if (!isRemote && localRecovery) {
    const corrupt = localRecovery.status === 'corrupt';
    const recoveryBody = <div ref={dialogRef} tabIndex={-1} className="ae-workspace" role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : 'true'} aria-labelledby="ae-recovery-title">
      <header className="ae-top"><div className="ae-brand"><div className="ae-mark" aria-hidden="true">A✓</div><div><h1>{t("educator_evaluation.educator_growth_and_evaluation_1rtfqhx", "Educator Growth & Evaluation")}</h1><p>{t("educator_evaluation.local_workspace_recovery_ut3des", "Local workspace recovery")}</p></div></div>{!standalone && <button type="button" className="ae-close" onClick={requestClose} aria-label={t("educator_evaluation.close_educator_growth_and_evaluation_1d9f8pc", "Close Educator Growth and Evaluation")}>×</button>}</header>
      <main className="ae-main"><div className="ae-page"><section className="ae-card ae-span-12" role="alert"><h2 id="ae-recovery-title">{corrupt ? t("educator_evaluation.your_saved_workspace_needs_recovery_ykrfqg", 'Your saved workspace needs recovery') : t("educator_evaluation.this_browser_is_not_allowing_local_saving_d2k6zc", 'This browser is not allowing local saving')}</h2><p>{corrupt ? t("educator_evaluation.alloflow_stopped_before_replacing_the_unreadable_data_down_rqgdor", 'AlloFlow stopped before replacing the unreadable data. Download the raw copy for recovery, retry after checking browser storage, or explicitly start fresh.') : t("educator_evaluation.no_personnel_records_have_been_written_retry_after_enablin_1yi6xpu", 'No personnel records have been written. Retry after enabling site storage, or continue only as a temporary session and export before closing.')}</p>{localRecovery.error && <p className="ae-sub">{t("educator_evaluation.technical_detail_o968s9", "Technical detail:")} {localRecovery.error}</p>}<div className="ae-actions" style={{ marginTop: 16 }}><button type="button" className="ae-btn ae-btn-primary" onClick={retryLocalRecovery}>{t("educator_evaluation.try_storage_again_1hhjsxj", "Try storage again")}</button>{corrupt && <button type="button" className="ae-btn" onClick={downloadDamagedWorkspace}>{t("educator_evaluation.download_damaged_raw_copy_g5mzhx", "Download damaged raw copy")}</button>}{!corrupt && <button type="button" className="ae-btn" onClick={continueTemporarySession}>{t("educator_evaluation.continue_without_saving_1qelfse", "Continue without saving")}</button>}<button type="button" className="ae-btn ae-btn-danger" onClick={startFreshAfterRecovery}>{localRecoveryResetArmed ? t("educator_evaluation.confirm_permanently_start_fresh_1o1dz7m", 'Confirm: permanently start fresh') : t("educator_evaluation.start_a_new_blank_workspace_1vw2z4x", 'Start a new blank workspace')}</button>{localRecoveryResetArmed && <button type="button" className="ae-btn" onClick={() => setLocalRecoveryResetArmed(false)}>{t("educator_evaluation.cancel_reset_4y3d64", "Cancel reset")}</button>}</div>{localRecoveryResetArmed && <div className="ae-note ae-danger" style={{ marginTop: 12 }}><strong>{t("educator_evaluation.this_removes_the_unreadable_saved_copy_from_browser_storag_5rpjrj", "This removes the unreadable saved copy from browser storage.")}</strong> {t("educator_evaluation.download_it_first_if_recovery_may_be_needed_8neirt", "Download it first if recovery may be needed.")}</div>}</section></div></main>
      <footer className="ae-footer"><span>{t("educator_evaluation.unreadable_data_is_never_overwritten_automatically_1h8swm6", "Unreadable data is never overwritten automatically.")}</span><span>{t("educator_evaluation.local_recovery_gate_14ahzui", "Local recovery gate")}</span></footer>
    </div>;
    return <div className={'ae-shell ' + (standalone ? 'ae-standalone' : 'ae-overlay')} role={standalone ? undefined : 'presentation'}><AeStyles/>{recoveryBody}</div>;
  }

  if (isRemote && (remoteState.status === 'loading' || (remoteState.status === 'error' && !remoteState.currentUser))) {
    const failed = remoteState.status === 'error';
    const gateBody = <div ref={dialogRef} tabIndex={-1} className="ae-workspace" role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : 'true'} aria-labelledby="ae-title" aria-busy={failed ? undefined : 'true'}>
      <header className="ae-top"><div className="ae-brand"><div className="ae-mark" aria-hidden="true">A✓</div><div><h1 id="ae-title">{t("educator_evaluation.educator_growth_and_evaluation_1rtfqhx", "Educator Growth & Evaluation")}</h1><p>{t("educator_evaluation.district_authenticated_portal_11fu2p9", "District-authenticated portal")}</p></div></div>{!standalone && <button type="button" className="ae-close" onClick={requestClose} aria-label={t("educator_evaluation.close_educator_growth_and_evaluation_1d9f8pc", "Close Educator Growth and Evaluation")}>×</button>}</header>
      <main className="ae-main"><div className="ae-page"><section className="ae-card" role={failed ? 'alert' : 'status'} aria-live={failed ? 'assertive' : 'polite'}><h2>{failed ? t("educator_evaluation.the_secure_workspace_could_not_be_opened_11le516", 'The secure workspace could not be opened') : t("educator_evaluation.loading_your_district_evaluation_workspace_10ffvdf", 'Loading your district evaluation workspace')}</h2><p>{failed ? remoteState.error : t("educator_evaluation.verifying_your_managed_google_account_and_assigned_records_puo0o7", 'Verifying your managed Google account and assigned records…')}</p>{failed && <p className="ae-sub">{t("educator_evaluation.if_you_should_have_access_ask_the_district_administrator_w_u6wtg6", "If you should have access, ask the district administrator who set up this portal to add your account. Access is granted by the district, not by this page.")}</p>}{failed && <div className="ae-actions" style={{ marginTop: 14 }}><button type="button" className="ae-btn ae-btn-primary" onClick={loadRemoteWorkspace}>{t("educator_evaluation.try_again_982hh6", "Try again")}</button></div>}</section></div></main>
      <footer className="ae-footer"><span>{t("educator_evaluation.records_remain_hidden_until_identity_and_assignments_are_v_18ueigm", "Records remain hidden until identity and assignments are verified.")}</span><span>{t("educator_evaluation.district_apps_script_repository_17ovdjg", "District Apps Script repository")}</span></footer>
    </div>;
    return <div className={'ae-shell ' + (standalone ? 'ae-standalone' : 'ae-overlay')} role={standalone ? undefined : 'presentation'} onClick={standalone ? undefined : (event) => { if (event.target === event.currentTarget) requestClose(); }}><AeStyles/>{gateBody}</div>;
  }
  const body = <div ref={dialogRef} tabIndex={-1} className="ae-workspace" role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : 'true'} aria-labelledby="ae-title">
    <header className="ae-top">
      <div className="ae-brand"><div className="ae-mark" aria-hidden="true">A✓</div><div><h1 id="ae-title">{t("educator_evaluation.educator_growth_and_evaluation_1rtfqhx", "Educator Growth & Evaluation")}</h1><p>{workspace.config.organization} · {workspace.config.academicYear}</p></div></div>
      <div className="ae-top-actions">{!isRemote && !workspace.educatorPacketMode && <div className="ae-role" aria-label={workspace.config.sampleMode ? t("educator_evaluation.switch_between_evaluator_and_fictional_educator_rehearsal__mc8xtz", 'Switch between evaluator and fictional educator rehearsal roles') : t("educator_evaluation.view_this_workspace_as_evaluator_or_preview_the_educator_e_llqinz", 'View this workspace as evaluator or preview the educator experience')}><button type="button" aria-pressed={role === 'evaluator'} onClick={() => setRole('evaluator')}>{t("educator_evaluation.evaluator_125q2ii", "Evaluator")}</button><button type="button" aria-pressed={role === 'teacher'} onClick={() => setRole('teacher')}>{workspace.config.sampleMode ? t("educator_evaluation.fictional_educator_2qs1sj", 'Fictional educator') : t("educator_evaluation.educator_preview_jftn00", 'Educator preview')}</button></div>}{!isRemote && workspace.config.sampleMode && <button type="button" className="ae-btn" onClick={() => setTourStep(0)}>{t("educator_evaluation.replay_tour_19pruns", "Replay tour")}</button>}<a className="ae-btn" data-help-key="ae_manual_link" /* Extensionless, matching the Setup-tab link and the district Portal. That
   link is real but lives inside a tab; this one is reachable from every tab,
   which is the point of putting it in the header (2026-08-17). */
href="https://alloflow-cdn.pages.dev/educator-evaluation-manual" target="_blank" rel="noopener noreferrer" aria-label={t("educator_evaluation.user_manual_opens_in_a_new_tab_1t3w65", "User manual (opens in a new tab)")} title={t("educator_evaluation.how_to_run_a_full_evaluation_cycle_set_up_the_district_por_162ju8s", "How to run a full evaluation cycle, set up the district portal, and read the released summary")}>{t("educator_evaluation.manual_1wu7r43", "Manual")}</a>{!standalone && <button type="button" className="ae-close" onClick={requestClose} aria-label={t("educator_evaluation.close_educator_growth_and_evaluation_1d9f8pc", "Close Educator Growth and Evaluation")}>×</button>}</div>
    </header>
    {isRemote ? <div className={'ae-local-banner ae-remote-banner ' + (['error', 'conflict'].includes(remoteState.status) ? 'ae-sync-error' : '')} role={['error', 'conflict'].includes(remoteState.status) ? 'alert' : 'status'} aria-live="polite">
      <strong>{t("educator_evaluation.district_google_account_13vzcv9", "District Google account")}</strong>{' '}
      <span>{remoteState.currentUser && remoteState.currentUser.email} · {role === 'teacher' ? t("educator_evaluation.educator_access_auy9u6", 'Educator access') : (remoteState.currentUser && remoteState.currentUser.role === 'admin' ? t("educator_evaluation.administrator_access_1jngftk", 'Administrator access') : t("educator_evaluation.evaluator_access_x6tmko", 'Evaluator access'))} · {remoteState.status === 'saving' ? t("educator_evaluation.saving_to_district_repository_11nzwq8", 'Saving to district repository…') : (remoteState.status === 'conflict' ? t("educator_evaluation.concurrent_edit_needs_review_xkyx0v", 'Concurrent edit needs review') : (remoteState.status === 'error' ? t("educator_evaluation.last_change_is_not_confirmed_1olht3d", 'Last change is not confirmed: ') + remoteState.error : (remoteState.status === 'reconciliation' ? t("educator_evaluation.primary_saved_secondary_reconciliation_pending_20260824", 'Primary record saved; secondary reconciliation pending') : t("educator_evaluation.saved_to_district_repository_1fq88y3", 'Saved to district repository'))))}</span>
      {['saved', 'reconciliation'].includes(remoteState.status) && <button type="button" className="ae-btn" onClick={loadRemoteWorkspace}>{t("educator_evaluation.refresh_28r6qc", "Refresh")}</button>}
      {remoteState.status === 'error' && <button type="button" className="ae-btn" onClick={loadRemoteWorkspace}>{t("educator_evaluation.reload_district_copy_1ttxu4v", "Reload district copy")}</button>}
      {typeof repository.reviewNotification === 'function' && typeof repository.sendNotification === 'function' && typeof repository.getNotificationOutcome === 'function' && <button type="button" className="ae-btn" disabled={!selectedTeacher || notificationBusy || notificationActionsDisabled || !!notificationReceipt} onClick={() => beginNotificationReview('')}>{notificationReceipt ? (notificationReceipt.status === 'completed' ? t('educator_evaluation.notice_completed_do_not_resend_20260827', 'Notice sent · do not resend') : t('educator_evaluation.notice_outcome_locked_20260827', 'Notice outcome locked · review receipt')) : (notificationBusy ? t('educator_evaluation.preparing_notice_review_20260827', 'Preparing notice review…') : (role === 'teacher' ? t("educator_evaluation.email_evaluator_a_portal_notice_1jtlxcv", 'Email evaluator a portal notice') : t("educator_evaluation.email_educator_a_portal_notice_1ybg2qd", 'Email educator a portal notice')))}</button>}
      {role !== 'teacher' && typeof repository.reviewReleasedEvaluation === 'function' && typeof repository.shareReleasedEvaluation === 'function' && <button type="button" className="ae-btn" title={selectedTeacher && !selectedTeacher.finalizedAt ? t("educator_evaluation.available_after_the_educator_cycle_is_finalized_1ekn2no", 'Available after the educator cycle is finalized.') : t("educator_evaluation.opens_a_required_recipient_and_disclosure_review_before_an_hr9ktn", 'Opens a required recipient and disclosure review before any Drive access changes.')} disabled={!selectedTeacher || !selectedTeacher.finalizedAt || ['reviewing', 'sending', 'recovery'].includes(releaseShareState.status) || releaseActionsDisabled} onClick={beginReleasedEvaluationReview}>{releaseShareState.status === 'reviewing' ? t("educator_evaluation.preparing_disclosure_review_wyzexi", 'Preparing disclosure review…') : (selectedTeacher && selectedTeacher.releasedDoc ? t("educator_evaluation.review_released_summary_access_vjbyn9", 'Review released-summary access') : t("educator_evaluation.review_and_share_released_summary_7v8a6n", 'Review & share released summary'))}</button>}
      {releaseShareState.status === 'recovery' && <span className="ae-chip ae-chip-amber" title={t("educator_evaluation.drive_access_changed_but_the_district_repository_has_not_c_7bvux9", "Drive access changed, but the district repository has not confirmed its pointer and audit commit. Do not retry the release.")}>{t("educator_evaluation.release_recovery_required_ss5zne", "Release recovery required")}</span>}
      {selectedTeacher && selectedTeacher.releasedDoc && /^https:\/\/docs\.google\.com\//.test(selectedTeacher.releasedDoc.url || '') && <a className="ae-btn" href={selectedTeacher.releasedDoc.url} target="_blank" rel="noopener noreferrer" title={role === 'teacher' ? undefined : t("educator_evaluation.if_drive_denies_access_use_review_released_summary_access__136y052", 'If Drive denies access, use Review released-summary access to restore authorized viewer access without creating a duplicate.')} onClick={() => { if (role === 'teacher' && typeof repository.recordReleasedSummaryOpened === 'function' && !selectedTeacher.releasedDoc.openedAt) { repository.recordReleasedSummaryOpened({ teacherId: selectedTeacher.id }).then(() => loadRemoteWorkspace()).catch((error) => notify(t("educator_evaluation.the_summary_opened_but_the_portal_could_not_record_the_lin_k35egu", 'The summary opened, but the portal could not record the link-open receipt: ') + String((error && error.message) || error), 'error')); } }}>{role === 'teacher' ? t("educator_evaluation.open_your_released_evaluation_summary_1yimcof", 'Open your released evaluation summary') : t("educator_evaluation.open_current_summary_drive_1m35ntz", 'Open current summary (Drive)')}</a>}
      {role !== 'teacher' && selectedTeacher && selectedTeacher.releasedDoc && selectedTeacher.releasedDoc.openedAt && <span className="ae-chip ae-chip-good" title={t("educator_evaluation.records_that_the_educator_clicked_the_portal_link_it_canno_1t6ii2b", "Records that the educator clicked the portal link. It cannot claim the document was read.")}>{t("educator_evaluation.summary_link_opened_6cxhka", "Summary link opened")} {aeDateTime(selectedTeacher.releasedDoc.openedAt)}</span>}
    </div> : <div className={'ae-local-banner ' + (workspace.config.sampleMode ? 'ae-sample' : '') + (localSaveState.status === 'error' ? ' ae-sync-error' : '')} role={localSaveState.status === 'error' ? 'alert' : 'status'} aria-live="polite">
      <strong>{workspace.educatorPacketMode ? t("educator_evaluation.educator_response_packet_odq1at", 'Educator response packet') : (workspace.config.sampleMode ? t("educator_evaluation.simulated_data_v1gch7", 'Simulated data') : t("educator_evaluation.private_on_device_workspace_y0l9xr", 'Private on-device workspace'))}</strong>{' '}
      <span>{workspace.educatorPacketMode ? t("educator_evaluation.educator_only_mode_review_the_released_records_and_add_onl_g02r36", 'Educator-only mode: review the released records and add only your own response.') : t("educator_evaluation.records_are_stored_on_this_device_information_leaves_it_on_11sawpc", 'Records are stored on this device. Information leaves it only when you deliberately export or share, or enable optional AI reflection.')}</span>
      <span className={'ae-save-state ' + (localSaveState.status === 'error' ? 'ae-save-error' : '')}>{localSaveState.status === 'saving' ? t("educator_evaluation.saving_w7dncv", 'Saving…') : (localSaveState.status === 'saved' ? t("educator_evaluation.saved_on_this_device_2qjtzv", 'Saved on this device ') + aeDateTime(localSaveState.savedAt) : (localSaveState.status === 'error' ? t("educator_evaluation.changes_are_not_saved_19h3hqe", 'Changes are not saved') : t("educator_evaluation.not_saved_yet_11ac54b", 'Not saved yet')))}</span>
      {localSaveState.status === 'error' && <><button type="button" className="ae-btn" onClick={retryLocalSave}>{t("educator_evaluation.retry_save_xrvkye", "Retry save")}</button><button type="button" className="ae-btn" onClick={() => { const recovery = Object.assign({}, workspaceRef.current, { kind: AE_EXPORT_KIND, exportedAt: aeNow(), recoveryReason: 'Emergency backup after local save failure' }); aeDownload('alloflow-emergency-backup-' + aeToday() + '.json', 'application/json', JSON.stringify(recovery, null, 2)); notify(t("educator_evaluation.emergency_workspace_backup_downloaded_wladsy", 'Emergency workspace backup downloaded.'), 'success'); }}>{t("educator_evaluation.download_emergency_backup_y2j38i", "Download emergency backup")}</button></>}
    </div>}
    {isRemote && notificationReceipt && <section ref={notificationReceiptRef} tabIndex={-1} className={'ae-operation-notice ' + (notificationReceipt.status === 'completed' ? 'ae-operation-success' : 'ae-operation-error')} role={notificationReceipt.status === 'completed' ? 'status' : 'alert'} aria-live="polite" aria-busy={notificationState.status === 'checking_outcome' ? 'true' : undefined}>
      <strong>{t('educator_evaluation.exact_notice_receipt_20260827', 'Exact notice receipt')}</strong>
      <span>{notificationReceipt.message}</span>
      <span className="ae-chip ae-chip-neutral">{t('educator_evaluation.outcome_20260827', 'Outcome')} · {notificationReceipt.status.replace(/_/g, ' ')}</span>
      {notificationReceipt.idempotent && <span className="ae-chip ae-chip-good">{t('educator_evaluation.idempotent_no_duplicate_notice_20260827', 'Idempotent · no duplicate notice')}</span>}
      {notificationReceipt.checkError && <span role="alert">{notificationReceipt.checkError}</span>}
      {notificationReceipt.status !== 'completed' && <button type="button" className="ae-btn" disabled={notificationActionsDisabled || notificationState.status === 'checking_outcome'} onClick={checkNotificationOutcome}>{notificationState.status === 'checking_outcome' ? t('educator_evaluation.checking_exact_notice_outcome_20260827', 'Checking exact notice outcome…') : t('educator_evaluation.check_exact_notice_outcome_20260827', 'Check exact notice outcome')}</button>}
      {notificationReceipt.status === 'completed' && notificationReceipt.repeatEligible && <button type="button" className="ae-btn" disabled={notificationActionsDisabled || notificationBusy} onClick={() => beginNotificationReview('', true)}>{t('educator_evaluation.prepare_another_reviewed_notice_20260828', 'Prepare another reviewed notice')}</button>}
    </section>}
    {localFictionalRehearsal && <div className="ae-local-banner ae-preview-banner" role="status"><strong>{t("educator_evaluation.interactive_fictional_educator_rehearsal_1iva19g", "Interactive fictional educator rehearsal")}</strong><span>{t("educator_evaluation.changes_are_enabled_only_for_this_simulated_workspace_foll_1m97z5", "Changes are enabled only for this simulated workspace. Follow the rehearsal coach, then switch back to Evaluator for evaluator-owned steps.")}</span></div>}
    {localTeacherPreview && <div className="ae-local-banner ae-preview-banner" role="status"><strong>{t("educator_evaluation.read_only_educator_preview_1opb5fz", "Read-only educator preview")}</strong><span>{t("educator_evaluation.use_this_perspective_to_inspect_what_an_educator_can_see_c_1qneij3", "Use this perspective to inspect what an educator can see. Changes are blocked because local role switching is not authentication.")}</span></div>}
    {isRemote && remoteConflict && <AeRemoteConflictReview conflict={remoteConflict} onUseDistrict={useDistrictConflictVersion} onReplay={replayRemoteConflict}/>}
    {operationNotice.text && <div className={'ae-operation-notice ' + (operationNotice.type === 'error' ? 'ae-operation-error' : (operationNotice.type === 'success' ? 'ae-operation-success' : ''))} role={operationNotice.type === 'error' ? 'alert' : 'status'} aria-live="polite"><span>{operationNotice.text}</span><button type="button" className="ae-btn ae-btn-quiet" onClick={() => setOperationNotice({ text: '', type: 'info', id: operationNotice.id })}>{t("educator_evaluation.dismiss_an1pf7", "Dismiss")}</button></div>}
    {Number.isInteger(tourStep) && <AeGuidedTour
      step={tourStep}
      onMove={setTourStep}
      onFinish={() => { setTourStep(null); notify(t("educator_evaluation.guided_sample_tour_closed_you_can_replay_it_from_the_heade_xugof4", 'Guided sample tour closed. You can replay it from the header.'), 'success'); }}
    />}
    <nav className="ae-tabs" role="tablist" aria-label={t("educator_evaluation.evaluation_workspace_sections_bfw4o2", "Evaluation workspace sections")}>{tabs.map(([id, label], index) => <button type="button" role="tab" key={id} id={'ae-tab-' + id} aria-selected={tab === id} aria-controls="ae-panel" tabIndex={tab === id ? 0 : -1} className="ae-tab" onClick={() => setTab(id)} onKeyDown={(event) => tabKey(event, index)}>{label}</button>)}</nav>
    <main className="ae-main" onClickCapture={blockRemoteMutation} onChangeCapture={blockRemoteMutation} onInputCapture={blockRemoteMutation} onSubmitCapture={blockRemoteMutation}>
      <div id="ae-panel" role="tabpanel" tabIndex={-1} aria-labelledby={'ae-tab-' + tab} aria-busy={remoteState.inFlight ? 'true' : undefined} aria-disabled={remotePanelUnavailable ? 'true' : undefined} inert={remotePanelUnavailable ? '' : undefined}>
      {tab === 'overview' && <AeOverview workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} setRole={setRole} aiReflectionEnabled={aiReflectionEnabled} askForReflection={askForReflection} reflection={visibleReflection} updateTeacher={updateTeacher} setTab={setTab} readOnlyPreview={localTeacherPreview} isRemote={isRemote} requestActionReview={requestActionReview}/>}
      {tab === 'trends' && <AeTrends workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} isRemote={isRemote} repository={repository}/>}
      {tab === 'staff' && <AeStaff workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} updateTeacher={updateTeacher} addTeacher={addTeacher} addTeachersBulk={addTeachersBulk} isRemote={isRemote} canAddStaff={!isRemote || !!(remoteState.currentUser && remoteState.currentUser.role === 'admin')}/>}
      {tab === 'walkthroughs' && <AeWalkthroughs workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} createWalkthrough={createWalkthrough} updateWalkthroughDraft={updateWalkthroughDraft} discardWalkthroughDraft={discardWalkthroughDraft} publishWalkthrough={publishWalkthrough} addComment={addComment} acknowledgeWalkthrough={acknowledgeWalkthrough} addTeacher={addTeacher} canAddStaff={!isRemote || !!(remoteState.currentUser && remoteState.currentUser.role === 'admin')} isRemote={isRemote} readOnlyPreview={localTeacherPreview} requestActionReview={requestActionReview}/>}
      {tab === 'formal' && <AeFormalObservations workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} setRole={setRole} setTab={setTab} createObservation={createObservation} updateObservation={updateObservation} updateTeacher={updateTeacher} addComment={addComment} readOnlyPreview={localTeacherPreview} fictionalRehearsal={!isRemote && !!workspace.config.sampleMode} requestActionReview={requestActionReview}/>}
      {tab === 'spm' && <AeSpm workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} createSpm={createSpm} updateSpm={updateSpm} updateTeacher={updateTeacher} addComment={addComment} readOnlyPreview={localTeacherPreview} requestActionReview={requestActionReview}/>}
      {tab === 'audit' && <AeAuditExport workspace={workspace} selectedTeacher={selectedTeacher} exportWorkspace={exportWorkspace} exportCsv={exportCsv} exportDueDateCalendar={exportDueDateCalendar} exportSummary={exportSummary} exportEducatorPacket={exportEducatorPacket} exportResponsePacket={exportResponsePacket} packetIncludeNames={packetIncludeNames} setPacketIncludeNames={setPacketIncludeNames} exportGrowthSnapshot={exportGrowthSnapshot} importWorkspace={importWorkspace} pendingImport={pendingImport} confirmPendingImport={confirmPendingImport} cancelPendingImport={cancelPendingImport} importUndo={importUndo} undoImport={undoImport} archiveAndResetSample={archiveAndResetSample} role={role} isRemote={isRemote}/>}
      {tab === 'about' && <AeAbout workspace={workspace} updateConfig={updateConfig} role={role} isRemote={isRemote} exportRubric={exportRubric} importRubric={importRubric} clearRubric={clearRubric} currentUser={remoteState.currentUser} repository={repository} standalone={standalone} portalUrl={(remoteState.deployment && remoteState.deployment.portalUrl) || ''} onApplySimulation={applySimulationWorkspace} onReload={loadRemoteWorkspace}/>}
      </div>
    </main>
    <footer className="ae-footer"><span>{t("educator_evaluation.no_ai_scoring_evidence_and_judgments_stay_separate_publish_m8tdt1", "No AI scoring · evidence and judgments stay separate · published records are append-only in the workflow model")}</span><span>{AE_ACTIVE_FW.id === 'pa_act13' ? <><a href="https://www.pa.gov/agencies/education/programs-and-services/educators/educator-effectiveness" target="_blank" rel="noreferrer">PDE Educator Effectiveness</a> · <a href="https://www.pdesas.org/Page/Viewer/ViewPage/75" target="_blank" rel="noreferrer">Act 13 Toolkit</a></> : <><a href="https://www.maine.gov/doe/educators/educatoreval/educator" target="_blank" rel="noreferrer">Maine DOE Educator Effectiveness</a> · <a href="https://www.law.cornell.edu/regulations/maine/department-05/division-071/chapter-180" target="_blank" rel="noreferrer">PEPG Rule Ch. 180</a></>}</span></footer><div className="ae-live" aria-live="polite" aria-atomic="true"><span key={liveMessage.id}>{liveMessage.text}</span></div>
  </div>;
  const notificationReviewOpen = isRemote && ['selecting_recipient', 'reviewing_recipient', 'ready', 'sending'].includes(notificationState.status);
  const releaseReviewOpen = isRemote && !!releaseShareState.review;
  const actionReviewOpen = !!actionReview;
  const modalOpen = (!isRemote && showLocalOnboarding) || notificationReviewOpen || releaseReviewOpen || actionReviewOpen;
  return <div className={'ae-shell ' + (standalone ? 'ae-standalone' : 'ae-overlay')} role={standalone ? undefined : 'presentation'} onClick={standalone ? undefined : (event) => { if (event.target === event.currentTarget && !modalOpen) requestClose(); }}><AeStyles/><div aria-hidden={modalOpen ? 'true' : undefined} inert={modalOpen ? '' : undefined}><AeActionReviewContext.Provider value={requestActionReview}>{body}</AeActionReviewContext.Provider></div>{!isRemote && showLocalOnboarding && <AeLocalOnboarding onChoose={chooseLocalStart}/>} {notificationReviewOpen && <AeNotificationReview state={notificationState} onRecipientChange={(recipient) => setNotificationState((current) => Object.assign({}, current, { recipient }))} onContinue={() => beginNotificationReview(notificationState.recipient, notificationState.repeatPrior === true)} onCancel={cancelNotificationReview} onConfirm={confirmNotification} actionsDisabled={notificationActionsDisabled}/>} {releaseReviewOpen && <AeReleaseReview state={Object.assign({}, releaseShareState, { actionsDisabled: releaseActionsDisabled })} onCancel={cancelReleasedEvaluationReview} onConfirm={shareReleasedEvaluation}/>} {actionReviewOpen && <AeActionReview review={actionReview} onCancel={cancelActionReview} onConfirm={confirmActionReview}/>}</div>;
}
