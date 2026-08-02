/**
 * AlloFlow - Live Lesson Run
 *
 * A teacher-facing sequence and audience controller for the existing Live
 * Session Center. This module intentionally owns no lesson/deck state and
 * performs no session writes. The shell supplies:
 *   - the active unit's existing History order,
 *   - the single student-safe resource filter,
 *   - handleRestoreView for class presentation, and
 *   - the existing group and individual resource-push handlers.
 *
 * Keeping those boundaries makes this a presentation layer over the current
 * implementation instead of a competing deck, assignment, or transport model.
 */

function buildLiveLessonSteps(history, getStudentSafeResources) {
  if (typeof getStudentSafeResources !== 'function') return [];
  const safe = getStudentSafeResources(Array.isArray(history) ? history : []);
  if (!Array.isArray(safe)) return [];
  return safe.filter(item => item && item.id && item.type);
}

function resolveLiveLessonIndex(steps, currentItemId, currentResourceId) {
  if (!Array.isArray(steps) || steps.length === 0) return -1;
  const localIndex = currentItemId
    ? steps.findIndex(item => item.id === currentItemId)
    : -1;
  if (localIndex >= 0) return localIndex;
  return currentResourceId
    ? steps.findIndex(item => item.id === currentResourceId)
    : -1;
}

function adjacentLiveLessonIndex(stepCount, currentIndex, direction) {
  if (!Number.isInteger(stepCount) || stepCount <= 0) return -1;
  if (direction === 'previous') {
    return currentIndex > 0 ? currentIndex - 1 : -1;
  }
  if (currentIndex < 0) return 0;
  return currentIndex + 1 < stepCount ? currentIndex + 1 : -1;
}

function buildLiveLessonAudiences(groups, roster, labels = {}) {
  const safeRoster = roster && typeof roster === 'object' ? roster : {};
  const audiences = [{
    key: 'class',
    kind: 'class',
    id: null,
    label: labels.classLabel || 'Whole class',
    memberCount: Object.keys(safeRoster).length,
  }];

  const groupRows = Object.entries(groups && typeof groups === 'object' ? groups : {})
    .filter(([, group]) => group && typeof group === 'object')
    .map(([id, group], index) => ({
      key: `group:${id}`,
      kind: 'group',
      id,
      label: String(group.name || `${labels.groupLabel || 'Group'} ${index + 1}`),
      memberCount: Object.values(safeRoster).filter(entry => entry && entry.groupId === id).length,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const studentRows = Object.entries(safeRoster)
    .filter(([, entry]) => entry && typeof entry === 'object')
    .map(([id, entry], index) => ({
      key: `student:${id}`,
      kind: 'student',
      id,
      label: String(entry.name || `${labels.studentLabel || 'Student'} ${index + 1}`),
      memberCount: 1,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return audiences.concat(groupRows, studentRows);
}

function resolveLiveLessonAudience(audiences, audienceKey) {
  if (!Array.isArray(audiences) || audiences.length === 0) return null;
  return audiences.find(audience => audience.key === audienceKey)
    || audiences.find(audience => audience.kind === 'class')
    || audiences[0];
}

function summarizeLiveLessonDelivery(resourceId, audience, roster) {
  const entries = Object.entries(roster && typeof roster === 'object' ? roster : {})
    .filter(([, entry]) => entry && typeof entry === 'object')
    .filter(([uid, entry]) => {
      if (!audience || audience.kind === 'class') return true;
      if (audience.kind === 'group') return entry.groupId === audience.id;
      return audience.kind === 'student' && uid === audience.id;
    });
  return {
    total: entries.length,
    viewing: resourceId
      ? entries.filter(([, entry]) => entry.viewingResourceId === resourceId).length
      : 0,
  };
}

const LIVE_PRESENTER_CUE_LIMITS = Object.freeze({
  sayAsk: 1200,
  lookFor: 600,
  nextMove: 600,
});
const LIVE_PRESENTER_CUE_FIELDS = Object.freeze(Object.keys(LIVE_PRESENTER_CUE_LIMITS));
const LIVE_PRESENTER_CUE_MAX_RESOURCES = 250;
const LIVE_PRESENTER_CUE_RESERVED_IDS = new Set(['__proto__', 'prototype', 'constructor']);
const LIVE_PREPARED_CHECKPOINT_KINDS = new Set([
  'quick_check',
  'word_cloud',
  'open_response',
  'feedback_response',
  'sketch_response',
  'live_quiz',
]);
const LIVE_POLL_CHECKPOINT_KINDS = new Set([
  'quick_check',
  'word_cloud',
  'open_response',
  'feedback_response',
]);
const LIVE_PREPARED_CHECKPOINT_LIMITS = Object.freeze({
  prompt: 600,
  criteria: 1000,
  sketchPrompt: 500,
  sketchCriteria: 400,
});

function normalizeLivePreparedCheckpoint(input) {
  const source = input && typeof input === 'object' ? input : {};
  const kind = LIVE_PREPARED_CHECKPOINT_KINDS.has(source.kind) ? source.kind : '';
  const acceptsPrompt = !!kind && kind !== 'live_quiz';
  const acceptsCriteria = kind === 'feedback_response' || kind === 'sketch_response';
  return {
    kind,
    prompt: acceptsPrompt
      ? String(source.prompt || '')
        .replace(/\u0000/g, '')
        .slice(0, kind === 'sketch_response'
          ? LIVE_PREPARED_CHECKPOINT_LIMITS.sketchPrompt
          : LIVE_PREPARED_CHECKPOINT_LIMITS.prompt)
      : '',
    criteria: acceptsCriteria
      ? String(source.criteria || '')
        .replace(/\u0000/g, '')
        .slice(0, kind === 'sketch_response'
          ? LIVE_PREPARED_CHECKPOINT_LIMITS.sketchCriteria
          : LIVE_PREPARED_CHECKPOINT_LIMITS.criteria)
      : '',
  };
}

function buildLivePollPresetFromCheckpoint(input, resource, audience) {
  const checkpoint = normalizeLivePreparedCheckpoint(input);
  if (!LIVE_POLL_CHECKPOINT_KINDS.has(checkpoint.kind)) return null;
  const audienceKind = audience && audience.kind;
  const audienceMode = audienceKind === 'group'
    ? 'group'
    : audienceKind === 'student'
      ? 'individual'
      : 'class';
  const audienceId = audienceMode === 'class'
    ? ''
    : String(audience && audience.id || '').trim().slice(0, 128);
  const promptDefaults = {
    quick_check: 'How is this landing for you right now?',
    word_cloud: 'What word or short phrase best captures your thinking?',
    open_response: 'What is your strongest response to this lesson step?',
    feedback_response: 'Explain your thinking using evidence from the lesson.',
  };
  const prompt = checkpoint.prompt.trim() || promptDefaults[checkpoint.kind];
  const preset = {
    source: 'live-lesson-prepared-checkpoint',
    sourceResourceId: String(resource && resource.id || '').trim().slice(0, 128),
    prompt,
    afterSubmitMode: checkpoint.kind === 'quick_check' ? 'dismiss' : 'wait',
    audienceMode,
    audienceId,
  };
  if (checkpoint.kind === 'quick_check') {
    return {
      ...preset,
      type: 'rating',
      ratingMin: 1,
      ratingMax: 3,
      ratingLabels: '1 = Confused\n2 = Okay\n3 = Ready',
    };
  }
  if (checkpoint.kind === 'word_cloud') return { ...preset, type: 'wordcloud' };
  if (checkpoint.kind === 'open_response') {
    return {
      ...preset,
      type: 'freetext',
      feedbackEnabled: false,
      peerVoteCriterion: 'Which response best supports its thinking with clear evidence?',
    };
  }
  return {
    ...preset,
    type: 'freetext',
    feedbackEnabled: true,
    feedbackCriteria: checkpoint.criteria.trim()
      || 'Identify one accurate idea, explain it clearly, and support it with relevant evidence.',
    feedbackAudienceMode: audienceMode,
    feedbackAudienceId: audienceId,
  };
}

function buildLivePreparedInteractionDescriptor(input, resource, audience) {
  const checkpoint = normalizeLivePreparedCheckpoint(input);
  if (!checkpoint.kind) return null;
  const sourceResourceId = String(resource && resource.id || '').trim().slice(0, 128);

  if (LIVE_POLL_CHECKPOINT_KINDS.has(checkpoint.kind)) {
    const preset = buildLivePollPresetFromCheckpoint(checkpoint, resource, audience);
    return preset ? {
      owner: 'live-polling',
      kind: checkpoint.kind,
      sourceResourceId,
      preset,
    } : null;
  }

  if (checkpoint.kind === 'sketch_response') {
    const audienceKind = audience && (audience.kind === 'group' || audience.kind === 'student')
      ? audience.kind
      : 'class';
    return {
      owner: 'concept-pictionary',
      kind: 'sketch_response',
      sourceResourceId,
      mode: 'sketch',
      prompt: checkpoint.prompt.trim()
        || 'Draw a model that shows your understanding of this lesson step.',
      criterion: checkpoint.criteria.trim(),
      audience: {
        kind: audienceKind,
        id: audienceKind === 'class'
          ? ''
          : String(audience && audience.id || '').trim().slice(0, 128),
      },
    };
  }

  if (checkpoint.kind === 'live_quiz' && resource && resource.type === 'quiz') {
    return {
      owner: 'quiz',
      kind: 'live_quiz',
      sourceResourceId,
    };
  }

  return null;
}

function normalizeLivePresenterCue(input) {
  const source = input && typeof input === 'object' ? input : {};
  const cue = {};
  LIVE_PRESENTER_CUE_FIELDS.forEach(field => {
    cue[field] = String(source[field] || '').replace(/\u0000/g, '').slice(0, LIVE_PRESENTER_CUE_LIMITS[field]);
  });
  cue.checkpoint = normalizeLivePreparedCheckpoint(source.checkpoint);
  return cue;
}

function hasLivePresenterCueContent(cue) {
  const normalized = normalizeLivePresenterCue(cue);
  return LIVE_PRESENTER_CUE_FIELDS.some(field => normalized[field].trim())
    || !!normalized.checkpoint.kind;
}

function sanitizeLivePresenterCuesByResourceId(input, allowedResourceIds = null) {
  const source = input && typeof input === 'object' ? input : {};
  const allowed = Array.isArray(allowedResourceIds)
    ? new Set(allowedResourceIds.map(id => String(id || '').trim()).filter(Boolean))
    : null;
  const result = {};
  Object.entries(source).slice(-LIVE_PRESENTER_CUE_MAX_RESOURCES).forEach(([rawId, rawCue]) => {
    const resourceId = String(rawId || '').trim().slice(0, 128);
    if (!resourceId || LIVE_PRESENTER_CUE_RESERVED_IDS.has(resourceId)) return;
    if (allowed && !allowed.has(resourceId)) return;
    const cue = normalizeLivePresenterCue(rawCue);
    if (!hasLivePresenterCueContent(cue)) return;
    result[resourceId] = cue;
  });
  return result;
}

function upsertLivePresenterCue(existing, resourceId, patch) {
  const safeResourceId = String(resourceId || '').trim().slice(0, 128);
  if (!safeResourceId || LIVE_PRESENTER_CUE_RESERVED_IDS.has(safeResourceId)) {
    return sanitizeLivePresenterCuesByResourceId(existing);
  }
  const current = sanitizeLivePresenterCuesByResourceId(existing);
  const cue = normalizeLivePresenterCue({
    ...(current[safeResourceId] || {}),
    ...(patch && typeof patch === 'object' ? patch : {}),
  });
  const next = { ...current };
  delete next[safeResourceId];
  if (hasLivePresenterCueContent(cue)) {
    next[safeResourceId] = cue;
  }
  return sanitizeLivePresenterCuesByResourceId(next);
}

function liveLessonReadinessStatusLabel(status) {
  return ({
    ready: 'Ready',
    review: 'Review',
    needs_attention: 'Needs attention',
    optional: 'Optional',
  })[status] || 'Review';
}

/**
 * Builds a teacher-only, content-free readiness summary from the lesson path
 * and the existing local presenter-cue map. It intentionally accepts neither
 * roster/activity data nor callbacks, and it never mutates either input.
 */
function buildLiveLessonReadiness(steps, presenterCuesByResourceId, historyItemCount = 0) {
  const safeSteps = (Array.isArray(steps) ? steps : [])
    .filter(item => item && item.id && item.type)
    .slice(0, LIVE_PRESENTER_CUE_MAX_RESOURCES);
  const cueMap = presenterCuesByResourceId && typeof presenterCuesByResourceId === 'object'
    ? presenterCuesByResourceId
    : {};
  const parsedHistoryCount = Number(historyItemCount);
  const sourceCount = Number.isFinite(parsedHistoryCount)
    ? Math.max(safeSteps.length, Math.min(10000, Math.floor(parsedHistoryCount)))
    : safeSteps.length;
  const issues = [];
  let preparedCount = 0;
  let presenterCueCount = 0;

  if (safeSteps.length === 0) {
    issues.push({
      code: 'no_student_safe_steps',
      status: 'needs_attention',
      stepIndex: -1,
      label: 'Add at least one student-facing resource before class.',
    });
  }

  safeSteps.forEach((step, stepIndex) => {
    const rawCue = Object.prototype.hasOwnProperty.call(cueMap, step.id)
      ? cueMap[step.id]
      : null;
    const cue = normalizeLivePresenterCue(rawCue);
    if (LIVE_PRESENTER_CUE_FIELDS.some(field => cue[field].trim())) {
      presenterCueCount += 1;
    }
    const checkpoint = cue.checkpoint;
    if (!checkpoint.kind) return;
    preparedCount += 1;

    if (checkpoint.kind === 'live_quiz') {
      if (step.type !== 'quiz') {
        issues.push({
          code: 'quiz_checkpoint_resource_mismatch',
          status: 'needs_attention',
          stepIndex,
          label: `Step ${stepIndex + 1}: attach Live quiz only to a quiz resource.`,
        });
      } else if (!step.data || !Array.isArray(step.data.questions) || step.data.questions.length === 0) {
        issues.push({
          code: 'empty_live_quiz',
          status: 'needs_attention',
          stepIndex,
          label: `Step ${stepIndex + 1}: add at least one question to the prepared quiz.`,
        });
      }
      return;
    }

    if (!checkpoint.prompt.trim()) {
      issues.push({
        code: 'suggested_prompt',
        status: 'review',
        stepIndex,
        label: `Step ${stepIndex + 1}: review the suggested interaction prompt.`,
      });
    }
    if ((checkpoint.kind === 'feedback_response' || checkpoint.kind === 'sketch_response')
      && !checkpoint.criteria.trim()) {
      issues.push({
        code: 'missing_success_criterion',
        status: 'review',
        stepIndex,
        label: `Step ${stepIndex + 1}: add a success criterion so quality is clear.`,
      });
    }
  });

  const needsAttentionCount = issues.filter(issue => issue.status === 'needs_attention').length;
  const reviewCount = issues.filter(issue => issue.status === 'review').length;
  const status = needsAttentionCount > 0
    ? 'needs_attention'
    : reviewCount > 0
      ? 'review'
      : 'ready';
  const filteredOutCount = Math.max(0, sourceCount - safeSteps.length);
  const interactionStatus = needsAttentionCount > 0
    ? 'needs_attention'
    : reviewCount > 0
      ? 'review'
      : preparedCount > 0
        ? 'ready'
        : 'optional';

  return {
    status,
    label: liveLessonReadinessStatusLabel(status),
    stepCount: safeSteps.length,
    sourceCount,
    filteredOutCount,
    preparedCount,
    presenterCueCount,
    needsAttentionCount,
    reviewCount,
    checks: [
      {
        id: 'student_safe_path',
        status: safeSteps.length > 0 ? 'ready' : 'needs_attention',
        label: 'Student-safe path',
        detail: safeSteps.length > 0
          ? `${safeSteps.length} student-facing step${safeSteps.length === 1 ? '' : 's'} included${filteredOutCount > 0 ? `; ${filteredOutCount} kept out by the shared safety filter` : ''}.`
          : 'No student-facing steps passed the shared safety filter.',
      },
      {
        id: 'prepared_interactions',
        status: interactionStatus,
        label: 'Prepared interactions',
        detail: `${preparedCount} interaction${preparedCount === 1 ? '' : 's'} prepared${issues.length > 0 ? `; ${issues.length} item${issues.length === 1 ? '' : 's'} to check` : ''}.`,
      },
      {
        id: 'presenter_cues',
        status: presenterCueCount > 0 ? 'ready' : 'optional',
        label: 'Private presenter cues',
        detail: presenterCueCount > 0
          ? `${presenterCueCount} of ${safeSteps.length} step${safeSteps.length === 1 ? '' : 's'} has teacher-only guidance.`
          : 'Optional: add teacher-only wording, look-fors, or next moves.',
      },
    ],
    issues: issues.slice(0, 20),
  };
}

const LIVE_ACTIVITY_SNAPSHOT_SCHEMA_VERSION = 1;
const LIVE_ACTIVITY_FAMILIES = new Set(['polling', 'pictionary', 'quiz']);
const LIVE_ACTIVITY_KINDS = new Set([
  'rating',
  'multiple_choice',
  'free_text',
  'word_cloud',
  'feedback_response',
  'pictionary',
  'sketch_response',
  'session_qa',
  'quiz',
]);
const LIVE_ACTIVITY_PHASES = new Set(['collecting', 'paused', 'review', 'revealed', 'closed']);
const LIVE_ACTIVITY_PARTICIPANT_STATUSES = new Set(['waiting', 'working', 'submitted', 'revised']);
const LIVE_ACTIVITY_EXTRA_COUNT_KEYS = ['connected', 'approved', 'hidden', 'revealed', 'feedbackSent', 'guesses', 'showcased', 'votesCast'];

function boundedLiveActivityText(value, maxLength = 96) {
  return String(value || '').trim().slice(0, maxLength);
}

function boundedLiveActivityCount(value, max = 10000) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(max, Math.floor(parsed)));
}

/**
 * Finds individual resource overrides that the student has already opened.
 *
 * This intentionally uses only delivery metadata already present on the
 * roster. Releasing these overrides lets later group/class pacing take effect
 * again without copying response content into the facilitation layer.
 */
function buildAcknowledgedLiveResourceOverrides(roster, limit = 25) {
  const safeLimit = Math.max(0, Math.min(25, Math.floor(Number(limit) || 0)));
  if (safeLimit === 0) return [];
  const seen = new Set();
  const acknowledged = [];

  Object.entries(roster && typeof roster === 'object' ? roster : {})
    .slice(0, 250)
    .forEach(([rawUid, rawEntry]) => {
      if (acknowledged.length >= safeLimit) return;
      const uid = boundedLiveActivityText(rawUid, 128);
      const entry = rawEntry && typeof rawEntry === 'object' ? rawEntry : {};
      const resourceId = boundedLiveActivityText(entry.resourceId, 128);
      const viewingResourceId = boundedLiveActivityText(entry.viewingResourceId, 128);
      const resourceAt = boundedLiveActivityCount(entry.resourceAt, Number.MAX_SAFE_INTEGER);
      const viewingAt = boundedLiveActivityCount(entry.viewingAt, Number.MAX_SAFE_INTEGER);
      const hasAssignmentNonce = Object.prototype.hasOwnProperty.call(entry, 'viewingResourceAt');
      const viewingResourceAt = boundedLiveActivityCount(entry.viewingResourceAt, Number.MAX_SAFE_INTEGER);
      const statusMatchesAssignment = hasAssignmentNonce && viewingResourceAt === resourceAt;
      const deliveryStatus = statusMatchesAssignment ? entry.viewingResourceStatus : null;
      const acknowledgedThisAssignment = statusMatchesAssignment
        ? deliveryStatus !== 'loading' && deliveryStatus !== 'failed' && resourceId === viewingResourceId
        : resourceId === viewingResourceId && viewingAt >= resourceAt;
      if (!uid
        || seen.has(uid)
        || !resourceId
        || resourceAt <= 0
        || !acknowledgedThisAssignment) return;
      seen.add(uid);
      acknowledged.push(uid);
    });

  return acknowledged;
}

function normalizeLiveActivityParticipantStatus(value) {
  if (LIVE_ACTIVITY_PARTICIPANT_STATUSES.has(value)) return value;
  if (value === 'drafting' || value === 'editing' || value === 'drawing') return 'working';
  return 'waiting';
}

/**
 * Privacy boundary for activity-to-presentation metadata.
 *
 * The returned object is intentionally rebuilt from a small allowlist. Prompts,
 * answers, guesses, drawing strokes, feedback, codenames, and arbitrary
 * emitter fields cannot cross into the Live Lesson coordination layer.
 */
function sanitizeLiveActivitySnapshot(input) {
  if (!input || typeof input !== 'object') return null;
  const activityId = boundedLiveActivityText(input.activityId, 120);
  if (!activityId) return null;
  const family = LIVE_ACTIVITY_FAMILIES.has(input.family) ? input.family : null;
  const kind = LIVE_ACTIVITY_KINDS.has(input.kind) ? input.kind : null;
  const phase = LIVE_ACTIVITY_PHASES.has(input.phase) ? input.phase : null;
  if (!family || !kind || !phase) return null;

  const audienceUids = Array.from(new Set(
    (Array.isArray(input.audienceUids) ? input.audienceUids : [])
      .map(uid => boundedLiveActivityText(uid, 128))
      .filter(Boolean)
  )).slice(0, 250);
  const audienceSet = new Set(audienceUids);
  const participantStatus = {};
  Object.entries(input.participantStatus && typeof input.participantStatus === 'object'
    ? input.participantStatus
    : {})
    .slice(0, 250)
    .forEach(([rawUid, rawStatus]) => {
      const uid = boundedLiveActivityText(rawUid, 128);
      if (!uid || !audienceSet.has(uid)) return;
      participantStatus[uid] = normalizeLiveActivityParticipantStatus(rawStatus);
    });
  audienceUids.forEach(uid => {
    if (!participantStatus[uid]) participantStatus[uid] = 'waiting';
  });

  const statuses = Object.values(participantStatus);
  const counts = {
    invited: audienceUids.length,
    working: statuses.filter(status => status === 'working').length,
    submitted: statuses.filter(status => status === 'submitted' || status === 'revised').length,
    revised: statuses.filter(status => status === 'revised').length,
  };
  const inputCounts = input.counts && typeof input.counts === 'object' ? input.counts : {};
  LIVE_ACTIVITY_EXTRA_COUNT_KEYS.forEach(key => {
    counts[key] = boundedLiveActivityCount(inputCounts[key]);
  });

  const startedAt = boundedLiveActivityCount(input.startedAt, Number.MAX_SAFE_INTEGER);
  const updatedAt = boundedLiveActivityCount(input.updatedAt || Date.now(), Number.MAX_SAFE_INTEGER);
  const endedAt = phase === 'closed' || phase === 'revealed'
    ? boundedLiveActivityCount(input.endedAt || updatedAt, Number.MAX_SAFE_INTEGER)
    : 0;
  const durationMs = boundedLiveActivityCount(input.durationMs, 24 * 60 * 60 * 1000);

  return {
    schemaVersion: LIVE_ACTIVITY_SNAPSHOT_SCHEMA_VERSION,
    activityId,
    family,
    kind,
    phase,
    audienceUids,
    participantStatus,
    counts,
    startedAt,
    updatedAt,
    endedAt,
    durationMs,
  };
}

function upsertLiveActivitySnapshot(existing, input, limit = 60) {
  const safe = sanitizeLiveActivitySnapshot(input);
  const current = (Array.isArray(existing) ? existing : [])
    .map(sanitizeLiveActivitySnapshot)
    .filter(Boolean)
    .filter(item => !safe || item.activityId !== safe.activityId);
  if (!safe) return current.slice(-Math.max(1, limit));
  return current.concat([safe])
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(-Math.max(1, limit));
}

function selectLiveActivityPulse(snapshots) {
  const safe = (Array.isArray(snapshots) ? snapshots : [])
    .map(sanitizeLiveActivitySnapshot)
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return safe.find(item => item.phase !== 'closed' && item.phase !== 'revealed')
    || safe[0]
    || null;
}

const LIVE_ATTENTION_SIGNAL_FRESH_MS = 10 * 60 * 1000;
const LIVE_ATTENTION_WAIT_GRACE_MS = 45 * 1000;
const LIVE_ATTENTION_WORKING_LONG_MS = 3 * 60 * 1000;
const LIVE_ATTENTION_RESOURCE_GRACE_MS = 30 * 1000;
const LIVE_ATTENTION_REASON_LABELS = Object.freeze({
  signal_stuck: 'asked for help',
  signal_repeat: 'needs that repeated',
  signal_slow: 'needs more time',
  presence_disconnected: 'connection may be lost',
  presence_quiet: 'connection quiet',
  activity_waiting: 'awaiting activity response',
  activity_working_long: 'working for a while',
  resource_unopened: 'assigned resource not opened',
  resource_elsewhere: 'on a different resource',
  resource_loading: 'assigned resource still loading',
  resource_failed: 'assigned resource could not load',
});
const LIVE_ATTENTION_REASON_CODES = new Set(Object.keys(LIVE_ATTENTION_REASON_LABELS));
const LIVE_ATTENTION_REASON_SOURCES = Object.freeze({
  signal_stuck: 'student_signal',
  signal_repeat: 'student_signal',
  signal_slow: 'student_signal',
  presence_disconnected: 'connection_status',
  presence_quiet: 'connection_status',
  activity_waiting: 'activity_status',
  activity_working_long: 'activity_status',
  resource_unopened: 'delivery_status',
  resource_elsewhere: 'delivery_status',
  resource_loading: 'delivery_status',
  resource_failed: 'delivery_status',
});
const LIVE_ATTENTION_SOURCE_LABELS = Object.freeze({
  student_signal: 'Student signal',
  connection_status: 'Connection status',
  activity_status: 'Activity status',
  delivery_status: 'Delivery status',
});
const LIVE_ATTENTION_INSTRUCTIONAL_REASON_CODES = new Set([
  'signal_stuck',
  'signal_repeat',
  'signal_slow',
  'activity_waiting',
  'activity_working_long',
]);

function buildLiveActivityTimeline(snapshots, limit = 8) {
  const byId = new Map();
  (Array.isArray(snapshots) ? snapshots : []).forEach(input => {
    const safe = sanitizeLiveActivitySnapshot(input);
    if (!safe) return;
    const existing = byId.get(safe.activityId);
    if (!existing || safe.updatedAt >= existing.updatedAt) byId.set(safe.activityId, safe);
  });
  return Array.from(byId.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, Math.max(1, Math.min(20, Number(limit) || 8)))
    .map(item => ({
      activityId: item.activityId,
      family: item.family,
      kind: item.kind,
      phase: item.phase,
      counts: {
        invited: item.counts.invited,
        working: item.counts.working,
        submitted: item.counts.submitted,
        revised: item.counts.revised,
        showcased: item.counts.showcased,
        votesCast: item.counts.votesCast,
      },
      startedAt: item.startedAt,
      updatedAt: item.updatedAt,
      endedAt: item.endedAt,
      durationMs: item.durationMs,
    }));
}

const LIVE_CLASS_DEBRIEF_MODERATION_KINDS = new Set([
  'free_text',
  'word_cloud',
  'feedback_response',
  'sketch_response',
  'session_qa',
]);

/**
 * Derives a compact post-activity debrief from the existing Activity Pulse
 * snapshots. Findings contain status metadata only. They never infer
 * correctness or misconceptions, and never retain prompts or response data.
 */
function buildLiveClassDebrief(input, limit = 8) {
  const sourceValue = input && typeof input === 'object' ? input : {};
  const byId = new Map();
  (Array.isArray(sourceValue.activitySnapshots) ? sourceValue.activitySnapshots : []).forEach(raw => {
    const safe = sanitizeLiveActivitySnapshot(raw);
    if (!safe) return;
    const previous = byId.get(safe.activityId);
    if (!previous || safe.updatedAt >= previous.updatedAt) byId.set(safe.activityId, safe);
  });
  const findings = [];
  Array.from(byId.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20)
    .forEach(activity => {
      const reviewPhase = activity.phase === 'review';
      const finalPhase = activity.phase === 'revealed' || activity.phase === 'closed';
      if (!reviewPhase && !finalPhase) return;
      const statusEntries = activity.audienceUids.map(uid => ({
        uid,
        status: normalizeLiveActivityParticipantStatus(activity.participantStatus[uid]),
      }));
      const participationUids = statusEntries
        .filter(entry => entry.status === 'waiting' || entry.status === 'working')
        .map(entry => entry.uid)
        .slice(0, 250);
      const submittedWithoutRevisionUids = statusEntries
        .filter(entry => entry.status === 'submitted')
        .map(entry => entry.uid)
        .slice(0, 250);
      const invited = activity.counts.invited;
      const submitted = activity.counts.submitted;
      const approved = activity.counts.approved;
      const hidden = activity.counts.hidden;
      const feedbackSent = activity.counts.feedbackSent;
      const revised = activity.counts.revised;
      let activityHasFollowUp = false;

      if (reviewPhase && LIVE_CLASS_DEBRIEF_MODERATION_KINDS.has(activity.kind)) {
        const pendingReview = Math.max(0, submitted - approved - hidden);
        if (pendingReview > 0) {
          activityHasFollowUp = true;
          findings.push({
            id: activity.activityId + ':moderation',
            kind: 'awaiting_review',
            tone: 'review',
            priority: 140,
            label: 'Awaiting review',
            detail: pendingReview + ' submitted response' + (pendingReview === 1 ? ' still needs' : 's still need') + ' moderation.',
            count: pendingReview,
            uids: [],
            activityId: activity.activityId,
            family: activity.family,
            activityKind: activity.kind,
            phase: activity.phase,
            canOpenActivity: true,
            updatedAt: activity.updatedAt,
          });
        }
      }

      if (participationUids.length > 0) {
        activityHasFollowUp = true;
        findings.push({
          id: activity.activityId + ':participation',
          kind: 'participation_follow_up',
          tone: 'support',
          priority: 120,
          label: 'Participation follow-up',
          detail: participationUids.length + ' of ' + invited + ' invited student' + (invited === 1 ? '' : 's') + ' did not submit before this activity moved to ' + (reviewPhase ? 'review' : 'completed') + '.',
          count: participationUids.length,
          uids: participationUids,
          activityId: activity.activityId,
          family: activity.family,
          activityKind: activity.kind,
          phase: activity.phase,
          canOpenActivity: reviewPhase,
          updatedAt: activity.updatedAt,
        });
      }

      if ((activity.kind === 'feedback_response' || activity.kind === 'sketch_response')
        && feedbackSent > revised
        && submittedWithoutRevisionUids.length > 0) {
        activityHasFollowUp = true;
        findings.push({
          id: activity.activityId + ':revision',
          kind: 'revision_opportunity',
          tone: 'support',
          priority: 110,
          label: 'Revision opportunity',
          detail: feedbackSent + ' feedback send' + (feedbackSent === 1 ? '' : 's') + ' and ' + revised + ' recorded revision' + (revised === 1 ? '' : 's') + '; ' + submittedWithoutRevisionUids.length + ' current participant' + (submittedWithoutRevisionUids.length === 1 ? ' remains' : 's remain') + ' submitted rather than revised.',
          count: submittedWithoutRevisionUids.length,
          uids: submittedWithoutRevisionUids,
          activityId: activity.activityId,
          family: activity.family,
          activityKind: activity.kind,
          phase: activity.phase,
          canOpenActivity: reviewPhase,
          updatedAt: activity.updatedAt,
        });
      }

      if (!activityHasFollowUp && finalPhase && invited > 0 && submitted / invited >= 0.8) {
        findings.push({
          id: activity.activityId + ':ready',
          kind: 'ready_to_advance',
          tone: 'ready',
          priority: 20,
          label: 'Ready to advance',
          detail: submitted + ' of ' + invited + ' invited student' + (invited === 1 ? '' : 's') + ' submitted before completion.',
          count: submitted,
          uids: [],
          activityId: activity.activityId,
          family: activity.family,
          activityKind: activity.kind,
          phase: activity.phase,
          canOpenActivity: false,
          updatedAt: activity.updatedAt,
        });
      }
    });
  const safeLimit = Math.max(1, Math.min(20, boundedLiveActivityCount(limit, 20) || 8));
  return findings
    .sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt || a.id.localeCompare(b.id))
    .slice(0, safeLimit)
    .map(({ priority, updatedAt, ...finding }) => finding);
}

const LIVE_COMPANION_STATUS_LABELS = Object.freeze({
  waiting: 'Waiting',
  working: 'Working',
  submitted: 'Submitted',
  revised: 'Revised',
});

/**
 * Builds the compact moderation model used by the focused companion view.
 *
 * This deliberately reuses the sanitized Activity Pulse contract. It exposes
 * only opaque live-session UIDs, status cohorts, and aggregate moderation
 * counts so the companion can target the existing resource sender without
 * becoming another response store or moderation owner.
 */
function buildLiveCompanionModel(input) {
  const source = input && typeof input === 'object' ? input : {};
  const activity = selectLiveActivityPulse(source.activitySnapshots);
  if (!activity) {
    return {
      schemaVersion: 1,
      activity: null,
      statusCohorts: [],
      moderation: {
        approved: 0,
        hidden: 0,
        revealed: 0,
        feedbackSent: 0,
        showcased: 0,
        votesCast: 0,
      },
    };
  }
  const explicitConnectedUids = Array.isArray(source.connectedUids)
    ? source.connectedUids
    : source.connectedUids instanceof Set
      ? Array.from(source.connectedUids)
      : null;
  const roster = source.roster && typeof source.roster === 'object'
    ? source.roster
    : null;
  const currentConnectedUids = explicitConnectedUids || (roster
    ? Object.entries(roster)
      .filter(([, entry]) => entry && typeof entry === 'object')
      .map(([uid]) => uid)
    : activity.audienceUids);
  const connectedUidSet = new Set(
    currentConnectedUids
      .map(uid => boundedLiveActivityText(uid, 128))
      .filter(Boolean)
      .slice(0, 250)
  );

  const statusBuckets = {
    waiting: [],
    working: [],
    submitted: [],
    revised: [],
  };
  activity.audienceUids.filter(uid => connectedUidSet.has(uid)).forEach(uid => {
    const status = normalizeLiveActivityParticipantStatus(activity.participantStatus[uid]);
    statusBuckets[status].push(uid);
  });
  const statusCohorts = Object.keys(LIVE_COMPANION_STATUS_LABELS)
    .map(status => ({
      status,
      label: LIVE_COMPANION_STATUS_LABELS[status],
      count: statusBuckets[status].length,
      // The canonical sender chunks this bounded cohort into safe patches.
      uids: statusBuckets[status].slice(0, 250),
    }))
    .filter(cohort => cohort.count > 0);

  return {
    schemaVersion: 1,
    activity: {
      activityId: activity.activityId,
      family: activity.family,
      kind: activity.kind,
      phase: activity.phase,
      invited: Object.values(statusBuckets).reduce((sum, uids) => sum + uids.length, 0),
      working: statusBuckets.working.length,
      submitted: statusBuckets.submitted.length + statusBuckets.revised.length,
      revised: statusBuckets.revised.length,
      startedAt: activity.startedAt,
      updatedAt: activity.updatedAt,
    },
    statusCohorts,
    moderation: {
      approved: activity.counts.approved,
      hidden: activity.counts.hidden,
      revealed: activity.counts.revealed,
      feedbackSent: activity.counts.feedbackSent,
      showcased: activity.counts.showcased,
      votesCast: activity.counts.votesCast,
    },
  };
}

function resolveLiveAttentionTarget(uid, entry, groups, currentResourceId, sessionMode) {
  if (entry && entry.resourceId) {
    return { resourceId: entry.resourceId, assignedAt: boundedLiveActivityCount(entry.resourceAt, Number.MAX_SAFE_INTEGER) };
  }
  const group = entry && entry.groupId && groups && groups[entry.groupId];
  if (group && group.resourceId) {
    return { resourceId: group.resourceId, assignedAt: boundedLiveActivityCount(group.resourceAt, Number.MAX_SAFE_INTEGER) };
  }
  if (sessionMode === 'sync' && currentResourceId) return { resourceId: currentResourceId, assignedAt: 0 };
  return { resourceId: null, assignedAt: 0 };
}

function buildLiveAttentionQueue(input) {
  const source = input && typeof input === 'object' ? input : {};
  const roster = source.roster && typeof source.roster === 'object' ? source.roster : {};
  const groups = source.groups && typeof source.groups === 'object' ? source.groups : {};
  const requestedNow = Number(source.now);
  const now = boundedLiveActivityCount(
    Number.isFinite(requestedNow) ? requestedNow : Date.now(),
    Number.MAX_SAFE_INTEGER
  );
  const requestedSignalFreshMs = Number(source.signalFreshMs);
  const signalFreshMs = boundedLiveActivityCount(
    Number.isFinite(requestedSignalFreshMs) && requestedSignalFreshMs > 0
      ? requestedSignalFreshMs
      : LIVE_ATTENTION_SIGNAL_FRESH_MS,
    60 * 60 * 1000
  );
  const activityPulse = selectLiveActivityPulse(source.activitySnapshots);
  const activityElapsed = activityPulse && activityPulse.startedAt
    ? Math.max(0, now - activityPulse.startedAt)
    : 0;
  const queue = [];

  Object.entries(roster).slice(0, 250).forEach(([rawUid, rawEntry]) => {
    const uid = boundedLiveActivityText(rawUid, 128);
    const entry = rawEntry && typeof rawEntry === 'object' ? rawEntry : {};
    if (!uid) return;
    const reasons = [];
    const addReason = (code, weight) => {
      if (!reasons.some(reason => reason.code === code)) reasons.push({ code, weight });
    };

    const signalAge = entry.signalAt ? Math.max(0, now - Number(entry.signalAt)) : Number.POSITIVE_INFINITY;
    if (entry.signal && entry.signal !== 'ready' && signalAge < signalFreshMs) {
      if (entry.signal === 'stuck') addReason('signal_stuck', 120);
      else if (entry.signal === 'repeat') addReason('signal_repeat', 112);
      else if (entry.signal === 'slow') addReason('signal_slow', 104);
    }

    if (entry.lastSeen) {
      const seenAge = Math.max(0, now - Number(entry.lastSeen));
      if (seenAge >= 200000) addReason('presence_disconnected', 94);
      else if (seenAge >= 95000) addReason('presence_quiet', 58);
    }

    const activityStatus = activityPulse && activityPulse.participantStatus[uid];
    if (activityPulse && activityPulse.phase === 'collecting') {
      if (activityStatus === 'waiting' && activityElapsed >= LIVE_ATTENTION_WAIT_GRACE_MS) {
        addReason('activity_waiting', 76);
      } else if (activityStatus === 'working' && activityElapsed >= LIVE_ATTENTION_WORKING_LONG_MS) {
        addReason('activity_working_long', 68);
      }
    }

    const target = resolveLiveAttentionTarget(
      uid,
      entry,
      groups,
      source.currentResourceId,
      source.sessionMode
    );
    if (target.resourceId && target.assignedAt) {
      const viewingAt = boundedLiveActivityCount(entry.viewingAt, Number.MAX_SAFE_INTEGER);
      const hasAssignmentNonce = Object.prototype.hasOwnProperty.call(entry, 'viewingResourceAt');
      const viewingResourceAt = boundedLiveActivityCount(entry.viewingResourceAt, Number.MAX_SAFE_INTEGER);
      const statusMatchesAssignment = hasAssignmentNonce && viewingResourceAt === target.assignedAt;
      const deliveryStatus = statusMatchesAssignment ? entry.viewingResourceStatus : null;
      const assignmentAcknowledged = statusMatchesAssignment
        ? deliveryStatus !== 'loading' && deliveryStatus !== 'failed' && entry.viewingResourceId === target.resourceId
        : viewingAt >= target.assignedAt;
      const assignmentIsLate = now - target.assignedAt >= LIVE_ATTENTION_RESOURCE_GRACE_MS;
      // New clients bind a fixed delivery enum to the exact assignment nonce.
      // Older clients retain the timestamp fallback so mixed-version classes
      // do not get false alerts after consuming a one-time push.
      if (deliveryStatus === 'failed') {
        addReason('resource_failed', 116);
      } else if (deliveryStatus === 'loading' && assignmentIsLate) {
        addReason('resource_loading', 64);
      } else if (!assignmentAcknowledged && assignmentIsLate) {
        addReason(entry.viewingResourceId ? 'resource_elsewhere' : 'resource_unopened', entry.viewingResourceId ? 52 : 62);
      }
    }

    if (reasons.length === 0) return;
    reasons.sort((a, b) => b.weight - a.weight);
    queue.push({
      uid,
      score: reasons.reduce((sum, reason) => sum + reason.weight, 0),
      reasons: reasons.map(reason => reason.code),
      evidenceSources: Array.from(new Set(
        reasons.map(reason => LIVE_ATTENTION_REASON_SOURCES[reason.code]).filter(Boolean)
      )),
      activityStatus: LIVE_ACTIVITY_PARTICIPANT_STATUSES.has(activityStatus) ? activityStatus : null,
      targetResourceId: target.resourceId,
    });
  });

  return queue
    .sort((a, b) => b.score - a.score || a.uid.localeCompare(b.uid))
    .slice(0, 12);
}


/**
 * Groups already-reduced instructional attention metadata by the teacher's
 * existing session groups. This remains a device-memory view: it intentionally
 * returns no student labels, response content, prompts, feedback, or
 * correctness data. Presence and delivery troubleshooting signals are omitted
 * so a connection problem is never presented as an instructional group need.
 */
function buildLiveAttentionCohorts(queue, roster, groups, limit = 6) {
  const safeRoster = roster && typeof roster === 'object' ? roster : {};
  const safeGroups = groups && typeof groups === 'object' ? groups : {};
  const seenUids = new Set();
  const buckets = new Map();

  (Array.isArray(queue) ? queue : []).slice(0, 25).forEach(rawItem => {
    const item = rawItem && typeof rawItem === 'object' ? rawItem : {};
    const uid = boundedLiveActivityText(item.uid, 128);
    if (!uid || seenUids.has(uid)) return;
    seenUids.add(uid);
    const entry = safeRoster[uid] && typeof safeRoster[uid] === 'object' ? safeRoster[uid] : null;
    const groupId = boundedLiveActivityText(entry && entry.groupId, 128);
    if (!groupId
      || !Object.prototype.hasOwnProperty.call(safeGroups, groupId)
      || !safeGroups[groupId]
      || typeof safeGroups[groupId] !== 'object') return;

    const reasons = Array.from(new Set(
      (Array.isArray(item.reasons) ? item.reasons : [])
        .filter(code => LIVE_ATTENTION_INSTRUCTIONAL_REASON_CODES.has(code))
    )).slice(0, 4);
    if (reasons.length === 0) return;
    const bucket = buckets.get(groupId) || {
      groupId,
      uids: [],
      score: 0,
      reasonCounts: {},
    };
    bucket.uids.push(uid);
    bucket.score += boundedLiveActivityCount(item.score, 10000);
    reasons.forEach(code => {
      bucket.reasonCounts[code] = (bucket.reasonCounts[code] || 0) + 1;
    });
    buckets.set(groupId, bucket);
  });

  const memberCounts = {};
  Object.values(safeRoster).slice(0, 250).forEach(rawEntry => {
    const entry = rawEntry && typeof rawEntry === 'object' ? rawEntry : {};
    const groupId = boundedLiveActivityText(entry.groupId, 128);
    if (groupId && Object.prototype.hasOwnProperty.call(safeGroups, groupId)) {
      memberCounts[groupId] = (memberCounts[groupId] || 0) + 1;
    }
  });
  const safeLimit = Math.max(1, Math.min(12, boundedLiveActivityCount(limit, 12) || 6));

  return Array.from(buckets.values())
    .filter(bucket => bucket.uids.length >= 2)
    .map(bucket => {
      const memberCount = memberCounts[bucket.groupId] || bucket.uids.length;
      const topReasonCodes = Object.entries(bucket.reasonCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([code]) => code)
        .slice(0, 3);
      return {
        groupId: bucket.groupId,
        uids: bucket.uids.slice(0, 25),
        count: bucket.uids.length,
        memberCount,
        allMembersFlagged: memberCount > 0 && bucket.uids.length === memberCount,
        topReasonCodes,
        score: bucket.score,
      };
    })
    .sort((a, b) => b.count - a.count || b.score - a.score || a.groupId.localeCompare(b.groupId))
    .slice(0, safeLimit);
}

function liveAttentionReasonLabel(code) {
  return LIVE_ATTENTION_REASON_LABELS[code] || 'needs attention';
}

function liveAttentionSourceLabel(code) {
  return LIVE_ATTENTION_SOURCE_LABELS[code] || 'Status metadata';
}

function formatLiveActivityDuration(durationMs) {
  const ms = boundedLiveActivityCount(durationMs, 24 * 60 * 60 * 1000);
  if (!ms) return '';
  const minutes = Math.max(1, Math.round(ms / 60000));
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * Builds the quiz family's shared, privacy-safe coordination view from the
 * existing merged quiz state. The caller remains responsible for merging the
 * P2P answer channel with its fallback store; this helper never retains raw
 * answers, correctness, prompts, codenames, or grading data.
 */
function buildLiveQuizActivitySnapshot(input) {
  const source = input && typeof input === 'object' ? input : {};
  const quizState = source.quizState && typeof source.quizState === 'object'
    ? source.quizState
    : {};
  const roster = source.roster && typeof source.roster === 'object'
    ? source.roster
    : {};
  const startedAt = boundedLiveActivityCount(
    quizState.startedAt || source.startedAt,
    Number.MAX_SAFE_INTEGER
  );
  const storedActivityId = boundedLiveActivityText(quizState.activityId, 120);
  const isActive = quizState.isActive === true;

  // The canonical session shape always has an inactive quizState. Do not turn
  // that placeholder into a phantom completed quiz before a quiz was launched.
  if (!isActive && !storedActivityId && !startedAt) return null;

  const sessionCode = boundedLiveActivityText(source.sessionCode, 48) || 'session';
  const activityId = storedActivityId
    || `quiz:${sessionCode}:${startedAt || 'legacy-active'}`;
  const audienceUids = Object.keys(roster)
    .map(uid => boundedLiveActivityText(uid, 128))
    .filter(Boolean)
    .slice(0, 250);
  const allResponses = quizState.allResponses && typeof quizState.allResponses === 'object'
    ? quizState.allResponses
    : {};
  const currentResponses = quizState.responses && typeof quizState.responses === 'object'
    ? quizState.responses
    : {};
  const responseReceipts = quizState.responseReceipts && typeof quizState.responseReceipts === 'object'
    ? quizState.responseReceipts
    : {};
  const currentQuestionIndex = Number.isInteger(quizState.currentQuestionIndex)
    && quizState.currentQuestionIndex >= 0
    ? quizState.currentQuestionIndex
    : 0;
  const questionCount = boundedLiveActivityCount(
    quizState.questionCount || source.questionCount,
    1000
  );
  const rawPhase = boundedLiveActivityText(quizState.phase, 40);
  const questionIsLive = rawPhase === 'answering'
    || rawPhase === 'revealed'
    || rawPhase === 'boss-defeated'
    || rawPhase === 'class-defeated';
  const participantStatus = {};

  audienceUids.forEach(uid => {
    const bucket = allResponses[uid] && typeof allResponses[uid] === 'object'
      ? allResponses[uid]
      : {};
    const records = Object.values(bucket);
    const completion = records.some(record => (
      record && typeof record === 'object' && record.itemType === 'assessment-complete'
    )) || (
      questionCount > 0
      && bucket[questionCount]
      && bucket[questionCount].itemType === 'assessment-complete'
    );
    const hasCurrentAnswer = Object.prototype.hasOwnProperty.call(currentResponses, uid)
      || Object.prototype.hasOwnProperty.call(bucket, String(currentQuestionIndex));
    const receipt = responseReceipts[uid] && typeof responseReceipts[uid] === 'object'
      ? responseReceipts[uid]
      : null;
    const receiptKeys = receipt ? Object.keys(receipt) : [];
    const validReceipt = !!receipt
      && receiptKeys.length === 4
      && receiptKeys.every(key => ['activityId', 'questionIndex', 'submittedAt', 'flow'].includes(key))
      && boundedLiveActivityText(receipt.activityId, 120) === activityId
      && Number.isInteger(receipt.questionIndex)
      && receipt.questionIndex >= 0
      && receipt.questionIndex <= 9999
      && Number.isFinite(Number(receipt.submittedAt))
      && Number(receipt.submittedAt) > 0
      && (receipt.flow === 'assessment' || receipt.flow === 'presentation');
    const receiptCompletesAssessment = validReceipt
      && receipt.flow === 'assessment'
      && questionCount > 0
      && receipt.questionIndex === questionCount;
    const hasCurrentReceipt = validReceipt && receipt.questionIndex === currentQuestionIndex;
    const hasAnyReceiptWork = validReceipt && receipt.flow === 'assessment'
      && (questionCount === 0 || receipt.questionIndex <= questionCount);
    const hasAnyWork = records.some(record => record !== null && record !== undefined)
      || hasCurrentAnswer
      || hasAnyReceiptWork;

    participantStatus[uid] = completion
      || receiptCompletesAssessment
      || (questionIsLive && (hasCurrentAnswer || hasCurrentReceipt))
      ? 'submitted'
      : hasAnyWork
        ? 'working'
        : 'waiting';
  });

  const phase = !isActive
    ? 'closed'
    : rawPhase === 'answering'
      ? 'collecting'
      : rawPhase === 'revealed' || rawPhase === 'boss-defeated' || rawPhase === 'class-defeated'
        ? 'revealed'
        : 'paused';
  const now = boundedLiveActivityCount(source.now || Date.now(), Number.MAX_SAFE_INTEGER);

  return sanitizeLiveActivitySnapshot({
    activityId,
    family: 'quiz',
    kind: 'quiz',
    phase,
    audienceUids,
    participantStatus,
    startedAt,
    updatedAt: now,
    endedAt: phase === 'closed' || phase === 'revealed'
      ? boundedLiveActivityCount(quizState.endedAt || now, Number.MAX_SAFE_INTEGER)
      : 0,
    durationMs: startedAt ? Math.max(0, now - startedAt) : 0,
  });
}

function liveActivityKindLabel(kind) {
  return ({
    rating: 'Rating poll',
    multiple_choice: 'Multiple choice',
    free_text: 'Free-text response',
    word_cloud: 'Word cloud',
    feedback_response: 'Feedback response',
    pictionary: 'Concept Pictionary',
    sketch_response: 'Sketch response',
    session_qa: 'Live Q&A',
    quiz: 'Live quiz',
  })[kind] || 'Live activity';
}

function liveActivityPhaseLabel(phase) {
  return ({
    collecting: 'Collecting',
    paused: 'Paused',
    review: 'Review',
    revealed: 'Revealed',
    closed: 'Completed',
  })[phase] || 'Activity';
}

function LiveLessonRunPanel(props) {
  const {
    history,
    getStudentSafeResources,
    currentItemId = null,
    currentResourceId = null,
    sessionMode = 'sync',
    activeUnitLabel = '',
    groups = {},
    roster = {},
    getTitle = item => item && (item.title || item.type) || 'Resource',
    getIcon = () => null,
    onOpenResource,
    onSendToGroup,
    onSendToStudent,
    onSendToStudents,
    onReleaseStudentResources,
    activitySnapshots = [],
    onOpenActivity,
    presenterCuesByResourceId = {},
    onChangePresenterCue,
    onLaunchPreparedInteraction,
    preparationOnly = false,
    now = Date.now(),
    signalFreshMs = LIVE_ATTENTION_SIGNAL_FRESH_MS,
    t = key => key,
  } = props || {};

  const [selectedStepId, setSelectedStepId] = React.useState(null);
  const [audienceKey, setAudienceKey] = React.useState('class');
  const [companionMode, setCompanionMode] = React.useState(false);
  const [attentionSelectedUids, setAttentionSelectedUids] = React.useState([]);
  const [companionSelection, setCompanionSelection] = React.useState({
    activityId: '',
    byStatus: {},
  });
  const [attentionSending, setAttentionSending] = React.useState(false);
  const [attentionSendingUid, setAttentionSendingUid] = React.useState(null);
  const [attentionSendStatus, setAttentionSendStatus] = React.useState('');
  const [attentionReleasing, setAttentionReleasing] = React.useState(false);
  const [attentionReleaseStatus, setAttentionReleaseStatus] = React.useState('');
  const [debriefSendingId, setDebriefSendingId] = React.useState('');
  const [debriefSendStatus, setDebriefSendStatus] = React.useState('');
  const steps = React.useMemo(
    () => buildLiveLessonSteps(history, getStudentSafeResources),
    [history, getStudentSafeResources]
  );
  const liveRunReadiness = React.useMemo(
    () => buildLiveLessonReadiness(
      steps,
      presenterCuesByResourceId,
      (Array.isArray(history) ? history : []).filter(item => item && item.id && item.type).length
    ),
    [steps, presenterCuesByResourceId, history]
  );
  const liveRunReadinessTone = ({
    ready: { border: '#86efac', background: '#f0fdf4', text: '#166534' },
    review: { border: '#fcd34d', background: '#fffbeb', text: '#854d0e' },
    needs_attention: { border: '#fca5a5', background: '#fef2f2', text: '#991b1b' },
  })[liveRunReadiness.status];
  const audiences = React.useMemo(
    () => buildLiveLessonAudiences(groups, roster, {
      classLabel: t('live_lesson.whole_class') || 'Whole class',
      groupLabel: t('common.group') || 'Group',
      studentLabel: t('live_dock.student') || 'Student',
    }),
    [groups, roster, t]
  );
  const currentIndex = resolveLiveLessonIndex(steps, currentItemId, currentResourceId);
  const selectedIndex = selectedStepId
    ? steps.findIndex(item => item.id === selectedStepId)
    : -1;
  const focusIndex = selectedIndex >= 0
    ? selectedIndex
    : (currentIndex >= 0 ? currentIndex : 0);
  const focusItem = steps[focusIndex] || null;
  const previousIndex = adjacentLiveLessonIndex(steps.length, focusIndex, 'previous');
  const nextIndex = adjacentLiveLessonIndex(steps.length, focusIndex, 'next');
  const selectedAudience = resolveLiveLessonAudience(audiences, audienceKey);
  const effectiveAudienceKey = selectedAudience ? selectedAudience.key : 'class';
  const delivery = summarizeLiveLessonDelivery(
    focusItem && focusItem.id,
    selectedAudience,
    roster
  );
  const teacherPaced = sessionMode === 'sync';
  const focusIsCurrent = currentIndex >= 0 && focusIndex === currentIndex;
  const presenterCue = normalizeLivePresenterCue(
    focusItem && presenterCuesByResourceId && presenterCuesByResourceId[focusItem.id]
  );
  const hasPresenterCue = LIVE_PRESENTER_CUE_FIELDS.some(field => presenterCue[field].trim());
  const preparedCheckpoint = presenterCue.checkpoint;
  const hasPreparedCheckpoint = !!preparedCheckpoint.kind;
  const preparedCheckpointLaunchBlocked = preparedCheckpoint.kind === 'live_quiz'
    && (!focusItem || focusItem.type !== 'quiz');
  const nextItem = nextIndex >= 0 ? steps[nextIndex] : null;
  const nextPresenterCue = normalizeLivePresenterCue(
    nextItem && presenterCuesByResourceId && presenterCuesByResourceId[nextItem.id]
  );
  const nextHasPresenterCue = LIVE_PRESENTER_CUE_FIELDS.some(
    field => nextPresenterCue[field].trim()
  );
  const nextCheckpointLabel = ({
    quick_check: 'Quick check',
    word_cloud: 'Word cloud',
    open_response: 'Open response',
    feedback_response: 'Feedback response',
    sketch_response: 'Sketch Response',
    live_quiz: 'Live quiz',
  })[nextPresenterCue.checkpoint.kind] || '';
  const nextItemTitle = nextItem
    ? String(getTitle(nextItem) || nextItem.type || 'Next step').trim().slice(0, 96)
    : '';
  const preparedCheckpointPromptPlaceholder = ({
    quick_check: 'How is this landing for you right now?',
    word_cloud: 'What word or short phrase best captures your thinking?',
    open_response: 'What is your strongest response to this lesson step?',
    feedback_response: 'Explain your thinking using evidence from the lesson.',
    sketch_response: 'Draw a model that shows your understanding of this lesson step.',
  })[preparedCheckpoint.kind] || '';
  const updatePresenterCue = (field, value) => {
    if (!focusItem || typeof onChangePresenterCue !== 'function') return;
    onChangePresenterCue(focusItem.id, { [field]: value });
  };
  const clearPresenterCue = () => {
    if (!focusItem || typeof onChangePresenterCue !== 'function') return;
    onChangePresenterCue(focusItem.id, { sayAsk: '', lookFor: '', nextMove: '' });
  };
  const updatePreparedCheckpoint = patch => {
    if (!focusItem || typeof onChangePresenterCue !== 'function') return;
    onChangePresenterCue(focusItem.id, {
      checkpoint: normalizeLivePreparedCheckpoint({ ...preparedCheckpoint, ...(patch || {}) }),
    });
  };
  const clearPreparedCheckpoint = () => updatePreparedCheckpoint({ kind: '', prompt: '', criteria: '' });
  const launchPreparedCheckpoint = () => {
    if (!focusItem
      || !hasPreparedCheckpoint
      || preparedCheckpointLaunchBlocked
      || typeof onLaunchPreparedInteraction !== 'function') return;
    onLaunchPreparedInteraction(preparedCheckpoint, focusItem, selectedAudience);
  };

  const activityPulse = selectLiveActivityPulse(activitySnapshots);
  const companionActive = !preparationOnly && companionMode;
  const companionModel = React.useMemo(
    () => buildLiveCompanionModel({ activitySnapshots, roster }),
    [activitySnapshots, roster]
  );
  const attentionQueue = React.useMemo(() => buildLiveAttentionQueue({
    roster,
    groups,
    activitySnapshots,
    currentResourceId,
    sessionMode,
    now,
    signalFreshMs,
  }), [roster, groups, activitySnapshots, currentResourceId, sessionMode, now, signalFreshMs]);
  const attentionCohorts = React.useMemo(
    () => buildLiveAttentionCohorts(attentionQueue, roster, groups, 6),
    [attentionQueue, roster, groups]
  );
  const attentionResourceTitle = focusItem
    ? boundedLiveActivityText(getTitle(focusItem), 96) || 'Selected lesson step'
    : '';
  const activityTimeline = React.useMemo(
    () => buildLiveActivityTimeline(activitySnapshots, 8),
    [activitySnapshots]
  );
  const classDebrief = React.useMemo(
    () => buildLiveClassDebrief({ activitySnapshots }, 8),
    [activitySnapshots]
  );
  const attentionUidSet = new Set(attentionQueue.map(item => item.uid));
  const validAttentionSelectedUids = attentionSelectedUids.filter(uid => attentionUidSet.has(uid));
  const currentCompanionActivityId = boundedLiveActivityText(
    companionModel.activity && companionModel.activity.activityId,
    128
  );
  const validCompanionSelectedUids = companionActive
    && currentCompanionActivityId
    && companionSelection.activityId === currentCompanionActivityId
    ? companionModel.statusCohorts.flatMap(cohort => {
      const currentUidSet = new Set(cohort.uids);
      const selectedForStatus = Array.isArray(companionSelection.byStatus?.[cohort.status])
        ? companionSelection.byStatus[cohort.status]
        : [];
      return selectedForStatus.filter(uid => currentUidSet.has(uid));
    })
    : [];
  const validSelectedUids = Array.from(new Set(
    validAttentionSelectedUids.concat(validCompanionSelectedUids)
  )).slice(0, companionActive ? 250 : 12);
  const acknowledgedResourceOverrideUids = React.useMemo(
    () => buildAcknowledgedLiveResourceOverrides(roster, 25),
    [roster]
  );

  const toggleAttentionSelection = uid => {
    if (!attentionUidSet.has(uid)) return;
    setAttentionSendStatus('');
    setAttentionSelectedUids(current => current.includes(uid)
      ? current.filter(item => item !== uid)
      : current.concat([uid]).slice(0, 12));
  };

  const toggleAttentionCohort = cohort => {
    const cohortUids = Array.from(new Set(
      (cohort && Array.isArray(cohort.uids) ? cohort.uids : [])
        .filter(uid => attentionUidSet.has(uid))
    )).slice(0, 12);
    if (cohortUids.length === 0) return;
    setAttentionSendStatus('');
    setAttentionSelectedUids(current => {
      const allSelected = cohortUids.every(uid => current.includes(uid));
      if (allSelected) return current.filter(uid => !cohortUids.includes(uid));
      return Array.from(new Set(current.concat(cohortUids))).slice(0, 12);
    });
  };

  const toggleCompanionStatusCohort = cohort => {
    const activityId = currentCompanionActivityId;
    const status = cohort && Object.prototype.hasOwnProperty.call(LIVE_COMPANION_STATUS_LABELS, cohort.status)
      ? cohort.status
      : '';
    const cohortUids = Array.from(new Set(
      cohort && Array.isArray(cohort.uids) ? cohort.uids : []
    )).slice(0, 250);
    if (!activityId || !status || cohortUids.length === 0) return;
    setAttentionSendStatus('');
    setCompanionSelection(current => {
      const byStatus = current.activityId === activityId
        && current.byStatus
        && typeof current.byStatus === 'object'
        ? { ...current.byStatus }
        : {};
      const existing = Array.isArray(byStatus[status])
        ? byStatus[status]
        : [];
      const allSelected = cohortUids.every(uid => existing.includes(uid));
      if (allSelected) {
        delete byStatus[status];
      } else {
        byStatus[status] = cohortUids;
      }
      return { activityId, byStatus };
    });
  };

  const sendDebriefFinding = async finding => {
    if (!finding || !focusItem || debriefSendingId) return;
    const currentUids = Array.from(new Set(
      (Array.isArray(finding.uids) ? finding.uids : [])
        .filter(uid => Object.prototype.hasOwnProperty.call(roster, uid))
    )).slice(0, 25);
    if (currentUids.length === 0) {
      setDebriefSendStatus('Those students are no longer connected. Use the saved finding to plan the next lesson.');
      return;
    }
    setDebriefSendingId(finding.id);
    setDebriefSendStatus('');
    try {
      if (typeof onSendToStudents === 'function') {
        const result = await onSendToStudents(currentUids, focusItem);
        const sent = result && Number.isFinite(Number(result.sent)) ? Number(result.sent) : currentUids.length;
        const failed = result && Number.isFinite(Number(result.failed)) ? Number(result.failed) : 0;
        const disconnected = Math.max(0, currentUids.length - sent - failed);
        setDebriefSendStatus(disconnected > 0
          ? sent + ' assigned; ' + disconnected + ' no longer connected' + (failed ? '; ' + failed + ' could not be assigned.' : '.')
          : failed > 0
            ? sent + ' assigned; ' + failed + ' could not be assigned.'
            : 'Assigned ' + attentionResourceTitle + ' to ' + sent + ' student' + (sent === 1 ? '' : 's') + '.');
      } else if (typeof onSendToStudent === 'function') {
        await Promise.all(currentUids.map(uid => onSendToStudent(uid, focusItem)));
        setDebriefSendStatus('Assigned ' + attentionResourceTitle + ' to ' + currentUids.length + ' student' + (currentUids.length === 1 ? '' : 's') + '.');
      }
    } catch (error) {
      setDebriefSendStatus('Could not assign that follow-up resource. Please try again.');
    } finally {
      setDebriefSendingId('');
    }
  };

  const sendAttentionSelection = async () => {
    const selectedUids = validSelectedUids;
    if (!focusItem || attentionSending || attentionReleasing || attentionSendingUid) return;
    if (selectedUids.length === 0) {
      const hasStoredCompanionSelection = Object.values(companionSelection.byStatus || {})
        .some(uids => Array.isArray(uids) && uids.length > 0);
      if (attentionSelectedUids.length > 0 || hasStoredCompanionSelection) {
        setAttentionSelectedUids([]);
        setCompanionSelection({ activityId: '', byStatus: {} });
        setAttentionSendStatus('The selected students are no longer connected. Select a current cohort and try again.');
      }
      return;
    }
    setAttentionSending(true);
    setAttentionSendStatus('');
    try {
      if (typeof onSendToStudents === 'function') {
        const result = await onSendToStudents(selectedUids, focusItem);
        const sent = result && Number.isFinite(Number(result.sent))
          ? Number(result.sent)
          : selectedUids.length;
        const failed = result && Number.isFinite(Number(result.failed)) ? Number(result.failed) : 0;
        const noLongerConnected = Math.max(0, selectedUids.length - sent - failed);
        if (sent === 0 && failed === 0 && noLongerConnected > 0) {
          setAttentionSendStatus('The selected students are no longer connected. Select a current cohort and try again.');
        } else if (noLongerConnected > 0) {
          setAttentionSendStatus(`${sent} assigned; ${noLongerConnected} no longer connected${failed > 0 ? `; ${failed} could not be assigned` : ''}.`);
        } else {
          setAttentionSendStatus(failed > 0
            ? `${sent} assigned; ${failed} could not be assigned.`
            : `Assigned to ${sent} student${sent === 1 ? '' : 's'}.`);
        }
      } else if (typeof onSendToStudent === 'function') {
        await Promise.all(selectedUids.map(uid => onSendToStudent(uid, focusItem)));
        setAttentionSendStatus(`Assigned to ${selectedUids.length} student${selectedUids.length === 1 ? '' : 's'}.`);
      }
      setAttentionSelectedUids([]);
      setCompanionSelection({ activityId: '', byStatus: {} });
    } catch (error) {
      setAttentionSendStatus('Could not assign that resource. Please try again.');
    } finally {
      setAttentionSending(false);
    }
  };

  const sendAttentionStudent = async uid => {
    if (!focusItem
      || !uid
      || attentionSending
      || attentionReleasing
      || attentionSendingUid
      || typeof onSendToStudent !== 'function') return;
    const entry = roster[uid] && typeof roster[uid] === 'object' ? roster[uid] : {};
    const name = String(entry.name || 'Student');
    setAttentionSendingUid(uid);
    setAttentionSendStatus('');
    try {
      const result = await onSendToStudent(uid, focusItem);
      const failed = result && Number.isFinite(Number(result.failed)) ? Number(result.failed) : 0;
      setAttentionSendStatus(failed > 0
        ? `Could not assign ${attentionResourceTitle || 'that resource'} to ${name}. Please try again.`
        : `Assigned ${attentionResourceTitle || 'the selected resource'} to ${name}.`);
    } catch (error) {
      setAttentionSendStatus(`Could not assign ${attentionResourceTitle || 'that resource'} to ${name}. Please try again.`);
    } finally {
      setAttentionSendingUid(null);
    }
  };

  const releaseAcknowledgedResources = async () => {
    if (acknowledgedResourceOverrideUids.length === 0
      || attentionReleasing
      || attentionSending
      || attentionSendingUid
      || typeof onReleaseStudentResources !== 'function') return;
    setAttentionReleasing(true);
    setAttentionReleaseStatus('');
    try {
      const result = await onReleaseStudentResources(acknowledgedResourceOverrideUids);
      const released = result && Number.isFinite(Number(result.released))
        ? Number(result.released)
        : acknowledgedResourceOverrideUids.length;
      const failed = result && Number.isFinite(Number(result.failed)) ? Number(result.failed) : 0;
      setAttentionReleaseStatus(failed > 0
        ? `${released} released; ${failed} could not be released.`
        : `Released ${released} opened individual support${released === 1 ? '' : 's'}.`);
    } catch (error) {
      setAttentionReleaseStatus('Could not release opened supports. Please try again.');
    } finally {
      setAttentionReleasing(false);
    }
  };

  const selectAt = index => {
    const item = steps[index];
    if (item) setSelectedStepId(item.id);
  };

  const deliverFocused = () => {
    if (!focusItem || !selectedAudience) return;
    if (selectedAudience.kind === 'group') {
      if (typeof onSendToGroup === 'function') onSendToGroup(selectedAudience.id, focusItem);
      return;
    }
    if (selectedAudience.kind === 'student') {
      if (typeof onSendToStudent === 'function') onSendToStudent(selectedAudience.id, focusItem);
      return;
    }
    if (typeof onOpenResource === 'function') onOpenResource(focusItem);
  };

  const actionAvailable = !!focusItem && !!selectedAudience && (
    (selectedAudience.kind === 'class' && typeof onOpenResource === 'function')
    || (selectedAudience.kind === 'group' && typeof onSendToGroup === 'function')
    || (selectedAudience.kind === 'student' && typeof onSendToStudent === 'function')
  );
  const actionLabel = selectedAudience && selectedAudience.kind === 'group'
    ? (t('live_lesson.send_group') || 'Send to group')
    : selectedAudience && selectedAudience.kind === 'student'
      ? (t('live_lesson.send_student') || 'Send to student')
      : teacherPaced
        ? (t('live_lesson.present_class') || 'Present to class')
        : (t('live_lesson.open_teacher') || 'Open on teacher screen');

  const buttonBase = {
    minHeight: 38,
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: 'white',
    color: '#0f172a',
    padding: '0.4rem 0.55rem',
    fontFamily: 'inherit',
    fontSize: '0.72rem',
    fontWeight: 800,
    cursor: 'pointer',
  };
  const disabledButton = {
    ...buttonBase,
    color: '#94a3b8',
    background: '#f8fafc',
    cursor: 'not-allowed',
  };

  return (
    <section
      aria-label={preparationOnly
        ? 'Prepare live run'
        : companionActive
          ? (t('live_lesson.companion_title') || 'Live moderation companion')
          : (t('live_lesson.title') || 'Lesson path')}
      data-live-companion-mode={companionActive ? 'focused' : 'off'}
      style={{
        padding: '0.55rem',
        border: '1px solid #bfdbfe',
        borderRadius: 10,
        background: '#eff6ff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span aria-hidden="true">▶</span>
        <strong style={{ color: '#1e3a8a', fontSize: '0.78rem' }}>
          {preparationOnly
            ? 'Prepare live run'
            : companionActive
              ? (t('live_lesson.companion_title') || 'Live companion')
              : (t('live_lesson.title') || 'Lesson path')}
        </strong>
        {!preparationOnly && (
          <button
            type="button"
            aria-pressed={companionActive}
            onClick={() => {
              setAttentionSelectedUids([]);
              setCompanionSelection({ activityId: '', byStatus: {} });
              setAttentionSendStatus('');
              setCompanionMode(current => !current);
            }}
            style={{
              marginLeft: 'auto',
              minHeight: 32,
              border: '1px solid #818cf8',
              borderRadius: 7,
              background: companionActive ? '#4338ca' : '#eef2ff',
              color: companionActive ? 'white' : '#3730a3',
              padding: '0.25rem 0.45rem',
              fontFamily: 'inherit',
              fontSize: '0.6rem',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            {companionActive
              ? (t('live_lesson.return_lesson_path') || 'Lesson path')
              : (t('live_lesson.open_companion') || 'Companion')}
          </button>
        )}
        <span
          style={{
            marginLeft: preparationOnly ? 'auto' : 0,
            color: '#1d4ed8',
            fontSize: '0.66rem',
            fontWeight: 800,
          }}
        >
          {steps.length
            ? `${focusIndex + 1} / ${steps.length}`
            : `0 ${t('live_lesson.steps') || 'steps'}`}
        </span>
      </div>

      {activeUnitLabel && !companionActive && (
        <div
          title={activeUnitLabel}
          style={{
            marginTop: 3,
            color: '#475569',
            fontSize: '0.65rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {t('live_lesson.order_source') || 'History order'}: {activeUnitLabel}
        </div>
      )}

      {companionActive && (
        <section
          data-live-companion-focus="status-only"
          aria-label={t('live_lesson.companion_focus') || 'Companion moderation focus'}
          style={{
            marginTop: 7,
            padding: '0.5rem',
            border: '1px solid #818cf8',
            borderRadius: 9,
            background: '#eef2ff',
          }}
        >
          <strong style={{ display: 'block', color: '#312e81', fontSize: '0.68rem' }}>
            {t('live_lesson.companion_focus') || 'Focused moderation'}
          </strong>
          <p style={{ margin: '0.2rem 0 0', color: '#4338ca', fontSize: '0.58rem', lineHeight: 1.35 }}>
            {t('live_lesson.companion_focus_hint') || 'Status cohorts and moderation counts stay here; reviewing responses opens the existing activity owner.'}
          </p>
          {steps.length > 0 && focusItem && (
            <label style={{ display: 'block', marginTop: 5, color: '#312e81', fontSize: '0.6rem', fontWeight: 900 }}>
              {t('live_lesson.follow_up_resource') || 'Follow-up resource'}
              <select
                value={focusItem.id}
                onChange={event => setSelectedStepId(event.target.value)}
                aria-label={t('live_lesson.companion_resource_aria') || 'Choose the resource to send from companion moderation'}
                style={{
                  display: 'block',
                  width: '100%',
                  minHeight: 36,
                  marginTop: 3,
                  border: '1px solid #a5b4fc',
                  borderRadius: 7,
                  background: 'white',
                  color: '#0f172a',
                  padding: '0.3rem',
                  fontFamily: 'inherit',
                  fontSize: '0.64rem',
                }}
              >
                {steps.map((item, index) => (
                  <option key={item.id} value={item.id}>
                    {index + 1}. {getTitle(item)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!companionModel.activity && (
            <p role="status" style={{ margin: '0.4rem 0 0', color: '#475569', fontSize: '0.61rem' }}>
              {t('live_lesson.companion_waiting') || 'No live activity yet. Start an interaction from the existing Live Session tools.'}
            </p>
          )}
        </section>
      )}

      {preparationOnly && (
        <details
          data-live-run-readiness={liveRunReadiness.status}
          data-live-run-readiness-privacy="resource-metadata-only"
          open={liveRunReadiness.status !== 'ready'}
          style={{
            marginTop: 7,
            padding: '0.42rem 0.48rem',
            border: '1px solid ' + liveRunReadinessTone.border,
            borderRadius: 8,
            background: liveRunReadinessTone.background,
          }}
        >
          <summary
            aria-label={`Run readiness: ${liveRunReadiness.label}. ${liveRunReadiness.stepCount} steps and ${liveRunReadiness.preparedCount} prepared interactions.`}
            style={{ color: liveRunReadinessTone.text, cursor: 'pointer', fontSize: '0.68rem', fontWeight: 900 }}
          >
            Run readiness: {liveRunReadiness.label}
            {' - '}{liveRunReadiness.stepCount} step{liveRunReadiness.stepCount === 1 ? '' : 's'}
            {' - '}{liveRunReadiness.preparedCount} interaction{liveRunReadiness.preparedCount === 1 ? '' : 's'}
          </summary>
          <div
            role="status"
            aria-live="polite"
            style={{ marginTop: 4, color: liveRunReadinessTone.text, fontSize: '0.59rem', lineHeight: 1.35 }}
          >
            This local check uses resource metadata and private preparation cues only. It does not read or write student responses.
          </div>
          <ul
            aria-label="Live run readiness checks"
            style={{ display: 'grid', gap: 4, margin: '0.42rem 0 0', padding: 0, listStyle: 'none' }}
          >
            {liveRunReadiness.checks.map(check => (
              <li
                key={check.id}
                data-live-run-readiness-check={check.status}
                style={{ padding: '0.32rem 0.38rem', border: '1px solid rgba(100, 116, 139, 0.24)', borderRadius: 6, background: 'rgba(255, 255, 255, 0.72)', color: '#334155', fontSize: '0.59rem', lineHeight: 1.35 }}
              >
                <strong style={{ color: '#0f172a' }}>
                  {liveLessonReadinessStatusLabel(check.status)}: {check.label}.
                </strong>{' '}
                {check.detail}
              </li>
            ))}
          </ul>
          {liveRunReadiness.issues.length > 0 && (
            <div style={{ marginTop: 5 }}>
              <strong style={{ color: liveRunReadinessTone.text, fontSize: '0.61rem' }}>
                Before class
              </strong>
              <ul
                aria-label="Readiness items to review"
                style={{ display: 'grid', gap: 3, margin: '0.28rem 0 0', paddingLeft: '1.05rem', color: liveRunReadinessTone.text, fontSize: '0.59rem', lineHeight: 1.35 }}
              >
                {liveRunReadiness.issues.map((issue, issueIndex) => (
                  <li key={issue.code + ':' + issue.stepIndex + ':' + issueIndex}>
                    <strong>{liveLessonReadinessStatusLabel(issue.status)}:</strong>{' '}
                    {issue.stepIndex >= 0 ? (
                      <button
                        type="button"
                        onClick={() => selectAt(issue.stepIndex)}
                        aria-label={'Review ' + issue.label}
                        style={{ border: 0, background: 'transparent', color: 'inherit', padding: 0, textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {issue.label}
                      </button>
                    ) : issue.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>
      )}

      {!preparationOnly && activityPulse && (
        <div
          aria-label={t('live_lesson.activity_pulse') || 'Activity pulse'}
          style={{
            marginTop: 7,
            padding: '0.55rem',
            border: '1px solid #a5b4fc',
            borderRadius: 9,
            background: '#eef2ff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden="true">●</span>
            <strong style={{ color: '#312e81', fontSize: '0.72rem' }}>
              {liveActivityKindLabel(activityPulse.kind)}
            </strong>
            <span
              style={{
                marginLeft: 'auto',
                borderRadius: 999,
                padding: '0.12rem 0.42rem',
                background: activityPulse.phase === 'collecting' ? '#dcfce7' : '#e0e7ff',
                color: activityPulse.phase === 'collecting' ? '#166534' : '#3730a3',
                fontSize: '0.6rem',
                fontWeight: 900,
              }}
            >
              {liveActivityPhaseLabel(activityPulse.phase)}
            </span>
          </div>
          <div
            role="status"
            aria-live="polite"
            style={{ marginTop: 5, color: '#4338ca', fontSize: '0.67rem', fontWeight: 800 }}
          >
            {activityPulse.counts.submitted} {t('common.of') || 'of'} {activityPulse.counts.invited}{' '}
            {t('live_lesson.submitted') || 'submitted'}
            {activityPulse.counts.revised > 0
              ? ` · ${activityPulse.counts.revised} ${t('live_lesson.revised') || 'revised'}`
              : ''}
            {activityPulse.counts.votesCast > 0
              ? ` / ${activityPulse.counts.votesCast} ${t('live_lesson.votes') || 'votes'}`
              : ''}
          </div>
          <div
            aria-hidden="true"
            style={{
              height: 6,
              marginTop: 4,
              overflow: 'hidden',
              borderRadius: 999,
              background: '#c7d2fe',
            }}
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${activityPulse.counts.invited
                  ? Math.min(100, Math.round((activityPulse.counts.submitted / activityPulse.counts.invited) * 100))
                  : 0}%`,
                background: '#4f46e5',
              }}
            />
          </div>
          {typeof onOpenActivity === 'function'
            && activityPulse.phase !== 'closed'
            && activityPulse.phase !== 'revealed' && (
            <button
              type="button"
              onClick={() => onOpenActivity(activityPulse)}
              style={{ ...buttonBase, width: '100%', marginTop: 6, borderColor: '#6366f1', color: '#3730a3' }}
            >
              {t('live_lesson.open_activity_dashboard') || 'Open activity dashboard'}
            </button>
          )}

          <p style={{ margin: '0.45rem 0 0', color: '#6366f1', fontSize: '0.59rem', lineHeight: 1.35 }}>
            {t('live_lesson.activity_pulse_privacy') || 'Status and counts only; student responses remain in the activity owner.'}
          </p>
        </div>
      )}

      {companionActive && companionModel.activity && companionModel.statusCohorts.length > 0 && (
        <section
          aria-label={t('live_lesson.activity_status_cohorts') || 'Activity status cohorts'}
          data-live-companion-cohorts={companionModel.activity.activityId}
          style={{
            marginTop: 7,
            padding: '0.5rem',
            border: '1px solid #c4b5fd',
            borderRadius: 9,
            background: '#faf5ff',
          }}
        >
          <div style={{ color: '#5b21b6', fontSize: '0.65rem', fontWeight: 900 }}>
            {t('live_lesson.activity_status_cohorts') || 'Activity cohorts'}
          </div>
          <div role="group" aria-label={t('live_lesson.select_activity_cohort') || 'Select an activity cohort for follow-up'} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 5 }}>
            {companionModel.statusCohorts.map(cohort => {
              const selectedForStatus = companionSelection.activityId === currentCompanionActivityId
                && Array.isArray(companionSelection.byStatus?.[cohort.status])
                ? companionSelection.byStatus[cohort.status]
                : [];
              const selected = cohort.uids.length > 0 && cohort.uids.every(uid => selectedForStatus.includes(uid));
              return (
                <button
                  key={cohort.status}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleCompanionStatusCohort(cohort)}
                  style={{
                    minHeight: 42,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                    border: '1px solid ' + (selected ? '#7c3aed' : '#c4b5fd'),
                    borderRadius: 7,
                    background: selected ? '#ede9fe' : 'white',
                    color: '#4c1d95',
                    padding: '0.3rem 0.4rem',
                    fontFamily: 'inherit',
                    fontSize: '0.6rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  <span>{cohort.label}</span>
                  <span>{cohort.count}</span>
                </button>
              );
            })}
          </div>
          {Object.entries(companionModel.moderation).some(([, count]) => count > 0) && (
            <div aria-label={t('live_lesson.moderation_counts') || 'Moderation counts'} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
              {Object.entries(companionModel.moderation)
                .filter(([, count]) => count > 0)
                .map(([key, count]) => (
                  <span key={key} style={{ borderRadius: 999, background: '#ede9fe', color: '#5b21b6', padding: '0.15rem 0.36rem', fontSize: '0.55rem', fontWeight: 900 }}>
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()} {count}
                  </span>
                ))}
            </div>
          )}
          <p style={{ margin: '0.4rem 0 0', color: '#6d28d9', fontSize: '0.56rem', lineHeight: 1.3 }}>
            {t('live_lesson.companion_selection_hint') || 'Select a cohort, then use the existing resource sender below. Larger cohorts are delivered automatically in privacy-safe batches of 25.'}
          </p>
          {attentionQueue.length === 0 && (
            <>
              <button
                type="button"
                disabled={!focusItem || validSelectedUids.length === 0 || attentionSending || attentionReleasing || !!attentionSendingUid}
                onClick={sendAttentionSelection}
                aria-label={'Send ' + (attentionResourceTitle || 'selected lesson step') + ' to ' + validSelectedUids.length + ' selected student' + (validSelectedUids.length === 1 ? '' : 's')}
                style={{
                  ...(focusItem && validSelectedUids.length > 0 && !attentionSending && !attentionReleasing && !attentionSendingUid ? buttonBase : disabledButton),
                  width: '100%',
                  marginTop: 6,
                  borderColor: '#7c3aed',
                  background: focusItem && validSelectedUids.length > 0 && !attentionSending && !attentionReleasing && !attentionSendingUid ? '#7c3aed' : '#f8fafc',
                  color: focusItem && validSelectedUids.length > 0 && !attentionSending && !attentionReleasing && !attentionSendingUid ? 'white' : '#94a3b8',
                }}
              >
                {attentionSending
                  ? (t('common.sending') || 'Sending...')
                  : (t('live_lesson.send_selected_resource') || 'Send selected resource') + ' (' + validSelectedUids.length + ')'}
              </button>
              {attentionSendStatus && (
                <p role="status" aria-live="polite" style={{ margin: '0.35rem 0 0', color: '#5b21b6', fontSize: '0.61rem' }}>
                  {attentionSendStatus}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {!preparationOnly && Object.keys(roster).length > 0 && (
        <section
          aria-label={t('live_lesson.attention_queue') || 'Teacher attention queue'}
          style={{
            marginTop: 7,
            padding: '0.55rem',
            border: '1px solid ' + (attentionQueue.length ? '#fbbf24' : '#86efac'),
            borderRadius: 9,
            background: attentionQueue.length ? '#fffbeb' : '#f0fdf4',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden="true">{attentionQueue.length ? '!' : 'OK'}</span>
            <strong style={{ color: attentionQueue.length ? '#92400e' : '#166534', fontSize: '0.72rem' }}>
              {t('live_lesson.needs_attention') || 'Needs attention'}
            </strong>
            <span style={{ marginLeft: 'auto', fontSize: '0.62rem', fontWeight: 900, color: attentionQueue.length ? '#92400e' : '#166534' }}>
              {attentionQueue.length}
            </span>
          </div>
          {attentionQueue.length === 0 ? (
            <p role="status" style={{ margin: '0.35rem 0 0', color: '#166534', fontSize: '0.64rem' }}>
              {t('live_lesson.no_attention_signals') || 'No immediate attention signals.'}
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                <span style={{ color: '#78350f', fontSize: '0.6rem' }}>
                  {t('live_lesson.attention_ranked_hint') || 'Ranked from signals, presence, activity status, and delivery.'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const queueUids = attentionQueue.map(item => item.uid);
                    const allQueueSelected = queueUids.every(uid => validAttentionSelectedUids.includes(uid));
                    setAttentionSelectedUids(current => allQueueSelected
                      ? current.filter(uid => !queueUids.includes(uid))
                      : Array.from(new Set(current.concat(queueUids))).slice(0, companionActive ? 25 : 12));
                  }}
                  style={{ border: 'none', background: 'transparent', color: '#92400e', padding: 2, fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}
                >
                  {attentionQueue.every(item => validAttentionSelectedUids.includes(item.uid))
                    ? (t('common.clear') || 'Clear')
                    : (t('common.select_all') || 'Select all')}
                </button>
              </div>
              {focusItem && (
                <div
                  data-live-attention-resource="selected"
                  title={attentionResourceTitle}
                  style={{
                    display: 'flex',
                    gap: 4,
                    marginTop: 5,
                    padding: '0.35rem 0.42rem',
                    borderRadius: 7,
                    background: '#fff7ed',
                    color: '#78350f',
                    fontSize: '0.61rem',
                    lineHeight: 1.35,
                  }}
                >
                  <strong style={{ flex: '0 0 auto' }}>
                    {t('live_lesson.follow_up_resource') || 'Follow-up resource'}:
                  </strong>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {attentionResourceTitle}
                  </span>
                </div>
              )}
              {attentionCohorts.length > 0 && (
                <details
                  data-live-attention-cohorts="teacher-memory-only"
                  style={{ marginTop: 5, padding: '0.32rem 0.38rem', border: '1px solid #fcd34d', borderRadius: 7, background: '#fefce8' }}
                >
                  <summary style={{ minHeight: 36, display: 'flex', alignItems: 'center', color: '#854d0e', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 900 }}>
                    {t('live_lesson.group_patterns') || 'Group patterns'} ({attentionCohorts.length})
                  </summary>
                  <p style={{ margin: '0 0 0.35rem', color: '#854d0e', fontSize: '0.57rem', lineHeight: 1.35 }}>
                    {t('live_lesson.group_patterns_hint') || 'Shared instructional signals only. Selects flagged students; use Audience below for the whole group.'}
                  </p>
                  <div role="group" aria-label={t('live_lesson.group_patterns') || 'Group patterns'} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {attentionCohorts.map(cohort => {
                      const group = groups[cohort.groupId] || {};
                      const groupName = String(group.name || (t('common.group') || 'Group'));
                      const cohortSelected = cohort.uids.every(uid => validAttentionSelectedUids.includes(uid));
                      const reason = liveAttentionReasonLabel(cohort.topReasonCodes[0]);
                      return (
                        <button
                          key={cohort.groupId}
                          type="button"
                          aria-pressed={cohortSelected}
                          aria-label={(cohortSelected ? 'Clear ' : 'Select ') + cohort.count + ' flagged students in ' + groupName + (attentionResourceTitle ? ' for ' + attentionResourceTitle : '')}
                          onClick={() => toggleAttentionCohort(cohort)}
                          style={{
                            minHeight: 44,
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                            alignItems: 'center',
                            gap: 6,
                            width: '100%',
                            border: '1px solid ' + (cohortSelected ? '#d97706' : '#fcd34d'),
                            borderRadius: 7,
                            background: cohortSelected ? '#ffedd5' : 'white',
                            color: '#78350f',
                            padding: '0.32rem 0.42rem',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.62rem', fontWeight: 900 }}>{groupName}</span>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.56rem' }}>{reason}</span>
                          </span>
                          <span style={{ fontSize: '0.58rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                            {cohortSelected ? (t('common.selected') || 'Selected') : ('Select ' + cohort.count)} ? {cohort.count}/{cohort.memberCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </details>
              )}
              <div role="group" aria-label={t('live_lesson.students_needing_attention') || 'Students needing attention'} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, maxHeight: 190, overflowY: 'auto' }}>
                {attentionQueue.map(item => {
                  const entry = roster[item.uid] || {};
                  const name = String(entry.name || 'Student');
                  const selected = validAttentionSelectedUids.includes(item.uid);
                  const sendingThisStudent = attentionSendingUid === item.uid;
                  const evidenceSources = (Array.isArray(item.evidenceSources) ? item.evidenceSources : [])
                    .filter(source => Object.prototype.hasOwnProperty.call(LIVE_ATTENTION_SOURCE_LABELS, source));
                  return (
                    <div
                      key={item.uid}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                        alignItems: 'center',
                        gap: 5,
                        padding: '0.32rem 0.4rem',
                        borderRadius: 7,
                        background: 'white',
                        border: '1px solid #fde68a',
                        fontSize: '0.63rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleAttentionSelection(item.uid)}
                        aria-label={'Select ' + name + (attentionResourceTitle ? ' for ' + attentionResourceTitle : ' for a resource send')}
                        style={{ width: 18, height: 18 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </div>
                        <div style={{ color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {liveAttentionReasonLabel(item.reasons[0])}
                          {item.reasons.length > 1 ? ` +${item.reasons.length - 1}` : ''}
                        </div>
                        {evidenceSources.length > 0 && (
                          <div
                            data-live-attention-provenance="status-metadata-only"
                            aria-label={'Evidence sources: ' + evidenceSources.map(liveAttentionSourceLabel).join(', ')}
                            style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}
                          >
                            {evidenceSources.map(source => (
                              <span key={source} style={{ border: '1px solid #d6d3d1', borderRadius: 999, background: '#fafaf9', color: '#57534e', padding: '0.05rem 0.3rem', fontSize: '0.5rem', fontWeight: 800 }}>
                                {liveAttentionSourceLabel(source)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {focusItem && typeof onSendToStudent === 'function' && (
                        <button
                          type="button"
                          disabled={attentionSending || attentionReleasing || !!attentionSendingUid}
                          onClick={() => sendAttentionStudent(item.uid)}
                          aria-label={'Send ' + (attentionResourceTitle || (t('live_lesson.selected_step') || 'selected step')) + ' to ' + name}
                          style={{ minHeight: 36, border: '1px solid #f59e0b', borderRadius: 6, background: '#fff7ed', color: '#92400e', padding: '0.2rem 0.35rem', fontFamily: 'inherit', fontSize: '0.58rem', fontWeight: 900, cursor: attentionSending || attentionReleasing || attentionSendingUid ? 'not-allowed' : 'pointer', opacity: attentionSending || attentionReleasing || attentionSendingUid ? 0.65 : 1 }}
                        >
                          {sendingThisStudent
                            ? (t('common.sending') || 'Sending...')
                            : (t('live_lesson.send_selected_step') || 'Send step')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={!focusItem || validSelectedUids.length === 0 || attentionSending || attentionReleasing || !!attentionSendingUid}
                onClick={sendAttentionSelection}
                aria-label={'Send ' + (attentionResourceTitle || 'selected lesson step') + ' to ' + validSelectedUids.length + ' selected student' + (validSelectedUids.length === 1 ? '' : 's')}
                style={{
                  ...(focusItem && validSelectedUids.length > 0 && !attentionSending && !attentionReleasing && !attentionSendingUid ? buttonBase : disabledButton),
                  width: '100%',
                  marginTop: 6,
                  borderColor: '#d97706',
                  background: focusItem && validSelectedUids.length > 0 && !attentionSending && !attentionReleasing && !attentionSendingUid ? '#d97706' : '#f8fafc',
                  color: focusItem && validSelectedUids.length > 0 && !attentionSending && !attentionReleasing && !attentionSendingUid ? 'white' : '#94a3b8',
                }}
              >
                {attentionSending
                  ? (t('common.sending') || 'Sending...')
                  : (t('live_lesson.send_selected_resource') || 'Send selected resource') + ' (' + validSelectedUids.length + ')'}
              </button>
              {attentionSendStatus && (
                <p role="status" aria-live="polite" style={{ margin: '0.35rem 0 0', color: '#78350f', fontSize: '0.61rem' }}>
                  {attentionSendStatus}
                </p>
              )}
            </>
          )}
          {acknowledgedResourceOverrideUids.length > 0
            && typeof onReleaseStudentResources === 'function' && (
            <div
              data-live-resource-release="acknowledged-only"
              style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #d6d3d1' }}
            >
              <p style={{ margin: 0, color: '#57534e', fontSize: '0.59rem', lineHeight: 1.35 }}>
                {acknowledgedResourceOverrideUids.length} {t('live_lesson.opened_supports_waiting') || 'opened individual support'}{acknowledgedResourceOverrideUids.length === 1 ? '' : 's'} {t('live_lesson.opened_supports_waiting_suffix') || 'can return to group or class pacing.'}
              </p>
              <button
                type="button"
                disabled={attentionReleasing || attentionSending || !!attentionSendingUid}
                onClick={releaseAcknowledgedResources}
                aria-label={'Release ' + acknowledgedResourceOverrideUids.length + ' opened individual support override' + (acknowledgedResourceOverrideUids.length === 1 ? '' : 's')}
                style={{ ...buttonBase, width: '100%', minHeight: 34, marginTop: 4, borderColor: '#78716c', color: '#44403c', opacity: attentionReleasing || attentionSending || attentionSendingUid ? 0.65 : 1 }}
              >
                {attentionReleasing
                  ? (t('common.releasing') || 'Releasing...')
                  : (t('live_lesson.release_opened_supports') || 'Release opened supports') + ' (' + acknowledgedResourceOverrideUids.length + ')'}
              </button>
              {attentionReleaseStatus && (
                <p role="status" aria-live="polite" style={{ margin: '0.3rem 0 0', color: '#57534e', fontSize: '0.59rem' }}>
                  {attentionReleaseStatus}
                </p>
              )}
            </div>
          )}
          <p style={{ margin: '0.4rem 0 0', color: '#78716c', fontSize: '0.57rem', lineHeight: 1.3 }}>
            {t('live_lesson.attention_privacy') || 'Uses status metadata only; no response content is copied into this queue.'}
          </p>
        </section>
      )}

      {!preparationOnly && classDebrief.length > 0 && (
        <details
          data-live-class-debrief="derived-status-only"
          aria-label={t('live_lesson.class_debrief') || 'Class debrief'}
          style={{ marginTop: 7, padding: '0.5rem', border: '1px solid #a5b4fc', borderRadius: 9, background: '#f5f3ff' }}
        >
          <summary style={{ minHeight: 36, display: 'flex', alignItems: 'center', color: '#4338ca', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900 }}>
            {t('live_lesson.class_debrief') || 'Class debrief'} ({classDebrief.length})
          </summary>
          <p style={{ margin: '0 0 0.4rem', color: '#5b21b6', fontSize: '0.58rem', lineHeight: 1.35 }}>
            {t('live_lesson.class_debrief_hint') || 'Derived from participation, moderation, and revision statuses. It does not infer correctness or misconceptions.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {classDebrief.map(finding => {
              const tone = ({
                review: { border: '#fbbf24', background: '#fffbeb', text: '#92400e' },
                support: { border: '#c4b5fd', background: '#faf5ff', text: '#6d28d9' },
                ready: { border: '#86efac', background: '#f0fdf4', text: '#166534' },
              })[finding.tone] || { border: '#cbd5e1', background: 'white', text: '#334155' };
              const currentTargetCount = finding.uids.filter(uid => Object.prototype.hasOwnProperty.call(roster, uid)).length;
              const activityItem = activityTimeline.find(item => item.activityId === finding.activityId) || finding;
              const canSend = currentTargetCount > 0
                && !!focusItem
                && (typeof onSendToStudents === 'function' || typeof onSendToStudent === 'function');
              return (
                <article key={finding.id} data-live-debrief-kind={finding.kind} style={{ border: '1px solid ' + tone.border, borderRadius: 8, background: tone.background, padding: '0.42rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <strong style={{ color: tone.text, fontSize: '0.64rem' }}>{finding.label}</strong>
                    <span style={{ marginLeft: 'auto', color: tone.text, fontSize: '0.56rem', fontWeight: 900 }}>{liveActivityKindLabel(finding.activityKind)}</span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', color: tone.text, fontSize: '0.58rem', lineHeight: 1.35 }}>{finding.detail}</p>
                  {(canSend || (finding.canOpenActivity && typeof onOpenActivity === 'function')) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                      {finding.canOpenActivity && typeof onOpenActivity === 'function' && (
                        <button type="button" onClick={() => onOpenActivity(activityItem)} aria-label={'Open ' + liveActivityKindLabel(finding.activityKind) + ' review from class debrief'} style={{ ...buttonBase, minHeight: 34, borderColor: tone.border, color: tone.text, fontSize: '0.57rem' }}>
                          {t('live_lesson.open_review') || 'Open review'}
                        </button>
                      )}
                      {canSend && (
                        <button
                          type="button"
                          disabled={!!debriefSendingId}
                          onClick={() => sendDebriefFinding(finding)}
                          aria-label={'Send ' + attentionResourceTitle + ' to ' + currentTargetCount + ' debrief student' + (currentTargetCount === 1 ? '' : 's')}
                          style={{ ...buttonBase, minHeight: 34, borderColor: tone.border, background: 'white', color: tone.text, fontSize: '0.57rem', opacity: debriefSendingId ? 0.65 : 1 }}
                        >
                          {debriefSendingId === finding.id ? (t('common.sending') || 'Sending...') : (t('live_lesson.send_follow_up') || 'Send selected follow-up') + ' (' + currentTargetCount + ')'}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {debriefSendStatus && <p role="status" aria-live="polite" style={{ margin: '0.4rem 0 0', color: '#5b21b6', fontSize: '0.6rem' }}>{debriefSendStatus}</p>}
          <p style={{ margin: '0.4rem 0 0', color: '#6d28d9', fontSize: '0.55rem', lineHeight: 1.3 }}>
            {t('live_lesson.class_debrief_privacy') || 'Teacher-memory status only; no prompts, answers, feedback text, drawings, scores, or student labels are copied into this debrief.'}
          </p>
        </details>
      )}

      {!preparationOnly && activityTimeline.length > 0 && (
        <details
          aria-label={t('live_lesson.activity_timeline') || 'Activity timeline'}
          style={{ marginTop: 7, padding: '0.45rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: 9, background: '#f8fafc' }}
        >
          <summary style={{ color: '#334155', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 900 }}>
            {t('live_lesson.recent_activity') || 'Recent activity'} ({activityTimeline.length})
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 5 }}>
            {activityTimeline.map(item => {
              const duration = formatLiveActivityDuration(
                item.durationMs || (item.startedAt && item.updatedAt ? item.updatedAt - item.startedAt : 0)
              );
              return (
                <div key={item.activityId} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.38rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.61rem' }}>
                  <span style={{ minWidth: 0, flex: 1, color: '#0f172a', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {liveActivityKindLabel(item.kind)}
                  </span>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                    {item.counts.submitted}/{item.counts.invited}{item.counts.votesCast > 0 ? ` / ${item.counts.votesCast} ${t('live_lesson.votes') || 'votes'}` : ''}{duration ? ` · ${duration}` : ''}
                  </span>
                  <span style={{ color: '#475569', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {liveActivityPhaseLabel(item.phase)}
                  </span>
                  {typeof onOpenActivity === 'function'
                    && item.phase !== 'closed'
                    && item.phase !== 'revealed' && (
                    <button
                      type="button"
                      onClick={() => onOpenActivity(item)}
                      aria-label={`Open ${liveActivityKindLabel(item.kind)} dashboard`}
                      style={{ border: '1px solid #94a3b8', borderRadius: 5, background: '#f8fafc', color: '#334155', padding: '0.12rem 0.3rem', fontSize: '0.56rem', fontWeight: 900, cursor: 'pointer' }}
                    >
                      {t('common.open') || 'Open'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}

      {!companionActive && (steps.length === 0 ? (
        <p style={{ margin: '0.55rem 0 0', color: '#475569', fontSize: '0.7rem', lineHeight: 1.4 }}>
          {t('live_lesson.empty') || 'Add student-facing resources to this unit to build its live lesson path.'}
        </p>
      ) : (
        <>
          <div
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 7,
              padding: '0.48rem',
              borderRadius: 8,
              background: 'white',
              border: '1px solid #dbeafe',
            }}
          >
            <span
              aria-hidden="true"
              style={{ display: 'inline-flex', color: '#1d4ed8', flex: '0 0 auto' }}
            >
              {getIcon(focusItem.type)}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: '#0f172a',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {getTitle(focusItem)}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.62rem' }}>
                {focusIsCurrent
                  ? `${t('live_lesson.current_step') || 'Current step'} ${currentIndex + 1}`
                  : `${t('live_lesson.selected_step') || 'Selected step'} ${focusIndex + 1}`}
              </div>
            </div>
          </div>

          {nextItem && (
            <aside
              data-live-conductor-preview={preparationOnly ? 'rehearsal' : 'live'}
              data-live-conductor-content="metadata-only"
              aria-label={`${preparationOnly ? 'Rehearsal' : 'Live run'} up next, step ${nextIndex + 1}: ${nextItemTitle}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
                padding: '0.38rem 0.44rem',
                border: '1px solid #bae6fd',
                borderRadius: 8,
                background: '#f0f9ff',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#075985', fontSize: '0.57rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('live_lesson.up_next') || 'Up next'}
                </div>
                <div
                  title={nextItemTitle}
                  style={{ color: '#0f172a', fontSize: '0.66rem', fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {nextIndex + 1}. {nextItemTitle}
                </div>
                <div
                  aria-label={t('live_lesson.next_step_preparation') || 'Next step preparation'}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3, color: '#0369a1', fontSize: '0.55rem', fontWeight: 800 }}
                >
                  {nextHasPresenterCue && (
                    <span>{t('live_lesson.presenter_cue_ready') || 'Presenter cue ready'}</span>
                  )}
                  {nextCheckpointLabel && (
                    <span>{nextCheckpointLabel} {t('common.ready') || 'ready'}</span>
                  )}
                  {!nextHasPresenterCue && !nextCheckpointLabel && (
                    <span>{t('live_lesson.no_prepared_guidance') || 'No private cue or interaction prepared'}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => selectAt(nextIndex)}
                aria-label={(t('live_lesson.review_next_step') || 'Review next step') + ': ' + nextItemTitle}
                style={{ ...buttonBase, minHeight: 32, padding: '0.25rem 0.42rem', borderColor: '#7dd3fc', color: '#075985', fontSize: '0.59rem' }}
              >
                {t('common.review') || 'Review'}
              </button>
            </aside>
          )}


          <details
            data-live-presenter-cues="teacher-memory-only"
            style={{
              marginTop: 6,
              padding: '0.42rem 0.48rem',
              border: '1px solid #c4b5fd',
              borderRadius: 8,
              background: '#f5f3ff',
            }}
          >
            <summary style={{ color: '#5b21b6', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 900 }}>
              {t('live_lesson.presenter_cues') || 'Private presenter cues'}
              {hasPresenterCue ? ' · ' + (t('common.ready') || 'ready') : ''}
            </summary>
            <p style={{ margin: '0.35rem 0', color: '#6d28d9', fontSize: '0.59rem', lineHeight: 1.35 }}>
              {t('live_lesson.presenter_cues_privacy') || 'Teacher-only on this browser. These cues are not added to the resource or sent to students.'}
            </p>
            {[
              ['sayAsk', t('live_lesson.presenter_say_ask') || 'Say / ask', t('live_lesson.presenter_say_ask_placeholder') || 'Opening question, explanation, or discussion prompt…'],
              ['lookFor', t('live_lesson.presenter_look_for') || 'Look / listen for', t('live_lesson.presenter_look_for_placeholder') || 'Evidence of understanding, likely misconception, or access need…'],
              ['nextMove', t('live_lesson.presenter_next_move') || 'Next move', t('live_lesson.presenter_next_move_placeholder') || 'Transition, checkpoint, or differentiated follow-up…'],
            ].map(([field, label, placeholder]) => (
              <label key={field} style={{ display: 'block', marginTop: 5, color: '#4c1d95', fontSize: '0.61rem', fontWeight: 800 }}>
                {label}
                <textarea
                  value={presenterCue[field]}
                  maxLength={LIVE_PRESENTER_CUE_LIMITS[field]}
                  rows={field === 'sayAsk' ? 3 : 2}
                  disabled={typeof onChangePresenterCue !== 'function'}
                  onChange={event => updatePresenterCue(field, event.target.value)}
                  placeholder={placeholder}
                  aria-label={label + ' for ' + getTitle(focusItem)}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 2,
                    resize: 'vertical',
                    border: '1px solid #c4b5fd',
                    borderRadius: 6,
                    background: 'white',
                    color: '#0f172a',
                    padding: '0.35rem',
                    fontFamily: 'inherit',
                    fontSize: '0.64rem',
                    lineHeight: 1.35,
                  }}
                />
              </label>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 5 }}>
              <span style={{ color: '#7c3aed', fontSize: '0.56rem' }}>
                {t('live_lesson.presenter_cues_session_only') || 'Saved locally on this browser.'}
              </span>
              <button
                type="button"
                disabled={!hasPresenterCue || typeof onChangePresenterCue !== 'function'}
                onClick={clearPresenterCue}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: hasPresenterCue ? '#6d28d9' : '#a78bfa',
                  padding: 2,
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  cursor: hasPresenterCue ? 'pointer' : 'not-allowed',
                }}
              >
                {t('live_lesson.clear_cues') || 'Clear cues'}
              </button>
            </div>
          </details>

          <details
            data-live-prepared-checkpoint={preparedCheckpointLaunchBlocked ? 'invalid' : (hasPreparedCheckpoint ? 'ready' : 'empty')}
            style={{
              marginTop: 6,
              padding: '0.42rem 0.48rem',
              border: '1px solid #67e8f9',
              borderRadius: 8,
              background: '#ecfeff',
            }}
          >
            <summary style={{ color: '#155e75', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 900 }}>
              {t('live_lesson.prepared_checkpoint') || 'Prepared checkpoint'}
              {preparedCheckpointLaunchBlocked
                ? ' - ' + (t('common.needs_attention') || 'needs attention')
                : hasPreparedCheckpoint ? ' - ' + (t('common.ready') || 'ready') : ''}
            </summary>
            <p style={{ margin: '0.35rem 0', color: '#0e7490', fontSize: '0.59rem', lineHeight: 1.35 }}>
              {t('live_lesson.prepared_checkpoint_hint') || 'Attach an optional interaction to this step. It reuses the existing Live Polling, Sketch Response, or quiz owner and stays private until you launch it.'}
            </p>
            <label style={{ display: 'block', color: '#155e75', fontSize: '0.61rem', fontWeight: 800 }}>
              {t('live_lesson.checkpoint_type') || 'Checkpoint type'}
              <select
                value={preparedCheckpoint.kind}
                disabled={typeof onChangePresenterCue !== 'function'}
                onChange={event => {
                  const kind = event.target.value;
                  updatePreparedCheckpoint(kind ? { kind } : { kind: '', prompt: '', criteria: '' });
                }}
                aria-label={(t('live_lesson.checkpoint_type') || 'Checkpoint type') + ' for ' + getTitle(focusItem)}
                style={{ display: 'block', width: '100%', minHeight: 36, marginTop: 2, border: '1px solid #67e8f9', borderRadius: 6, background: 'white', color: '#0f172a', padding: '0.3rem', fontFamily: 'inherit', fontSize: '0.64rem' }}
              >
                <option value="">{t('live_lesson.no_checkpoint') || 'No checkpoint'}</option>
                <option value="quick_check">{t('live_dock.quick_check') || 'Quick check'}</option>
                <option value="word_cloud">{t('live_dock.word_cloud') || 'Word cloud'}</option>
                <option value="open_response">{t('live_lesson.open_response_vote') || 'Open response / peer showcase'}</option>
                <option value="feedback_response">{t('live_dock.feedback_response') || 'Feedback response + revision'}</option>
                <option value="sketch_response">{t('live_dock.sketch_response') || 'Sketch Response'}</option>
                {preparedCheckpointLaunchBlocked ? (
                  <option value="live_quiz" disabled>
                    {t('live_lesson.live_quiz_requires_quiz') || 'Live quiz - requires a quiz resource'}
                  </option>
                ) : focusItem && focusItem.type === 'quiz' ? (
                  <option value="live_quiz">{t('quiz.launch_live_btn') || 'Live quiz'}</option>
                ) : null}
              </select>
            </label>
            {hasPreparedCheckpoint && (
              <>
                {preparedCheckpoint.kind !== 'live_quiz' && (
                  <label style={{ display: 'block', marginTop: 5, color: '#155e75', fontSize: '0.61rem', fontWeight: 800 }}>
                    {t('common.prompt') || 'Prompt'}
                    <textarea
                      value={preparedCheckpoint.prompt}
                      maxLength={preparedCheckpoint.kind === 'sketch_response'
                        ? LIVE_PREPARED_CHECKPOINT_LIMITS.sketchPrompt
                        : LIVE_PREPARED_CHECKPOINT_LIMITS.prompt}
                      rows={3}
                      disabled={typeof onChangePresenterCue !== 'function'}
                      onChange={event => updatePreparedCheckpoint({ prompt: event.target.value })}
                      placeholder={preparedCheckpointPromptPlaceholder}
                      aria-label={(t('common.prompt') || 'Prompt') + ' for prepared checkpoint on ' + getTitle(focusItem)}
                      style={{ display: 'block', width: '100%', marginTop: 2, resize: 'vertical', border: '1px solid #67e8f9', borderRadius: 6, background: 'white', color: '#0f172a', padding: '0.35rem', fontFamily: 'inherit', fontSize: '0.64rem', lineHeight: 1.35 }}
                    />
                  </label>
                )}
                {(preparedCheckpoint.kind === 'feedback_response' || preparedCheckpoint.kind === 'sketch_response') && (
                  <label style={{ display: 'block', marginTop: 5, color: '#155e75', fontSize: '0.61rem', fontWeight: 800 }}>
                    {preparedCheckpoint.kind === 'sketch_response'
                      ? (t('live_lesson.success_criterion') || 'Success criterion')
                      : (t('live_lesson.feedback_criteria') || 'Feedback criteria')}
                    <textarea
                      value={preparedCheckpoint.criteria}
                      maxLength={preparedCheckpoint.kind === 'sketch_response'
                        ? LIVE_PREPARED_CHECKPOINT_LIMITS.sketchCriteria
                        : LIVE_PREPARED_CHECKPOINT_LIMITS.criteria}
                      rows={3}
                      disabled={typeof onChangePresenterCue !== 'function'}
                      onChange={event => updatePreparedCheckpoint({ criteria: event.target.value })}
                      placeholder={preparedCheckpoint.kind === 'sketch_response'
                        ? 'What should the sketch show clearly?'
                        : 'What should the response demonstrate?'}
                      aria-label={(preparedCheckpoint.kind === 'sketch_response'
                        ? (t('live_lesson.success_criterion') || 'Success criterion')
                        : (t('live_lesson.feedback_criteria') || 'Feedback criteria')) + ' for ' + getTitle(focusItem)}
                      style={{ display: 'block', width: '100%', marginTop: 2, resize: 'vertical', border: '1px solid #67e8f9', borderRadius: 6, background: 'white', color: '#0f172a', padding: '0.35rem', fontFamily: 'inherit', fontSize: '0.64rem', lineHeight: 1.35 }}
                    />
                  </label>
                )}
                <p style={{ margin: '0.35rem 0 0', color: '#0e7490', fontSize: '0.56rem', lineHeight: 1.35 }}>
                  {preparedCheckpoint.kind === 'feedback_response'
                    ? (t('live_lesson.prepared_feedback_audience_hint') || 'In a live session, this can use the selected class, group, or student audience. Follow-up resources still use the existing targeted send controls.')
                    : preparedCheckpoint.kind === 'sketch_response'
                      ? (t('live_lesson.prepared_sketch_hint') || 'Opens the existing private Sketch Response composer with this prompt and criterion. The selected class, group, or student is preselected.')
                      : preparedCheckpoint.kind === 'live_quiz'
                        ? (t('live_lesson.prepared_quiz_hint') || 'Restores this quiz and launches its existing live runner. Questions are not copied into the prepared checkpoint.')
                        : (t('live_lesson.prepared_class_hint') || 'Quick checks, word clouds, and open responses use the selected class, group, or student when launched. Activity Pulse can identify who needs a targeted follow-up resource.')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 5 }}>
                  <button
                    type="button"
                    onClick={clearPreparedCheckpoint}
                    disabled={typeof onChangePresenterCue !== 'function'}
                    style={{ border: 'none', background: 'transparent', color: '#0e7490', padding: 2, fontSize: '0.58rem', fontWeight: 900, cursor: 'pointer' }}
                  >
                    {t('live_lesson.remove_checkpoint') || 'Remove'}
                  </button>
                  {preparationOnly ? (
                    <span role="status" style={{ color: '#155e75', fontSize: '0.58rem', fontWeight: 800 }}>
                      {t('live_lesson.saved_for_session') || 'Saved for live session'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={launchPreparedCheckpoint}
                      disabled={preparedCheckpointLaunchBlocked || typeof onLaunchPreparedInteraction !== 'function'}
                      style={{ ...(preparedCheckpointLaunchBlocked ? disabledButton : buttonBase), minHeight: 32, borderColor: preparedCheckpointLaunchBlocked ? '#cbd5e1' : '#0891b2', background: preparedCheckpointLaunchBlocked ? '#f8fafc' : '#0891b2', color: preparedCheckpointLaunchBlocked ? '#64748b' : 'white', padding: '0.28rem 0.5rem', fontSize: '0.62rem' }}
                    >
                      {preparedCheckpointLaunchBlocked
                        ? (t('live_lesson.choose_quiz_resource') || 'Choose a quiz resource to launch')
                        : (t('live_lesson.review_launch_checkpoint') || 'Review and launch')}
                    </button>
                  )}
                </div>
              </>
            )}
          </details>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 6 }}>
            <button
              type="button"
              disabled={previousIndex < 0}
              onClick={() => selectAt(previousIndex)}
              style={previousIndex < 0 ? disabledButton : buttonBase}
              aria-label={t('live_lesson.previous') || 'Select previous lesson step'}
            >
              ← {t('common.previous') || 'Previous'}
            </button>
            <button
              type="button"
              disabled={nextIndex < 0}
              onClick={() => selectAt(nextIndex)}
              style={nextIndex < 0 ? disabledButton : buttonBase}
              aria-label={t('live_lesson.next') || 'Select next lesson step'}
            >
              {t('common.next') || 'Next'} →
            </button>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 6,
              color: '#334155',
              fontSize: '0.66rem',
              fontWeight: 700,
            }}
          >
            <span style={{ flex: '0 0 auto' }}>{t('live_lesson.jump') || 'Choose step'}</span>
            <select
              value={focusItem.id}
              onChange={event => setSelectedStepId(event.target.value)}
              aria-label={t('live_lesson.jump_aria') || 'Choose a lesson step'}
              style={{
                minWidth: 0,
                width: '100%',
                minHeight: 36,
                border: '1px solid #bfdbfe',
                borderRadius: 7,
                background: 'white',
                color: '#0f172a',
                padding: '0.3rem',
                fontFamily: 'inherit',
                fontSize: '0.68rem',
              }}
            >
              {steps.map((item, index) => (
                <option key={item.id} value={item.id}>
                  {index + 1}. {getTitle(item)}
                </option>
              ))}
            </select>
          </label>

          {!preparationOnly && (
            <>
          <div
            style={{
              marginTop: 7,
              padding: '0.45rem',
              borderRadius: 8,
              border: '1px solid #93c5fd',
              background: '#dbeafe',
            }}
          >
            <label style={{ color: '#1e3a8a', fontSize: '0.66rem', fontWeight: 800 }}>
              {t('live_lesson.audience') || 'Audience'}
              <select
                value={effectiveAudienceKey}
                onChange={event => setAudienceKey(event.target.value)}
                aria-label={t('live_lesson.audience_aria') || 'Choose who receives the selected lesson step'}
                style={{
                  width: '100%',
                  minHeight: 38,
                  marginTop: 3,
                  border: '1px solid #93c5fd',
                  borderRadius: 7,
                  background: 'white',
                  color: '#0f172a',
                  padding: '0.3rem',
                  fontFamily: 'inherit',
                  fontSize: '0.68rem',
                }}
              >
                {audiences.filter(audience => audience.kind === 'class').map(audience => (
                  <option key={audience.key} value={audience.key}>
                    {audience.label} ({audience.memberCount})
                  </option>
                ))}
                {audiences.some(audience => audience.kind === 'group') && (
                  <optgroup label={t('live_lesson.groups') || 'Groups'}>
                    {audiences.filter(audience => audience.kind === 'group').map(audience => (
                      <option key={audience.key} value={audience.key}>
                        {audience.label} ({audience.memberCount})
                      </option>
                    ))}
                  </optgroup>
                )}
                {audiences.some(audience => audience.kind === 'student') && (
                  <optgroup label={t('live_lesson.individual_students') || 'Individual students'}>
                    {audiences.filter(audience => audience.kind === 'student').map(audience => (
                      <option key={audience.key} value={audience.key}>
                        {audience.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            <button
              type="button"
              disabled={!actionAvailable}
              onClick={deliverFocused}
              style={{
                ...(actionAvailable ? buttonBase : disabledButton),
                width: '100%',
                marginTop: 5,
                borderColor: actionAvailable ? '#1d4ed8' : '#cbd5e1',
                background: actionAvailable ? '#1d4ed8' : '#f8fafc',
                color: actionAvailable ? 'white' : '#94a3b8',
              }}
            >
              {actionLabel}
            </button>
            <div
              role="status"
              aria-live="polite"
              style={{ marginTop: 4, color: '#475569', fontSize: '0.62rem', lineHeight: 1.35 }}
            >
              {delivery.total > 0
                ? `${delivery.viewing} ${t('common.of') || 'of'} ${delivery.total} ${t('live_lesson.viewing_step') || 'last reported on this step'}`
                : (t('live_lesson.no_connected_audience') || 'No connected students in this audience yet.')}
            </div>
          </div>

          <p style={{ margin: '0.45rem 0 0', color: '#475569', fontSize: '0.62rem', lineHeight: 1.35 }}>
            {selectedAudience && selectedAudience.kind !== 'class'
              ? (t('live_lesson.targeting_hint') || 'Specific sends reuse the existing priority: individual overrides group, and group overrides class.')
              : teacherPaced
                ? (t('live_lesson.teacher_paced_hint') || 'Teacher-paced: presenting follows this step on student screens.')
                : (t('live_lesson.student_paced_hint') || 'Student-paced: opening changes your view while students keep navigation control.')}
          </p>
            </>
          )}
        </>
      ))}
    </section>
  );
}
