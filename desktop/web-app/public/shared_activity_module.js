(function() {
'use strict';
if (window.AlloModules && window.AlloModules.SharedActivity) { console.log('[CDN] SharedActivity already loaded, skipping'); return; }
var React = window.React;
var _alloMailboxCallWithRetry = function() {
  var call = window.__alloSharedActivityMailboxCallWithRetry;
  if (typeof call !== 'function') return Promise.reject(new Error('Shared activity mailbox transport is not ready'));
  return call.apply(window, arguments);
};
const AlloQuestionBoardPanel = React.memo(function AlloQuestionBoardPanel({
  activity,
  mailbox,
  admin = '',
  mode = 'student',
  addToast = () => {}
}) {
  const isTeacher = mode === 'teacher';
  const Transport = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.QuestionBoardTransport;
  const Contract = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.QuestionBoardContract;
  const Views = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.QuestionBoardView;
  const packId = String(mailbox?.id || '');
  const activityId = String(activity?.activityId || '');
  const scope = `${packId}:${activityId}`;
  const [board, setBoard] = React.useState(null);
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  // Rebuilt whenever the board identity changes, so switching activities can
  // never post one board's question onto another.
  const transport = React.useMemo(() => {
    if (!Transport || !packId || !activityId) return null;
    return Transport.createMailboxTransport({
      call: _alloMailboxCallWithRetry,
      url: String(mailbox?.url || ''),
      packId,
      activityId,
      admin: isTeacher ? String(admin || '') : '',
      packSecret: String(mailbox?.secret || ''),
      isTeacher,
      storage: (() => {
        try {
          return window.localStorage;
        } catch (_) {
          return null;
        }
      })()
    });
  }, [Transport, packId, activityId, admin, isTeacher, mailbox?.url, mailbox?.secret]);

  // The student's own name travels with their questions. It is display only —
  // the server never uses it for authorization, uid does. There is nothing to
  // inherit it from: codenames live on the live-session roster and hosted
  // assignments are pseudonymous, so the board asks once and remembers.
  const [displayName, setDisplayName] = React.useState(() => {
    try {
      return String(localStorage.getItem('allo_display_name') || '').trim().slice(0, 40);
    } catch (_) {
      return '';
    }
  });
  React.useEffect(() => {
    if (!transport || isTeacher) return;
    transport.setDisplayName(displayName);
  }, [transport, isTeacher, displayName]);
  const rememberName = React.useCallback(next => {
    const clean = String(next || '').slice(0, 40);
    setDisplayName(clean);
    try {
      localStorage.setItem('allo_display_name', clean);
    } catch (_) {}
  }, []);
  React.useEffect(() => {
    setBoard(null);
    setDraft('');
    setError('');
  }, [scope]);
  const report = React.useCallback(result => {
    if (!result || result.ok) return false;
    // A refusal and a dead connection need different words. Guessing wrong
    // sends a student looking for a problem that is not theirs.
    const messages = {
      'item-cap': 'You have added all your questions for this board.',
      'board-full': 'This board is full. Ask your teacher to start a new one.',
      'expired': 'This board is closed.',
      'empty-text': 'Type a question first.',
      'participant-cap': 'This board already has as many students as it can hold.',
      'rate-limited': 'That was a lot of requests at once. Try again in a moment.',
      'host-only': 'Only the teacher can do that.',
      'denied': 'This board did not recognise you. Reopen the assignment link.',
      'no-board': 'That board is no longer available.'
    };
    setError(result.transport ? 'The board could not reach the class mailbox. Check the connection and try again.' : messages[result.reason] || 'That could not be saved. Try again.');
    return true;
  }, []);
  const refresh = React.useCallback(async () => {
    if (!transport) return;
    const result = await transport.load();
    if (result.ok) {
      setBoard(result.board);
      setError('');
      return;
    }
    report(result);
  }, [transport, report]);

  // Poll cadence matches the other durable sidecars: responsive while the tab
  // is visible, parked when it is not, so a forgotten tab does not burn the
  // teacher's Apps Script quota all afternoon.
  React.useEffect(() => {
    if (!transport) return undefined;
    let cancelled = false;
    let timer = null;
    const tick = async () => {
      if (cancelled) return;
      await refresh();
      if (cancelled) return;
      const hidden = typeof document !== 'undefined' && document.hidden;
      timer = setTimeout(tick, hidden ? 60000 : 15000);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [transport, refresh]);
  const post = React.useCallback(async text => {
    if (!transport || busy) return;
    setBusy(true);
    try {
      const result = await transport.addItem(text);
      if (result.ok) {
        setBoard(result.board);
        setDraft('');
        setError('');
        addToast('Question posted', 'success');
      } else if (report(result)) {
        addToast('That question was not posted', 'error');
      }
    } finally {
      setBusy(false);
    }
  }, [transport, busy, addToast, report]);
  const moderate = React.useCallback(async (item, status) => {
    if (!transport) return;
    const result = await transport.setStatus(item.uid, item.id, status);
    if (result.ok) {
      refresh();
      return;
    }
    if (report(result)) addToast('That change was not saved', 'error');
  }, [transport, refresh, addToast, report]);
  const toggleAnswered = React.useCallback(async (item, next) => {
    if (!transport) return;
    const result = await transport.setAnswered(item.uid, item.id, next === true, '');
    if (result.ok) {
      refresh();
      return;
    }
    if (report(result)) addToast('That change was not saved', 'error');
  }, [transport, refresh, addToast, report]);
  if (!Transport || !Contract || !Views) {
    return /*#__PURE__*/React.createElement("p", {
      className: "rounded border border-slate-300 bg-slate-50 p-3 text-xs text-slate-700"
    }, "The questions board is still loading. Give it a moment, then reopen this panel.");
  }
  if (!board) {
    return /*#__PURE__*/React.createElement("p", {
      className: "p-3 text-xs text-slate-600",
      role: "status"
    }, error || 'Loading the board...');
  }
  const actor = transport.actor();
  const Surface = isTeacher ? Views.QuestionBoardTeacher : Views.QuestionBoardStudent;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, error && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "rounded border border-rose-300 bg-rose-50 p-2 text-xs text-rose-900"
  }, error), !isTeacher && /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Your name", /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: displayName,
    onChange: event => rememberName(event.target.value),
    maxLength: 40,
    placeholder: "So your teacher knows who asked",
    className: "mt-1 w-full rounded border border-slate-300 p-2 text-sm font-normal"
  })), Surface({
    contract: Contract,
    board,
    actor,
    transport: 'mailbox',
    draft,
    onDraft: setDraft,
    onPost: post,
    onApprove: item => moderate(item, 'approved'),
    onHide: item => moderate(item, 'hidden'),
    onToggleAnswered: toggleAnswered
  }));
});
function _alloNormalizeSharedRatingActivity(value) {
  if (!value || value.type !== 'rating') return null;
  const minCandidate = Number(value.minValue);
  const maxCandidate = Number(value.maxValue);
  const minValue = Number.isInteger(minCandidate) && minCandidate >= 1 && minCandidate <= 9 ? minCandidate : 1;
  const maxFallback = Math.max(minValue + 1, 5);
  const maxValue = Number.isInteger(maxCandidate) && maxCandidate >= 2 && maxCandidate <= 10 && maxCandidate > minValue ? maxCandidate : Math.min(10, maxFallback);
  const sourceLabels = Array.isArray(value.labels) ? value.labels : [];
  const labels = Array.from({
    length: maxValue - minValue + 1
  }, (_, index) => String(sourceLabels[index] || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40));
  return {
    ...value,
    type: 'rating',
    minValue,
    maxValue,
    labels
  };
}
function _alloSharedActivityUiMeta(activity) {
  // A Driving Questions Board is a third activity type on the same durable
  // sidecar, so it needs its own label, short badge and dialog id here or it
  // would open under the word-cloud heading.
  if (activity?.type === 'question_board') {
    return {
      isRating: false,
      isBoard: true,
      shortLabel: 'QB',
      title: 'Driving questions board',
      dialogId: 'shared-assignment-question-board-title'
    };
  }
  if (activity?.type === 'survey') {
    return {
      isRating: false,
      isSurvey: true,
      shortLabel: 'SV',
      title: 'Survey',
      dialogId: 'shared-assignment-survey-title'
    };
  }
  const isRating = activity?.type === 'rating';
  return isRating ? {
    isRating: true,
    shortLabel: 'RT',
    title: 'Class rating',
    dialogId: 'shared-assignment-rating-title'
  } : {
    isRating: false,
    shortLabel: 'WC',
    title: 'Class word cloud',
    dialogId: 'shared-assignment-word-cloud-title'
  };
}
function _alloAssignmentCenterActivityStatus(input) {
  const source = input && typeof input === 'object' ? input : {};
  const responses = Array.isArray(source.responses) ? source.responses.slice(0, 500) : [];
  const countStatus = status => responses.filter(row => row && row.status === status).length;
  const boundedCount = value => Math.max(0, Math.min(10000, Math.floor(Number(value) || 0)));
  return {
    participantCount: boundedCount(source.participantCount),
    // Idempotent by design: the refresh boundary strips response rows
    // before React state, then the row builder sanitizes that aggregate
    // again. Prefer rows only at the first boundary; otherwise retain the
    // already-bounded totals without reconstructing identities/content.
    pending: responses.length ? countStatus('pending') : boundedCount(source.pending),
    approved: responses.length ? countStatus('approved') : boundedCount(source.approved),
    hidden: responses.length ? countStatus('hidden') : boundedCount(source.hidden),
    revealed: source.revealed === true,
    updatedAt: Math.max(0, Math.min(8640000000000000, Math.floor(Number(source.updatedAt) || 0)))
  };
}
function _alloBuildAssignmentCenterRows(shares, statusByUrl, nowValue) {
  const now = Number.isFinite(Number(nowValue)) ? Number(nowValue) : Date.now();
  const statuses = statusByUrl && typeof statusByUrl === 'object' ? statusByUrl : {};
  const rank = {
    active: 0,
    expired: 1,
    revoked: 2
  };
  return (Array.isArray(shares) ? shares : []).filter(share => share && share.url).slice(0, 20).map((share, index) => {
    const expiresAtMs = Date.parse(share.expiresAt || '');
    const lifecycle = share.revokedAt ? 'revoked' : Number.isFinite(expiresAtMs) && expiresAtMs <= now ? 'expired' : 'active';
    const remote = statuses[share.url] && typeof statuses[share.url] === 'object' ? statuses[share.url] : {};
    return {
      key: String(share.url),
      share,
      lifecycle,
      activityState: remote.state === 'loading' || remote.state === 'ready' || remote.state === 'error' ? remote.state : 'idle',
      activity: remote.state === 'ready' ? _alloAssignmentCenterActivityStatus(remote.summary) : null,
      originalIndex: index
    };
  }).sort((a, b) => rank[a.lifecycle] - rank[b.lifecycle] || (Date.parse(b.share.createdAt || '') || 0) - (Date.parse(a.share.createdAt || '') || 0) || a.originalIndex - b.originalIndex);
}
function _alloFilterAssignmentCenterRows(rows, filterValue) {
  const rowsList = Array.isArray(rows) ? rows : [];
  const filter = ['all', 'needs_review', 'active', 'closed', 'errors'].includes(filterValue) ? filterValue : 'all';
  if (filter === 'needs_review') return rowsList.filter(row => Number(row?.activity?.pending || 0) > 0);
  if (filter === 'active') return rowsList.filter(row => row?.lifecycle === 'active');
  if (filter === 'closed') return rowsList.filter(row => row?.lifecycle === 'expired' || row?.lifecycle === 'revoked');
  if (filter === 'errors') return rowsList.filter(row => row?.activityState === 'error');
  return rowsList;
}
function _alloBuildAssignmentCenterCsv(rows) {
  const cell = value => {
    const raw = String(value === undefined || value === null ? '' : value);
    // Force teacher-authored formula-like titles to remain text in spreadsheet apps.
    const text = /^[=+\-@]/.test(raw) ? "'" + raw : raw;
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  const header = ['Title', 'Lifecycle', 'Created', 'Expires', 'Delivery', 'Resources', 'Activity', 'Responses', 'Awaiting review', 'Approved', 'Hidden', 'Revealed', 'Last activity'];
  const body = (Array.isArray(rows) ? rows : []).map(row => {
    const share = row?.share || {};
    const activity = row?.activity || {};
    const activityType = share.sharedActivity?.type === 'rating' ? 'Rating' : share.sharedActivity ? 'Word Cloud' : 'None';
    const delivery = share.type === 'assignment-pack-hosted' ? 'Class Mailbox' : share.type === 'assignment-pack' ? 'Self-contained' : 'Hosted';
    return [share.title || 'AlloFlow homework', row?.lifecycle || '', share.createdAt || '', share.expiresAt || '', delivery, Math.max(0, Math.floor(Number(share.resourceCount) || 0)), activityType, Math.max(0, Math.floor(Number(activity.participantCount) || 0)), Math.max(0, Math.floor(Number(activity.pending) || 0)), Math.max(0, Math.floor(Number(activity.approved) || 0)), Math.max(0, Math.floor(Number(activity.hidden) || 0)), activity.revealed === true ? 'Yes' : 'No', activity.updatedAt > 0 && activity.updatedAt <= 8640000000000000 ? new Date(activity.updatedAt).toISOString() : ''].map(cell).join(',');
  });
  return [header.join(','), ...body].join('\n');
}

// Assignment packet shaping belongs beside the shared-activity contracts it
// emits. Host-owned state, privacy filtering and compression stay injected so
// this module cannot bypass the current student-pack safety boundary.
async function _alloBuildAssignmentPackEncoded(options = {}, dependencies = {}) {
  const request = options && typeof options === 'object' ? options : {};
  const includeSharedActivity = request.includeSharedActivity === true;
  const resourceIds = Object.prototype.hasOwnProperty.call(request, 'resourceIds') ? request.resourceIds : null;
  const {
    resolveAssignmentResources,
    sharedAssignmentActivity = {},
    addToast = () => {},
    sourceTopic = '',
    generatedContent = null,
    homeworkExpiryDays = 7,
    serializeResourceForStudentPack,
    stripUndefined,
    generateUUID,
    studentAiPolicyForShare = 'off',
    workStoryEnabled = false,
    encodeAlloPack
  } = dependencies && typeof dependencies === 'object' ? dependencies : {};
  const requiredFunctions = {
    resolveAssignmentResources,
    serializeResourceForStudentPack,
    stripUndefined,
    generateUUID,
    encodeAlloPack
  };
  const missingDependency = Object.keys(requiredFunctions).find(name => typeof requiredFunctions[name] !== 'function');
  if (missingDependency) {
    throw new Error(`[SharedActivity.buildAssignmentPackEncoded] Missing dependency: ${missingDependency}`);
  }
  const resourcesToAssign = resolveAssignmentResources(resourceIds);
  // An activity can stand alone. A scheduling poll or sign-up sheet has no
  // lesson attached, so requiring a resource pack makes that use unreachable.
  const activityOnly = includeSharedActivity && sharedAssignmentActivity?.enabled === true && !resourcesToAssign.length;
  if (!resourcesToAssign.length && !activityOnly) {
    addToast('Create or restore a teacher resource before making a homework link, or add a shared activity to send on its own.', 'info');
    return null;
  }
  const explicitSelection = Array.isArray(resourceIds);
  const title = String((activityOnly ? sharedAssignmentActivity?.prompt || 'Shared activity' : null) || (explicitSelection ? resourcesToAssign[0]?.title : sourceTopic || generatedContent?.title) || resourcesToAssign[0]?.title || 'AlloFlow homework').trim().slice(0, 140) || 'AlloFlow homework';
  const resources = resourcesToAssign.map(item => serializeResourceForStudentPack(item)).filter(Boolean);
  if (!resources.length && !activityOnly) {
    addToast('None of the selected resources can be shared with students. Choose a different History resource.', 'info');
    return null;
  }
  const expiresAt = new Date(Date.now() + homeworkExpiryDays * 24 * 60 * 60 * 1000).toISOString();
  const ALLO_ACTIVITY_TYPES = ['rating', 'availability', 'signup', 'word_cloud', 'survey'];
  const sharedActivityType = ALLO_ACTIVITY_TYPES.indexOf(sharedAssignmentActivity.type) >= 0 ? sharedAssignmentActivity.type : 'word_cloud';
  // One label per line is the whole authoring story for slots. A suffix such
  // as "Tue 3:15pm x 2" gives that option two seats; a bare line gets one.
  const pollOptions = String(sharedAssignmentActivity.optionsText || '').split(/\r?\n/).map(line => line.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)).filter(Boolean).slice(0, 50).map((label, index) => {
    const seats = label.match(/\s+x\s*(\d{1,3})\s*$/i);
    const capacity = seats ? Math.max(1, Math.min(500, parseInt(seats[1], 10))) : 1;
    const clean = seats ? label.slice(0, seats.index).trim() : label;
    return {
      id: `o${index + 1}`,
      label: clean,
      capacity
    };
  });
  const ratingMin = Math.max(1, Math.min(9, Math.trunc(Number(sharedAssignmentActivity.minValue) || 1)));
  const ratingMax = Math.max(ratingMin + 1, Math.min(10, Math.trunc(Number(sharedAssignmentActivity.maxValue) || 5)));
  const ratingLabels = Array.from({
    length: ratingMax - ratingMin + 1
  }, (_, index) => String(Array.isArray(sharedAssignmentActivity.labels) ? sharedAssignmentActivity.labels[index] || '' : '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40));
  // Survey rows are shaped here, then the server revalidates them and creates
  // item and option ids. Likert labels remain positional.
  const surveyWireItems = sharedAssignmentActivity?.type === 'survey' ? (Array.isArray(sharedAssignmentActivity.surveyItems) ? sharedAssignmentActivity.surveyItems : []).map(surveyItem => {
    const text = String(surveyItem?.text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (!text) return null;
    const kind = ['likert', 'choice', 'freetext', 'numeric'].indexOf(surveyItem?.type) >= 0 ? surveyItem.type : 'likert';
    const entry = {
      type: kind,
      text,
      required: surveyItem?.required === true
    };
    if (kind === 'likert') {
      const steps = Math.max(2, Math.min(10, Math.trunc(Number(surveyItem?.steps) || 5)));
      const low = String(surveyItem?.lowLabel ?? 'Strongly disagree').trim().slice(0, 60);
      const high = String(surveyItem?.highLabel ?? 'Strongly agree').trim().slice(0, 60);
      const fullLabels = Array.isArray(surveyItem?.labels) ? surveyItem.labels.map(label => String(label == null ? '' : label).trim().slice(0, 60)) : null;
      if (fullLabels && fullLabels.length === steps && steps >= 2) {
        entry.steps = steps;
        entry.labels = [low, ...fullLabels.slice(1, -1), high];
      } else {
        entry.steps = steps;
        entry.labels = Array.from({
          length: steps
        }, (_, at) => at === 0 ? low : at === steps - 1 ? high : '');
      }
    } else if (kind === 'choice') {
      entry.options = String(surveyItem?.optionsText || '').split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim().slice(0, 80)).filter(Boolean).slice(0, 12).map(label => ({
        label
      }));
      if (entry.options.length < 2) return null;
    } else if (kind === 'numeric') {
      const min = Number(surveyItem?.min);
      const max = Number(surveyItem?.max);
      if (isFinite(min)) entry.min = min;
      if (isFinite(max)) entry.max = max;
    }
    return entry;
  }).filter(Boolean).slice(0, 12) : [];
  const sharedActivity = includeSharedActivity && sharedAssignmentActivity.enabled ? stripUndefined({
    v: 1,
    activityId: 'AC-' + generateUUID(),
    type: sharedActivityType,
    delivery: 'shared_async',
    prompt: String(sharedAssignmentActivity.prompt || '').replace(/\s+/g, ' ').trim().slice(0, 240) || (sharedActivityType === 'rating' ? 'How would you rate your understanding?' : sharedActivityType === 'availability' ? 'Which of these times could you make?' : sharedActivityType === 'signup' ? 'Choose a time that works for you' : 'What word or short phrase best captures your thinking?'),
    minParticipants: Math.max(3, Math.min(10, Number(sharedAssignmentActivity.minParticipants) || 3)),
    revealPolicy: sharedActivityType === 'word_cloud' ? sharedAssignmentActivity.revealPolicy === 'auto_publish' ? 'auto_publish' : 'teacher_review' : undefined,
    minValue: sharedActivityType === 'rating' ? ratingMin : undefined,
    maxValue: sharedActivityType === 'rating' ? ratingMax : undefined,
    labels: sharedActivityType === 'rating' ? ratingLabels : undefined,
    identityMode: sharedActivityType === 'availability' || sharedActivityType === 'signup' || sharedActivityType === 'survey' ? String(sharedAssignmentActivity.identityMode || '') : undefined,
    options: sharedActivityType === 'availability' || sharedActivityType === 'signup' ? pollOptions : undefined,
    items: sharedActivityType === 'survey' ? surveyWireItems : undefined,
    info: sharedActivityType === 'survey' ? String(sharedAssignmentActivity.surveyInfo || '').replace(/\s+/g, ' ').trim().slice(0, 600) || undefined : undefined,
    allowMaybe: sharedActivityType === 'availability' ? sharedAssignmentActivity.allowMaybe !== false : undefined,
    multiSelect: sharedActivityType === 'availability' ? sharedAssignmentActivity.multiSelect !== false : undefined,
    maxPerPerson: sharedActivityType === 'signup' ? Math.max(1, Math.min(10, Number(sharedAssignmentActivity.maxPerPerson) || 1)) : undefined,
    // Voting closes when the assignment link does; rows are erased one
    // week later because collection and retention are separate events.
    closesAt: sharedActivityType === 'availability' || sharedActivityType === 'signup' || sharedActivityType === 'survey' ? expiresAt : undefined,
    deleteAt: sharedActivityType === 'availability' || sharedActivityType === 'signup' || sharedActivityType === 'survey' ? new Date(Date.parse(expiresAt) + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined
  }) : null;
  if (sharedActivity && sharedActivity.type === 'survey') {
    if (!surveyWireItems.length) {
      addToast('Add at least one survey question first.', 'info');
      return null;
    }
    if (!sharedActivity.identityMode) {
      addToast('Pick who is answering before you share this survey.', 'info');
      return null;
    }
  }
  const sharedActivities = sharedActivity ? [sharedActivity] : [];
  const packet = stripUndefined({
    v: 1,
    kind: 'assignment',
    title,
    createdAt: new Date().toISOString(),
    expiresAt,
    currentResourceId: resources[0]?.id || null,
    resources,
    aiPolicy: {
      studentAi: studentAiPolicyForShare,
      defaultStudentAi: 'off',
      teacherPrepared: true
    },
    workStory: workStoryEnabled === true,
    sharedActivities: sharedActivities.length ? sharedActivities : undefined
  });
  const encoded = await encodeAlloPack(JSON.stringify(packet));
  return {
    encoded,
    title,
    count: resources.length,
    resourceTitles: resources.map(item => item.title || item.type || 'Untitled resource'),
    createdAt: packet.createdAt,
    expiresAt: packet.expiresAt,
    aiPolicy: studentAiPolicyForShare,
    sharedActivities
  };
}
function _alloNextSharedActivitySummaryOrder(currentValue, result, requestSequence, requestScope, activeScope) {
  if (!result || typeof result !== 'object') return null;
  const scope = String(requestScope || '');
  if (!scope || scope !== String(activeScope || '')) return null;
  const previous = currentValue && typeof currentValue === 'object' ? currentValue : null;
  const current = previous && previous.scope === scope ? previous : {
    scope,
    sequence: 0,
    version: -1
  };
  const sequence = Number.isFinite(Number(requestSequence)) ? Number(requestSequence) : 0;
  const hasVersion = result.version !== undefined && result.version !== null && Number.isFinite(Number(result.version));
  const version = hasVersion ? Number(result.version) : -1;
  // Server version is authoritative. For equal or unversioned results,
  // request order breaks ties so a slower poll cannot undo a submission or
  // moderation response that has already reached the panel.
  if (hasVersion && version < current.version) return null;
  if (hasVersion && version === current.version && sequence < current.sequence) return null;
  if (!hasVersion && current.version >= 0) return null;
  if (!hasVersion && sequence < current.sequence) return null;
  return {
    scope,
    sequence,
    version: hasVersion ? version : current.version
  };
}

// ── Shared-activity credentials, one per RESPONDENT (not per device) ──────
// A device may be handed round a staffroom or a classroom. Keeping a single
// credential per activity meant the second person to answer inherited the
// first person's identity and overwrote their row. These helpers keep a map
// of credentials so each respondent gets their own, and are pure so they can
// be tested without React or a network.
const ALLO_ACTIVITY_CRED_VERSION = 2;

// Accepts the legacy v1 shape ({uid, pt}) and migrates it into slot "s1", so
// an in-flight respondent is never logged out by the upgrade.
function alloNormalizeCredentialStore(raw) {
  let parsed = raw;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (_) {
      parsed = null;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {
    v: ALLO_ACTIVITY_CRED_VERSION,
    active: '',
    slots: {}
  };
  if (parsed.uid && parsed.pt) {
    return {
      v: ALLO_ACTIVITY_CRED_VERSION,
      active: 's1',
      slots: {
        s1: {
          uid: String(parsed.uid),
          pt: String(parsed.pt),
          label: ''
        }
      }
    };
  }
  const slots = {};
  const rawSlots = parsed.slots && typeof parsed.slots === 'object' && !Array.isArray(parsed.slots) ? parsed.slots : {};
  Object.keys(rawSlots).forEach(key => {
    const slot = rawSlots[key];
    if (!slot || !slot.uid || !slot.pt) return;
    slots[key] = {
      uid: String(slot.uid),
      pt: String(slot.pt),
      label: String(slot.label || '')
    };
  });
  const active = slots[parsed.active] ? String(parsed.active) : Object.keys(slots)[0] || '';
  return {
    v: ALLO_ACTIVITY_CRED_VERSION,
    active,
    slots
  };
}

// A named respondent keys on their own name so returning to edit finds their
// row. Anonymous cannot: linking a return visit to an earlier row is exactly
// the linkage that mode promises not to keep, so each start is a new slot.
function alloCredentialSlotKey(identityMode, label, store) {
  const cleaned = String(label || '').trim().toLowerCase().slice(0, 40);
  if (identityMode !== 'anonymous' && cleaned) return 'n:' + cleaned;
  const taken = store && store.slots ? store.slots : {};
  let n = 1;
  while (taken['s' + n]) n++;
  return 's' + n;
}
function alloCredentialStoreWith(store, slotKey, credential, label) {
  const base = alloNormalizeCredentialStore(store);
  const slots = Object.assign({}, base.slots);
  slots[slotKey] = {
    uid: String(credential.uid),
    pt: String(credential.pt),
    label: String(label || '')
  };
  return {
    v: ALLO_ACTIVITY_CRED_VERSION,
    active: slotKey,
    slots
  };
}
function alloActiveCredential(store) {
  const base = alloNormalizeCredentialStore(store);
  const slot = base.slots[base.active];
  return slot && slot.uid && slot.pt ? {
    uid: slot.uid,
    pt: slot.pt,
    label: slot.label
  } : null;
}

// Who has already answered on THIS device, so the client can offer "continue
// as Sam instead of assuming the person holding it is whoever typed last.
function alloCredentialRoster(store) {
  const base = alloNormalizeCredentialStore(store);
  return Object.keys(base.slots).map(key => ({
    key,
    label: base.slots[key].label,
    active: key === base.active
  }));
}
const SharedAssignmentActivityPanel = React.memo(function SharedAssignmentActivityPanel({
  activity,
  mailbox,
  admin = '',
  mode = 'student',
  addToast = () => {}
}) {
  const isTeacher = mode === 'teacher';
  // A question_board is a different surface on the same sidecar. Branching
  // here rather than at the call sites means both places that already open
  // this panel support boards without either being touched.
  const isQuestionBoard = activity?.type === 'question_board';
  const isPoll = activity?.type === 'availability';
  const isSignup = activity?.type === 'signup';
  const isSurvey = activity?.type === 'survey';
  const [signupClaims, setSignupClaims] = React.useState([]);
  const [signupName, setSignupName] = React.useState('');
  const ratingActivity = _alloNormalizeSharedRatingActivity(activity);
  const effectiveActivity = ratingActivity || activity;
  const activityMeta = _alloSharedActivityUiMeta(effectiveActivity);
  const isRating = activityMeta.isRating;
  const packId = String(mailbox?.id || '');
  const activityId = String(effectiveActivity?.activityId || '');
  const activityScope = `${packId}:${activityId}`;
  const mailboxUrl = String(mailbox?.url || '');
  const packSecret = String(mailbox?.secret || '');
  const credentialRef = React.useRef(null);
  const activeActivityScopeRef = React.useRef(activityScope);
  const requestSequenceRef = React.useRef(0);
  const lastAppliedSummaryRef = React.useRef({
    scope: activityScope,
    sequence: 0,
    version: -1
  });
  const [summary, setSummary] = React.useState(null);
  const [term, setTerm] = React.useState('');
  const [ratingValue, setRatingValue] = React.useState(null);
  // Availability poll. Declared here with every other hook: the type-based
  // dispatch lower down is deliberately placed after all hooks, and adding
  // state below it would change hook order when the activity type changes.
  const [pollPicks, setPollPicks] = React.useState({});
  const [pollName, setPollName] = React.useState('');
  // Survey: one answers map across all items, plus the respondent's name
  // for real_name mode. Declared with every other hook (see note above).
  const [surveyAnswers, setSurveyAnswers] = React.useState({});
  const [surveyName, setSurveyName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState(0);
  activeActivityScopeRef.current = activityScope;
  const storageKey = `allo_shared_activity_v1:${packId}:${activityId}`;
  React.useEffect(() => {
    credentialRef.current = null;
    lastAppliedSummaryRef.current = {
      scope: activityScope,
      sequence: 0,
      version: -1
    };
    setSummary(null);
    setTerm('');
    setRatingValue(null);
    setSurveyAnswers({});
    setSurveyName('');
    setError('');
    setBusy(false);
    setLastUpdatedAt(0);
  }, [activityScope]);

  // Writes into the respondent MAP, never over it, so one person answering
  // does not evict another who used the same device.
  const rememberCredential = React.useCallback((credential, slotKey, label) => {
    credentialRef.current = credential;
    try {
      const next = alloCredentialStoreWith(localStorage.getItem(storageKey), slotKey, credential, label);
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (_) {}
    return credential;
  }, [storageKey]);

  // "Someone else is answering": mint a FRESH identity rather than reusing
  // whatever is cached. The server issues a new uid per join, so this is the
  // whole fix.
  const startNewRespondent = React.useCallback(async (identityMode, label) => {
    credentialRef.current = null;
    let store = null;
    try {
      store = alloNormalizeCredentialStore(localStorage.getItem(storageKey));
    } catch (_) {}
    const slotKey = alloCredentialSlotKey(identityMode, label, store);
    const existing = store && store.slots ? store.slots[slotKey] : null;
    if (existing && existing.uid && existing.pt) {
      // A named respondent returning to change their answer keeps their
      // row instead of appearing twice in the tally.
      credentialRef.current = {
        uid: existing.uid,
        pt: existing.pt
      };
      try {
        const reactivated = alloCredentialStoreWith(localStorage.getItem(storageKey), slotKey, existing, label || existing.label);
        localStorage.setItem(storageKey, JSON.stringify(reactivated));
      } catch (_) {}
      return credentialRef.current;
    }
    const joined = await _alloMailboxCallWithRetry(mailboxUrl, {
      a: 'joinactivity',
      id: packId,
      k: packSecret,
      aid: activityId
    });
    return rememberCredential({
      uid: joined.uid,
      pt: joined.pt
    }, slotKey, label);
  }, [activityId, mailboxUrl, packId, packSecret, rememberCredential, storageKey]);
  const clearCredential = React.useCallback(() => {
    credentialRef.current = null;
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {}
  }, [storageKey]);
  const ensureCredential = React.useCallback(async () => {
    if (isTeacher) return null;
    const current = credentialRef.current;
    if (current?.uid && current?.pt) return current;
    try {
      const saved = alloActiveCredential(localStorage.getItem(storageKey));
      if (saved) {
        credentialRef.current = saved;
        return saved;
      }
    } catch (_) {}
    const joined = await _alloMailboxCallWithRetry(mailboxUrl, {
      a: 'joinactivity',
      id: packId,
      k: packSecret,
      aid: activityId
    });
    return rememberCredential({
      uid: joined.uid,
      pt: joined.pt
    }, 's1', '');
  }, [activityId, isTeacher, mailboxUrl, packId, packSecret, rememberCredential, storageKey]);
  const callStudentUpdate = React.useCallback(async payload => {
    let credential = await ensureCredential();
    const send = current => _alloMailboxCallWithRetry(mailboxUrl, {
      a: 'activityupsert',
      id: packId,
      aid: activityId,
      uid: current.uid,
      pt: current.pt,
      ...payload
    });
    try {
      return await send(credential);
    } catch (requestError) {
      if (!String(requestError?.code || '').includes('denied')) throw requestError;
      clearCredential();
      credential = await ensureCredential();
      return send(credential);
    }
  }, [activityId, clearCredential, ensureCredential, mailboxUrl, packId]);
  const applySharedActivitySummary = React.useCallback((result, requestSequence, requestScope) => {
    const nextOrder = _alloNextSharedActivitySummaryOrder(lastAppliedSummaryRef.current, result, requestSequence, requestScope, activeActivityScopeRef.current);
    if (!nextOrder) return false;
    lastAppliedSummaryRef.current = nextOrder;
    setSummary(result);
    setLastUpdatedAt(Date.now());
    return true;
  }, []);
  const refresh = React.useCallback(async ({
    quiet = false,
    retryCredential = true
  } = {}) => {
    if (!mailboxUrl || !packId || !activityId) return null;
    const requestSequence = ++requestSequenceRef.current;
    if (!quiet) setBusy(true);
    try {
      let result;
      if (isTeacher) {
        result = await _alloMailboxCallWithRetry(mailboxUrl, {
          a: 'getactivityadmin',
          admin,
          id: packId,
          aid: activityId
        });
      } else {
        const credential = await ensureCredential();
        try {
          result = await _alloMailboxCallWithRetry(mailboxUrl, {
            a: 'getactivitysummary',
            id: packId,
            aid: activityId,
            uid: credential.uid,
            pt: credential.pt
          });
        } catch (requestError) {
          if (!retryCredential || !String(requestError?.code || '').includes('denied')) throw requestError;
          clearCredential();
          const retry = await ensureCredential();
          result = await _alloMailboxCallWithRetry(mailboxUrl, {
            a: 'getactivitysummary',
            id: packId,
            aid: activityId,
            uid: retry.uid,
            pt: retry.pt
          });
        }
      }
      const applied = applySharedActivitySummary(result, requestSequence, activityScope);
      if (applied) {
        if (result?.own?.text) setTerm(current => current || result.own.text);
        if (Number.isInteger(result?.own?.value)) setRatingValue(current => current == null ? result.own.value : current);
        setError('');
      }
      return result;
    } catch (requestError) {
      const currentOrder = lastAppliedSummaryRef.current || {
        sequence: 0
      };
      if (!quiet && activeActivityScopeRef.current === activityScope && requestSequence >= currentOrder.sequence) {
        setError(`The ${activityMeta.title.toLowerCase()} could not update. Check the connection and try again.`);
      }
      return null;
    } finally {
      if (!quiet && activeActivityScopeRef.current === activityScope) setBusy(false);
    }
  }, [activityId, activityScope, admin, applySharedActivitySummary, clearCredential, ensureCredential, isTeacher, mailboxUrl, packId]);
  React.useEffect(() => {
    let cancelled = false;
    let timer = null;
    const tick = async quiet => {
      if (cancelled) return;
      await refresh({
        quiet
      });
      if (cancelled) return;
      const hidden = typeof document !== 'undefined' && document.hidden;
      timer = setTimeout(() => tick(true), hidden ? 60000 : 15000);
    };
    tick(false);
    const wake = () => {
      if (cancelled || typeof document !== 'undefined' && document.hidden) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => tick(true), 250);
    };
    try {
      document.addEventListener('visibilitychange', wake);
    } catch (_) {}
    try {
      window.addEventListener('online', wake);
    } catch (_) {}
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try {
        document.removeEventListener('visibilitychange', wake);
      } catch (_) {}
      try {
        window.removeEventListener('online', wake);
      } catch (_) {}
    };
  }, [refresh]);
  const submitTerm = async event => {
    event?.preventDefault?.();
    if (busy) return;
    const polling = window.AlloModules?.LivePolling;
    const normalized = polling?.normalizeWordCloudTerm ? polling.normalizeWordCloudTerm(term) : String(term || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!normalized) {
      setError('Enter one word or a short phrase first.');
      return;
    }
    setBusy(true);
    const requestSequence = ++requestSequenceRef.current;
    try {
      const result = await callStudentUpdate({
        term: normalized
      });
      if (applySharedActivitySummary(result, requestSequence, activityScope)) {
        setTerm(result?.own?.text || normalized);
        setError('');
      }
      addToast(result?.own?.status === 'approved' ? 'Your word is now part of the anonymous class cloud.' : 'Your word was saved and is waiting for teacher review.', 'success');
    } catch (requestError) {
      if (activeActivityScopeRef.current === activityScope) {
        setError('Your word was not saved. Check the connection and use Save again.');
      }
    } finally {
      if (activeActivityScopeRef.current === activityScope) setBusy(false);
    }
  };
  const submitRating = async event => {
    event?.preventDefault?.();
    if (busy) return;
    if (!Number.isInteger(ratingValue) || ratingValue < ratingActivity.minValue || ratingValue > ratingActivity.maxValue) {
      setError('Choose one rating before saving.');
      return;
    }
    setBusy(true);
    const requestSequence = ++requestSequenceRef.current;
    try {
      const result = await callStudentUpdate({
        value: ratingValue
      });
      if (applySharedActivitySummary(result, requestSequence, activityScope)) {
        setRatingValue(Number.isInteger(result?.own?.value) ? result.own.value : ratingValue);
        setError('');
      }
      addToast('Your rating was saved anonymously. You can update it while the assignment is open.', 'success');
    } catch (requestError) {
      if (activeActivityScopeRef.current === activityScope) {
        setError('Your rating was not saved. Check the connection and use Save again.');
      }
    } finally {
      if (activeActivityScopeRef.current === activityScope) setBusy(false);
    }
  };
  const moderate = async (uid, status) => {
    if (!isTeacher || isRating || !uid || busy) return;
    setBusy(true);
    try {
      await _alloMailboxCallWithRetry(mailboxUrl, {
        a: 'moderateactivity',
        admin,
        id: packId,
        aid: activityId,
        uid,
        status
      });
      const refreshed = await refresh({
        quiet: true
      });
      if (activeActivityScopeRef.current === activityScope) {
        setError(refreshed ? '' : 'That change saved, but the moderation list could not refresh. Check the connection and refresh again.');
      }
    } catch (requestError) {
      if (activeActivityScopeRef.current === activityScope) {
        setError('That moderation change did not save. Please try again.');
      }
    } finally {
      if (activeActivityScopeRef.current === activityScope) setBusy(false);
    }
  };
  const terms = Array.isArray(summary?.terms) ? summary.terms : [];
  const distribution = Array.isArray(summary?.distribution) ? summary.distribution : [];
  const responses = Array.isArray(summary?.responses) ? summary.responses : [];
  const renderer = window.AlloModules?.LivePolling?.renderWordCloudItems;
  const ownStatus = summary?.own?.status;
  const ratingLabel = value => {
    if (!Number.isInteger(value) || !ratingActivity) return '';
    return ratingActivity.labels[value - ratingActivity.minValue] || String(value);
  };
  const statusText = isRating ? ownStatus === 'recorded' && Number.isInteger(summary?.own?.value) ? `Saved anonymously: ${summary.own.value}${ratingLabel(summary.own.value) !== String(summary.own.value) ? ` · ${ratingLabel(summary.own.value)}` : ''}` : 'Choose one rating, then save it.' : ownStatus === 'approved' ? 'Published anonymously' : ownStatus === 'hidden' ? 'Hidden by your teacher' : ownStatus === 'pending' ? 'Waiting for teacher review' : '';
  const heldCount = responses.filter(row => row.status === 'pending').length;
  const approvedCount = responses.filter(row => row.status === 'approved').length;
  const hiddenCount = responses.filter(row => row.status === 'hidden').length;
  const ratingValues = ratingActivity ? Array.from({
    length: ratingActivity.maxValue - ratingActivity.minValue + 1
  }, (_, index) => ratingActivity.minValue + index) : [];
  const threshold = summary?.minParticipants || effectiveActivity?.minParticipants || 3;

  // Deliberately placed AFTER every hook in this component. An early return
  // higher up would change hook order when the activity type changes and
  // crash the panel - the render-crash class this repo has been bitten by.
  if (isQuestionBoard) {
    return /*#__PURE__*/React.createElement(AlloQuestionBoardPanel, {
      activity: activity,
      mailbox: mailbox,
      admin: admin,
      mode: mode,
      addToast: addToast
    });
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white p-4 text-left",
    "aria-label": `Shared ${activityMeta.title.toLowerCase()}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-xs font-black text-white",
    "aria-hidden": "true"
  }, activityMeta.shortLabel), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-black text-slate-900"
  }, activityMeta.title), /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-sky-800"
  }, "Shared assignment"), isRating && /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-800"
  }, "Not scored")), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm font-bold leading-snug text-slate-800"
  }, effectiveActivity?.prompt || summary?.prompt), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] leading-relaxed text-slate-600"
  }, isRating ? 'Anonymous class totals update while this assignment is open. Ratings are formative and never marked correct or incorrect.' : 'Anonymous class totals update while this assignment is open. The teacher does not need to be logged in.'))), !isTeacher && isRating && /*#__PURE__*/React.createElement("form", {
    onSubmit: submitRating,
    className: "mt-4 rounded-xl border border-sky-100 bg-white p-3"
  }, /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", {
    className: "block text-xs font-black text-slate-800"
  }, "Your rating"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 grid gap-2",
    style: {
      gridTemplateColumns: `repeat(${Math.min(ratingValues.length, 5)}, minmax(0, 1fr))`
    }
  }, ratingValues.map(value => {
    const label = ratingLabel(value);
    const selected = ratingValue === value;
    return /*#__PURE__*/React.createElement("label", {
      key: value,
      className: `flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border-2 px-2 py-2 text-center transition-colors ${selected ? 'border-violet-600 bg-violet-50 text-violet-950' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'}`
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: `shared-rating-${activityId}`,
      value: value,
      checked: selected,
      onChange: () => {
        setRatingValue(value);
        setError('');
      },
      className: "sr-only"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-base font-black"
    }, value), label !== String(value) && /*#__PURE__*/React.createElement("span", {
      className: "mt-0.5 text-[10px] font-bold leading-tight"
    }, label));
  }))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: busy || !Number.isInteger(ratingValue),
    className: "mt-3 min-h-11 w-full rounded-lg bg-violet-700 px-4 py-2 text-sm font-black text-white hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60"
  }, busy ? 'Saving...' : summary?.own ? 'Update my rating' : 'Save my rating'), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[11px] font-bold text-slate-600"
  }, statusText)), isPoll && !isTeacher && /*#__PURE__*/React.createElement("form", {
    className: "mt-4 rounded-xl border border-sky-100 bg-white p-3",
    onSubmit: async event => {
      event.preventDefault();
      if (busy) return;
      const marks = {};
      (summary?.options || []).forEach(opt => {
        if (pollPicks[opt.id]) marks[opt.id] = pollPicks[opt.id];
      });
      if (!Object.keys(marks).length) {
        addToast('Mark at least one option first.', 'info');
        return;
      }
      if (summary?.identityMode === 'real_name' && !pollName.trim()) {
        addToast('Add your name so the organizer knows who can make it.', 'info');
        return;
      }
      try {
        await callStudentUpdate({
          picks: marks,
          nm: summary?.identityMode === 'real_name' ? pollName.trim().slice(0, 40) : ''
        });
        addToast('Your availability was saved. You can change it until the poll closes.', 'success');
      } catch (submitError) {
        addToast('That did not save: ' + (submitError && submitError.message || 'unknown'), 'error');
      }
    }
  }, /*#__PURE__*/React.createElement("fieldset", {
    disabled: busy || summary?.closed
  }, /*#__PURE__*/React.createElement("legend", {
    className: "block text-xs font-black text-slate-800"
  }, summary?.closed ? 'This poll has closed' : 'Which of these could you make?'), summary?.identityMode === 'real_name' && /*#__PURE__*/React.createElement("label", {
    className: "mt-2 block text-[11px] font-black text-slate-700"
  }, "Your name", /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: pollName,
    onChange: event => setPollName(event.target.value.slice(0, 40)),
    className: "mt-1 w-full rounded-md border border-sky-300 px-2 py-1.5 text-xs font-semibold text-slate-800"
  })), summary?.identityMode === 'anonymous' && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] font-bold text-slate-600"
  }, "You are answering anonymously. The organizer sees totals only."), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2"
  }, (summary?.options || []).map(opt => /*#__PURE__*/React.createElement("div", {
    key: opt.id,
    className: "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-800"
  }, opt.label), /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": opt.label,
    className: "flex gap-1"
  }, ['yes', summary?.allowMaybe === false ? null : 'maybe', 'no'].filter(Boolean).map(mark => /*#__PURE__*/React.createElement("button", {
    key: mark,
    type: "button",
    "aria-pressed": pollPicks[opt.id] === mark,
    onClick: () => setPollPicks(previous => {
      const next = {
        ...previous
      };
      // Single-choice polls behave like a radio group: one yes,
      // and choosing another moves it rather than adding a second.
      if (summary?.multiSelect === false && mark === 'yes') {
        Object.keys(next).forEach(key => {
          if (next[key] === 'yes') delete next[key];
        });
      }
      next[opt.id] = mark;
      return next;
    }),
    className: `rounded-md px-2 py-1 text-[11px] font-black ${pollPicks[opt.id] === mark ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700'}`
  }, mark === 'yes' ? 'Yes' : mark === 'maybe' ? 'Maybe' : 'No')))))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "mt-3 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
  }, busy ? 'Saving...' : 'Save my availability'))), isPoll && isTeacher && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-xl border border-sky-100 bg-white p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-black text-slate-800"
  }, summary?.participantCount || 0, " ", summary?.participantCount === 1 ? 'response' : 'responses', summary?.closed ? ' - closed' : ''), !(summary?.tally || []).length && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[11px] font-bold text-slate-600"
  }, summary?.identityMode === 'anonymous' ? `Totals appear once ${summary?.minParticipants || 3} people have answered, so no single answer can be picked out.` : 'No responses yet.'), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 space-y-1"
  }, (summary?.tally || []).map(opt => {
    const isBest = (summary?.best || []).indexOf(opt.id) >= 0;
    return /*#__PURE__*/React.createElement("div", {
      key: opt.id,
      className: `flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${isBest ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'bg-slate-50'}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold text-slate-800"
    }, opt.label, isBest ? ' - best so far' : ''), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-black text-slate-700"
    }, opt.yes, " yes / ", opt.maybe, " maybe / ", opt.no, " no"));
  })), (summary?.best || []).length > 1 && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[11px] font-bold text-amber-700"
  }, "Those options are tied. Pick whichever suits you."), !!(summary?.rows || []).length && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-left text-[11px]"
  }, /*#__PURE__*/React.createElement("caption", {
    className: "sr-only"
  }, "Who chose what"), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "px-2 py-1 font-black text-slate-700"
  }, "Name"), (summary?.options || []).map(opt => /*#__PURE__*/React.createElement("th", {
    key: opt.id,
    scope: "col",
    className: "px-2 py-1 font-black text-slate-700"
  }, opt.label)))), /*#__PURE__*/React.createElement("tbody", null, (summary?.rows || []).map((row, index) => /*#__PURE__*/React.createElement("tr", {
    key: `${row.label}-${index}`,
    className: "border-t border-slate-200"
  }, /*#__PURE__*/React.createElement("th", {
    scope: "row",
    className: "px-2 py-1 font-bold text-slate-800"
  }, row.label || 'Someone'), (summary?.options || []).map(opt => /*#__PURE__*/React.createElement("td", {
    key: opt.id,
    className: "px-2 py-1 text-slate-700"
  }, row.picks?.[opt.id] === 'yes' ? 'Yes' : row.picks?.[opt.id] === 'maybe' ? 'Maybe' : row.picks?.[opt.id] === 'no' ? 'No' : '-')))))))), isSurvey && !isTeacher && /*#__PURE__*/React.createElement("form", {
    className: "mt-4 rounded-xl border border-sky-100 bg-white p-3",
    onSubmit: async event => {
      event.preventDefault();
      if (busy) return;
      const formItems = summary?.items && summary.items.length ? summary.items : effectiveActivity?.items || [];
      const payload = {};
      formItems.forEach(formItem => {
        const value = surveyAnswers[formItem.id];
        if (value !== undefined && value !== null && String(value).trim() !== '') payload[formItem.id] = value;
      });
      const missing = formItems.filter(formItem => formItem.required && payload[formItem.id] === undefined);
      if (missing.length) {
        addToast('Answer the required questions first: ' + missing.map(formItem => formItem.text).join(' · '), 'info');
        return;
      }
      if (!Object.keys(payload).length) {
        addToast('Answer at least one question first.', 'info');
        return;
      }
      if (summary?.identityMode === 'real_name' && !surveyName.trim()) {
        addToast('Add your name so the organizer knows who answered.', 'info');
        return;
      }
      try {
        await callStudentUpdate({
          answers: JSON.stringify(payload),
          nm: summary?.identityMode === 'real_name' ? surveyName.trim().slice(0, 40) : ''
        });
        addToast('Your answers were saved. You can change them until this closes.', 'success');
      } catch (submitError) {
        addToast('That did not save: ' + (submitError && submitError.message || 'unknown'), 'error');
      }
    }
  }, /*#__PURE__*/React.createElement("fieldset", {
    disabled: busy || summary?.closed
  }, /*#__PURE__*/React.createElement("legend", {
    className: "block text-xs font-black text-slate-800"
  }, summary?.closed ? 'This survey has closed' : 'A few quick questions'), (summary?.info || effectiveActivity?.info) && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] leading-relaxed text-slate-700"
  }, String(summary?.info || effectiveActivity?.info).slice(0, 600)), summary?.identityMode === 'real_name' && /*#__PURE__*/React.createElement("label", {
    className: "mt-2 block text-[11px] font-black text-slate-700"
  }, "Your name", /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: surveyName,
    onChange: event => setSurveyName(event.target.value.slice(0, 40)),
    className: "mt-1 w-full rounded-md border border-sky-300 px-2 py-1.5 text-xs font-semibold text-slate-800"
  })), summary?.identityMode === 'anonymous' && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] font-bold text-slate-600"
  }, "You are answering anonymously. The organizer sees combined results only."), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-3"
  }, (summary?.items && summary.items.length ? summary.items : effectiveActivity?.items || []).map(formItem => /*#__PURE__*/React.createElement("div", {
    key: formItem.id,
    className: "rounded-lg border border-slate-200 px-2 py-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-800"
  }, formItem.text, formItem.required && /*#__PURE__*/React.createElement("span", {
    className: "ml-1 text-rose-600",
    title: "Required"
  }, "*")), formItem.type === 'likert' && /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": formItem.text,
    className: "flex flex-wrap gap-1"
  }, Array.from({
    length: formItem.steps || 5
  }, (_, at) => at + 1).map(tick => /*#__PURE__*/React.createElement("button", {
    key: tick,
    type: "button",
    "aria-pressed": surveyAnswers[formItem.id] === tick,
    onClick: () => setSurveyAnswers(previous => ({
      ...previous,
      [formItem.id]: tick
    })),
    className: `min-h-9 min-w-9 rounded-md px-2 py-1 text-xs font-black ${surveyAnswers[formItem.id] === tick ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700'}`
  }, tick))), ((formItem.labels || [])[0] || (formItem.labels || [])[(formItem.steps || 5) - 1]) && /*#__PURE__*/React.createElement("div", {
    className: "mt-1 flex justify-between text-[10px] font-bold text-slate-500"
  }, /*#__PURE__*/React.createElement("span", null, (formItem.labels || [])[0] || ''), /*#__PURE__*/React.createElement("span", null, (formItem.labels || [])[(formItem.steps || 5) - 1] || ''))), formItem.type === 'choice' && /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": formItem.text,
    className: "mt-2 flex flex-col gap-1"
  }, (formItem.options || []).map(option => /*#__PURE__*/React.createElement("button", {
    key: option.id,
    type: "button",
    "aria-pressed": surveyAnswers[formItem.id] === option.id,
    onClick: () => setSurveyAnswers(previous => ({
      ...previous,
      [formItem.id]: option.id
    })),
    className: `rounded-md px-2 py-1.5 text-left text-xs font-bold ${surveyAnswers[formItem.id] === option.id ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700'}`
  }, option.label))), formItem.type === 'freetext' && /*#__PURE__*/React.createElement("textarea", {
    "aria-label": formItem.text,
    value: String(surveyAnswers[formItem.id] || ''),
    onChange: event => setSurveyAnswers(previous => ({
      ...previous,
      [formItem.id]: event.target.value.slice(0, 500)
    })),
    rows: 2,
    maxLength: 500,
    className: "mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800"
  }), formItem.type === 'numeric' && /*#__PURE__*/React.createElement("input", {
    type: "number",
    "aria-label": formItem.text,
    value: surveyAnswers[formItem.id] ?? '',
    min: formItem.min ?? undefined,
    max: formItem.max ?? undefined,
    onChange: event => setSurveyAnswers(previous => ({
      ...previous,
      [formItem.id]: event.target.value === '' ? undefined : Number(event.target.value)
    })),
    className: "mt-2 w-32 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800"
  })))), summary?.own && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[11px] font-bold text-emerald-700"
  }, "Your answers are recorded. Submitting again replaces them."), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "mt-3 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
  }, busy ? 'Saving...' : summary?.own ? 'Update my answers' : 'Send my answers'))), isSurvey && isTeacher && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-xl border border-sky-100 bg-white p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-black text-slate-800"
  }, summary?.participantCount || 0, " ", summary?.participantCount === 1 ? 'response' : 'responses', summary?.closed ? ' - closed' : ''), !summary?.revealed && summary?.identityMode === 'anonymous' && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[11px] font-bold text-slate-600"
  }, `Results appear once ${summary?.minParticipants || 3} people have answered, so no single answer can be picked out.`), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 space-y-2"
  }, (summary?.items || []).map(resultItem => /*#__PURE__*/React.createElement("div", {
    key: resultItem.id,
    className: "rounded-lg border border-slate-200 px-2 py-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-800"
  }, resultItem.text), resultItem.aggregate && resultItem.type === 'likert' && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] font-black text-slate-700"
  }, `Mean ${resultItem.aggregate.mean ?? '-'} of ${resultItem.steps} · ` + (resultItem.aggregate.counts || []).map((tickCount, at) => `${at + 1}: ${tickCount}`).join('  ')), resultItem.aggregate && resultItem.type === 'choice' && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] font-black text-slate-700"
  }, (resultItem.options || []).map(option => `${option.label}: ${(resultItem.aggregate.counts || {})[option.id] || 0}`).join('  ·  ')), resultItem.aggregate && resultItem.type === 'numeric' && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] font-black text-slate-700"
  }, `n ${resultItem.aggregate.n} · mean ${resultItem.aggregate.mean ?? '-'} · min ${resultItem.aggregate.min ?? '-'} · max ${resultItem.aggregate.max ?? '-'}`), resultItem.type === 'freetext' && Array.isArray(resultItem.texts) && /*#__PURE__*/React.createElement("ul", {
    className: "mt-1 list-disc pl-4 text-[11px] text-slate-700"
  }, resultItem.texts.map((answerText, at) => /*#__PURE__*/React.createElement("li", {
    key: at
  }, answerText))), resultItem.type === 'freetext' && !Array.isArray(resultItem.texts) && resultItem.aggregate && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] font-bold text-slate-600"
  }, resultItem.aggregate.n, " written ", resultItem.aggregate.n === 1 ? 'answer' : 'answers')))), !!(summary?.rows || []).length && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-left text-[11px]"
  }, /*#__PURE__*/React.createElement("caption", {
    className: "sr-only"
  }, "Individual responses"), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "px-2 py-1 font-black text-slate-700"
  }, "Name"), (summary?.items || []).map(resultItem => /*#__PURE__*/React.createElement("th", {
    key: resultItem.id,
    scope: "col",
    className: "px-2 py-1 font-black text-slate-700"
  }, resultItem.text.slice(0, 30))))), /*#__PURE__*/React.createElement("tbody", null, (summary?.rows || []).map((row, rowIndex) => /*#__PURE__*/React.createElement("tr", {
    key: `${row.label}-${rowIndex}`,
    className: "border-t border-slate-200"
  }, /*#__PURE__*/React.createElement("th", {
    scope: "row",
    className: "px-2 py-1 font-bold text-slate-800"
  }, row.label || 'Someone'), (summary?.items || []).map(resultItem => {
    const answer = row.answers?.[resultItem.id];
    const shown = resultItem.type === 'choice' ? (resultItem.options || []).find(option => option.id === answer)?.label || '-' : answer === undefined || answer === null ? '-' : String(answer).slice(0, 60);
    return /*#__PURE__*/React.createElement("td", {
      key: resultItem.id,
      className: "px-2 py-1 text-slate-700"
    }, shown);
  }))))))), isSignup && !isTeacher && /*#__PURE__*/React.createElement("form", {
    className: "mt-4 rounded-xl border border-sky-100 bg-white p-3",
    onSubmit: async event => {
      event.preventDefault();
      if (busy) return;
      if (summary?.identityMode === 'real_name' && !signupName.trim() && signupClaims.length) {
        addToast('Add your name so the organizer knows who has the slot.', 'info');
        return;
      }
      try {
        await callStudentUpdate({
          claims: signupClaims,
          nm: summary?.identityMode === 'real_name' ? signupName.trim().slice(0, 40) : ''
        });
        addToast(signupClaims.length ? 'You are signed up.' : 'Your slot was released.', 'success');
      } catch (submitError) {
        // The server refuses the WHOLE submission if a slot filled up
        // while this page was open, so say which one went.
        const code = String(submitError?.code || submitError?.message || '');
        addToast(code.includes('slot-full') ? 'Someone just took that slot. Pick another one.' : 'That did not save: ' + (submitError?.message || 'unknown'), 'error');
      }
    }
  }, /*#__PURE__*/React.createElement("fieldset", {
    disabled: busy || summary?.closed
  }, /*#__PURE__*/React.createElement("legend", {
    className: "block text-xs font-black text-slate-800"
  }, summary?.closed ? 'Sign-ups have closed' : 'Choose a slot'), summary?.identityMode === 'real_name' && /*#__PURE__*/React.createElement("label", {
    className: "mt-2 block text-[11px] font-black text-slate-700"
  }, "Your name", /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: signupName,
    onChange: event => setSignupName(event.target.value.slice(0, 40)),
    className: "mt-1 w-full rounded-md border border-sky-300 px-2 py-1.5 text-xs font-semibold text-slate-800"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2"
  }, (summary?.slots || []).map(slot => {
    const mine = signupClaims.indexOf(slot.id) >= 0;
    const gone = slot.remaining <= 0 && !mine;
    const limit = summary?.maxPerPerson || 1;
    return /*#__PURE__*/React.createElement("div", {
      key: slot.id,
      className: "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: `text-xs font-bold ${gone ? 'text-slate-400' : 'text-slate-800'}`
    }, slot.label, /*#__PURE__*/React.createElement("span", {
      className: "ml-2 text-[10px] font-black uppercase tracking-wide"
    }, gone ? 'Full' : slot.remaining + ' of ' + slot.capacity + ' left')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: gone,
      "aria-pressed": mine,
      onClick: () => setSignupClaims(previous => {
        if (previous.indexOf(slot.id) >= 0) return previous.filter(id => id !== slot.id);
        // At the limit, taking another slot REPLACES the
        // oldest rather than silently failing on submit.
        const next = previous.concat([slot.id]);
        return next.length > limit ? next.slice(next.length - limit) : next;
      }),
      className: `rounded-md px-2 py-1 text-[11px] font-black disabled:opacity-40 ${mine ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'}`
    }, mine ? 'Mine - tap to release' : gone ? 'Full' : 'Take it'));
  })), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "mt-3 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
  }, busy ? 'Saving...' : 'Save my choice'), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[10px] text-slate-500"
  }, (summary?.maxPerPerson || 1) > 1 ? 'You can take up to ' + summary.maxPerPerson + ' slots.' : 'You can hold one slot at a time.'))), isSignup && isTeacher && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-xl border border-sky-100 bg-white p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, (summary?.slots || []).map(slot => /*#__PURE__*/React.createElement("div", {
    key: slot.id,
    className: "rounded-lg bg-slate-50 px-2 py-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-800"
  }, slot.label), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-black text-slate-700"
  }, slot.taken, " of ", slot.capacity, " taken")), !!(slot.who || []).length && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] text-slate-600"
  }, slot.who.map(person => person.label || 'Someone').join(', '))))), summary?.identityMode === 'anonymous' && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[10px] text-slate-500"
  }, "This sheet is anonymous, so you see counts but not names.")), !isTeacher && !isRating && !isPoll && !isSignup && !isSurvey && /*#__PURE__*/React.createElement("form", {
    onSubmit: submitTerm,
    className: "mt-4 rounded-xl border border-sky-100 bg-white p-3"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: `shared-word-cloud-${activityId}`,
    className: "block text-xs font-black text-slate-800"
  }, "Your word or short phrase"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex flex-col gap-2 sm:flex-row"
  }, /*#__PURE__*/React.createElement("input", {
    id: `shared-word-cloud-${activityId}`,
    value: term,
    onChange: event => setTerm(event.target.value.slice(0, 60)),
    maxLength: 60,
    autoComplete: "off",
    placeholder: "Type your response",
    className: "min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: busy,
    className: "min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-black text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60"
  }, busy ? 'Saving...' : summary?.own ? 'Update my word' : 'Add my word')), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-600"
  }, statusText || 'Submit before viewing the class cloud.'), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-500"
  }, term.length, "/60"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4",
    "aria-live": "polite"
  }, isRating ? summary?.revealed && distribution.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 rounded-xl border border-violet-100 bg-white p-4",
    "aria-label": "Anonymous class rating distribution"
  }, distribution.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.value,
    className: "grid grid-cols-[minmax(5rem,auto)_1fr_auto] items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-black text-slate-800"
  }, item.value, item.label !== String(item.value) ? ` · ${item.label}` : ''), /*#__PURE__*/React.createElement("div", {
    className: "h-3 overflow-hidden rounded-full bg-slate-100",
    role: "progressbar",
    "aria-label": `${item.label}: ${item.count} responses`,
    "aria-valuemin": 0,
    "aria-valuemax": summary.participantCount || 0,
    "aria-valuenow": item.count
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full rounded-full bg-violet-600",
    style: {
      width: `${item.percent}%`
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-black text-violet-900"
  }, item.count)))) : /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-dashed border-violet-300 bg-white p-4 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-black text-violet-900"
  }, `${summary?.participantCount || 0} of ${threshold} ratings needed before the class distribution appears.`), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] text-slate-600"
  }, "Only the aggregate is revealed; individual ratings are not shown to the teacher or class.")) : summary?.revealed && terms.length > 0 ? typeof renderer === 'function' ? renderer(terms, 'Anonymous shared class word cloud') : /*#__PURE__*/React.createElement("ul", {
    className: "flex min-h-28 list-none flex-wrap items-center justify-center gap-3 rounded-xl border border-sky-100 bg-white p-4"
  }, terms.map(item => /*#__PURE__*/React.createElement("li", {
    key: item.value || item.label,
    className: "font-black text-sky-800"
  }, item.label, item.count > 1 ? ` x${item.count}` : ''))) : /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-dashed border-sky-300 bg-white p-4 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-black text-sky-900"
  }, summary?.participantCount >= threshold ? 'No responses are published yet.' : `${summary?.participantCount || 0} of ${threshold} responses needed before the cloud appears.`), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] text-slate-600"
  }, "The participation threshold helps prevent singling out one student's response."))), isTeacher && isRating && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-xl border border-violet-200 bg-white p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-black text-violet-950"
  }, "Aggregate-only formative rating"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[11px] leading-relaxed text-slate-600"
  }, summary?.participantCount || 0, " responses recorded. Individual ratings and identities are not listed, and this activity has no correctness or score.")), isTeacher && !isRating && !isPoll && !isSignup && !isSurvey && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-xl border border-slate-200 bg-white p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 text-[11px] font-black"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-amber-100 px-2 py-1 text-amber-900"
  }, "Held ", heldCount), /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-emerald-100 px-2 py-1 text-emerald-900"
  }, "Approved ", approvedCount), /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-slate-100 px-2 py-1 text-slate-700"
  }, "Hidden ", hiddenCount)), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[11px] text-slate-600"
  }, "Entries are pseudonymous and stored in your Class Mailbox Drive folder. Expiration blocks access; revoking the homework link removes the stored activity."), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 max-h-64 space-y-2 overflow-y-auto",
    role: "list",
    "aria-label": "Word cloud moderation queue"
  }, responses.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500"
  }, "Waiting for student responses."), responses.map((row, index) => /*#__PURE__*/React.createElement("div", {
    key: row.uid,
    role: "listitem",
    className: "flex items-center gap-2 rounded-lg border border-slate-200 p-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "truncate text-xs font-black text-slate-900"
  }, row.text), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500"
  }, "Anonymous entry ", responses.length - index)), /*#__PURE__*/React.createElement("select", {
    value: row.status,
    disabled: busy,
    onChange: event => moderate(row.uid, event.target.value),
    "aria-label": `Moderation status for ${row.text}`,
    className: "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-800"
  }, /*#__PURE__*/React.createElement("option", {
    value: "pending"
  }, "Hold"), /*#__PURE__*/React.createElement("option", {
    value: "approved"
  }, "Approve"), /*#__PURE__*/React.createElement("option", {
    value: "hidden"
  }, "Hide")))))), error && /*#__PURE__*/React.createElement("div", {
    role: "alert",
    className: "mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-800"
  }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => refresh(),
    disabled: busy,
    className: "rounded-md border border-rose-300 bg-white px-2 py-1 text-[10px] font-black text-rose-800 disabled:opacity-50"
  }, "Refresh status")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center justify-between gap-2 text-[10px] text-slate-500"
  }, /*#__PURE__*/React.createElement("span", null, isRating ? 'Anonymous aggregate only · not scored' : summary?.revealPolicy === 'auto_publish' ? 'Automatic publishing with basic contact/profanity holds' : 'Teacher review required before publishing'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => refresh(),
    disabled: busy,
    className: "rounded-md border border-slate-300 bg-white px-2 py-1 font-bold text-slate-700 hover:border-sky-400 disabled:opacity-50"
  }, "Refresh", lastUpdatedAt ? ` at ${new Date(lastUpdatedAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })}` : '')));
});
window.AlloModules = window.AlloModules || {};
window.AlloModules.SharedActivity = {
  normalizeRatingActivity: _alloNormalizeSharedRatingActivity,
  activityUiMeta: _alloSharedActivityUiMeta,
  assignmentCenterActivityStatus: _alloAssignmentCenterActivityStatus,
  buildAssignmentCenterRows: _alloBuildAssignmentCenterRows,
  filterAssignmentCenterRows: _alloFilterAssignmentCenterRows,
  buildAssignmentCenterCsv: _alloBuildAssignmentCenterCsv,
  buildAssignmentPackEncoded: _alloBuildAssignmentPackEncoded,
  nextSummaryOrder: _alloNextSharedActivitySummaryOrder,
  normalizeCredentialStore: alloNormalizeCredentialStore,
  credentialSlotKey: alloCredentialSlotKey,
  credentialStoreWith: alloCredentialStoreWith,
  activeCredential: alloActiveCredential,
  credentialRoster: alloCredentialRoster,
  AlloQuestionBoardPanel,
  SharedAssignmentActivityPanel
};
console.log('[CDN] SharedActivity loaded');
})();
