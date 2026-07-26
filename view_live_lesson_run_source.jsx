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
    if (target.resourceId && target.assignedAt && entry.viewingResourceId !== target.resourceId) {
      const viewingAt = boundedLiveActivityCount(entry.viewingAt, Number.MAX_SAFE_INTEGER);
      const assignmentAcknowledged = viewingAt >= target.assignedAt;
      const assignmentIsLate = now - target.assignedAt >= LIVE_ATTENTION_RESOURCE_GRACE_MS;
      // Only explicit individual/group sends have an assignment timestamp.
      // This avoids flagging an entire teacher-paced class during an ordinary
      // step transition, and avoids re-flagging a consumed one-time push after
      // the student later navigates elsewhere.
      if (!assignmentAcknowledged && assignmentIsLate) {
        addReason(entry.viewingResourceId ? 'resource_elsewhere' : 'resource_unopened', entry.viewingResourceId ? 52 : 62);
      }
    }

    if (reasons.length === 0) return;
    reasons.sort((a, b) => b.weight - a.weight);
    queue.push({
      uid,
      score: reasons.reduce((sum, reason) => sum + reason.weight, 0),
      reasons: reasons.map(reason => reason.code),
      activityStatus: LIVE_ACTIVITY_PARTICIPANT_STATUSES.has(activityStatus) ? activityStatus : null,
      targetResourceId: target.resourceId,
    });
  });

  return queue
    .sort((a, b) => b.score - a.score || a.uid.localeCompare(b.uid))
    .slice(0, 12);
}

function liveAttentionReasonLabel(code) {
  return ({
    signal_stuck: 'asked for help',
    signal_repeat: 'needs that repeated',
    signal_slow: 'needs more time',
    presence_disconnected: 'connection may be lost',
    presence_quiet: 'connection quiet',
    activity_waiting: 'awaiting activity response',
    activity_working_long: 'working for a while',
    resource_unopened: 'assigned resource not opened',
    resource_elsewhere: 'on a different resource',
  })[code] || 'needs attention';
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
    const hasAnyWork = records.some(record => record !== null && record !== undefined)
      || hasCurrentAnswer;

    participantStatus[uid] = completion || (questionIsLive && hasCurrentAnswer)
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
    activitySnapshots = [],
    onOpenActivity,
    now = Date.now(),
    signalFreshMs = LIVE_ATTENTION_SIGNAL_FRESH_MS,
    t = key => key,
  } = props || {};

  const [selectedStepId, setSelectedStepId] = React.useState(null);
  const [audienceKey, setAudienceKey] = React.useState('class');
  const [attentionSelectedUids, setAttentionSelectedUids] = React.useState([]);
  const [attentionSending, setAttentionSending] = React.useState(false);
  const [attentionSendStatus, setAttentionSendStatus] = React.useState('');
  const steps = React.useMemo(
    () => buildLiveLessonSteps(history, getStudentSafeResources),
    [history, getStudentSafeResources]
  );
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

  const activityPulse = selectLiveActivityPulse(activitySnapshots);
  const attentionQueue = React.useMemo(() => buildLiveAttentionQueue({
    roster,
    groups,
    activitySnapshots,
    currentResourceId,
    sessionMode,
    now,
    signalFreshMs,
  }), [roster, groups, activitySnapshots, currentResourceId, sessionMode, now, signalFreshMs]);
  const activityTimeline = React.useMemo(
    () => buildLiveActivityTimeline(activitySnapshots, 8),
    [activitySnapshots]
  );
  const attentionUidSet = new Set(attentionQueue.map(item => item.uid));
  const validAttentionSelectedUids = attentionSelectedUids.filter(uid => attentionUidSet.has(uid));

  const toggleAttentionSelection = uid => {
    setAttentionSendStatus('');
    setAttentionSelectedUids(current => current.includes(uid)
      ? current.filter(item => item !== uid)
      : current.concat([uid]).slice(0, 12));
  };

  const sendAttentionSelection = async () => {
    if (!focusItem || validAttentionSelectedUids.length === 0 || attentionSending) return;
    setAttentionSending(true);
    setAttentionSendStatus('');
    try {
      if (typeof onSendToStudents === 'function') {
        const result = await onSendToStudents(validAttentionSelectedUids, focusItem);
        const sent = result && Number.isFinite(Number(result.sent))
          ? Number(result.sent)
          : validAttentionSelectedUids.length;
        const failed = result && Number.isFinite(Number(result.failed)) ? Number(result.failed) : 0;
        setAttentionSendStatus(failed > 0
          ? `${sent} sent; ${failed} could not be sent.`
          : `Sent to ${sent} student${sent === 1 ? '' : 's'}.`);
      } else if (typeof onSendToStudent === 'function') {
        await Promise.all(validAttentionSelectedUids.map(uid => onSendToStudent(uid, focusItem)));
        setAttentionSendStatus(`Sent to ${validAttentionSelectedUids.length} student${validAttentionSelectedUids.length === 1 ? '' : 's'}.`);
      }
      setAttentionSelectedUids([]);
    } catch (error) {
      setAttentionSendStatus('Could not send that resource. Please try again.');
    } finally {
      setAttentionSending(false);
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
      aria-label={t('live_lesson.title') || 'Lesson path'}
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
          {t('live_lesson.title') || 'Lesson path'}
        </strong>
        <span
          style={{
            marginLeft: 'auto',
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

      {activeUnitLabel && (
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

      {activityPulse && (
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

      {Object.keys(roster).length > 0 && (
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
                  onClick={() => setAttentionSelectedUids(
                    validAttentionSelectedUids.length === attentionQueue.length
                      ? []
                      : attentionQueue.map(item => item.uid)
                  )}
                  style={{ border: 'none', background: 'transparent', color: '#92400e', padding: 2, fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}
                >
                  {validAttentionSelectedUids.length === attentionQueue.length
                    ? (t('common.clear') || 'Clear')
                    : (t('common.select_all') || 'Select all')}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, maxHeight: 190, overflowY: 'auto' }}>
                {attentionQueue.map(item => {
                  const entry = roster[item.uid] || {};
                  const name = String(entry.name || 'Student');
                  const selected = validAttentionSelectedUids.includes(item.uid);
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
                        aria-label={`Select ${name} for a resource send`}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </div>
                        <div style={{ color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {liveAttentionReasonLabel(item.reasons[0])}
                          {item.reasons.length > 1 ? ` +${item.reasons.length - 1}` : ''}
                        </div>
                      </div>
                      {focusItem && typeof onSendToStudent === 'function' && (
                        <button
                          type="button"
                          onClick={() => onSendToStudent(item.uid, focusItem)}
                          aria-label={`${t('live_lesson.send_selected_step_to') || 'Send selected step to'} ${name}`}
                          style={{ border: '1px solid #f59e0b', borderRadius: 6, background: '#fff7ed', color: '#92400e', padding: '0.2rem 0.35rem', fontFamily: 'inherit', fontSize: '0.58rem', fontWeight: 900, cursor: 'pointer' }}
                        >
                          {t('live_lesson.send_selected_step') || 'Send step'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={!focusItem || validAttentionSelectedUids.length === 0 || attentionSending}
                onClick={sendAttentionSelection}
                aria-label={`Send selected lesson step to ${validAttentionSelectedUids.length} student${validAttentionSelectedUids.length === 1 ? '' : 's'}`}
                style={{
                  ...(focusItem && validAttentionSelectedUids.length > 0 && !attentionSending ? buttonBase : disabledButton),
                  width: '100%',
                  marginTop: 6,
                  borderColor: '#d97706',
                  background: focusItem && validAttentionSelectedUids.length > 0 && !attentionSending ? '#d97706' : '#f8fafc',
                  color: focusItem && validAttentionSelectedUids.length > 0 && !attentionSending ? 'white' : '#94a3b8',
                }}
              >
                {attentionSending
                  ? (t('common.sending') || 'Sending...')
                  : `${t('live_lesson.send_selected_step') || 'Send step'} (${validAttentionSelectedUids.length})`}
              </button>
              {attentionSendStatus && (
                <p role="status" aria-live="polite" style={{ margin: '0.35rem 0 0', color: '#78350f', fontSize: '0.61rem' }}>
                  {attentionSendStatus}
                </p>
              )}
            </>
          )}
          <p style={{ margin: '0.4rem 0 0', color: '#78716c', fontSize: '0.57rem', lineHeight: 1.3 }}>
            {t('live_lesson.attention_privacy') || 'Uses status metadata only; no response content is copied into this queue.'}
          </p>
        </section>
      )}

      {activityTimeline.length > 0 && (
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
                  {typeof onOpenActivity === 'function' && item.phase !== 'closed' && (
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

      {steps.length === 0 ? (
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
    </section>
  );
}
