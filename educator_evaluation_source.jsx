/**
 * AlloFlow Educator Growth & Evaluation — in service, not a prototype.
 *
 * One React surface is used by the Leadership Hub modal, the standalone
 * principal-facing shell, and the authenticated district portal, with
 * framework profiles for Pennsylvania Act 13, Portland (Maine), and Maine PEPG.
 *
 * Two deployments, one workflow. WITH an injected repository it is the
 * district's shared, authenticated record store. WITHOUT one it stores in the
 * signed-in browser profile on that device only — real working records, not a
 * sample. Storage is scoped to the profile and never uploaded; AlloFlow adds
 * no encryption of its own, so it inherits whatever the device provides
 * (managed ChromeOS/Windows fleets encrypt the user profile at rest).
 *
 * Two claims stay true in every deployment and must NOT be edited away for
 * confidence: AlloFlow adds no encryption of its own, and no deployment makes
 * this a state-approved instrument (PDE approves instruments, not software).
 * Equally, do not re-add prototype framing — this tool is in service.
 * Both directions pinned by tests/educator_evaluation_in_service.test.js.
 *
 * Note on the legal frame (2026-08-17): these are PERSONNEL records, so FERPA
 * — which governs student education records — is largely the wrong lens. What
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
const AE_PACKET_TEACHER_FIELDS = ['educatorStatement'];
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
      frameworkProfile: config.frameworkProfile || 'pa_act13',
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
// Rule Ch. 180, steering committee with a teacher majority) — so its labels
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
    // Guidebook v1.0 (Portland Framework for Teaching): four levels —
    // Excellent / Proficient / Novice-Needs Improvement / Unsatisfactory.
    // The band thresholds below serve auxiliary numeric displays only; the
    // guidebook's OFFICIAL practice roll-up is the categorical decision
    // matrix implemented in aePortlandPracticeRating, not any average.
    bands: [
      { min: 2.5, label: 'Excellent' },
      { min: 1.5, label: 'Proficient' },
      { min: 0.5, label: 'Novice/Needs Improvement' },
      { min: 0, label: 'Unsatisfactory' },
    ],
    ratingLabels: { 0: 'Unsatisfactory', 1: 'Novice/Needs Improvement', 2: 'Proficient', 3: 'Excellent' },
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
    // Dropdown labels match the band vocabulary — otherwise a Maine evaluator
    // rates with PA words and reads results in State-Model words.
    ratingLabels: { 0: 'Ineffective', 1: 'Developing', 2: 'Effective', 3: 'Distinguished' },
    domainWeighted: false, // no statutory within-practice weights; equal average, labeled as such
  },
};
// Active-framework pointer: refreshed from workspace config at the top of the
// panel render (and at normalize time), so the many small scoring/label
// helpers keep their existing signatures. Single-workspace panel — the pointer
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
  if (count(0) > 0) return { label: 'Unsatisfactory', rule: 'any domain rated Unsatisfactory' };
  if (count(3) >= 2 && levels.every((level) => level >= 2)) return { label: 'Excellent', rule: 'two or more domains Excellent, none below Proficient' };
  if (count(1) >= 3) return { label: 'Novice/Needs Improvement', rule: 'three or more domains at Novice/Needs Improvement' };
  return { label: 'Proficient', rule: 'no more than two domains below Proficient, none Unsatisfactory' };
}

let AE_ACTIVE_FW = { ...AE_FRAMEWORKS.pa_act13, practiceWeight: null };
function aeSetActiveFramework(config) {
  const profile = AE_FRAMEWORKS[config && config.frameworkProfile] || AE_FRAMEWORKS.pa_act13;
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
  if (!domainsRaw || !domainsRaw.length) return null;
  const seen = {};
  const domains = [];
  for (let i = 0; i < domainsRaw.length; i++) {
    const entry = domainsRaw[i] || {};
    const id = String(entry.id == null ? '' : entry.id).trim();
    const label = String(entry.label == null ? '' : entry.label).trim();
    if (!id || !label || seen[id]) return null;
    seen[id] = true;
    const weightNumber = Number(entry.weight);
    const components = Array.isArray(entry.components)
      ? entry.components.filter((pair) => Array.isArray(pair) && pair.length >= 2)
        .map((pair) => [String(pair[0]), String(pair[1])])
      : [];
    domains.push({
      id,
      code: String(entry.code == null ? String(i + 1) : entry.code),
      label,
      weight: Number.isFinite(weightNumber) && weightNumber >= 0 ? weightNumber : 0,
      color: /^#[0-9a-fA-F]{3,8}$/.test(String(entry.color || '')) ? String(entry.color) : '#2563eb',
      components,
    });
  }
  const bands = Array.isArray(raw.bands)
    ? raw.bands.filter((band) => band && Number.isFinite(Number(band.min)) && String(band.label || '').trim())
      .map((band) => ({ min: Number(band.min), label: String(band.label).trim() }))
      .sort((a, b) => b.min - a.min)
    : [];
  const name = String(raw.name == null ? '' : raw.name).trim() || 'Custom rubric';
  return {
    name,
    versionTag: String(raw.versionTag == null ? '' : raw.versionTag).trim()
      || ('custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')),
    practiceLabel: String(raw.practiceLabel == null ? '' : raw.practiceLabel).trim() || 'Professional Practice',
    practiceShort: String(raw.practiceShort == null ? '' : raw.practiceShort).trim() || 'PP',
    domainWeighted: !!raw.domainWeighted,
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
    .concat((source.observations || []).filter(function (i) { return i && i.teacherId === teacherId && i.publishedAt; }));
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
    .concat((source.observations || []).filter(function (item) { return item && item.teacherId === teacherId && item.publishedAt; }));
  const perDomain = {};
  domains.forEach(function (domain) { perDomain[domain.id] = 0; });
  published.forEach(function (record) {
    (record.componentTags || []).forEach(function (code) {
      const domainId = componentDomain[String(code).toLowerCase()];
      if (domainId && perDomain[domainId] != null) perDomain[domainId] += 1;
    });
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
        message: domain.label + ' carries a rating but no evidence is tagged to it.',
      });
      return;
    }
    if (Number.isFinite(numeric) && numeric < adverseBelow && count < thinBelow) {
      findings.push({
        severity: 'high', domainId: domain.id, code: 'adverse-on-thin-evidence',
        message: domain.label + ' is rated below proficient on ' + count + ' tagged piece'
          + (count === 1 ? '' : 's') + ' of evidence.',
      });
    }
  });

  const untouched = domains.filter(function (domain) { return (perDomain[domain.id] || 0) === 0; });
  if (untouched.length && published.length) {
    findings.push({
      severity: 'medium', code: 'range-gap',
      message: 'No evidence is tagged to ' + untouched.map(function (d) { return d.label; }).join(', ') + '.',
    });
  }
  if (expectedPieces > 0 && published.length < expectedPieces) {
    findings.push({
      severity: 'medium', code: 'below-expected-volume',
      message: published.length + ' published piece' + (published.length === 1 ? '' : 's')
        + ' of evidence so far; this plan looks for ' + expectedPieces + ' across the cycle.',
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
  { value: 0, label: 'Failing' },
  { value: 1, label: 'Needs Improvement' },
  { value: 2, label: 'Proficient' },
  { value: 3, label: 'Distinguished' },
];

function aeRatingLabel(value) {
  const rating = AE_RATINGS.find((item) => item.value === value);
  return rating ? rating.label : 'Unrecognized rating value';
}

const AE_STATUS_META = {
  finalized: { label: 'Finalized', tone: 'good' },
  awaiting_teacher: { label: 'Awaiting teacher', tone: 'purple' },
  awaiting_evaluator: { label: 'Awaiting evaluator', tone: 'blue' },
  in_progress: { label: 'In progress', tone: 'amber' },
  overdue: { label: 'Overdue', tone: 'bad' },
  not_started: { label: 'Not started', tone: 'neutral' },
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
  return start + '–' + String(start + 1).slice(-2);
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
    return { status: 'unavailable', workspace: null, raw: '', error: error && error.message ? error.message : 'Browser storage is unavailable.' };
  }
  if (!raw) return { status: 'empty', workspace: null, raw: '', error: '' };
  try {
    const parsed = JSON.parse(raw);
    const workspace = aeNormalizeWorkspace(parsed);
    if (!workspace) return { status: 'corrupt', workspace: null, raw, error: 'The saved workspace has an invalid structure.' };
    return { status: 'ok', workspace, raw: '', error: '' };
  } catch (error) {
    return { status: 'corrupt', workspace: null, raw, error: error && error.message ? error.message : 'The saved workspace is not valid JSON.' };
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
        ? 'This browser has no storage space left for the evaluation workspace.'
        : 'This browser did not allow the evaluation workspace to be saved.',
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

function aePlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
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
  const config = {
    organization: aeString(rawConfig.organization, 160, 'Sample School'),
    building: aeString(rawConfig.building, 160, 'Main Building'),
    academicYear: aeString(rawConfig.academicYear, 20, aeSchoolYear()),
    evaluatorName: aeString(rawConfig.evaluatorName, 160, 'Principal'),
    evaluatorInitials: aeString(rawConfig.evaluatorInitials, 12, 'AP'),
    frameworkVersion: AE_FRAMEWORK,
    frameworkProfile: AE_FRAMEWORKS[rawConfig.frameworkProfile] ? rawConfig.frameworkProfile : 'pa_act13',
    pepgPracticeWeight: (() => { const raw = rawConfig.pepgPracticeWeight; if (raw == null || String(raw) === '') return null; const n = Number(raw); return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : null; })(),
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
      frameworkVersion: aeString(raw.frameworkVersion, 80, AE_FRAMEWORK),
      weightSnapshot: aeSafeWeightSnapshot(raw.weightSnapshot),
      finalScore: aeRatingValue(raw.finalScore),
      ratings: {
        domains: aeDomainRatings(ratings.domains),
        building: aeRatingValue(ratings.building),
        teacher: aeRatingValue(ratings.teacher),
        lea: aeRatingValue(ratings.lea),
      },
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
      frameworkVersion: aeString(raw.frameworkVersion, 80, AE_FRAMEWORK),
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
    frameworkVersion: aeString(raw.frameworkVersion, 80, AE_FRAMEWORK),
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
    config: { organization: 'Sample School District', building: 'Main Building', academicYear: '2026–27', evaluatorName: 'A. Principal', evaluatorInitials: 'AP', frameworkVersion: AE_FRAMEWORK, frameworkProfile: 'pa_act13', pepgPracticeWeight: null, sampleMode: true, setupPath: 'local' },
    teachers, walkthroughs, observations, spms, comments,
    cycleSnapshots: [
      { id: 'sample-cycle-1a', teacherId: teachers[0].id, staffCodeSnapshot: teachers[0].code, academicYear: '2024–25', buildingSnapshot: teachers[0].building, employeeTypeSnapshot: 'professional', finalizedAt: '2025-06-12T20:30:00.000Z', finalScore: 2.08, domainRatings: { d1: 2, d2: 2, d3: 2, d4: 2 }, frameworkVersion: AE_FRAMEWORK },
      { id: 'sample-cycle-1b', teacherId: teachers[0].id, staffCodeSnapshot: teachers[0].code, academicYear: '2025–26', buildingSnapshot: teachers[0].building, employeeTypeSnapshot: 'professional', finalizedAt: '2026-06-11T20:30:00.000Z', finalScore: 2.22, domainRatings: { d1: 2, d2: 2, d3: 2.5, d4: 2 }, frameworkVersion: AE_FRAMEWORK },
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
    frameworkProfile: source.config.frameworkProfile || 'pa_act13',
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
  params.frameworkProfile = AE_FRAMEWORKS[params.frameworkProfile] ? params.frameworkProfile : 'pa_act13';
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
    config: { organization: 'My School District', building: 'My School', academicYear: aeSchoolYear(), evaluatorName: 'Principal', evaluatorInitials: '', frameworkVersion: AE_FRAMEWORK, frameworkProfile: 'pa_act13', pepgPracticeWeight: null, sampleMode: false },
    teachers: [], walkthroughs: [], observations: [], spms: [], comments: [], audit: [], cycleSnapshots: [],
  });
}

function aeWeightProfile(teacher) {
  const snapshot = teacher && aeSafeWeightSnapshot(teacher.weightSnapshot);
  if (snapshot) return snapshot;
  if (AE_ACTIVE_FW.id === 'portland_me') {
    // Guidebook v1.0 publishes the categorical practice roll-up but left the
    // student-growth combination formula to later plan versions — so this
    // profile shows practice only and defers the combined score to the
    // district's current plan documents.
    return [
      { id: 'observation', label: 'Educator Practice (Portland Framework for Teaching)', short: 'EP', weight: 100, color: '#1d4ed8' },
    ];
  }
  if (AE_ACTIVE_FW.id === 'maine_pepg') {
    // Maine PEPG: two locally weighted categories — professional practice and
    // student learning & growth. The split comes from the district's plan via
    // configuration; until entered, practice shows 100% and the UI prompts for
    // the plan's split rather than inventing one. The SLG measure reuses the
    // generic `lea` rating slot.
    const practice = AE_ACTIVE_FW.practiceWeight;
    if (practice === null) return [
      // A practice-only configuration is legitimate: since Maine's 2019
      // amendments, student learning & growth measures are a district CHOICE,
      // not a mandate. The About field sets a split only if the plan has one.
      { id: 'observation', label: 'Professional Practice (100% — set an SLG split in About if your plan includes one)', short: 'PP', weight: 100, color: '#1d4ed8' },
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
// Historical records must score under the framework they were created in —
// a workspace profile switch may never move finalized history (domains
// 3,2,2,3 = 2.40 weighted vs 2.50 equal-average crosses a band boundary).
// PA-era tags (and all legacy/unknown stamps, which predate profiles) use the
// statutory 20/30/30/20 weighting; me-* tags use the equal average.
function aeObservationScoreFor(ratings, frameworkVersion) {
  const domains = (ratings && ratings.domains) || {};
  if (AE_DOMAINS.some((domain) => aeNumberOrNull(domains[domain.id]) === null)) return null;
  const tag = String(frameworkVersion || '');
  const weighted = !tag.startsWith('me-');
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
  return band ? band.label : AE_ACTIVE_FW.bands[AE_ACTIVE_FW.bands.length - 1].label;
}

function aeTeacherStatus(teacher) {
  if (!teacher) return 'not_started';
  if (teacher.finalizedAt || teacher.cycleStatus === 'finalized') return 'finalized';
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
    id: aeId('audit'), event: 'UPDATED', summary: 'Record updated', actor, role,
    at: aeNow(), entityType: 'workspace', entityId: '', teacherId: '', version: 1,
  }, data || {}));
  workspace.audit = workspace.audit.slice(0, 5000);
}

const AE_STYLES = `
.ae-shell{--ae-navy:#10233f;--ae-blue:#1d4ed8;--ae-ink:#172033;--ae-muted:#5b667a;--ae-line:#d8deea;--ae-bg:#f4f7fb;--ae-white:#fff;color:var(--ae-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:15px;line-height:1.45}
.ae-shell *{box-sizing:border-box}.ae-overlay{position:fixed;inset:0;z-index:270;background:rgba(7,18,38,.62);display:flex;align-items:center;justify-content:center;padding:12px}.ae-workspace{width:min(1480px,100%);height:min(94vh,980px);background:var(--ae-bg);border-radius:22px;box-shadow:0 30px 80px rgba(7,18,38,.35);overflow:hidden;display:flex;flex-direction:column}.ae-standalone{min-height:100vh;min-height:100dvh;background:var(--ae-bg)}.ae-standalone .ae-workspace{width:100%;height:100vh;height:100dvh;min-height:100vh;min-height:100dvh;border-radius:0;box-shadow:none}
.ae-top{background:linear-gradient(120deg,#10233f,#173e70);color:#fff;padding:14px 20px;display:flex;gap:16px;align-items:center;justify-content:space-between}.ae-brand{display:flex;gap:12px;align-items:center;min-width:0}.ae-mark{width:42px;height:42px;border-radius:13px;background:#fff;color:#173e70;display:grid;place-items:center;font-size:22px;font-weight:900;flex:0 0 auto}.ae-brand h1{font-size:19px;line-height:1.2;margin:0}.ae-brand p{margin:2px 0 0;color:#d9e8ff;font-size:12px}.ae-top-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.ae-role{display:flex;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);padding:3px;border-radius:11px}.ae-role button{border:0;background:transparent;color:#e7f0ff;padding:7px 12px;min-height:44px;border-radius:8px;font-weight:700}.ae-role button[aria-pressed=true]{background:#fff;color:#173e70}.ae-close{border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:10px;min-width:44px;min-height:44px;font-size:20px}.ae-top button:focus-visible,.ae-shell button:focus-visible,.ae-shell input:focus-visible,.ae-shell select:focus-visible,.ae-shell textarea:focus-visible,.ae-shell a:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}
.ae-local-banner{background:#fff7d6;border-bottom:1px solid #e3ca69;padding:8px 20px;font-size:12px;color:#60480a;display:flex;gap:8px;align-items:flex-start}.ae-local-banner strong{white-space:nowrap}.ae-sample{background:#ecfeff;border-bottom-color:#67e8f9;color:#164e63}.ae-remote-banner{background:#ecfdf5;border-bottom-color:#86efac;color:#14532d;align-items:center}.ae-remote-banner.ae-sync-error{background:#fff1f2;border-bottom-color:#fda4af;color:#881337}.ae-remote-banner .ae-btn{min-height:32px;padding:4px 9px;margin-left:auto;font-size:11px}.ae-tabs{background:#fff;border-bottom:1px solid var(--ae-line);display:flex;gap:2px;padding:0 14px;overflow-x:auto}.ae-tab{border:0;background:transparent;color:#4b5870;padding:12px 13px;min-height:48px;white-space:nowrap;font-weight:750;border-bottom:3px solid transparent}.ae-tab[aria-selected=true]{color:#173e70;border-bottom-color:#2563eb;background:#f8fbff}.ae-main{padding:20px;overflow:auto;flex:1}.ae-page{max-width:1320px;margin:0 auto}.ae-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.ae-heading h2{font-size:22px;margin:0 0 4px}.ae-heading p{margin:0;color:var(--ae-muted);font-size:13px}.ae-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ae-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}.ae-span-4{grid-column:span 4}.ae-span-5{grid-column:span 5}.ae-span-6{grid-column:span 6}.ae-span-7{grid-column:span 7}.ae-span-8{grid-column:span 8}.ae-span-12{grid-column:span 12}.ae-card{background:#fff;border:1px solid var(--ae-line);border-radius:16px;padding:16px;box-shadow:0 3px 12px rgba(19,41,75,.05)}.ae-card h3{font-size:16px;margin:0 0 5px}.ae-card h4{font-size:14px;margin:14px 0 6px}.ae-sub{color:var(--ae-muted);font-size:12px;margin:0}.ae-note{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a5f;padding:10px 12px;border-radius:11px;font-size:12px}.ae-warn{background:#fff8e8;border-color:#f2cc72;color:#624409}.ae-danger{background:#fff1f2;border-color:#fda4af;color:#881337}.ae-ok{background:#ecfdf5;border-color:#86efac;color:#14532d}.ae-btn{border:1px solid #b8c2d2;background:#fff;color:#24324a;border-radius:10px;padding:8px 12px;min-height:44px;font-weight:750;cursor:pointer}.ae-btn:hover{background:#f4f7fb}.ae-btn-primary{background:#1d4ed8;border-color:#1d4ed8;color:#fff}.ae-btn-primary:hover{background:#1e40af}.ae-btn-danger{background:#be123c;border-color:#be123c;color:#fff}.ae-btn-quiet{border-color:transparent;background:transparent}.ae-btn:disabled{opacity:.5;cursor:not-allowed}.ae-link{color:#1d4ed8;font-weight:700}.ae-field{display:block;margin-bottom:12px}.ae-field>span,.ae-legend-label{display:block;font-size:12px;font-weight:800;color:#38465e;margin-bottom:5px}.ae-input,.ae-select,.ae-textarea{width:100%;border:1px solid #aeb9ca;background:#fff;color:#172033;border-radius:10px;min-height:44px;padding:9px 10px;font:inherit}.ae-textarea{min-height:100px;resize:vertical}.ae-help{font-size:11px;color:#69758a;margin-top:4px}.ae-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}.ae-field-wide{grid-column:1/-1}.ae-check{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:8px 0}.ae-check input{width:24px;height:24px;flex:0 0 auto;margin-top:1px}.ae-chips{display:flex;gap:6px;flex-wrap:wrap}.ae-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;border:1px solid #c7d0de;background:#f6f8fb}.ae-chip-good{background:#dcfce7;border-color:#86efac;color:#166534}.ae-chip-bad{background:#ffe4e6;border-color:#fda4af;color:#9f1239}.ae-chip-amber{background:#fef3c7;border-color:#facc15;color:#713f12}.ae-chip-blue{background:#dbeafe;border-color:#93c5fd;color:#1e3a8a}.ae-chip-purple{background:#ede9fe;border-color:#c4b5fd;color:#5b21b6}.ae-chip-neutral{background:#f1f5f9;color:#475569}.ae-stat{border-left:4px solid #2563eb;padding:6px 10px}.ae-stat strong{display:block;font-size:20px}.ae-stat span{font-size:11px;color:var(--ae-muted)}
.ae-local-banner.ae-sync-error{background:#fff1f2;border-bottom-color:#fda4af;color:#881337}.ae-preview-banner{background:#eef2ff;border-bottom-color:#a5b4fc;color:#312e81}.ae-save-state{margin-left:auto;white-space:nowrap;border:1px solid currentColor;border-radius:999px;padding:2px 8px;font-weight:800}.ae-local-banner .ae-btn{min-height:32px;padding:4px 9px;font-size:11px}.ae-operation-notice{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 20px;background:#eff6ff;border-bottom:1px solid #bfdbfe;color:#1e3a5f;font-size:12px}.ae-operation-success{background:#ecfdf5;border-bottom-color:#86efac;color:#14532d}.ae-operation-error{background:#fff1f2;border-bottom-color:#fda4af;color:#881337}.ae-operation-notice .ae-btn{min-height:44px;padding:8px 12px}.ae-tour{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px 20px;background:#f5f3ff;border-bottom:1px solid #c4b5fd;color:#3b1d72}.ae-tour p{margin:3px 0 0;font-size:12px}.ae-tour .ae-actions{flex:0 0 auto}.ae-review-facts{display:grid;grid-template-columns:minmax(120px,auto) 1fr;gap:5px 12px;margin:10px 0}.ae-review-facts dt{font-weight:800}.ae-review-facts dd{margin:0;overflow-wrap:anywhere}
.ae-donut-wrap{display:flex;gap:18px;align-items:center;margin-top:12px}.ae-donut{width:178px;height:178px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;position:relative}.ae-donut:after{content:"";width:108px;height:108px;border-radius:50%;background:#fff;position:absolute;box-shadow:inset 0 0 0 1px #e2e8f0}.ae-donut-center{position:relative;z-index:1;text-align:center;line-height:1.15}.ae-donut-center strong{font-size:24px;display:block}.ae-donut-center span{font-size:11px;color:var(--ae-muted);display:block;max-width:86px}.ae-legend{display:grid;gap:7px;min-width:0}.ae-legend-row{display:grid;grid-template-columns:12px 1fr auto;gap:7px;align-items:center;font-size:12px}.ae-swatch{width:12px;height:12px;border-radius:3px;border:1px solid rgba(0,0,0,.15)}
.ae-table-wrap{width:100%;overflow:auto;border:1px solid var(--ae-line);border-radius:12px}.ae-table{border-collapse:collapse;width:100%;font-size:12px;background:#fff}.ae-table th,.ae-table td{padding:10px 11px;text-align:left;border-bottom:1px solid #e4e9f1;vertical-align:top}.ae-table th{background:#f2f5f9;color:#36445b;font-weight:850;white-space:nowrap}.ae-table tr:last-child td{border-bottom:0}.ae-table tbody tr:hover{background:#f8fbff}.ae-row-btn{border:0;background:transparent;color:#1d4ed8;text-align:left;font-weight:800;padding:6px 0;min-height:32px;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px}.ae-empty{text-align:center;padding:34px 16px;color:var(--ae-muted)}
.ae-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.ae-toolbar .ae-input,.ae-toolbar .ae-select{width:auto;min-width:170px}.ae-record{border:1px solid var(--ae-line);border-radius:13px;background:#fff;padding:13px;margin-bottom:10px}.ae-record-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ae-record h4{margin:0 0 3px}.ae-meta{font-size:11px;color:var(--ae-muted);display:flex;gap:8px;flex-wrap:wrap}.ae-evidence{white-space:pre-wrap;background:#f8fafc;border-left:4px solid #64748b;padding:10px 12px;margin:10px 0;border-radius:0 9px 9px 0}.ae-interpretation{border-left-color:#2563eb;background:#eff6ff}.ae-thread{border-top:1px solid var(--ae-line);margin-top:14px;padding-top:12px}.ae-comment{padding:9px 11px;border-radius:10px;background:#f3f6fa;margin:7px 0}.ae-comment-teacher{background:#f3e8ff}.ae-comment strong{font-size:12px}.ae-comment p{margin:3px 0;white-space:pre-wrap}.ae-comment time{font-size:10px;color:var(--ae-muted)}
.ae-stepper{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin:12px 0 18px;list-style:none;padding:0}.ae-step{font-size:9px;text-align:center;color:#69758a;position:relative;padding-top:24px}.ae-step:before{content:"";width:18px;height:18px;border-radius:50%;background:#d9e0ea;border:2px solid #fff;box-shadow:0 0 0 1px #aeb9ca;position:absolute;top:0;left:50%;transform:translateX(-50%)}.ae-step:after{content:"";height:2px;background:#ccd5e2;position:absolute;top:9px;left:calc(50% + 10px);right:calc(-50% + 10px)}.ae-step:last-child:after{display:none}.ae-step-done{color:#154e39;font-weight:750}.ae-step-done:before{background:#16a34a;box-shadow:0 0 0 1px #15803d}.ae-step-done:after{background:#16a34a}.ae-step-current:before{background:#2563eb;box-shadow:0 0 0 3px #bfdbfe}.ae-domain{border:1px solid var(--ae-line);border-radius:12px;margin:8px 0;overflow:hidden}.ae-domain summary{cursor:pointer;padding:11px 12px;font-weight:800;background:#f8fafc}.ae-domain-body{padding:8px 12px 12px}.ae-domain-component{display:flex;gap:7px;align-items:flex-start;padding:5px 0;font-size:12px}.ae-domain-component strong{min-width:26px}.ae-rating-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ae-rating-card{border:1px solid var(--ae-line);border-radius:12px;padding:10px}.ae-rating-card h4{min-height:40px;margin:0 0 8px}.ae-score{font-size:28px;font-weight:900;color:#173e70}.ae-timeline{border-left:2px solid #c8d2e1;margin:10px 0 0 8px;padding-left:18px}.ae-event{position:relative;padding:0 0 16px}.ae-event:before{content:"";position:absolute;width:11px;height:11px;border-radius:50%;background:#2563eb;left:-24.5px;top:4px;border:2px solid #fff;box-shadow:0 0 0 1px #2563eb}.ae-event h4{margin:0;font-size:12px}.ae-event p{margin:2px 0;font-size:11px;color:var(--ae-muted)}.ae-live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.ae-footer{padding:10px 20px;border-top:1px solid var(--ae-line);background:#fff;color:#667085;font-size:10px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.ae-footer a{color:#1d4ed8}
.ae-onboarding-overlay{position:fixed;inset:0;z-index:290;background:rgba(7,18,38,.72);display:flex;align-items:center;justify-content:center;padding:16px}.ae-onboarding-card{width:min(720px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:22px;box-shadow:0 30px 90px rgba(7,18,38,.42);padding:24px}.ae-onboarding-kicker{color:#1d4ed8;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.ae-onboarding-card h2{margin:5px 0 7px;color:#172033;font-size:24px;line-height:1.2}.ae-onboarding-card>p{margin:0;color:#5b667a;font-size:13px;line-height:1.55}.ae-onboarding-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:20px}.ae-onboarding-option{border:2px solid #d8deea;border-radius:16px;background:#fff;color:#172033;text-align:left;padding:16px;min-height:150px;cursor:pointer;display:flex;flex-direction:column;gap:8px}.ae-onboarding-option:hover{border-color:#2563eb;background:#f8fbff}.ae-onboarding-option strong{font-size:16px;color:#173e70}.ae-onboarding-option span{font-size:12px;line-height:1.5;color:#5b667a}.ae-onboarding-note{margin-top:16px;background:#fff8e8;border:1px solid #f2cc72;color:#624409;border-radius:12px;padding:11px 12px;font-size:11px;line-height:1.5}@media(max-width:640px){.ae-onboarding-card{padding:18px}.ae-onboarding-options{grid-template-columns:1fr}.ae-onboarding-card h2{font-size:21px}}
@media(max-width:1000px){.ae-span-4,.ae-span-5,.ae-span-6,.ae-span-7,.ae-span-8{grid-column:span 12}.ae-rating-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ae-workspace{height:97vh}.ae-main{padding:14px}.ae-stepper{grid-template-columns:repeat(10,minmax(72px,1fr));overflow-x:auto;padding-bottom:8px}.ae-step{font-size:9px;min-width:72px}.ae-step:before{width:16px;height:16px}.ae-step:after{top:8px}.ae-donut-wrap{justify-content:center}.ae-top{align-items:flex-start}.ae-brand p{display:none}}
@media(max-width:640px){.ae-overlay{padding:0}.ae-workspace{height:100vh;height:100dvh;border-radius:0}.ae-top{padding:11px 12px}.ae-brand h1{font-size:15px}.ae-mark{width:36px;height:36px}.ae-local-banner{padding:8px 12px;display:block}.ae-local-banner strong{margin-right:6px}.ae-save-state{display:inline-block;margin:6px 0 0}.ae-local-banner .ae-btn{margin-top:6px}.ae-operation-notice{padding:8px 12px}.ae-tour{display:block;padding:10px 12px}.ae-tour .ae-actions{margin-top:8px}.ae-tabs{padding:0 5px}.ae-tab{padding:10px 9px;font-size:12px}.ae-main{padding:10px}.ae-heading{display:block}.ae-heading .ae-actions{margin-top:10px}.ae-form-grid,.ae-rating-grid{grid-template-columns:1fr}.ae-review-facts{grid-template-columns:1fr;gap:2px}.ae-review-facts dd{margin-bottom:6px}.ae-donut-wrap{display:block}.ae-donut{margin:12px auto}.ae-legend{margin-top:12px}.ae-toolbar .ae-input,.ae-toolbar .ae-select{width:100%}.ae-top-actions{gap:4px}.ae-role button{padding:6px 7px;font-size:11px}.ae-top{align-items:flex-start}.ae-brand{min-width:0;flex:1 1 auto}.ae-top-actions{flex:0 0 auto;flex-wrap:nowrap;align-items:center}.ae-brand p{display:none}.ae-footer{padding:8px 12px}}
.ae-onboarding-card{width:min(940px,100%)}.ae-onboarding-options{grid-template-columns:repeat(3,minmax(0,1fr))}.ae-onboarding-progress{display:flex;align-items:center;gap:8px;color:#1d4ed8;font-size:11px;font-weight:850}.ae-onboarding-progress:after{content:"";height:4px;flex:1;border-radius:999px;background:linear-gradient(90deg,#2563eb 50%,#dbe5f1 50%)}.ae-onboarding-badge{order:-1;align-self:flex-start;border-radius:999px;background:#dbeafe;color:#1e3a8a;padding:3px 8px;font-size:10px!important;font-weight:850}.ae-setup-path{border-top:5px solid #64748b;transition:border-color .15s,box-shadow .15s}.ae-setup-path-primary{border-top-color:#2563eb}.ae-setup-path-selected{box-shadow:0 0 0 3px #bfdbfe;border-color:#60a5fa}.ae-setup-path ul{padding-left:17px;margin:9px 0;font-size:11px;color:var(--ae-muted)}.ae-setup-progress{height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden}.ae-setup-progress>span{display:block;height:100%;background:#2563eb;transition:width .2s}.ae-setup-task{display:grid;grid-template-columns:28px 1fr;gap:9px;padding:11px 0;border-top:1px solid #e4e9f1}.ae-setup-task:first-child{border-top:0}.ae-setup-task input{width:22px;height:22px;margin:1px 0}.ae-setup-task-complete strong{text-decoration:line-through;color:#64748b}.ae-setup-next{background:#eff6ff;border:1px solid #93c5fd;border-radius:11px;padding:11px 12px}.ae-copy-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ae-sim-diff{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.ae-sim-diff .ae-stat{background:#f8fafc;border-radius:8px}.ae-scenario-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ae-scenario{min-height:86px;text-align:left}.ae-scenario small{display:block;font-weight:500;color:#526078;margin-top:4px}@media(max-width:760px){.ae-onboarding-options,.ae-copy-grid,.ae-sim-diff,.ae-scenario-grid{grid-template-columns:1fr}}
.ae-release-review{width:min(700px,100%)}.ae-release-review .ae-review-facts{padding:12px;border:1px solid #dbe3ee;border-radius:12px;background:#f8fafc}.ae-release-confirm{display:flex;align-items:flex-start;gap:10px;margin:14px 0;padding:12px;border:1px solid #93c5fd;border-radius:12px;background:#eff6ff;color:#173e70;font-size:12px;line-height:1.5}.ae-release-confirm input{width:22px;height:22px;flex:0 0 auto;margin:0}.ae-release-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:16px}
@media(prefers-reduced-motion:reduce){.ae-shell *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;

function AeStyles() { return <style>{AE_STYLES}</style>; }

function AeLocalOnboarding({ onChoose }) {
  // Focus lands INSIDE the dialog on mount and Tab cycles within it —
  // aria-modal alone does not stop keyboard focus reaching the page behind.
  const firstRef = React.useRef(null);
  React.useEffect(() => { if (firstRef.current) firstRef.current.focus(); }, []);
  const trapTab = (event) => {
    if (event.key !== 'Tab') return;
    const focusables = event.currentTarget.querySelectorAll('button');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className="ae-onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="ae-onboarding-title" aria-describedby="ae-onboarding-description" onKeyDown={trapTab}>
    <section className="ae-onboarding-card">
      <div className="ae-onboarding-progress">Choose your starting point</div>
      <div className="ae-onboarding-kicker" style={{ marginTop: 10 }}>First-time setup</div>
      <h2 id="ae-onboarding-title">Choose how to start Educator Evaluation</h2>
      <p id="ae-onboarding-description">Choose the outcome you need today. No choice shares a record automatically, and you can change the record path later from Setup.</p>
      <div className="ae-onboarding-options" role="group" aria-label="Choose evaluation workspace starting point">
        <button type="button" ref={firstRef} className="ae-onboarding-option" onClick={() => onChoose('sample')}>
          <strong>Start a guided sample tour</strong>
          <span className="ae-onboarding-badge">Recommended for a first visit</span>
          <span>Open a fictional roster and then shape it with Simulation Studio. No real personnel data is used.</span>
        </button>
        <button type="button" className="ae-onboarding-option" onClick={() => onChoose('blank')}>
          <strong>Start real work locally</strong>
          <span className="ae-onboarding-badge">Private · no sharing</span>
          <span>Begin empty, add your educators, and keep records on this device until your district approves a sharing path.</span>
        </button>
        <button type="button" className="ae-onboarding-option" onClick={() => onChoose('setup')}>
          <strong>Choose a record path</strong>
          <span className="ae-onboarding-badge">Planning and deployment</span>
          <span>Compare private, principal-managed Drive, and district-portal paths. The selected walkthrough opens next.</span>
        </button>
      </div>
      <div className="ae-onboarding-note"><strong>Where this lives:</strong> in your browser profile on this device, protected by your device sign-in rather than by encryption AlloFlow adds. Information leaves the device only when you deliberately export or share a file, connect an approved portal, or enable optional AI reflection. Keep a backup and follow district retention rules.</div>
    </section>
  </div>;
}

function AeReleaseReview({ state, onCancel, onConfirm }) {
  const review = state.review || {};
  const firstRef = React.useRef(null);
  const [confirmed, setConfirmed] = React.useState(false);
  React.useEffect(() => {
    const returnFocus = document.activeElement;
    setConfirmed(false);
    if (firstRef.current) firstRef.current.focus();
    return () => { if (returnFocus && typeof returnFocus.focus === 'function' && document.contains(returnFocus)) returnFocus.focus(); };
  }, [review.token]);
  const busy = state.status === 'sending';
  const trapFocus = (event) => {
    if (event.key === 'Escape' && !busy) { event.preventDefault(); onCancel(); return; }
    if (event.key !== 'Tab') return;
    const focusables = event.currentTarget.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const action = review.action === 'verify_existing'
    ? 'Verify the current document and restore any missing view access. No duplicate will be created.'
    : review.action === 'replace_unavailable'
      ? 'The recorded document is unavailable. Create a replacement and retain the old pointer in superseded history.'
      : 'Create the first strengths-first summary document and grant view-only access.';
  return <div className="ae-onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="ae-release-title" aria-describedby="ae-release-description" onKeyDown={trapFocus}>
    <section className="ae-onboarding-card ae-release-review">
      <div className="ae-onboarding-kicker">Required disclosure review</div>
      <h2 id="ae-release-title">Confirm released-summary access</h2>
      <p id="ae-release-description">Nothing has been shared by opening this review. Confirm the educator, managed account, record status, and disclosure before Google Drive access changes.</p>
      <dl className="ae-review-facts">
        <dt>Educator</dt><dd>{review.educatorName || 'Educator'}</dd>
        <dt>Drive recipient</dt><dd><strong>{review.recipient || 'Not configured'}</strong></dd>
        <dt>Finalized</dt><dd>{aeDateTime(review.finalizedAt)}</dd>
        <dt>Action</dt><dd>{action}</dd>
        <dt>Access</dt><dd>Educator: viewer. You: {review.actorWillReceiveAccess ? 'viewer' : 'document owner'}.</dd>
        <dt>Email notice</dt><dd>The separate content-free portal email is not sent by this action.</dd>
      </dl>
      {review.action === 'replace_unavailable' && <div className="ae-note ae-danger"><strong>Replacement requires extra care.</strong> The portal cannot open the previously recorded file. Confirm retention or legal-hold requirements before replacing it.</div>}
      <div className="ae-note ae-warn"><strong>Personnel-record disclosure:</strong> this grants access to a finalized evaluation summary outside the portal. Google may surface Drive access in its own activity or notification interfaces. Verify that the account above belongs to the intended educator.</div>
      <label className="ae-release-confirm"><input ref={firstRef} type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)}/><span>I reviewed the recipient and understand that confirming grants view-only Drive access to this finalized personnel-record summary.</span></label>
      {state.error && <div className="ae-note ae-danger" role="alert">{state.error}</div>}
      <div className="ae-release-actions"><button type="button" className="ae-btn" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="ae-btn ae-btn-primary" disabled={!confirmed || busy} onClick={onConfirm}>{busy ? 'Confirming accessâ€¦' : (review.action === 'verify_existing' ? 'Confirm and verify access' : 'Confirm and grant access')}</button></div>
    </section>
  </div>;
}

const AE_GUIDED_TOUR_STEPS = [
  { tab: 'overview', title: 'See the year at a glance', text: 'Review completion, due-date workload, framework weighting, and the currently selected fictional educator.' },
  { tab: 'staff', title: 'Inspect the fictional roster', text: 'Open Staff to see cycle profiles, assignments, due dates, and the inputs that control framework weighting.' },
  { tab: 'walkthroughs', title: 'Trace evidence from draft to publication', text: 'Compare private evaluator drafts with published evidence and the educator-visible conversation.' },
  { tab: 'formal', title: 'Walk through the formal cycle', text: 'Follow prework, conferences, published evidence, reflection, ratings, acknowledgment, and finalization as distinct steps.' },
  { tab: 'audit', title: 'Practice backup and handoff', text: 'Reports & audit shows the activity timeline, safe exports, educator packets, and reviewed imports.' },
  { tab: 'about', title: 'Shape the simulation and choose a record path', text: 'Use Simulation Studio with natural language or manual controls, then compare private, principal-managed Drive, and district-portal paths.' },
];

function AeGuidedTour({ step, onMove, onFinish }) {
  const current = AE_GUIDED_TOUR_STEPS[step];
  if (!current) return null;
  return <section className="ae-tour" aria-labelledby="ae-tour-title" aria-live="polite">
    <div><div className="ae-onboarding-kicker">Guided sample · {step + 1} of {AE_GUIDED_TOUR_STEPS.length}</div><strong id="ae-tour-title">{current.title}</strong><p>{current.text}</p></div>
    <div className="ae-actions"><button type="button" className="ae-btn" disabled={step === 0} onClick={() => onMove(step - 1)}>Back</button>{step < AE_GUIDED_TOUR_STEPS.length - 1 ? <button type="button" className="ae-btn ae-btn-primary" onClick={() => onMove(step + 1)}>Next</button> : <button type="button" className="ae-btn ae-btn-primary" onClick={onFinish}>Finish tour</button>}<button type="button" className="ae-btn ae-btn-quiet" onClick={onFinish}>Exit tour</button></div>
  </section>;
}


function AeStatus({ status }) {
  const meta = AE_STATUS_META[status] || AE_STATUS_META.not_started;
  return <span className={'ae-chip ae-chip-' + meta.tone}>{meta.label}</span>;
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
  const background = total ? 'conic-gradient(' + stops.join(',') + ')' : '#dbe2ec';
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

function AeThread({ workspace, recordType, recordId, teacherId, role, onAdd, readOnlyPreview = false }) {
  const [text, setText] = React.useState('');
  const comments = workspace.comments.filter((comment) => comment.recordType === recordType && comment.recordId === recordId);
  return <div className="ae-thread">
    <h4>Conversation <span className="ae-chip ae-chip-neutral">{comments.length}</span></h4>
    <p className="ae-sub">Published comments are appended to this record and cannot alter the original evidence.</p>
    {comments.map((comment) => <div key={comment.id} className={'ae-comment ' + (comment.role === 'Teacher' ? 'ae-comment-teacher' : '')}>
      <strong>{comment.author} · {comment.role}</strong><p>{comment.text}</p><time>{aeDateTime(comment.at)}</time>
    </div>)}
    <label className="ae-field"><span>Add a shared comment</span>
      <textarea className="ae-textarea" value={text} maxLength={3000} readOnly={readOnlyPreview} aria-describedby={readOnlyPreview ? 'ae-preview-readonly-help' : undefined} onChange={(event) => setText(event.target.value)} placeholder={role === 'teacher' ? 'Add context or ask a question…' : 'Add feedback or answer a question…'} />
    </label>
    <button type="button" className="ae-btn" disabled={readOnlyPreview || !text.trim()} onClick={() => { onAdd({ recordType, recordId, teacherId, text: text.trim() }); setText(''); }}>Post comment</button>
    {readOnlyPreview && <p className="ae-help" id="ae-preview-readonly-help">Preview only. Shared comments can be added from an educator packet or the authenticated district portal.</p>}
  </div>;
}

function AeFrameworkReference() {
  return <div className="ae-card">
    <h3>{AE_ACTIVE_FW.id === 'pa_act13' ? 'Evidence map · Pennsylvania classroom-teacher framework' : 'Evidence map · rubric domains (as adapted by your district’s PEPG plan)'}</h3>
    <p className="ae-sub">Component names organize evidence. Rubric-level performance descriptors are not reproduced in this workspace.{AE_ACTIVE_FW.id === 'pa_act13' ? '' : ' Confirm domain and component names against your district’s adapted rubric.'}</p>
    {AE_DOMAINS.map((domain) => <details className="ae-domain" key={domain.id}>
      <summary>Domain {domain.code} · {domain.label} <span className="ae-chip ae-chip-neutral">{domain.weight}% of O&amp;P</span></summary>
      <div className="ae-domain-body">{((AE_ACTIVE_FW.components && AE_ACTIVE_FW.components[domain.id]) || domain.components).map(([code, label]) => <div className="ae-domain-component" key={code}><strong>{code}</strong><span>{label}</span></div>)}</div>
    </details>)}
  </div>;
}

function AeRatingComposer({ teacher, role, updateTeacher, evidenceFindings, aiReflectionEnabled, askForReflection, reflection }) {
  const [releaseChecked, setReleaseChecked] = React.useState(false);
  React.useEffect(() => { setReleaseChecked(false); }, [teacher.id]);
  const profile = aeWeightProfile(teacher);
  const obs = aeObservationScore(teacher.ratings);
  const overall = aeOverallScore(teacher);
  const missing = [];
  if (obs === null) missing.push('all four O&P domain ratings');
  profile.forEach((part) => {
    if (part.id !== 'observation' && aeNumberOrNull(teacher.ratings[part.id]) === null) missing.push(part.label);
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
  const recordFinalRelease = () => updateTeacher(teacher.id, (draft) => {
    draft.finalizedAt = aeNow();
    draft.cycleStatus = 'finalized';
    draft.finalScore = aeRoundedScore(overall);
    draft.weightSnapshot = profile.map((part) => ({ id: part.id, label: part.label, weight: part.weight }));
    draft.frameworkVersion = AE_ACTIVE_FW.versionTag;
  }, 'RELEASED', 'Final rating release recorded');
  return <div className="ae-card">
    <div className="ae-record-head"><div><h3>{role === 'evaluator' ? 'Annual summative calculation preview' : 'How your final rating is calculated'}</h3><p className="ae-sub">{role === 'evaluator'
      ? 'Enter cycle-level domain judgments after reviewing all relevant observations, walkthroughs, artifacts, and professional-practice evidence. Observation-specific ratings stay separate; the system performs arithmetic only.'
      : 'Full transparency into the arithmetic: these are the only inputs that enter your final rating, entered by your evaluator after reviewing your evidence. Nothing else affects the math.'}</p></div>
      <div>{overall === null ? <span className={'ae-chip ' + (role === 'evaluator' ? 'ae-chip-amber' : 'ae-chip-neutral')}>{role === 'evaluator' ? 'Draft · ' + missing.length + ' input' + (missing.length === 1 ? '' : 's') + ' missing' : 'In progress · ' + missing.length + ' component' + (missing.length === 1 ? '' : 's') + ' still ahead in your cycle'}</span> : (AE_ACTIVE_FW.id === 'portland_me' ? <span className="ae-chip ae-chip-blue">{(aePortlandPracticeRating(teacher.ratings.domains) || {}).label}</span> : <span className="ae-chip ae-chip-blue">{aeRoundedScore(overall).toFixed(2)} · {aeBand(overall)}</span>)}</div>
    </div>
    {role === 'evaluator' && aiReflectionEnabled && <div className="ae-note ae-info" style={{ marginTop: 12 }}><strong>Second read on your own reasoning</strong><p className="ae-help" style={{ marginTop: 4 }}>Asks a model whether the evidence you wrote supports the ratings you assigned, and what else it could mean. Advisory only: nothing it says is stored in the record.</p><button type="button" className="ae-btn" onClick={askForReflection} disabled={reflection.status === 'working'}>{reflection.status === 'working' ? 'Checking…' : 'Ask for alternative readings'}</button>{reflection.status === 'done' && <div style={{ marginTop: 10 }}><p className="ae-help"><strong>Suggestion, not a finding.</strong> You decide what, if anything, to change.</p><pre style={{ whiteSpace: 'pre-wrap', font: 'inherit', margin: 0 }}>{reflection.text}</pre></div>}{reflection.status === 'error' && <p className="ae-help" style={{ marginTop: 8 }}>{reflection.text}</p>}</div>}
    {evidenceFindings && evidenceFindings.length > 0 && <div className={'ae-note ' + (evidenceFindings.some((item) => item.severity === 'high') ? 'ae-warn' : 'ae-info')} style={{ marginTop: 12 }}><strong>{role === 'evaluator' ? 'Check the evidence before you finalise' : 'What the documentation shows'}</strong><ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>{evidenceFindings.map((item, index) => <li key={item.code + '-' + (item.domainId || index)}>{item.message}</li>)}</ul><p className="ae-help" style={{ marginTop: 8 }}>{role === 'evaluator' ? 'Counted from the evidence you tagged, on this device. A rating resting on little documented evidence is the one most likely to be overturned, so this is a prompt to add evidence or revisit the rating, not a judgment about the educator.' : 'Counted from the evidence tagged to your record. You can raise any of these with your evaluator.'}</p></div>}
    <div className="ae-rating-grid" style={{ marginTop: 12 }}>
      {AE_DOMAINS.map((domain) => <div className="ae-rating-card" key={domain.id} style={{ borderTop: '4px solid ' + domain.color }}>
        <h4>{domain.code}. {domain.label} <span className="ae-chip ae-chip-neutral">{domain.weight}% of O&amp;P</span></h4>
        <label className="ae-field"><span>Human-selected rating</span><select className="ae-select" value={teacher.ratings.domains[domain.id] == null ? '' : teacher.ratings.domains[domain.id]} disabled={role !== 'evaluator' || !!teacher.finalizedAt} onChange={(event) => setRating(domain.id, event.target.value)}>
          <option value="">Not rated</option>{AE_RATINGS.map((rating) => <option key={rating.value} value={rating.value}>{rating.value} · {(AE_ACTIVE_FW.ratingLabels && AE_ACTIVE_FW.ratingLabels[rating.value]) || rating.label}</option>)}
        </select></label>
      </div>)}
    </div>
    <div className="ae-form-grid" style={{ marginTop: 12 }}>
      {profile.filter((part) => part.id !== 'observation').map((part) => <label className="ae-field" key={part.id}><span>{part.label} · {part.weight}%</span>
        <input className="ae-input" type="number" min="0" max="3" step="0.01" value={teacher.ratings[part.id] == null ? '' : teacher.ratings[part.id]} disabled={role !== 'evaluator' || !!teacher.finalizedAt} onChange={(event) => setRating(part.id, event.target.value)} placeholder="0.00–3.00" />
      </label>)}
    </div>
    {AE_ACTIVE_FW.id === 'portland_me' && (() => { const rollup = aePortlandPracticeRating(teacher.ratings.domains); return rollup ? <div className="ae-note" style={{ marginTop: 10 }}><strong>Practice rating (guidebook roll-up): {rollup.label}</strong> — {rollup.rule}. The guidebook derives this rating from the four domain ratings by rule, not by averaging; the numeric average never appears on official Portland forms. Student growth combines per the district’s current plan documents. Confirm against the current PEPG plan — this mirrors guidebook v1.0.</div> : null; })()}
    <div className="ae-note ae-warn">{AE_ACTIVE_FW.id === 'pa_act13' ? 'This is a planning preview, not an official PDE 13-1 form. Follow your LEA’s approved process and enter/release the official summative form in PEERS or the district’s authorized record system.' : 'This is a planning preview, not an official PEPG summative form. Your district’s PEPG plan (developed with its teacher-majority steering committee) governs the official process, rating levels, and forms — record the official summative rating in the district-authorized system.'}</div>
    {teacher.finalizedAt && <div className="ae-note ae-ok" style={{ marginTop: 10 }}><strong>Final release recorded · {Number(teacher.finalScore == null ? aeRoundedScore(overall) : teacher.finalScore).toFixed(2)}</strong><br/>Released {aeDateTime(teacher.finalizedAt)}. This local receipt does not replace the official record.</div>}
    {!teacher.finalizedAt && role === 'evaluator' && overall !== null && <div style={{ marginTop: 12 }}><label className="ae-check"><input type="checkbox" checked={releaseChecked} onChange={(event) => setReleaseChecked(event.target.checked)}/><span>{AE_ACTIVE_FW.id === 'pa_act13' ? 'I confirm the official final rating form has already been released in PEERS or the LEA-authorized record system.' : 'I confirm the official summative rating has already been recorded through the district-authorized PEPG process.'}</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!releaseChecked} onClick={recordFinalRelease}>Record final release</button><p className="ae-help">This locks the local cycle and advances the “teachers evaluated” completion pie.</p></div>}
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
    <div className="ae-record-head"><div><h3>{isOwner ? 'Your statement for the record' : 'Educator’s statement'}</h3><p className="ae-sub">{isOwner
      ? 'Optional and in your own words: what you are proud of this year, and any context you want on the record. It appears verbatim — under "In your own words" — in your released evaluation summary, and no one can edit it but you.'
      : 'Written by the educator; read-only for evaluators. It appears verbatim in the released summary.'}</p></div>
      {frozen && <span className="ae-chip ae-chip-neutral">Frozen at finalization</span>}</div>
    {isOwner && !frozen ? <>
      <label className="ae-field"><span>Statement</span><textarea className="ae-textarea" style={{ minHeight: 110 }} maxLength={20000} value={text} readOnly={readOnlyPreview} aria-describedby={readOnlyPreview ? 'ae-statement-preview-help' : undefined} onChange={(event) => setText(event.target.value)} placeholder="What I’m proud of this year… context I want alongside my ratings…"/></label>
      <div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={readOnlyPreview || text.trim() === saved.trim()} onClick={() => updateTeacher(teacher.id, (draft) => { const trimmed = text.trim(); draft.educatorStatement = trimmed ? { text: trimmed, updatedAt: aeNow() } : null; }, 'STATEMENT_SAVED', 'Educator statement updated')}>{saved ? 'Update statement' : 'Save statement'}</button>{saved && <span className="ae-sub">Last saved {aeDateTime(teacher.educatorStatement.updatedAt)}</span>}</div>
      {readOnlyPreview && <p className="ae-help" id="ae-statement-preview-help">Preview only. The educator can write this statement in their response packet or authenticated district portal.</p>}
    </> : (saved ? <div className="ae-evidence">{saved}</div> : <div className="ae-empty">No statement recorded before finalization.</div>)}
  </section>;
}

function AeOverview({ workspace, selectedTeacher, setSelectedTeacherId, role, updateTeacher, setTab, aiReflectionEnabled, askForReflection, reflection, readOnlyPreview = false }) {
  const evidenceFindings = React.useMemo(() => (selectedTeacher ? aeEvidenceSufficiency(workspace, selectedTeacher.id, { domains: AE_DOMAINS, componentsByDomain: AE_ACTIVE_FW.components || null, expectedPieces: AE_ACTIVE_FW.evidenceTarget || 0 }) : []), [workspace, selectedTeacher]);
  const isEvaluator = role === 'evaluator';
  const visibleTeachers = isEvaluator ? workspace.teachers : (selectedTeacher ? [selectedTeacher] : []);
  const summary = aeCompletionSummary(visibleTeachers);
  const completionSegments = summary.total ? [
    { id: 'finalized', label: 'Finalized', value: summary.finalized, display: summary.finalized, color: '#16815d' },
    { id: 'open', label: 'Not finalized', value: summary.open, display: summary.open, color: '#d6a321' },
  ] : [];
  const profile = selectedTeacher ? aeWeightProfile(selectedTeacher) : [];
  const profileLabel = selectedTeacher ? profile.map((part) => part.label + ' ' + part.weight + '%').join(', ') : '';
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
  return <div className="ae-page">
    <div className="ae-heading"><div><h2>{isEvaluator ? 'Evaluation overview' : 'My evaluation'}</h2><p>Completion means the final rating record has been finalized—not that a walkthrough occurred.</p></div>
      {isEvaluator && <label className="ae-field" style={{ minWidth: 230, margin: 0 }}><span>Selected educator</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => setSelectedTeacherId(event.target.value)}>
        <option value="">Choose an educator</option>{activeTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}
      </select></label>}
    </div>
    <div className="ae-grid">
      {isEvaluator && (workload.overdue > 0 || workload.soon > 0 || workload.month > 0) && <section className="ae-card ae-span-12" aria-labelledby="ae-workload-title"><h3 id="ae-workload-title">Coming due</h3><p className="ae-sub">Open cycles by due date. A band is triage for your calendar, not a judgment about anyone.</p><div className="ae-grid" style={{ marginTop: 10 }}>
        <div className="ae-span-4 ae-stat" style={{ borderLeftColor: workload.overdue ? '#b91c1c' : undefined }}><strong>{workload.overdue}</strong><span>past due date</span></div>
        <div className="ae-span-4 ae-stat" style={{ borderLeftColor: workload.soon ? '#b45309' : undefined }}><strong>{workload.soon}</strong><span>due within 14 days</span></div>
        <div className="ae-span-4 ae-stat"><strong>{workload.month}</strong><span>due in 15–30 days</span></div>
      </div></section>}
      {isEvaluator && <section className="ae-card ae-span-5" aria-labelledby="ae-completion-title"><h3 id="ae-completion-title">Teachers evaluated</h3><p className="ae-sub">Active educators due in {workspace.config.academicYear}</p>
        {summary.total === 0 ? <div className="ae-empty" style={{ marginTop: 12 }}><strong>No educators yet</strong><p>Add your roster in Staff — completion tracking begins with your first educator.</p></div> : <>
        <AeDonut segments={completionSegments} centerTop={summary.finalized + ' / ' + summary.total} centerBottom="finalized" label={summary.finalized + ' of ' + summary.total + ' eligible teachers finalized; ' + summary.open + ' not finalized'} />
        <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><caption className="ae-live">Evaluation status counts</caption><thead><tr><th>Status</th><th>Teachers</th></tr></thead><tbody>
          {Object.keys(AE_STATUS_META).map((status) => <tr key={status}><td><AeStatus status={status} /></td><td>{summary.statuses[status] || 0}</td></tr>)}
        </tbody></table></div>
        </>}
      </section>}
      <section className={'ae-card ' + (isEvaluator ? 'ae-span-7' : 'ae-span-12')} aria-labelledby="ae-composition-title"><h3 id="ae-composition-title">Weight in final evaluation</h3>
        {!selectedTeacher ? <div className="ae-empty"><strong>Choose an educator</strong><p>The pie recalculates by employee category and data availability.</p></div> : <>
          <div className="ae-record-head"><p className="ae-sub">{selectedTeacher.name} · {selectedTeacher.employeeType === 'temporary' ? (AE_ACTIVE_FW.id === 'pa_act13' ? 'Temporary professional employee' : 'Probationary (years 1–3)') : (AE_ACTIVE_FW.id === 'pa_act13' ? 'Professional classroom teacher' : 'Continuing contract')}</p><AeStatus status={aeTeacherStatus(selectedTeacher)} /></div>
          <AeDonut segments={profile.map((part) => ({ id: part.id, label: part.label, value: part.weight, display: part.weight + '%', color: part.color }))} centerTop={profile[0] ? profile[0].weight + '%' : '—'} centerBottom={AE_ACTIVE_FW.practiceLabel} label={'Weight in final evaluation: ' + profileLabel} />
          <div className="ae-note" style={{ marginTop: 10 }}>{AE_ACTIVE_FW.id === 'pa_act13' ? <>Within Observation &amp; Practice: Planning &amp; Preparation 20%, Classroom Environment 30%, Instruction 30%, Professional Responsibilities 20%.</> : (AE_ACTIVE_FW.id === 'portland_me' ? <>Portland’s guidebook rolls the four domain ratings into a categorical Professional Practice result by rule, not by averaging. Confirm the current district PEPG plan before official use.</> : <>Within Professional Practice the four rubric domains average equally in this generic planning profile; your district’s PEPG plan and adapted rubric govern any official aggregation.</>)}</div>
          {AE_ACTIVE_FW.id === 'pa_act13' && selectedTeacher.employeeType === 'temporary' && <div className="ae-note ae-warn" style={{ marginTop: 8 }}>Temporary professional employee: this cycle uses 100% Observation &amp; Practice.</div>}
          {AE_ACTIVE_FW.id === 'pa_act13' && selectedTeacher.employeeType !== 'temporary' && selectedTeacher.buildingData === false && <div className="ae-note ae-warn" style={{ marginTop: 8 }}>No Building Level Data: its 10% is reallocated to Observation &amp; Practice.</div>}
          {AE_ACTIVE_FW.id === 'pa_act13' && selectedTeacher.employeeType !== 'temporary' && selectedTeacher.teacherSpecificData === false && <div className="ae-note ae-warn" style={{ marginTop: 8 }}>No attributable Teacher-Specific Data: its 10% is reallocated to the LEA Selected Measure.</div>}
        </>}
      </section>
      {isEvaluator && <section className="ae-card ae-span-12"><div className="ae-record-head"><div><h3>Roster status</h3><p className="ae-sub">Select a row to open the educator’s working record.</p></div><button type="button" className="ae-btn" onClick={() => setTab('staff')}>Manage staff</button></div>
        {activeTeachers.length === 0 ? <div className="ae-empty">No educators yet. Add your roster in Staff.</div> : <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><thead><tr><th>Educator</th><th>Assignment</th><th>Evaluator</th><th>Formal observation</th><th>Walkthroughs</th><th>SPM / SLO</th><th>Final record</th><th>Next due</th></tr></thead><tbody>
          {activeTeachers.map((teacher) => {
            const obs = workspace.observations.filter((item) => item.teacherId === teacher.id);
            const walks = workspace.walkthroughs.filter((item) => item.teacherId === teacher.id && item.publishedAt);
            const spm = workspace.spms.find((item) => item.teacherId === teacher.id);
            return <tr key={teacher.id}><td><button className="ae-row-btn" type="button" onClick={() => setSelectedTeacherId(teacher.id)}>{teacher.name}</button><br/><span className="ae-sub">{teacher.code} · {teacher.building}</span></td><td>{teacher.assignment || '—'}</td><td>{teacher.evaluator || '—'}</td><td>{obs.length ? (obs.some((item) => item.finalizedAt) ? 'Finalized' : 'In progress') : 'Not started'}</td><td>{walks.length}</td><td>{spm ? spm.status.replace(/_/g, ' ') : 'Not started'}</td><td><AeStatus status={aeTeacherStatus(teacher)} /></td><td>{aeDate(teacher.dueDate)}</td></tr>;
          })}
        </tbody></table></div>}
      </section>}
      {selectedTeacher && AE_ACTIVE_FW.id === 'portland_me' && (() => {
        const published = workspace.walkthroughs.filter((item) => item.teacherId === selectedTeacher.id && item.publishedAt).length;
        const observed = workspace.observations.filter((item) => item.teacherId === selectedTeacher.id && item.evidencePublishedAt).length;
        const pieces = published + observed;
        return <section className="ae-card ae-span-12" aria-labelledby="ae-evidence-count-title"><h3 id="ae-evidence-count-title">Evidence collected this cycle</h3><div className="ae-grid" style={{ marginTop: 10 }}><div className="ae-span-4 ae-stat"><strong>{pieces}</strong><span>portal-tracked evidence pieces</span></div><div className="ae-span-8"><p className="ae-sub">The guidebook calls for at least nine pieces of evidence per cycle across the full range of practice — including an observation cycle, and possibly walk-throughs, student materials, parent communication, surveys, and team-meeting performance. This counter sees only what lives in this portal ({published} published walkthrough{published === 1 ? '' : 's'} + {observed} observation{observed === 1 ? '' : 's'} with published evidence); evidence gathered outside it counts toward the nine as well.</p></div></div></section>;
      })()}
      {selectedTeacher && <AeEducatorStatement teacher={selectedTeacher} role={role} updateTeacher={updateTeacher} readOnlyPreview={readOnlyPreview} />}
      {selectedTeacher && <section className="ae-span-12"><AeRatingComposer teacher={selectedTeacher} role={role} updateTeacher={updateTeacher} evidenceFindings={evidenceFindings} aiReflectionEnabled={aiReflectionEnabled} askForReflection={askForReflection} reflection={reflection} /></section>}
    </div>
  </div>;
}

function AeTrendChart({ points, metric, label }) {
  const values = points.map((point) => ({ point, value: aeTrendPointMetric(point, metric) })).filter((item) => item.value !== null);
  if (!values.length) return <div className="ae-empty">No finalized {label.toLowerCase()} points in this date range.</div>;
  const width = 720, height = 230, left = 44, right = 18, top = 22, bottom = 44;
  const x = (index) => values.length === 1 ? (left + width - right) / 2 : left + (index / (values.length - 1)) * (width - left - right);
  const y = (value) => top + ((3 - value) / 3) * (height - top - bottom);
  const polyline = values.map((item, index) => x(index) + ',' + y(item.value)).join(' ');
  return <div>
    <p className="ae-sub">{values.length} finalized point{values.length === 1 ? '' : 's'} · fixed 0–3 scale. Missing ratings are not connected.</p>
    <svg viewBox={'0 0 ' + width + ' ' + height} style={{ width: '100%', minHeight: 220, display: 'block' }} aria-hidden="true">
      {[0, 1, 2, 3].map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#d8deea"/><text x={left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#5b667a">{tick}</text></g>)}
      {values.length > 1 && <polyline points={polyline} fill="none" stroke="#1d4ed8" strokeWidth="3"/>}
      {values.map((item, index) => <g key={item.point.recordId}><circle cx={x(index)} cy={y(item.value)} r="6" fill="#fff" stroke="#1d4ed8" strokeWidth="3"/><text x={x(index)} y={y(item.value) - 11} textAnchor="middle" fontSize="11" fontWeight="700" fill="#172033">{item.value.toFixed(2)}</text><text x={x(index)} y={height - 17} textAnchor="middle" fontSize="10" fill="#5b667a">{item.point.source === 'cycle_snapshot' ? (item.point.academicYear || aeString(item.point.date, 10, '')).slice(0, 10) : aeString(item.point.date, 10, '')}</text></g>)}
    </svg>
    <div className="ae-table-wrap"><table className="ae-table"><caption className="ae-live">{label} trend data</caption><thead><tr><th scope="col">Date / cycle</th><th scope="col">Record</th><th scope="col">{label}</th></tr></thead><tbody>{values.map((item) => <tr key={item.point.recordId}><td><time dateTime={item.point.date}>{item.point.source === 'cycle_snapshot' ? (item.point.academicYear || aeDate(item.point.date)) : aeDate(item.point.date)}</time></td><td>{item.point.source === 'cycle_snapshot' ? 'Final cycle release' : 'Finalized formal observation'}</td><td>{item.value.toFixed(2)}</td></tr>)}</tbody></table></div>
  </div>;
}

function AeTrends({ workspace, selectedTeacher, setSelectedTeacherId, role, isRemote = false }) {
  const isEvaluator = role === 'evaluator';
  const [metric, setMetric] = React.useState('overall');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const metricLabels = { overall: 'Overall ' + AE_ACTIVE_FW.practiceShort, d1: 'Planning & Preparation', d2: 'Classroom Environment', d3: 'Instruction', d4: 'Professional Responsibilities' };
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
  const cohort = selectedTeacher ? aeWorkspaceCohortMetric(workspace, selectedTeacher.id, metric, filters) : { suppressed: true, minimum: AE_MIN_TREND_COHORT, median: null, selectedMean: null };
  const activity = {};
  walkthroughs.forEach((item) => { const month = item.publishedAt.slice(0, 7); activity[month] = activity[month] || { walkthroughs: 0, formals: 0 }; activity[month].walkthroughs += 1; });
  observations.forEach((item) => { const month = item.finalizedAt.slice(0, 7); activity[month] = activity[month] || { walkthroughs: 0, formals: 0 }; activity[month].formals += 1; });
  const months = Object.keys(activity).sort();
  return <div className="ae-page">
    <div className="ae-heading"><div><h2>{isEvaluator ? 'Teacher trends and cohort context' : 'My trends'}</h2><p>Finalized formal-observation ratings and workflow activity over time. Annual cycle releases are reported separately. Evidence text, comments, and rationales are never aggregated.</p></div></div>
    <div className="ae-note ae-warn" style={{ marginBottom: 16 }}><strong>Privacy-aware aggregate—not FERPA certification.</strong> Formal-observation cohort values appear only when at least {AE_MIN_TREND_COHORT} eligible peers contribute; small groups are suppressed. Results are descriptive and must not be the sole basis for personnel decisions. {isRemote ? 'District authorization, retention, and employment-policy requirements still apply.' : 'On this device, cohort context reflects only this workspace; the district portal adds authenticated, permission-filtered comparisons.'}</div>
    <section className="ae-card" style={{ marginBottom: 16 }}><fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend style={{ fontWeight: 850, marginBottom: 10 }}>Trend filters</legend><div className="ae-form-grid">
      {isEvaluator && <label className="ae-field"><span>Educator</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => setSelectedTeacherId(event.target.value)}><option value="">Choose an educator</option>{workspace.teachers.filter((teacher) => teacher.active !== false).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label>}
      <label className="ae-field"><span>Metric</span><select className="ae-select" value={metric} onChange={(event) => setMetric(event.target.value)}>{Object.keys(metricLabels).map((key) => <option key={key} value={key}>{metricLabels[key]}</option>)}</select></label>
      <label className="ae-field"><span>From</span><input className="ae-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label>
      <label className="ae-field"><span>To</span><input className="ae-input" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)}/></label>
    </div></fieldset></section>
    {!selectedTeacher ? <div className="ae-card ae-empty">Choose an educator to view trends.</div> : <div className="ae-grid">
      <section className="ae-card ae-span-12"><div className="ae-record-head"><div><h3>{selectedTeacher.name} · longitudinal snapshot</h3><p className="ae-sub">{workspace.config.academicYear} current workflow plus separately reported immutable prior-cycle releases.</p></div><AeStatus status={aeTeacherStatus(selectedTeacher)}/></div><div className="ae-grid" style={{ marginTop: 12 }}><div className="ae-span-4 ae-stat"><strong>{walkthroughs.length}</strong><span>published walkthroughs</span></div><div className="ae-span-4 ae-stat"><strong>{observations.length}</strong><span>finalized formal observations</span></div><div className="ae-span-4 ae-stat"><strong>{snapshots.length}</strong><span>released cycle snapshots in range</span></div></div>{medianAck !== null && <p className="ae-sub" style={{ marginTop: 10 }}>Median walkthrough acknowledgment: {medianAck < 48 ? medianAck.toFixed(1) + ' hours' : (medianAck / 24).toFixed(1) + ' days'} (n={ackHours.length}).</p>}</section>
      <section className="ae-card ae-span-12"><h3>Annual cycle releases</h3><p className="ae-sub">All-factor final evaluation scores are listed separately and are not mixed into formal-observation O&amp;P trajectories or peer comparisons.</p>{snapshots.length ? <div className="ae-table-wrap" style={{ marginTop: 10 }}><table className="ae-table"><caption className="ae-live">Annual cycle release scores</caption><thead><tr><th scope="col">Academic year</th><th scope="col">Released</th><th scope="col">Final evaluation score</th></tr></thead><tbody>{snapshots.map((snapshot) => <tr key={snapshot.id}><td>{snapshot.academicYear || 'Unspecified year'}</td><td>{aeDate(snapshot.finalizedAt)}</td><td>{snapshot.finalScore == null ? '—' : Number(snapshot.finalScore).toFixed(2)}</td></tr>)}</tbody></table></div> : <div className="ae-empty">No released annual cycle snapshots in this date range.</div>}</section>
      <section className={'ae-card ' + (isEvaluator ? 'ae-span-8' : 'ae-span-12')}><h3>Formal-observation {metricLabels[metric]} over time</h3><AeTrendChart points={points} metric={metric} label={metricLabels[metric]}/></section>
      {isEvaluator && <section className="ae-card ae-span-4"><h3>De-identified peer context</h3><p className="ae-sub">Same building and employee type; selected educator excluded. Each peer contributes one mean across finalized formal observations before the cohort median.</p>{cohort.suppressed ? <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>Suppressed.</strong><br/>Fewer than {AE_MIN_TREND_COHORT} eligible peers contributed to this metric and date range. The exact small-group count is not exposed.</div> : <div style={{ marginTop: 14 }}><div className="ae-stat"><strong>{cohort.selectedMean == null ? '—' : cohort.selectedMean.toFixed(2)}</strong><span>selected educator mean</span></div><div className="ae-stat" style={{ marginTop: 10, borderLeftColor: '#0f766e' }}><strong>{cohort.median.toFixed(2)}</strong><span>peer cohort median · n={cohort.peerCount}</span></div></div>}<div className="ae-note" style={{ marginTop: 14 }}>No ranking, percentile, peer names, automated judgment, or personnel recommendation is produced.</div></section>}
      <section className="ae-card ae-span-12"><h3>Observation activity by month</h3><p className="ae-sub">Volume indicates documentation activity, not teaching quality.</p>{months.length ? <div className="ae-table-wrap" style={{ marginTop: 10 }}><table className="ae-table"><caption className="ae-live">Monthly observation activity</caption><thead><tr><th scope="col">Month</th><th scope="col">Published walkthroughs</th><th scope="col">Finalized formal observations</th></tr></thead><tbody>{months.map((month) => <tr key={month}><th scope="row">{month}</th><td>{activity[month].walkthroughs}</td><td>{activity[month].formals}</td></tr>)}</tbody></table></div> : <div className="ae-empty">No published/finalized observation activity in this date range.</div>}</section>
    </div>}
  </div>;
}
function AeStaff({ workspace, selectedTeacher, setSelectedTeacherId, role, updateTeacher, addTeacher, isRemote = false, canAddStaff = true }) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: '', code: '', assignment: '', building: workspace.config.building || '', dueDate: '' });
  const [addError, setAddError] = React.useState('');
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
  return <div className="ae-page"><div className="ae-heading"><div><h2>{isRemote ? 'Staff and cycle profiles' : 'Staff and evaluation assignments'}</h2><p>{AE_ACTIVE_FW.id === 'pa_act13' ? 'Configure the employee category and data availability that drive each educator’s Act 13 pie.' : 'Configure each educator’s profile. Under the Maine PEPG profile, summative weights come from your district plan’s category split in About, not from these toggles.'}</p></div>{role === 'evaluator' && canAddStaff && <button type="button" className="ae-btn ae-btn-primary" onClick={() => { setAdding(true); setAddError(''); }}>+ Add educator</button>}</div>
    {adding && <section className="ae-card" aria-labelledby="ae-add-educator-title" style={{ marginBottom: 16 }}><h3 id="ae-add-educator-title">Add an educator</h3><p className="ae-sub">This is a draft until you choose Save educator. Cancel creates no record or audit event.</p><div className="ae-form-grid" style={{ marginTop: 12 }}><label className="ae-field"><span>Name</span><input className="ae-input" autoFocus value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}/></label><label className="ae-field"><span>Unique staff code</span><input className="ae-input" value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}/></label><label className="ae-field"><span>Assignment</span><input className="ae-input" value={draft.assignment} onChange={(event) => setDraft((current) => ({ ...current, assignment: event.target.value }))}/></label><label className="ae-field"><span>Building</span><input className="ae-input" value={draft.building} onChange={(event) => setDraft((current) => ({ ...current, building: event.target.value }))}/></label><label className="ae-field"><span>Cycle due date</span><input className="ae-input" type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}/></label></div>{addError && <p className="ae-note ae-danger" role="alert">{addError}</p>}<div className="ae-actions"><button type="button" className="ae-btn" onClick={() => { setAdding(false); setAddError(''); }}>Cancel</button><button type="button" className="ae-btn ae-btn-primary" onClick={saveDraft}>Save educator</button></div></section>}
    <div className="ae-grid"><section className="ae-card ae-span-7"><div className="ae-toolbar"><input className="ae-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff" aria-label="Search staff"/><select className="ae-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by evaluation status"><option value="all">All statuses</option>{Object.keys(AE_STATUS_META).map((key) => <option key={key} value={key}>{AE_STATUS_META[key].label}</option>)}</select></div>
      <div className="ae-table-wrap"><table className="ae-table"><thead><tr><th>Educator</th><th>Employee type</th><th>Status</th><th>Due</th></tr></thead><tbody>{matches.map((teacher) => <tr key={teacher.id}><td><button type="button" className="ae-row-btn" onClick={() => setSelectedTeacherId(teacher.id)}>{teacher.name}</button><br/><span className="ae-sub">{teacher.code} · {teacher.assignment || 'No assignment'}</span></td><td>{teacher.employeeType === 'temporary' ? 'Temporary' : 'Professional'}</td><td><AeStatus status={aeTeacherStatus(teacher)} /></td><td>{aeDate(teacher.dueDate)}</td></tr>)}</tbody></table></div>
    </section><section className="ae-card ae-span-5"><h3>Selected educator</h3>{selectedTeacher && selectedTeacher.cycleLockedAt && <div className="ae-note ae-warn" style={{ marginBottom: 12 }}>Employee category, data availability, and framework weights were frozen when cycle work began ({aeDateTime(selectedTeacher.cycleLockedAt)}).</div>}{!selectedTeacher ? <div className="ae-empty">Select an educator to review the assignment.</div> : <fieldset disabled={role !== 'evaluator' || !!selectedTeacher.finalizedAt || !!selectedTeacher.cycleLockedAt} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="ae-form-grid"><label className="ae-field"><span>Name</span><input className="ae-input" value={selectedTeacher.name} onChange={(event) => set('name', event.target.value)} /></label><label className="ae-field"><span>Staff code</span><input className="ae-input" value={selectedTeacher.code} onChange={(event) => set('code', event.target.value)} /></label></div>
      <label className="ae-field"><span>Assignment</span><input className="ae-input" value={selectedTeacher.assignment || ''} onChange={(event) => set('assignment', event.target.value)} placeholder="Grade / subject / role" /></label>
      <div className="ae-form-grid"><label className="ae-field"><span>Building</span><input className="ae-input" value={selectedTeacher.building || ''} onChange={(event) => set('building', event.target.value)} /></label><label className="ae-field"><span>{isRemote ? 'Lead evaluator display label' : 'Lead evaluator'}</span><input className="ae-input" value={selectedTeacher.evaluator || ''} readOnly={isRemote} onChange={isRemote ? undefined : (event) => set('evaluator', event.target.value)} /></label></div>{isRemote && <div className="ae-note ae-warn" style={{ marginBottom: 12 }}><strong>Portal access is separate from this profile.</strong><br/>Evaluator assignments are managed by an authorized district administrator or IT. This display label does not grant or revoke access.</div>}
      <div className="ae-form-grid"><label className="ae-field"><span>{AE_ACTIVE_FW.id === 'pa_act13' ? 'Employee type' : 'Contract status'}</span><select className="ae-select" value={selectedTeacher.employeeType} onChange={(event) => set('employeeType', event.target.value)}><option value="professional">{AE_ACTIVE_FW.id === 'pa_act13' ? 'Professional classroom teacher' : 'Continuing contract'}</option><option value="temporary">{AE_ACTIVE_FW.id === 'pa_act13' ? 'Temporary professional employee' : 'Probationary (years 1–3)'}</option></select></label><label className="ae-field"><span>Cycle due date</span><input className="ae-input" type="date" value={selectedTeacher.dueDate || ''} onChange={(event) => set('dueDate', event.target.value)} /></label></div>
      {AE_ACTIVE_FW.id === 'pa_act13' && <label className="ae-check"><input type="checkbox" checked={selectedTeacher.buildingData !== false} onChange={(event) => set('buildingData', event.target.checked)} /><span>Building Level Data is available for this assignment.</span></label>}
      {AE_ACTIVE_FW.id === 'pa_act13' && <label className="ae-check"><input type="checkbox" checked={selectedTeacher.teacherSpecificData !== false} onChange={(event) => set('teacherSpecificData', event.target.checked)} /><span>Teacher-Specific Data is attributable to this educator.</span></label>}{AE_ACTIVE_FW.id !== 'pa_act13' && selectedTeacher.employeeType === 'temporary' && <div className="ae-note" style={{ marginTop: 8 }}>Probationary educators are evaluated at least once each year of the three-year probationary period, with more frequent observation cycles than continuing-contract educators (board policy GCOA; PEPG guidebook).</div>}
      <label className="ae-check"><input type="checkbox" checked={selectedTeacher.active !== false} onChange={(event) => set('active', event.target.checked)} /><span>Include in the current cycle denominator.</span></label>
      <div className="ae-note">Current pie: {aeWeightProfile(selectedTeacher).map((part) => part.short + ' ' + part.weight + '%').join(' · ')}</div>
    </fieldset>}</section></div>
  </div>;
}

function AeComponentChecks({ selected, onChange, disabled }) {
  const values = Array.isArray(selected) ? selected : [];
  return <div><span className="ae-legend-label">Evidence tags</span>{AE_DOMAINS.map((domain) => <details className="ae-domain" key={domain.id}><summary>{domain.code}. {domain.label}</summary><div className="ae-domain-body">{((AE_ACTIVE_FW.components && AE_ACTIVE_FW.components[domain.id]) || domain.components).map(([code, label]) => <label className="ae-check" key={code}><input disabled={disabled} type="checkbox" checked={values.includes(code)} onChange={(event) => onChange(event.target.checked ? values.concat(code) : values.filter((item) => item !== code))}/><span><strong>{code}</strong> · {label}</span></label>)}</div></details>)}</div>;
}

function AeWalkthroughs({ workspace, selectedTeacher, setSelectedTeacherId, role, createWalkthrough, publishWalkthrough, addComment, acknowledgeWalkthrough, isRemote = false, readOnlyPreview = false }) {
  const teachers = workspace.teachers.filter((teacher) => teacher.active !== false);
  const [showForm, setShowForm] = React.useState(false);
  const [openId, setOpenId] = React.useState('');
  const blank = () => ({ teacherId: selectedTeacher ? selectedTeacher.id : (teachers[0] && teachers[0].id) || '', date: aeToday(), startedAt: '', durationMin: '8', announced: 'unannounced', lessonPhase: 'middle', subject: '', evidence: '', interpretation: '', componentTags: [], privacyChecked: false });
  const [draft, setDraft] = React.useState(blank);
  const [draftReleaseChecked, setDraftReleaseChecked] = React.useState(false);
  React.useEffect(() => { if (!draft.teacherId && selectedTeacher) setDraft((value) => Object.assign({}, value, { teacherId: selectedTeacher.id })); }, [selectedTeacher && selectedTeacher.id]);
  const records = workspace.walkthroughs.filter((record) => role !== 'teacher' || (selectedTeacher && record.teacherId === selectedTeacher.id && !!record.publishedAt)).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const submit = (published) => {
    if (!draft.teacherId || !draft.evidence.trim()) return;
    if (published && !draft.privacyChecked) return;
    const id = createWalkthrough(Object.assign({}, draft, { published })); setOpenId(id); setShowForm(false); setDraft(blank());
  };
  const startOrClose = () => {
    if (showForm) { setShowForm(false); return; }
    if (!draft.startedAt) setDraft(Object.assign({}, draft, { startedAt: aeNow() }));
    setShowForm(true);
  };
  return <div className="ae-page"><div className="ae-heading"><div><h2>Walkthrough observations</h2><p>A middle-of-lesson visit captures factual evidence. It does not replace a comprehensive observation or auto-score a rubric.</p></div>{role === 'evaluator' && <button type="button" className="ae-btn ae-btn-primary" onClick={startOrClose}>{showForm ? 'Close draft' : (draft.startedAt ? 'Resume walkthrough draft' : '+ Start walkthrough')}</button>}</div>
    {role === 'teacher' && <div className="ae-note"><strong>{selectedTeacher ? selectedTeacher.name : 'Educator record'}</strong> · {isRemote ? 'Only records assigned to this district account are shown; private evaluator drafts remain hidden.' : 'Teacher view shows only the selected educator’s published records. Role switching previews this perspective on the same device; it is not a sign-in.'}</div>}
    {showForm && role === 'evaluator' && <section className="ae-card" style={{ marginBottom: 16 }}><h3>New walkthrough evidence</h3><p className="ae-sub">Keep witnessed evidence separate from interpretation or feedback.</p><div className="ae-form-grid" style={{ marginTop: 12 }}>
      <label className="ae-field"><span>Educator</span><select className="ae-select" value={draft.teacherId} onChange={(event) => setDraft(Object.assign({}, draft, { teacherId: event.target.value }))}><option value="">Choose</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label>
      <label className="ae-field"><span>Date</span><input className="ae-input" type="date" value={draft.date} onChange={(event) => setDraft(Object.assign({}, draft, { date: event.target.value }))}/></label>
      <label className="ae-field"><span>Announced?</span><select className="ae-select" value={draft.announced} onChange={(event) => setDraft(Object.assign({}, draft, { announced: event.target.value }))}><option value="unannounced">Unannounced</option><option value="announced">Announced</option></select></label>
      <label className="ae-field"><span>Duration (minutes)</span><input className="ae-input" type="number" min="1" max="180" value={draft.durationMin} onChange={(event) => setDraft(Object.assign({}, draft, { durationMin: event.target.value }))}/></label>
      <label className="ae-field"><span>Lesson phase</span><select className="ae-select" value={draft.lessonPhase} onChange={(event) => setDraft(Object.assign({}, draft, { lessonPhase: event.target.value }))}><option value="opening">Opening</option><option value="middle">Middle of lesson</option><option value="guided_practice">Guided practice</option><option value="independent_practice">Independent practice</option><option value="closure">Closure</option></select></label>
      <label className="ae-field"><span>Course / subject</span><input className="ae-input" value={draft.subject} onChange={(event) => setDraft(Object.assign({}, draft, { subject: event.target.value }))}/></label>
    </div><label className="ae-field"><span>Directly witnessed evidence</span><textarea className="ae-textarea" value={draft.evidence} onChange={(event) => setDraft(Object.assign({}, draft, { evidence: event.target.value }))} placeholder="At 10:14, the teacher asked… Six students… The posted objective read…"/><span className="ae-help">Record observable words, actions, artifacts, and student responses. Avoid student names.</span><span className="ae-help">Evidence that stems from a parent, student, or other complaint generally must be put in writing and promptly disclosed to the educator (e.g., PEA Article 16.B) — note the complaint origin here.</span></label>
    <label className="ae-field"><span>Interpretation / feedback (separate)</span><textarea className="ae-textarea" value={draft.interpretation} onChange={(event) => setDraft(Object.assign({}, draft, { interpretation: event.target.value }))} placeholder="Possible strength, question, or area for discussion…"/></label>
    <AeComponentChecks selected={draft.componentTags} onChange={(componentTags) => setDraft(Object.assign({}, draft, { componentTags }))}/>
    <label className="ae-check"><input type="checkbox" checked={draft.privacyChecked} onChange={(event) => setDraft(Object.assign({}, draft, { privacyChecked: event.target.checked }))}/><span>I reviewed these notes and removed student-identifying information.</span></label>
    <div className="ae-actions"><button type="button" className="ae-btn" disabled={!draft.teacherId || !draft.evidence.trim()} onClick={() => submit(false)}>Save private draft</button><button type="button" className="ae-btn ae-btn-primary" disabled={!draft.teacherId || !draft.evidence.trim() || !draft.privacyChecked} onClick={() => submit(true)}>Publish to teacher</button></div>
    </section>}
    <div className="ae-grid"><section className="ae-card ae-span-5"><h3>Visit records</h3>{records.length === 0 ? <div className="ae-empty">No walkthroughs yet.</div> : records.map((record) => { const teacher = workspace.teachers.find((item) => item.id === record.teacherId); return <button type="button" key={record.id} className="ae-record" style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setOpenId(record.id); setSelectedTeacherId(record.teacherId); }}><div className="ae-record-head"><div><h4>{teacher ? teacher.name : 'Unknown educator'}</h4><div className="ae-meta"><span>{aeDate(record.date)}</span><span>{record.durationMin} min</span><span>{record.announced}</span></div></div><span className={'ae-chip ' + (record.publishedAt ? 'ae-chip-good' : 'ae-chip-neutral')}>{record.publishedAt ? 'Published' : 'Private draft'}</span></div><p className="ae-sub" style={{ marginTop: 8 }}>{record.evidence.slice(0, 120)}{record.evidence.length > 120 ? '…' : ''}</p></button>; })}</section>
      <section className="ae-card ae-span-7"><h3>Walkthrough detail</h3>{!openId ? <div className="ae-empty">Choose a visit to review evidence and conversation.</div> : (() => { const record = records.find((item) => item.id === openId); if (!record) return <div className="ae-empty">Record not found.</div>; const teacher = workspace.teachers.find((item) => item.id === record.teacherId); return <><div className="ae-record-head"><div><h4>{teacher ? teacher.name : 'Unknown educator'} · {aeDate(record.date)}</h4><div className="ae-meta"><span>Started {aeDateTime(record.startedAt)}</span><span>{record.durationMin} minutes</span><span>{record.lessonPhase.replace(/_/g, ' ')}</span></div></div><span className={'ae-chip ' + (record.publishedAt ? 'ae-chip-good' : ((Date.now() - new Date(record.startedAt).getTime()) > 14 * 86400000 ? 'ae-chip-amber' : 'ae-chip-neutral'))}>{record.publishedAt ? 'Published snapshot' : ((Date.now() - new Date(record.startedAt).getTime()) > 14 * 86400000 ? 'Private draft · ' + Math.floor((Date.now() - new Date(record.startedAt).getTime()) / 86400000) + ' days unpublished' : 'Private evaluator draft')}</span></div><h4>Directly witnessed evidence</h4><div className="ae-evidence">{record.evidence}</div>{record.interpretation && <><h4>Interpretation / feedback</h4><div className="ae-evidence ae-interpretation">{record.interpretation}</div></>}<div className="ae-chips">{record.componentTags.map((code) => <span className="ae-chip ae-chip-blue" key={code}>{code}</span>)}</div>{!record.publishedAt && role === 'evaluator' && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><label className="ae-check"><input type="checkbox" checked={draftReleaseChecked} onChange={(event) => setDraftReleaseChecked(event.target.checked)}/><span>I reviewed this saved draft and removed student-identifying information.</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!draftReleaseChecked} onClick={() => { publishWalkthrough(record.id); setDraftReleaseChecked(false); }}>Publish saved draft to teacher</button><p className="ae-help">Unpublished drafts never enter the educator’s record, documents, or trends — but they also sit outside the educator’s review rights. Publish promptly, or clear notes you do not intend to publish.</p></div>}{record.publishedAt && role === 'teacher' && !record.teacherAcknowledgedAt && <div style={{ marginTop: 12 }}><button type="button" className="ae-btn ae-btn-primary" disabled={readOnlyPreview} title={readOnlyPreview ? 'Preview only; no acknowledgment is recorded.' : undefined} onClick={() => acknowledgeWalkthrough(record.id)}>Acknowledge receipt</button><p className="ae-help">Acknowledgment records receipt, not agreement, and is not the signature your district’s evaluation form asks for at the conference.</p></div>}{record.teacherAcknowledgedAt && <div className="ae-note ae-ok" style={{ marginTop: 12 }}>Teacher acknowledged receipt {aeDateTime(record.teacherAcknowledgedAt)}.</div>}{record.publishedAt && <AeThread workspace={workspace} recordType="walkthrough" recordId={record.id} teacherId={record.teacherId} role={role} onAdd={addComment} readOnlyPreview={readOnlyPreview}/>}</>; })()}</section>
    </div>
  </div>;
}

const AE_OBS_STEPS = ['Assigned', 'Prework', 'Pre-conference', 'Observation', 'Evidence review', 'Reflection', 'Post-conference', 'Ratings', 'Acknowledged', 'Finalized'];

function AeObservationStepper({ observation }) {
  const step = aeStepOfObservation(observation);
  return <ol className="ae-stepper" aria-label={'Formal observation progress: step ' + (step + 1) + ' of 10, ' + AE_OBS_STEPS[step]}>{AE_OBS_STEPS.map((label, index) => <li key={label} className={'ae-step ' + (index < step ? 'ae-step-done' : '') + (index === step ? ' ae-step-current' : '')} aria-current={index === step ? 'step' : undefined}>{label}</li>)}</ol>;
}

function AeFormalRecordSummary({ observation, role }) {
  const prework = observation.prework || {};
  const Item = ({ label, value }) => value ? <div style={{ marginTop: 10 }}><strong>{label}</strong><div className="ae-evidence">{value}</div></div> : null;
  const canSeePrework = role === 'teacher' || !!observation.preworkSubmittedAt;
  const canSeeEvidence = role === 'evaluator' || !!observation.evidencePublishedAt;
  const canSeeReflection = role === 'teacher' || !!observation.reflectionSubmittedAt;
  const canSeeConference = role === 'evaluator' || !!observation.postConferenceAt;
  return <div className="ae-card" style={{ marginTop: 16 }}><h3>Persistent record summary</h3><p className="ae-sub">Submitted material remains visible after the workflow advances; unsubmitted teacher drafts stay private.</p>
    {canSeePrework ? <details className="ae-domain" open><summary>Pre-observation materials</summary><div className="ae-domain-body"><Item label="Lesson / unit plan" value={prework.plan}/><Item label="Expected outcomes" value={prework.outcomes}/><Item label="Resources and planned supports" value={prework.resources}/><Item label="Assessment / evidence of learning" value={prework.assessment}/><Item label="Secure artifact references" value={prework.artifactReferences}/></div></details> : <div className="ae-note">Pre-observation materials have not been submitted.</div>}
    {canSeeEvidence && <Item label="Published observation evidence" value={observation.evidence}/>}
    {canSeeReflection && <Item label="Teacher reflection" value={observation.reflection}/>}
    {canSeeConference && <Item label="Post-conference discussion and follow-up" value={observation.postConferenceNotes}/>}
    <div className="ae-note ae-warn" style={{ marginTop: 12 }}>This workspace stores text and district-authorized document references only. Secure file upload, versioning, and retention arrive with the district portal.</div>
  </div>;
}
function AeFormalObservations({ workspace, selectedTeacher, setSelectedTeacherId, role, createObservation, updateObservation, updateTeacher, addComment, readOnlyPreview = false }) {
  const [openId, setOpenId] = React.useState('');
  const teachers = workspace.teachers.filter((teacher) => teacher.active !== false);
  const records = workspace.observations.filter((record) => role !== 'teacher' || (selectedTeacher && record.teacherId === selectedTeacher.id));
  const active = (selectedTeacher && records.find((record) => record.id === openId && record.teacherId === selectedTeacher.id)) || (selectedTeacher && records.find((record) => record.teacherId === selectedTeacher.id)) || null;
  React.useEffect(() => { if (active && !openId) setOpenId(active.id); }, [active && active.id]);
  const patch = (changes, event, summary) => updateObservation(active.id, changes, event, summary);
  return <div className="ae-page"><div className="ae-heading"><div><h2>Formal comprehensive observations</h2><p>Prework, conferences, observed evidence, reflection, human ratings, acknowledgment, and finalization remain distinct.</p></div>{role === 'evaluator' && <button type="button" className="ae-btn ae-btn-primary" disabled={!selectedTeacher || records.some((record) => record.teacherId === selectedTeacher.id && !record.finalizedAt)} onClick={() => setOpenId(createObservation(selectedTeacher.id))}>+ Assign formal observation</button>}</div>
    {role === 'evaluator' ? <div className="ae-toolbar"><label className="ae-field" style={{ minWidth: 260, margin: 0 }}><span>Educator</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => { setSelectedTeacherId(event.target.value); const found = records.find((record) => record.teacherId === event.target.value); setOpenId(found ? found.id : ''); }}><option value="">Choose an educator</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label></div> : selectedTeacher && <div className="ae-note">Viewing records for {selectedTeacher.name} · {selectedTeacher.code}</div>}
    {!active ? <div className="ae-card ae-empty">{selectedTeacher ? 'No formal observation has been assigned for this educator.' : 'Choose an educator to begin.'}</div> : (() => {
      const teacher = workspace.teachers.find((item) => item.id === active.teacherId);
      const step = aeStepOfObservation(active);
      return <><section className="ae-card"><div className="ae-record-head"><div><h3>{teacher ? teacher.name : 'Educator'} · Formal observation</h3><p className="ae-sub">Assigned {aeDateTime(active.createdAt)} · Framework snapshot {active.frameworkVersion}</p></div><span className="ae-chip ae-chip-blue">Step {step + 1} of 10</span></div><AeObservationStepper observation={active}/></section>
      <div className="ae-grid" style={{ marginTop: 16 }}>
        <section className="ae-card ae-span-7"><h3>Current workflow step</h3>
          {step === 0 && role === 'teacher' && <fieldset disabled={readOnlyPreview} style={{ border: 0, padding: 0, margin: 0 }}><div className="ae-note">Submit your lesson or unit plan and expected learning outcomes before the pre-conference.</div><label className="ae-field"><span>Lesson / unit plan summary</span><textarea className="ae-textarea" value={(active.prework && active.prework.plan) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { plan: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>Expected student learning outcomes</span><textarea className="ae-textarea" value={(active.prework && active.prework.outcomes) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { outcomes: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>Resources and planned supports</span><textarea className="ae-textarea" value={(active.prework && active.prework.resources) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { resources: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>Assessment / evidence of learning</span><textarea className="ae-textarea" value={(active.prework && active.prework.assessment) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { assessment: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')}/></label><label className="ae-field"><span>Secure artifact references / links</span><textarea className="ae-textarea" value={(active.prework && active.prework.artifactReferences) || ''} onChange={(event) => patch({ prework: Object.assign({}, active.prework, { artifactReferences: event.target.value }) }, 'DRAFT_SAVED', 'Pre-observation draft saved')} placeholder="District Drive document ID or approved secure link — no student names"/><span className="ae-help">File uploads are intentionally unavailable in this workspace; use only district-approved secure references.</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.prework || !active.prework.plan || !active.prework.outcomes} onClick={() => patch({ preworkSubmittedAt: aeNow() }, 'SUBMITTED', 'Pre-observation materials submitted')}>Submit pre-observation materials</button></fieldset>}
          {step === 0 && role === 'evaluator' && <div className="ae-empty">Waiting for the educator’s pre-observation materials. Switch to Educator view to enter them on their behalf, or ask them to submit from their own device.</div>}
          {step === 1 && <div><h4>Teacher submission</h4><div className="ae-evidence">{active.prework && active.prework.plan}</div><h4>Expected outcomes</h4><div className="ae-evidence">{active.prework && active.prework.outcomes}</div>{role === 'evaluator' ? <><label className="ae-field"><span>Pre-conference notes</span><textarea className="ae-textarea" value={active.preConferenceNotes || ''} onChange={(event) => patch({ preConferenceNotes: event.target.value }, 'DRAFT_SAVED', 'Pre-conference notes updated')}/></label><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ preConferenceAt: aeNow() }, 'CONFERENCED', 'Pre-conference completed')}>Mark pre-conference complete</button></> : <div className="ae-note">Submitted {aeDateTime(active.preworkSubmittedAt)}. Awaiting evaluator pre-conference.</div>}</div>}
          {step === 2 && role === 'evaluator' && <div><label className="ae-field"><span>Observation date and time</span><input className="ae-input" type="datetime-local" value={active.observedLocal || ''} onChange={(event) => patch({ observedLocal: event.target.value }, 'DRAFT_SAVED', 'Observation schedule updated')}/></label><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ observedAt: active.observedLocal ? new Date(active.observedLocal).toISOString() : aeNow() }, 'OBSERVATION_STARTED', 'Formal observation started')}>Start observation</button></div>}
          {step === 2 && role === 'teacher' && <div className="ae-note">Pre-conference completed {aeDateTime(active.preConferenceAt)}. The evaluator will record observed evidence.</div>}
          {step === 3 && role === 'evaluator' && <div><label className="ae-field"><span>Time-stamped factual evidence</span><textarea className="ae-textarea" style={{ minHeight: 180 }} value={active.evidence || ''} onChange={(event) => patch({ evidence: event.target.value }, 'DRAFT_SAVED', 'Observation evidence draft saved')} placeholder="10:04 — Posted learning outcome…\n10:11 — Students discussed…"/><span className="ae-help">Evidence that stems from a parent, student, or other complaint generally must be put in writing and promptly disclosed to the educator (e.g., PEA Article 16.B) — note the complaint origin here.</span></label><AeComponentChecks selected={active.componentTags || []} onChange={(componentTags) => patch({ componentTags }, 'DRAFT_SAVED', 'Evidence tags updated')}/><label className="ae-check"><input type="checkbox" checked={!!active.privacyChecked} onChange={(event) => patch({ privacyChecked: event.target.checked }, 'DRAFT_SAVED', 'Privacy review updated')}/><span>I reviewed the evidence and removed student-identifying information.</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.evidence || !active.privacyChecked} onClick={() => patch({ evidencePublishedAt: aeNow() }, 'EVIDENCE_PUBLISHED', 'Formal observation evidence published')}>Publish evidence to teacher</button></div>}
          {step === 3 && role === 'teacher' && <div className="ae-note">Formal observation is in progress. Evidence remains private until the evaluator publishes it.</div>}
          {step === 4 && <div><h4>Published evidence</h4><div className="ae-evidence">{active.evidence}</div><div className="ae-chips">{(active.componentTags || []).map((code) => <span className="ae-chip ae-chip-blue" key={code}>{code}</span>)}</div>{role === 'teacher' ? <fieldset disabled={readOnlyPreview} style={{ border: 0, padding: 0, margin: 0 }}><label className="ae-field"><span>Reflection / self-assessment</span><textarea className="ae-textarea" value={active.reflection || ''} onChange={(event) => patch({ reflection: event.target.value }, 'DRAFT_SAVED', 'Teacher reflection draft saved')} placeholder="What worked, what evidence supports that, and what would you change?"/></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.reflection} onClick={() => patch({ reflectionSubmittedAt: aeNow() }, 'SUBMITTED', 'Teacher reflection submitted')}>Submit reflection</button></fieldset> : <div className="ae-note">Awaiting teacher reflection. The evidence snapshot remains immutable; clarification belongs in the conversation.</div>}</div>}
          {step === 5 && role === 'evaluator' && <div><h4>Teacher reflection</h4><div className="ae-evidence">{active.reflection}</div><label className="ae-field"><span>Post-conference discussion and follow-up</span><textarea className="ae-textarea" value={active.postConferenceNotes || ''} onChange={(event) => patch({ postConferenceNotes: event.target.value }, 'DRAFT_SAVED', 'Post-conference notes updated')}/></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.postConferenceNotes} onClick={() => patch({ postConferenceAt: aeNow() }, 'CONFERENCED', 'Post-conference completed')}>Mark post-conference complete</button></div>}
          {step === 5 && role === 'teacher' && <div className="ae-note">Reflection submitted {aeDateTime(active.reflectionSubmittedAt)}. Awaiting the post-conference.</div>}
          {step === 6 && role === 'evaluator' && <div><div className="ae-note ae-warn">Assign each rating yourself and enter an evidence-linked rationale. The software performs arithmetic only.</div><div className="ae-rating-grid" style={{ marginTop: 12 }}>{AE_DOMAINS.map((domain) => <div className="ae-rating-card" key={domain.id}><h4>{domain.code}. {domain.label}</h4><label className="ae-field"><span>Rating</span><select className="ae-select" value={(active.ratings && active.ratings[domain.id]) == null ? '' : active.ratings[domain.id]} onChange={(event) => patch({ ratings: Object.assign({}, active.ratings, { [domain.id]: event.target.value === '' ? null : Number(event.target.value) }) }, 'RATING_UPDATED', 'Formal observation rating updated')}><option value="">Not rated</option>{AE_RATINGS.map((rating) => <option key={rating.value} value={rating.value}>{rating.value} · {(AE_ACTIVE_FW.ratingLabels && AE_ACTIVE_FW.ratingLabels[rating.value]) || rating.label}</option>)}</select></label><label className="ae-field"><span>Rationale</span><textarea className="ae-textarea" style={{ minHeight: 82 }} value={(active.rationales && active.rationales[domain.id]) || ''} onChange={(event) => patch({ rationales: Object.assign({}, active.rationales, { [domain.id]: event.target.value }) }, 'DRAFT_SAVED', 'Rating rationale updated')}/></label></div>)}</div><button type="button" className="ae-btn ae-btn-primary" disabled={AE_DOMAINS.some((domain) => !active.ratings || active.ratings[domain.id] == null || !active.rationales || !active.rationales[domain.id])} onClick={() => patch({ evaluatorSignedAt: aeNow() }, 'SIGNED', 'Evaluator signed formal observation')}>Sign evaluator assessment</button></div>}
          {step === 6 && role === 'teacher' && <div className="ae-note">Post-conference completed {aeDateTime(active.postConferenceAt)}. Awaiting evaluator ratings and rationale.</div>}
          {step === 7 && role === 'teacher' && <div><h4>Evaluator assessment</h4><div className="ae-rating-grid">{AE_DOMAINS.map((domain) => <div className="ae-rating-card" key={domain.id}><h4>{domain.label}</h4><div className="ae-score">{active.ratings[domain.id]}</div><p className="ae-sub">{aeRatingLabel(active.ratings[domain.id])}</p><p>{active.rationales[domain.id]}</p></div>)}</div><fieldset disabled={readOnlyPreview} style={{ border: 0, padding: 0, margin: 0 }}><label className="ae-check"><input type="checkbox" checked={!!active.ackChecked} onChange={(event) => patch({ ackChecked: event.target.checked }, 'DRAFT_SAVED', 'Acknowledgment confirmation updated')}/><span>I received this record and had an opportunity to discuss it. I understand acknowledgment does not mean agreement.</span></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.ackChecked} onClick={() => patch({ teacherAcknowledgedAt: aeNow() }, 'ACKNOWLEDGED', 'Teacher acknowledged formal observation')}>Acknowledge receipt</button></fieldset></div>}
          {step === 7 && role === 'evaluator' && <div className="ae-note">Evaluator signed {aeDateTime(active.evaluatorSignedAt)}. Awaiting teacher acknowledgment; acknowledgment does not indicate agreement.</div>}
          {step === 8 && role === 'evaluator' && <div><div className="ae-note ae-ok">Teacher acknowledged receipt {aeDateTime(active.teacherAcknowledgedAt)}.</div><p>This finalizes this observation snapshot. Annual O&amp;P domain ratings remain a separate, explicit judgment informed by all cycle evidence; this observation does not overwrite them.</p><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ finalizedAt: aeNow() }, 'FINALIZED', 'Formal observation finalized')}>Finalize formal observation</button></div>}
          {step === 8 && role === 'teacher' && <div className="ae-note">Acknowledgment recorded. Awaiting evaluator finalization.</div>}
          {step === 9 && <div className="ae-note ae-ok"><strong>Formal observation finalized.</strong><br/>Finalized {aeDateTime(active.finalizedAt)}. Published versions remain locked; later context appears as appended comments.</div>}
        </section>
        <aside className="ae-span-5"><AeFrameworkReference/><AeFormalRecordSummary observation={active} role={role}/><div className="ae-card" style={{ marginTop: 16 }}><AeThread workspace={workspace} recordType="formal_observation" recordId={active.id} teacherId={active.teacherId} role={role} onAdd={addComment} readOnlyPreview={readOnlyPreview}/></div></aside>
      </div></>;
    })()}
  </div>;
}

function AeSpm({ workspace, selectedTeacher, setSelectedTeacherId, role, createSpm, updateSpm, updateTeacher, addComment, readOnlyPreview = false }) {
  const [openId, setOpenId] = React.useState('');
  const teachers = workspace.teachers.filter((teacher) => teacher.active !== false);
  const records = workspace.spms.filter((record) => role !== 'teacher' || (selectedTeacher && record.teacherId === selectedTeacher.id));
  const active = (selectedTeacher && records.find((record) => record.id === openId && record.teacherId === selectedTeacher.id)) || (selectedTeacher && records.find((record) => record.teacherId === selectedTeacher.id)) || null;
  React.useEffect(() => { if (active && !openId) setOpenId(active.id); }, [active && active.id]);
  React.useEffect(() => {
    if (active && role === 'evaluator' && active.status === 'submitted' && !active.firstOpenedAt) updateSpm(active.id, { firstOpenedAt: aeNow() }, 'OPENED', 'SPM plan first opened by evaluator');
  }, [active && active.id, active && active.status, role]);
  const patch = (changes, event, summary) => updateSpm(active.id, changes, event, summary);
  const canEditPlan = active && role === 'teacher' && !readOnlyPreview && ['draft', 'returned'].includes(active.status);
  return <div className="ae-page"><div className="ae-heading"><div><h2>SPM / SLO</h2><p>{AE_ACTIVE_FW.id === 'pa_act13' ? 'Current Act 13 terminology is LEA Selected Measure · Student Performance Measure (SPM); SLO remains a familiar local alias.' : 'Under Maine PEPG this record holds the Student Learning &amp; Growth measure; SPM/SLO remain familiar aliases.'}</p></div>{role === 'teacher' && selectedTeacher && !records.some((record) => record.teacherId === selectedTeacher.id) && <button type="button" className="ae-btn ae-btn-primary" disabled={readOnlyPreview} title={readOnlyPreview ? 'Preview only; no proposal is created.' : undefined} onClick={() => setOpenId(createSpm(selectedTeacher.id))}>+ Start SPM proposal</button>}</div>
    {role === 'evaluator' ? <div className="ae-toolbar"><label className="ae-field" style={{ minWidth: 260, margin: 0 }}><span>Educator</span><select className="ae-select" value={selectedTeacher ? selectedTeacher.id : ''} onChange={(event) => { setSelectedTeacherId(event.target.value); const found = workspace.spms.find((record) => record.teacherId === event.target.value); setOpenId(found ? found.id : ''); }}><option value="">Choose an educator</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label></div> : selectedTeacher && <div className="ae-note">Viewing records for {selectedTeacher.name} · {selectedTeacher.code}</div>}
    {!active ? <div className="ae-card ae-empty">{selectedTeacher ? (role === 'teacher' ? 'Start a proposal for the selected educator.' : 'No SPM has been submitted for this educator.') : 'Choose an educator.'}</div> : (() => { const teacher = workspace.teachers.find((item) => item.id === active.teacherId); return <div className="ae-grid"><section className="ae-card ae-span-7"><div className="ae-record-head"><div><h3>{teacher ? teacher.name : 'Educator'} · SPM plan</h3><p className="ae-sub">Version {active.version || 1} · created {aeDateTime(active.createdAt)}</p></div><span className="ae-chip ae-chip-blue">{active.status.replace(/_/g, ' ')}</span></div>
      {active.returnReason && <div className="ae-note ae-danger" style={{ marginTop: 12 }}><strong>Returned for revision:</strong> {active.returnReason}</div>}
      <fieldset disabled={!canEditPlan} style={{ border: 0, padding: 0, margin: '14px 0 0' }}><label className="ae-field"><span>Classroom context and priority learning need</span><textarea className="ae-textarea" value={active.context || ''} onChange={(event) => patch({ context: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>Baseline</span><textarea className="ae-textarea" value={active.baseline || ''} onChange={(event) => patch({ baseline: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>Unit / goal statement and expected outcomes</span><textarea className="ae-textarea" value={active.goal || ''} onChange={(event) => patch({ goal: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>Performance measures and indicators</span><textarea className="ae-textarea" value={active.measures || ''} onChange={(event) => patch({ measures: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label><label className="ae-field"><span>Action plan, supports, and evidence sources</span><textarea className="ae-textarea" value={active.actionPlan || ''} onChange={(event) => patch({ actionPlan: event.target.value }, 'DRAFT_SAVED', 'SPM draft saved')}/></label></fieldset>
      {canEditPlan && <button type="button" className="ae-btn ae-btn-primary" disabled={!active.context || !active.baseline || !active.goal || !active.measures || !active.actionPlan} onClick={() => patch({ status: 'submitted', submittedAt: aeNow(), version: (active.version || 1) + (active.status === 'returned' ? 1 : 0), returnReason: '' }, 'SUBMITTED', 'SPM plan submitted')}>Submit plan for approval</button>}
      {active.status === 'submitted' && role === 'evaluator' && <div style={{ marginTop: 14 }}><div className="ae-note">Submitted by teacher {aeDateTime(active.submittedAt)}. Approval locks this version; a material revision will require renewed approval.</div><label className="ae-field"><span>Reason if returning</span><textarea className="ae-textarea" value={active.pendingReturnReason || ''} onChange={(event) => patch({ pendingReturnReason: event.target.value }, 'DRAFT_SAVED', 'Return reason drafted')}/></label><div className="ae-actions"><button type="button" className="ae-btn" disabled={!active.pendingReturnReason} onClick={() => patch({ status: 'returned', returnedAt: aeNow(), returnReason: active.pendingReturnReason, pendingReturnReason: '' }, 'RETURNED', 'SPM plan returned for revision')}>Return for revision</button><button type="button" className="ae-btn ae-btn-primary" onClick={() => patch({ status: 'approved', firstOpenedAt: active.firstOpenedAt || aeNow(), approvedAt: aeNow(), approvedBy: workspace.config.evaluatorName }, 'APPROVED', 'SPM plan approved')}>Approve plan</button></div></div>}
      {active.status === 'submitted' && role === 'teacher' && <div className="ae-note" style={{ marginTop: 12 }}>Submitted {aeDateTime(active.submittedAt)}. Awaiting evaluator action.</div>}
      {active.status === 'approved' && role === 'teacher' && <fieldset disabled={readOnlyPreview} style={{ border: 0, padding: 0, margin: '14px 0 0' }}><div className="ae-note ae-ok">Plan approved by {active.approvedBy} {aeDateTime(active.approvedAt)}.</div><label className="ae-field"><span>Year-end results</span><textarea className="ae-textarea" value={active.results || ''} onChange={(event) => patch({ results: event.target.value }, 'DRAFT_SAVED', 'SPM results draft saved')}/></label><label className="ae-field"><span>Teacher reflection</span><textarea className="ae-textarea" value={active.reflection || ''} onChange={(event) => patch({ reflection: event.target.value }, 'DRAFT_SAVED', 'SPM reflection draft saved')}/></label><button type="button" className="ae-btn ae-btn-primary" disabled={!active.results || !active.reflection} onClick={() => patch({ status: 'results_submitted', resultsSubmittedAt: aeNow() }, 'SUBMITTED', 'SPM results submitted')}>Submit results and reflection</button></fieldset>}
      {active.status === 'approved' && role === 'evaluator' && <div className="ae-note ae-ok" style={{ marginTop: 12 }}>Plan approved. Awaiting year-end results from the teacher.</div>}
      {active.status === 'results_submitted' && role === 'evaluator' && <div style={{ marginTop: 14 }}><h4>Year-end results</h4><div className="ae-evidence">{active.results}</div><h4>Teacher reflection</h4><div className="ae-evidence">{active.reflection}</div><label className="ae-field"><span>Human-selected SPM rating</span><select className="ae-select" value={active.rating == null ? '' : active.rating} onChange={(event) => patch({ rating: event.target.value === '' ? null : Number(event.target.value) }, 'RATING_UPDATED', 'SPM rating updated')}><option value="">Not rated</option>{AE_RATINGS.map((rating) => <option value={rating.value} key={rating.value}>{rating.value} · {(AE_ACTIVE_FW.ratingLabels && AE_ACTIVE_FW.ratingLabels[rating.value]) || rating.label}</option>)}</select></label><label className="ae-field"><span>Rating rationale</span><textarea className="ae-textarea" value={active.ratingRationale || ''} onChange={(event) => patch({ ratingRationale: event.target.value }, 'DRAFT_SAVED', 'SPM rating rationale updated')}/></label><button type="button" className="ae-btn ae-btn-primary" disabled={active.rating == null || !active.ratingRationale} onClick={() => { updateTeacher(active.teacherId, (draft) => { draft.ratings.lea = active.rating; }, 'RATING_UPDATED', 'LEA Selected Measure rating recorded'); patch({ status: 'locked', lockedAt: aeNow() }, 'FINALIZED', 'SPM record rated and locked'); }}>Rate and lock record</button></div>}
      {active.status === 'results_submitted' && role === 'teacher' && <div className="ae-note" style={{ marginTop: 12 }}>Results submitted {aeDateTime(active.resultsSubmittedAt)}. Awaiting evaluator rating.</div>}
      {active.status === 'locked' && <div className="ae-note ae-ok" style={{ marginTop: 12 }}><strong>Rated and locked · {active.rating} ({aeBand(active.rating)})</strong><br/>Locked {aeDateTime(active.lockedAt)}. Plan approval and final result rating remain separate audit events.</div>}
      <AeThread workspace={workspace} recordType="spm" recordId={active.id} teacherId={active.teacherId} role={role} onAdd={addComment} readOnlyPreview={readOnlyPreview}/>
    </section><aside className="ae-card ae-span-5"><h3>Submission receipts</h3><div className="ae-timeline"><div className="ae-event"><h4>Created</h4><p>{aeDateTime(active.createdAt)}</p></div>{active.submittedAt && <div className="ae-event"><h4>Submitted</h4><p>{aeDateTime(active.submittedAt)}</p></div>}{active.firstOpenedAt && <div className="ae-event"><h4>First opened by evaluator</h4><p>{aeDateTime(active.firstOpenedAt)}</p></div>}{active.approvedAt && <div className="ae-event"><h4>Approved by {active.approvedBy}</h4><p>{aeDateTime(active.approvedAt)}</p></div>}{active.resultsSubmittedAt && <div className="ae-event"><h4>Results submitted</h4><p>{aeDateTime(active.resultsSubmittedAt)}</p></div>}{active.lockedAt && <div className="ae-event"><h4>Rated and locked</h4><p>{aeDateTime(active.lockedAt)}</p></div>}</div><div className="ae-note ae-warn">“Opened” is an automatic access receipt. It does not claim the person read or agreed with the contents; approval and acknowledgment are explicit actions.</div></aside></div>; })()}
  </div>;
}

function AeAuditExport({ workspace, selectedTeacher, exportWorkspace, exportCsv, exportSummary, exportGrowthSnapshot, importWorkspace, pendingImport, confirmPendingImport, cancelPendingImport, importUndo, undoImport, resetWorkspace, role, isRemote = false, exportEducatorPacket, exportResponsePacket, packetIncludeNames, setPacketIncludeNames }) {
  const [filter, setFilter] = React.useState('selected');
  const [clearStep, setClearStep] = React.useState(false);
  const fileRef = React.useRef(null);
  const isEvaluator = role === 'evaluator';
  const events = workspace.audit.filter((event) => isEvaluator && filter === 'all' ? true : (selectedTeacher && event.teacherId === selectedTeacher.id));
  return <div className="ae-page">
    <div className="ae-heading"><div><h2>{isEvaluator ? 'Audit, reports, and handoff' : 'My evaluation timeline'}</h2><p>Submission, approval, acknowledgment, comment, and finalization events are distinct.</p></div></div>
    <div className="ae-grid">
      <section className={'ae-card ' + (isEvaluator ? 'ae-span-7' : 'ae-span-12')}>
        <div className="ae-record-head"><div><h3>Audit timeline</h3><p className="ae-sub">{isRemote ? 'This permission-filtered timeline is loaded from the district repository; the server owns the authoritative audit history.' : 'On-device activity history; the district portal adds server-side tamper-evident logs.'}</p></div>{isEvaluator && <select className="ae-select" style={{ width: 'auto' }} value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter audit timeline"><option value="selected">Selected educator</option><option value="all">All educators</option></select>}</div>
        {events.length === 0 ? <div className="ae-empty">No matching audit events.</div> : <>{events.length > 150 && <p className="ae-sub">Showing the 150 most recent of {events.length} events; older history is not deleted and remains in the {isRemote ? 'district repository' : 'workspace export'}.</p>}<div className="ae-timeline">{events.slice(0, 150).map((event) => <div className="ae-event" key={event.id}><h4>{event.event.replace(/_/g, ' ')} · {event.summary}</h4><p>{event.actor} · {event.role} · {aeDateTime(event.at)}</p><p>{event.entityType} · version {event.version || 1}</p></div>)}</div></>}
      </section>
      {isRemote ? <section className="ae-card ae-span-12"><h3>District-controlled exports</h3><div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>Direct downloads, imports, and reset stay disabled in the portal.</strong><br/>Authorized administrators can create reviewed, audited, private exports from <strong>Setup &rarr; District operations center</strong>. Creating an export does not share it or designate it as the official record; district purpose, destination, retention, legal hold, and handoff rules still apply.</div></section> : isEvaluator ? <section className="ae-card ae-span-5">
        <h3>Export and transfer</h3>
        <p className="ae-sub">Exports can contain confidential personnel information. Store and transmit them only through district-authorized systems.</p>
        <div className="ae-actions" style={{ marginTop: 12 }}><button type="button" className="ae-btn" onClick={exportWorkspace}>Export workspace JSON</button><button type="button" className="ae-btn" onClick={exportCsv}>Export status CSV</button><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportSummary}>Workflow summary HTML</button><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportEducatorPacket}>Educator packet (send to educator)</button><label className="ae-field" style={{ marginTop: 8 }}><input type="checkbox" style={{ width: 24, height: 24 }} checked={packetIncludeNames} onChange={(event) => setPacketIncludeNames(event.target.checked)} /> <span>Include profile and display names in the packet</span></label><p className="ae-sub">When names are omitted, structured names become the educator code and role labels. <strong>Free-text evidence, comments, statements, and reflections are unchanged and may still identify people.</strong> Review the packet before sending it through a district-authorized channel.</p><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportGrowthSnapshot} title="Formative, no ratings: published bright spots, evidence progress, and documentation coverage — identical for educator and evaluator.">Growth snapshot (formative)</button></div>
        <hr style={{ border: 0, borderTop: '1px solid #d8deea', margin: '18px 0' }}/>
        <h4>Import workspace or educator response</h4>
        <p className="ae-sub">Selecting a file only prepares a review. Nothing changes until you inspect the summary and confirm it.</p>
        <button type="button" className="ae-btn" onClick={() => fileRef.current && fileRef.current.click()}>Choose JSON or educator packet</button>
        <input ref={fileRef} hidden tabIndex={-1} aria-label="Import evaluation workspace or educator response" type="file" accept="application/json,.json,text/html,.html,.htm" onChange={(event) => { const file = event.target.files && event.target.files[0]; if (file) importWorkspace(file); event.target.value = ''; }}/>
        {pendingImport && <div className="ae-note ae-warn" role="region" aria-live="polite" aria-labelledby="ae-import-review-title" style={{ marginTop: 12 }}>
          <h4 id="ae-import-review-title" style={{ marginTop: 0 }}>Review before applying</h4>
          <p><strong>{pendingImport.label}</strong></p>
          <dl className="ae-review-facts">{pendingImport.facts.map((fact) => <React.Fragment key={fact[0]}><dt>{fact[0]}</dt><dd>{fact[1]}</dd></React.Fragment>)}</dl>
          {pendingImport.warning && <p><strong>Check:</strong> {pendingImport.warning}</p>}
          <div className="ae-actions"><button type="button" className="ae-btn" onClick={cancelPendingImport}>Cancel</button><button type="button" className="ae-btn ae-btn-primary" onClick={confirmPendingImport}>{pendingImport.replacesWorkspace ? 'Download backup and replace workspace' : 'Apply this reviewed response'}</button></div>
        </div>}
        {importUndo && <div className="ae-note ae-ok" role="status" style={{ marginTop: 12 }}><strong>Import applied.</strong> The prior workspace remains available until your next edit.<div className="ae-actions" style={{ marginTop: 8 }}><button type="button" className="ae-btn" onClick={undoImport}>Undo import</button></div></div>}
        <div className="ae-note ae-warn" style={{ marginTop: 16 }}>This export assists front-end supervision work. {AE_ACTIVE_FW.id === 'pa_act13' ? 'PEERS or your LEA-authorized system' : 'Your district-authorized PEPG record system'} remains the official summative rating record for this MVP.</div>
        {workspace.config.sampleMode && <div style={{ marginTop: 18 }}><h4>Sample workspace</h4>{!clearStep ? <button type="button" className="ae-btn ae-btn-danger" onClick={() => setClearStep(true)}>Replace sample with blank workspace</button> : <div className="ae-note ae-danger"><strong>This removes all current on-device records.</strong><div className="ae-actions" style={{ marginTop: 8 }}><button className="ae-btn" type="button" onClick={() => setClearStep(false)}>Cancel</button><button className="ae-btn ae-btn-danger" type="button" onClick={() => { setClearStep(false); resetWorkspace(); }}>Confirm and start blank</button></div></div>}</div>}
      </section> : <section className="ae-card ae-span-12"><h3>My copy</h3><p className="ae-sub">Download only the selected educator’s workflow summary.</p><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportSummary}>Download my summary HTML</button><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportResponsePacket}>Export my response to send back</button><p className="ae-sub">Your statement, reflections and acknowledgements only. Ratings and evidence are not included, and cannot be changed by this file.</p><button type="button" className="ae-btn" disabled={!selectedTeacher} onClick={exportGrowthSnapshot}>Download my growth snapshot</button><div className="ae-note" style={{ marginTop: 12 }}>Teacher view cannot export or import the full workspace or view organization-wide audit events.</div></section>}
    </div>
  </div>;
}

// Share-by-QR: reuses the app's single QR implementation (window.__alloMakeQrSvg
// in the app shell; window.qrcode bundled into the standalone and portal pages).
// Remote mode encodes the district portal URL — sign-in still decides access.
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
    const path = 'apps_script/educator_evaluation_share/' + name;
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
  return <div><button type="button" className="ae-btn" onClick={copy} disabled={state === 'loading'}>{state === 'loading' ? 'Loading source…' : (state === 'copied' ? 'Copied ' + name : 'Copy ' + label)}</button><div className="ae-help">{name} · <a className="ae-link" href={'https://alloflow-cdn.pages.dev/apps_script/educator_evaluation_share/' + name} target="_blank" rel="noopener noreferrer">view source</a>{state === 'error' ? <span className="ae-chip ae-chip-bad" style={{ marginLeft: 6 }}>Copy failed; open source</span> : null}{state === 'invalid' ? <span className="ae-chip ae-chip-bad" style={{ marginLeft: 6 }}>Unexpected source received; nothing copied</span> : null}</div></div>;
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
      setUrlMessage({ text: 'Source changed. Create a new deployment version, then run the deployment check again.', tone: 'warning' });
    }
  };
  const taskClass = (step) => 'ae-setup-task' + (completed.has(step) ? ' ae-setup-task-complete' : '');
  const saveUrl = () => {
    const value = String(url || '').trim();
    if (value && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:[?#].*)?$/.test(value)) {
      setUrlMessage({ text: 'Paste the deployed Apps Script URL ending in /exec. Preview and /dev links were rejected.', tone: 'warning' });
      return;
    }
    if (value !== workspace.config.shareHelperUrl) updateConfig('shareHelperVerified', false);
    updateConfig('shareHelperUrl', value);
    setUrlMessage({ text: value ? 'Helper link saved on this device. Run the deployment check again for this exact link.' : 'Helper link removed; deployment verification was cleared.', tone: value ? 'success' : 'info' });
  };
  const resetProgress = () => {
    updateConfig('shareHelperChecklist', []);
    updateConfig('shareHelperUrl', '');
    updateConfig('shareHelperVerified', false);
    setUrl('');
    setUrlMessage({ text: 'Setup checklist reset. No Drive file or deployment was changed.', tone: 'info' });
  };
  return <section className="ae-card ae-span-12 ae-setup-path ae-setup-path-primary" id="ae-principal-share-setup">
    <div className="ae-record-head"><div><h3>Principal-managed Drive share helper</h3><p className="ae-sub">A resumable setup for one principal, one district account, and reviewed one-recipient packet sharing.</p></div><span className={'ae-chip ' + (progress === order.length ? 'ae-chip-good' : 'ae-chip-blue')}>{progress} of {order.length} complete</span></div>
    <div className="ae-setup-progress" role="progressbar" aria-label="Principal helper setup progress" aria-valuemin="0" aria-valuemax={order.length} aria-valuenow={progress} style={{ marginTop: 12 }}><span style={{ width: Math.round(progress / order.length * 100) + '%' }}/></div>
    <div className={progress === order.length ? 'ae-note ae-ok' : 'ae-setup-next'} style={{ marginTop: 12 }}><strong>{progress === order.length ? 'Setup checklist complete.' : 'Next step:'}</strong>{' '}{progress === order.length ? 'Use Open my share helper when you are ready to file and review a packet.' : nextLabels[nextStep]}</div>
    <div className="ae-note ae-danger" style={{ marginTop: 12 }}><strong>Personnel-record boundary:</strong> use a managed district account and obtain approval for Apps Script, Drive storage, retention, and handoff. This helper is not a district repository.</div>
    <div aria-label="Principal share helper setup checklist" style={{ marginTop: 8 }}>
      <label className={taskClass('approval')}><input type="checkbox" checked={completed.has('approval')} onChange={(event) => setStoredStep('approval', event.target.checked)}/><span><strong>1. Confirm approval and account</strong><span className="ae-help">I have district approval and verified the managed account that will own these working files.</span></span></label>
      <label className={taskClass('project')}><input type="checkbox" checked={completed.has('project')} onChange={(event) => setStoredStep('project', event.target.checked)}/><span><strong>2. Create the private project</strong><span className="ae-help">Open <a className="ae-link" href="https://script.new/" target="_blank" rel="noopener noreferrer">script.new</a>, verify the account again, and name the project <code>AlloFlow evaluation share helper</code>.</span></span></label>
      <div className={taskClass('code')}><input type="checkbox" checked={completed.has('code')} disabled aria-label="Code.gs copied"/><span><strong>3. Replace Code.gs</strong><span className="ae-help">Select all starter code, copy this source, paste, and save.</span><AeCopyShareSource name="Code.gs" label="Code.gs" onCopied={() => setStoredStep('code')}/></span></div>
      <div className={taskClass('index')}><input type="checkbox" checked={completed.has('index')} disabled aria-label="Index.html copied"/><span><strong>4. Add the Index page</strong><span className="ae-help">Choose <strong>+ → HTML</strong>, name it exactly <code>Index</code>, then paste this source.</span><AeCopyShareSource name="Index.html" label="Index.html" onCopied={() => setStoredStep('index')}/></span></div>
      <div className={taskClass('manifest')}><input type="checkbox" checked={completed.has('manifest')} disabled aria-label="appsscript.json copied"/><span><strong>5. Enable Drive API v3</strong><span className="ae-help">In Project Settings, show <code>appsscript.json</code>, then replace it with this manifest.</span><AeCopyShareSource name="appsscript.json" label="appsscript.json" onCopied={() => setStoredStep('manifest')}/></span></div>
      <div className={taskClass('deployed')}><input type="checkbox" checked={completed.has('deployed')} disabled aria-label="Private deployment link saved"/><span><strong>6. Deploy privately and save the link</strong><span className="ae-help">Use <strong>Deploy → New deployment → Web app</strong>, <strong>Execute as: Me</strong>, and <strong>Who has access: Only myself</strong>. Review the account and scopes before authorizing.</span><label className="ae-field" style={{ marginTop: 8 }}><span>Deployment link ending in /exec</span><input className="ae-input" value={url} onChange={(event) => { setUrl(event.target.value); setUrlMessage({ text: '', tone: 'info' }); }} placeholder="https://script.google.com/macros/s/.../exec"/></label><div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" onClick={saveUrl}>Save private helper link</button>{workspace.config.shareHelperUrl && <a className="ae-btn" href={workspace.config.shareHelperUrl} target="_blank" rel="noopener noreferrer">Open my share helper</a>}</div></span></div>
      <label className={taskClass('verified')}><input type="checkbox" disabled={!workspace.config.shareHelperUrl || !order.slice(0, 5).every((step) => completed.has(step))} checked={!!workspace.config.shareHelperVerified} onChange={(event) => updateConfig('shareHelperVerified', event.target.checked)}/><span><strong>7. Run the deployment check</strong><span className="ae-help">Open this exact saved link. The helper must show the expected managed district account and Drive API v3 ready. This checkbox records your confirmation; changing the link clears it.</span></span></label>
    </div>
    {urlMessage.text && <p className={'ae-note ' + (urlMessage.tone === 'success' ? 'ae-ok' : (urlMessage.tone === 'warning' ? 'ae-warn' : ''))} role="status" style={{ marginTop: 8 }}>{urlMessage.text}</p>}
    {(progress > 0 || workspace.config.shareHelperUrl) && <button type="button" className="ae-btn ae-btn-quiet" onClick={resetProgress}>Reset this checklist</button>}
    <details className="ae-domain"><summary>Warnings, delivery, and updates</summary><div className="ae-domain-body"><ul className="ae-sub"><li>The helper accepts only a validated one-educator AlloFlow packet. A names-limited packet can still identify people in free-text evidence; preview it before sharing.</li><li>Drive previews the raw HTML packet as markup. Instruct the educator to <strong>download the file and open it in a browser</strong>.</li><li>Google Drive is asked to notify the recipient. A success message appears only after Drive re-reads the exact recipient, role, and access end. A failed or mismatched share is compensated and the private copy is trashed; follow any manual Drive recovery message immediately.</li><li>No expiration means access continues until revoked. The helper's filed-packet list rechecks live permissions and proves absence after revoke.</li><li>For an update, replace all three files, then use <strong>Deploy → Manage deployments → Edit → New version</strong> and run the check again.</li></ul><p><a className="ae-link" href="https://alloflow-cdn.pages.dev/apps_script/educator_evaluation_share/README.md" target="_blank" rel="noopener noreferrer">Open the complete principal helper guide</a></p></div></details>
  </section>;
}

function AeSetupPaths({ workspace, updateConfig }) {
  const choose = (path) => updateConfig('setupPath', path);
  const selected = workspace.config.setupPath || '';
  return <>
    <section className="ae-card ae-span-12"><div className="ae-record-head"><div><div className="ae-onboarding-kicker">Record path setup</div><h3>Choose what happens after you create a record</h3><p className="ae-sub">Only the selected path's instructions open below. You can change this planning choice later; no record is moved automatically.</p></div><span className={'ae-chip ' + (selected ? 'ae-chip-blue' : 'ae-chip-amber')}>{selected ? '1 path selected' : 'Choose one path'}</span></div><div className="ae-grid" style={{ marginTop: 12 }}>
      <article className={'ae-card ae-span-4 ae-setup-path ' + (selected === 'local' ? 'ae-setup-path-selected' : '')}><h4>1 · Private on-device</h4><p className="ae-sub">Draft, simulate, and export on one device.</p><ul><li>Starts immediately</li><li>No educator sign-in</li><li>You manage backups and handoff</li></ul><button type="button" className="ae-btn" aria-pressed={selected === 'local'} onClick={() => choose('local')}>{selected === 'local' ? 'Selected · no deployment' : 'Choose private path'}</button></article>
      <article className={'ae-card ae-span-4 ae-setup-path ae-setup-path-primary ' + (selected === 'principal_share' ? 'ae-setup-path-selected' : '')}><h4>2 · Principal-managed Drive</h4><p className="ae-sub">Share exported packets from a private helper.</p><ul><li>One reviewed recipient at a time</li><li>Optional expiration and revoke</li><li>No roster or live shared workflow</li></ul><button type="button" className="ae-btn ae-btn-primary" aria-pressed={selected === 'principal_share'} onClick={() => choose('principal_share')}>{selected === 'principal_share' ? 'Selected · continue below' : 'Choose principal helper'}</button></article>
      <article className={'ae-card ae-span-4 ae-setup-path ' + (selected === 'district_portal' ? 'ae-setup-path-selected' : '')}><h4>3 · District portal</h4><p className="ae-sub">Use managed identity and shared live records.</p><ul><li>District-owned deployment</li><li>Roles and evaluator assignments</li><li>Two-party workflow and server audit</li></ul><button type="button" className="ae-btn" aria-pressed={selected === 'district_portal'} onClick={() => choose('district_portal')}>{selected === 'district_portal' ? 'Selected · district steps below' : 'Choose district portal'}</button></article>
    </div>{!selected && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>No record path has been selected.</strong> Choose the boundary your district has approved before sending a personnel record to anyone else.</div>}</section>
    {selected === 'local' && <section className="ae-card ae-span-12 ae-setup-path ae-setup-path-selected"><h3>Private path selected · nothing to deploy</h3><div className="ae-grid"><div className="ae-span-4"><h4>1. Configure</h4><p className="ae-sub">Set the organization, year, evaluator, and approved framework below.</p></div><div className="ae-span-4"><h4>2. Back up</h4><p className="ae-sub">Use Reports &amp; audit to export workspace JSON before changing devices or clearing browser data.</p></div><div className="ae-span-4"><h4>3. Handoff deliberately</h4><p className="ae-sub">Role switching is only a preview. Use an approved packet or portal path when another person needs access.</p></div></div></section>}
    {selected === 'principal_share' && <AePrincipalShareSetup workspace={workspace} updateConfig={updateConfig}/>}
    {selected === 'district_portal' && <section className="ae-card ae-span-12 ae-setup-path ae-setup-path-selected" id="ae-district-portal-setup"><h3>Connecting the district portal, step by step</h3><p className="ae-sub">This is a separate deployment from the Class Mailbox. It needs its own district review, project, repository setup, and health check.</p><div className="ae-note ae-danger" style={{ marginTop: 12 }}><strong>Not self-serve:</strong> a district-controlled account and authorized administrator must own this personnel-record deployment. Treat it as a reviewed pilot until backup/restore, retention, rollover, deletion, and owner-transfer procedures are tested.</div><ol className="ae-sub" style={{ margin: '12px 0 0 18px', display: 'grid', gap: 8 }}><li>District IT reviews and copies all four required files—<code>Code.gs</code>, <code>Index.html</code>, <code>Portal.html</code>, and <code>appsscript.json</code>—from <code>apps_script/educator_evaluation/</code> into a district-owned Apps Script project.</li><li>An administrator temporarily adds the manual's no-argument <code>runDistrictSetupOnce()</code> wrapper, substitutes the managed domain, members, educators, and evaluator assignments, runs it once, records the returned IDs, then deletes the wrapper.</li><li>They deploy with <strong>Execute as: Me</strong> and <strong>Who has access: users in your domain</strong>, never “Anyone.”</li><li>They run <code>verifyDeploymentIdentity()</code> and the in-portal Setup health checks, then test administrator, evaluator, educator, unlisted-domain, and personal-account access before distributing the <code>/exec</code> link.</li><li>Users save that reviewed link in Project Settings. Google sign-in and server assignments—not possession of the link—decide access.</li></ol><p><a className="ae-link" href="https://alloflow-cdn.pages.dev/educator-evaluation-manual#portal" target="_blank" rel="noopener noreferrer">Open the district deployment guide and setup wrapper</a></p></section>}
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
    setMessage(label + ' loaded. Adjust anything you want, then preview.');
  };
  const interpret = () => {
    const parsed = aeParseSimulationRequest(request, params);
    if (!parsed.ok) { setMessage('Try a concrete request such as “18 educators, 3 buildings, 4 overdue, 2 finalized, 2 walkthroughs per educator, thin evidence in Domain 3.”'); return; }
    const correctionText = parsed.corrections.length ? ' Adjusted ' + parsed.corrections.map((item) => item.label + ' ' + item.requested + ' → ' + item.applied).join('; ') + '.' : '';
    const ignoredText = parsed.ignored.length ? ' Not understood: ' + parsed.ignored.join(' · ') + '.' : '';
    setParams(parsed.params); setPreview(null); setMessage('Recognized ' + parsed.recognized.join(' · ') + '.' + correctionText + ignoredText + ' Review the controls, then preview.');
  };
  const makePreview = () => { const normalized = aeNormalizeSimulationParams(params); setParams(normalized.params); const next = aeBuildSimulatedWorkspace(normalized.params); setPreview(next); setMessage((normalized.corrections.length ? 'Applied safe limits: ' + normalized.corrections.map((item) => item.label + ' ' + item.requested + ' → ' + item.applied).join('; ') + '. ' : '') + 'Preview is ready. No workspace records have changed.'); };
  const apply = () => { if (!preview) return; setUndo(aeClone(workspace)); onApply(preview); setPreview(null); setMessage('Simulation applied. Undo remains available while this Setup page is open.'); };
  const undoApply = () => { if (!undo) return; onApply(undo); setUndo(null); setMessage('Previous simulated workspace restored.'); };
  const summary = preview ? aeSimulationSummary(preview) : null;
  const staffLimit = Math.max(1, Number.parseInt(params.staffCount, 10) || 1);
  const overdueLimit = Math.max(0, staffLimit - Math.max(0, Number.parseInt(params.finalizedCount, 10) || 0));
  const validation = aeNormalizeSimulationParams(params);
  if (!workspace.config.sampleMode) return null;
  return <section className="ae-card ae-span-12"><div className="ae-record-head"><div><h3>Simulation Studio</h3><p className="ae-sub">Change fictional data with plain language, manual parameters, or both. Parsing runs locally; no prompt or record is sent to an AI service.</p></div><span className="ae-chip ae-chip-purple">Simulation only</span></div>
    <h4>Start with a scenario</h4><div className="ae-scenario-grid">
      <button type="button" className="ae-btn ae-scenario" onClick={() => loadScenario('Small-school tour', { staffCount: 8, buildingCount: 1, finalizedCount: 2, overdueCount: 1, walkthroughsPerTeacher: 1, thinEvidenceDomain: 'none' })}>Small-school tour<small>8 educators · 1 building · balanced evidence</small></button>
      <button type="button" className="ae-btn ae-scenario" onClick={() => loadScenario('Busy midyear', { staffCount: 24, buildingCount: 3, finalizedCount: 6, overdueCount: 4, walkthroughsPerTeacher: 2, thinEvidenceDomain: 'none' })}>Busy midyear<small>24 educators · 3 buildings · mixed progress</small></button>
      <button type="button" className="ae-btn ae-scenario" onClick={() => loadScenario('Evidence-gap review', { staffCount: 18, buildingCount: 2, finalizedCount: 2, overdueCount: 3, walkthroughsPerTeacher: 2, thinEvidenceDomain: 'd3' })}>Evidence-gap review<small>Thin Domain 3 evidence for coaching practice</small></button>
    </div>
    <label className="ae-field" style={{ marginTop: 12 }}><span>Describe the scenario</span><textarea className="ae-textarea" value={request} onChange={(event) => setRequest(event.target.value)} placeholder="Example: 18 educators, 3 buildings, 4 overdue, 2 finalized, 2 walkthroughs per educator, thin evidence in Domain 3."/></label>
    <button type="button" className="ae-btn" onClick={interpret}>Interpret request locally</button>
    <div className="ae-form-grid" style={{ marginTop: 14 }}>
      <label className="ae-field"><span>Fictional educators</span><input className="ae-input" type="number" min="1" max="60" value={params.staffCount} onChange={(event) => set('staffCount', event.target.value)}/></label>
      <label className="ae-field"><span>Buildings</span><input className="ae-input" type="number" min="1" max="8" value={params.buildingCount} onChange={(event) => set('buildingCount', event.target.value)}/></label>
      <label className="ae-field"><span>Finalized cycles</span><input className="ae-input" type="number" min="0" max={staffLimit} value={params.finalizedCount} onChange={(event) => set('finalizedCount', event.target.value)}/><span className="ae-help">Cannot exceed the fictional educator count.</span></label>
      <label className="ae-field"><span>Overdue cycles</span><input className="ae-input" type="number" min="0" max={overdueLimit} value={params.overdueCount} onChange={(event) => set('overdueCount', event.target.value)}/><span className="ae-help">At most {overdueLimit} after finalized cycles.</span></label>
      <label className="ae-field"><span>Published walkthroughs per educator</span><input className="ae-input" type="number" min="0" max="8" value={params.walkthroughsPerTeacher} onChange={(event) => set('walkthroughsPerTeacher', event.target.value)}/></label>
      <label className="ae-field"><span>Framework</span><select className="ae-select" value={params.frameworkProfile} onChange={(event) => set('frameworkProfile', event.target.value)}><option value="pa_act13">Pennsylvania Act 13</option><option value="maine_pepg">Maine PEPG</option><option value="portland_me">Portland, Maine PEPG</option></select></label>
      <label className="ae-field ae-field-wide"><span>Make published evidence intentionally thin in</span><select className="ae-select" value={params.thinEvidenceDomain} onChange={(event) => set('thinEvidenceDomain', event.target.value)}><option value="none">No domain; balance tags</option><option value="d1">Domain 1</option><option value="d2">Domain 2</option><option value="d3">Domain 3</option><option value="d4">Domain 4</option></select></label>
    </div>
    {validation.corrections.length > 0 && <div className="ae-note ae-warn" role="status"><strong>Values will be normalized before preview:</strong><ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>{validation.corrections.map((item) => <li key={item.key}>{item.label}: requested {String(item.requested)} → applied {String(item.applied)}</li>)}</ul></div>}
    <div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" onClick={makePreview}>Preview changes</button>{undo && <button type="button" className="ae-btn" onClick={undoApply}>Undo last simulation</button>}</div>
    {message && <p className="ae-note" role="status" style={{ marginTop: 10 }}>{message}</p>}
    {summary && <div style={{ marginTop: 14 }}><h4>Preview · nothing applied yet</h4><div className="ae-sim-diff"><div className="ae-stat"><strong>{summary.staff}</strong><span>fictional educators</span></div><div className="ae-stat"><strong>{summary.buildings}</strong><span>buildings</span></div><div className="ae-stat"><strong>{summary.finalized}</strong><span>finalized</span></div><div className="ae-stat"><strong>{summary.overdue}</strong><span>overdue</span></div><div className="ae-stat"><strong>{summary.walkthroughs}</strong><span>published walkthroughs</span></div></div><div className="ae-note ae-warn" style={{ marginTop: 10 }}>Applying replaces the current <strong>simulated</strong> workspace, including its fictional roster and sample history. It cannot run in a real workspace.</div><button type="button" className="ae-btn ae-btn-primary" onClick={apply} style={{ marginTop: 10 }}>Apply this simulated scenario</button></div>}
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
          markup = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, title: 'Educator Evaluation' });
        }
        if (!cancelled) setSvg(markup);
      } catch (err) { if (!cancelled) setSvg(''); }
    })();
    return () => { cancelled = true; };
  }, [payload]);
  if (!payload) return null;
  return <section className="ae-card ae-span-12" aria-labelledby="ae-share-qr-title"><div className="ae-record-head"><div><h3 id="ae-share-qr-title">Share by QR</h3><p className="ae-sub">{isRemote
    ? 'Colleagues scan this to reach the district portal. Their district sign-in still decides what they can see.'
    : 'Anyone can scan this to open their own private on-device workspace. Your data is not shared by the code.'}</p></div></div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', marginTop: 10 }}>
      {svg ? <figure style={{ margin: 0 }} aria-label={'QR code linking to ' + payload}><div style={{ width: 176, height: 176, background: '#fff', padding: 6, border: '1px solid #ccd5e2', borderRadius: 10 }} dangerouslySetInnerHTML={{ __html: svg }} /></figure> : <div className="ae-note ae-warn" style={{ maxWidth: 260 }}>The QR image could not be rendered. The selectable link remains available.</div>}
      <div style={{ minWidth: 220, flex: 1 }}>
        <label className="ae-field"><span>Share link</span><input className="ae-input" readOnly value={payload} onFocus={(event) => event.target.select()} /></label>
        <button type="button" className="ae-btn" onClick={async () => { try { if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(payload); setCopyError(''); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (err) { setCopied(false); setCopyError('Copy failed. Select the link above and copy it manually.'); } }}>{copied ? 'Link copied' : 'Copy link'}</button>
        {copyError && <p className="ae-help" role="alert">{copyError}</p>}
      </div>
    </div>
  </section>;
}

function AeSetupHealth({ repository }) {
  const [state, setState] = React.useState({ status: 'idle', result: null, error: '' });
  const run = async () => {
    if (state.status === 'running') return;
    setState({ status: 'running', result: null, error: '' });
    try {
      const result = await repository.getSetupHealth();
      if (!result || result.ok === false) throw new Error((result && (result.error || result.message)) || 'The setup health check could not run.');
      setState({ status: 'done', result, error: '' });
    } catch (error) {
      setState({ status: 'error', result: null, error: String((error && error.message) || error) });
    }
  };
  const checks = state.result && state.result.checks;
  const rows = checks ? [
    ['District domain configured', checks.allowedDomain ? 'Yes · ' + checks.allowedDomain : 'No — run setup with allowedDomain', !!checks.allowedDomain],
    ['Portal web-app URL known', checks.webAppUrlConfigured ? 'Yes' : 'No — deploy as a web app and re-run setup', !!checks.webAppUrlConfigured],
    ['Repository Drive folder reachable', checks.repositoryFolderAccessible ? 'Yes' : 'No — the service cannot open its own folder', !!checks.repositoryFolderAccessible],
    ['Workspace integrity metadata', checks.workspaceMetadataIntact ? 'Intact · revision ' + checks.workspaceRevision : 'Missing — re-run setup as the bootstrap administrator', !!checks.workspaceMetadataIntact],
    ['Deployment owner continuity', checks.deploymentOwnerMatchesBootstrapAdmin ? 'Current deployment owner matches the bootstrap administrator' : 'Needs district IT review — the effective deployment owner no longer matches the bootstrap administrator; verify Drive and Apps Script custody before rollover or handoff', !!checks.deploymentOwnerMatchesBootstrapAdmin],
    ['Released-summary recovery', checks.releasedSummaryRecoveryRequired ? 'Needs administrator review — inspect the Released evaluations folder and pending repository commit before another release' : 'No unresolved release recovery item', !checks.releasedSummaryRecoveryRequired],
    ['Annual rollover recovery', checks.annualRolloverRecoveryRequired ? 'Stop and use Recheck interrupted rollover in the Annual rollover center before another attempt' : (checks.lastAnnualRolloverAt ? 'No unresolved item · last completed ' + checks.lastAnnualRolloverFromYear + ' → ' + checks.lastAnnualRolloverToYear + ' on ' + aeDateTime(checks.lastAnnualRolloverAt) : 'No unresolved annual rollover item'), !checks.annualRolloverRecoveryRequired],
    ['Active members', (checks.memberCounts.admin + ' admin · ' + checks.memberCounts.evaluator + ' evaluator · ' + checks.memberCounts.teacher + ' teacher' + (checks.memberCounts.inactive ? ' · ' + checks.memberCounts.inactive + ' inactive' : '')), checks.memberCounts.admin > 0],
    ['Educators with a portal account', (checks.activeEducators - checks.educatorsWithoutMemberAccount) + ' of ' + checks.activeEducators + (checks.educatorsWithoutMemberAccount ? ' — ' + checks.educatorsWithoutMemberAccount + ' cannot sign in or receive shared summaries yet' : ''), checks.educatorsWithoutMemberAccount === 0],
    ['Audit log integrity', checks.auditChainIntact
      ? 'Intact. ' + checks.auditChainRows + ' entries re-hashed and linked.'
      : (checks.auditChainBreakReason === 'unavailable'
        ? 'Could not be checked. Open the audit sheet and confirm it exists.'
        : 'Broken at sheet row ' + checks.auditChainBrokenAtRow + ' (' + (checks.auditChainBreakReason === 'link' ? 'a row was deleted, inserted, or reordered' : 'a row was edited after it was written') + '). Investigate and restore from a reviewed backup.'),
      !!checks.auditChainIntact],
    ['Educators with an assigned evaluator', (checks.activeEducators - checks.educatorsWithoutEvaluatorAssignment) + ' of ' + checks.activeEducators + (checks.educatorsWithoutEvaluatorAssignment ? ' — assign evaluators before their cycles begin' : ''), checks.educatorsWithoutEvaluatorAssignment === 0],
  ] : [];
  return <section className="ae-card ae-span-12"><div className="ae-record-head"><div><h3>Setup health</h3><p className="ae-sub">The bootstrap verifications, without opening the script editor. Read-only; counts only, never member emails.</p></div>
    <button type="button" className="ae-btn ae-btn-primary" disabled={state.status === 'running'} onClick={run}>{state.status === 'running' ? 'Checking…' : 'Run setup health check'}</button></div>
    {state.status === 'error' && <div className="ae-note ae-danger" style={{ marginTop: 10 }}>{state.error}</div>}
    {checks && <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><caption className="ae-live">Setup health results</caption><thead><tr><th scope="col">Check</th><th scope="col">Result</th><th scope="col">Status</th></tr></thead><tbody>
      {rows.map(([label, detail, ok]) => <tr key={label}><th scope="row">{label}</th><td>{detail}</td><td>{ok ? <span className="ae-chip ae-chip-good">OK</span> : <span className="ae-chip ae-chip-amber">Needs attention</span>}</td></tr>)}
    </tbody></table></div>}
  </section>;
}

function aeNextAcademicYear(value) {
  const match = String(value || '').replace(/[–—]/g, '-').match(/^(\d{4})-(\d{2})$/);
  if (!match) return '';
  const start = Number(match[1]) + 1;
  return start + '-' + String(start + 1).slice(-2);
}

function AeDistrictOperations({ workspace, repository, onReload }) {
  const [directoryState, setDirectoryState] = React.useState({ status: 'loading', directory: null, error: '' });
  const [memberDraft, setMemberDraft] = React.useState({ email: '', displayName: '', role: 'teacher', teacherId: '', active: true });
  const [assignmentDraft, setAssignmentDraft] = React.useState({ teacherId: '', evaluatorEmail: '', active: true });
  const [directoryReview, setDirectoryReview] = React.useState(null);
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
    return teacher ? teacher.name + ' · ' + teacher.code : (teacherId || '—');
  };

  const beginDirectoryReview = async (kind) => {
    if (directoryBusy) return;
    setDirectoryBusy(true);
    setDirectoryNotice({ tone: '', text: '' }); setDirectoryReview(null); setDirectoryAck(false);
    try {
      const candidate = kind === 'member' ? { ...memberDraft, teacherId: memberDraft.role === 'teacher' ? memberDraft.teacherId : '' } : assignmentDraft;
      const response = await repository.reviewDirectoryChange({ kind, candidate });
      setDirectoryReview(response.review);
    } catch (error) { setDirectoryNotice({ tone: 'error', text: String((error && error.message) || error) }); }
    finally { setDirectoryBusy(false); }
  };
  const confirmDirectory = async () => {
    if (!directoryReview || !directoryAck || directoryBusy) return;
    setDirectoryBusy(true);
    setDirectoryNotice({ tone: '', text: '' });
    try {
      const response = await repository.performDirectoryChange({ reviewToken: directoryReview.token, acknowledgeImpact: true });
      setDirectoryState({ status: 'done', directory: response.directory, error: '' });
      setDirectoryReview(null); setDirectoryAck(false);
      setDirectoryNotice({ tone: 'success', text: 'The reviewed directory change was applied and audited.' });
    } catch (error) { setDirectoryReview(null); setDirectoryNotice({ tone: 'error', text: String((error && error.message) || error) }); }
    finally { setDirectoryBusy(false); }
  };

  const beginScheduleReview = async () => {
    setScheduleAck(false); setScheduleState({ status: 'reviewing', review: null, error: '', result: null });
    try { const response = await repository.reviewCycleSchedule(scheduleDraft); setScheduleState({ status: 'reviewed', review: response.review, error: '', result: null }); }
    catch (error) { setScheduleState({ status: 'error', review: null, error: String((error && error.message) || error), result: null }); }
  };
  const confirmSchedule = async () => {
    if (!scheduleState.review || !scheduleAck) return;
    setScheduleState((current) => ({ ...current, status: 'performing', error: '' }));
    try { const response = await repository.performCycleSchedule({ reviewToken: scheduleState.review.token, acknowledgeImpact: true }); setScheduleState({ status: 'completed', review: null, error: '', result: response }); }
    catch (error) { setScheduleState({ status: 'error', review: null, error: String((error && error.message) || error), result: null }); }
  };

  const beginExportReview = async () => {
    setExportAck(false); setExportState({ status: 'reviewing', review: null, error: '', result: null });
    try { const response = await repository.reviewDistrictExport(exportDraft); setExportState({ status: 'reviewed', review: response.review, error: '', result: null }); }
    catch (error) { setExportState({ status: 'error', review: null, error: String((error && error.message) || error), result: null }); }
  };
  const confirmExport = async () => {
    if (!exportState.review || !exportAck) return;
    setExportState((current) => ({ ...current, status: 'performing', error: '' }));
    try { const response = await repository.performDistrictExport({ reviewToken: exportState.review.token, acknowledgePolicy: true }); setExportState({ status: 'completed', review: null, error: '', result: response }); }
    catch (error) { setExportState({ status: 'error', review: null, error: String((error && error.message) || error), result: null }); }
  };

  const loadArchives = async () => {
    setArchiveState({ status: 'loading', archives: [], review: null, error: '', result: null });
    try { const response = await repository.getAnnualArchives(); setArchiveState({ status: 'done', archives: response.archives || [], review: null, error: '', result: null }); }
    catch (error) { setArchiveState({ status: 'error', archives: [], review: null, error: String((error && error.message) || error), result: null }); }
  };
  const reviewRehearsal = async (archiveId) => {
    setRehearsalAck(false); setArchiveState((current) => ({ ...current, status: 'reviewing', review: null, error: '', result: null }));
    try { const response = await repository.reviewArchiveRestoreRehearsal({ archiveId }); setArchiveState((current) => ({ ...current, status: 'reviewed', review: response.review, error: '', result: null })); }
    catch (error) { setArchiveState((current) => ({ ...current, status: 'error', review: null, error: String((error && error.message) || error), result: null })); }
  };
  const createRehearsal = async () => {
    if (!archiveState.review || !rehearsalAck) return;
    setArchiveState((current) => ({ ...current, status: 'performing', error: '' }));
    try { const response = await repository.performArchiveRestoreRehearsal({ reviewToken: archiveState.review.token, acknowledgeNoLiveRestore: true }); setArchiveState((current) => ({ ...current, status: 'completed', review: null, error: '', result: response })); }
    catch (error) { setArchiveState((current) => ({ ...current, status: 'error', review: null, error: String((error && error.message) || error), result: null })); }
  };

  return <section className="ae-card ae-span-12" aria-labelledby="ae-district-operations-title">
    <div className="ae-record-head"><div><h3 id="ae-district-operations-title">District operations center</h3><p className="ae-sub">Administrator-only · reviewed directory changes · audited private exports · schedule and recovery tools</p></div><span className="ae-chip ae-chip-blue">Operational controls</span></div>
    <div className="ae-note" style={{ marginTop: 12 }}><strong>Routine administration without editing Apps Script.</strong> Each sensitive change is reviewed against current server state, expires after ten minutes, and is applied only after an explicit confirmation. The browser never supplies the acting identity.</div>
    <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
      <details className="ae-domain" open><summary>1 · Accounts and evaluator assignments</summary><div className="ae-domain-body">
        {directoryState.status === 'loading' && <p role="status">Loading the authorized directory…</p>}
        {directoryState.error && <div className="ae-note ae-danger" role="alert">{directoryState.error}</div>}
        {directory && <><div className="ae-grid"><div className="ae-span-6"><h4>Create or update a member</h4><div className="ae-form-grid"><label className="ae-field"><span>Managed district email</span><input className="ae-input" type="email" value={memberDraft.email} onChange={(event) => setMemberDraft((current) => ({ ...current, email: event.target.value }))}/></label><label className="ae-field"><span>Display name</span><input className="ae-input" value={memberDraft.displayName} onChange={(event) => setMemberDraft((current) => ({ ...current, displayName: event.target.value }))}/></label><label className="ae-field"><span>Role</span><select className="ae-select" value={memberDraft.role} onChange={(event) => setMemberDraft((current) => ({ ...current, role: event.target.value, teacherId: event.target.value === 'teacher' ? current.teacherId : '' }))}><option value="teacher">Educator</option><option value="evaluator">Evaluator</option><option value="admin">Administrator</option></select></label>{memberDraft.role === 'teacher' && <label className="ae-field"><span>Linked educator record</span><select className="ae-select" value={memberDraft.teacherId} onChange={(event) => setMemberDraft((current) => ({ ...current, teacherId: event.target.value }))}><option value="">Choose educator</option>{directory.educators.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label>}</div><label className="ae-check"><input type="checkbox" checked={memberDraft.active} onChange={(event) => setMemberDraft((current) => ({ ...current, active: event.target.checked }))}/><span>Active member access</span></label><button type="button" className="ae-btn" disabled={directoryBusy || !memberDraft.email || !memberDraft.displayName || (memberDraft.role === 'teacher' && !memberDraft.teacherId)} onClick={() => beginDirectoryReview('member')}>{directoryBusy ? 'Working…' : 'Review member change'}</button></div>
          <div className="ae-span-6"><h4>Create or update an evaluator assignment</h4><label className="ae-field"><span>Educator record</span><select className="ae-select" value={assignmentDraft.teacherId} onChange={(event) => setAssignmentDraft((current) => ({ ...current, teacherId: event.target.value }))}><option value="">Choose educator</option>{directory.educators.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label><label className="ae-field"><span>Authorized evaluator</span><select className="ae-select" value={assignmentDraft.evaluatorEmail} onChange={(event) => setAssignmentDraft((current) => ({ ...current, evaluatorEmail: event.target.value }))}><option value="">Choose evaluator</option>{activeEvaluators.map((member) => <option value={member.email} key={member.email}>{member.displayName} · {member.email}</option>)}</select></label><label className="ae-check"><input type="checkbox" checked={assignmentDraft.active} onChange={(event) => setAssignmentDraft((current) => ({ ...current, active: event.target.checked }))}/><span>Active assignment</span></label><button type="button" className="ae-btn" disabled={directoryBusy || !assignmentDraft.teacherId || !assignmentDraft.evaluatorEmail} onClick={() => beginDirectoryReview('assignment')}>{directoryBusy ? 'Working…' : 'Review assignment change'}</button></div></div>
          <div className="ae-table-wrap" style={{ marginTop: 14 }}><table className="ae-table"><caption className="ae-live">Current portal members</caption><thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Linked educator</th><th scope="col">Access</th><th scope="col">Action</th></tr></thead><tbody>{directory.members.map((member) => <tr key={member.email}><td>{member.displayName}<br/><span className="ae-sub">{member.email}</span></td><td>{member.role}</td><td>{educatorNameFor(member.teacherId)}</td><td>{member.active ? <span className="ae-chip ae-chip-good">Active</span> : <span className="ae-chip ae-chip-neutral">Inactive</span>}</td><td><button type="button" className="ae-btn" onClick={() => { setMemberDraft({ ...member }); setDirectoryReview(null); setDirectoryAck(false); setDirectoryNotice({ tone: '', text: '' }); }}>Load for review</button></td></tr>)}</tbody></table></div>
          <div className="ae-table-wrap" style={{ marginTop: 14 }}><table className="ae-table"><caption className="ae-live">Current evaluator assignments</caption><thead><tr><th scope="col">Educator</th><th scope="col">Evaluator account</th><th scope="col">Access</th><th scope="col">Action</th></tr></thead><tbody>{directory.assignments.length ? directory.assignments.map((assignment) => <tr key={assignment.teacherId + '|' + assignment.evaluatorEmail}><td>{educatorNameFor(assignment.teacherId)}</td><td>{assignment.evaluatorEmail}</td><td>{assignment.active ? <span className="ae-chip ae-chip-good">Active</span> : <span className="ae-chip ae-chip-neutral">Inactive</span>}</td><td><button type="button" className="ae-btn" onClick={() => { setAssignmentDraft({ ...assignment }); setDirectoryReview(null); setDirectoryAck(false); setDirectoryNotice({ tone: '', text: '' }); }}>Load for review</button></td></tr>) : <tr><td colSpan="4">No evaluator assignments yet.</td></tr>}</tbody></table></div></>}
        {directoryReview && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>Review {directoryReview.action} {directoryReview.kind}.</strong><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(directoryReview.candidate, null, 2)}</pre>{directoryReview.current && <p className="ae-sub">A current entry exists and will be replaced for this key.</p>}{directoryReview.impacts && directoryReview.impacts.removesPortalAccess && <p><strong>This removes the member's portal access.</strong></p>}{directoryReview.impacts && directoryReview.impacts.changesRole && <p><strong>This changes the member's authorization role.</strong></p>}{directoryReview.impacts && directoryReview.impacts.activeEvaluatorAssignments > 0 && <p>This account currently has {directoryReview.impacts.activeEvaluatorAssignments} active evaluator assignment{directoryReview.impacts.activeEvaluatorAssignments === 1 ? '' : 's'}.</p>}{directoryReview.impacts && directoryReview.impacts.removesEvaluatorAccess && <p><strong>This removes evaluator access for {directoryReview.impacts.educatorName}.</strong></p>}<label className="ae-check"><input type="checkbox" checked={directoryAck} onChange={(event) => setDirectoryAck(event.target.checked)}/><span>I verified the managed account, role, linked educator, active status, and legitimate educational interest.</span></label><div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={!directoryAck || directoryBusy} onClick={confirmDirectory}>{directoryBusy ? 'Applying…' : 'Confirm directory change'}</button><button type="button" className="ae-btn" disabled={directoryBusy} onClick={() => setDirectoryReview(null)}>Cancel</button></div><p className="ae-help">Review expires {aeDateTime(directoryReview.expiresAt)}. Any membership or assignment change makes it stale.</p></div>}
        {directoryNotice.text && <div className={'ae-note ' + (directoryNotice.tone === 'error' ? 'ae-danger' : 'ae-ok')} role={directoryNotice.tone === 'error' ? 'alert' : 'status'} style={{ marginTop: 12 }}>{directoryNotice.text}</div>}
      </div></details>

      <details className="ae-domain"><summary>2 · Annual cycle due-date schedule</summary><div className="ae-domain-body"><p className="ae-sub">Apply one reviewed due date to eligible active, non-finalized cycles. Finalized cycles are always skipped.</p><div className="ae-form-grid" style={{ marginTop: 12 }}><label className="ae-field"><span>Cycle due date</span><input className="ae-input" type="date" value={scheduleDraft.dueDate} onChange={(event) => setScheduleDraft((current) => ({ ...current, dueDate: event.target.value }))}/></label><label className="ae-field"><span>Apply to</span><select className="ae-select" value={scheduleDraft.applyTo} onChange={(event) => setScheduleDraft((current) => ({ ...current, applyTo: event.target.value }))}><option value="missing">Open cycles without a due date</option><option value="all_open">All open cycles, replacing existing due dates</option></select></label><label className="ae-field"><span>Building filter (optional)</span><input className="ae-input" value={scheduleDraft.building} onChange={(event) => setScheduleDraft((current) => ({ ...current, building: event.target.value }))} placeholder="All buildings"/></label></div><button type="button" className="ae-btn" disabled={!scheduleDraft.dueDate || ['reviewing', 'performing'].includes(scheduleState.status)} onClick={beginScheduleReview}>{scheduleState.status === 'reviewing' ? 'Preparing review…' : 'Review schedule impact'}</button>
        {scheduleState.error && <div className="ae-note ae-danger" role="alert" style={{ marginTop: 12 }}>{scheduleState.error}</div>}{scheduleState.review && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>{scheduleState.review.affectedEducators} educator cycle{scheduleState.review.affectedEducators === 1 ? '' : 's'} will receive {scheduleState.review.dueDate}.</strong><p>{scheduleState.review.skippedFinalized} finalized cycle{scheduleState.review.skippedFinalized === 1 ? '' : 's'} skipped. {scheduleState.review.sample.length ? 'Sample: ' + scheduleState.review.sample.map((item) => item.name + (item.previousDueDate ? ' (' + item.previousDueDate + ')' : '')).join(', ') : 'No eligible cycles.'}</p><label className="ae-check"><input type="checkbox" checked={scheduleAck} onChange={(event) => setScheduleAck(event.target.checked)}/><span>I reviewed the scope and understand existing open-cycle dates may be replaced when “all open cycles” is selected.</span></label><div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={!scheduleAck || !scheduleState.review.affectedEducators} onClick={confirmSchedule}>Apply reviewed schedule</button><button type="button" className="ae-btn" onClick={() => setScheduleState({ status: 'idle', review: null, error: '', result: null })}>Cancel</button></div><p className="ae-help">Review expires {aeDateTime(scheduleState.review.expiresAt)}. Any intervening workspace save makes it stale.</p></div>}{scheduleState.result && <div className="ae-note ae-ok" role="status" style={{ marginTop: 12 }}><strong>Schedule applied.</strong> {scheduleState.result.affectedEducators} cycles now use {scheduleState.result.dueDate}. {typeof onReload === 'function' && <button type="button" className="ae-btn" style={{ marginLeft: 8 }} onClick={onReload}>Reload scheduled records</button>}</div>}
      </div></details>

      <details className="ae-domain"><summary>3 · Audited private exports and official-record handoff</summary><div className="ae-domain-body"><div className="ae-note ae-warn"><strong>Exports remain private by default.</strong> Creating one does not declare it the official record or share it with HR. The district must approve the purpose, destination, retention, legal-hold treatment, and handoff.</div><div className="ae-form-grid" style={{ marginTop: 12 }}><label className="ae-field"><span>Export scope</span><select className="ae-select" value={exportDraft.scope} onChange={(event) => setExportDraft((current) => ({ ...current, scope: event.target.value }))}><option value="status_csv">Roster and cycle status CSV</option><option value="educator_record">One educator’s complete portal record</option><option value="repository_backup">Complete repository workspace backup</option></select></label>{exportDraft.scope === 'educator_record' && <label className="ae-field"><span>Educator</span><select className="ae-select" value={exportDraft.teacherId} onChange={(event) => setExportDraft((current) => ({ ...current, teacherId: event.target.value }))}><option value="">Choose educator</option>{workspace.teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name} · {teacher.code}</option>)}</select></label>}<label className="ae-field ae-field-wide"><span>Authorized purpose</span><input className="ae-input" value={exportDraft.purpose} onChange={(event) => setExportDraft((current) => ({ ...current, purpose: event.target.value }))} placeholder="Example: annual HR records handoff under policy …" maxLength={240}/></label></div><button type="button" className="ae-btn" disabled={!exportDraft.purpose.trim() || (exportDraft.scope === 'educator_record' && !exportDraft.teacherId) || exportState.status === 'reviewing'} onClick={beginExportReview}>{exportState.status === 'reviewing' ? 'Preparing review…' : 'Review private export'}</button>
        {exportState.error && <div className="ae-note ae-danger" role="alert" style={{ marginTop: 12 }}>{exportState.error}</div>}{exportState.review && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>Review {exportState.review.scope.replace(/_/g, ' ')}.</strong><p>Purpose: {exportState.review.purpose}</p><p>Destination: {exportState.review.destination}. {exportState.review.educatorName ? 'Educator: ' + exportState.review.educatorName + '.' : 'Active educators: ' + exportState.review.activeEducators + '.'}</p><label className="ae-check"><input type="checkbox" checked={exportAck} onChange={(event) => setExportAck(event.target.checked)}/><span>I confirmed district authorization, purpose, private destination, retention, legal hold, and official-record handoff procedure.</span></label><div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={!exportAck} onClick={confirmExport}>Create verified private export</button><button type="button" className="ae-btn" onClick={() => setExportState({ status: 'idle', review: null, error: '', result: null })}>Cancel</button></div><p className="ae-help">Review expires {aeDateTime(exportState.review.expiresAt)}. Any intervening workspace save makes it stale.</p></div>}{exportState.result && <div className="ae-note ae-ok" role="status" style={{ marginTop: 12 }}><strong>Verified private export created and audited.</strong><div className="ae-actions" style={{ marginTop: 8 }}><a className="ae-btn" href={exportState.result.export.url} target="_blank" rel="noopener noreferrer">Open export in Drive</a></div><p className="ae-help">SHA-256: <code>{exportState.result.export.sha256}</code></p></div>}
      </div></details>

      <details className="ae-domain"><summary>4 · Annual archive inventory and restore rehearsal</summary><div className="ae-domain-body"><div className="ae-note"><strong>A restore rehearsal never overwrites the live workspace.</strong> It verifies an annual archive, compares its counts and revision to the active workspace, and creates a separate private candidate for district IT inspection.</div><button type="button" className="ae-btn" style={{ marginTop: 12 }} disabled={archiveState.status === 'loading'} onClick={loadArchives}>{archiveState.status === 'loading' ? 'Checking archives…' : 'Load and verify annual archives'}</button>{archiveState.error && <div className="ae-note ae-danger" role="alert" style={{ marginTop: 12 }}>{archiveState.error}</div>}{archiveState.archives.length > 0 && <div className="ae-table-wrap" style={{ marginTop: 12 }}><table className="ae-table"><caption className="ae-live">Verified annual archive inventory</caption><thead><tr><th scope="col">Archive</th><th scope="col">Year</th><th scope="col">Revision</th><th scope="col">Integrity</th><th scope="col">Action</th></tr></thead><tbody>{archiveState.archives.map((archive) => <tr key={archive.id}><td><a className="ae-link" href={archive.url} target="_blank" rel="noopener noreferrer">{archive.name}</a><br/><span className="ae-sub">{aeDateTime(archive.archivedAt)}</span></td><td>{archive.fromAcademicYear || 'Unknown'} → {archive.plannedNextAcademicYear || 'Unknown'}</td><td>{archive.sourceRevision == null ? '—' : archive.sourceRevision}</td><td>{archive.verified ? <span className="ae-chip ae-chip-good">Verified</span> : <span className="ae-chip ae-chip-bad">Failed</span>}</td><td><button type="button" className="ae-btn" disabled={!archive.verified} onClick={() => reviewRehearsal(archive.id)}>Review rehearsal</button></td></tr>)}</tbody></table></div>}{archiveState.status === 'done' && !archiveState.archives.length && <div className="ae-empty" style={{ marginTop: 12 }}>No annual archives exist yet.</div>}{archiveState.review && <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>Restore rehearsal review.</strong><p>Archive year {archiveState.review.fromAcademicYear}, revision {archiveState.review.archivedRevision}; active year {archiveState.review.activeAcademicYear}, revision {archiveState.review.activeRevision}.</p><p>Archived: {archiveState.review.archivedCounts.activeEducators} active educators and {archiveState.review.archivedCounts.records.total} current records. Active: {archiveState.review.currentCounts.activeEducators} active educators and {archiveState.review.currentCounts.records.total} current records.</p><label className="ae-check"><input type="checkbox" checked={rehearsalAck} onChange={(event) => setRehearsalAck(event.target.checked)}/><span>I understand this creates a separate private candidate for inspection and does not restore or overwrite the live workspace.</span></label><div className="ae-actions"><button type="button" className="ae-btn ae-btn-primary" disabled={!rehearsalAck} onClick={createRehearsal}>Create private restore candidate</button><button type="button" className="ae-btn" onClick={() => setArchiveState((current) => ({ ...current, status: 'done', review: null }))}>Cancel</button></div></div>}{archiveState.result && <div className="ae-note ae-ok" role="status" style={{ marginTop: 12 }}><strong>Restore rehearsal candidate verified.</strong> The live workspace was not changed.<div className="ae-actions" style={{ marginTop: 8 }}><a className="ae-btn" href={archiveState.result.candidate.url} target="_blank" rel="noopener noreferrer">Open private candidate</a></div><p className="ae-help">SHA-256: <code>{archiveState.result.candidate.sha256}</code></p></div>}
      </div></details>
      <p className="ae-help" style={{ margin: 0 }}><a className="ae-link" href="https://alloflow-cdn.pages.dev/educator-evaluation-manual#district-operations" target="_blank" rel="noopener noreferrer">Open the district operations runbook</a></p>
    </div>
  </section>;
}

function AeAnnualRollover({ workspace, repository, onReload }) {
  const [nextYear, setNextYear] = React.useState(() => aeNextAcademicYear(workspace.config && workspace.config.academicYear));
  const [state, setState] = React.useState({ status: 'idle', review: null, result: null, error: '', errorCode: '' });
  const [custodyAccepted, setCustodyAccepted] = React.useState(false);
  const [openCyclesAccepted, setOpenCyclesAccepted] = React.useState(false);
  const review = state.review;
  const counts = review && review.counts;
  const runReview = async () => {
    if (state.status === 'reviewing') return;
    setState({ status: 'reviewing', review: null, result: null, error: '', errorCode: '' });
    setCustodyAccepted(false);
    setOpenCyclesAccepted(false);
    try {
      const response = await repository.reviewAnnualRollover({ nextAcademicYear: nextYear });
      setState({ status: 'reviewed', review: response.review, result: null, error: '', errorCode: '' });
    } catch (error) {
      setState({ status: 'error', review: null, result: null, error: String((error && error.message) || error), errorCode: String((error && error.code) || '') });
    }
  };
  const confirm = async () => {
    if (!review || state.status === 'performing' || !custodyAccepted || (counts.openCycles > 0 && !openCyclesAccepted)) return;
    setState((current) => ({ ...current, status: 'performing', error: '', errorCode: '' }));
    try {
      const response = await repository.performAnnualRollover({
        reviewToken: review.token,
        acknowledgeArchive: custodyAccepted,
        acknowledgeOpenCycles: counts.openCycles > 0 ? openCyclesAccepted : true,
      });
      setState({ status: response.recoveryPending ? 'recovery' : 'completed', review: null, result: response, error: '', errorCode: '' });
    } catch (error) {
      setState({ status: 'error', review: null, result: null, error: String((error && error.message) || error), errorCode: String((error && error.code) || '') });
    }
  };
  const reconcile = async () => {
    if (state.status === 'reconciling') return;
    setState((current) => ({ ...current, status: 'reconciling', error: '', errorCode: '' }));
    try {
      const response = await repository.reconcileAnnualRollover();
      const message = response.status === 'completed'
        ? 'The active workspace commit was confirmed. Reload to open the new year.'
        : (response.status === 'archive_only'
          ? 'The active workspace was unchanged. The verified archive was kept, and a fresh review may now be started.'
          : 'No unresolved annual rollover was found.');
      setState({ status: response.status === 'completed' ? 'completed' : 'reconciled', review: null, result: { ...response, message }, error: '', errorCode: '' });
    } catch (error) {
      setState({ status: 'error', review: null, result: null, error: String((error && error.message) || error), errorCode: String((error && error.code) || '') });
    }
  };
  const archiveUrl = state.result && state.result.archive && /^https:\/\/drive\.google\.com\//.test(state.result.archive.url || '') ? state.result.archive.url : '';
  return <section className="ae-card ae-span-12" aria-labelledby="ae-rollover-title">
    <div className="ae-record-head"><div><h3 id="ae-rollover-title">Annual rollover &amp; continuity</h3><p className="ae-sub">Administrator-only · review first · verified private archive before the active year changes</p></div><span className="ae-chip ae-chip-amber">High-impact workflow</span></div>
    <div className="ae-note ae-warn" style={{ marginTop: 12 }}><strong>This is a staged, recoverable rollover—not records destruction.</strong> The portal keeps the educator roster and immutable cycle snapshots, archives the complete current workspace, resets active-cycle fields and records, and never deletes released Drive documents. District retention, legal hold, official-record handoff, backup, and account ownership remain district responsibilities.</div>
    <ol className="ae-sub" style={{ margin: '12px 0 0 18px', display: 'grid', gap: 7 }}>
      <li>Run Setup health and resolve repository, audit, owner-continuity, or recovery warnings.</li>
      <li>Enter the immediately following academic year and review the live counts. The 10-minute review expires if the workspace changes.</li>
      <li>Confirm custody and any open-cycle impact. The server creates and re-reads a private JSON archive before writing the new active year.</li>
      <li>Open the returned archive link, record its location under district procedure, then reload the portal.</li>
    </ol>
    <div className="ae-form-grid" style={{ marginTop: 14 }}><label className="ae-field"><span>Next academic year (YYYY-YY)</span><input className="ae-input" value={nextYear} onChange={(event) => { setNextYear(event.target.value); setState({ status: 'idle', review: null, result: null, error: '', errorCode: '' }); }} placeholder="2027-28" inputMode="numeric" aria-describedby="ae-rollover-year-help" /></label><div className="ae-field"><span>&nbsp;</span><button type="button" className="ae-btn ae-btn-primary" disabled={!nextYear || ['reviewing', 'performing', 'reconciling'].includes(state.status)} onClick={runReview}>{state.status === 'reviewing' ? 'Preparing review…' : 'Review annual rollover'}</button></div></div>
    <p className="ae-help" id="ae-rollover-year-help">Active year: <strong>{workspace.config.academicYear || 'not configured'}</strong>. The server permits exactly one-year advancement.</p>
    {state.error && <div className="ae-note ae-danger" role="alert" style={{ marginTop: 12 }}><strong>Rollover did not complete.</strong> {state.error}{['rollover_recovery_required', 'manual_recovery_required'].includes(state.errorCode) && <div className="ae-actions" style={{ marginTop: 10 }}><button type="button" className="ae-btn" onClick={reconcile}>Recheck interrupted rollover</button></div>}</div>}
    {review && counts && <div className="ae-note" style={{ marginTop: 14 }}><h4 style={{ margin: '0 0 8px' }}>Review {review.currentAcademicYear} → {review.nextAcademicYear}</h4>
      <div className="ae-grid"><div className="ae-span-3 ae-stat"><strong>{counts.activeEducators}</strong><span>active educators retained</span></div><div className="ae-span-3 ae-stat"><strong>{counts.finalizedCycles}</strong><span>finalized cycles archived</span></div><div className="ae-span-3 ae-stat"><strong>{counts.openCycles}</strong><span>open cycles archived</span></div><div className="ae-span-3 ae-stat"><strong>{counts.records.total}</strong><span>active records archived</span></div></div>
      <p className="ae-sub" style={{ marginTop: 10 }}>{counts.records.walkthroughs} walkthroughs · {counts.records.observations} formal observations · {counts.records.spms} SPMs · {counts.records.comments} comments · {counts.retainedCycleSnapshots} prior cycle snapshots retained · {counts.releasedDocuments} released Drive document references archived.</p>
      <label className="ae-check"><input type="checkbox" checked={custodyAccepted} onChange={(event) => setCustodyAccepted(event.target.checked)} /><span>I verified district backup/restore, retention, legal-hold, official-record handoff, and deployment-owner responsibility. I understand the archive remains private in the deployment owner’s Drive until the district handles it.</span></label>
      {counts.openCycles > 0 && <label className="ae-check"><input type="checkbox" checked={openCyclesAccepted} onChange={(event) => setOpenCyclesAccepted(event.target.checked)} /><span>I understand {counts.openCycles} open cycle{counts.openCycles === 1 ? '' : 's'} will be archived and will not carry into the new active year.</span></label>}
      <div className="ae-note ae-danger" style={{ marginTop: 12 }}><strong>Final confirmation:</strong> the current active records will be replaced by clean new-year cycles only after the private archive is verified. Released Drive documents are not deleted.</div>
      <div className="ae-actions" style={{ marginTop: 12 }}><button type="button" className="ae-btn ae-btn-danger" disabled={!custodyAccepted || (counts.openCycles > 0 && !openCyclesAccepted) || state.status === 'performing'} onClick={confirm}>{state.status === 'performing' ? 'Archiving and rolling over…' : 'Create archive & start ' + review.nextAcademicYear}</button><button type="button" className="ae-btn" disabled={state.status === 'performing'} onClick={() => setState({ status: 'idle', review: null, result: null, error: '', errorCode: '' })}>Cancel</button></div>
      <p className="ae-help">Review expires {aeDateTime(review.expiresAt)}. Any intervening save makes it stale.</p>
    </div>}
    {state.result && <div className={'ae-note ' + (state.status === 'recovery' ? 'ae-danger' : 'ae-ok')} role="status" style={{ marginTop: 14 }}><strong>{state.status === 'recovery' ? 'Recovery recheck required.' : (state.status === 'completed' ? 'Annual rollover confirmed.' : 'Recovery status checked.')}</strong> {state.result.message || (state.status === 'recovery' ? 'A verified archive exists, but the active-year commit is not yet confirmed. Do not retry.' : ('The active year moved from ' + (state.result.fromAcademicYear || '') + ' to ' + (state.result.toAcademicYear || state.result.activeAcademicYear || '') + '.'))}
      <div className="ae-actions" style={{ marginTop: 10 }}>{archiveUrl && <a className="ae-btn" href={archiveUrl} target="_blank" rel="noopener noreferrer">Open verified private archive</a>}{state.status === 'recovery' && <button type="button" className="ae-btn" onClick={reconcile}>Recheck interrupted rollover</button>}{state.status === 'completed' && typeof onReload === 'function' && <button type="button" className="ae-btn ae-btn-primary" onClick={onReload}>Reload active year</button>}</div>
    </div>}
    <div className="ae-actions" style={{ marginTop: 12 }}><button type="button" className="ae-btn ae-btn-quiet" disabled={['performing', 'reconciling'].includes(state.status)} onClick={reconcile}>{state.status === 'reconciling' ? 'Rechecking…' : 'Recheck interrupted rollover'}</button><a className="ae-link" href="https://alloflow-cdn.pages.dev/educator-evaluation-manual#annual-rollover" target="_blank" rel="noopener noreferrer">Open the rollover recovery guide</a></div>
  </section>;
}

function AeAbout({ workspace, updateConfig, role, isRemote = false, currentUser = null, repository = null, standalone = false, portalUrl = '', exportRubric, importRubric, clearRubric, onApplySimulation, onReload = null }) {
  const set = (field, value) => updateConfig(field, value);
  const rubricFileRef = React.useRef(null);
  return <div className="ae-page">
    {/* One panel serves both roles, but the tab that opens it is labelled
        "Setup" for an evaluator and "About" for an educator — so the heading
        has to follow the label, and an educator is not configuring anything
        (caught demoing the teacher view, 2026-08-17). */}
    <div className="ae-heading"><div><h2>{role === 'teacher' ? 'About this workspace' : ('Setup, sources, and ' + (isRemote ? 'district records' : 'sharing'))}</h2><p>{role === 'teacher' ? 'Where your records live, who can see them, and how to reach the full manual.' : (isRemote ? 'Review the authenticated repository boundary and the approvals that still belong to your district.' : 'Configure the private workspace and compare all three record-sharing paths.')}</p><p><a className="ae-link" target="_blank" rel="noopener noreferrer" href="https://alloflow-cdn.pages.dev/educator-evaluation-manual">User manual: private, principal-managed, and district portal paths</a></p></div></div>
    <div className="ae-grid">
      {!isRemote && role === 'evaluator' && <AeSetupPaths workspace={workspace} updateConfig={updateConfig}/>}
      {!isRemote && role === 'evaluator' && workspace.config.sampleMode && <AeSimulationStudio workspace={workspace} onApply={onApplySimulation}/>}
      <section className="ae-card ae-span-6"><h3>Workspace setup</h3><fieldset disabled={isRemote || role !== 'evaluator'} style={{ border: 0, padding: 0, margin: 0 }}><label className="ae-field"><span>Organization / LEA</span><input className="ae-input" value={workspace.config.organization} onChange={(event) => set('organization', event.target.value)}/></label><div className="ae-form-grid"><label className="ae-field"><span>Building</span><input className="ae-input" value={workspace.config.building} onChange={(event) => set('building', event.target.value)}/></label><label className="ae-field"><span>Academic year</span><input className="ae-input" value={workspace.config.academicYear} onChange={(event) => set('academicYear', event.target.value)}/></label><label className="ae-field"><span>Evaluator name</span><input className="ae-input" value={workspace.config.evaluatorName} onChange={(event) => set('evaluatorName', event.target.value)}/></label><label className="ae-field"><span>Evaluator initials</span><input className="ae-input" value={workspace.config.evaluatorInitials} onChange={(event) => set('evaluatorInitials', event.target.value)}/></label><label className="ae-field ae-field-wide"><span>Evaluation framework</span><select className="ae-select" value={workspace.config.frameworkProfile || 'pa_act13'} onChange={(event) => set('frameworkProfile', event.target.value)}>{Object.keys(AE_FRAMEWORKS).map((id) => <option key={id} value={id}>{AE_FRAMEWORKS[id].name}</option>)}</select></label>{workspace.config.frameworkProfile === 'maine_pepg' && <label className="ae-field ae-field-wide"><span>Professional Practice weight (%) — optional; SLG measures are a district choice under the 2019 amendments</span><input className="ae-input" type="number" min="0" max="100" step="1" value={workspace.config.pepgPracticeWeight == null ? '' : workspace.config.pepgPracticeWeight} onChange={(event) => set('pepgPracticeWeight', event.target.value)} placeholder="e.g. 75 — Student Learning & Growth gets the rest"/></label>}</div></fieldset>{isRemote && <div className="ae-note ae-warn" style={{ marginBottom: 12 }}>Portal configuration is read-only. An authorized district administrator or IT must use the reviewed setup process to change repository configuration.</div>}<div className="ae-note">{AE_ACTIVE_FW.id === 'pa_act13' ? 'Framework snapshot: Pennsylvania Act 13 classroom-teacher framework, June 2021. Full performance-level rubric text is not bundled.' : (AE_ACTIVE_FW.id === 'portland_me' ? 'Framework: Portland PEPG guidebook profile — the current district plan governs. Summative Professional Practice uses the guidebook’s categorical decision matrix, not a numeric average. Confirm the guidebook version and evidence expectations before official use.' : 'Framework: Maine PEPG — the district plan governs. Rating-level labels shown are Maine State Model defaults; confirm labels, cut points, and category weights against your district’s PEPG plan. Full rubric text is not bundled.')}</div></section>
      <section className="ae-card ae-span-6"><h3>Official references</h3>{AE_ACTIVE_FW.id === 'pa_act13' ? <ul><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.pa.gov/agencies/education/programs-and-services/educators/educator-effectiveness">Pennsylvania Department of Education · Educator Effectiveness</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.pacodeandbulletin.gov/secure/pacode/data/022/chapter19/s19.2a.html">22 Pa. Code § 19.2a · Classroom teachers</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.pdesas.org/Page/Viewer/ViewPage/75">PDE/SAS Act 13 Toolkit</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://danielsongroup.org/the-framework-for-teaching/">Danielson Group · Framework access and licensing</a></li></ul> : <ul><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.maine.gov/doe/educators/educatoreval/educator">Maine DOE · Educator Effectiveness (PEPG)</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://legislature.maine.gov/statutes/20-A/title20-Ach508sec0.html">20-A M.R.S.A. ch. 508 · Educator Effectiveness</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://www.law.cornell.edu/regulations/maine/department-05/division-071/chapter-180">DOE Rule Chapter 180 · PEPG Systems</a></li><li><a className="ae-link" target="_blank" rel="noreferrer" href="https://danielsongroup.org/the-framework-for-teaching/">Danielson Group · Framework access and licensing</a></li></ul>}{AE_ACTIVE_FW.id === 'pa_act13' ? <div className="ae-note ae-warn">The older 50% observation model is not the default current Act 13 classroom-teacher composition. This workspace uses assignment-aware 70/10/10/10, 80% O&amp;P where Building Level Data is unavailable, and 100% O&amp;P for temporary classroom teachers.</div> : <div className="ae-note ae-warn">Maine PEPG systems are LOCAL: the district plan — built with a steering committee that must have a teacher majority chosen by the bargaining unit, revising by consensus — defines the rubric, rating levels, category weights, and process. Since the 2019 amendments, student learning &amp; growth measures are a district choice, not a state mandate. This workspace mirrors that plan; it never substitutes for it. Enter the plan’s Professional Practice / Student Learning &amp; Growth split above.</div>}</section>
      {role === 'evaluator' && <section className="ae-card ae-span-12"><details><summary>Advanced workspace options · AI reflection and custom rubric</summary><div style={{ paddingTop: 12 }}>{/* Off by default: this is the only feature that sends evaluation text off the device. */}<div className="ae-field ae-field-wide"><span>AI reflection (optional)</span><label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 6 }}><input type="checkbox" style={{ width: 24, height: 24, flex: '0 0 auto' }} checked={!!workspace.config.aiReflectionEnabled} onChange={(event) => updateConfig('aiReflectionEnabled', event.target.checked)} /><span className="ae-help" style={{ margin: 0 }}>Let an evaluator ask a model to check whether the evidence they wrote supports the ratings they assigned, and what other readings it allows. <strong>This sends the selected educator's evidence notes and ratings to your configured AI provider.</strong> The reply is advisory, shown to the evaluator only, and never written into the record. Leave this off if policy does not permit AI in evaluation.</span></label></div><div className="ae-field ae-field-wide"><span>Custom rubric</span><p className="ae-help">Using <strong>{AE_ACTIVE_FW.name}</strong> <code>{AE_ACTIVE_FW.versionTag}</code>. Load district-approved domains and components as JSON.</p><div className="ae-btn-row"><button type="button" className="ae-btn" onClick={exportRubric}>Download current rubric</button><button type="button" className="ae-btn" onClick={() => rubricFileRef.current && rubricFileRef.current.click()}>Load a custom rubric</button><input ref={rubricFileRef} type="file" accept="application/json,.json" hidden tabIndex={-1} aria-label="Choose custom evaluation rubric JSON" onChange={(event) => { const file = event.target.files && event.target.files[0]; if (file) importRubric(file); event.target.value = ''; }}/>{workspace.config.customRubric && <button type="button" className="ae-btn" onClick={clearRubric}>Restore the built-in rubric</button>}</div></div></div></details></section>}
      {(isRemote || (!isRemote && workspace.config.setupPath === 'local')) && <AeShareQr isRemote={isRemote} standalone={standalone} portalUrl={portalUrl}/>}
      {isRemote && currentUser && currentUser.role === 'admin' && repository && typeof repository.getSetupHealth === 'function' && <AeSetupHealth repository={repository}/>}
      {isRemote && currentUser && currentUser.role === 'admin' && repository && typeof repository.getAdminOperations === 'function' && <AeDistrictOperations workspace={workspace} repository={repository} onReload={onReload}/>}
      {isRemote && currentUser && currentUser.role === 'admin' && repository && typeof repository.reviewAnnualRollover === 'function' && typeof repository.performAnnualRollover === 'function' && typeof repository.reconcileAnnualRollover === 'function' && <AeAnnualRollover workspace={workspace} repository={repository} onReload={onReload}/>}
      {isRemote && <section className="ae-card ae-span-12"><h3>District-hosted portal boundary</h3><div className="ae-grid"><div className="ae-span-4"><h4>Verified identity</h4><p className="ae-sub">Signed in as {currentUser && currentUser.email ? currentUser.email : 'a managed district user'}. The server—not an emailed link—determines role and record assignments.</p></div><div className="ae-span-4"><h4>Repository and audit</h4><p className="ae-sub">The district repository validates authorized mutations, versions saves, filters reads, and records server-side audit events.</p></div><div className="ae-span-4"><h4>District responsibilities</h4><p className="ae-sub">The LEA still controls deployment, membership, assignments, retention, legal hold, incident response, approved forms, and licensed content.</p></div></div><div className="ae-note ae-warn"><strong>Google Workspace does not make a custom app automatically FERPA compliant.</strong> Use real records only after LEA authorization and review.</div></section>}
    </div>
  </div>;
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
function EducatorEvaluationPanel(props) {
  const { onClose = (() => {}), addToast = (() => {}), standalone = false, repository = null, initialRoute = null } = props || {};
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
    error: initialLocalLoad.status === 'unavailable' ? 'Browser storage is unavailable. Changes cannot be saved on this device.' : '',
    savedAt: initialLocalLoad.status === 'ok' ? aeNow() : '',
  }));
  const [pendingImport, setPendingImport] = React.useState(null);
  const [importUndo, setImportUndo] = React.useState(null);
  const [remoteState, setRemoteState] = React.useState(() => ({ status: isRemote ? 'loading' : 'local', error: '', currentUser: null, deployment: null, inFlight: false }));
  const [notificationState, setNotificationState] = React.useState({ status: 'idle', error: '' });
  const [releaseShareState, setReleaseShareState] = React.useState({ status: 'idle', error: '', review: null, result: null });
  const dialogRef = React.useRef(null);
  const workspaceRef = React.useRef(workspace);
  const remoteRevisionRef = React.useRef(0);
  const remoteSaveQueueRef = React.useRef(Promise.resolve());
  const remoteSaveGenerationRef = React.useRef(0);
  const remoteDebounceRef = React.useRef(null);
  const remotePendingRef = React.useRef(null);
  const remoteMountedRef = React.useRef(true);
  const remoteUserRef = React.useRef(null);
  const remoteInFlightRef = React.useRef(false);
  const selectedTeacher = workspace.teachers.find((teacher) => teacher.id === selectedTeacherId) || null;
  const localTeacherPreview = !isRemote && role === 'teacher' && !workspace.educatorPacketMode;
  const notify = React.useCallback((message, type) => {
    const tone = type || 'info';
    try { addToast(message, tone); } catch (_) {}
    setOperationNotice({ text: String(message || ''), type: tone, id: Date.now() });
    setLiveMessage({ text: String(message || ''), id: Date.now() });
  }, [addToast]);

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
      if (!payload || payload.ok === false) throw new Error((payload && payload.error) || 'The district portal did not return a workspace.');
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
      setRole(nextRole);
      setSelectedTeacherId(nextTeacherId);
      setTab(allowedViews.includes(requestedView) ? requestedView : 'overview');
      remoteUserRef.current = currentUser;
      setRemoteState({ status: 'saved', error: '', currentUser, deployment: aePlainObject(payload.deployment) ? payload.deployment : null, inFlight: false });
    } catch (error) {
      if (!remoteMountedRef.current) return;
      setRemoteState((current) => ({ ...current, status: 'error', error: String((error && error.message) || error || 'Unable to open the district portal.'), inFlight: false }));
    }
  }, [isRemote, repository, initialRoute]);

  React.useEffect(() => {
    remoteMountedRef.current = true;
    if (isRemote) loadRemoteWorkspace();
    return () => {
      remoteMountedRef.current = false;
      if (remoteDebounceRef.current) clearTimeout(remoteDebounceRef.current);
    };
  }, [isRemote, loadRemoteWorkspace]);

  React.useEffect(() => {
    if (!isRemote) return undefined;
    const beforeUnload = (event) => {
      const pending = remoteInFlightRef.current || remoteState.status === 'saving' || !!remoteDebounceRef.current || !!remotePendingRef.current;
      if (!pending) return;
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
      if (!isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
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
  }, [standalone, onClose]);

  const announce = React.useCallback((message) => {
    setLiveMessage((current) => ({ text: '', id: current.id + 1 }));
    setTimeout(() => setLiveMessage((current) => ({ text: message, id: current.id + 1 })), 0);
  }, []);

  const sendPortalNotice = React.useCallback(async () => {
    if (!isRemote || !selectedTeacher || typeof repository.sendNotification !== 'function' || notificationState.status === 'sending') return;
    const target = role === 'teacher' ? 'evaluator' : 'teacher';
    setNotificationState({ status: 'sending', error: '' });
    try {
      const result = await repository.sendNotification({ teacherId: selectedTeacher.id, target });
      if (!result || result.ok === false) throw new Error((result && (result.error || result.message)) || 'The portal notice could not be sent.');
      if (!remoteMountedRef.current) return;
      setNotificationState({ status: 'sent', error: '' });
      const message = role === 'teacher' ? 'A content-free portal notice was emailed to your evaluator.' : 'A content-free portal notice was emailed to the educator.';
      announce(message);
      notify(message, 'success');
    } catch (error) {
      if (!remoteMountedRef.current) return;
      const message = String((error && error.message) || error || 'The portal notice could not be sent.');
      setNotificationState({ status: 'error', error: message });
      notify(message, 'error');
    }
  }, [isRemote, selectedTeacher, repository, notificationState.status, role, announce, notify]);

  // Share the finalized evaluation with the educator as a view-only,
  // strengths-first Google Doc (server-built; see sharePortalReleasedEvaluation
  // in Code.gs). Reloads the district copy afterwards so the record's
  // releasedDoc link appears for both parties.
  const beginReleasedEvaluationReview = React.useCallback(async () => {
    if (!isRemote || !selectedTeacher || typeof repository.reviewReleasedEvaluation !== 'function' || ['reviewing', 'sending'].includes(releaseShareState.status)) return;
    setReleaseShareState({ status: 'reviewing', error: '', review: null, result: null });
    try {
      const result = await repository.reviewReleasedEvaluation({ teacherId: selectedTeacher.id });
      if (!result || result.ok === false || !result.review || !result.review.token) throw new Error((result && (result.error || result.message)) || 'The release disclosure could not be prepared.');
      if (!remoteMountedRef.current) return;
      setReleaseShareState({ status: 'ready', error: '', review: result.review, result: null });
      announce('Released-summary disclosure review opened. Nothing has been shared yet.');
    } catch (error) {
      if (!remoteMountedRef.current) return;
      const message = String((error && error.message) || error || 'The release disclosure could not be prepared.');
      setReleaseShareState({ status: 'error', error: message, review: null, result: null });
      notify(message, 'error');
    }
  }, [isRemote, selectedTeacher, repository, releaseShareState.status, announce, notify]);

  const shareReleasedEvaluation = React.useCallback(async () => {
    const review = releaseShareState.review;
    if (!isRemote || !selectedTeacher || !review || typeof repository.shareReleasedEvaluation !== 'function' || releaseShareState.status === 'sending') return;
    setReleaseShareState((current) => ({ ...current, status: 'sending', error: '' }));
    try {
      const result = await repository.shareReleasedEvaluation({ teacherId: selectedTeacher.id, reviewToken: review.token });
      if (!result || result.ok === false) throw new Error((result && (result.error || result.message)) || 'The released evaluation could not be shared.');
      if (!remoteMountedRef.current) return;
      const pending = !!result.recoveryPending;
      setReleaseShareState({ status: pending ? 'recovery' : 'sent', error: '', review: null, result });
      const message = pending
        ? 'Drive access was granted, but the repository confirmation is still recovering. Do not repeat the release; ask an administrator to run Setup health.'
        : (result.idempotent ? 'The existing released summary was verified; missing view access was restored without creating a duplicate.' : 'A view-only released summary was created and recorded for the educator district account.');
      announce(message);
      notify(message, pending ? 'error' : 'success');
      if (!pending) loadRemoteWorkspace();
    } catch (error) {
      if (!remoteMountedRef.current) return;
      const message = String((error && error.message) || error || 'The released evaluation could not be shared.');
      setReleaseShareState((current) => ({ ...current, status: 'ready', error: message }));
      notify(message, 'error');
    }
  }, [isRemote, selectedTeacher, repository, releaseShareState, announce, notify, loadRemoteWorkspace]);

  const cancelReleasedEvaluationReview = React.useCallback(() => {
    if (releaseShareState.status === 'sending') return;
    setReleaseShareState({ status: 'idle', error: '', review: null, result: null });
    announce('Released-summary review canceled. Nothing was shared.');
  }, [releaseShareState.status, announce]);

  const enqueueRemoteSave = React.useCallback((job) => {
    if (!isRemote || !job || remoteInFlightRef.current) return;
    remoteInFlightRef.current = true;
    setRemoteState((current) => ({ ...current, status: 'saving', error: '', inFlight: true }));
    remoteSaveQueueRef.current = remoteSaveQueueRef.current.catch(() => undefined).then(async () => {
      const result = await repository.saveWorkspace({
        workspace: job.workspace,
        expectedVersion: remoteRevisionRef.current,
        mutation: job.mutation,
      });
      if (!result || result.ok === false) {
        const error = new Error((result && (result.error || result.message)) || 'The district portal did not save the change.');
        if (result && result.code) error.code = result.code;
        throw error;
      }
      const revision = Number(result.revision);
      if (!Number.isInteger(revision) || revision < 0) throw new Error('The district portal returned an invalid record version.');
      remoteRevisionRef.current = revision;
      if (!remoteMountedRef.current) { remoteInFlightRef.current = false; return; }
      if (job.generation === remoteSaveGenerationRef.current && result.workspace) {
        const canonical = aeRemoteScopedWorkspace(result.workspace, remoteUserRef.current);
        if (!canonical) throw new Error('The district portal returned an invalid saved workspace.');
        workspaceRef.current = canonical;
        setWorkspace(canonical);
      }
      remoteInFlightRef.current = false;
      if (job.generation === remoteSaveGenerationRef.current) {
        setRemoteState((current) => ({ ...current, status: 'saved', error: '', inFlight: false }));
      }
    }).catch((error) => {
      remoteInFlightRef.current = false;
      if (!remoteMountedRef.current || job.generation !== remoteSaveGenerationRef.current) return;
      const message = String((error && error.message) || error || 'The district portal could not save this change.');
      setRemoteState((current) => ({ ...current, status: 'error', error: message, inFlight: false }));
      notify(message, 'error');
    });
  }, [isRemote, repository, notify]);

  const queueRemoteSave = React.useCallback((snapshot, audit) => {
    if (!isRemote) return;
    const generation = ++remoteSaveGenerationRef.current;
    const mutation = audit ? {
      teacherId: aeSafeId(audit.teacherId, ''), event: aeString(audit.event, 40, ''),
      summary: aeString(audit.summary, 240, ''), entityType: aeString(audit.entityType, 60, ''),
      entityId: aeSafeId(audit.entityId, ''), version: Math.max(1, parseInt(audit.version, 10) || 1),
    } : null;
    const job = { workspace: aeClone(snapshot), mutation, generation };
    const debounced = mutation && ['DRAFT_SAVED', 'PROFILE_UPDATED', 'CONFIG_UPDATED', 'RATING_UPDATED'].includes(mutation.event);
    if (debounced) {
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
    remotePendingRef.current = null;
    enqueueRemoteSave(job);
  }, [isRemote, enqueueRemoteSave]);

  const commit = React.useCallback((mutator, audit, message) => {
    if (localTeacherPreview) {
      notify('Read-only educator preview: switch back to Evaluator, use an educator response packet, or open the authenticated district portal to make changes.', 'info');
      return;
    }
    if (isRemote && (remoteInFlightRef.current || remoteState.status === 'error')) {
      const waitMessage = remoteState.status === 'error'
        ? 'Reload the district copy before making another change.'
        : 'Please wait for the current district save to finish before making another change.';
      announce(waitMessage);
      notify(waitMessage, 'error');
      return;
    }
    const next = aeClone(workspaceRef.current);
    mutator(next);
    const durableAudit = audit && !['DRAFT_SAVED', 'PROFILE_UPDATED', 'CONFIG_UPDATED'].includes(audit.event);
    if (durableAudit && !isRemote) {
      aeAuditEvent(next, audit, role === 'teacher' ? ((next.teachers.find((teacher) => teacher.id === (audit.teacherId || selectedTeacherId)) || {}).name || 'Teacher') : (next.config.evaluatorName || 'Evaluator'), role === 'teacher' ? 'Teacher' : 'Evaluator');
    }
    workspaceRef.current = next;
    setWorkspace(next);
    setImportUndo(null);
    if (isRemote) queueRemoteSave(next, audit);
    if (message) {
      announce(message);
      notify(message, 'success');
      if (audit && ['SUBMITTED', 'CONFERENCED', 'EVIDENCE_PUBLISHED', 'SIGNED', 'ACKNOWLEDGED', 'FINALIZED', 'APPROVED', 'RETURNED', 'RELEASED'].includes(audit.event)) {
        requestAnimationFrame(() => { const panel = document.getElementById('ae-panel'); if (panel) panel.focus(); });
      }
    }
  }, [role, selectedTeacherId, announce, isRemote, queueRemoteSave, remoteState.status, localTeacherPreview, notify]);

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
        frameworkVersion: teacher.frameworkVersion || AE_FRAMEWORK,
      };
      if (existing) Object.assign(existing, snapshot); else next.cycleSnapshots.push(snapshot);
    }
  }, { teacherId: id, event, summary, entityType: 'educator_cycle', entityId: id }, null);

  const addTeacher = (details) => {
    const input = aePlainObject(details) ? details : {};
    const name = aeString(input.name, 160, '').trim();
    const code = aeString(input.code, 40, '').trim();
    if (!name || !code) { notify('Educator was not added: name and staff code are required.', 'error'); return ''; }
    if (workspaceRef.current.teachers.some((teacher) => teacher.code.toLowerCase() === code.toLowerCase())) { notify('Educator was not added: that staff code already exists.', 'error'); return ''; }
    const id = aeId('teacher');
    commit((next) => { next.teachers.push({ id, code, name, building: aeString(input.building, 160, next.config.building), assignment: aeString(input.assignment, 240, ''), employeeType: 'professional', buildingData: true, teacherSpecificData: true, active: true, evaluator: next.config.evaluatorName, dueDate: aeString(input.dueDate, 10, ''), cycleStatus: 'not_started', ratings: { domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null } }); }, { teacherId: id, event: 'CREATED', summary: 'Educator evaluation assignment created', entityType: 'educator_cycle', entityId: id }, 'Educator added');
    setSelectedTeacherId(id);
    return id;
  };

  const createWalkthrough = (data) => {
    const id = aeId('walk'); const now = aeNow();
    commit((next) => {
      next.walkthroughs.unshift(Object.assign({
        id, createdAt: now, observer: next.config.evaluatorName, version: 1, teacherAcknowledgedAt: null,
      }, data, { startedAt: data.startedAt || now, publishedAt: data.published ? now : null }));
      const teacher = next.teachers.find((item) => item.id === data.teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = now; }
      aeRecalculateCycleStatus(next, data.teacherId);
    }, { teacherId: data.teacherId, event: data.published ? 'EVIDENCE_PUBLISHED' : 'DRAFT_SAVED', summary: data.published ? 'Walkthrough published to teacher' : 'Private walkthrough draft saved', entityType: 'walkthrough', entityId: id }, data.published ? 'Walkthrough published' : 'Draft saved');
    return id;
  };

  const publishWalkthrough = (id) => {
    const record = workspace.walkthroughs.find((item) => item.id === id);
    if (!record || record.publishedAt) return;
    commit((next) => {
      const item = next.walkthroughs.find((value) => value.id === id);
      if (!item || item.publishedAt) return;
      item.privacyChecked = true;
      item.publishedAt = aeNow();
      item.updatedAt = item.publishedAt;
      const teacher = next.teachers.find((value) => value.id === item.teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = item.updatedAt; }
      aeRecalculateCycleStatus(next, item.teacherId);
    }, { teacherId: record.teacherId, event: 'EVIDENCE_PUBLISHED', summary: 'Saved walkthrough draft published to teacher', entityType: 'walkthrough', entityId: id, version: record.version || 1 }, 'Walkthrough published');
  };

  const acknowledgeWalkthrough = (id) => {
    const record = workspace.walkthroughs.find((item) => item.id === id);
    if (!record || !record.publishedAt || record.teacherAcknowledgedAt) return;
    commit((next) => {
      const item = next.walkthroughs.find((value) => value.id === id);
      if (!item) return;
      item.teacherAcknowledgedAt = aeNow();
      aeRecalculateCycleStatus(next, item.teacherId);
    }, { teacherId: record.teacherId, event: 'ACKNOWLEDGED', summary: 'Teacher acknowledged walkthrough receipt', entityType: 'walkthrough', entityId: id }, 'Receipt acknowledged');
  };

  const createObservation = (teacherId) => {
    const id = aeId('formal'); const now = aeNow();
    commit((next) => {
      next.observations.unshift({ id, teacherId, createdAt: now, frameworkVersion: AE_FRAMEWORK, version: 1, prework: {}, ratings: { d1: null, d2: null, d3: null, d4: null }, rationales: {}, componentTags: [] });
      const teacher = next.teachers.find((item) => item.id === teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = now; }
      aeRecalculateCycleStatus(next, teacherId);
    }, { teacherId, event: 'ASSIGNED', summary: 'Formal observation assigned', entityType: 'formal_observation', entityId: id }, 'Formal observation assigned');
    return id;
  };

  const updateObservation = (id, changes, event, summary) => {
    const record = workspace.observations.find((item) => item.id === id);
    if (!record || record.finalizedAt) return;
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
    const existing = workspace.spms.find((item) => item.teacherId === teacherId);
    if (existing) return existing.id;
    const id = aeId('spm'); const now = aeNow();
    commit((next) => {
      next.spms.unshift({ id, teacherId, createdAt: now, status: 'draft', version: 1, context: '', baseline: '', goal: '', measures: '', actionPlan: '', revisions: [] });
      const teacher = next.teachers.find((item) => item.id === teacherId);
      if (teacher) { aeFreezeTeacherCycle(teacher); teacher.lastActivityAt = now; }
      aeRecalculateCycleStatus(next, teacherId);
    }, { teacherId, event: 'CREATED', summary: 'SPM proposal created', entityType: 'spm', entityId: id }, 'SPM proposal started');
    return id;
  };

  const updateSpm = (id, changes, event, summary) => {
    const record = workspace.spms.find((item) => item.id === id);
    if (!record || record.status === 'locked') return;
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
  const addComment = ({ recordType, recordId, teacherId, text }) => commit((next) => { next.comments.push({ id: aeId('comment'), recordType, recordId, teacherId, text, role: role === 'teacher' ? 'Teacher' : 'Evaluator', author: role === 'teacher' ? ((next.teachers.find((teacher) => teacher.id === teacherId) || {}).name || 'Teacher') : next.config.evaluatorName, at: aeNow(), version: 1 }); }, { teacherId, event: 'COMMENTED', summary: 'Shared comment posted', entityType: recordType, entityId: recordId }, 'Comment posted');

  const updateConfig = (field, value) => commit((next) => { next.config[field] = value; }, { event: 'CONFIG_UPDATED', summary: 'Workspace configuration updated', entityType: 'workspace', entityId: 'config' }, null);

  const applySimulationWorkspace = (value) => {
    const next = aeNormalizeWorkspace(value);
    if (!next || !next.config.sampleMode) { notify('Simulation was not applied: only fictional workspaces are accepted.', 'error'); return; }
    workspaceRef.current = next;
    setWorkspace(next);
    setSelectedTeacherId((next.teachers[0] && next.teachers[0].id) || '');
    aeSaveOnboardingChoice('sample');
    announce('Simulated scenario applied with ' + next.teachers.length + ' fictional educators');
    notify('Simulated scenario applied', 'success');
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
    announce(mode === 'sample' ? 'Simulated evaluation workspace opened' : (mode === 'setup' ? 'Sharing setup opened' : 'Blank evaluation workspace started'));
    notify(mode === 'sample' ? 'Simulated data loaded' : (mode === 'setup' ? 'Choose a sharing path' : 'Blank workspace started'), 'success');
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
    announce('Blank evaluation workspace started');
    notify('Blank workspace started', 'success');
  };

  const exportWorkspace = () => { const payload = Object.assign({}, workspace, { kind: AE_EXPORT_KIND, exportedAt: aeNow() }); aeDownload('alloflow-evaluation-' + aeToday() + '.json', 'application/json', JSON.stringify(payload, null, 2)); commit(() => {}, { event: 'EXPORTED', summary: 'Workspace JSON exported', entityType: 'workspace', entityId: 'workspace' }, 'Workspace export created'); };
  const exportCsv = () => { const rows = workspace.teachers.map((teacher) => ({ staff_code: teacher.code, educator: teacher.name, building: teacher.building, assignment: teacher.assignment, employee_type: teacher.employeeType, evaluation_status: aeTeacherStatus(teacher), due_date: teacher.dueDate, evaluator: teacher.evaluator, walkthroughs: workspace.walkthroughs.filter((item) => item.teacherId === teacher.id && item.publishedAt).length, formal_observation: workspace.observations.some((item) => item.teacherId === teacher.id && item.finalizedAt) ? 'finalized' : (workspace.observations.some((item) => item.teacherId === teacher.id) ? 'in_progress' : 'not_started'), spm_status: (workspace.spms.find((item) => item.teacherId === teacher.id) || {}).status || 'not_started' })); aeDownload('evaluation-status-' + aeToday() + '.csv', 'text/csv;charset=utf-8', '\uFEFF' + aeCsv(rows)); commit(() => {}, { event: 'EXPORTED', summary: 'Evaluation status CSV exported', entityType: 'workspace', entityId: 'workspace' }, 'Status CSV created'); };
  // Formative growth snapshot: the growth-first companion to the released
  // summary, available at ANY point in the cycle. Published records only, no
  // ratings and no bands anywhere — evidence, the educator's own words, and
  // derived (never invented) observations about where documentation is rich
  // or thin. Both roles generate the identical document.
  const exportGrowthSnapshot = () => {
    if (!selectedTeacher) return;
    const walks = workspace.walkthroughs.filter((item) => item.teacherId === selectedTeacher.id && item.publishedAt);
    const observations = workspace.observations.filter((item) => item.teacherId === selectedTeacher.id);
    const publishedObs = observations.filter((item) => item.evidencePublishedAt);
    const spm = workspace.spms.find((item) => item.teacherId === selectedTeacher.id);
    const componentLookup = {};
    AE_DOMAINS.forEach((domain) => ((AE_ACTIVE_FW.components && AE_ACTIVE_FW.components[domain.id]) || domain.components).forEach(([code, label]) => { componentLookup[code] = { label, domain: domain.label }; }));
    const tagCounts = {};
    walks.concat(publishedObs).forEach((record) => (record.componentTags || []).forEach((code) => { tagCounts[code] = (tagCounts[code] || 0) + 1; }));
    const topTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 3);
    const domainsWithTags = new Set(Object.keys(tagCounts).map((code) => (componentLookup[code] || {}).domain).filter(Boolean));
    const quietDomains = AE_DOMAINS.map((domain) => domain.label).filter((label) => !domainsWithTags.has(label));
    const interpretations = walks.filter((item) => item.interpretation).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 8);
    const statement = selectedTeacher.educatorStatement && selectedTeacher.educatorStatement.text;
    const pieces = walks.length + publishedObs.length;
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Growth snapshot (formative)</title><style>body{font:14px system-ui;color:#172033;max-width:850px;margin:40px auto;padding:0 24px}h1{color:#14532d}h2{color:#173e70}blockquote{margin:8px 0;padding:8px 14px;border-left:4px solid #16815d;background:#f2faf6}.notice{padding:12px;background:#eef6ff;border:1px solid #93b8e8}ul{padding-left:22px}</style></head><body>'
      + '<h1>Growth snapshot — formative</h1>'
      + '<p><strong>' + aeEsc(selectedTeacher.name) + '</strong> · ' + aeEsc(workspace.config.organization) + ' · ' + aeEsc(workspace.config.academicYear) + '</p>'
      + '<p class="notice"><strong>This is a growth document, not an evaluation.</strong> It contains no ratings, is generated identically for educator and evaluator, and only reflects records already published to the educator. It exists to support a growth conversation partway through the cycle.</p>'
      + (statement ? '<h2>In the educator’s own words</h2><blockquote>' + aeEsc(statement) + '</blockquote>' : '')
      + '<h2>Bright spots from published walkthroughs</h2>'
      + (interpretations.length ? '<ul>' + interpretations.map((item) => '<li><strong>' + aeEsc(aeDate(item.date || item.publishedAt)) + ':</strong> ' + aeEsc(item.interpretation) + '</li>').join('') + '</ul>' : '<p>No published walkthrough feedback yet this cycle.</p>')
      + '<h2>Evidence so far</h2>'
      + '<p>' + pieces + ' portal-tracked evidence piece' + (pieces === 1 ? '' : 's') + ' (' + walks.length + ' published walkthrough' + (walks.length === 1 ? '' : 's') + ' + ' + publishedObs.length + ' observation' + (publishedObs.length === 1 ? '' : 's') + ' with published evidence).'
      + (AE_ACTIVE_FW.id === 'portland_me' ? ' The guidebook calls for at least nine pieces per cycle across the full range of practice; evidence gathered outside this portal counts toward that as well.' : '')
      + (spm ? ' Student-measure record status: ' + aeEsc(spm.status.replace(/_/g, ' ')) + '.' : '') + '</p>'
      + '<h2>Where the documentation is rich — and thin</h2>'
      + (topTags.length ? '<p>Most-documented areas so far: ' + topTags.map((code) => '<strong>' + aeEsc(code) + ' ' + aeEsc((componentLookup[code] || {}).label || '') + '</strong> (' + tagCounts[code] + ')').join(', ') + '.</p>' : '<p>No evidence tags recorded yet.</p>')
      + (quietDomains.length && pieces > 0 ? '<p>Little or no tagged evidence yet in: ' + quietDomains.map(aeEsc).join(', ') + '. That is a documentation gap to look at together — not a judgment about practice.</p>' : '')
      + '<p>Generated ' + aeEsc(aeDateTime(aeNow())) + ' · identical for educator and evaluator · the ' + (isRemote ? 'district portal' : 'workspace') + ' remains the record.</p></body></html>';
    aeDownload('growth-snapshot-' + selectedTeacher.code + '-' + aeToday() + '.html', 'text/html;charset=utf-8', html);
    commit(() => {}, { teacherId: selectedTeacher.id, event: 'EXPORTED', summary: 'Formative growth snapshot exported', entityType: 'evaluation', entityId: selectedTeacher.id }, 'Growth snapshot created');
  };
  const exportSummary = () => {
    if (!selectedTeacher) return;
    const score = selectedTeacher.finalizedAt && selectedTeacher.finalScore != null ? selectedTeacher.finalScore : aeOverallScore(selectedTeacher);
    const profile = aeWeightProfile(selectedTeacher);
    const isPortland = AE_ACTIVE_FW.id === 'portland_me';
    const portlandRollup = isPortland ? aePortlandPracticeRating(selectedTeacher.ratings.domains) : null;
    const domainColumn = AE_ACTIVE_FW.id === 'pa_act13' ? 'Weight within O&amp;P' : (isPortland ? 'Guidebook input' : 'Share in this planning profile');
    const domainRows = AE_DOMAINS.map((domain) => '<tr><td>' + aeEsc(domain.label) + '</td><td>' + (AE_ACTIVE_FW.id === 'pa_act13' ? domain.weight + '%' : (isPortland ? 'Categorical domain rating' : '25%')) + '</td><td>' + aeEsc(selectedTeacher.ratings.domains[domain.id] == null ? 'Not rated' : selectedTeacher.ratings.domains[domain.id]) + '</td></tr>').join('');
    const calculation = isPortland
      ? (portlandRollup ? 'Portland Professional Practice roll-up: ' + portlandRollup.label + ' — ' + portlandRollup.rule : 'Incomplete')
      : (score == null ? 'Incomplete' : score.toFixed(2) + ' · ' + aeBand(score));
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Evaluation workflow summary</title><style>body{font:14px system-ui;color:#172033;max-width:850px;margin:40px auto;padding:0 24px}h1{color:#173e70}table{border-collapse:collapse;width:100%;margin:14px 0}th,td{border:1px solid #ccd5e2;padding:8px;text-align:left}.notice{padding:12px;background:#fff8e8;border:1px solid #e5bd59}</style></head><body><h1>Educator evaluation workflow summary</h1><p><strong>' + aeEsc(workspace.config.organization) + '</strong> · ' + aeEsc(workspace.config.academicYear) + '</p><h2>' + aeEsc(selectedTeacher.name) + ' · ' + aeEsc(selectedTeacher.code) + '</h2><p>' + aeEsc(selectedTeacher.assignment) + ' · evaluator ' + aeEsc(selectedTeacher.evaluator) + '</p><h2>Weighting snapshot</h2><table><thead><tr><th>Factor</th><th>Weight</th></tr></thead><tbody>' + profile.map((part) => '<tr><td>' + aeEsc(part.label) + '</td><td>' + part.weight + '%</td></tr>').join('') + '</tbody></table><h2>' + aeEsc(AE_ACTIVE_FW.practiceLabel) + ' ratings</h2><table><thead><tr><th>Domain</th><th>' + domainColumn + '</th><th>Rating</th></tr></thead><tbody>' + domainRows + '</tbody></table><p><strong>Calculation preview:</strong> ' + aeEsc(calculation) + '</p><p class="notice"><strong>Workflow aid only.</strong> ' + (AE_ACTIVE_FW.id === 'pa_act13' ? 'This is not an official PDE rating form or proof of PEERS release. Verify all inputs and complete the LEA-authorized process.' : 'This is not an official PEPG summative form. Verify all inputs against your district’s PEPG plan and complete the district-authorized process.') + '</p><p>Generated ' + aeEsc(aeDateTime(aeNow())) + '</p></body></html>';
    aeDownload('evaluation-summary-' + selectedTeacher.code + '-' + aeToday() + '.html', 'text/html;charset=utf-8', html); commit(() => {}, { teacherId: selectedTeacher.id, event: 'EXPORTED', summary: 'Educator workflow summary exported', entityType: 'evaluation', entityId: selectedTeacher.id }, 'Summary export created');
  };
  const [packetIncludeNames, setPacketIncludeNames] = React.useState(true);
  const exportEducatorPacket = () => {
    if (!selectedTeacher) return;
    const packet = aeEducatorPacket(workspace, selectedTeacher.id, { includeNames: packetIncludeNames });
    if (!packet) { notify('Export failed: no record for that educator.', 'error'); return; }
    const who = packetIncludeNames ? selectedTeacher.name : selectedTeacher.code;
    // The attachment is self-contained: an educator reads it, types a response, and downloads a
    // reply file without installing anything, signing in, or opening AlloFlow. That is the whole
    // point of the packet -- asking a teacher to learn a tool in order to write two paragraphs is
    // worse than the Google Form it replaces.
    const packetTeacher = (packet.teachers && packet.teachers[0]) || {};
    const field = (label, value) => value == null || value === '' ? '' : '<div class="field"><h4>' + aeEsc(label) + '</h4><div class="evidence">' + aeEsc(value) + '</div></div>';
    const tags = (values) => Array.isArray(values) && values.length ? '<p class="tags"><strong>Evidence tags:</strong> ' + values.map(aeEsc).join(', ') + '</p>' : '';
    const acknowledged = (value) => value ? '<p class="receipt">Acknowledged ' + aeEsc(aeDateTime(value)) + '. Acknowledgment records receipt, not agreement.</p>' : '';
    const releasedRatingLabel = (value) => (AE_ACTIVE_FW.ratingLabels && AE_ACTIVE_FW.ratingLabels[value]) || aeRatingLabel(value);
    const ackControl = (collection, item, id, words) => item.teacherAcknowledgedAt ? acknowledged(item.teacherAcknowledgedAt)
      : '<div class="ackrow"><input type="checkbox" id="' + id + '" data-collection="' + collection + '" data-ack-record="' + aeEsc(item.id) + '"><label for="' + id + '">' + aeEsc(words) + '</label></div><p class="fine">This records receipt, not agreement, and does not replace any signature required by your district.</p>';
    const domainRows = (ratings, rationales) => AE_DOMAINS.map((domain) => {
      const rating = ratings && ratings[domain.id];
      if (rating == null) return '';
      return '<tr><th scope="row">' + aeEsc(domain.code + '. ' + domain.label) + '</th><td>' + aeEsc(String(rating) + ' · ' + releasedRatingLabel(rating)) + '</td><td>' + aeEsc((rationales && rationales[domain.id]) || '') + '</td></tr>';
    }).join('');
    const walkthroughRows = (packet.walkthroughs || []).map((item, index) => '<section class="card rec" aria-labelledby="ae-walk-title-' + index + '">'
      + '<h3 id="ae-walk-title-' + index + '">Published walkthrough · ' + aeEsc(aeDate(item.date || item.publishedAt)) + '</h3>'
      + '<p class="meta">' + aeEsc((item.durationMin || '') + ' minutes · ' + String(item.announced || '').replace(/_/g, ' ') + (item.subject ? ' · ' + item.subject : '')) + '</p>'
      + field('Directly witnessed evidence', item.evidence)
      + field('Published interpretation / feedback', item.interpretation)
      + tags(item.componentTags)
      + ackControl('walkthroughs', item, 'ae-walk-ack-' + index, 'I acknowledge receipt of this published walkthrough.')
      + '</section>').join('');
    const observationRows = (packet.observations || []).map((item, index) => {
      const prework = item.prework || {};
      const preworkHtml = item.preworkSubmittedAt ? '<details><summary>Submitted pre-observation materials</summary>'
        + field('Lesson / unit plan', prework.plan) + field('Expected outcomes', prework.outcomes)
        + field('Resources and planned supports', prework.resources) + field('Assessment / evidence of learning', prework.assessment)
        + field('Secure artifact references', prework.artifactReferences) + '</details>' : '';
      const assessment = item.evaluatorSignedAt ? '<h4>Released evaluator assessment</h4><div class="tablewrap" tabindex="0" role="region" aria-label="Released formal-observation ratings"><table><thead><tr><th>Domain</th><th>Rating</th><th>Rationale</th></tr></thead><tbody>' + domainRows(item.ratings, item.rationales) + '</tbody></table></div><p class="meta">Evaluator signed ' + aeEsc(aeDateTime(item.evaluatorSignedAt)) + '.</p>' : '';
      const reflection = item.reflectionSubmittedAt ? field('Your submitted reflection', item.reflection) + '<p class="meta">Submitted ' + aeEsc(aeDateTime(item.reflectionSubmittedAt)) + '.</p>'
        : (item.evidencePublishedAt && !item.postConferenceAt && !item.evaluatorSignedAt && !item.finalizedAt
          ? '<label class="lbl" for="ae-refl-' + index + '">Your reflection on this observation (optional)</label><textarea id="ae-refl-' + index + '" data-collection="observations" data-record="' + aeEsc(item.id) + '" rows="4"></textarea>' : '');
      const ack = item.evaluatorSignedAt ? ackControl('observations', item, 'ae-obs-ack-' + index, 'I acknowledge receipt of this formal-observation assessment and had an opportunity to discuss it.') : '';
      return '<section class="card rec" aria-labelledby="ae-obs-title-' + index + '"><h3 id="ae-obs-title-' + index + '">Formal observation · ' + aeEsc(aeDate(item.observedAt || item.createdAt)) + '</h3>'
        + '<p class="meta">' + (item.finalizedAt ? 'Finalized ' + aeEsc(aeDateTime(item.finalizedAt)) : 'Workflow record issued with the released material available below.') + '</p>'
        + preworkHtml
        + (item.evidencePublishedAt ? field('Published observation evidence', item.evidence) + tags(item.componentTags) + '<p class="meta">Published ' + aeEsc(aeDateTime(item.evidencePublishedAt)) + '.</p>' : '<p class="fine">No observation evidence has been released in this record yet.</p>')
        + reflection + field('Released post-conference discussion and follow-up', item.postConferenceNotes)
        + assessment + ack + '</section>';
    }).join('');
    const spmRows = (packet.spms || []).map((item, index) => '<section class="card rec" aria-labelledby="ae-spm-title-' + index + '"><h3 id="ae-spm-title-' + index + '">SPM / SLO record · ' + aeEsc(String(item.status || '').replace(/_/g, ' ')) + '</h3>'
      + '<p class="meta">Submitted plan version ' + aeEsc(item.version || 1) + (item.submittedAt ? ' · ' + aeEsc(aeDateTime(item.submittedAt)) : '') + '</p>'
      + field('Classroom context and priority learning need', item.context) + field('Baseline', item.baseline)
      + field('Goal and expected outcomes', item.goal) + field('Performance measures and indicators', item.measures)
      + field('Action plan, supports, and evidence sources', item.actionPlan)
      + field('Returned for revision', item.returnReason)
      + (item.approvedAt ? '<p class="receipt">Plan approved by ' + aeEsc(item.approvedBy || 'Evaluator') + ' · ' + aeEsc(aeDateTime(item.approvedAt)) + '.</p>' : '')
      + field('Submitted year-end results', item.results) + field('Your submitted SPM reflection', item.reflection)
      + (item.lockedAt ? '<h4>Released SPM rating</h4><p><strong>' + aeEsc(String(item.rating) + ' · ' + releasedRatingLabel(item.rating)) + '</strong></p>' + field('Rating rationale', item.ratingRationale) + '<p class="meta">Locked ' + aeEsc(aeDateTime(item.lockedAt)) + '.</p>' : '')
      + '</section>').join('');
    const comments = (packet.comments || []).length ? '<section class="card"><h2>Shared conversation</h2>' + packet.comments.map((item) => '<article class="comment"><p><strong>' + aeEsc(item.author || item.role || 'Participant') + '</strong> · ' + aeEsc(aeDateTime(item.at)) + '</p><div class="evidence">' + aeEsc(item.text || '') + '</div></article>').join('') + '</section>' : '';
    const annualRatings = packetTeacher.finalizedAt && packetTeacher.ratings ? '<section class="card"><h2>Finalized annual ratings</h2><div class="tablewrap" tabindex="0" role="region" aria-label="Finalized annual domain ratings"><table><thead><tr><th>Domain</th><th>Rating</th><th>Rationale</th></tr></thead><tbody>' + domainRows(packetTeacher.ratings.domains, null) + '</tbody></table></div>'
      + (packetTeacher.finalScore == null ? '' : '<p><strong>Final calculation: ' + aeEsc(Number(packetTeacher.finalScore).toFixed(2)) + ' · ' + aeEsc(aeBand(packetTeacher.finalScore)) + '</strong></p>')
      + '<p class="meta">Finalized ' + aeEsc(aeDateTime(packetTeacher.finalizedAt)) + '.</p></section>' : '';
    const existingStatement = packetTeacher.educatorStatement && packetTeacher.educatorStatement.text ? packetTeacher.educatorStatement.text : '';
    const statementControl = packetTeacher.finalizedAt
      ? field('Your educator statement', existingStatement) + '<p class="fine">The annual cycle is finalized, so this statement is shown read-only. Follow your district process if an addendum is needed.</p>'
      : '<label class="lbl" for="ae-statement">Your statement (in your own words)</label><textarea id="ae-statement" rows="6">' + aeEsc(existingStatement) + '</textarea>';
    const nameNotice = packet.includeNames
      ? 'This packet includes profile/display names and released free text.'
      : '<strong>Profile/display names were replaced with the educator code and role labels.</strong> Free-text evidence, comments, statements, and reflections were not de-identified and may still name or identify people.';
    const readable = '<!doctype html><html lang="en"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width, initial-scale=1">'
      + '<title>Your evaluation</title>'
      + '<style>body{font:16px/1.6 system-ui,sans-serif;color:#172033;background:#f6f8fb;max-width:900px;margin:0 auto;padding:24px}'
      + 'h1{color:#173e70;font-size:1.7rem}h2{color:#173e70;font-size:1.25rem;margin-top:28px}h3{color:#173e70;font-size:1.05rem;margin:0 0 8px}h4{margin:14px 0 5px}'
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
      + '<h1>Your evaluation</h1>'
      + '<p><strong>' + aeEsc(who) + '</strong> · ' + aeEsc(packet.config.organization) + ' · ' + aeEsc(packet.config.academicYear) + '</p>'
      + '<div class="card notice"><p><strong>This is a released, educator-visible copy.</strong> It excludes private walkthrough drafts, unpublished observation evidence, unsigned ratings, unsubmitted reflections, mutable SPM drafts, internal receipts, and organization-wide records.</p><p>If you respond below, this page creates a response file on your device. Nothing is uploaded from this page and no account is needed.</p></div>'
      + '<p class="card warning">' + nameNotice + ' Review this attachment and use only a district-authorized channel.</p>'
      + annualRatings
      + '<h2>Published walkthrough evidence</h2>' + (walkthroughRows || '<p class="card">No published walkthroughs were included.</p>')
      + '<h2>Formal-observation records</h2>' + (observationRows || '<p class="card">No formal-observation records were included.</p>')
      + '<h2>SPM / SLO records</h2>' + (spmRows || '<p class="card">No submitted SPM / SLO records were included.</p>')
      + comments
      + '<h2>Add your response</h2>'
      + '<div class="card">' + statementControl
      + '<p class="fine">Reflection and acknowledgement controls appear with the individual eligible records above. Each acknowledgement applies only to the record beside it.</p>'
      + '<button type="button" id="ae-send">Download my response</button>'
      + '<p class="done" id="ae-status" role="status"></p></div>'
      + '<p>Issued ' + aeEsc(aeDateTime(packet.issuedAt)) + '.</p>'
      + '<' + 'script type="application/json" id="' + AE_PACKET_SCRIPT_ID + '">' + aePacketEmbed(JSON.stringify(packet)) + '<' + '/script>'
      + '<' + 'script>' + AE_PACKET_FORM_JS + '<' + '/script>'
      + '</body></html>';
    aeDownload('evaluation-packet-' + selectedTeacher.code + '-' + aeToday() + '.html', 'text/html;charset=utf-8', readable);
    commit(() => {}, { teacherId: selectedTeacher.id, event: 'EXPORTED', summary: 'Educator packet issued' + (packetIncludeNames ? '' : ' (structured profile names withheld; free text unchanged)'), entityType: 'evaluation', entityId: selectedTeacher.id }, 'Educator packet created');
  };
  const exportResponsePacket = () => {
    if (!selectedTeacher) return;
    const packet = aeResponsePacket(workspace, selectedTeacher.id, workspace.receivedPacketId || '');
    if (!packet) { notify('Export failed: no record to respond to.', 'error'); return; }
    aeDownload('evaluation-response-' + selectedTeacher.code + '-' + aeToday() + '.json', 'application/json', JSON.stringify(packet, null, 2));
    commit(() => {}, { teacherId: selectedTeacher.id, event: 'EXPORTED', summary: 'Educator response packet created', entityType: 'evaluation', entityId: selectedTeacher.id }, 'Response packet created');
  };
  const [reflection, setReflection] = React.useState({ status: 'idle', text: '' });
  const aiReflectionEnabled = !!(workspace.config && workspace.config.aiReflectionEnabled);
  const askForReflection = () => {
    if (!selectedTeacher) return;
    const ask = typeof window !== 'undefined' ? window.callGemini : null;
    if (typeof ask !== 'function') {
      setReflection({ status: 'error', text: 'No AI backend is configured in this copy, so this stays unavailable.' });
      return;
    }
    const labels = {};
    AE_RATINGS.forEach((entry) => { labels[String(entry.value)] = entry.label; });
    const prompt = aeBuildReflectionPrompt(workspace, selectedTeacher.id, AE_DOMAINS, labels);
    if (!prompt) {
      setReflection({ status: 'error', text: 'There is no published evidence yet for this educator, so there is nothing to check.' });
      return;
    }
    setReflection({ status: 'working', text: '' });
    Promise.resolve()
      .then(() => ask(prompt))
      .then((answer) => {
        const text = typeof answer === 'string' ? answer : (answer && (answer.text || answer.output)) || '';
        setReflection({ status: text ? 'done' : 'error', text: text || 'The model returned nothing.' });
        if (text) {
          // Record that assistance was used. The answer itself is never written into the record.
          commit(() => {}, {
            teacherId: selectedTeacher.id, event: 'CONFIG_UPDATED',
            summary: 'AI reflection requested on the documented evidence; the reply was shown to the evaluator and not stored in the record.',
            entityType: 'evaluation', entityId: selectedTeacher.id,
          }, null);
        }
      })
      .catch((error) => setReflection({ status: 'error', text: 'That request failed: ' + ((error && error.message) || 'unknown error') }));
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
    notify('Rubric downloaded', 'success');
  };
  const applyRubric = (rubric, label) => {
    // Ratings are keyed by domain id, so say exactly whose scores would be stranded before writing.
    const orphans = aeRubricOrphans(workspaceRef.current, rubric ? rubric.domains : AE_DEFAULT_DOMAINS);
    if (orphans.length) {
      const names = orphans.map((entry) => entry.name).join(', ');
      const ok = typeof window !== 'undefined' && window.confirm
        ? window.confirm('This rubric does not include every domain that already carries a rating. '
          + 'Existing ratings for ' + names + ' would no longer be shown or scored, though nothing is '
          + 'deleted and restoring the previous rubric brings them back. Apply it anyway?')
        : true;
      if (!ok) return;
    }
    commit((next) => {
      next.config = Object.assign({}, next.config, { customRubric: rubric || null });
      aeSetActiveFramework(next.config);
    }, {
      event: 'CONFIG_UPDATED',
      summary: rubric
        ? ('Rubric changed to ' + rubric.name + ' (' + rubric.versionTag + ')'
          + (orphans.length ? '; ' + orphans.length + ' educator record(s) hold ratings outside it' : ''))
        : 'Rubric restored to the built-in set',
      entityType: 'workspace', entityId: 'workspace',
    }, label);
  };
  const clearRubric = () => applyRubric(null, 'Built-in rubric restored');
  const importRubric = (file) => {
    if (!file || file.size > 1024 * 1024) { notify('Rubric import failed: choose a JSON file under 1 MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onerror = () => notify('Rubric import failed: the file could not be read.', 'error');
    reader.onload = () => {
      let rubric = null;
      try { rubric = aeNormalizeRubric(JSON.parse(String(reader.result || ''))); }
      catch (error) { notify('Rubric import failed: that file is not valid JSON.', 'error'); return; }
      if (!rubric) {
        notify('Rubric import failed: every domain needs a unique id and a label.', 'error');
        return;
      }
      applyRubric(rubric, 'Rubric loaded: ' + rubric.name);
    };
    reader.readAsText(file);
  };
  const importWorkspace = (file) => {
    if (!file || file.size > 5 * 1024 * 1024) { notify('Import failed: choose an export or packet smaller than 5 MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onerror = () => notify('Import failed: the selected file could not be read.', 'error');
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
              label: 'Educator response packet',
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
              warning: outcome.stale.length ? 'One or more evaluator records changed after this response packet was issued. Review those records after applying.' : '',
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
              label: 'Educator-only evaluation packet',
              replacesWorkspace: true,
              nextWorkspace: own,
              teacherId: teacher ? teacher.id : '',
              facts: [
                ['Educator', teacher ? (teacher.name + ' · ' + teacher.code) : 'Not identified'],
                ['Organization', own.config.organization || 'Not specified'],
                ['Academic year', own.config.academicYear || 'Not specified'],
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
          label: 'Complete evaluation workspace backup',
          replacesWorkspace: true,
          nextWorkspace: normalized,
          teacherId: (normalized.teachers[0] && normalized.teachers[0].id) || '',
          facts: [
            ['Organization', normalized.config.organization || 'Not specified'],
            ['Academic year', normalized.config.academicYear || 'Not specified'],
            ['Educators', String(normalized.teachers.length)],
            ['Walkthroughs', String(normalized.walkthroughs.length)],
            ['Formal observations', String(normalized.observations.length)],
            ['SPM / SLO records', String(normalized.spms.length)],
            ['Exported', aeDateTime(parsed.exportedAt)],
          ],
          warning: (helperBindingRemoved ? 'A device-specific Apps Script helper link and its verification were removed and must be verified again. ' : '') + 'A recovery download of the current workspace is created before replacement.',
        });
      } catch (error) {
        setPendingImport(null);
        notify('Import failed: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  const cancelPendingImport = () => {
    setPendingImport(null);
    notify('Import cancelled. The current workspace was not changed.', 'info');
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
      const staleNote = outcome.stale.length ? ' ' + outcome.stale.length + ' record(s) changed after the packet was issued.' : '';
      const droppedNote = outcome.ignored ? ' ' + outcome.ignored + ' field(s) outside the educator-owned set were ignored.' : '';
      aeAuditEvent(next, {
        teacherId: outcome.teacherId,
        event: 'IMPORTED',
        summary: 'Reviewed educator response imported from packet ' + pendingImport.packetId + ' issued ' + aeDate(pendingImport.issuedAt) + '.' + staleNote + droppedNote,
        entityType: 'evaluation',
        entityId: outcome.teacherId,
      }, (next.teachers.find((item) => item.id === outcome.teacherId) || {}).name || 'Educator');
    } else if (pendingImport.kind === 'workspace') {
      aeAuditEvent(next, { event: 'IMPORTED', summary: 'Reviewed workspace imported from JSON', entityType: 'workspace', entityId: 'workspace' }, next.config.evaluatorName || 'Evaluator', 'Evaluator');
    }
    setImportUndo({ workspace: previous, selectedTeacherId, role, tab });
    workspaceRef.current = next;
    setWorkspace(next);
    setSelectedTeacherId(pendingImport.teacherId || ((next.teachers[0] && next.teachers[0].id) || ''));
    setRole(next.educatorPacketMode ? 'teacher' : 'evaluator');
    setTab(pendingImport.kind === 'response' ? 'audit' : 'overview');
    const appliedLabel = pendingImport.kind === 'response' ? 'Educator response applied after review.' : (pendingImport.kind === 'educator' ? 'Educator-only packet opened after review.' : 'Workspace replaced after review; the prior workspace was downloaded.');
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
    notify('Import undone. The previous workspace has been restored.', 'success');
  };
  const tabs = role === 'teacher' ? [
    ['overview', 'My evaluation'], ['trends', 'My trends'], ['walkthroughs', 'My evidence'], ['formal', 'Formal observation'], ['spm', 'SPM / SLO'], ['audit', 'Timeline'], ['about', 'About'],
  ] : [
    ['overview', 'Overview'], ['trends', 'Trends'], ['staff', 'Staff'], ['walkthroughs', 'Walkthroughs'], ['formal', 'Formal observations'], ['spm', 'SPM / SLO'], ['audit', 'Reports & audit'], ['about', 'Setup'],
  ];
  React.useEffect(() => { if (!tabs.some((item) => item[0] === tab)) setTab('overview'); }, [role]);
  const blockRemoteMutation = (event) => { if (!isRemote || (!remoteState.inFlight && remoteState.status !== 'error')) return; event.preventDefault(); event.stopPropagation(); };
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
      notify('Saved workspace recovered.', 'success');
      return;
    }
    if (result.status === 'empty') {
      setLocalRecovery(null);
      setShowLocalOnboarding(true);
      setLocalSaveState({ status: 'idle', error: '', savedAt: '' });
      notify('No saved workspace was found. Choose a starting point.', 'info');
      return;
    }
    setLocalRecovery(result);
    setLocalSaveState({ status: 'error', error: result.status === 'corrupt' ? 'The saved workspace needs recovery.' : 'Browser storage remains unavailable.', savedAt: '' });
  };
  const downloadDamagedWorkspace = () => {
    if (!localRecovery || !localRecovery.raw) return;
    aeDownload('alloflow-damaged-workspace-' + aeToday() + '.txt', 'text/plain;charset=utf-8', localRecovery.raw);
    notify('Damaged raw workspace downloaded for recovery.', 'success');
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
    notify('A new blank workspace was started after explicit recovery reset.', 'success');
  };
  const continueTemporarySession = () => {
    setLocalRecovery(null);
    setLocalSaveState({ status: 'error', error: 'Temporary session: changes are not confirmed on this device.', savedAt: '' });
    notify('Temporary session started. Export a recovery copy before closing this page.', 'error');
  };
  const retryLocalSave = () => {
    const result = aeStore(workspaceRef.current);
    setLocalSaveState(result.ok
      ? { status: 'saved', error: '', savedAt: result.savedAt }
      : { status: 'error', error: result.error, detail: result.detail || '', savedAt: '' });
    notify(result.ok ? 'Workspace saved on this device.' : result.error, result.ok ? 'success' : 'error');
  };

  if (!isRemote && localRecovery) {
    const corrupt = localRecovery.status === 'corrupt';
    const recoveryBody = <div ref={dialogRef} tabIndex={-1} className="ae-workspace" role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : 'true'} aria-labelledby="ae-recovery-title">
      <header className="ae-top"><div className="ae-brand"><div className="ae-mark" aria-hidden="true">A✓</div><div><h1>Educator Growth &amp; Evaluation</h1><p>Local workspace recovery</p></div></div>{!standalone && <button type="button" className="ae-close" onClick={onClose} aria-label="Close Educator Growth and Evaluation">×</button>}</header>
      <main className="ae-main"><div className="ae-page"><section className="ae-card ae-span-12" role="alert"><h2 id="ae-recovery-title">{corrupt ? 'Your saved workspace needs recovery' : 'This browser is not allowing local saving'}</h2><p>{corrupt ? 'AlloFlow stopped before replacing the unreadable data. Download the raw copy for recovery, retry after checking browser storage, or explicitly start fresh.' : 'No personnel records have been written. Retry after enabling site storage, or continue only as a temporary session and export before closing.'}</p>{localRecovery.error && <p className="ae-sub">Technical detail: {localRecovery.error}</p>}<div className="ae-actions" style={{ marginTop: 16 }}><button type="button" className="ae-btn ae-btn-primary" onClick={retryLocalRecovery}>Try storage again</button>{corrupt && <button type="button" className="ae-btn" onClick={downloadDamagedWorkspace}>Download damaged raw copy</button>}{!corrupt && <button type="button" className="ae-btn" onClick={continueTemporarySession}>Continue without saving</button>}<button type="button" className="ae-btn ae-btn-danger" onClick={startFreshAfterRecovery}>{localRecoveryResetArmed ? 'Confirm: permanently start fresh' : 'Start a new blank workspace'}</button>{localRecoveryResetArmed && <button type="button" className="ae-btn" onClick={() => setLocalRecoveryResetArmed(false)}>Cancel reset</button>}</div>{localRecoveryResetArmed && <div className="ae-note ae-danger" style={{ marginTop: 12 }}><strong>This removes the unreadable saved copy from browser storage.</strong> Download it first if recovery may be needed.</div>}</section></div></main>
      <footer className="ae-footer"><span>Unreadable data is never overwritten automatically.</span><span>Local recovery gate</span></footer>
    </div>;
    return <div className={'ae-shell ' + (standalone ? 'ae-standalone' : 'ae-overlay')} role={standalone ? undefined : 'presentation'}><AeStyles/>{recoveryBody}</div>;
  }

  if (isRemote && (remoteState.status === 'loading' || (remoteState.status === 'error' && !remoteState.currentUser))) {
    const failed = remoteState.status === 'error';
    const gateBody = <div ref={dialogRef} tabIndex={-1} className="ae-workspace" role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : 'true'} aria-labelledby="ae-title" aria-busy={failed ? undefined : 'true'}>
      <header className="ae-top"><div className="ae-brand"><div className="ae-mark" aria-hidden="true">A✓</div><div><h1 id="ae-title">Educator Growth &amp; Evaluation</h1><p>District-authenticated portal</p></div></div>{!standalone && <button type="button" className="ae-close" onClick={onClose} aria-label="Close Educator Growth and Evaluation">×</button>}</header>
      <main className="ae-main"><div className="ae-page"><section className="ae-card" role={failed ? 'alert' : 'status'} aria-live={failed ? 'assertive' : 'polite'}><h2>{failed ? 'The secure workspace could not be opened' : 'Loading your district evaluation workspace'}</h2><p>{failed ? remoteState.error : 'Verifying your managed Google account and assigned records…'}</p>{failed && <p className="ae-sub">If you should have access, ask the district administrator who set up this portal to add your account. Access is granted by the district, not by this page.</p>}{failed && <div className="ae-actions" style={{ marginTop: 14 }}><button type="button" className="ae-btn ae-btn-primary" onClick={loadRemoteWorkspace}>Try again</button></div>}</section></div></main>
      <footer className="ae-footer"><span>Records remain hidden until identity and assignments are verified.</span><span>District Apps Script repository</span></footer>
    </div>;
    return <div className={'ae-shell ' + (standalone ? 'ae-standalone' : 'ae-overlay')} role={standalone ? undefined : 'presentation'} onClick={standalone ? undefined : (event) => { if (event.target === event.currentTarget) onClose(); }}><AeStyles/>{gateBody}</div>;
  }
  const body = <div ref={dialogRef} tabIndex={-1} className="ae-workspace" role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : 'true'} aria-labelledby="ae-title">
    <header className="ae-top">
      <div className="ae-brand"><div className="ae-mark" aria-hidden="true">A✓</div><div><h1 id="ae-title">Educator Growth &amp; Evaluation</h1><p>{workspace.config.organization} · {workspace.config.academicYear}</p></div></div>
      <div className="ae-top-actions">{!isRemote && !workspace.educatorPacketMode && <div className="ae-role" aria-label="View this workspace as evaluator or preview the educator experience"><button type="button" aria-pressed={role === 'evaluator'} onClick={() => setRole('evaluator')}>Evaluator</button><button type="button" aria-pressed={role === 'teacher'} onClick={() => setRole('teacher')}>Educator preview</button></div>}{!isRemote && workspace.config.sampleMode && <button type="button" className="ae-btn" onClick={() => setTourStep(0)}>Replay tour</button>}<a className="ae-btn" data-help-key="ae_manual_link" /* Extensionless, matching the Setup-tab link and the district Portal. That
   link is real but lives inside a tab; this one is reachable from every tab,
   which is the point of putting it in the header (2026-08-17). */
href="https://alloflow-cdn.pages.dev/educator-evaluation-manual" target="_blank" rel="noopener noreferrer" aria-label="User manual (opens in a new tab)" title="How to run a full evaluation cycle, set up the district portal, and read the released summary">Manual</a>{!standalone && <button type="button" className="ae-close" onClick={onClose} aria-label="Close Educator Growth and Evaluation">×</button>}</div>
    </header>
    {isRemote ? <div className={'ae-local-banner ae-remote-banner ' + (remoteState.status === 'error' ? 'ae-sync-error' : '')} role={remoteState.status === 'error' ? 'alert' : 'status'} aria-live="polite">
      <strong>District Google account</strong>{' '}
      <span>{remoteState.currentUser && remoteState.currentUser.email} · {role === 'teacher' ? 'Educator access' : 'Evaluator access'} · {remoteState.status === 'saving' ? 'Saving to district repository…' : (remoteState.status === 'error' ? 'Last change is not confirmed: ' + remoteState.error : 'Saved to district repository')}</span>
      {remoteState.status === 'saved' && <button type="button" className="ae-btn" onClick={loadRemoteWorkspace}>Refresh</button>}
      {remoteState.status === 'error' && <button type="button" className="ae-btn" onClick={loadRemoteWorkspace}>Reload district copy</button>}
      {typeof repository.sendNotification === 'function' && <button type="button" className="ae-btn" disabled={!selectedTeacher || notificationState.status === 'sending' || remoteState.status === 'saving'} onClick={sendPortalNotice}>{notificationState.status === 'sending' ? 'Sending notice…' : (role === 'teacher' ? 'Email evaluator a portal notice' : 'Email educator a portal notice')}</button>}
      {role !== 'teacher' && typeof repository.reviewReleasedEvaluation === 'function' && typeof repository.shareReleasedEvaluation === 'function' && <button type="button" className="ae-btn" title={selectedTeacher && !selectedTeacher.finalizedAt ? 'Available after the educator cycle is finalized.' : 'Opens a required recipient and disclosure review before any Drive access changes.'} disabled={!selectedTeacher || !selectedTeacher.finalizedAt || ['reviewing', 'sending', 'recovery'].includes(releaseShareState.status) || remoteState.status === 'saving'} onClick={beginReleasedEvaluationReview}>{releaseShareState.status === 'reviewing' ? 'Preparing disclosure review…' : (selectedTeacher && selectedTeacher.releasedDoc ? 'Review released-summary access' : 'Review & share released summary')}</button>}
      {releaseShareState.status === 'recovery' && <span className="ae-chip ae-chip-amber" title="Drive access changed, but the district repository has not confirmed its pointer and audit commit. Do not retry the release.">Release recovery required</span>}
      {selectedTeacher && selectedTeacher.releasedDoc && /^https:\/\/docs\.google\.com\//.test(selectedTeacher.releasedDoc.url || '') && <a className="ae-btn" href={selectedTeacher.releasedDoc.url} target="_blank" rel="noopener noreferrer" title={role === 'teacher' ? undefined : 'If Drive denies access, use Review released-summary access to restore authorized viewer access without creating a duplicate.'} onClick={() => { if (role === 'teacher' && typeof repository.recordReleasedSummaryOpened === 'function' && !selectedTeacher.releasedDoc.openedAt) { repository.recordReleasedSummaryOpened({ teacherId: selectedTeacher.id }).then(() => loadRemoteWorkspace()).catch((error) => notify('The summary opened, but the portal could not record the link-open receipt: ' + String((error && error.message) || error), 'error')); } }}>{role === 'teacher' ? 'Open your released evaluation summary' : 'Open current summary (Drive)'}</a>}
      {role !== 'teacher' && selectedTeacher && selectedTeacher.releasedDoc && selectedTeacher.releasedDoc.openedAt && <span className="ae-chip ae-chip-good" title="Records that the educator clicked the portal link. It cannot claim the document was read.">Summary link opened {aeDateTime(selectedTeacher.releasedDoc.openedAt)}</span>}
    </div> : <div className={'ae-local-banner ' + (workspace.config.sampleMode ? 'ae-sample' : '') + (localSaveState.status === 'error' ? ' ae-sync-error' : '')} role={localSaveState.status === 'error' ? 'alert' : 'status'} aria-live="polite">
      <strong>{workspace.educatorPacketMode ? 'Educator response packet' : (workspace.config.sampleMode ? 'Simulated data' : 'Private on-device workspace')}</strong>{' '}
      <span>{workspace.educatorPacketMode ? 'Educator-only mode: review the released records and add only your own response.' : 'Records are stored on this device. Information leaves it only when you deliberately export or share, or enable optional AI reflection.'}</span>
      <span className={'ae-save-state ' + (localSaveState.status === 'error' ? 'ae-save-error' : '')}>{localSaveState.status === 'saving' ? 'Saving…' : (localSaveState.status === 'saved' ? 'Saved on this device ' + aeDateTime(localSaveState.savedAt) : (localSaveState.status === 'error' ? 'Changes are not saved' : 'Not saved yet'))}</span>
      {localSaveState.status === 'error' && <><button type="button" className="ae-btn" onClick={retryLocalSave}>Retry save</button><button type="button" className="ae-btn" onClick={() => { const recovery = Object.assign({}, workspaceRef.current, { kind: AE_EXPORT_KIND, exportedAt: aeNow(), recoveryReason: 'Emergency backup after local save failure' }); aeDownload('alloflow-emergency-backup-' + aeToday() + '.json', 'application/json', JSON.stringify(recovery, null, 2)); notify('Emergency workspace backup downloaded.', 'success'); }}>Download emergency backup</button></>}
    </div>}
    {localTeacherPreview && <div className="ae-local-banner ae-preview-banner" role="status"><strong>Read-only educator preview</strong><span>Use this perspective to inspect what an educator can see. Changes are blocked because local role switching is not authentication.</span></div>}
    {operationNotice.text && <div className={'ae-operation-notice ' + (operationNotice.type === 'error' ? 'ae-operation-error' : (operationNotice.type === 'success' ? 'ae-operation-success' : ''))} role={operationNotice.type === 'error' ? 'alert' : 'status'} aria-live="polite"><span>{operationNotice.text}</span><button type="button" className="ae-btn ae-btn-quiet" onClick={() => setOperationNotice({ text: '', type: 'info', id: operationNotice.id })}>Dismiss</button></div>}
    {Number.isInteger(tourStep) && <AeGuidedTour
      step={tourStep}
      onMove={setTourStep}
      onFinish={() => { setTourStep(null); notify('Guided sample tour closed. You can replay it from the header.', 'success'); }}
    />}
    <nav className="ae-tabs" role="tablist" aria-label="Evaluation workspace sections">{tabs.map(([id, label], index) => <button type="button" role="tab" key={id} id={'ae-tab-' + id} aria-selected={tab === id} aria-controls="ae-panel" tabIndex={tab === id ? 0 : -1} className="ae-tab" onClick={() => setTab(id)} onKeyDown={(event) => tabKey(event, index)}>{label}</button>)}</nav>
    <main className="ae-main" id="ae-panel" role="tabpanel" tabIndex={-1} aria-labelledby={'ae-tab-' + tab} aria-busy={remoteState.inFlight ? 'true' : undefined} aria-disabled={isRemote && remoteState.status === 'error' ? 'true' : undefined} onClickCapture={blockRemoteMutation} onChangeCapture={blockRemoteMutation} onInputCapture={blockRemoteMutation} onSubmitCapture={blockRemoteMutation}>
      {tab === 'overview' && <AeOverview workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} aiReflectionEnabled={aiReflectionEnabled} askForReflection={askForReflection} reflection={reflection} updateTeacher={updateTeacher} setTab={setTab} readOnlyPreview={localTeacherPreview}/>}
      {tab === 'trends' && <AeTrends workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} isRemote={isRemote}/>}
      {tab === 'staff' && <AeStaff workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} updateTeacher={updateTeacher} addTeacher={addTeacher} isRemote={isRemote} canAddStaff={!isRemote || !!(remoteState.currentUser && remoteState.currentUser.role === 'admin')}/>}
      {tab === 'walkthroughs' && <AeWalkthroughs workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} createWalkthrough={createWalkthrough} publishWalkthrough={publishWalkthrough} addComment={addComment} acknowledgeWalkthrough={acknowledgeWalkthrough} isRemote={isRemote} readOnlyPreview={localTeacherPreview}/>}
      {tab === 'formal' && <AeFormalObservations workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} createObservation={createObservation} updateObservation={updateObservation} updateTeacher={updateTeacher} addComment={addComment} readOnlyPreview={localTeacherPreview}/>}
      {tab === 'spm' && <AeSpm workspace={workspace} selectedTeacher={selectedTeacher} setSelectedTeacherId={setSelectedTeacherId} role={role} createSpm={createSpm} updateSpm={updateSpm} updateTeacher={updateTeacher} addComment={addComment} readOnlyPreview={localTeacherPreview}/>}
      {tab === 'audit' && <AeAuditExport workspace={workspace} selectedTeacher={selectedTeacher} exportWorkspace={exportWorkspace} exportCsv={exportCsv} exportSummary={exportSummary} exportEducatorPacket={exportEducatorPacket} exportResponsePacket={exportResponsePacket} packetIncludeNames={packetIncludeNames} setPacketIncludeNames={setPacketIncludeNames} exportGrowthSnapshot={exportGrowthSnapshot} importWorkspace={importWorkspace} pendingImport={pendingImport} confirmPendingImport={confirmPendingImport} cancelPendingImport={cancelPendingImport} importUndo={importUndo} undoImport={undoImport} resetWorkspace={resetWorkspace} role={role} isRemote={isRemote}/>}
      {tab === 'about' && <AeAbout workspace={workspace} updateConfig={updateConfig} role={role} isRemote={isRemote} exportRubric={exportRubric} importRubric={importRubric} clearRubric={clearRubric} currentUser={remoteState.currentUser} repository={repository} standalone={standalone} portalUrl={(remoteState.deployment && remoteState.deployment.portalUrl) || ''} onApplySimulation={applySimulationWorkspace} onReload={loadRemoteWorkspace}/>}
    </main>
    <footer className="ae-footer"><span>No AI scoring · evidence and judgments stay separate · published records are append-only in the workflow model</span><span>{AE_ACTIVE_FW.id === 'pa_act13' ? <><a href="https://www.pa.gov/agencies/education/programs-and-services/educators/educator-effectiveness" target="_blank" rel="noreferrer">PDE Educator Effectiveness</a> · <a href="https://www.pdesas.org/Page/Viewer/ViewPage/75" target="_blank" rel="noreferrer">Act 13 Toolkit</a></> : <><a href="https://www.maine.gov/doe/educators/educatoreval/educator" target="_blank" rel="noreferrer">Maine DOE Educator Effectiveness</a> · <a href="https://www.law.cornell.edu/regulations/maine/department-05/division-071/chapter-180" target="_blank" rel="noreferrer">PEPG Rule Ch. 180</a></>}</span></footer><div className="ae-live" aria-live="polite" aria-atomic="true"><span key={liveMessage.id}>{liveMessage.text}</span></div>
  </div>;
  const releaseReviewOpen = isRemote && !!releaseShareState.review;
  const modalOpen = (!isRemote && showLocalOnboarding) || releaseReviewOpen;
  return <div className={'ae-shell ' + (standalone ? 'ae-standalone' : 'ae-overlay')} role={standalone ? undefined : 'presentation'} onClick={standalone ? undefined : (event) => { if (event.target === event.currentTarget && !modalOpen) onClose(); }}><AeStyles/><div aria-hidden={modalOpen ? 'true' : undefined} inert={modalOpen ? '' : undefined}>{body}</div>{!isRemote && showLocalOnboarding && <AeLocalOnboarding onChoose={chooseLocalStart}/>} {releaseReviewOpen && <AeReleaseReview state={releaseShareState} onCancel={cancelReleasedEvaluationReview} onConfirm={shareReleasedEvaluation}/>}</div>;
}
