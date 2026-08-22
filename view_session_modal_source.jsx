/**
 * AlloFlow — Session Modal Module
 *
 * Live session status modal: shows the session code (large + copyable),
 * the host's app ID (copyable), the groups manager entry, the sync/async
 * mode toggle, and Close / End Session actions.
 *
 * Extracted from AlloFlowANTI.txt lines 20205-20304 (May 2026).
 *
 * Required props:
 *   activeSessionAppId               — alternate session host app ID
 *   activeSessionCode                — 5-character live session code
 *   addToast                         — toast helper
 *   appId                            — current app ID
 *   copyToClipboard                  — clipboard helper (also fires a toast)
 *   db                               — Firestore db handle
 *   deleteDoc                        — Firestore deleteDoc primitive
 *   doc                              — Firestore doc primitive
 *   handleSetShowGroupModalToTrue    — open the groups manager
 *   handleSetShowSessionModalToFalse — close this modal
 *   isMailboxSession               — whether this uses the mailbox transport
 *   mailboxJoinUrl                 — capability-bearing mailbox student URL
 *   onEndMailboxSession            — mailbox teardown callback
 *   sessionData                      — current session state (mode + roster)
 *   setActiveSessionCode             — clears session code on end
 *   setConfirmDialog                 — shows confirm dialog for "end session"
 *   setSessionData                   — clears session data on end
 *   setShowSessionModal              — direct setter (used in end-session flow)
 *   t                                — translation function
 *   toggleSessionMode                — toggles sync vs async student pacing
 *   warnLog                          — debug logger
 *
 * Icons (from window globals): Wifi, X, Copy, Users, ChevronRight, XCircle
 */

// Privacy-safe end-session aggregation lives with the lazy session-management
// surface so ordinary app startup does not parse code used only while ending a
// live class. These helpers are intentionally pure: no React state, browser
// storage, network calls, transient UIDs, or raw learner work cross the API.
const normalizeRosterSessionCodename = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const countValidRosterQuizResponses = (responseMap) => Object.entries(
  responseMap && typeof responseMap === 'object' && !Array.isArray(responseMap) ? responseMap : {}
).filter(([key, record]) => {
  if (!/^(0|[1-9]\d{0,3})$/.test(String(key)) || Number(key) > 9999) return false;
  const itemType = record && typeof record === 'object' && !Array.isArray(record)
    ? String(record.itemType || '')
    : '';
  return itemType !== 'assessment-complete' && itemType !== 'reflection';
}).length;

const summarizeRosterLiveActivities = (activitySnapshots, liveRoster, rosterByNormalizedName) => {
  const allowedKinds = new Set(['rating', 'multiple_choice', 'free_text', 'word_cloud', 'feedback_response', 'pictionary', 'sketch_response', 'session_qa', 'quiz']);
  const allowedPhases = new Set(['collecting', 'paused', 'review', 'revealed', 'closed']);
  const roster = liveRoster && typeof liveRoster === 'object' ? liveRoster : {};
  const byName = rosterByNormalizedName && typeof rosterByNormalizedName === 'object' ? rosterByNormalizedName : {};
  const participantTotals = {};
  const activities = [];
  const clampCount = (value, max = 10000) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(max, Math.floor(parsed))) : 0;
  };
  (Array.isArray(activitySnapshots) ? activitySnapshots : []).slice(-60).forEach(snapshot => {
    if (!snapshot || typeof snapshot !== 'object' || !allowedKinds.has(snapshot.kind)) return;
    const audienceUids = Array.from(new Set((Array.isArray(snapshot.audienceUids) ? snapshot.audienceUids : []).map(String).filter(Boolean))).slice(0, 250);
    const statuses = snapshot.participantStatus && typeof snapshot.participantStatus === 'object' ? snapshot.participantStatus : {};
    let submitted = 0;
    let revised = 0;
    audienceUids.forEach(uid => {
      const status = statuses[uid] === 'revised'
        ? 'revised'
        : statuses[uid] === 'submitted'
          ? 'submitted'
          : statuses[uid] === 'working'
            ? 'working'
            : 'waiting';
      if (status === 'submitted' || status === 'revised') submitted += 1;
      if (status === 'revised') revised += 1;
      const liveName = String(roster[uid]?.name || '').trim();
      const rosterName = byName[normalizeRosterSessionCodename(liveName)];
      if (!rosterName) return;
      const current = participantTotals[rosterName] || { liveActivityCount: 0, liveSubmissionCount: 0, liveRevisionCount: 0 };
      current.liveActivityCount += 1;
      if (status === 'submitted' || status === 'revised') current.liveSubmissionCount += 1;
      if (status === 'revised') current.liveRevisionCount += 1;
      participantTotals[rosterName] = current;
    });
    const counts = snapshot.counts && typeof snapshot.counts === 'object' ? snapshot.counts : {};
    activities.push({
      kind: snapshot.kind,
      phase: allowedPhases.has(snapshot.phase) ? snapshot.phase : 'closed',
      invited: audienceUids.length,
      submitted,
      revised,
      approved: clampCount(counts.approved),
      hidden: clampCount(counts.hidden),
      revealed: clampCount(counts.revealed),
      feedbackSent: clampCount(counts.feedbackSent),
      guesses: clampCount(counts.guesses),
      showcased: clampCount(counts.showcased),
      votesCast: clampCount(counts.votesCast),
      startedAt: clampCount(snapshot.startedAt, Number.MAX_SAFE_INTEGER),
      endedAt: clampCount(snapshot.endedAt, Number.MAX_SAFE_INTEGER),
    });
  });
  return { activities, participantTotals };
};

const buildRosterSessionInsightBrief = (summary) => {
  const source = summary && typeof summary === 'object' ? summary : {};
  const participants = source.participants && typeof source.participants === 'object' && !Array.isArray(source.participants)
    ? source.participants
    : {};
  const activities = Array.isArray(source.liveActivities) ? source.liveActivities : [];
  const absentCodenames = Array.isArray(source.absentCodenames) ? source.absentCodenames.map(String).filter(Boolean).slice(0, 250) : [];
  const unmatchedCodenames = Array.isArray(source.unmatchedCodenames) ? source.unmatchedCodenames.map(String).filter(Boolean).slice(0, 250) : [];
  const clampCount = (value, max = 100000) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(max, Math.floor(parsed))) : 0;
  };
  const byKind = Object.create(null);
  let submissions = 0;
  let revisions = 0;
  let feedbackSent = 0;
  let votesCast = 0;
  activities.slice(0, 60).forEach(activity => {
    if (!activity || typeof activity !== 'object') return;
    const kind = String(activity.kind || 'activity').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'activity';
    const current = byKind[kind] || { kind, activityCount: 0, invited: 0, submitted: 0, revised: 0 };
    current.activityCount += 1;
    current.invited += clampCount(activity.invited);
    current.submitted += clampCount(activity.submitted);
    current.revised += clampCount(activity.revised);
    byKind[kind] = current;
    submissions += clampCount(activity.submitted);
    revisions += clampCount(activity.revised);
    feedbackSent += clampCount(activity.feedbackSent);
    votesCast += clampCount(activity.votesCast);
  });
  const followUpCodenames = [];
  const noEvidenceCodenames = [];
  const partialParticipationCodenames = [];
  const revisionGrowthCodenames = [];
  const groupMap = Object.create(null);
  let participantsWithRecordedResponse = 0;
  Object.entries(participants).slice(0, 250).forEach(([rawCodename, rawRecord]) => {
    const codename = String(rawCodename || '').trim().slice(0, 80);
    const record = rawRecord && typeof rawRecord === 'object' ? rawRecord : {};
    const activityCount = clampCount(record.liveActivityCount, 60);
    const activitySubmissions = Math.min(activityCount, clampCount(record.liveSubmissionCount, 60));
    const activityRevisions = Math.min(activitySubmissions, clampCount(record.liveRevisionCount, 60));
    const quizResponses = clampCount(record.responseCount, 1000);
    if (activitySubmissions > 0 || quizResponses > 0) participantsWithRecordedResponse += 1;
    if (codename && activityCount > activitySubmissions) {
      followUpCodenames.push(codename);
      if (activitySubmissions === 0 && quizResponses === 0) noEvidenceCodenames.push(codename);
      else partialParticipationCodenames.push(codename);
    }
    if (codename && activityRevisions > 0) revisionGrowthCodenames.push(codename);
    const groupId = record.groupId === null || record.groupId === undefined ? '' : String(record.groupId).trim().slice(0, 80);
    if (!groupId) return;
    const group = groupMap[groupId] || { groupId, participantCount: 0, activityOpportunities: 0, submissions: 0, revisions: 0, followUpCount: 0 };
    group.participantCount += 1;
    group.activityOpportunities += activityCount;
    group.submissions += activitySubmissions;
    group.revisions += activityRevisions;
    if (activityCount > activitySubmissions) group.followUpCount += 1;
    groupMap[groupId] = group;
  });
  const evidenceCohorts = [];
  const addEvidenceCohort = (code, intent, label, codenames, recommendedAction) => {
    const safeCodenames = Array.from(new Set((Array.isArray(codenames) ? codenames : []).map(String).filter(Boolean))).slice(0, 250);
    if (safeCodenames.length === 0) return;
    evidenceCohorts.push({ code, intent, label, count: safeCodenames.length, codenames: safeCodenames, recommendedAction });
  };
  addEvidenceCohort('no-recorded-evidence', 'support', 'No recorded activity evidence', noEvidenceCodenames, 'Check access first, then send a smaller or alternative support resource.');
  addEvidenceCohort('incomplete-participation', 'support', 'Partial activity participation', partialParticipationCodenames, 'Send a focused follow-up resource or reopen the activity with more time.');
  addEvidenceCohort('absent-catch-up', 'support', 'Catch-up needed', absentCodenames, 'Prepare or send a catch-up resource in the current or next session.');
  addEvidenceCohort('revision-growth', 'celebrate', 'Revision growth recorded', revisionGrowthCodenames, 'Acknowledge productive revision and preserve the successful support pattern.');
  const nextMoves = [];
  if (followUpCodenames.length > 0) nextMoves.push({ code: 'activity-follow-up', count: followUpCodenames.length, label: 'Review incomplete activity participation and send support while the session is still open.' });
  if (absentCodenames.length > 0) nextMoves.push({ code: 'absent-catch-up', count: absentCodenames.length, label: 'Prepare a catch-up resource for learners who were not present.' });
  if (feedbackSent > revisions) nextMoves.push({ code: 'revision-opportunity', count: feedbackSent - revisions, label: 'Leave time for learners to act on feedback that has not yet produced a recorded revision.' });
  if (unmatchedCodenames.length > 0) nextMoves.push({ code: 'resolve-codenames', count: unmatchedCodenames.length, label: 'Resolve unmatched codenames before using this session longitudinally.' });
  if (nextMoves.length === 0 && (activities.length > 0 || participantsWithRecordedResponse > 0)) {
    nextMoves.push({ code: 'review-evidence', count: participantsWithRecordedResponse, label: 'Review the recorded participation evidence when choosing the next lesson step.' });
  }
  return {
    schemaVersion: 2,
    activityCount: Math.min(60, activities.length),
    submissions,
    revisions,
    feedbackSent,
    votesCast,
    participantsWithRecordedResponse,
    followUpCodenames: followUpCodenames.slice(0, 250),
    evidenceCohorts: evidenceCohorts.slice(0, 8),
    evidenceScope: 'teacher-device-derived-participation',
    byKind: Object.values(byKind).map(item => ({
      ...item,
      completionPercent: item.invited > 0 ? Math.max(0, Math.min(100, Math.round((item.submitted / item.invited) * 100))) : 0,
    })).sort((a, b) => a.kind.localeCompare(b.kind)),
    groups: Object.values(groupMap).sort((a, b) => a.groupId.localeCompare(b.groupId)),
    nextMoves: nextMoves.slice(0, 4),
  };
};

const buildRosterSessionSummary = ({ sessionCode, sessionData, rosterKey, mode, activitySnapshots = [], quizResponseCountsByUid = {}, endedAt = new Date().toISOString() }) => {
  const rosterStudents = rosterKey?.students && typeof rosterKey.students === 'object' ? rosterKey.students : {};
  const rosterByNormalizedName = Object.create(null);
  Object.keys(rosterStudents).forEach(name => {
    const normalized = normalizeRosterSessionCodename(name);
    if (!normalized) return;
    if (!Object.prototype.hasOwnProperty.call(rosterByNormalizedName, normalized)) rosterByNormalizedName[normalized] = name;
    else if (rosterByNormalizedName[normalized] !== name) rosterByNormalizedName[normalized] = null;
  });
  const liveRoster = sessionData?.roster && typeof sessionData.roster === 'object' ? sessionData.roster : {};
  const allResponses = sessionData?.quizState?.allResponses && typeof sessionData.quizState.allResponses === 'object' ? sessionData.quizState.allResponses : {};
  // A duplicated live codename cannot be attributed to one roster learner
  // without risking a silent merge. Fail closed for both participant evidence
  // and activity totals, retaining only the already-bounded unmatched name.
  const liveCodenameCounts = Object.create(null);
  Object.values(liveRoster).forEach(liveStudent => {
    const normalized = normalizeRosterSessionCodename(liveStudent?.name);
    if (normalized) liveCodenameCounts[normalized] = (liveCodenameCounts[normalized] || 0) + 1;
  });
  const evidenceRosterByNormalizedName = Object.assign(Object.create(null), rosterByNormalizedName);
  Object.entries(liveCodenameCounts).forEach(([normalized, count]) => {
    if (count !== 1) evidenceRosterByNormalizedName[normalized] = null;
  });
  const organizerStatuses = new Set(['loading', 'ready', 'failed', 'working', 'attempted', 'complete']);
  const organizerTypes = new Set(['venn', 'tchart', 'cesort', 'pipeline', 'conceptmap', 'outline', 'fishbone', 'problemsolution', 'frayer', 'seethinkwonder', 'storymap', 'strandchallenge3d', 'conceptrecall3d', 'palacerecall']);
  const boundedOrganizerNumber = (value, max = 100000) => Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
  const readOrganizerReceipt = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const activityId = String(value.activityId || '').trim().slice(0, 160);
    const type = String(value.type || '').trim();
    const status = organizerStatuses.has(value.status) ? value.status : '';
    const at = Number(value.at);
    if (!activityId || !organizerTypes.has(type) || !status || !Number.isFinite(at) || at <= 0) return null;
    const total = boundedOrganizerNumber(value.total);
    return { activityId, type, status, score: boundedOrganizerNumber(value.score), correct: Math.min(total || 100000, boundedOrganizerNumber(value.correct)), total, attempts: boundedOrganizerNumber(value.attempts, 10000), at };
  };
  const activeOrganizer = sessionData?.interactiveOrganizer && typeof sessionData.interactiveOrganizer === 'object' ? sessionData.interactiveOrganizer : null;
  let organizerActivityId = organizerTypes.has(String(activeOrganizer?.type || '')) ? String(activeOrganizer?.activityId || '').trim().slice(0, 160) : '';
  let organizerType = organizerActivityId ? String(activeOrganizer.type) : '';
  let latestOrganizerAt = 0;
  if (!organizerActivityId) {
    Object.values(liveRoster).forEach(liveStudent => {
      const receipt = readOrganizerReceipt(liveStudent?.organizerProgress);
      if (receipt && receipt.at > latestOrganizerAt) {
        organizerActivityId = receipt.activityId;
        organizerType = receipt.type;
        latestOrganizerAt = receipt.at;
      }
    });
  }
  const organizerStatusCounts = { waiting: 0, loading: 0, ready: 0, failed: 0, working: 0, attempted: 0, complete: 0 };
  const organizerFollowUpCodenames = [];
  const participants = {};
  const unmatchedCodenames = [];
  const addUnmatchedCodename = value => {
    if (unmatchedCodenames.length >= 250) return;
    const codename = String(value || '').trim().slice(0, 80);
    const normalized = normalizeRosterSessionCodename(codename);
    if (!normalized || unmatchedCodenames.some(name => normalizeRosterSessionCodename(name) === normalized)) return;
    unmatchedCodenames.push(codename);
  };
  Object.entries(liveRoster).forEach(([uid, liveStudent]) => {
    const rawName = String(liveStudent?.name || '').trim();
    const rosterName = evidenceRosterByNormalizedName[normalizeRosterSessionCodename(rawName)];
    if (!rosterName) {
      addUnmatchedCodename(rawName);
      return;
    }
    const responseMap = allResponses[uid] && typeof allResponses[uid] === 'object' ? allResponses[uid] : {};
    const organizerReceipt = readOrganizerReceipt(liveStudent?.organizerProgress);
    const organizerMatches = !!(organizerActivityId && organizerReceipt?.activityId === organizerActivityId);
    const organizerStatus = organizerMatches ? organizerReceipt.status : (activeOrganizer && organizerActivityId ? 'waiting' : '');
    const organizer = organizerStatus ? {
      type: organizerMatches ? organizerReceipt.type : organizerType,
      status: organizerStatus,
      score: organizerMatches ? organizerReceipt.score : 0,
      correct: organizerMatches ? organizerReceipt.correct : 0,
      total: organizerMatches ? organizerReceipt.total : 0,
      attempts: organizerMatches ? organizerReceipt.attempts : 0,
    } : null;
    if (organizer) {
      organizerStatusCounts[organizer.status] += 1;
      if (organizer.status === 'waiting' || organizer.status === 'failed') organizerFollowUpCodenames.push(rosterName);
    }
    participants[rosterName] = { groupId: liveStudent?.groupId || rosterStudents[rosterName] || null, joinedAt: typeof liveStudent?.joinedAt === 'string' ? liveStudent.joinedAt : null, responseCount: Math.max(countValidRosterQuizResponses(responseMap), Number(quizResponseCountsByUid[uid]) || 0), resourcesOpened: liveStudent?.viewingResourceId ? 1 : 0, ...(organizer ? { organizer } : {}) };
  });
  const createdAt = typeof sessionData?.createdAt === 'string' ? sessionData.createdAt : null;
  const startMs = createdAt ? Date.parse(createdAt) : NaN;
  const endMs = Date.parse(endedAt);
  const durationMinutes = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs ? Math.max(0, Math.round((endMs - startMs) / 60000)) : null;
  const resourceTitles = Array.isArray(sessionData?.resources) ? Array.from(new Set(sessionData.resources.map(item => String(item?.title || '').trim()).filter(Boolean))).slice(0, 20) : [];
  const absentCodenames = Object.keys(rosterStudents).filter(name => !participants[name]);
  const classGoals = (Array.isArray(rosterKey?.classGoalLog) ? rosterKey.classGoalLog : [])
    .filter(entry => entry && sessionCode && entry.sessionCode === sessionCode)
    .slice(0, 40)
    .map(entry => ({
      label: String(entry.label || '').slice(0, 80),
      mode: entry.mode === 'independent' ? 'independent' : 'interdependent',
      tokens: Number(entry.tokens) === 2 ? 2 : 1,
      delivered: Math.max(0, Math.floor(Number(entry.delivered) || 0)),
      at: Number(entry.at) || 0,
    }));
  const liveActivityEvidence = summarizeRosterLiveActivities(activitySnapshots, liveRoster, evidenceRosterByNormalizedName);
  Object.entries(liveActivityEvidence.participantTotals).forEach(([rosterName, totals]) => {
    if (!participants[rosterName]) return;
    participants[rosterName] = {
      ...participants[rosterName],
      liveActivityCount: totals.liveActivityCount,
      liveSubmissionCount: totals.liveSubmissionCount,
      liveRevisionCount: totals.liveRevisionCount,
    };
  });
  const organizerParticipantCount = Object.values(organizerStatusCounts).reduce((sum, count) => sum + count, 0);
  const organizerActivity = organizerActivityId && organizerParticipantCount > 0 ? {
    type: organizerType,
    wasLiveAtEnd: !!activeOrganizer,
    participantCount: organizerParticipantCount,
    statusCounts: organizerStatusCounts,
    followUpCodenames: organizerFollowUpCodenames.slice(0, 250),
  } : null;
  const summary = { schemaVersion: 2, id: String(sessionCode || ('session-' + endMs)), startedAt: createdAt, endedAt, durationMinutes, mode: mode === 'mailbox' ? 'mailbox' : 'firebase', resourceTitles, participants, unmatchedCodenames, absentCodenames, classGoals, liveActivities: liveActivityEvidence.activities, ...(organizerActivity ? { organizerActivity } : {}) };
  return { ...summary, insightBrief: buildRosterSessionInsightBrief(summary) };
};

const shouldSaveRosterSessionSummary = (summary, note = '') => Boolean(summary && (
  String(note || '').trim()
  || (Array.isArray(summary.resourceTitles) && summary.resourceTitles.length > 0)
  || (summary.participants && Object.keys(summary.participants).length > 0)
  || (Array.isArray(summary.unmatchedCodenames) && summary.unmatchedCodenames.length > 0)
  || (Array.isArray(summary.classGoals) && summary.classGoals.length > 0)
  || (Array.isArray(summary.liveActivities) && summary.liveActivities.length > 0)
  || !!summary.organizerActivity
));

const saveRosterSessionSummary = (rosterKey, summary, note = '', retentionLimit = 30) => {
  if (!rosterKey || !summary?.id) return rosterKey;
  const cleanNote = String(note || '').trim().slice(0, 500);
  const savedSummary = cleanNote ? { ...summary, teacherNote: cleanNote } : summary;
  const existing = Array.isArray(rosterKey.sessionHistory) ? rosterKey.sessionHistory : [];
  if (!shouldSaveRosterSessionSummary(summary, cleanNote)) return rosterKey;
  const sessionHistory = [...existing.filter(item => item?.id !== savedSummary.id), savedSummary].slice(-Math.max(1, retentionLimit));
  const progressHistory = { ...(rosterKey.progressHistory || {}) };
  Object.entries(savedSummary.participants || {}).forEach(([codename, participant]) => {
    const previous = Array.isArray(progressHistory[codename]) ? progressHistory[codename] : [];
    const entry = {
      sessionId: savedSummary.id,
      timestamp: savedSummary.endedAt,
      groupId: participant.groupId || null,
      responseCount: participant.responseCount || 0,
      resourcesOpened: participant.resourcesOpened || 0,
      liveActivityCount: participant.liveActivityCount || 0,
      liveSubmissionCount: participant.liveSubmissionCount || 0,
      liveRevisionCount: participant.liveRevisionCount || 0,
      ...(participant.organizer ? { organizer: { ...participant.organizer } } : {}),
    };
    progressHistory[codename] = [...previous.filter(item => item?.sessionId !== savedSummary.id), entry].slice(-Math.max(1, retentionLimit));
  });
  return { ...rosterKey, sessionHistory, progressHistory };
};

function SessionModal({
  activeSessionAppId,
  activeSessionCode,
  addToast,
  appId,
  copyToClipboard,
  connectedStudentCount = 0,
  db,
  deleteDoc,
  doc,
  handleSetShowGroupModalToTrue,
  handleSetShowSessionModalToFalse,
  isMailboxSession = false,
  mailboxJoinUrl = '',
  onRequestEndSession,
  sessionData,
  setActiveSessionCode,
  setConfirmDialog,
  setSessionData,
  setShowSessionModal,
  studentAiPolicy = 'off',
  t,
  toggleSessionMode,
  warnLog,
}) {
  const noop = () => null;
  const Wifi = window.Wifi || noop;
  const X = window.X || noop;
  const Copy = window.Copy || noop;
  const Users = window.Users || noop;
  const ChevronRight = window.ChevronRight || noop;
  const XCircle = window.XCircle || noop;
  const ExternalLink = window.ExternalLink || noop;
  const Printer = window.Printer || noop;
  const Maximize = window.Maximize || noop;
  const Minimize = window.Minimize || noop;
  const CheckCircle2 = window.CheckCircle2 || noop;
  const [isProjectionMode, setIsProjectionMode] = React.useState(false);
  const lanJoinUrl = Array.isArray(sessionData?.joinUrls) ? sessionData.joinUrls[0] : '';
  const isLocalOnly = sessionData?.isLocalOnly === true || sessionData?.transport === 'local-preview';
  // Gemini Canvas injects Google's own managed Firebase project, and its rules
  // refuse a device that is not already inside Canvas. The teacher's session
  // write succeeds (the teacher IS inside Canvas), so a standard-backend QR
  // renders perfectly here and then dead-ends at scan time with
  // permission-denied — verified on a real phone, 2026-07-09. A QR that cannot
  // work is worse than no QR, so name the two paths that do: the Class Mailbox
  // session, and the teacher's own Canvas share link for students who have
  // Gemini access. Mailbox sessions are exempt — their QR carries a mailbox
  // capability and touches no Firebase at all.
  const isCanvasManagedBackend = !isMailboxSession && !isLocalOnly
    && typeof window !== 'undefined' && window._isCanvasEnv === true;
  const [liveQrSvg, setLiveQrSvg] = React.useState('');
  const [liveQrError, setLiveQrError] = React.useState(false);
  const qrStatusText = liveQrSvg ? 'QR validated' : liveQrError ? 'QR unavailable' : 'QR loading';
  const studentAiLabel = studentAiPolicy === 'student-byok' ? 'Personal AI optional' : 'AI tools off';
  const dialogRef = React.useRef(null);
  React.useEffect(function () {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = function () { return trapStack[trapStack.length - 1] === trap; };
    const getFocusable = function () {
      return Array.from(dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
      )).filter(function (element) {
        if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
        return !style || (style.display !== 'none' && style.visibility !== 'hidden');
      });
    };
    const first = getFocusable()[0];
    (first || dialog).focus();
    const onKeyDown = function (event) {
      if (!isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); handleSetShowSessionModalToFalse(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const firstItem = focusable[0], lastItem = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? lastItem : firstItem).focus(); }
      else if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return function () {
      document.removeEventListener('keydown', onKeyDown);
      const wasTopTrap = isTopTrap();
      const trapIndex = trapStack.indexOf(trap);
      if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
      if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [handleSetShowSessionModalToFalse]);

  const liveJoinUrl = React.useMemo(() => {
    if (mailboxJoinUrl) return mailboxJoinUrl;
    if (isLocalOnly || !activeSessionCode || typeof window === 'undefined') return '';
    const params = {
      allo_join: activeSessionCode,
      allo_host: activeSessionAppId || appId,
      allo_ai: studentAiPolicy === 'student-byok' ? 'byok' : 'off',
    };
    if (typeof window.__alloBuildShareUrl === 'function') {
      try { return window.__alloBuildShareUrl(params); } catch (_) {}
    }
    try {
      const url = new URL(window.location.href);
      const protocol = String(url.protocol || '').toLowerCase();
      const host = String(url.hostname || '').toLowerCase();
      if (!/^https?:$/.test(protocol)
        || host === 'localhost'
        || host === '127.0.0.1'
        || host.includes('gemini.google')
        || host === 'prismflow-911fe.web.app'
        || host === 'prismflow-911fe.firebaseapp.com') {
        return '';
      }
      url.search = '';
      url.hash = '';
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
      return url.toString();
    } catch (_) {
      return '';
    }
  }, [activeSessionAppId, activeSessionCode, appId, isLocalOnly, mailboxJoinUrl, studentAiPolicy]);

  React.useEffect(() => {
    let cancelled = false;
    if (!liveJoinUrl || typeof window === 'undefined') {
      setLiveQrSvg('');
      setLiveQrError(false);
      return undefined;
    }
    setLiveQrSvg('');
    setLiveQrError(false);
    const makeQrSvg = async () => {
      if (typeof window.__alloMakeQrSvg === 'function') {
        return window.__alloMakeQrSvg(liveJoinUrl, 'AlloFlow student join QR');
      }
      if (!window.qrcode) throw new Error('QR helper unavailable');
      const qr = window.qrcode(0, 'M');
      qr.addData(liveJoinUrl);
      qr.make();
      return qr.createSvgTag({ cellSize: 5, margin: 20, scalable: true, title: 'AlloFlow student join QR' });
    };
    makeQrSvg()
      .then(svg => { if (!cancelled) setLiveQrSvg(svg); })
      .catch(() => { if (!cancelled) { setLiveQrSvg(''); setLiveQrError(true); } });
    return () => { cancelled = true; };
  }, [liveJoinUrl]);

  const testStudentJoin = React.useCallback(() => {
    if (!liveJoinUrl || typeof window === 'undefined') return;
    const preview = window.open(liveJoinUrl, '_blank');
    if (preview) {
      try { preview.opener = null; } catch (_) {}
    } else {
      addToast('Allow pop-ups to test this student join link.', 'info');
    }
  }, [addToast, liveJoinUrl]);

  const printLiveQr = React.useCallback(() => {
    if (!liveQrSvg || typeof window === 'undefined') {
      addToast('Wait for the QR code to finish loading before printing.', 'info');
      return;
    }
    const popup = window.open('', '_blank', 'width=720,height=900');
    if (!popup) {
      addToast('Allow pop-ups to print this QR code.', 'info');
      return;
    }
    try { popup.opener = null; } catch (_) {}
    const safeCode = String(activeSessionCode || '').replace(/[^A-Z0-9-]/gi, '');
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>AlloFlow live session ${safeCode}</title><style>body{font-family:Arial,sans-serif;color:#172033;text-align:center;padding:40px}h1{font-size:28px;margin:0 0 8px}.mode{font-weight:700;color:#0e7490;margin-bottom:24px}.qr{width:360px;height:360px;margin:0 auto 24px}.qr svg{width:100%;height:100%}.code{font:900 54px/1.1 monospace;letter-spacing:.18em;margin:12px 0}.note{font-size:15px;color:#475569;margin-top:18px}@media print{body{padding:20px}}</style></head><body><h1>AlloFlow live session</h1><div class="mode">${isMailboxSession ? 'Class Mailbox QR join' : 'Student QR join'} · ${studentAiLabel}</div><div class="qr">${liveQrSvg}</div><div>Fallback class code</div><div class="code">${safeCode}</div><div class="note">Scan the QR code to join. This invitation works only while the teacher session is active.</div></body></html>`);
    popup.document.close();
    setTimeout(() => { try { popup.focus(); popup.print(); } catch (_) {} }, 250);
  }, [activeSessionCode, addToast, isMailboxSession, liveQrSvg, studentAiLabel]);

  return (
    <div className={`fixed inset-0 bg-black/80 z-[150] flex items-center justify-center animate-in fade-in duration-200 motion-reduce:animate-none ${isProjectionMode ? 'p-0' : 'p-4'}`} role="presentation" onClick={handleSetShowSessionModalToFalse}>
      <div ref={dialogRef} tabIndex={-1} className={`bg-white shadow-2xl text-center w-full overflow-y-auto relative animate-in zoom-in-95 duration-200 motion-reduce:animate-none ${isProjectionMode ? 'h-screen max-w-none rounded-none p-6 sm:p-10' : 'max-h-[90vh] max-w-md rounded-2xl p-5 sm:p-8'}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="alloflow-session-modal-title" aria-describedby="alloflow-session-modal-description">
        {!isLocalOnly && liveJoinUrl && !isCanvasManagedBackend && <button type="button" onClick={() => setIsProjectionMode(value => !value)} className="absolute top-4 left-4 z-10 min-h-11 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm hover:border-indigo-400" aria-label={isProjectionMode ? 'Exit projection mode' : 'Open projection mode'}>
          {isProjectionMode ? <Minimize size={16} aria-hidden="true"/> : <Maximize size={16} aria-hidden="true"/>} <span className="hidden sm:inline">{isProjectionMode ? 'Exit projection mode' : 'Open projection mode'}</span>
        </button>}
        <button type="button" onClick={handleSetShowSessionModalToFalse} className="absolute top-4 right-4 min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" aria-label={t('common.close')}><X size={24} aria-hidden="true"/></button>
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 p-4 rounded-full shadow-inner" aria-hidden="true">
            <Wifi size={48} className="text-green-600 animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
        <h2 id="alloflow-session-modal-title" className="text-2xl font-black text-slate-800 mb-2">{isLocalOnly ? 'Local preview' : isMailboxSession ? 'Class Mailbox live session' : t('session.live_title')}</h2>
        <p id="alloflow-session-modal-description" className="text-slate-600 mb-6 font-medium">{isLocalOnly ? 'Firebase did not create a shareable session. This preview stays on the teacher device.' : isMailboxSession ? 'Students join through your Class Mailbox without accounts.' : t('session.live_instruction')}</p>
        <button
          type="button"
          aria-label={`${activeSessionCode}. ${t('session.click_to_copy')}`}
          className={`w-full bg-indigo-50 border-4 border-indigo-100 rounded-2xl cursor-pointer hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors group relative ${isProjectionMode ? 'mx-auto max-w-4xl p-4 mb-4' : 'p-4 sm:p-6 mb-6'}`}
          onClick={() => copyToClipboard(activeSessionCode)}
          title={t('common.click_to_copy')}
        >
          <div className={`font-black text-indigo-600 tracking-[0.16em] sm:tracking-widest font-mono ${isProjectionMode ? 'text-6xl sm:text-8xl' : 'text-5xl sm:text-7xl'}`}>
            {activeSessionCode}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-bold text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-1">
            <Copy size={10} aria-hidden="true"/> {t('session.click_to_copy')}
          </div>
        </button>
        {liveJoinUrl && !isCanvasManagedBackend && (
          <div className={`bg-cyan-50 rounded-xl border border-cyan-200 text-left ${isProjectionMode ? 'mx-auto max-w-5xl p-5 mb-3' : 'p-4 mb-6'}`}>
            <p className="text-[11px] text-cyan-700 font-bold uppercase tracking-wider mb-2 text-center">{isMailboxSession ? 'Class Mailbox QR join' : 'Student QR join'}</p>
            <div className="flex justify-center mb-3">
              <div className={`bg-white border border-cyan-200 rounded-lg p-2 flex items-center justify-center shadow-sm ${isProjectionMode ? 'w-[min(52vh,72vw)] h-[min(52vh,72vw)]' : 'w-40 h-40'}`}>
                {liveQrSvg
                  ? <div className="w-full h-full [&_svg]:w-full [&_svg]:h-full" role="img" aria-label="AlloFlow student join QR" dangerouslySetInnerHTML={{ __html: liveQrSvg }} />
                  : <span className="text-xs font-bold text-cyan-700 text-center">{liveQrError ? 'Copy link below' : qrStatusText}</span>}
              </div>
            </div>
            <ul className="mb-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3" aria-label="Live session readiness">
              <li className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 font-bold text-emerald-800"><CheckCircle2 size={14} aria-hidden="true"/> Session active</li>
              <li className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 font-bold text-emerald-800"><CheckCircle2 size={14} aria-hidden="true"/> Student link ready</li>
              <li className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 font-bold text-emerald-800">{liveQrSvg && <CheckCircle2 size={14} aria-hidden="true"/>} <span role="status" aria-live="polite" aria-atomic="true">{qrStatusText}</span></li>
            </ul>
            <button type="button"
              onClick={() => copyToClipboard(liveJoinUrl)}
              className="w-full min-h-11 flex items-center justify-center gap-2 text-xs font-bold text-cyan-800 hover:text-cyan-900 bg-white border border-cyan-300 hover:border-cyan-400 rounded-lg p-2 transition-all break-all"
            >
              Copy student join link <Copy size={12} aria-hidden="true"/>
            </button>
            <input aria-label="Selectable student join link" readOnly value={liveJoinUrl} onFocus={event => event.target.select()} className="mt-2 min-h-11 w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500" />
            <div className={`mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 ${isProjectionMode ? 'hidden' : ''}`}>
              <button type="button" onClick={testStudentJoin} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-900 hover:border-emerald-500">
                Test as student <ExternalLink size={12} aria-hidden="true"/>
              </button>
              <button type="button" onClick={printLiveQr} disabled={!liveQrSvg} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-800 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50">
                Print QR <Printer size={12} aria-hidden="true"/>
              </button>
            </div>
            <p className="text-[11px] text-cyan-800 mt-2 text-center"><span role="status" aria-live="polite" aria-atomic="true">{connectedStudentCount > 0 ? connectedStudentCount + ' student' + (connectedStudentCount === 1 ? '' : 's') + ' connected. ' : ''}</span>{isMailboxSession ? `Ready to scan. This QR uses the mailbox session secret, requires no Firebase sign-in, and expires when the teacher ends the session. ${studentAiLabel}.` : `Ready to scan. ${studentAiPolicy === 'student-byok' ? 'Students may connect their own AI provider for this tab.' : 'AI generation stays off.'} The link stops working when the session ends.`}</p>
          </div>
        )}
        {!liveJoinUrl && !isCanvasManagedBackend && (
          <div className="mb-6 bg-amber-50 p-3 rounded-xl border border-amber-200 text-left">
            <p className="text-[11px] text-amber-800 font-bold uppercase tracking-wider mb-1 text-center">{isLocalOnly ? 'Local preview only' : 'Student QR unavailable'}</p>
            <p className="text-xs text-amber-900 text-center">{isLocalOnly ? 'This code was not saved to Firebase, so students cannot join it. Reload, start a new live session, and share only when a QR appears.' : 'This host is not configured as a student join path. Use the class code, local network link, or a student app URL.'}</p>
          </div>
        )}
        {isCanvasManagedBackend && (
          <div className="mb-6 bg-amber-50 p-3 rounded-xl border border-amber-200 text-left">
            <p className="text-[11px] text-amber-800 font-bold uppercase tracking-wider mb-1 text-center">Scanned QR will not work from this backend</p>
            <p className="text-xs text-amber-900">This session runs on the Firebase project Gemini Canvas provides. Its rules refuse student devices that are not already signed in to Canvas, so a scanned QR would fail on the phone even though the session started correctly here. Two paths do work:</p>
            <ul className="mt-2 space-y-1.5 text-xs text-amber-900">
              <li><b>No student accounts:</b> end this session and start a <b>Class Mailbox QR session</b> instead. Students scan and join with no accounts at all.</li>
              <li><b>Students who have Gemini access:</b> share your Canvas link as usual, and give them the class code above to join from inside Canvas.</li>
            </ul>
            {liveJoinUrl && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-bold text-amber-800">Show the standard join link anyway (for troubleshooting)</summary>
                <input aria-label="Selectable standard join link" readOnly value={liveJoinUrl} onFocus={event => event.target.select()} className="mt-2 min-h-11 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-amber-500" />
                <p className="mt-1 text-[11px] text-amber-800">Expect a permission error on the student device. If it joins successfully, the managed rules have changed — worth reporting.</p>
              </details>
            )}
          </div>
        )}
        {!isProjectionMode && lanJoinUrl && (
          <div className="mb-6 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider mb-1">Local network join link</p>
            <button type="button"
              aria-label={`${t('common.copy')} ${lanJoinUrl}`}
              onClick={() => copyToClipboard(lanJoinUrl)}
              className="w-full min-h-11 flex items-center justify-center gap-2 text-xs font-mono font-bold text-emerald-800 hover:text-emerald-900 bg-white border border-emerald-300 hover:border-emerald-400 rounded-lg p-2 transition-all break-all"
            >
              {lanJoinUrl} <Copy size={12} aria-hidden="true"/>
            </button>
          </div>
        )}
        {!isProjectionMode && !isMailboxSession && (
          <div className="mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[11px] text-slate-600 font-bold uppercase tracking-wider mb-1">{t('session.host_id_share')}</p>
            <button type="button"
              aria-label={`${t('common.copy')} ${appId}`}
              onClick={() => copyToClipboard(appId)}
              className="w-full min-h-11 flex items-center justify-center gap-2 text-xs font-mono font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-400 hover:border-indigo-200 rounded-lg p-2 transition-all"
            >
              {appId} <Copy size={12} aria-hidden="true"/>
            </button>
          </div>
        )}
        {!isProjectionMode && sessionData && (
          <div className="mb-6 text-center animate-in slide-in-from-bottom-2 motion-reduce:animate-none">
            <button type="button"
              onClick={handleSetShowGroupModalToTrue}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-3"
            >
              <Users size={20} aria-hidden="true" />
              <div className="text-left">
                <span className="block">{t('groups.manage_button')}</span>
                <span className="block text-[11px] font-normal opacity-80">{t('groups.manage_button_desc')}</span>
              </div>
              <ChevronRight size={18} className="opacity-60" aria-hidden="true"/>
            </button>
          </div>
        )}
        {!isProjectionMode && sessionData && (
          <div className="mb-8 flex justify-center">
            <button type="button"
              role="switch"
              aria-checked={sessionData.mode === 'sync'}
              onClick={toggleSessionMode}
              className={`flex items-center gap-3 px-4 py-2 rounded-full border-2 transition-all w-full justify-center ${sessionData.mode === 'sync' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
            >
              <div aria-hidden="true" className={`w-10 h-5 rounded-full relative transition-colors ${sessionData.mode === 'sync' ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 motion-reduce:transition-none ${sessionData.mode === 'sync' ? 'left-6' : 'left-1'}`}></div>
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold uppercase tracking-wider">{sessionData.mode === 'sync' ? t('session.teacher_paced') : t('session.student_paced')}</span>
                <span className="block text-[11px] opacity-70 font-normal">
                  {sessionData.mode === 'sync' ? t('session.teacher_paced_desc') : t('session.student_paced_desc')}
                </span>
              </div>
            </button>
          </div>
        )}
        <div className={`flex flex-col sm:flex-row gap-3 justify-center ${isProjectionMode ? 'hidden' : ''}`}>
          <button type="button"
            onClick={handleSetShowSessionModalToFalse}
            className="w-full sm:w-auto px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full transition-colors"
          >
            {t('session.action_close')}
          </button>
          <button type="button"
            onClick={() => {
              if (typeof onRequestEndSession === 'function') onRequestEndSession();
              else setConfirmDialog({ message: t('session.end_confirm') || 'Are you sure you want to end this session?', onConfirm: () => { setActiveSessionCode(null); setSessionData(null); setShowSessionModal(false); } });
            }}
            className="w-full sm:w-auto px-8 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <XCircle size={18} aria-hidden="true"/> {t('session.action_end')}
          </button>
        </div>
      </div>
    </div>
  );
}
