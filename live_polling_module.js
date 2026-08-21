// live_polling_module.js
// FERPA-by-design live polling via WebRTC peer-to-peer.
//
// Application data (poll prompts, student responses including free text,
// private teacher-reviewed feedback, codenames, and revision status) flows
// browser-to-browser over RTCDataChannel and is not written to the live
// session document. When the teacher explicitly generates AI feedback, the
// bounded response + criteria (without uid or codename) are sent to the
// teacher's configured AI provider. Only the WebRTC signaling handshake (SDP descriptions and
// ICE candidates) briefly transits Firestore; signaling documents are deleted
// as soon as the peer connection is `connected`.
//
// See feedback_session_tier1_tier2.md (memory) and the privacy-architecture
// plan for full context. Star topology: teacher is the host, each student
// joins as a guest with a per-session anonymous Firebase Auth UID.
//
// Public API: window.AlloModules.LivePolling.{createHost, createGuest}
//   const host = LivePolling.createHost({
//     sessionCode: 'ABCD',
//     onGuestConnected: (uid, codename) => ...,
//     onResponse:       (uid, codename, payload) => ...,
//     acceptResponse:   (uid, payload, codename) => false, // optional scoped ids
//     onGuestLeft:      (uid) => ...,
//   });
//   await host.start();
//   host.broadcastPoll({ id, type, prompt, options? }, optionalAudienceUids);
//   host.sendFeedback(uid, pollId, reviewedFeedback);
//   host.closePoll(pollId);
//   host.stop();
//
//   const guest = LivePolling.createGuest({
//     sessionCode: 'ABCD',
//     userUid: user.uid,
//     codename: studentNickname,
//     onPoll:        (poll) => ...,
//     onPollClose:   ({ pollId }) => ...,
//     onFeedback:    (reviewedFeedback) => ...,
//     onConnected:   () => ...,
//     onDisconnected: () => ...,
//     onFailed:      () => ...,  // signaling timeout; UI should fall back to async
//     onHostClosed:  () => ...,  // terminal event: teacher closed the host panel
//   });
//   await guest.join();
//   guest.sendResponse(pollId, response);
//   guest.leave();

(function () {
  const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
  const RTC_CONFIG = { iceServers: STUN_SERVERS };
  // Deploy-time override hook: set window.__alloRtcConfig = { iceServers: [...] }
  // (e.g. to add a TURN server for UDP-blocked school networks) without a
  // module change. Read at connection time so late-loaded config applies.
  const getRtcConfig = () => {
    const cfg = (typeof window !== 'undefined') && window.__alloRtcConfig;
    return (cfg && Array.isArray(cfg.iceServers) && cfg.iceServers.length > 0) ? cfg : RTC_CONFIG;
  };
  const CONNECTION_TIMEOUT_MS = 10000;
  const SIGNALING_TTL_MS = 60 * 60 * 1000;
  const CUSTOM_RESPONSE_ID_MAX_LENGTH = 120;
  const CUSTOM_RESPONSE_PAYLOAD_MAX_CHARS = 16000;

  const getFb = () => {
    const fb = (typeof window !== 'undefined') && window.__alloFirebase;
    if (!fb || !fb.db || !fb.doc || !fb.setDoc || !fb.onSnapshot) return null;
    return fb;
  };
  const getAppId = () => {
    if (typeof window === 'undefined') return 'default-app-id';
    if (window.appId) return window.appId;
    if (typeof window.__app_id !== 'undefined') return window.__app_id;
    return 'default-app-id';
  };
  // signalingPath lets other live features reuse this exact transport on
  // their own signaling collection (the Pictionary-coexistence pattern) —
  // e.g. the live quiz rides 'quiz-signaling' so poll and quiz stars can
  // run simultaneously without answering each other's offers.
  const signalingDocRef = (sessionCode, peerUid, signalingPath) => {
    const fb = getFb();
    if (!fb) return null;
    return fb.doc(fb.db, 'artifacts', getAppId(), 'public', 'data', signalingPath || 'signaling', sessionCode, 'peers', peerUid);
  };
  const signalingCollectionRef = (sessionCode, signalingPath) => {
    const fb = getFb();
    if (!fb || !fb.collection) return null;
    return fb.collection(fb.db, 'artifacts', getAppId(), 'public', 'data', signalingPath || 'signaling', sessionCode, 'peers');
  };
  const sessionDocRef = (sessionCode) => {
    const fb = getFb();
    if (!fb) return null;
    return fb.doc(fb.db, 'artifacts', getAppId(), 'public', 'data', 'sessions', sessionCode);
  };

  // ── Routing-rule evaluator ────────────────────────────────────────────
  // Pure functions: take a teacher-authored rule set + a response, return
  // the matching groupId (or null). Used by HostPanel to auto-route students
  // when their response satisfies a rule. Rules are metadata, not student
  // data — Tier-1 OK to live on the poll object.
  //
  // Rule shape: { id, when: { predicate, value }, then: { groupId } }
  // Predicates: 'eq' (===), 'lte' (<=), 'gte' (>=), 'between' ([min,max]
  // inclusive), 'in' (response in value-array).
  const matchesPredicate = (when, response) => {
    if (!when || !when.predicate) return false;
    const v = when.value;
    switch (when.predicate) {
      case 'eq': return response === v;
      case 'lte': return typeof response === 'number' && typeof v === 'number' && response <= v;
      case 'gte': return typeof response === 'number' && typeof v === 'number' && response >= v;
      case 'between': return Array.isArray(v) && v.length === 2
        && typeof response === 'number' && response >= v[0] && response <= v[1];
      case 'in': return Array.isArray(v) && v.indexOf(response) !== -1;
      default: return false;
    }
  };
  const evaluateRoutingRules = (rules, response) => {
    if (!Array.isArray(rules) || rules.length === 0) return null;
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (r && r.when && r.then && r.then.groupId && matchesPredicate(r.when, response)) {
        return r.then.groupId;
      }
    }
    return null;
  };
  // Reuse the session's canonical groups in the routing composer, then append
  // groups created in this panel until the session snapshot catches up. This
  // prevents a second, parallel group model and deduplicates by bounded id.
  const mergeLivePollingGroups = (sessionGroups, createdGroups) => {
    const merged = [];
    const seen = new Set();
    const add = (rawId, rawName) => {
      const id = String(rawId || '').trim().slice(0, 128);
      if (!id || id === '__proto__' || id === 'prototype' || id === 'constructor' || seen.has(id)) return;
      seen.add(id);
      merged.push({ id: id, name: String(rawName || id).trim().slice(0, 120) || id });
    };
    const source = sessionGroups && typeof sessionGroups === 'object' && !Array.isArray(sessionGroups)
      ? sessionGroups
      : {};
    Object.keys(source).slice(0, 100).forEach(function (id) {
      const entry = source[id];
      if (entry && typeof entry === 'object') add(id, entry.name);
    });
    (Array.isArray(createdGroups) ? createdGroups : []).slice(0, 100).forEach(function (entry) {
      if (entry && typeof entry === 'object') add(entry.id, entry.name);
    });
    return merged.slice(0, 100);
  };
  const selectLivePollingRoutingRules = (rules, targetGroups) => {
    const allowedGroupIds = new Set(
      (Array.isArray(targetGroups) ? targetGroups : [])
        .map(function (group) { return group && String(group.id || '').trim().slice(0, 128); })
        .filter(Boolean)
    );
    return (Array.isArray(rules) ? rules : []).filter(function (rule) {
      if (!rule || !rule.when || !rule.then) return false;
      const groupId = String(rule.then.groupId || '').trim().slice(0, 128);
      return !!groupId && allowedGroupIds.has(groupId);
    }).map(function (rule) {
      return Object.assign({}, rule, {
        then: Object.assign({}, rule.then, {
          groupId: String(rule.then.groupId || '').trim().slice(0, 128),
        }),
      });
    });
  };
  // Patterns we WARN on (don't block) to nudge teachers away from
  // ability-tiered group names. Choice-themed names (Pirate Crew,
  // Space Crew) pass through unflagged.
  const ABILITY_TIERED_PATTERN = /\b(struggling|low|gifted|advanced|remedial|tier\s*[123])\b/i;
  const isAbilityTieredName = (name) => typeof name === 'string' && ABILITY_TIERED_PATTERN.test(name);

  const clampInt = (value, fallback, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  };
  const buildRatingScale = (minValue, maxValue, labelText) => {
    let min = clampInt(minValue, 1, 0, 20);
    let max = clampInt(maxValue, 5, 1, 20);
    if (max < min) { const tmp = min; min = max; max = tmp; }
    if (max === min) max = Math.min(20, min + 1);
    const labels = {};
    String(labelText || '').split(/\r?\n/).forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const m = trimmed.match(/^(\d+)\s*(?:=|:|-|\u2013|\u2014)\s*(.+)$/);
      if (m) labels[String(clampInt(m[1], min, min, max))] = m[2].trim();
      else {
        const value = min + idx;
        if (value <= max) labels[String(value)] = trimmed;
      }
    });
    return { min: min, max: max, labels: labels };
  };
  const normalizeRatingScale = (poll) => {
    const scale = poll && poll.scale ? poll.scale : {};
    const labels = scale.labels || {};
    return buildRatingScale(scale.min, scale.max, Object.keys(labels).map((key) => key + '=' + labels[key]).join('\n'));
  };
  const getRatingValues = (scale) => {
    const out = [];
    for (let n = scale.min; n <= scale.max && out.length < 21; n++) out.push(n);
    return out;
  };
  const LIVE_POLL_PROMPT_MAX_LENGTH = 500;
  const LIVE_POLL_CHOICE_MAX_LENGTH = 180;
  const LIVE_POLL_MAX_CHOICES = 12;
  const LIVE_CHECK_IN_ID_MAX_LENGTH = 120;
  const LIVE_CHECK_IN_ACK_STATUSES = ['working', 'help'];
  const LIVE_HELP_REQUEST_STATUSES = ['help', 'cleared'];
  const LIVE_POLL_DRAFT_MAX_CHARS = 16000;
  const LIVE_QA_DRAFT_MAX_AGE_MS = 4 * 60 * 60 * 1000;
  const LIVE_TEACHER_ACTION_STATE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  const buildLiveSessionSupportActivityId = (sessionCode) => {
    const code = String(sessionCode || '').trim().replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80);
    return 'session-support-' + (code || 'local');
  };
  const normalizeLiveCheckInPacket = (payload) => {
    const source = payload && typeof payload === 'object' ? payload : {};
    const id = String(source.id || '').trim().slice(0, LIVE_CHECK_IN_ID_MAX_LENGTH);
    const activityId = String(source.activityId || '').trim().slice(0, LIVE_CHECK_IN_ID_MAX_LENGTH);
    if (!id || !activityId) return null;
    return { id: id, activityId: activityId, sentAt: Math.max(0, Number(source.sentAt) || 0) };
  };
  const normalizeLiveCheckInAckPacket = (payload) => {
    const source = payload && typeof payload === 'object' ? payload : {};
    const checkInId = String(source.checkInId || '').trim().slice(0, LIVE_CHECK_IN_ID_MAX_LENGTH);
    const activityId = String(source.activityId || '').trim().slice(0, LIVE_CHECK_IN_ID_MAX_LENGTH);
    const status = LIVE_CHECK_IN_ACK_STATUSES.indexOf(source.status) >= 0 ? source.status : '';
    if (!checkInId || !activityId || !status) return null;
    return { checkInId: checkInId, activityId: activityId, status: status, acknowledgedAt: Math.max(0, Number(source.acknowledgedAt) || 0) };
  };
  const normalizeLiveHelpRequestPacket = (payload) => {
    const source = payload && typeof payload === 'object' ? payload : {};
    const activityId = String(source.activityId || '').trim().slice(0, LIVE_CHECK_IN_ID_MAX_LENGTH);
    const status = LIVE_HELP_REQUEST_STATUSES.indexOf(source.status) >= 0 ? source.status : '';
    if (!activityId || !status) return null;
    return { activityId: activityId, status: status, requestedAt: Math.max(0, Number(source.requestedAt) || 0) };
  };
  const livePollDraftStorageKey = (sessionCode, userUid, pollId) => {
    const parts = [sessionCode, userUid, pollId].map(function (value) {
      return encodeURIComponent(String(value || '').trim().slice(0, LIVE_CHECK_IN_ID_MAX_LENGTH));
    });
    return parts.every(Boolean) ? 'allo:live-poll-draft:v1:' + parts.join(':') : '';
  };
  const normalizeLivePollDraft = (payload, expectedPollId) => {
    const source = payload && typeof payload === 'object' ? payload : {};
    const pollId = String(source.pollId || '').trim().slice(0, LIVE_CHECK_IN_ID_MAX_LENGTH);
    if (!pollId || (expectedPollId && pollId !== String(expectedPollId))) return null;
    const type = ['rating', 'mcq', 'freetext', 'wordcloud'].indexOf(source.type) >= 0 ? source.type : 'freetext';
    let value = source.value;
    if (type === 'rating') value = value === '' || value == null ? '' : Number(value);
    else value = String(value == null ? '' : value).slice(0, LIVE_POLL_DRAFT_MAX_CHARS);
    if (type === 'rating' && value !== '' && !Number.isFinite(value)) return null;
    return { pollId: pollId, type: type, value: value, savedAt: Math.max(0, Number(source.savedAt) || 0) };
  };
  const readLivePollDraft = (sessionCode, userUid, pollId, storage) => {
    const key = livePollDraftStorageKey(sessionCode, userUid, pollId);
    if (!key) return null;
    try {
      const target = storage || ((typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : null);
      const raw = target && target.getItem(key);
      return raw ? normalizeLivePollDraft(JSON.parse(raw), pollId) : null;
    } catch (err) { return null; }
  };
  const writeLivePollDraft = (sessionCode, userUid, poll, value, storage) => {
    const key = livePollDraftStorageKey(sessionCode, userUid, poll && poll.id);
    if (!key || !poll) return false;
    const draft = normalizeLivePollDraft({ pollId: poll.id, type: poll.type, value: value, savedAt: Date.now() }, poll.id);
    if (!draft) return false;
    try {
      const target = storage || ((typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : null);
      if (!target) return false;
      const hasValue = draft.type === 'rating' ? draft.value !== '' : !!String(draft.value || '');
      if (!hasValue) target.removeItem(key);
      else target.setItem(key, JSON.stringify(draft));
      return true;
    } catch (err) { return false; }
  };
  const clearLivePollDraft = (sessionCode, userUid, pollId, storage) => {
    const key = livePollDraftStorageKey(sessionCode, userUid, pollId);
    if (!key) return false;
    try {
      const target = storage || ((typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : null);
      if (!target) return false;
      target.removeItem(key);
      return true;
    } catch (err) { return false; }
  };
  const liveSessionQaDraftStorageKey = (sessionCode, userUid) => {
    const parts = [sessionCode, userUid].map(function (value) {
      return encodeURIComponent(String(value || '').trim().slice(0, LIVE_CHECK_IN_ID_MAX_LENGTH));
    });
    return parts.every(Boolean) ? 'allo:live-qa-draft:v1:' + parts.join(':') : '';
  };
  const normalizeLiveSessionQaDraft = (payload, now) => {
    const source = payload && typeof payload === 'object' ? payload : {};
    const text = String(source.text == null ? '' : source.text).replace(/\r\n?/g, '\n').trim().slice(0, 500);
    const savedAt = Math.max(0, Number(source.savedAt) || 0);
    const current = Math.max(0, Number(now) || Date.now());
    if (!text || !savedAt || current - savedAt > LIVE_QA_DRAFT_MAX_AGE_MS) return null;
    return { text: text, savedAt: savedAt };
  };
  const readLiveSessionQaDraft = (sessionCode, userUid, storage, now) => {
    const key = liveSessionQaDraftStorageKey(sessionCode, userUid);
    if (!key) return null;
    try {
      const target = storage || ((typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : null);
      const raw = target && target.getItem(key);
      const draft = raw ? normalizeLiveSessionQaDraft(JSON.parse(raw), now) : null;
      if (!draft && raw && target) target.removeItem(key);
      return draft;
    } catch (err) { return null; }
  };
  const writeLiveSessionQaDraft = (sessionCode, userUid, draftText, storage, now) => {
    const key = liveSessionQaDraftStorageKey(sessionCode, userUid);
    if (!key) return false;
    try {
      const target = storage || ((typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : null);
      if (!target) return false;
      const normalized = String(draftText == null ? '' : draftText).replace(/\r\n?/g, '\n').trim().slice(0, 500);
      if (!normalized) target.removeItem(key);
      else target.setItem(key, JSON.stringify({ text: normalized, savedAt: Math.max(0, Number(now) || Date.now()) }));
      return true;
    } catch (err) { return false; }
  };
  const clearLiveSessionQaDraft = (sessionCode, userUid, storage) => {
    const key = liveSessionQaDraftStorageKey(sessionCode, userUid);
    if (!key) return false;
    try {
      const target = storage || ((typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : null);
      if (!target) return false;
      target.removeItem(key);
      return true;
    } catch (err) { return false; }
  };
  const normalizeLivePollChoices = (value) => {
    const seen = new Set();
    const rawChoices = Array.isArray(value) ? value : String(value || '').split(/\r?\n/);
    return rawChoices.map((choice) => {
      let normalized = choice == null ? '' : String(choice);
      try { if (typeof normalized.normalize === 'function') normalized = normalized.normalize('NFKC'); } catch (err) {}
      return normalized.replace(/\s+/g, ' ').trim().slice(0, LIVE_POLL_CHOICE_MAX_LENGTH).trim();
    }).filter((choice) => {
      const key = choice.toLocaleLowerCase();
      if (!choice || seen.has(key) || seen.size >= LIVE_POLL_MAX_CHOICES) return false;
      seen.add(key);
      return true;
    });
  };
  const validateLivePollComposer = (config) => {
    const source = config && typeof config === 'object' ? config : {};
    const type = ['rating', 'mcq', 'freetext', 'wordcloud'].indexOf(source.type) >= 0 ? source.type : 'rating';
    const prompt = normalizeBoundedText(source.prompt, LIVE_POLL_PROMPT_MAX_LENGTH);
    const options = type === 'mcq' ? normalizeLivePollChoices(source.options) : [];
    const audienceCount = Math.max(0, Math.floor(Number(source.audienceCount) || 0));
    const reasons = [];
    if (source.activePoll) reasons.push('active-poll');
    if (!prompt) reasons.push('prompt-required');
    if (audienceCount < 1) reasons.push('audience-required');
    if (type === 'mcq' && options.length < 2) reasons.push('mcq-options');
    return { ready: reasons.length === 0, reasons: reasons, type: type, prompt: prompt, options: options, audienceCount: audienceCount };
  };
  const upsertLiveGuest = (guestList, uid, codename) => {
    if (!uid) return Array.isArray(guestList) ? guestList.slice() : [];
    const guests = Array.isArray(guestList) ? guestList : [];
    return guests.filter((g) => g && g.uid !== uid).concat([{ uid: uid, codename: codename || 'Guest' }]);
  };
  const upsertPollResponse = (responseList, entry) => {
    const list = Array.isArray(responseList) ? responseList.slice() : [];
    if (!entry || !entry.uid) return list.concat([entry]);
    const idx = list.findIndex((r) => r && r.uid === entry.uid);
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], entry);
    else list.push(entry);
    return list;
  };
  const uniqueResponsesForSummary = (responseList) => {
    const responses = Array.isArray(responseList) ? responseList : [];
    return responses.reduce((out, entry) => upsertPollResponse(out, entry), []);
  };
  const WORD_CLOUD_MAX_LENGTH = 60;
  const normalizeWordCloudTerm = (value) => {
    let term = value == null ? '' : String(value);
    try { if (typeof term.normalize === 'function') term = term.normalize('NFKC'); } catch (err) {}
    term = term.replace(/\s+/g, ' ').trim();
    term = term.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').trim();
    if (term.length > WORD_CLOUD_MAX_LENGTH) term = term.slice(0, WORD_CLOUD_MAX_LENGTH).trim();
    return term;
  };
  const wordCloudTermKey = (value) => normalizeWordCloudTerm(value).toLowerCase();
  const buildWordCloudItems = (responseList, moderationByKey, aliasesByKey) => {
    const responses = uniqueResponsesForSummary(responseList);
    const moderation = moderationByKey && typeof moderationByKey === 'object' ? moderationByKey : {};
    const aliases = aliasesByKey && typeof aliasesByKey === 'object' ? aliasesByKey : {};
    const buckets = Object.create(null);
    responses.forEach((entry) => {
      const originalLabel = normalizeWordCloudTerm(entry && entry.response);
      const originalKey = wordCloudTermKey(originalLabel);
      if (!originalKey) return;
      const aliasLabel = normalizeWordCloudTerm(aliases[originalKey]);
      const label = aliasLabel || originalLabel;
      const key = wordCloudTermKey(label);
      if (!key) return;
      if (!buckets[key]) buckets[key] = { value: key, label: label, count: 0, sourceKeys: [] };
      buckets[key].count += 1;
      if (buckets[key].sourceKeys.indexOf(originalKey) < 0) buckets[key].sourceKeys.push(originalKey);
    });
    return Object.keys(buckets).map((key) => {
      const sourceKeys = buckets[key].sourceKeys || [];
      let status = moderation[key];
      if (status !== 'approved' && status !== 'hidden') {
        const sourceStatuses = sourceKeys.map((sourceKey) => moderation[sourceKey]);
        status = sourceStatuses.indexOf('hidden') >= 0
          ? 'hidden'
          : sourceStatuses.length > 0 && sourceStatuses.every((value) => value === 'approved')
            ? 'approved'
            : 'pending';
      }
      const item = Object.assign({}, buckets[key], { status: status });
      if (sourceKeys.length <= 1 && sourceKeys[0] === key) delete item.sourceKeys;
      return item;
    }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };
  const WORD_CLOUD_MODERATION_FILTERS = ['all', 'pending', 'approved', 'hidden'];
  const filterWordCloudModerationItems = (items, config) => {
    const source = config && typeof config === 'object' ? config : {};
    const status = WORD_CLOUD_MODERATION_FILTERS.indexOf(source.status) >= 0 ? source.status : 'all';
    const query = String(source.query == null ? '' : source.query).trim().slice(0, 80).toLocaleLowerCase();
    return (Array.isArray(items) ? items : []).filter(function (item) {
      if (!item || (status !== 'all' && item.status !== status)) return false;
      if (!query) return true;
      const searchable = [item.label, item.value].concat(Array.isArray(item.sourceKeys) ? item.sourceKeys : []);
      return searchable.some(function (value) { return String(value || '').toLocaleLowerCase().indexOf(query) >= 0; });
    });
  };
  const WORD_CLOUD_CLUSTER_MAX_TERMS = 80;
  const WORD_CLOUD_CLUSTER_MAX_SUGGESTIONS = 20;
  const buildWordCloudClusterPrompt = (items) => {
    const approved = (Array.isArray(items) ? items : []).filter(function (item) {
      return item && item.status === 'approved' && normalizeWordCloudTerm(item.label);
    }).slice(0, WORD_CLOUD_CLUSTER_MAX_TERMS).map(function (item) {
      return { term: normalizeWordCloudTerm(item.label), count: Math.max(1, Math.floor(Number(item.count) || 1)) };
    });
    if (approved.length < 2) return '';
    return [
      'Group only genuinely synonymous or conceptually equivalent classroom word-cloud terms.',
      'Return JSON only: {"clusters":[{"label":"canonical term","members":["exact input term","exact input term"]}]}.',
      'Use exact input terms in members. Each cluster needs 2 or more members. Do not invent terms or explain.',
      'These are teacher-approved anonymous aggregate terms; no student identities are included.',
      JSON.stringify(approved),
    ].join('\n');
  };
  const parseWordCloudClusterSuggestions = (value, items) => {
    const approved = (Array.isArray(items) ? items : []).filter(function (item) {
      return item && item.status === 'approved' && normalizeWordCloudTerm(item.label);
    });
    const byKey = new Map();
    approved.forEach(function (item) { byKey.set(wordCloudTermKey(item.label), item); });
    let parsed = value;
    if (typeof value === 'string') {
      let text = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) text = text.slice(start, end + 1);
      try { parsed = JSON.parse(text); } catch (err) { return []; }
    }
    const clusters = parsed && Array.isArray(parsed.clusters) ? parsed.clusters : [];
    const used = new Set();
    return clusters.slice(0, WORD_CLOUD_CLUSTER_MAX_SUGGESTIONS).reduce(function (out, cluster) {
      const label = normalizeWordCloudTerm(cluster && cluster.label);
      const members = Array.from(new Set((cluster && Array.isArray(cluster.members) ? cluster.members : []).map(wordCloudTermKey).filter(function (key) {
        return key && byKey.has(key) && !used.has(key);
      })));
      if (!label || members.length < 2) return out;
      members.forEach(function (key) { used.add(key); });
      out.push({
        id: 'cluster-' + out.length + '-' + wordCloudTermKey(label).replace(/[^a-z0-9]+/g, '-').slice(0, 32),
        label: label,
        memberKeys: members,
        members: members.map(function (key) { return byKey.get(key).label; }),
        count: members.reduce(function (sum, key) { return sum + Math.max(1, Number(byKey.get(key).count) || 1); }, 0),
      });
      return out;
    }, []);
  };
  const buildWordCloudAliasPatch = (items, suggestion) => {
    const memberKeys = new Set(Array.isArray(suggestion && suggestion.memberKeys) ? suggestion.memberKeys : []);
    const label = normalizeWordCloudTerm(suggestion && suggestion.label);
    if (!label || memberKeys.size < 2) return {};
    return (Array.isArray(items) ? items : []).reduce(function (patch, item) {
      if (!item || !memberKeys.has(wordCloudTermKey(item.label))) return patch;
      const sourceKeys = Array.isArray(item.sourceKeys) && item.sourceKeys.length ? item.sourceKeys : [item.value];
      sourceKeys.forEach(function (key) { if (key) patch[String(key)] = label; });
      return patch;
    }, {});
  };
  const stableWordCloudColor = (value) => {
    const colors = ['#1d4ed8', '#7c3aed', '#0f766e', '#be123c', '#b45309', '#0369a1'];
    const key = wordCloudTermKey(value);
    let hash = 0;
    for (let index = 0; index < key.length; index += 1) hash = ((hash * 31) + key.charCodeAt(index)) >>> 0;
    return colors[hash % colors.length];
  };
  const stableWordCloudSize = (count, maxCount) => {
    const safeCount = Math.max(1, Number(count) || 1);
    const safeMax = Math.max(safeCount, Number(maxCount) || 1);
    const strength = Math.log1p(safeCount) / Math.log1p(safeMax);
    return (0.9 + (strength * 1.25)).toFixed(2) + 'rem';
  };
  const normalizeLiveTransportKind = (value) => {
    const kind = String(value || '').trim().toLowerCase();
    return kind === 'mailbox' || kind === 'lan' ? kind : 'firebase';
  };
  const buildLiveTransportHealth = (config) => {
    const source = config && typeof config === 'object' ? config : {};
    const kind = normalizeLiveTransportKind(source.transportKind);
    const now = Math.max(0, Number(source.now) || Date.now());
    const connectedCount = Math.max(0, Math.floor(Number(source.connectedCount) || 0));
    const expectedCount = Math.max(connectedCount, Math.floor(Number(source.expectedCount) || 0));
    const trace = (Array.isArray(source.trace) ? source.trace : []).filter(function (entry) {
      return entry && typeof entry === 'object' && Number(entry.at) > 0;
    });
    let lastSync = null;
    let lastProblem = null;
    for (let index = trace.length - 1; index >= 0; index -= 1) {
      const entry = trace[index];
      const event = String(entry.event || '');
      if (!lastSync && (event === 'sync:write-ok' || event === 'mailbox:pack-cycle' || event === 'mailbox:doc-version')) lastSync = entry;
      if (!lastProblem && /REFUSED|write-failed|transport-unavailable|bridge-missing|timeout/i.test(event)) lastProblem = entry;
      if (lastSync && lastProblem) break;
    }
    const problemIsCurrent = !!(lastProblem && (!lastSync || Number(lastProblem.at) > Number(lastSync.at)));
    const status = problemIsCurrent ? 'attention' : connectedCount > 0 ? 'healthy' : 'waiting';
    return {
      kind: kind,
      providerLabel: kind === 'mailbox' ? 'Google Class Mailbox' : kind === 'lan' ? 'Local network' : 'Firebase',
      status: status,
      connectedCount: connectedCount,
      expectedCount: expectedCount,
      directCount: connectedCount,
      missingDirectCount: Math.max(0, expectedCount - connectedCount),
      lastSyncAt: lastSync ? Number(lastSync.at) : 0,
      lastSyncAgeMs: lastSync ? Math.max(0, now - Number(lastSync.at)) : null,
      lastProblemAt: lastProblem ? Number(lastProblem.at) : 0,
      problemEvent: problemIsCurrent ? String(lastProblem.event || '') : '',
    };
  };
  const formatLiveElapsed = (milliseconds) => {
    const seconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
    if (seconds < 60) return seconds + 's';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm';
    return Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'm';
  };
  const liveActivityKindLabel = (kind) => {
    const key = String(kind || '').toLowerCase();
    const labels = {
      rating: 'Rating poll', multiple_choice: 'Multiple choice', free_response: 'Free response', free_text: 'Free response',
      word_cloud: 'Word cloud', feedback_response: 'Feedback response', quiz: 'Live quiz',
      concept_pictionary: 'Concept Pictionary', pictionary: 'Concept Pictionary', sketch_response: 'Sketch response', session_qa: 'Live Q&A',
      concept_quest: 'Concept Quest', adventure: 'Adventure mode'
    };
    return labels[key] || (key ? key.replace(/_/g, ' ') : 'No live activity');
  };
  const LIVE_STUDENT_SIGNAL_ACTIVE_MS = 95000;
  const LIVE_STUDENT_SIGNAL_RECENT_MS = 200000;
  const normalizeLiveActivityTimestamp = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
    if (value && typeof value.toMillis === 'function') {
      try {
        const millis = Number(value.toMillis());
        if (Number.isFinite(millis)) return Math.max(0, millis);
      } catch (err) {}
    }
    if (value && typeof value === 'object' && Number.isFinite(Number(value.seconds))) {
      const millis = (Number(value.seconds) * 1000) + Math.floor((Number(value.nanoseconds) || 0) / 1000000);
      return Math.max(0, millis);
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  };
  const classifyLiveStudentSignal = (config) => {
    const source = config && typeof config === 'object' ? config : {};
    const now = normalizeLiveActivityTimestamp(source.now) || Date.now();
    const lastSeenAt = normalizeLiveActivityTimestamp(source.lastSeenAt);
    const lastSignalAt = normalizeLiveActivityTimestamp(source.lastSignalAt);
    const directConnected = source.directConnected === true;
    const lastSeenAgeMs = lastSeenAt ? Math.max(0, now - lastSeenAt) : null;
    const signalAgeMs = lastSignalAt ? Math.max(0, now - lastSignalAt) : null;
    const presenceStatus = directConnected || (lastSeenAgeMs !== null && lastSeenAgeMs < LIVE_STUDENT_SIGNAL_ACTIVE_MS)
      ? 'active'
      : lastSeenAgeMs !== null && lastSeenAgeMs < LIVE_STUDENT_SIGNAL_RECENT_MS
        ? 'recent'
        : lastSeenAgeMs !== null
          ? 'offline'
          : 'unknown';
    const signalStatus = signalAgeMs !== null && signalAgeMs < LIVE_STUDENT_SIGNAL_ACTIVE_MS
      ? 'active'
      : signalAgeMs !== null && signalAgeMs < LIVE_STUDENT_SIGNAL_RECENT_MS
        ? 'recent'
        : !directConnected && presenceStatus === 'offline'
          ? 'offline'
          : signalAgeMs !== null
            ? 'quiet'
            : directConnected
              ? 'active'
              : 'unknown';
    return {
      presenceStatus: presenceStatus,
      signalStatus: signalStatus,
      signalAgeMs: signalAgeMs,
      lastSeenAgeMs: lastSeenAgeMs,
      sessionPresent: directConnected || presenceStatus === 'active' || presenceStatus === 'recent' || signalStatus === 'active' || signalStatus === 'recent',
    };
  };
  const liveStudentRowIsOffline = (row) => {
    if (!row || typeof row !== 'object') return true;
    if (row.presenceStatus === 'offline') return true;
    if (row.presenceStatus === 'active' || row.presenceStatus === 'recent') return false;
    return !row.connected;
  };
  const buildLiveStudentActivityRows = (config) => {
    const source = config && typeof config === 'object' ? config : {};
    const roster = source.roster && typeof source.roster === 'object' ? source.roster : {};
    const guests = Array.isArray(source.guests) ? source.guests : [];
    const groups = source.groups && typeof source.groups === 'object' ? source.groups : {};
    const resources = Array.isArray(source.resources) ? source.resources : [];
    const snapshots = (Array.isArray(source.activitySnapshots) ? source.activitySnapshots : [])
      .filter((item) => item && typeof item === 'object')
      .slice(-60)
      .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
    const activePoll = source.activePoll && typeof source.activePoll === 'object' ? source.activePoll : null;
    const audience = Array.isArray(source.activeParticipantUids) ? source.activeParticipantUids.map(String) : [];
    const responses = uniqueResponsesForSummary(source.responses);
    const responseStatuses = source.responseStatuses && typeof source.responseStatuses === 'object' ? source.responseStatuses : {};
    const uidSet = new Set(Object.keys(roster).map(String));
    guests.forEach((guest) => { if (guest && guest.uid) uidSet.add(String(guest.uid)); });
    audience.forEach((uid) => uidSet.add(uid));
    return Array.from(uidSet).slice(0, 250).map((uid) => {
      const rosterEntry = roster[uid] && typeof roster[uid] === 'object' ? roster[uid] : {};
      const guest = guests.find((item) => item && String(item.uid) === uid) || {};
      const directConnected = !!guest.uid;
      const lastSeenAt = normalizeLiveActivityTimestamp(rosterEntry.lastSeen);
      const viewingAt = normalizeLiveActivityTimestamp(rosterEntry.viewingAt);
      const practiceProgressAt = normalizeLiveActivityTimestamp(rosterEntry.wsProgress && rosterEntry.wsProgress.at);
      const progressCorrect = Math.max(0, Number(rosterEntry.wsProgress && rosterEntry.wsProgress.correct) || 0);
      const progressTotal = Math.max(0, Number(rosterEntry.wsProgress && rosterEntry.wsProgress.total) || 0);
      let activity = 'No live activity';
      let status = directConnected ? 'ready' : 'offline';
      let updatedAt = 0;
      let studentSignalAt = 0;
      let progressDetail = progressTotal ? progressCorrect + '/' + progressTotal : '';
      const finalizeRow = function () {
        const normalizedUpdatedAt = normalizeLiveActivityTimestamp(updatedAt);
        const lastSignalAt = Math.max(lastSeenAt, viewingAt, practiceProgressAt, normalizeLiveActivityTimestamp(studentSignalAt));
        const signal = classifyLiveStudentSignal({
          now: source.now,
          directConnected: directConnected,
          lastSeenAt: lastSeenAt,
          lastSignalAt: lastSignalAt,
        });
        const displayStatus = status === 'offline' && signal.sessionPresent ? 'ready' : status;
        return {
          uid: uid,
          name: normalizeBoundedText(guest.codename || rosterEntry.name || 'Student', 80) || 'Student',
          groupId: normalizeBoundedText(rosterEntry.groupId, LIVE_POLLING_AUDIENCE_ID_MAX_LENGTH) || '',
          connected: directConnected,
          directConnected: directConnected,
          sessionPresent: signal.sessionPresent,
          presenceStatus: signal.presenceStatus,
          signalStatus: signal.signalStatus,
          signalAgeMs: signal.signalAgeMs,
          lastSeenAt: lastSeenAt,
          lastSignalAt: lastSignalAt,
          activity: activity,
          status: displayStatus,
          progressDetail: progressDetail,
          progressCorrect: progressTotal ? Math.min(progressCorrect, progressTotal) : progressCorrect,
          progressTotal: progressTotal,
          progressPercent: progressTotal ? Math.min(100, Math.round((progressCorrect / progressTotal) * 100)) : null,
          practiceProgressAt: practiceProgressAt,
          viewingAt: viewingAt,
          updatedAt: normalizedUpdatedAt,
        };
      };
      if (activePoll && audience.indexOf(uid) >= 0) {
        const entry = responses.find((item) => item && String(item.uid) === uid);
        const rawStatus = responseStatuses[uid];
        activity = liveActivityKindLabel(activePoll.type === 'mcq' ? 'multiple_choice' : activePoll.type === 'freetext' ? 'free_response' : activePoll.type === 'wordcloud' ? 'word_cloud' : activePoll.type);
        status = entry && clampInt(entry.attempt, 1, 1, 2) > 1 ? 'revised'
          : entry ? 'submitted'
            : rawStatus === 'drafting' || rawStatus === 'editing' ? 'working'
              : rawStatus === 'withdrawn' ? 'withdrawn' : 'waiting';
        updatedAt = Number((entry && entry.timestamp) || activePoll.startedAt) || 0;
        studentSignalAt = normalizeLiveActivityTimestamp(entry && entry.timestamp);
      } else {
        const snapshotForUid = function (item) {
          const participants = item.participantStatus && typeof item.participantStatus === 'object' ? item.participantStatus : {};
          const snapshotAudience = Array.isArray(item.audienceUids) ? item.audienceUids.map(String) : [];
          return Object.prototype.hasOwnProperty.call(participants, uid) || snapshotAudience.indexOf(uid) >= 0;
        };
        const activeSnapshot = snapshots.find((item) => ['collecting', 'paused', 'review'].indexOf(item.phase) >= 0 && snapshotForUid(item));
        const group = rosterEntry.groupId && groups[rosterEntry.groupId] && typeof groups[rosterEntry.groupId] === 'object' ? groups[rosterEntry.groupId] : {};
        const targetId = normalizeBoundedText(rosterEntry.resourceId || group.resourceId, LIVE_POLLING_AUDIENCE_ID_MAX_LENGTH);
        const targetAt = Number(rosterEntry.resourceId ? rosterEntry.resourceAt : group.resourceAt) || 0;
        const resource = targetId && resources.find((item) => item && String(item.id) === targetId);
        const statusMatchesAssignment = targetAt > 0 && Number(rosterEntry.viewingResourceAt) === targetAt;
        const deliveryStatus = statusMatchesAssignment ? rosterEntry.viewingResourceStatus : null;
        const opened = !!(targetId && rosterEntry.viewingResourceId === targetId && (statusMatchesAssignment || Number(rosterEntry.viewingAt) >= targetAt));
        if (activeSnapshot) {
          const candidateStatus = activeSnapshot.participantStatus && activeSnapshot.participantStatus[uid];
          activity = liveActivityKindLabel(activeSnapshot.kind || activeSnapshot.family);
          status = ['waiting', 'working', 'submitted', 'revised', 'complete', 'withdrawn'].indexOf(candidateStatus) >= 0 ? candidateStatus : 'waiting';
          updatedAt = Number(activeSnapshot.updatedAt) || 0;
          if (status !== 'waiting') studentSignalAt = updatedAt;
        } else if (targetId) {
          activity = normalizeBoundedText(resource && (resource.title || resource.label), 96)
            || (resource ? liveActivityKindLabel(resource.type) : 'Assigned resource')
            || 'Assigned resource';
          status = deliveryStatus === 'failed' ? 'failed'
            : deliveryStatus === 'loading' ? 'working'
              : rosterEntry.wsProgress && rosterEntry.wsProgress.done ? 'complete'
                : opened ? 'opened' : 'waiting';
          if (rosterEntry.wsProgress && Number(rosterEntry.wsProgress.total) > 0) {
            progressDetail = Math.max(0, Number(rosterEntry.wsProgress.correct) || 0) + '/' + Math.max(0, Number(rosterEntry.wsProgress.total) || 0);
          }
          updatedAt = Number(rosterEntry.viewingAt || rosterEntry.resourceAt || group.resourceAt) || 0;
        } else {
          const snapshot = snapshots.find(snapshotForUid);
          if (!snapshot) return finalizeRow();
          const candidateStatus = snapshot.participantStatus && snapshot.participantStatus[uid];
          activity = liveActivityKindLabel(snapshot.kind || snapshot.family);
          status = ['waiting', 'working', 'submitted', 'revised', 'complete', 'withdrawn'].indexOf(candidateStatus) >= 0 ? candidateStatus : 'waiting';
          updatedAt = Number(snapshot.updatedAt) || 0;
          if (status !== 'waiting') studentSignalAt = updatedAt;
        }
      }
      return finalizeRow();
    }).sort((a, b) => a.name.localeCompare(b.name));
  };
  const summarizeLiveStudentEngagementRows = (rows) => {
    const summary = { active: 0, recent: 0, quiet: 0, offline: 0, unknown: 0 };
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      const status = row && ['active', 'recent', 'quiet', 'offline', 'unknown'].indexOf(row.signalStatus) >= 0
        ? row.signalStatus
        : row && row.connected ? 'active' : 'unknown';
      summary[status] += 1;
    });
    return summary;
  };
  const buildLiveStudentActivityDetail = (row, config) => {
    if (!row || typeof row !== 'object' || !row.uid) return null;
    const source = config && typeof config === 'object' ? config : {};
    const groups = source.groups && typeof source.groups === 'object' ? source.groups : {};
    const group = row.groupId && groups[row.groupId] && typeof groups[row.groupId] === 'object' ? groups[row.groupId] : {};
    const now = normalizeLiveActivityTimestamp(source.now) || Date.now();
    const signal = classifyLiveStudentSignal({
      now: now,
      directConnected: row.directConnected === true || row.connected === true,
      lastSeenAt: row.lastSeenAt,
      lastSignalAt: row.lastSignalAt,
    });
    const timeline = [];
    const seenTimelineKeys = new Set();
    const pushTimeline = function (at, label, detail, kind) {
      const safeAt = normalizeLiveActivityTimestamp(at);
      const safeLabel = normalizeBoundedText(label, 96);
      const safeDetail = normalizeBoundedText(detail, 120);
      if (!safeAt || !safeLabel) return;
      const key = [safeAt, safeLabel, safeDetail].join(':');
      if (seenTimelineKeys.has(key)) return;
      seenTimelineKeys.add(key);
      timeline.push({ id: key, at: safeAt, label: safeLabel, detail: safeDetail, kind: normalizeBoundedText(kind, 24) || 'activity' });
    };
    const snapshots = (Array.isArray(source.activitySnapshots) ? source.activitySnapshots : [])
      .filter(function (item) {
        if (!item || typeof item !== 'object') return false;
        const participants = item.participantStatus && typeof item.participantStatus === 'object' ? item.participantStatus : {};
        const audience = Array.isArray(item.audienceUids) ? item.audienceUids.map(String) : [];
        return Object.prototype.hasOwnProperty.call(participants, String(row.uid)) || audience.indexOf(String(row.uid)) >= 0;
      })
      .slice(-40);
    snapshots.forEach(function (item) {
      const participantStatus = item.participantStatus && item.participantStatus[String(row.uid)];
      const status = ['waiting', 'working', 'submitted', 'revised', 'complete', 'withdrawn'].indexOf(participantStatus) >= 0 ? participantStatus : item.phase;
      pushTimeline(item.updatedAt || item.startedAt, liveActivityKindLabel(item.kind || item.family), status || 'activity update', 'activity');
    });
    pushTimeline(row.updatedAt, liveActivityKindLabel(row.activity), row.status, 'activity');
    if (row.progressTotal) pushTimeline(row.practiceProgressAt || row.updatedAt, 'Practice progress', row.progressCorrect + '/' + row.progressTotal + ' completed', 'progress');
    if (row.viewingAt) pushTimeline(row.viewingAt, 'Resource activity', liveActivityKindLabel(row.activity), 'resource');
    if (row.lastSeenAt) pushTimeline(row.lastSeenAt, 'Session presence signal', '', 'presence');
    const checkIn = source.checkIn && typeof source.checkIn === 'object' ? source.checkIn : null;
    if (checkIn) {
      const checkInStatus = ['sent', 'received', 'working', 'help', 'cancelled'].indexOf(checkIn.status) >= 0 ? checkIn.status : '';
      if (checkInStatus) pushTimeline(checkIn.acknowledgedAt || checkIn.sentAt, 'Teacher check-in', checkInStatus, 'support');
    }
    timeline.sort(function (a, b) { return b.at - a.at; });
    return {
      uid: String(row.uid),
      name: normalizeBoundedText(row.name || 'Student', 80) || 'Student',
      groupId: normalizeBoundedText(row.groupId, LIVE_POLLING_AUDIENCE_ID_MAX_LENGTH) || '',
      groupName: normalizeBoundedText(group.name || row.groupId, 80) || '',
      activity: normalizeBoundedText(row.activity || 'No live activity', 96) || 'No live activity',
      status: normalizeBoundedText(row.status || 'waiting', 24) || 'waiting',
      progressDetail: normalizeBoundedText(row.progressDetail, 48),
      progressCorrect: Math.max(0, Number(row.progressCorrect) || 0),
      progressTotal: Math.max(0, Number(row.progressTotal) || 0),
      progressPercent: Number.isFinite(Number(row.progressPercent)) ? Math.max(0, Math.min(100, Number(row.progressPercent))) : null,
      directConnected: row.directConnected === true || row.connected === true,
      sessionPresent: row.sessionPresent === true || signal.sessionPresent,
      presenceStatus: row.presenceStatus || signal.presenceStatus,
      signalStatus: row.signalStatus || signal.signalStatus,
      signalAgeMs: row.signalAgeMs == null ? signal.signalAgeMs : Math.max(0, Number(row.signalAgeMs) || 0),
      lastSignalAt: normalizeLiveActivityTimestamp(row.lastSignalAt),
      timeline: timeline.slice(0, 8),
    };
  };
  const LIVE_STUDENT_ACTIVITY_FILTERS = ['all', 'help', 'in-progress', 'finished', 'attention', 'offline'];
  const LIVE_STUDENT_ACTIVITY_SORTS = ['attention', 'name'];
  const liveStudentActivityMatchesFilter = (row, filter) => {
    const selected = LIVE_STUDENT_ACTIVITY_FILTERS.indexOf(filter) >= 0 ? filter : 'all';
    if (selected === 'all') return true;
    if (selected === 'help') return row.supportStatus === 'help';
    if (selected === 'offline') return liveStudentRowIsOffline(row);
    if (selected === 'in-progress') return ['working', 'opened', 'ready'].indexOf(row.status) >= 0;
    if (selected === 'finished') return ['submitted', 'revised', 'complete'].indexOf(row.status) >= 0;
    return row.supportStatus === 'help' || ['failed', 'withdrawn', 'waiting'].indexOf(row.status) >= 0;
  };
  const summarizeLiveStudentActivityRows = (rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    return LIVE_STUDENT_ACTIVITY_FILTERS.reduce((summary, filter) => {
      summary[filter] = filter === 'all'
        ? safeRows.length
        : safeRows.filter((row) => row && liveStudentActivityMatchesFilter(row, filter)).length;
      return summary;
    }, {});
  };
  const filterLiveStudentActivityRows = (rows, config) => {
    const source = config && typeof config === 'object' ? config : {};
    const filter = LIVE_STUDENT_ACTIVITY_FILTERS.indexOf(source.filter) >= 0 ? source.filter : 'all';
    const sort = LIVE_STUDENT_ACTIVITY_SORTS.indexOf(source.sort) >= 0 ? source.sort : 'name';
    const query = normalizeBoundedText(source.query, 80).toLocaleLowerCase();
    const groups = source.groups && typeof source.groups === 'object' ? source.groups : {};
    const filtered = (Array.isArray(rows) ? rows : []).filter((row) => {
      if (!row || !liveStudentActivityMatchesFilter(row, filter)) return false;
      if (!query) return true;
      const group = row.groupId && groups[row.groupId] && typeof groups[row.groupId] === 'object' ? groups[row.groupId] : {};
      return [row.name, row.activity, row.status, row.progressDetail, row.groupId, group.name]
        .some((value) => String(value || '').toLocaleLowerCase().indexOf(query) >= 0);
    });
    const attentionRank = { failed: 0, withdrawn: 1, waiting: 2, working: 3, opened: 4, ready: 4, submitted: 5, revised: 5, complete: 5 };
    return filtered.slice().sort(function (a, b) {
      if (sort === 'attention') {
        const aRank = a.supportStatus === 'help' ? -2 : liveStudentRowIsOffline(a) ? -1 : (Object.prototype.hasOwnProperty.call(attentionRank, a.status) ? attentionRank[a.status] : 3);
        const bRank = b.supportStatus === 'help' ? -2 : liveStudentRowIsOffline(b) ? -1 : (Object.prototype.hasOwnProperty.call(attentionRank, b.status) ? attentionRank[b.status] : 3);
        if (aRank !== bRank) return aRank - bRank;
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  };
  const LIVE_TEACHER_ACTION_REASONS = ['help', 'failed', 'offline', 'withdrawn', 'waiting'];
  const normalizeLiveTeacherActionState = (value, now) => {
    if (value === true) return { status: 'resolved', updatedAt: Math.max(0, Number(now) || Date.now()), snoozedUntil: 0 };
    const source = value && typeof value === 'object' ? value : {};
    const status = ['claimed', 'snoozed', 'resolved'].indexOf(source.status) >= 0 ? source.status : 'open';
    return {
      status: status,
      updatedAt: Math.max(0, Number(source.updatedAt) || 0),
      snoozedUntil: status === 'snoozed' ? Math.max(0, Number(source.snoozedUntil) || 0) : 0,
    };
  };
  const buildLiveTeacherActionQueue = (rows, actionStates, now) => {
    const states = actionStates && typeof actionStates === 'object' ? actionStates : {};
    const current = Math.max(0, Number(now) || Date.now());
    const priorities = { help: 0, failed: 1, offline: 2, withdrawn: 3, waiting: 4 };
    return (Array.isArray(rows) ? rows : []).reduce(function (queue, row) {
      if (!row || !row.uid) return queue;
      let reason = '';
      if (row.supportStatus === 'help') reason = 'help';
      else if (row.status === 'failed') reason = 'failed';
      else if (liveStudentRowIsOffline(row)) reason = 'offline';
      else if (row.status === 'withdrawn') reason = 'withdrawn';
      else if (row.status === 'waiting') reason = 'waiting';
      if (!reason) return queue;
      const version = Math.max(0, Number(row.supportUpdatedAt || row.updatedAt) || 0);
      const key = [String(row.uid), reason, String(row.activity || ''), String(version)].join(':');
      const actionState = normalizeLiveTeacherActionState(states[key], current);
      if (actionState.status === 'resolved' || (actionState.status === 'snoozed' && actionState.snoozedUntil > current)) return queue;
      queue.push({
        key: key,
        uid: String(row.uid),
        name: String(row.name || 'Student'),
        reason: reason,
        activity: String(row.activity || 'No live activity'),
        connected: !!row.connected,
        status: String(row.status || ''),
        priority: priorities[reason],
        openedAt: version,
        waitMs: version ? Math.max(0, current - version) : 0,
        actionStatus: actionState.status === 'claimed' ? 'claimed' : 'open',
      });
      return queue;
    }, []).sort(function (a, b) {
      return a.priority !== b.priority ? a.priority - b.priority : a.name.localeCompare(b.name);
    });
  };
  const liveTeacherActionStorageKey = (sessionCode) => {
    const code = encodeURIComponent(String(sessionCode || '').trim().slice(0, 80));
    return code ? 'allo:live-teacher-actions:v1:' + code : '';
  };
  const normalizeLiveTeacherActionStateMap = (value, now) => {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const current = Math.max(0, Number(now) || Date.now());
    return Object.keys(source).slice(-250).reduce(function (out, key) {
      const state = normalizeLiveTeacherActionState(source[key], current);
      if (!state.updatedAt || current - state.updatedAt > LIVE_TEACHER_ACTION_STATE_MAX_AGE_MS) return out;
      if (state.status !== 'open') out[String(key).slice(0, 500)] = state;
      return out;
    }, {});
  };
  const readLiveTeacherActionState = (sessionCode, storage, now) => {
    const key = liveTeacherActionStorageKey(sessionCode);
    if (!key) return {};
    try {
      const target = storage || ((typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : null);
      const raw = target && target.getItem(key);
      return raw ? normalizeLiveTeacherActionStateMap(JSON.parse(raw), now) : {};
    } catch (err) { return {}; }
  };
  const writeLiveTeacherActionState = (sessionCode, state, storage, now) => {
    const key = liveTeacherActionStorageKey(sessionCode);
    if (!key) return false;
    try {
      const target = storage || ((typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : null);
      if (!target) return false;
      const normalized = normalizeLiveTeacherActionStateMap(state, now);
      if (!Object.keys(normalized).length) target.removeItem(key);
      else target.setItem(key, JSON.stringify(normalized));
      return true;
    } catch (err) { return false; }
  };
  const buildLiveSessionWrapUp = (config) => {
    const source = config && typeof config === 'object' ? config : {};
    const now = Math.max(0, Number(source.now) || Date.now());
    const polls = (Array.isArray(source.completedPolls) ? source.completedPolls : []).filter(Boolean).slice(-100);
    if (source.activePoll) polls.push({
      poll: source.activePoll,
      responses: Array.isArray(source.activeResponses) ? source.activeResponses : [],
      audienceUids: Array.isArray(source.activeParticipantUids) ? source.activeParticipantUids : [],
      audienceCount: Array.isArray(source.activeParticipantUids) ? source.activeParticipantUids.length : 0,
      startedAt: source.activePoll.startedAt,
      endedAt: 0,
      active: true,
    });
    const incomplete = new Set();
    let invited = 0;
    let responses = 0;
    const timeline = polls.map(function (entry) {
      const poll = entry.poll || {};
      const audienceUids = Array.isArray(entry.audienceUids) ? entry.audienceUids.map(String) : [];
      const responseRows = uniqueResponsesForSummary(entry.responses || []);
      const responseUids = new Set(responseRows.map(function (row) { return String(row && row.uid || ''); }).filter(Boolean));
      audienceUids.forEach(function (uid) { if (!responseUids.has(uid)) incomplete.add(uid); });
      const audienceCount = Math.max(audienceUids.length, Number(entry.audienceCount) || 0);
      invited += audienceCount;
      responses += responseRows.length;
      return {
        id: String(poll.id || entry.endedAt || ('poll-' + timeline.length)),
        kind: liveActivityKindLabel(poll.type === 'mcq' ? 'multiple_choice' : poll.type === 'freetext' ? 'free_text' : poll.type),
        phase: entry.active ? 'collecting' : 'closed',
        responded: responseRows.length,
        invited: audienceCount,
        startedAt: Math.max(0, Number(entry.startedAt || poll.startedAt) || 0),
        endedAt: Math.max(0, Number(entry.endedAt) || 0),
      };
    });
    const knownIds = new Set(timeline.map(function (item) { return item.id; }));
    (Array.isArray(source.activitySnapshots) ? source.activitySnapshots : []).slice(-60).forEach(function (snapshot) {
      if (!snapshot || !snapshot.activityId || knownIds.has(String(snapshot.activityId))) return;
      const counts = snapshot.counts && typeof snapshot.counts === 'object' ? snapshot.counts : {};
      const statuses = snapshot.participantStatus && typeof snapshot.participantStatus === 'object' ? snapshot.participantStatus : {};
      const audience = Array.isArray(snapshot.audienceUids) ? snapshot.audienceUids.map(String) : Object.keys(statuses);
      const finished = audience.filter(function (uid) { return ['submitted', 'revised', 'complete'].indexOf(statuses[uid]) >= 0; }).length;
      timeline.push({
        id: String(snapshot.activityId),
        kind: liveActivityKindLabel(snapshot.kind || snapshot.family),
        phase: String(snapshot.phase || 'closed'),
        responded: Math.max(finished, Number(counts.submitted) || 0),
        invited: audience.length,
        startedAt: Math.max(0, Number(snapshot.startedAt) || 0),
        endedAt: Math.max(0, Number(snapshot.endedAt) || 0),
      });
    });
    const queue = Array.isArray(source.actionQueue) ? source.actionQueue : [];
    const qaQuestions = source.sessionQaState && Array.isArray(source.sessionQaState.questions) ? source.sessionQaState.questions : [];
    const sessionStartedAt = Math.max(0, Number(source.sessionStartedAt) || (timeline.length ? Math.min.apply(null, timeline.map(function (item) { return item.startedAt || now; })) : now));
    return {
      activityCount: timeline.length,
      pollCount: polls.length,
      invitedCount: invited,
      responseCount: responses,
      responseRate: invited ? Math.max(0, Math.min(100, Math.round((responses / invited) * 100))) : 0,
      incompleteUids: Array.from(incomplete).slice(0, 250),
      unresolvedCount: queue.length,
      helpRequestCount: queue.filter(function (item) { return item && item.reason === 'help'; }).length,
      deliveryFailureCount: queue.filter(function (item) { return item && item.reason === 'failed'; }).length,
      pendingQuestionCount: qaQuestions.filter(function (question) { return question && question.status === 'pending'; }).length,
      durationMs: Math.max(0, now - sessionStartedAt),
      timeline: timeline.sort(function (a, b) { return (b.startedAt || b.endedAt) - (a.startedAt || a.endedAt); }).slice(0, 20),
    };
  };
  const FEEDBACK_RESPONSE_MAX_LENGTH = 2300;
  const FEEDBACK_CRITERIA_MAX_LENGTH = 1200;
  const FEEDBACK_TEXT_MAX_LENGTH = 1200;
  const normalizeBoundedText = (value, maxLength) => {
    let out = value == null ? '' : String(value);
    try { if (typeof out.normalize === 'function') out = out.normalize('NFKC'); } catch (err) {}
    out = out.replace(/\r\n?/g, '\n').trim();
    return out.length > maxLength ? out.slice(0, maxLength).trim() : out;
  };
  const LIVE_POLLING_AUDIENCE_ID_MAX_LENGTH = 128;
  const normalizeLivePollingAudienceSelection = (mode, targetId) => {
    const modeWasProvided = mode != null;
    const rawMode = mode == null ? '' : String(mode).trim().toLowerCase();
    const boundedTargetId = normalizeBoundedText(targetId, LIVE_POLLING_AUDIENCE_ID_MAX_LENGTH).replace(/\s+/g, ' ');
    // A completely absent audience is the legacy whole-class preset shape.
    // An explicit blank mode or an id without a mode is malformed, however,
    // and must not silently broaden into a class broadcast.
    if (!rawMode) {
      return modeWasProvided || boundedTargetId
        ? { audienceMode: '', audienceId: boundedTargetId, valid: false }
        : { audienceMode: 'class', audienceId: '', valid: true };
    }
    const audienceMode = rawMode === 'class' || rawMode === 'group' || rawMode === 'individual' ? rawMode : '';
    const audienceId = audienceMode === 'class'
      ? ''
      : boundedTargetId;
    return {
      audienceMode: audienceMode,
      audienceId: audienceId,
      valid: !!audienceMode && (audienceMode === 'class' || !!audienceId),
    };
  };
  const resolveLivePollingAudienceUids = (guestList, roster, mode, targetId, selectableGroups) => {
    const selection = normalizeLivePollingAudienceSelection(mode, targetId);
    if (!selection.valid) return [];
    const guests = Array.isArray(guestList) ? guestList : [];
    const rosterMap = roster && typeof roster === 'object' && !Array.isArray(roster) ? roster : {};
    let allowedGroupIds = null;
    if (Array.isArray(selectableGroups)) {
      allowedGroupIds = new Set(selectableGroups.map(function (group) {
        return normalizeBoundedText(group && typeof group === 'object' ? group.id : group, LIVE_POLLING_AUDIENCE_ID_MAX_LENGTH);
      }).filter(Boolean));
    }
    if (selection.audienceMode === 'group' && allowedGroupIds && !allowedGroupIds.has(selection.audienceId)) return [];
    const seen = new Set();
    return guests.reduce(function (out, guest) {
      const uid = guest && guest.uid != null ? String(guest.uid) : '';
      if (!uid || seen.has(uid)) return out;
      let included = selection.audienceMode === 'class';
      if (selection.audienceMode === 'individual') {
        included = uid === selection.audienceId;
      } else if (selection.audienceMode === 'group') {
        const rosterEntry = Object.prototype.hasOwnProperty.call(rosterMap, uid) ? rosterMap[uid] : null;
        included = !!(rosterEntry && String(rosterEntry.groupId || '') === selection.audienceId);
      }
      if (included) {
        seen.add(uid);
        out.push(uid);
      }
      return out;
    }, []);
  };
  const filterLivePollingResponsesToAudience = (responseList, audienceUids) => {
    const allowed = new Set((Array.isArray(audienceUids) ? audienceUids : []).map(function (uid) {
      return uid == null ? '' : String(uid);
    }).filter(Boolean));
    return (Array.isArray(responseList) ? responseList : []).filter(function (entry) {
      return entry && allowed.has(String(entry.uid || ''));
    });
  };
  const normalizeFeedbackResponseText = (value) => normalizeBoundedText(value, FEEDBACK_RESPONSE_MAX_LENGTH);
  const normalizeFeedbackConfig = (poll) => {
    const raw = poll && poll.feedback && typeof poll.feedback === 'object' ? poll.feedback : {};
    const enabled = !!(poll && poll.type === 'freetext' && raw.enabled === true);
    return {
      enabled: enabled,
      criteria: enabled ? normalizeBoundedText(raw.criteria, FEEDBACK_CRITERIA_MAX_LENGTH) : '',
      maxAttempts: enabled ? clampInt(raw.maxAttempts, 2, 1, 2) : 1,
    };
  };
  const isFeedbackPoll = (poll) => normalizeFeedbackConfig(poll).enabled;
  const sanitizeFeedbackPacket = (packet, pollId) => {
    const source = packet && typeof packet === 'object' ? packet : {};
    const textValue = normalizeBoundedText(source.text, FEEDBACK_TEXT_MAX_LENGTH);
    if (!textValue) return null;
    const attempt = clampInt(source.attempt, 1, 1, 2);
    return {
      pollId: String(pollId || source.pollId || '').slice(0, 100),
      feedbackId: String(source.feedbackId || ('feedback-' + Date.now())).slice(0, 120),
      text: textValue,
      attempt: attempt,
      allowRevision: source.allowRevision === true && attempt < 2,
      sentAt: Number.isFinite(Number(source.sentAt)) ? Number(source.sentAt) : Date.now(),
    };
  };
  const upsertFeedbackResponse = (responseList, entry) => {
    const list = Array.isArray(responseList) ? responseList.slice() : [];
    if (!entry || !entry.uid) return list;
    const attempt = clampInt(entry.attempt, 1, 1, 2);
    const response = normalizeFeedbackResponseText(entry.response);
    if (!response) return list;
    const idx = list.findIndex((row) => row && row.uid === entry.uid);
    const previous = idx >= 0 ? list[idx] : {};
    const attempts = Array.isArray(previous.attempts)
      ? previous.attempts.filter((item) => item && item.attempt !== attempt)
      : [];
    attempts.push({ attempt: attempt, response: response, timestamp: Number(entry.timestamp) || Date.now() });
    attempts.sort((a, b) => a.attempt - b.attempt);
    const next = Object.assign({}, previous, entry, {
      response: response,
      attempt: attempt,
      timestamp: Number(entry.timestamp) || Date.now(),
      attempts: attempts,
    });
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    return list;
  };
  // Compatibility alias for existing Feedback Response callers. Audience
  // selection now belongs to the shared poll composer for every poll type.
  const resolveFeedbackAudienceUids = resolveLivePollingAudienceUids;
  const buildFeedbackPrompt = (input) => {
    const source = input && typeof input === 'object' ? input : {};
    const prompt = normalizeBoundedText(source.prompt, 1200);
    const criteria = normalizeBoundedText(source.criteria, FEEDBACK_CRITERIA_MAX_LENGTH);
    const response = normalizeFeedbackResponseText(source.response);
    const previousResponse = normalizeFeedbackResponseText(source.previousResponse);
    const attempt = clampInt(source.attempt, 1, 1, 2);
    return [
      'You are helping a teacher give private formative feedback to one student.',
      'Write 2 short parts: (1) one specific strength grounded in the response, and (2) one concrete next step for revision.',
      'Stay aligned to the teacher criteria. Do not assign a grade, diagnose the learner, infer identity, or add generic praise.',
      'Keep the entire feedback under 110 words. Return feedback text only.',
      '',
      'PROMPT:',
      prompt || '(not provided)',
      '',
      'TEACHER CRITERIA:',
      criteria || 'Accuracy, clarity, and evidence from the lesson.',
      '',
      previousResponse && attempt > 1 ? 'PRIOR ATTEMPT:' : '',
      previousResponse && attempt > 1 ? previousResponse : '',
      previousResponse && attempt > 1 ? '' : '',
      'STUDENT ATTEMPT ' + attempt + ':',
      response,
      previousResponse && attempt > 1 ? '' : '',
      previousResponse && attempt > 1 ? 'Acknowledge one concrete improvement when the revision shows one; otherwise give the most important remaining next step.' : '',
    ].filter(function (line, index, lines) {
      return line !== '' || (index > 0 && lines[index - 1] !== '');
    }).join('\n');
  };

  const PEER_SHOWCASE_MIN_CANDIDATES = 2;
  const PEER_SHOWCASE_MAX_CANDIDATES = 8;
  const PEER_SHOWCASE_RESPONSE_MAX_LENGTH = 1200;
  const PEER_VOTE_CRITERION_MAX_LENGTH = 180;
  const normalizePeerShowcaseText = (value) => normalizeBoundedText(value, PEER_SHOWCASE_RESPONSE_MAX_LENGTH);
  const normalizePeerVoteCriterion = (value) => {
    const normalized = normalizeBoundedText(value, PEER_VOTE_CRITERION_MAX_LENGTH);
    return normalized || 'Which response best supports its thinking with clear evidence?';
  };
  const normalizePeerModerationStatus = (value) => (
    value === 'approved' || value === 'hidden' ? value : 'pending'
  );
  const buildPeerShowcaseReviewRows = (responseList, moderationByUid) => {
    const moderation = moderationByUid && typeof moderationByUid === 'object' ? moderationByUid : {};
    return uniqueResponsesForSummary(responseList).map((entry) => ({
      uid: String((entry && entry.uid) || '').slice(0, 128),
      codename: String((entry && entry.codename) || 'Student').slice(0, 64),
      response: normalizePeerShowcaseText(entry && entry.response),
      status: normalizePeerModerationStatus(moderation[entry && entry.uid]),
    })).filter((entry) => entry.uid && entry.response);
  };
  const buildPeerShowcaseRound = (input) => {
    const source = input && typeof input === 'object' ? input : {};
    const roundId = String(source.roundId || ('showcase-' + Date.now())).slice(0, 120);
    const pollId = String(source.pollId || '').slice(0, 100);
    const seenOwners = new Set();
    const candidates = (Array.isArray(source.candidates) ? source.candidates : []).reduce((out, item) => {
      if (out.length >= PEER_SHOWCASE_MAX_CANDIDATES) return out;
      const ownerUid = String((item && item.ownerUid) || (item && item.uid) || '').slice(0, 128);
      const response = normalizePeerShowcaseText(item && (item.response != null ? item.response : item.text));
      if (!ownerUid || !response || seenOwners.has(ownerUid)) return out;
      seenOwners.add(ownerUid);
      out.push({
        candidateId: 'candidate-' + (out.length + 1),
        ownerUid: ownerUid,
        response: response,
      });
      return out;
    }, []);
    if (!roundId || !pollId || candidates.length < PEER_SHOWCASE_MIN_CANDIDATES) return null;
    return {
      roundId: roundId,
      pollId: pollId,
      prompt: normalizeBoundedText(source.prompt, 600),
      criterion: normalizePeerVoteCriterion(source.criterion),
      candidates: candidates,
      openedAt: Number(source.openedAt) || Date.now(),
    };
  };
  const sanitizePeerShowcaseRound = (round, viewerUid) => {
    if (!round || typeof round !== 'object' || !round.roundId || !round.pollId) return null;
    const viewer = String(viewerUid || '');
    const candidates = (Array.isArray(round.candidates) ? round.candidates : [])
      .slice(0, PEER_SHOWCASE_MAX_CANDIDATES)
      .map((item) => ({
        candidateId: String((item && item.candidateId) || '').slice(0, 64),
        response: normalizePeerShowcaseText(item && item.response),
        own: !!(viewer && item && item.ownerUid === viewer),
      }))
      .filter((item) => item.candidateId && item.response);
    if (candidates.length < PEER_SHOWCASE_MIN_CANDIDATES) return null;
    return {
      roundId: String(round.roundId).slice(0, 120),
      pollId: String(round.pollId).slice(0, 100),
      prompt: normalizeBoundedText(round.prompt, 600),
      criterion: normalizePeerVoteCriterion(round.criterion),
      candidates: candidates,
      openedAt: Number(round.openedAt) || Date.now(),
    };
  };
  const normalizePeerVote = (payload, round, voterUid) => {
    if (!payload || !round || payload.roundId !== round.roundId) return null;
    const candidateId = String(payload.candidateId || '').slice(0, 64);
    const candidate = (Array.isArray(round.candidates) ? round.candidates : [])
      .find((item) => item && item.candidateId === candidateId);
    if (!candidate || candidate.ownerUid === String(voterUid || '')) return null;
    return {
      roundId: String(round.roundId).slice(0, 120),
      candidateId: candidateId,
      timestamp: Number(payload.timestamp) || Date.now(),
    };
  };
  const upsertPeerVote = (votesByUid, voterUid, vote) => {
    const uid = String(voterUid || '').slice(0, 128);
    if (!uid || !vote || !vote.roundId || !vote.candidateId) {
      return Object.assign({}, votesByUid && typeof votesByUid === 'object' ? votesByUid : {});
    }
    return Object.assign({}, votesByUid && typeof votesByUid === 'object' ? votesByUid : {}, {
      [uid]: {
        roundId: String(vote.roundId).slice(0, 120),
        candidateId: String(vote.candidateId).slice(0, 64),
        timestamp: Number(vote.timestamp) || Date.now(),
      },
    });
  };
  const buildPeerVoteResults = (round, votesByUid) => {
    const safeRound = sanitizePeerShowcaseRound(round, '');
    if (!safeRound) return null;
    const validIds = new Set(safeRound.candidates.map((item) => item.candidateId));
    const votes = Object.entries(votesByUid && typeof votesByUid === 'object' ? votesByUid : {})
      .map(([voterUid, vote]) => normalizePeerVote(vote, round, voterUid))
      .filter((vote) => vote && vote.roundId === safeRound.roundId && validIds.has(vote.candidateId));
    const total = votes.length;
    return {
      roundId: safeRound.roundId,
      pollId: safeRound.pollId,
      prompt: safeRound.prompt,
      criterion: safeRound.criterion,
      votesCast: total,
      candidates: safeRound.candidates.map((candidate) => {
        const count = votes.filter((vote) => vote.candidateId === candidate.candidateId).length;
        return {
          candidateId: candidate.candidateId,
          response: candidate.response,
          count: count,
          percent: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      }),
      closedAt: Date.now(),
    };
  };


  // Session-wide moderated Q&A -------------------------------------------------
  // Q&A uses the same RTC star as live polling but is intentionally independent
  // of any one poll. Raw question text, author identity, and voter identity live
  // only in the teacher's in-memory PollingHost. Guest packets contain approved
  // anonymous questions plus the viewer's own held/dismissed questions.
  const SESSION_QA_MAX_QUESTIONS = 150;
  const SESSION_QA_MAX_PER_AUTHOR = 12;
  const SESSION_QA_QUESTION_MAX_LENGTH = 500;
  const SESSION_QA_CLIENT_ID_MAX_LENGTH = 80;
  const SESSION_QA_ID_MAX_LENGTH = 120;
  const normalizeSessionQaQuestionText = (value) => {
    const text = normalizeBoundedText(value, SESSION_QA_QUESTION_MAX_LENGTH);
    return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  };
  const normalizeSessionQaId = (value, maxLength) => {
    const id = String(value || '').trim().slice(0, maxLength || SESSION_QA_ID_MAX_LENGTH);
    if (!id || id === '__proto__' || id === 'prototype' || id === 'constructor') return '';
    return id;
  };
  const normalizeSessionQaStatus = (value) => (
    value === 'approved' || value === 'dismissed' || value === 'archived' ? value : 'held'
  );
  const createSessionQaState = (input) => {
    const source = input && typeof input === 'object' ? input : {};
    return {
      enabled: source.enabled === true,
      submissionsLocked: source.submissionsLocked === true,
      questions: Array.isArray(source.questions) ? source.questions.slice(0, SESSION_QA_MAX_QUESTIONS) : [],
      upvotesByQuestion: source.upvotesByQuestion && typeof source.upvotesByQuestion === 'object'
        ? Object.assign({}, source.upvotesByQuestion)
        : {},
      featuredQuestionId: normalizeSessionQaId(source.featuredQuestionId, SESSION_QA_ID_MAX_LENGTH) || null,
      updatedAt: Number(source.updatedAt) || Date.now(),
    };
  };
  const getSessionQaUpvoteCount = (upvotesByQuestion, questionId) => {
    const byQuestion = upvotesByQuestion && typeof upvotesByQuestion === 'object' ? upvotesByQuestion : {};
    const votes = byQuestion[questionId] && typeof byQuestion[questionId] === 'object'
      ? byQuestion[questionId]
      : {};
    return Object.keys(votes).length;
  };
  const submitSessionQaQuestion = (state, submission, nowValue, idToken) => {
    const current = state && typeof state === 'object' ? state : createSessionQaState();
    if (current.enabled !== true || current.submissionsLocked === true) return current;
    const source = submission && typeof submission === 'object' ? submission : {};
    const ownerUid = normalizeSessionQaId(source.ownerUid, 128);
    const codename = normalizeBoundedText(source.codename || 'Student', 64) || 'Student';
    const text = normalizeSessionQaQuestionText(source.text);
    const clientQuestionId = normalizeSessionQaId(source.clientQuestionId, SESSION_QA_CLIENT_ID_MAX_LENGTH);
    const questions = Array.isArray(current.questions) ? current.questions : [];
    if (!ownerUid || !text || questions.length >= SESSION_QA_MAX_QUESTIONS) return current;
    if (clientQuestionId && questions.some((question) => (
      question && question.ownerUid === ownerUid && question.clientQuestionId === clientQuestionId
    ))) return current;
    if (questions.filter((question) => question && question.ownerUid === ownerUid).length >= SESSION_QA_MAX_PER_AUTHOR) {
      return current;
    }
    const now = Number(nowValue) || Date.now();
    const token = String(idToken || Math.random().toString(36).slice(2, 10))
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 10) || 'question';
    const baseId = ('qa-' + Math.max(0, Math.round(now)).toString(36) + '-' + token)
      .slice(0, SESSION_QA_ID_MAX_LENGTH);
    let questionId = baseId;
    let suffix = 2;
    while (questions.some((question) => question && question.questionId === questionId)) {
      questionId = (baseId + '-' + suffix).slice(0, SESSION_QA_ID_MAX_LENGTH);
      suffix += 1;
    }
    const question = {
      questionId: questionId,
      clientQuestionId: clientQuestionId,
      ownerUid: ownerUid,
      codename: codename,
      text: text,
      status: 'held',
      archivedFrom: null,
      createdAt: now,
      updatedAt: now,
    };
    return Object.assign({}, current, {
      questions: questions.concat([question]),
      updatedAt: now,
    });
  };
  const moderateSessionQaQuestion = (state, questionIdValue, action, nowValue) => {
    const current = state && typeof state === 'object' ? state : createSessionQaState();
    const questionId = normalizeSessionQaId(questionIdValue, SESSION_QA_ID_MAX_LENGTH);
    const questions = Array.isArray(current.questions) ? current.questions : [];
    const index = questions.findIndex((question) => question && question.questionId === questionId);
    if (index < 0) return current;
    const existing = questions[index];
    let nextStatus = normalizeSessionQaStatus(action);
    let archivedFrom = existing.archivedFrom || null;
    if (action === 'archive') {
      nextStatus = 'archived';
      archivedFrom = existing.status === 'archived'
        ? (existing.archivedFrom || 'held')
        : normalizeSessionQaStatus(existing.status);
    } else if (action === 'restore') {
      if (existing.status !== 'archived') return current;
      nextStatus = existing.archivedFrom === 'approved' || existing.archivedFrom === 'dismissed'
        ? existing.archivedFrom
        : 'held';
      archivedFrom = null;
    } else if (action === 'hold') {
      nextStatus = 'held';
      archivedFrom = null;
    } else if (action === 'approve') {
      nextStatus = 'approved';
      archivedFrom = null;
    } else if (action === 'dismiss') {
      nextStatus = 'dismissed';
      archivedFrom = null;
    } else {
      return current;
    }
    if (existing.status === nextStatus && existing.archivedFrom === archivedFrom) return current;
    const now = Number(nowValue) || Date.now();
    const nextQuestions = questions.slice();
    nextQuestions[index] = Object.assign({}, existing, {
      status: nextStatus,
      archivedFrom: archivedFrom,
      updatedAt: now,
    });
    return Object.assign({}, current, {
      questions: nextQuestions,
      featuredQuestionId: nextStatus === 'approved' || current.featuredQuestionId !== questionId
        ? current.featuredQuestionId
        : null,
      updatedAt: now,
    });
  };
  const setSessionQaUpvote = (state, questionIdValue, voterUidValue, active, nowValue) => {
    const current = state && typeof state === 'object' ? state : createSessionQaState();
    if (current.enabled !== true) return current;
    const questionId = normalizeSessionQaId(questionIdValue, SESSION_QA_ID_MAX_LENGTH);
    const voterUid = normalizeSessionQaId(voterUidValue, 128);
    const question = (Array.isArray(current.questions) ? current.questions : [])
      .find((item) => item && item.questionId === questionId);
    if (!question || question.status !== 'approved' || !voterUid || question.ownerUid === voterUid) return current;
    const allVotes = current.upvotesByQuestion && typeof current.upvotesByQuestion === 'object'
      ? current.upvotesByQuestion
      : {};
    const priorVotes = allVotes[questionId] && typeof allVotes[questionId] === 'object'
      ? allVotes[questionId]
      : {};
    const alreadyActive = Object.prototype.hasOwnProperty.call(priorVotes, voterUid);
    if ((active === true && alreadyActive) || (active !== true && !alreadyActive)) return current;
    const nextVotes = Object.assign({}, priorVotes);
    if (active === true) nextVotes[voterUid] = Number(nowValue) || Date.now();
    else delete nextVotes[voterUid];
    return Object.assign({}, current, {
      upvotesByQuestion: Object.assign({}, allVotes, { [questionId]: nextVotes }),
      updatedAt: Number(nowValue) || Date.now(),
    });
  };
  const sortSessionQaQuestions = (questionList, mode, upvotesByQuestion) => {
    const list = Array.isArray(questionList) ? questionList.slice() : [];
    const score = (question) => Number(question && question.upvoteCount) || getSessionQaUpvoteCount(
      upvotesByQuestion,
      question && question.questionId
    );
    return list.sort((a, b) => {
      if (mode === 'top') {
        const voteDelta = score(b) - score(a);
        if (voteDelta) return voteDelta;
      }
      const timeDelta = (Number(b && b.createdAt) || 0) - (Number(a && a.createdAt) || 0);
      if (timeDelta) return timeDelta;
      return String((a && a.questionId) || '').localeCompare(String((b && b.questionId) || ''));
    });
  };
  const sanitizeFeaturedQaPacket = (question, upvotesByQuestion, featuredAt) => {
    if (!question || typeof question !== 'object') return null;
    if (question.status != null && question.status !== 'approved') return null;
    const questionId = normalizeSessionQaId(question.questionId, SESSION_QA_ID_MAX_LENGTH);
    const text = normalizeSessionQaQuestionText(question.text);
    if (!questionId || !text) return null;
    return {
      questionId: questionId,
      text: text,
      upvoteCount: Math.max(0, clampInt(
        question.upvoteCount != null
          ? question.upvoteCount
          : getSessionQaUpvoteCount(upvotesByQuestion, questionId),
        0,
        0,
        SESSION_QA_MAX_QUESTIONS
      )),
      featuredAt: Number(featuredAt || question.featuredAt) || Date.now(),
    };
  };
  const sanitizeSessionQaState = (state, viewerUidValue) => {
    const current = state && typeof state === 'object' ? state : createSessionQaState();
    const viewerUid = normalizeSessionQaId(viewerUidValue, 128);
    const enabled = current.enabled === true;
    const questions = enabled ? (Array.isArray(current.questions) ? current.questions : []).reduce((out, question) => {
      if (out.length >= SESSION_QA_MAX_QUESTIONS || !question || typeof question !== 'object') return out;
      const questionId = normalizeSessionQaId(question.questionId, SESSION_QA_ID_MAX_LENGTH);
      const text = normalizeSessionQaQuestionText(question.text);
      const status = normalizeSessionQaStatus(question.status);
      const own = !!(viewerUid && question.ownerUid === viewerUid);
      const isPublic = status === 'approved';
      if (!questionId || !text || (!isPublic && !(own && (status === 'held' || status === 'dismissed')))) return out;
      const votes = current.upvotesByQuestion && current.upvotesByQuestion[questionId];
      out.push({
        questionId: questionId,
        text: text,
        status: status,
        createdAt: Number(question.createdAt) || 0,
        updatedAt: Number(question.updatedAt) || 0,
        upvoteCount: isPublic ? getSessionQaUpvoteCount(current.upvotesByQuestion, questionId) : 0,
        upvotedByViewer: !!(isPublic && viewerUid && votes && Object.prototype.hasOwnProperty.call(votes, viewerUid)),
        own: own,
        featured: !!(isPublic && current.featuredQuestionId === questionId),
      });
      return out;
    }, []) : [];
    const featuredSource = enabled && current.featuredQuestionId
      ? (Array.isArray(current.questions) ? current.questions : []).find((question) => (
          question && question.questionId === current.featuredQuestionId && question.status === 'approved'
        ))
      : null;
    return {
      enabled: enabled,
      submissionsLocked: enabled && current.submissionsLocked === true,
      questions: questions,
      featuredQuestion: featuredSource
        ? sanitizeFeaturedQaPacket(featuredSource, current.upvotesByQuestion, current.updatedAt)
        : null,
      updatedAt: Number(current.updatedAt) || Date.now(),
    };
  };
  const sanitizeSessionQaGuestPacket = (packet) => {
    const source = packet && typeof packet === 'object' ? packet : {};
    const enabled = source.enabled === true;
    const questions = enabled ? (Array.isArray(source.questions) ? source.questions : []).reduce((out, question) => {
      if (out.length >= SESSION_QA_MAX_QUESTIONS || !question || typeof question !== 'object') return out;
      const questionId = normalizeSessionQaId(question.questionId, SESSION_QA_ID_MAX_LENGTH);
      const text = normalizeSessionQaQuestionText(question.text);
      const status = question.status === 'approved'
        ? 'approved'
        : question.status === 'dismissed'
          ? 'dismissed'
          : 'held';
      const own = question.own === true;
      if (!questionId || !text || (status !== 'approved' && !own)) return out;
      out.push({
        questionId: questionId,
        text: text,
        status: status,
        createdAt: Number(question.createdAt) || 0,
        updatedAt: Number(question.updatedAt) || 0,
        upvoteCount: status === 'approved'
          ? clampInt(question.upvoteCount, 0, 0, SESSION_QA_MAX_QUESTIONS)
          : 0,
        upvotedByViewer: status === 'approved' && question.upvotedByViewer === true,
        own: own,
        featured: status === 'approved' && question.featured === true,
      });
      return out;
    }, []) : [];
    return {
      enabled: enabled,
      submissionsLocked: enabled && source.submissionsLocked === true,
      questions: questions,
      featuredQuestion: enabled ? sanitizeFeaturedQaPacket(source.featuredQuestion) : null,
      updatedAt: Number(source.updatedAt) || Date.now(),
    };
  };

  const buildSessionQaActivitySnapshot = (state, guestList, sessionCode) => {
    const current = state && typeof state === 'object' ? state : createSessionQaState();
    const questions = current.enabled === true && Array.isArray(current.questions)
      ? current.questions.filter(function (question) { return question && typeof question === 'object'; })
      : [];
    if (questions.length === 0) return null;

    const audienceUids = [];
    const participantStatus = {};
    const seenAuthors = new Set();
    questions.forEach(function (question) {
      const uid = normalizeSessionQaId(question.ownerUid, 128);
      if (!uid || seenAuthors.has(uid)) return;
      seenAuthors.add(uid);
      audienceUids.push(uid);
      participantStatus[uid] = 'submitted';
    });
    if (audienceUids.length === 0) return null;

    const connectedUids = new Set((Array.isArray(guestList) ? guestList : []).map(function (guest) {
      return normalizeSessionQaId(guest && guest.uid, 128);
    }).filter(Boolean));
    const approved = questions.filter(function (question) { return question.status === 'approved'; }).length;
    const hidden = questions.filter(function (question) {
      return question.status === 'dismissed' || question.status === 'archived';
    }).length;
    const votesCast = questions.reduce(function (total, question) {
      return total + getSessionQaUpvoteCount(current.upvotesByQuestion, question.questionId);
    }, 0);
    const now = Number(current.updatedAt) || Date.now();
    const startedAt = questions.reduce(function (earliest, question) {
      const createdAt = Number(question.createdAt) || 0;
      return createdAt > 0 && (!earliest || createdAt < earliest) ? createdAt : earliest;
    }, 0) || now;
    const safeSessionCode = normalizeSessionQaId(sessionCode, 64) || 'session';

    // This is the only Q&A data allowed into Activity Pulse: pseudonymous
    // participation status and aggregate moderation/vote counts. Question text,
    // codenames, question IDs, and voter maps remain in the host's memory.
    return {
      activityId: 'session-qa-' + safeSessionCode,
      family: 'polling',
      kind: 'session_qa',
      phase: current.submissionsLocked === true ? 'paused' : 'collecting',
      audienceUids: audienceUids,
      participantStatus: participantStatus,
      counts: {
        connected: audienceUids.filter(function (uid) { return connectedUids.has(uid); }).length,
        approved: approved,
        hidden: hidden,
        revealed: current.featuredQuestionId ? 1 : 0,
        votesCast: votesCast,
      },
      startedAt: startedAt,
      updatedAt: now,
      endedAt: 0,
    };
  };

  const shouldApplyPollClose = (activePoll, payload) => {
    if (!activePoll) return true;
    const closeId = payload && payload.pollId;
    return !closeId || closeId === activePoll.id;
  };
  const buildPollResultsSummary = (poll, responseList, guestCount, options) => {
    const responses = uniqueResponsesForSummary(responseList);
    const total = responses.length;
    const pct = (count) => total > 0 ? Math.round((count / total) * 100) : 0;
    const summary = {
      pollId: poll && poll.id,
      prompt: (poll && poll.prompt) || '',
      type: (poll && poll.type) || 'poll',
      totalResponses: total,
      guestCount: Number(guestCount) || 0,
      generatedAt: Date.now(),
      items: []
    };
    if (poll && poll.type === 'rating') {
      const scale = normalizeRatingScale(poll);
      summary.scale = scale;
      summary.items = getRatingValues(scale).map((value) => {
        const count = responses.filter((r) => Number(r && r.response) === value).length;
        return { value: value, label: scale.labels[String(value)] || String(value), count: count, percent: pct(count) };
      });
    } else if (poll && poll.type === 'mcq') {
      const opts = Array.isArray(poll.options) ? poll.options : [];
      summary.items = opts.map((opt) => {
        const count = responses.filter((r) => String(r && r.response) === String(opt)).length;
        return { value: opt, label: String(opt), count: count, percent: pct(count) };
      });
    } else if (poll && poll.type === 'wordcloud') {
      const moderation = options && options.wordCloudModeration;
      const aliases = options && options.wordCloudAliases;
      const terms = buildWordCloudItems(responses, moderation, aliases);
      const approved = terms.filter((item) => item.status === 'approved');
      summary.items = approved.map((item) => ({
        value: item.value,
        label: item.label,
        count: item.count,
        percent: pct(item.count)
      }));
      summary.wordCloud = true;
      summary.approvedResponseCount = approved.reduce((sum, item) => sum + item.count, 0);
      summary.pendingResponseCount = terms.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.count, 0);
      summary.hiddenResponseCount = terms.filter((item) => item.status === 'hidden').reduce((sum, item) => sum + item.count, 0);
    } else {
      summary.items = [{ value: 'responses', label: 'Free-text responses received', count: total, percent: total > 0 ? 100 : 0 }];
      summary.freeTextSuppressed = true;
    }
    return summary;
  };
  // ──────────────────────────────────────────────────────────────────────

  // Live Polling -> AlloSheet handoff. This is deliberately post-session and
  // aggregate-only: prompts, codenames, peer ids, routing, feedback, Q&A,
  // and response text never enter the transfer envelope.
  const LP_ALLOSHEET_KIND = 'alloflow.tabular.v1';
  const LP_ALLOSHEET_LIMITS = Object.freeze({ maxTables: 4, maxColumns: 40, maxRows: 200, maxCellChars: 1200, maxEnvelopeBytes: 2 * 1024 * 1024, minimumGroupSize: 5 });
  const lpAlloText = (value, max) => {
    let out = value == null ? '' : String(value);
    try { if (typeof out.normalize === 'function') out = out.normalize('NFKC'); } catch (err) {}
    out = out.replace(/\r\n?/g, '\n').trim();
    return out.length > max ? out.slice(0, max).trim() : out;
  };
  const lpAlloNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const lpAlloInteger = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : (fallback == null ? 0 : fallback);
  };
  const lpAlloRound = (value, digits) => {
    const n = lpAlloNumber(value);
    if (n == null) return null;
    const factor = Math.pow(10, digits || 0);
    return Math.round(n * factor) / factor;
  };
  const lpAlloDate = (value) => {
    if (value == null || value === '') return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  };
  const lpAlloIso = (value) => {
    const date = lpAlloDate(value);
    return date ? date.toISOString() : null;
  };
  const lpAlloHash = (value) => {
    const source = lpAlloText(value, 200);
    let hash = 2166136261;
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  };
  const lpAlloCell = (value) => {
    if (value == null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'boolean') return value;
    return lpAlloText(value, LP_ALLOSHEET_LIMITS.maxCellChars);
  };
  const lpAlloColumn = (key, title, type) => ({ key: key, title: title, type: type });
  const lpAlloTable = (id, title, columns, rows, sourceRowCount, truncated) => ({
    id: id,
    title: title,
    columns: columns,
    rows: rows.slice(0, LP_ALLOSHEET_LIMITS.maxRows),
    rowCount: Math.min(rows.length, LP_ALLOSHEET_LIMITS.maxRows),
    sourceRowCount: Math.max(sourceRowCount || 0, rows.length),
    truncated: !!truncated || rows.length > LP_ALLOSHEET_LIMITS.maxRows,
  });
  const lpAlloVisibleCount = (count, threshold) => {
    const n = lpAlloInteger(count, 0);
    return n < (threshold || LP_ALLOSHEET_LIMITS.minimumGroupSize) ? null : n;
  };
  const lpAlloBucketCount = (count, total) => {
    const n = lpAlloInteger(count, 0);
    const denominator = lpAlloInteger(total, 0);
    if (denominator < LP_ALLOSHEET_LIMITS.minimumGroupSize) return null;
    return n > 0 && n < LP_ALLOSHEET_LIMITS.minimumGroupSize ? null : n;
  };
  const lpAlloPercent = (count, total) => {
    const visibleCount = lpAlloBucketCount(count, total);
    const denominator = lpAlloInteger(total, 0);
    if (visibleCount == null || denominator < LP_ALLOSHEET_LIMITS.minimumGroupSize) return null;
    return lpAlloRound((visibleCount / denominator) * 100, 1);
  };
  const lpAlloPollType = (poll) => ['rating', 'mcq', 'freetext', 'wordcloud'].indexOf(String(poll && poll.type || '')) >= 0
    ? String(poll.type)
    : 'poll';
  const lpAlloResponses = (entry) => uniqueResponsesForSummary(entry && Array.isArray(entry.responses) ? entry.responses : []);
  const lpAlloAudienceCount = (entry, responses) => {
    const raw = lpAlloNumber(entry && entry.audienceCount);
    if (raw != null && raw >= 0) return Math.floor(raw);
    const ids = Array.isArray(entry && entry.audienceUids) ? entry.audienceUids : [];
    if (ids.length) return new Set(ids.map((id) => String(id || '')).filter(Boolean)).size;
    return Math.max(0, responses.length);
  };
  const lpAlloParticipantIds = (entry, responses) => {
    const ids = Array.isArray(entry && entry.audienceUids) ? entry.audienceUids : responses.map((item) => item && item.uid);
    return Array.from(new Set(ids.map((id) => String(id || '')).filter(Boolean)));
  };
  const lpAlloChoiceRows = (poll, responses, itemId, includeLabels) => {
    const type = lpAlloPollType(poll);
    if (type === 'freetext' || type === 'wordcloud') return [];
    const options = type === 'rating'
      ? getRatingValues(normalizeRatingScale(poll)).map((value) => ({ value: value, label: normalizeRatingScale(poll).labels[String(value)] || String(value) }))
      : (Array.isArray(poll && poll.options) ? poll.options.slice(0, 40).map((value, index) => ({ value: String(value), label: String(value), index: index })) : []);
    const total = responses.length;
    return options.map((option, index) => {
      const count = responses.filter((entry) => type === 'rating'
        ? Number(entry && entry.response) === Number(option.value)
        : String(entry && entry.response) === String(option.value)).length;
      const values = {
        item_id: itemId,
        answer_code: type === 'rating' ? 'rating-' + String(option.value) : 'choice-' + String(index + 1),
        answer_value: type === 'rating' ? Number(option.value) : index + 1,
        answer_label: includeLabels ? lpAlloText(option.label, 160) : null,
        response_count: lpAlloBucketCount(count, total),
        response_rate_percent: lpAlloPercent(count, total),
        privacy_status: count > 0 && count < LP_ALLOSHEET_LIMITS.minimumGroupSize
          ? 'suppressed (<5 responses)'
          : (total < LP_ALLOSHEET_LIMITS.minimumGroupSize ? 'suppressed (<5 responses total)' : 'available'),
      };
      return { values: Object.fromEntries(Object.keys(values).map((key) => [key, lpAlloCell(values[key])])) };
    });
  };
  const lpAlloCorrectness = (poll, responses) => {
    const hasCorrect = poll && (Number.isInteger(poll.correctIndex) || poll.correctOption != null);
    if (!hasCorrect) return { count: null, status: 'not_available' };
    const correct = responses.filter((entry) => Number.isInteger(poll.correctIndex)
      ? (lpAlloPollType(poll) === 'rating' ? Number(entry && entry.response) === Number(poll.correctIndex) : String(entry && entry.response) === String((poll.options || [])[poll.correctIndex]))
      : String(entry && entry.response) === String(poll.correctOption)).length;
    return { count: lpAlloBucketCount(correct, responses.length), status: correct > 0 && correct < LP_ALLOSHEET_LIMITS.minimumGroupSize ? 'suppressed (<5 responses)' : (responses.length < LP_ALLOSHEET_LIMITS.minimumGroupSize ? 'suppressed (<5 responses total)' : 'available') };
  };
  const lpAlloTimeBucket = (value) => {
    const date = lpAlloDate(value);
    if (!date) return null;
    const bucket = new Date(date.getTime());
    bucket.setUTCMinutes(Math.floor(bucket.getUTCMinutes() / 15) * 15, 0, 0);
    return bucket.toISOString();
  };
  const buildLivePollingAlloSheetEnvelope = (source, options) => {
    const input = source && typeof source === 'object' ? source : {};
    const settings = options && typeof options === 'object' ? options : {};
    const createdAt = lpAlloIso(settings.createdAt || input.createdAt || Date.now()) || new Date().toISOString();
    const dateRange = ['session', '7d', 'all'].indexOf(settings.dateRange) >= 0 ? settings.dateRange : 'session';
    const createdMs = Date.parse(createdAt);
    const rangeStart = dateRange === '7d' ? createdMs - (7 * 24 * 60 * 60 * 1000) : null;
    const allPolls = Array.isArray(input.polls) ? input.polls : [];
    const filteredPolls = allPolls.filter((entry) => {
      const poll = entry && entry.poll && typeof entry.poll === 'object' ? entry.poll : entry;
      const started = lpAlloDate(entry && (entry.startedAt || (poll && poll.startedAt)));
      return !rangeStart || !started || started.getTime() >= rangeStart;
    });
    const clippedPolls = filteredPolls.slice(0, LP_ALLOSHEET_LIMITS.maxRows);
    const truncatedPolls = filteredPolls.length > LP_ALLOSHEET_LIMITS.maxRows;
    const includeLabels = settings.includeChoiceLabels === true;
    const selectedDatasets = settings.datasets && typeof settings.datasets === 'object' ? settings.datasets : {};
    const datasets = {
      sessionSummary: selectedDatasets.sessionSummary !== false,
      itemSummary: selectedDatasets.itemSummary !== false,
      answerDistribution: selectedDatasets.answerDistribution !== false,
      timeSummary: selectedDatasets.timeSummary !== false,
    };
    const sessionCode = lpAlloText(input.sessionCode, 120);
    const sessionId = 'session-' + lpAlloHash(sessionCode || input.sessionStartedAt || 'live-polling-session');
    const normalized = clippedPolls.map((entry, index) => {
      const poll = entry && entry.poll && typeof entry.poll === 'object' ? entry.poll : entry || {};
      const responses = lpAlloResponses(entry || {});
      const audienceCount = lpAlloAudienceCount(entry || {}, responses);
      const participantIds = lpAlloParticipantIds(entry || {}, responses);
      const startedAt = lpAlloIso(entry && (entry.startedAt || poll.startedAt));
      const endedAt = lpAlloIso(entry && (entry.endedAt || entry.closedAt || poll.endedAt));
      const itemId = 'poll-' + String(index + 1);
      return { poll: poll, responses: responses, audienceCount: audienceCount, participantIds: participantIds, startedAt: startedAt, endedAt: endedAt, itemId: itemId };
    });
    const sessionParticipants = Array.from(new Set(normalized.reduce((out, item) => out.concat(item.participantIds), [])));
    const sessionAudience = normalized.reduce((max, item) => Math.max(max, item.audienceCount), 0);
    const sessionResponses = normalized.reduce((sum, item) => sum + item.responses.length, 0);
    const startedDates = normalized.map((item) => lpAlloDate(item.startedAt)).filter(Boolean);
    const endedDates = normalized.map((item) => lpAlloDate(item.endedAt)).filter(Boolean);
    const sessionStartedAt = lpAlloIso(input.sessionStartedAt) || (startedDates.length ? new Date(Math.min.apply(null, startedDates.map((date) => date.getTime()))).toISOString() : null);
    const sessionEndedAt = lpAlloIso(input.sessionEndedAt) || (endedDates.length ? new Date(Math.max.apply(null, endedDates.map((date) => date.getTime()))).toISOString() : null);
    const sessionDuration = sessionStartedAt && sessionEndedAt ? Math.max(0, Math.round((Date.parse(sessionEndedAt) - Date.parse(sessionStartedAt)) / 1000)) : null;
    const itemRows = normalized.map((item) => {
      const total = item.responses.length;
      const correctness = lpAlloCorrectness(item.poll, item.responses);
      const duration = item.startedAt && item.endedAt ? Math.max(0, Math.round((Date.parse(item.endedAt) - Date.parse(item.startedAt)) / 1000)) : null;
      const smallStatus = item.audienceCount > 0 && item.audienceCount < LP_ALLOSHEET_LIMITS.minimumGroupSize
        ? 'suppressed (<5 participants)'
        : (total < LP_ALLOSHEET_LIMITS.minimumGroupSize ? 'suppressed (<5 responses)' : 'available');
      const values = {
        item_id: item.itemId,
        poll_type: lpAlloPollType(item.poll),
        started_at: item.startedAt,
        ended_at: item.endedAt,
        duration_seconds: duration,
        audience_count: lpAlloVisibleCount(item.audienceCount),
        response_count: lpAlloVisibleCount(total),
        response_rate_percent: item.audienceCount >= LP_ALLOSHEET_LIMITS.minimumGroupSize ? lpAlloRound((total / Math.max(1, item.audienceCount)) * 100, 1) : null,
        answer_mode: ['freetext', 'wordcloud'].indexOf(lpAlloPollType(item.poll)) >= 0 ? 'text_suppressed' : 'coded_options',
        option_count: Array.isArray(item.poll && item.poll.options) ? item.poll.options.length : (lpAlloPollType(item.poll) === 'rating' ? getRatingValues(normalizeRatingScale(item.poll)).length : 0),
        correct_response_count: correctness.count,
        correctness_status: correctness.status,
        choice_labels_included: includeLabels,
        privacy_status: smallStatus,
      };
      return { values: Object.fromEntries(Object.keys(values).map((key) => [key, lpAlloCell(values[key])])) };
    });
    const distributionRows = normalized.reduce((out, item) => out.concat(lpAlloChoiceRows(item.poll, item.responses, item.itemId, includeLabels)), []);
    const timeBuckets = {};
    normalized.forEach((item) => {
      const pollBucket = lpAlloTimeBucket(item.startedAt);
      if (pollBucket) {
        timeBuckets[pollBucket] = timeBuckets[pollBucket] || { pollCount: 0, responses: 0 };
        timeBuckets[pollBucket].pollCount += 1;
      }
      item.responses.forEach((response) => {
        const bucket = lpAlloTimeBucket(response && response.timestamp);
        if (!bucket) return;
        timeBuckets[bucket] = timeBuckets[bucket] || { pollCount: 0, responses: 0 };
        timeBuckets[bucket].responses += 1;
      });
    });
    const timeRows = Object.keys(timeBuckets).sort().map((bucket) => {
      const counts = timeBuckets[bucket];
      const visibleResponses = lpAlloVisibleCount(counts.responses);
      return { values: {
        time_bucket: bucket,
        poll_count: counts.pollCount,
        response_count: visibleResponses,
        privacy_status: counts.responses < LP_ALLOSHEET_LIMITS.minimumGroupSize ? 'suppressed (<5 responses)' : 'available',
      } };
    });
    const summaryValues = {
      session_id: sessionId,
      started_at: sessionStartedAt,
      ended_at: sessionEndedAt,
      duration_seconds: sessionDuration,
      poll_count: normalized.length,
      participant_count: lpAlloVisibleCount(Math.max(sessionAudience, sessionParticipants.length)),
      response_count: lpAlloVisibleCount(sessionResponses),
      response_rate_percent: sessionAudience >= LP_ALLOSHEET_LIMITS.minimumGroupSize ? lpAlloRound((sessionResponses / Math.max(1, sessionAudience * Math.max(1, normalized.length))) * 100, 1) : null,
      free_text_responses_included: false,
      privacy_status: sessionAudience > 0 && sessionAudience < LP_ALLOSHEET_LIMITS.minimumGroupSize
        ? 'suppressed (<5 participants)'
        : (sessionResponses < LP_ALLOSHEET_LIMITS.minimumGroupSize ? 'suppressed (<5 responses)' : 'available'),
    };
    const tables = [];
    if (datasets.sessionSummary) tables.push(lpAlloTable('lp-session-summary', 'Live Polling session summary', [
      lpAlloColumn('session_id', 'Session code', 'category'), lpAlloColumn('started_at', 'Started', 'datetime'), lpAlloColumn('ended_at', 'Ended', 'datetime'), lpAlloColumn('duration_seconds', 'Duration (seconds)', 'duration'), lpAlloColumn('poll_count', 'Poll count', 'integer'), lpAlloColumn('participant_count', 'Participants', 'integer'), lpAlloColumn('response_count', 'Responses', 'integer'), lpAlloColumn('response_rate_percent', 'Response rate (%)', 'number'), lpAlloColumn('free_text_responses_included', 'Free-text responses included', 'boolean'), lpAlloColumn('privacy_status', 'Privacy status', 'category')
    ], [{ values: Object.fromEntries(Object.keys(summaryValues).map((key) => [key, lpAlloCell(summaryValues[key])])) }], 1, false));
    if (datasets.itemSummary) tables.push(lpAlloTable('lp-item-summary', 'Live Polling item summary', [
      lpAlloColumn('item_id', 'Item code', 'category'), lpAlloColumn('poll_type', 'Poll type', 'category'), lpAlloColumn('started_at', 'Started', 'datetime'), lpAlloColumn('ended_at', 'Ended', 'datetime'), lpAlloColumn('duration_seconds', 'Duration (seconds)', 'duration'), lpAlloColumn('audience_count', 'Audience', 'integer'), lpAlloColumn('response_count', 'Responses', 'integer'), lpAlloColumn('response_rate_percent', 'Response rate (%)', 'number'), lpAlloColumn('answer_mode', 'Answer mode', 'category'), lpAlloColumn('option_count', 'Option count', 'integer'), lpAlloColumn('correct_response_count', 'Correct responses', 'integer'), lpAlloColumn('correctness_status', 'Correctness status', 'category'), lpAlloColumn('choice_labels_included', 'Choice labels included', 'boolean'), lpAlloColumn('privacy_status', 'Privacy status', 'category')
    ], itemRows, normalized.length, truncatedPolls));
    if (datasets.answerDistribution) tables.push(lpAlloTable('lp-answer-distribution', 'Live Polling coded answer distribution', [
      lpAlloColumn('item_id', 'Item code', 'category'), lpAlloColumn('answer_code', 'Answer code', 'category'), lpAlloColumn('answer_value', 'Answer value', 'number'), lpAlloColumn('answer_label', 'Teacher-authored label', 'text'), lpAlloColumn('response_count', 'Responses', 'integer'), lpAlloColumn('response_rate_percent', 'Response rate (%)', 'number'), lpAlloColumn('privacy_status', 'Privacy status', 'category')
    ], distributionRows, distributionRows.length, false));
    if (datasets.timeSummary) tables.push(lpAlloTable('lp-time-summary', 'Live Polling time-window summary', [
      lpAlloColumn('time_bucket', '15-minute UTC bucket', 'datetime'), lpAlloColumn('poll_count', 'Polls', 'integer'), lpAlloColumn('response_count', 'Responses', 'integer'), lpAlloColumn('privacy_status', 'Privacy status', 'category')
    ], timeRows, timeRows.length, false));
    const byteSize = (() => { try { return new TextEncoder().encode(JSON.stringify(tables)).length; } catch (err) { return JSON.stringify(tables).length; } })();
    return {
      kind: LP_ALLOSHEET_KIND,
      version: 1,
      source: { tool: 'live-polling', label: 'Live Polling', version: '1' },
      title: 'Live Polling aggregate snapshot',
      createdAt: createdAt,
      classification: { level: 'aggregate-education-data', identifierIncluded: false, studentIdentifierIncluded: false, freeTextNotesIncluded: false, rawResponsesIncluded: false },
      privacy: { scope: 'educator-reviewed-aggregate', identifierIncluded: false, reducedData: true, notesIncluded: false, rawResponsesIncluded: false, transferEnablesAI: false },
      capabilities: { writeBack: false, aiEnabled: false },
      tables: tables.slice(0, LP_ALLOSHEET_LIMITS.maxTables),
      provenance: {
        sourceSession: 'opaque-' + sessionId,
        dateRange: dateRange,
        includedTables: tables.map((table) => table.id),
        excludedFields: ['poll.prompt', 'poll.options (labels unless explicitly selected)', 'response.uid', 'response.codename', 'response.response', 'feedback', 'routing', 'session Q&A', 'peer showcase', 'signaling metadata'],
        choiceLabelsIncluded: includeLabels,
        suppression: { minimumGroupSize: LP_ALLOSHEET_LIMITS.minimumGroupSize, missingWorkInferred: false, freeTextResponsesSuppressed: true },
        limits: LP_ALLOSHEET_LIMITS,
        reducedData: true,
        byteSize: byteSize,
        truncated: truncatedPolls,
      },
      metadata: { sessionId: sessionId, dateRange: dateRange, pollCount: normalized.length, choiceLabelsIncluded: includeLabels },
    };
  };

  // PollingHost — teacher device
  // Listens for guest signaling docs, accepts incoming offers, exchanges
  // ICE candidates, opens a data channel per guest, aggregates responses
  // in the teacher's local state. Application data is never written to
  // Firestore.
  // ──────────────────────────────────────────────────────────────────────
  class PollingHost {
    constructor(config) {
      this.sessionCode = config.sessionCode;
      this.onGuestConnected = config.onGuestConnected || (() => {});
      this.onResponse = config.onResponse || (() => {});
      // Dedicated transports (for example quiz-signaling) can opt into a
      // tightly scoped response-id validator without weakening the default
      // active-poll gate. The callback receives only bounded payloads.
      this.acceptResponse = typeof config.acceptResponse === 'function'
        ? config.acceptResponse
        : null;
      this.onResponseStatus = config.onResponseStatus || (() => {});
      this.onPeerVote = config.onPeerVote || (() => {});
      this.onSessionQaStateChange = config.onSessionQaStateChange || (() => {});
      this.onSessionQaQuestion = config.onSessionQaQuestion || (() => {});
      this.onSessionQaUpvote = config.onSessionQaUpvote || (() => {});
      this.onCheckInAck = config.onCheckInAck || (() => {});
      this.onHelpRequest = config.onHelpRequest || (() => {});
      this.onGuestLeft = config.onGuestLeft || (() => {});
      this.peers = new Map();
      this.collectionUnsub = null;
      this.activePoll = null;
      this.activeAudienceUids = null;
      this.activePollResults = null;
      this.activePeerShowcase = null;
      this.peerShowcaseAudienceUids = null;
      this.pendingCheckIns = new Map();
      this.sessionQaState = createSessionQaState({ enabled: config.enableSessionQa === true });
      this._stopped = false;
      // Roster gate: when set (Set of uids), offers from unknown uids are
      // ignored. Defense-in-depth against drive-by connections to a guessed
      // session code — NOT a security boundary on its own, since the roster
      // lives in a client-writable doc until Firestore rules land (see
      // docs/LIVE_SESSION_HARDENING_PROPOSAL.md). null = allow all (legacy).
      this._allowedUids = null;
      this.setAllowedUids(config.allowedUids == null ? null : config.allowedUids);
      this.signalingPath = config.signalingPath || 'signaling';
    }

    setAllowedUids(uids) {
      if (uids == null) {
        this._allowedUids = null;
        return;
      }
      let values = [];
      try { values = Array.from(uids); } catch (err) {}
      this._allowedUids = new Set(values.map(function (uid) {
        return uid == null ? '' : String(uid);
      }).filter(Boolean));
      const allowed = this._allowedUids;
      if (this.activeAudienceUids) {
        this.activeAudienceUids = new Set(Array.from(this.activeAudienceUids).filter(function (uid) {
          return allowed.has(uid);
        }));
      }
      if (this.peerShowcaseAudienceUids) {
        this.peerShowcaseAudienceUids = new Set(Array.from(this.peerShowcaseAudienceUids).filter(function (uid) {
          return allowed.has(uid);
        }));
      }
      Array.from(this.peers.keys()).forEach((uid) => {
        if (allowed.has(uid)) return;
        const peer = this.peers.get(uid);
        if (peer && peer.dc && peer.dc.readyState === 'open') {
          try {
            peer.dc.send(JSON.stringify({
              type: 'hostClosed',
              payload: { pollId: (this.activePoll && this.activePoll.id) || null },
            }));
          } catch (err) {}
        }
        this._cleanupPeer(uid);
      });
    }

    _isUidAllowed(uid) {
      return !this._allowedUids || this._allowedUids.has(uid);
    }

    _isUidInActiveAudience(uid) {
      return this._isUidAllowed(uid) && (!this.activeAudienceUids || this.activeAudienceUids.has(uid));
    }

    _isUidInPeerShowcaseAudience(uid) {
      return this._isUidAllowed(uid) && (!this.peerShowcaseAudienceUids || this.peerShowcaseAudienceUids.has(uid));
    }

    _isUidInSupportActivity(uid, activityId) {
      if (!uid || !activityId || !this._isUidAllowed(uid)) return false;
      if (activityId === buildLiveSessionSupportActivityId(this.sessionCode)) return true;
      return !!(this.activePoll && this.activePoll.id === activityId && this._isUidInActiveAudience(uid));
    }

    _acceptsResponse(uid, codename, payload) {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !this._isUidInActiveAudience(uid)) {
        return false;
      }
      if (this.activePoll && payload.pollId === this.activePoll.id) return this.activePoll.submissionsLocked !== true;
      if (!this.acceptResponse) return false;
      const pollId = payload.pollId;
      const validPollId = (typeof pollId === 'string'
        && pollId.length > 0
        && pollId.length <= CUSTOM_RESPONSE_ID_MAX_LENGTH)
        || (Number.isInteger(pollId) && pollId >= 0 && pollId <= 9999);
      if (!validPollId) return false;
      try {
        if (JSON.stringify(payload).length > CUSTOM_RESPONSE_PAYLOAD_MAX_CHARS) return false;
      } catch (err) {
        return false;
      }
      try {
        return this.acceptResponse(uid, payload, codename) === true;
      } catch (err) {
        return false;
      }
    }

    async start() {
      const fb = getFb();
      if (!fb) throw new Error('LivePolling: Firebase not available');
      if (!this.sessionCode) throw new Error('LivePolling: sessionCode required');
      const peersRef = signalingCollectionRef(this.sessionCode, this.signalingPath);
      if (!peersRef) throw new Error('LivePolling: cannot resolve signaling collection');
      this.collectionUnsub = fb.onSnapshot(peersRef, (snap) => {
        if (this._stopped) return;
        snap.docChanges().forEach((change) => {
          if (change.type === 'removed') return;
          const uid = change.doc.id;
          if (!this._isUidAllowed(uid)) return;
          const data = change.doc.data() || {};
          const existing = this.peers.get(uid);
          if (data.offer && !existing) {
            this._acceptPeer(uid, data, change.doc.ref);
          } else if (data.offer && existing && existing.offerSdp && data.offer.sdp !== existing.offerSdp) {
            // Re-offer: the student reloaded (or auto-rejoined after a drop) and
            // wrote a fresh offer while the host still holds their old, dead
            // peer connection. Without this branch the fresh offer is ignored
            // until the stale RTC connection times out — and reconnect breaks.
            // Replace the stale peer and answer the new offer.
            this._cleanupPeer(uid);
            this._acceptPeer(uid, data, change.doc.ref);
          } else if (data.iceFromGuest && existing) {
            this._addIceFromGuest(uid, data.iceFromGuest);
          }
        });
      }, (err) => {
        console.warn('[LivePolling host] signaling subscribe error:', err && err.message);
      });
    }

    async _acceptPeer(uid, offerData, signalingRef) {
      const fb = getFb();
      if (!fb || !this._isUidAllowed(uid)) return;
      const pc = new RTCPeerConnection(getRtcConfig());
      const codename = (typeof offerData.codename === 'string' && offerData.codename.slice(0, 64)) || 'Guest';
      const peerRecord = { pc, dc: null, signalingRef, codename, sentIce: [], offerSdp: (offerData.offer && offerData.offer.sdp) || null };
      this.peers.set(uid, peerRecord);

      pc.onicecandidate = (e) => {
        if (
          !e.candidate || this._stopped || !this._isUidAllowed(uid)
          || this.peers.get(uid) !== peerRecord
        ) return;
        peerRecord.sentIce.push(e.candidate.toJSON());
        fb.setDoc(signalingRef, { iceFromHost: peerRecord.sentIce }, { merge: true }).catch(() => {});
      };

      pc.ondatachannel = (e) => {
        const dc = e.channel;
        peerRecord.dc = dc;
        dc.onopen = () => {
          if (this._stopped || !this._isUidAllowed(uid) || this.peers.get(uid) !== peerRecord) {
            this._cleanupPeer(uid, peerRecord);
            try { pc.close(); } catch (err) {}
            return;
          }
          this.onGuestConnected(uid, codename);
          // State sync on (re)connect. A reconnecting guest may hold a stale
          // poll overlay from before the drop; sending an id-less closePoll
          // clears it (shouldApplyPollClose treats a missing pollId as
          // "close whatever is showing").
          if (this.activePoll && this._isUidInActiveAudience(uid)) {
            try {
              if (this.activePollResults && this.activePollResults.pollId === this.activePoll.id) dc.send(JSON.stringify({ type: 'pollResults', payload: this.activePollResults }));
              else dc.send(JSON.stringify({ type: 'poll', payload: this.activePoll }));
            } catch (err) {}
          } else {
            try { dc.send(JSON.stringify({ type: 'closePoll', payload: {} })); } catch (err) {}
          }
          if (this.activePeerShowcase && this._isUidInPeerShowcaseAudience(uid)) {
            try {
              if (this.activePeerShowcase.phase === 'results' && this.activePeerShowcase.results) {
                dc.send(JSON.stringify({ type: 'peerVoteResults', payload: this.activePeerShowcase.results }));
              } else {
                dc.send(JSON.stringify({
                  type: 'peerShowcase',
                  payload: sanitizePeerShowcaseRound(this.activePeerShowcase, uid),
                }));
              }
            } catch (err) {}
          }
          // Q&A is session-wide, so reconnect sync is independent of the
          // currently active poll or peer-showcase audience.
          this._sendSessionQaStateToPeer(uid);
        };
        dc.onmessage = (msg) => {
          try {
            if (this._stopped || !this._isUidAllowed(uid) || this.peers.get(uid) !== peerRecord) return;
            const parsed = JSON.parse(msg.data);
            if (parsed && parsed.type === 'response' && parsed.payload) {
              if (this._acceptsResponse(uid, codename, parsed.payload)) {
                this.onResponse(uid, codename, parsed.payload);
              }
            } else if (parsed && parsed.type === 'responseStatus' && parsed.payload) {
              if (this.activePoll && parsed.payload.pollId === this.activePoll.id && this._isUidInActiveAudience(uid)) {
                const status = parsed.payload.status === 'submitted' || parsed.payload.status === 'editing' || parsed.payload.status === 'withdrawn'
                  ? parsed.payload.status
                  : 'drafting';
                this.onResponseStatus(uid, codename, {
                  pollId: parsed.payload.pollId,
                  status: status,
                  attempt: clampInt(parsed.payload.attempt, 1, 1, 2),
                  timestamp: Number(parsed.payload.timestamp) || Date.now(),
                });
              }
            } else if (parsed && parsed.type === 'peerVote' && parsed.payload) {
              if (this.activePeerShowcase && this.activePeerShowcase.phase === 'voting' && this._isUidInPeerShowcaseAudience(uid)) {
                const vote = normalizePeerVote(parsed.payload, this.activePeerShowcase, uid);
                if (vote) this.onPeerVote(uid, codename, vote);
              }
            } else if (parsed && parsed.type === 'sessionQaQuestion' && parsed.payload) {
              this._receiveSessionQaQuestion(uid, codename, parsed.payload);
            } else if (parsed && parsed.type === 'sessionQaUpvote' && parsed.payload) {
              this._receiveSessionQaUpvote(uid, parsed.payload);
            } else if (parsed && parsed.type === 'checkInAck' && parsed.payload) {
              this._receiveCheckInAck(uid, codename, parsed.payload);
            } else if (parsed && parsed.type === 'helpRequest' && parsed.payload) {
              this._receiveHelpRequest(uid, codename, parsed.payload);
            }
          } catch (err) {}
        };
        dc.onclose = () => this._cleanupPeer(uid, peerRecord);
      };

      pc.onconnectionstatechange = () => {
        if (this.peers.get(uid) !== peerRecord) return;
        if (pc.connectionState === 'connected') {
          setTimeout(() => {
            if (
              this._stopped || !this._isUidAllowed(uid)
              || this.peers.get(uid) !== peerRecord
            ) return;
            fb.deleteDoc(signalingRef).catch(() => {});
          }, 750);
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
          this._cleanupPeer(uid, peerRecord);
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offerData.offer));
        if (!this._isUidAllowed(uid) || this.peers.get(uid) !== peerRecord) { try { pc.close(); } catch (err) {} return; }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (!this._isUidAllowed(uid) || this.peers.get(uid) !== peerRecord) { try { pc.close(); } catch (err) {} return; }
        await fb.setDoc(signalingRef, { answer: { type: answer.type, sdp: answer.sdp } }, { merge: true });
      } catch (err) {
        console.warn('[LivePolling host] accept peer failed:', err && err.message);
        this._cleanupPeer(uid, peerRecord);
      }
    }

    _addIceFromGuest(uid, candidates) {
      const peer = this.peers.get(uid);
      if (!peer || !peer.pc) return;
      candidates.forEach((c) => {
        peer.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      });
    }

    broadcastPoll(poll, audienceUids) {
      if (!poll || !poll.id) return;
      if (this.activePeerShowcase) this.closePeerShowcase(this.activePeerShowcase.roundId);
      this.activePoll = poll;
      this.activeAudienceUids = Array.isArray(audienceUids) ? new Set(audienceUids) : null;
      this.activePollResults = null;
      this.pendingCheckIns.clear();
      const msg = JSON.stringify({ type: 'poll', payload: poll });
      const clear = JSON.stringify({ type: 'closePoll', payload: {} });
      this.peers.forEach((peer, uid) => {
        if (peer.dc && peer.dc.readyState === 'open') {
          try { peer.dc.send(this._isUidInActiveAudience(uid) ? msg : clear); } catch (err) {}
        }
      });
    }

    closePoll(pollId) {
      const idToClose = pollId || (this.activePoll && this.activePoll.id);
      if (!idToClose) return;
      if (this.activePeerShowcase) this.closePeerShowcase(this.activePeerShowcase.roundId);
      const msg = JSON.stringify({ type: 'closePoll', payload: { pollId: idToClose } });
      this.peers.forEach((peer) => {
        if (peer.dc && peer.dc.readyState === 'open') {
          try { peer.dc.send(msg); } catch (err) {}
        }
      });
      if (this.activePoll && this.activePoll.id === idToClose) {
        this.activePoll = null;
        this.activeAudienceUids = null;
        this.activePollResults = null;
        this.pendingCheckIns.clear();
      }
    }

    broadcastPollResults(pollId, summary) {
      if (!pollId || !summary) return;
      const safeSummary = Object.assign({}, summary, { pollId: pollId });
      if (this.activePoll && this.activePoll.id === pollId) this.activePollResults = safeSummary;
      const msg = JSON.stringify({ type: 'pollResults', payload: safeSummary });
      this.peers.forEach((peer, uid) => {
        if (peer.dc && peer.dc.readyState === 'open' && this._isUidInActiveAudience(uid)) {
          try { peer.dc.send(msg); } catch (err) {}
        }
      });
    }

    openPeerShowcase(round, audienceUids) {
      const normalized = buildPeerShowcaseRound(round);
      if (!normalized || !this.activePoll || normalized.pollId !== this.activePoll.id) return null;
      this.activePeerShowcase = Object.assign({}, normalized, { phase: 'voting', results: null });
      const requestedAudience = Array.isArray(audienceUids)
        ? audienceUids
        : (this.activeAudienceUids ? Array.from(this.activeAudienceUids) : null);
      const audience = requestedAudience
        ? requestedAudience.filter((uid) => this._isUidInActiveAudience(uid))
        : null;
      this.peerShowcaseAudienceUids = audience ? new Set(audience) : null;
      this.peers.forEach((peer, uid) => {
        if (peer.dc && peer.dc.readyState === 'open' && this._isUidInPeerShowcaseAudience(uid)) {
          const payload = sanitizePeerShowcaseRound(this.activePeerShowcase, uid);
          if (payload) {
            try { peer.dc.send(JSON.stringify({ type: 'peerShowcase', payload: payload })); } catch (err) {}
          }
        }
      });
      return normalized;
    }

    broadcastPeerVoteResults(roundId, votesByUid) {
      if (!this.activePeerShowcase || this.activePeerShowcase.roundId !== roundId) return null;
      const results = buildPeerVoteResults(this.activePeerShowcase, votesByUid);
      if (!results) return null;
      this.activePeerShowcase = Object.assign({}, this.activePeerShowcase, {
        phase: 'results',
        results: results,
      });
      this.peers.forEach((peer, uid) => {
        if (peer.dc && peer.dc.readyState === 'open' && this._isUidInPeerShowcaseAudience(uid)) {
          try { peer.dc.send(JSON.stringify({ type: 'peerVoteResults', payload: results })); } catch (err) {}
        }
      });
      return results;
    }

    closePeerShowcase(roundId) {
      if (!this.activePeerShowcase) return false;
      const idToClose = roundId || this.activePeerShowcase.roundId;
      if (idToClose !== this.activePeerShowcase.roundId) return false;
      const message = JSON.stringify({ type: 'peerShowcaseClose', payload: { roundId: idToClose } });
      this.peers.forEach((peer, uid) => {
        if (peer.dc && peer.dc.readyState === 'open' && this._isUidInPeerShowcaseAudience(uid)) {
          try { peer.dc.send(message); } catch (err) {}
        }
      });
      this.activePeerShowcase = null;
      this.peerShowcaseAudienceUids = null;
      this.pendingCheckIns.clear();
      return true;
    }


    _sendSessionQaStateToPeer(uid) {
      const peer = this.peers.get(uid);
      if (!peer || !peer.dc || peer.dc.readyState !== 'open') return false;
      const packet = sanitizeSessionQaState(this.sessionQaState, uid);
      try {
        peer.dc.send(JSON.stringify({ type: 'sessionQaState', payload: packet }));
        if (packet.featuredQuestion) {
          peer.dc.send(JSON.stringify({ type: 'sessionQaFeatured', payload: packet.featuredQuestion }));
        }
        return true;
      } catch (err) {
        return false;
      }
    }

    _broadcastSessionQaState() {
      this.peers.forEach((peer, uid) => {
        if (peer.dc && peer.dc.readyState === 'open') this._sendSessionQaStateToPeer(uid);
      });
    }

    _broadcastSessionQaFeatured() {
      const state = this.sessionQaState;
      const question = state && state.featuredQuestionId
        ? (state.questions || []).find((item) => item && item.questionId === state.featuredQuestionId)
        : null;
      const packet = question
        ? sanitizeFeaturedQaPacket(question, state.upvotesByQuestion, state.updatedAt)
        : null;
      const message = JSON.stringify({ type: 'sessionQaFeatured', payload: packet || {} });
      this.peers.forEach((peer) => {
        if (peer.dc && peer.dc.readyState === 'open') {
          try { peer.dc.send(message); } catch (err) {}
        }
      });
      return packet;
    }

    _commitSessionQaState(nextState) {
      if (!nextState || nextState === this.sessionQaState) return false;
      this.sessionQaState = nextState;
      this.onSessionQaStateChange(nextState);
      this._broadcastSessionQaState();
      return true;
    }

    setSessionQaEnabled(enabled) {
      const value = enabled === true;
      if (this.sessionQaState.enabled === value) return this.sessionQaState;
      const next = Object.assign({}, this.sessionQaState, {
        enabled: value,
        updatedAt: Date.now(),
      });
      this._commitSessionQaState(next);
      return next;
    }

    setSessionQaSubmissionsLocked(locked) {
      if (!this.sessionQaState.enabled) return this.sessionQaState;
      const value = locked === true;
      if (this.sessionQaState.submissionsLocked === value) return this.sessionQaState;
      const next = Object.assign({}, this.sessionQaState, {
        submissionsLocked: value,
        updatedAt: Date.now(),
      });
      this._commitSessionQaState(next);
      return next;
    }

    setSessionQaQuestionStatus(questionId, action) {
      const priorFeaturedId = this.sessionQaState.featuredQuestionId;
      const next = moderateSessionQaQuestion(this.sessionQaState, questionId, action, Date.now());
      const changed = this._commitSessionQaState(next);
      if (changed && priorFeaturedId && !next.featuredQuestionId) this._broadcastSessionQaFeatured();
      return next;
    }

    featureSessionQaQuestion(questionId) {
      const normalizedId = normalizeSessionQaId(questionId, SESSION_QA_ID_MAX_LENGTH);
      const question = normalizedId
        ? (this.sessionQaState.questions || []).find((item) => (
            item && item.questionId === normalizedId && item.status === 'approved'
          ))
        : null;
      if (normalizedId && !question) return null;
      if ((this.sessionQaState.featuredQuestionId || null) === (normalizedId || null)) {
        return question
          ? sanitizeFeaturedQaPacket(question, this.sessionQaState.upvotesByQuestion, this.sessionQaState.updatedAt)
          : null;
      }
      const next = Object.assign({}, this.sessionQaState, {
        featuredQuestionId: normalizedId || null,
        updatedAt: Date.now(),
      });
      this._commitSessionQaState(next);
      return this._broadcastSessionQaFeatured();
    }

    _receiveSessionQaQuestion(uid, codename, payload) {
      const next = submitSessionQaQuestion(this.sessionQaState, {
        ownerUid: uid,
        codename: codename,
        text: payload && payload.text,
        clientQuestionId: payload && payload.clientQuestionId,
      }, Date.now());
      if (this._commitSessionQaState(next)) {
        const added = next.questions[next.questions.length - 1];
        this.onSessionQaQuestion(uid, codename, added);
      } else {
        // Return the authoritative lock/limit state to rejected or duplicate
        // senders so their UI never relies on optimistic local state.
        this._sendSessionQaStateToPeer(uid);
      }
    }

    _receiveSessionQaUpvote(uid, payload) {
      const questionId = normalizeSessionQaId(payload && payload.questionId, SESSION_QA_ID_MAX_LENGTH);
      const active = !!(payload && payload.active === true);
      const next = setSessionQaUpvote(this.sessionQaState, questionId, uid, active, Date.now());
      if (this._commitSessionQaState(next)) this.onSessionQaUpvote(uid, questionId, active);
      else this._sendSessionQaStateToPeer(uid);
    }

    sendFeedback(uid, pollId, packet) {
      if (!uid || !pollId || !this.activePoll || this.activePoll.id !== pollId || !this._isUidInActiveAudience(uid)) return false;
      const peer = this.peers.get(uid);
      const safePacket = sanitizeFeedbackPacket(packet, pollId);
      if (!peer || !peer.dc || peer.dc.readyState !== 'open' || !safePacket) return false;
      try {
        peer.dc.send(JSON.stringify({ type: 'feedback', payload: safePacket }));
        return true;
      } catch (err) {
        return false;
      }
    }

    sendCheckIn(uid, activityId) {
      if (!this._isUidInSupportActivity(uid, activityId)) return null;
      const peer = this.peers.get(uid);
      if (!peer || !peer.dc || peer.dc.readyState !== 'open') return null;
      const packet = normalizeLiveCheckInPacket({
        id: 'checkin-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        activityId: activityId,
        sentAt: Date.now(),
      });
      if (!packet) return null;
      try {
        peer.dc.send(JSON.stringify({ type: 'checkIn', payload: packet }));
        this.pendingCheckIns.set(String(uid), packet);
        return packet;
      } catch (err) {
        return null;
      }
    }

    _receiveCheckInAck(uid, codename, payload) {
      const ack = normalizeLiveCheckInAckPacket(payload);
      const pending = this.pendingCheckIns.get(String(uid));
      if (!ack || !pending || pending.id !== ack.checkInId || pending.activityId !== ack.activityId) return false;
      this.pendingCheckIns.delete(String(uid));
      this.onCheckInAck(uid, codename, ack);
      return true;
    }

    _receiveHelpRequest(uid, codename, payload) {
      const packet = normalizeLiveHelpRequestPacket(payload);
      if (!packet || !this._isUidInSupportActivity(uid, packet.activityId)) return false;
      this.onHelpRequest(uid, codename, packet);
      return true;
    }

    _cleanupPeer(uid, expectedPeer) {
      const peer = this.peers.get(uid);
      if (!peer || (expectedPeer && peer !== expectedPeer)) return;
      this.peers.delete(uid);
      try { if (peer.pc) peer.pc.close(); } catch (err) {}
      // Deliberately do NOT delete the signaling doc here. A reconnecting
      // guest overwrites that same doc with a fresh offer; deleting it from a
      // stale-peer cleanup raced that write and destroyed the new offer before
      // the host could answer it. Signaling docs are already deleted on
      // successful connect (both sides, ~750ms post-connect) and by the
      // guest's own leave(); a doc for a guest that never connected simply
      // waits for the guest's next overwrite.
      if (!this._stopped) this.onGuestLeft(uid);
    }

    stop() {
      if (this._stopped) return;
      this._stopped = true;
      if (this.collectionUnsub) {
        try { this.collectionUnsub(); } catch (err) {}
        this.collectionUnsub = null;
      }
      // Terminal event: tell every connected guest the host is going away so
      // student overlays clear immediately instead of dangling on a dead
      // channel. Best-effort — peers are torn down shortly after, which gives
      // the send buffer time to flush; guests that miss it still recover via
      // the closePoll state-sync on their next reconnect.
      const terminal = JSON.stringify({ type: 'hostClosed', payload: { pollId: (this.activePoll && this.activePoll.id) || null } });
      let notified = false;
      this.peers.forEach((peer) => {
        if (peer.dc && peer.dc.readyState === 'open') {
          try { peer.dc.send(terminal); notified = true; } catch (err) {}
        }
      });
      this.activePoll = null;
      this.activeAudienceUids = null;
      this.activePollResults = null;
      this.activePeerShowcase = null;
      this.peerShowcaseAudienceUids = null;
      this.sessionQaState = createSessionQaState();
      const teardown = () => {
        const uids = Array.from(this.peers.keys());
        uids.forEach((uid) => this._cleanupPeer(uid));
      };
      if (notified) setTimeout(teardown, 300);
      else teardown();
    }

    listGuests() {
      const out = [];
      this.peers.forEach((peer, uid) => {
        out.push({ uid: uid, codename: peer.codename, connected: !!(peer.dc && peer.dc.readyState === 'open') });
      });
      return out;
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // PollingGuest — student device
  // Creates an offer, writes it to its own signaling doc, listens for the
  // host's answer and ICE, opens a data channel for poll/response traffic.
  // ──────────────────────────────────────────────────────────────────────
  class PollingGuest {
    constructor(config) {
      this.sessionCode = config.sessionCode;
      this.userUid = config.userUid;
      this.codename = (typeof config.codename === 'string' && config.codename.slice(0, 64)) || 'Guest';
      this.onPoll = config.onPoll || (() => {});
      this.onPollClose = config.onPollClose || (() => {});
      this.onPollResults = config.onPollResults || (() => {});
      this.onPeerShowcase = config.onPeerShowcase || (() => {});
      this.onPeerVoteResults = config.onPeerVoteResults || (() => {});
      this.onPeerShowcaseClose = config.onPeerShowcaseClose || (() => {});
      this.onSessionQaState = config.onSessionQaState || (() => {});
      this.onSessionQaFeatured = config.onSessionQaFeatured || (() => {});
      this.onFeedback = config.onFeedback || (() => {});
      this.onCheckIn = config.onCheckIn || (() => {});
      this.onConnected = config.onConnected || (() => {});
      this.onDisconnected = config.onDisconnected || (() => {});
      this.onFailed = config.onFailed || (() => {});
      this.onHostClosed = config.onHostClosed || (() => {});
      this.signalingPath = config.signalingPath || 'signaling';
      this.pc = null;
      this.dc = null;
      this.signalingRef = null;
      this.signalingUnsub = null;
      this.sentIce = [];
      this._connected = false;
      this._timeoutHandle = null;
    }

    async join() {
      const fb = getFb();
      if (!fb) throw new Error('LivePolling: Firebase not available');
      if (!this.sessionCode || !this.userUid) throw new Error('LivePolling: sessionCode and userUid required');
      this.signalingRef = signalingDocRef(this.sessionCode, this.userUid, this.signalingPath);
      if (!this.signalingRef) throw new Error('LivePolling: cannot resolve signaling doc');

      const signalingRef = this.signalingRef;
      const pc = new RTCPeerConnection(getRtcConfig());
      const dc = pc.createDataChannel('polling', { ordered: true });
      this.pc = pc;
      this.dc = dc;

      pc.onicecandidate = (e) => {
        if (this.pc !== pc || !e.candidate) return;
        this.sentIce.push(e.candidate.toJSON());
        fb.setDoc(signalingRef, { iceFromGuest: this.sentIce }, { merge: true }).catch(() => {});
      };

      dc.onopen = () => {
        if (this.pc !== pc || this.dc !== dc) return;
        this._connected = true;
        if (this._timeoutHandle) { clearTimeout(this._timeoutHandle); this._timeoutHandle = null; }
        this.onConnected();
      };
      dc.onclose = () => {
        if (this.pc !== pc || this.dc !== dc) return;
        const wasConnected = this._connected;
        this._connected = false;
        if (wasConnected) this.onDisconnected();
      };
      dc.onmessage = (msg) => {
        try {
          if (this.pc !== pc || this.dc !== dc) return;
          const parsed = JSON.parse(msg.data);
          if (parsed && parsed.type === 'poll') this.onPoll(parsed.payload);
          else if (parsed && parsed.type === 'closePoll') this.onPollClose(parsed.payload);
          else if (parsed && parsed.type === 'pollResults') this.onPollResults(parsed.payload);
          else if (parsed && parsed.type === 'peerShowcase') {
            const round = sanitizePeerShowcaseRound(parsed.payload, '');
            if (round) {
              round.candidates = (parsed.payload.candidates || []).slice(0, PEER_SHOWCASE_MAX_CANDIDATES).map((item) => ({
                candidateId: String((item && item.candidateId) || '').slice(0, 64),
                response: normalizePeerShowcaseText(item && item.response),
                own: item && item.own === true,
              })).filter((item) => item.candidateId && item.response);
              this.onPeerShowcase(round);
            }
          }
          else if (parsed && parsed.type === 'peerVoteResults') this.onPeerVoteResults(parsed.payload);
          else if (parsed && parsed.type === 'peerShowcaseClose') this.onPeerShowcaseClose(parsed.payload || {});
          else if (parsed && parsed.type === 'sessionQaState') {
            this.onSessionQaState(sanitizeSessionQaGuestPacket(parsed.payload));
          }
          else if (parsed && parsed.type === 'sessionQaFeatured') {
            this.onSessionQaFeatured(sanitizeFeaturedQaPacket(parsed.payload));
          }
          else if (parsed && parsed.type === 'feedback') {
            const packet = sanitizeFeedbackPacket(parsed.payload, parsed.payload && parsed.payload.pollId);
            if (packet) this.onFeedback(packet);
          }
          else if (parsed && parsed.type === 'checkIn') {
            const packet = normalizeLiveCheckInPacket(parsed.payload);
            if (packet) this.onCheckIn(packet);
          }
          else if (parsed && parsed.type === 'hostClosed') this.onHostClosed(parsed.payload || {});
        } catch (err) {}
      };

      pc.onconnectionstatechange = () => {
        if (this.pc !== pc) return;
        if (pc.connectionState === 'connected') {
          setTimeout(() => {
            if (this.pc === pc) fb.deleteDoc(signalingRef).catch(() => {});
          }, 750);
        } else if (pc.connectionState === 'failed') {
          this.onFailed();
        }
      };

      try {
        const offer = await pc.createOffer();
        if (this.pc !== pc) return;
        await pc.setLocalDescription(offer);
        if (this.pc !== pc) return;
        await fb.setDoc(signalingRef, {
          offer: { type: offer.type, sdp: offer.sdp },
          codename: this.codename,
          createdAt: Date.now(),
          expiresAt: Date.now() + SIGNALING_TTL_MS,
        });
      } catch (err) {
        if (this.pc !== pc) return;
        console.warn('[LivePolling guest] setup failed:', err && err.message);
        this.onFailed();
        return;
      }

      this.signalingUnsub = fb.onSnapshot(signalingRef, (snap) => {
        if (this.pc !== pc) return;
        const data = (snap && snap.data && snap.data()) || null;
        if (!data) return;
        if (data.answer && pc.signalingState === 'have-local-offer') {
          pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(() => {});
        }
        if (Array.isArray(data.iceFromHost)) {
          data.iceFromHost.forEach((c) => {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          });
        }
      }, (err) => {
        console.warn('[LivePolling guest] signaling subscribe error:', err && err.message);
      });

      this._timeoutHandle = setTimeout(() => {
        if (this.pc === pc && !this._connected) {
          console.warn('[LivePolling guest] connection timeout; routing to fallback');
          this.onFailed();
        }
      }, CONNECTION_TIMEOUT_MS);
    }

    sendResponse(pollId, response, meta) {
      if (!this.dc || this.dc.readyState !== 'open') return false;
      const payload = {
        pollId: pollId,
        response: response,
        codename: this.codename,
        timestamp: Date.now(),
      };
      if (meta && meta.attempt != null) payload.attempt = clampInt(meta.attempt, 1, 1, 2);
      if (meta && meta.withdrawn === true) payload.withdrawn = true;
      try {
        this.dc.send(JSON.stringify({ type: 'response', payload: payload }));
        return true;
      } catch (err) {
        console.warn('[LivePolling guest] sendResponse failed:', err && err.message);
        return false;
      }
    }

    sendResponseStatus(pollId, status, attempt) {
      if (!this.dc || this.dc.readyState !== 'open' || !pollId) return false;
      const safeStatus = status === 'submitted' || status === 'editing' || status === 'withdrawn' ? status : 'drafting';
      try {
        this.dc.send(JSON.stringify({ type: 'responseStatus', payload: {
          pollId: pollId,
          status: safeStatus,
          attempt: clampInt(attempt, 1, 1, 2),
          timestamp: Date.now(),
        } }));
        return true;
      } catch (err) {
        return false;
      }
    }

    sendPeerVote(roundId, candidateId) {
      if (!this.dc || this.dc.readyState !== 'open' || !roundId || !candidateId) return false;
      try {
        this.dc.send(JSON.stringify({ type: 'peerVote', payload: {
          roundId: String(roundId).slice(0, 120),
          candidateId: String(candidateId).slice(0, 64),
          timestamp: Date.now(),
        } }));
        return true;
      } catch (err) {
        return false;
      }
    }


    sendSessionQaQuestion(text, clientQuestionId) {
      if (!this.dc || this.dc.readyState !== 'open') return false;
      const safeText = normalizeSessionQaQuestionText(text);
      if (!safeText) return false;
      const safeClientId = normalizeSessionQaId(clientQuestionId, SESSION_QA_CLIENT_ID_MAX_LENGTH)
        || ('guest-' + Date.now().toString(36));
      try {
        this.dc.send(JSON.stringify({ type: 'sessionQaQuestion', payload: {
          text: safeText,
          clientQuestionId: safeClientId,
        } }));
        return true;
      } catch (err) {
        return false;
      }
    }

    sendSessionQaUpvote(questionId, active) {
      if (!this.dc || this.dc.readyState !== 'open') return false;
      const safeQuestionId = normalizeSessionQaId(questionId, SESSION_QA_ID_MAX_LENGTH);
      if (!safeQuestionId) return false;
      try {
        this.dc.send(JSON.stringify({ type: 'sessionQaUpvote', payload: {
          questionId: safeQuestionId,
          active: active === true,
          timestamp: Date.now(),
        } }));
        return true;
      } catch (err) {
        return false;
      }
    }

    sendCheckInAck(checkInId, activityId, status) {
      if (!this.dc || this.dc.readyState !== 'open') return false;
      const packet = normalizeLiveCheckInAckPacket({
        checkInId: checkInId,
        activityId: activityId,
        status: status,
        acknowledgedAt: Date.now(),
      });
      if (!packet) return false;
      try {
        this.dc.send(JSON.stringify({ type: 'checkInAck', payload: packet }));
        return true;
      } catch (err) {
        return false;
      }
    }

    sendHelpRequest(activityId, active) {
      if (!this.dc || this.dc.readyState !== 'open') return false;
      const packet = normalizeLiveHelpRequestPacket({
        activityId: activityId,
        status: active === false ? 'cleared' : 'help',
        requestedAt: Date.now(),
      });
      if (!packet) return false;
      try {
        this.dc.send(JSON.stringify({ type: 'helpRequest', payload: packet }));
        return true;
      } catch (err) {
        return false;
      }
    }

    leave() {
      if (this._timeoutHandle) { clearTimeout(this._timeoutHandle); this._timeoutHandle = null; }
      if (this.signalingUnsub) {
        try { this.signalingUnsub(); } catch (err) {}
        this.signalingUnsub = null;
      }
      const signalingRef = this.signalingRef;
      const pc = this.pc;
      const dc = this.dc;
      this.pc = null;
      this.dc = null;
      this.signalingRef = null;
      this._connected = false;
      this.sentIce = [];
      if (signalingRef) {
        const fb = getFb();
        if (fb) fb.deleteDoc(signalingRef).catch(() => {});
      }
      if (dc) {
        dc.onopen = null;
        dc.onclose = null;
        dc.onmessage = null;
        try { if (typeof dc.close === 'function') dc.close(); } catch (err) {}
      }
      if (pc) {
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        try { pc.close(); } catch (err) {}
      }
    }
  }

  // Async fallback helper: export a response payload as a JSON file for
  // teachers to import on their device when peer connection cannot be
  // established (e.g., school network blocks UDP). The export contains only
  // application data the student would have sent over WebRTC; nothing
  // identifying beyond the codename.
  const exportResponseForFallback = (pollId, response, codename) => {
    const blob = new Blob([JSON.stringify({
      pollId: pollId,
      response: response,
      codename: codename || 'Guest',
      timestamp: Date.now(),
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'poll-response-' + (codename || 'guest') + '-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ──────────────────────────────────────────────────────────────────────
  // React UI components — render at the host (teacher) and guest (student).
  // ──────────────────────────────────────────────────────────────────────
  const R = (typeof window !== 'undefined' && window.React) || null;
  const ce = R ? R.createElement : null;

  // ── UI localization (runtime-AI, self-contained; NEVER touches lang/*.js) ──
  // English text IS the key; tr() collects strings and a per-component effect
  // batch-translates the missing ones into the viewer's interface language via
  // the app's global window.callGemini, keyed by currentUiLanguage and cached
  // per-device. The teacher (host) and each student (guest) each render on
  // their own device, so currentUiLanguage resolves to the right language on
  // each side. Poll prompts / options / group names / codenames are DATA typed
  // by the teacher and are never sent for translation. English fallback.
  var LP_I18N_KEY = 'allo_livepolling_ui_i18n_v1';
  var LANG_CTX = (typeof window !== 'undefined' && window.AlloLanguageContext) || (typeof window !== 'undefined' && window.React ? window.React.createContext(null) : null);
  var STR_REG = {};
  var LL_CUR = { lang: 'English', cache: {} };
  function llLoad() { try { return JSON.parse(localStorage.getItem(LP_I18N_KEY)) || {}; } catch (e) { return {}; } }
  function llStore(v) { try { localStorage.setItem(LP_I18N_KEY, JSON.stringify(v)); } catch (e) {} }
  function llInterp(s, params) { if (s == null || !params) return s; Object.keys(params).forEach(function (k) { s = s.split('{' + k + '}').join(String(params[k])); }); return s; }
  function tr(en, params) { if (en && typeof en === 'string') STR_REG[en] = true; var p = LL_CUR.cache[LL_CUR.lang]; return llInterp((p && p[en] != null) ? p[en] : en, params); }
  function llCleanJson(raw) { var s = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, ''); var f = s.indexOf('{'), l = s.lastIndexOf('}'); return f >= 0 && l > f ? s.slice(f, l + 1) : s; }
  function llSanitize(obj, wanted) { if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null; var out = {}, n = 0; wanted.forEach(function (k) { var v = obj[k]; if (typeof v === 'string') { v = v.trim().slice(0, 400); if (v) { out[k] = v; n++; } } }); return n ? out : null; }
  function llPrompt(langName, list) { return ['Translate these user-interface labels for a classroom live-polling activity (a teacher broadcasts a quick poll; students answer on their own devices) into natural, concise ' + langName + ' (buttons, headings, status messages — keep them short).', 'Keep any {tokens}, numbers, and symbols (≤ ≥ → % + ✕) EXACTLY as written. No commentary.', 'Return ONLY a JSON object mapping each ENGLISH string (used verbatim as the key) to its ' + langName + ' translation.', JSON.stringify(list)].join(String.fromCharCode(10)); }
  // Shared hook: both HostPanel (teacher) and GuestOverlay (student) call this
  // at the top of their render so tr() works in render, handlers, and helpers.
  function useLivePollingI18n() {
    var langCtx = R.useContext(LANG_CTX);
    var uiLang = (langCtx && langCtx.currentUiLanguage) || (typeof window !== 'undefined' && window.__alloTextLanguage) || 'English';
    var llCacheRef = R.useRef(llLoad());
    var llReqRef = R.useRef(0);
    var llAttemptedRef = R.useRef({});
    var setLlTick = R.useState(0)[1];
    LL_CUR.lang = uiLang; LL_CUR.cache = llCacheRef.current; // publish snapshot for module-scope tr()
    function llTranslateBatch(list) {
      var cg = (typeof window !== 'undefined') && window.callGemini;
      if (typeof cg !== 'function' || !list.length) return;
      var reqId = ++llReqRef.current, lang = uiLang;
      var att = llAttemptedRef.current[lang] || (llAttemptedRef.current[lang] = {});
      list.forEach(function (k) { att[k] = true; });
      Promise.resolve().then(function () { return cg(llPrompt(lang, list)); }).then(function (raw) {
        if (reqId !== llReqRef.current) return;
        var pack = null; try { pack = llSanitize(JSON.parse(llCleanJson(raw)), list); } catch (_) {}
        if (pack) {
          var next = Object.assign({}, llCacheRef.current);
          next[lang] = Object.assign({}, next[lang] || {}, pack);
          llCacheRef.current = next; llStore(next);
          setLlTick(function (n) { return n + 1; });
        }
      }).catch(function () {});
    }
    R.useEffect(function () {
      if (uiLang === 'English' || typeof window === 'undefined' || typeof window.callGemini !== 'function') return;
      var cache = llCacheRef.current[uiLang] || {}, attempted = llAttemptedRef.current[uiLang] || {};
      var missing = Object.keys(STR_REG).filter(function (k) { return !cache[k] && !attempted[k]; });
      if (!missing.length) return undefined;
      var to = setTimeout(function () { llTranslateBatch(missing); }, 500);
      return function () { clearTimeout(to); };
    });
  }

  // Modal focus lifecycle shared by the teacher host and its nested
  // confirmation. The shared stack prevents a parent dialog from handling
  // Tab/Escape while a child alert dialog is active.
  function useLivePollingDialogFocus(dialogRef, isOpen, onEscape, initialFocusRef) {
    var escapeRef = R.useRef(onEscape);
    escapeRef.current = onEscape;
    R.useEffect(function () {
      if (!isOpen || typeof document === 'undefined') return undefined;
      var dialog = dialogRef.current;
      if (!dialog) return undefined;
      var previousFocus = document.activeElement;
      var trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
      var trap = { root: dialog };
      trapStack.push(trap);
      var selector = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
      var getFocusable = function () {
        return Array.prototype.slice.call(dialog.querySelectorAll(selector));
      };
      var initial = initialFocusRef && initialFocusRef.current;
      var firstFocusable = initial || getFocusable()[0] || dialog;
      if (firstFocusable && typeof firstFocusable.focus === 'function') firstFocusable.focus();
      var onKeyDown = function (event) {
        if (trapStack[trapStack.length - 1] !== trap) return;
        if (event.key === 'Escape') {
          if (typeof escapeRef.current === 'function') {
            event.preventDefault();
            event.stopPropagation();
            escapeRef.current();
          }
          return;
        }
        if (event.key !== 'Tab') return;
        var focusable = getFocusable();
        if (!focusable.length) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (!dialog.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', onKeyDown);
      return function () {
        document.removeEventListener('keydown', onKeyDown);
        var trapIndex = trapStack.indexOf(trap);
        if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
        if (previousFocus && previousFocus.isConnected !== false && typeof previousFocus.focus === 'function') {
          previousFocus.focus();
        }
      };
    }, [dialogRef, initialFocusRef, isOpen]);
  }

  const renderWordCloudItems = function (items, ariaLabel) {
    const safeItems = Array.isArray(items) ? items.filter((item) => item && item.label) : [];
    if (!safeItems.length) return null;
    const maxCount = Math.max.apply(null, safeItems.map((item) => Number(item.count) || 1));
    return ce('div', {
      role: 'list',
      'aria-label': ariaLabel || tr('Word cloud'),
      'data-word-cloud-layout': 'stable',
      style: { display: 'flex', alignItems: 'center', justifyContent: 'center', alignContent: 'center', flexWrap: 'wrap', gap: '0.45rem 0.8rem', minHeight: 110, padding: '0.8rem', background: 'white', border: '1px solid #dbeafe', borderRadius: 10 }
    }, safeItems.map(function (item, index) {
      const count = Math.max(1, Number(item.count) || 1);
      const strength = count / maxCount;
      const size = stableWordCloudSize(count, maxCount);
      return ce('span', {
        key: String(item.value || item.label || index),
        role: 'listitem',
        'aria-label': item.label + ': ' + count,
        title: item.label + ' — ' + count,
        style: { color: stableWordCloudColor(item.value || item.label), fontSize: size, fontWeight: strength >= 0.75 ? 850 : 700, lineHeight: 1.05, overflowWrap: 'anywhere' }
      }, item.label, count > 1 ? ce('small', { 'aria-hidden': 'true', style: { marginLeft: 3, fontSize: '0.55em', opacity: 0.7 } }, '×' + count) : null);
    }));
  };

  const FeedbackResponseGallery = !R ? null : function FeedbackResponseGallery(props) {
    const participants = Array.isArray(props.participants) ? props.participants : [];
    const resources = Array.isArray(props.resources) ? props.resources : [];
    const feedbackByUid = props.feedbackByUid || {};
    const busyByUid = props.busyByUid || {};
    const submittedCount = participants.filter((item) => item.responseEntry).length;
    const revisedCount = participants.filter((item) => item.responseEntry && item.responseEntry.attempts && item.responseEntry.attempts.length > 1).length;
    const followUpResourceId = props.followUpResourceId || '';
    return ce('div', { style: { marginTop: 10, padding: '0.7rem', background: 'rgba(255,255,255,0.88)', border: '1px solid #a5b4fc', borderRadius: 8 } },
      ce('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 } },
        ce('strong', { style: { color: '#312e81', fontSize: '0.8rem' } }, tr('Private feedback gallery')),
        ce('span', { style: { color: '#475569', fontSize: '0.72rem' } }, submittedCount + '/' + participants.length + ' ' + tr('submitted') + (revisedCount ? ' · ' + revisedCount + ' ' + tr('revised') : '')),
        ce('button', {
          onClick: props.onGenerateAll,
          disabled: submittedCount === 0 || !!props.bulkBusy,
          style: { marginLeft: 'auto', padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid #7c3aed', background: 'white', color: '#5b21b6', fontWeight: 800, fontSize: '0.72rem', cursor: submittedCount === 0 || props.bulkBusy ? 'default' : 'pointer', opacity: submittedCount === 0 ? 0.45 : 1 }
        }, props.bulkBusy ? tr('Generating feedback…') : tr('Generate for submitted'))
      ),
      ce('p', { style: { margin: '0 0 8px 0', color: '#475569', fontSize: '0.72rem', lineHeight: 1.4 } },
        tr('Responses remain private from classmates. Generating AI feedback sends the response and criteria—without the codename—to your configured AI provider. Review or edit every message before sending it to one student.')
      ),
      resources.length > 0 ? ce('label', { style: { display: 'block', color: '#475569', fontWeight: 700, fontSize: '0.72rem', marginBottom: 8 } },
        tr('Optional follow-up resource'),
        ce('select', {
          value: followUpResourceId,
          onChange: function (event) { props.onSetFollowUpResourceId(event.target.value); },
          'aria-label': tr('Choose a follow-up resource'),
          style: { display: 'block', width: '100%', marginTop: 3, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, background: 'white' }
        },
          ce('option', { value: '' }, tr('Choose a lesson resource…')),
          resources.map(function (resource) {
            return ce('option', { key: resource.id, value: resource.id }, resource.title || resource.label || resource.type || tr('Resource'));
          })
        )
      ) : null,
      ce('div', { role: 'list', 'aria-label': tr('Private student feedback responses'), style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 430, overflow: 'auto' } },
        participants.map(function (participant) {
          const responseEntry = participant.responseEntry;
          const attempts = responseEntry && Array.isArray(responseEntry.attempts) ? responseEntry.attempts : [];
          const feedback = feedbackByUid[participant.uid] || {};
          const busy = !!busyByUid[participant.uid];
          const status = responseEntry ? (attempts.length > 1 ? tr('revised') : tr('submitted')) : tr(participant.status || 'waiting');
          return ce('article', { key: participant.uid, role: 'listitem', style: { padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white' } },
            ce('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 } },
              ce('strong', { style: { color: '#0f172a', fontSize: '0.8rem' } }, participant.codename),
              participant.groupName ? ce('span', { style: { color: '#6d28d9', background: '#f5f3ff', borderRadius: 999, padding: '0.08rem 0.4rem', fontSize: '0.65rem', fontWeight: 700 } }, participant.groupName) : null,
              ce('span', { style: { marginLeft: 'auto', color: responseEntry ? '#166534' : '#64748b', fontSize: '0.7rem', fontWeight: 800 } }, status)
            ),
            attempts.length > 0 ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 6 } },
              attempts.map(function (attempt) {
                return ce('div', { key: attempt.attempt, style: { padding: '0.45rem', background: attempt.attempt > 1 ? '#ecfdf5' : '#f8fafc', borderRadius: 6, color: '#1e293b', fontSize: '0.78rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } },
                  ce('strong', { style: { display: 'block', color: attempt.attempt > 1 ? '#047857' : '#475569', fontSize: '0.66rem', textTransform: 'uppercase', marginBottom: 2 } }, tr('Attempt') + ' ' + attempt.attempt),
                  attempt.response
                );
              })
            ) : ce('p', { style: { margin: '0 0 5px 0', color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic' } }, participant.status === 'drafting' || participant.status === 'editing' ? tr('Student is drafting…') : tr('Waiting for a response.')),
            responseEntry ? ce('div', null,
              ce('div', { style: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' } },
                ce('button', {
                  onClick: function () { props.onGenerate(participant.uid); },
                  disabled: busy,
                  style: { padding: '0.3rem 0.55rem', borderRadius: 6, border: '1px solid #7c3aed', background: 'white', color: '#5b21b6', fontWeight: 800, fontSize: '0.7rem', cursor: busy ? 'default' : 'pointer' }
                }, busy ? tr('Generating…') : (feedback.draft ? tr('Regenerate feedback') : tr('Generate feedback'))),
                feedback.status === 'sent' ? ce('span', { style: { color: '#047857', fontSize: '0.68rem', fontWeight: 800 } }, tr('Sent privately')) :
                  feedback.status === 'error' ? ce('span', { style: { color: '#b91c1c', fontSize: '0.68rem', fontWeight: 700 } }, tr('Generation failed — try again')) : null
              ),
              feedback.draft != null ? ce('textarea', {
                value: feedback.draft,
                maxLength: FEEDBACK_TEXT_MAX_LENGTH,
                onChange: function (event) { props.onDraftChange(participant.uid, event.target.value); },
                'aria-label': tr('Feedback for') + ' ' + participant.codename,
                rows: 3,
                style: { width: '100%', boxSizing: 'border-box', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', fontSize: '0.76rem', marginBottom: 5 }
              }) : null,
              feedback.draft ? ce('button', {
                onClick: function () { props.onSendFeedback(participant.uid); },
                style: { padding: '0.35rem 0.6rem', borderRadius: 6, border: 'none', background: '#4f46e5', color: 'white', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }
              }, feedback.status === 'sent' ? tr('Send updated feedback') : tr('Review complete — send privately')) : null,
              followUpResourceId ? ce('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 } },
                typeof props.onSendToStudent === 'function' ? ce('button', {
                  onClick: function () { props.onSendToStudent(participant.uid, followUpResourceId); },
                  style: { padding: '0.3rem 0.55rem', borderRadius: 6, border: '1px solid #2563eb', background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.68rem' }
                }, tr('Send resource to student')) : null,
                participant.groupId && typeof props.onSendToGroup === 'function' ? ce('button', {
                  onClick: function () { props.onSendToGroup(participant.groupId, followUpResourceId); },
                  style: { padding: '0.3rem 0.55rem', borderRadius: 6, border: '1px solid #7c3aed', background: '#f5f3ff', color: '#6d28d9', fontWeight: 800, fontSize: '0.68rem' }
                }, tr('Send to') + ' ' + (participant.groupName || tr('group'))) : null
              ) : null
            ) : null
          );
        })
      )
    );
  };


  const SessionQaHostPanel = !R ? null : function SessionQaHostPanel(props) {
    const state = props.state && typeof props.state === 'object'
      ? props.state
      : createSessionQaState({ enabled: true });
    const questions = Array.isArray(state.questions) ? state.questions : [];
    const rows = sortSessionQaQuestions(questions, props.sortMode, state.upvotesByQuestion);
    const counts = questions.reduce(function (out, question) {
      const status = normalizeSessionQaStatus(question && question.status);
      out[status] = (out[status] || 0) + 1;
      return out;
    }, { held: 0, approved: 0, dismissed: 0, archived: 0 });
    const featured = state.featuredQuestionId
      ? questions.find(function (question) { return question && question.questionId === state.featuredQuestionId; })
      : null;
    return ce('section', {
      'aria-label': tr('Moderated live Q&A'),
      style: { background: '#f8fafc', border: '1px solid #bae6fd', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem' }
    },
      ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' } },
        ce('div', null,
          ce('h3', { style: { margin: 0, color: '#075985', fontSize: '0.95rem' } }, tr('Live Q&A')),
          ce('p', { style: { margin: '0.2rem 0 0', color: '#475569', fontSize: '0.72rem', lineHeight: 1.35 } }, tr('Questions stay on this teacher device until approved. Approved questions and vote totals are anonymous.'))
        ),
        ce('button', {
          type: 'button',
          onClick: function () { props.onSetLocked(!state.submissionsLocked); },
          'aria-pressed': state.submissionsLocked,
          style: { minHeight: 40, padding: '0.35rem 0.65rem', border: '1px solid ' + (state.submissionsLocked ? '#b91c1c' : '#0284c7'), borderRadius: 6, background: 'white', color: state.submissionsLocked ? '#b91c1c' : '#0369a1', fontWeight: 800, cursor: 'pointer' }
        }, state.submissionsLocked ? tr('Open questions') : tr('Lock questions'))
      ),
      featured ? ce('div', { style: { marginTop: 8, padding: '0.5rem', borderRadius: 7, background: '#fef3c7', border: '1px solid #f59e0b' } },
        ce('strong', { style: { display: 'block', color: '#92400e', fontSize: '0.68rem', textTransform: 'uppercase' } }, tr('Featured for students')),
        ce('div', { style: { marginTop: 2, color: '#1e293b', fontSize: '0.8rem', overflowWrap: 'anywhere' } }, featured.text),
        ce('button', {
          type: 'button',
          onClick: function () { props.onFeature(null); },
          style: { marginTop: 5, minHeight: 36, padding: '0.25rem 0.5rem', border: '1px solid #d97706', borderRadius: 5, background: 'white', color: '#92400e', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }
        }, tr('Unfeature'))
      ) : null,
      ce('div', { style: { marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
        ce('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', color: '#475569', fontSize: '0.7rem', fontWeight: 800 } },
          ce('span', null, tr('Held:') + ' ' + counts.held),
          ce('span', { style: { color: '#166534' } }, tr('Approved:') + ' ' + counts.approved),
          ce('span', null, tr('Dismissed:') + ' ' + counts.dismissed),
          ce('span', null, tr('Archived:') + ' ' + counts.archived)
        ),
        ce('div', { role: 'group', 'aria-label': tr('Sort teacher Q&A'), style: { display: 'flex', gap: 4 } },
          ['latest', 'top'].map(function (mode) {
            const selected = props.sortMode === mode;
            return ce('button', {
              key: mode,
              type: 'button',
              onClick: function () { props.onSortMode(mode); },
              'aria-pressed': selected,
              style: { minHeight: 36, padding: '0.25rem 0.5rem', border: '1px solid #7dd3fc', borderRadius: 5, background: selected ? '#e0f2fe' : 'white', color: '#075985', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }
            }, mode === 'top' ? tr('Top voted') : tr('Latest'));
          })
        )
      ),
      rows.length ? ce('div', { role: 'list', 'aria-label': tr('Student questions for moderation'), style: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', marginTop: 8 } },
        rows.map(function (question) {
          const status = normalizeSessionQaStatus(question.status);
          const voteCount = getSessionQaUpvoteCount(state.upvotesByQuestion, question.questionId);
          const isFeatured = state.featuredQuestionId === question.questionId;
          return ce('article', { key: question.questionId, role: 'listitem', style: { padding: '0.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: 7 } },
            ce('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
              ce('div', { style: { minWidth: 0 } },
                ce('strong', { style: { display: 'block', color: '#075985', fontSize: '0.7rem' } }, question.codename || tr('Student')),
                ce('div', { style: { marginTop: 2, color: '#1e293b', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.8rem' } }, question.text)
              ),
              ce('span', { style: { color: '#475569', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 800 } }, '▲ ' + voteCount)
            ),
            ce('div', { style: { display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 6 } },
              status === 'archived' ? ce('button', {
                type: 'button',
                onClick: function () { props.onModerate(question.questionId, 'restore'); },
                style: { minHeight: 36, padding: '0.25rem 0.5rem', border: '1px solid #0284c7', borderRadius: 5, background: 'white', color: '#0369a1', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }
              }, tr('Restore')) : ce('select', {
                value: status === 'held' ? 'hold' : status === 'approved' ? 'approve' : 'dismiss',
                onChange: function (event) { props.onModerate(question.questionId, event.target.value); },
                'aria-label': tr('Moderation for') + ' ' + (question.codename || tr('student question')),
                style: { minHeight: 36, padding: '0.25rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: 5, background: status === 'approved' ? '#dcfce7' : status === 'dismissed' ? '#f1f5f9' : '#fff7ed', fontWeight: 800, fontSize: '0.7rem' }
              },
                ce('option', { value: 'hold' }, tr('Hold')),
                ce('option', { value: 'approve' }, tr('Approve')),
                ce('option', { value: 'dismiss' }, tr('Dismiss'))
              ),
              status !== 'archived' ? ce('button', {
                type: 'button',
                onClick: function () { props.onModerate(question.questionId, 'archive'); },
                style: { minHeight: 36, padding: '0.25rem 0.5rem', border: '1px solid #94a3b8', borderRadius: 5, background: 'white', color: '#475569', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }
              }, tr('Archive')) : null,
              status === 'approved' ? ce('button', {
                type: 'button',
                onClick: function () { props.onFeature(isFeatured ? null : question.questionId); },
                style: { minHeight: 36, padding: '0.25rem 0.5rem', border: '1px solid #d97706', borderRadius: 5, background: isFeatured ? '#fef3c7' : 'white', color: '#92400e', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }
              }, isFeatured ? tr('Unfeature') : tr('Feature')) : null
            )
          );
        })
      ) : ce('p', { style: { margin: '0.65rem 0 0', padding: '0.55rem', borderRadius: 6, background: 'white', color: '#64748b', fontSize: '0.76rem' } }, tr('No questions yet. Students can ask once their direct connection is ready.'))
    );
  };

  const HostPanel = !R ? null : function HostPanel(props) {
    useLivePollingI18n();
    const sessionCode = props.sessionCode || '';
    const isOpen = !!props.isOpen;
    const onClose = props.onClose || (() => {});
    const resources = Array.isArray(props.resources) ? props.resources : [];
    const roster = props.roster && typeof props.roster === 'object' ? props.roster : {};
    const sessionGroups = props.sessionGroups && typeof props.sessionGroups === 'object' ? props.sessionGroups : {};
    const activitySnapshots = Array.isArray(props.activitySnapshots) ? props.activitySnapshots : [];
    const onSendToStudent = typeof props.onSendToStudent === 'function' ? props.onSendToStudent : null;
    const onSendToGroup = typeof props.onSendToGroup === 'function' ? props.onSendToGroup : null;
    const onSendToStudents = typeof props.onSendToStudents === 'function' ? props.onSendToStudents : null;
    const onOpenDiagnostics = typeof props.onOpenDiagnostics === 'function' ? props.onOpenDiagnostics : null;
    const onRequestEndSession = typeof props.onRequestEndSession === 'function' ? props.onRequestEndSession : null;
    const transportKind = normalizeLiveTransportKind(props.transportKind);
    const sessionStartedAt = Math.max(0, Number(props.sessionStartedAt) || 0);
    // Optional consumer bridge for contextual workflows such as Adventure
    // Mode. Only anonymous response text and public round metadata leave this
    // panel; teacher-private author uid/codename never do.
    const onUsePeerShowcaseResponse = typeof props.onUsePeerShowcaseResponse === 'function'
      ? props.onUsePeerShowcaseResponse
      : null;
    const onActivitySnapshot = typeof props.onActivitySnapshot === 'function' ? props.onActivitySnapshot : null;
    // Off by default: the shell must explicitly opt this session into Q&A.
    const sessionQaOptIn = props.enableSessionQa === true;
    // Session-wide Q&A keeps the existing RTC host alive while its panel is
    // closed. With Q&A off, lifecycle behavior remains tied to isOpen.
    const hostTransportActive = !!(sessionCode && (isOpen || sessionQaOptIn));
    let allowedUidValues = null;
    if (props.allowedUids != null) {
      let rawAllowedUids = [];
      try { rawAllowedUids = Array.from(props.allowedUids); } catch (err) {}
      allowedUidValues = Array.from(new Set(rawAllowedUids.map(function (uid) {
        return uid == null ? '' : String(uid);
      }).filter(Boolean)));
    }
    const allowedUidsSignature = allowedUidValues == null
      ? 'legacy-allow-all'
      : JSON.stringify(allowedUidValues.slice().sort());
    const hostRef = R.useRef(null);
    const transportGenerationRef = R.useRef(0);
    const hostDialogRef = R.useRef(null);
    const hostCloseRef = R.useRef(null);
    const groupNameTriggerRef = R.useRef(null);
    const groupNameDialogRef = R.useRef(null);
    const groupNameCancelRef = R.useRef(null);
    const endPollDialogRef = R.useRef(null);
    const endPollCancelRef = R.useRef(null);
    const alloSheetDialogRef = R.useRef(null);
    const alloSheetInitialRef = R.useRef(null);
    const studentActivityDialogRef = R.useRef(null);
    const studentActivityCloseRef = R.useRef(null);
    const [pendingGroupName, setPendingGroupName] = R.useState(null);
    const [pendingEndAction, setPendingEndAction] = R.useState(null);
    const [guests, setGuests] = R.useState([]);
    const [responses, setResponses] = R.useState({});
    const [checkInsByUid, setCheckInsByUid] = R.useState({});
    const [pollType, setPollType] = R.useState('rating');
    const [pollPrompt, setPollPrompt] = R.useState('');
    const [pollOptions, setPollOptions] = R.useState('Option A\nOption B\nOption C');
    const [ratingMin, setRatingMin] = R.useState(1);
    const [ratingMax, setRatingMax] = R.useState(5);
    const [ratingLabels, setRatingLabels] = R.useState('1 = Not yet\n2 = A little\n3 = Somewhat\n4 = Mostly\n5 = Very well');
    const [afterSubmitMode, setAfterSubmitMode] = R.useState('dismiss');
    const [lastSharedResultsAt, setLastSharedResultsAt] = R.useState(null);
    const [activePoll, setActivePoll] = R.useState(null);
    const [completedPolls, setCompletedPolls] = R.useState([]);
    const [alloSheetReviewOpen, setAlloSheetReviewOpen] = R.useState(false);
    const [alloSheetIncludeChoiceLabels, setAlloSheetIncludeChoiceLabels] = R.useState(false);
    const [alloSheetDatasets, setAlloSheetDatasets] = R.useState({ sessionSummary: true, itemSummary: true, answerDistribution: true, timeSummary: true });
    const [alloSheetBusy, setAlloSheetBusy] = R.useState(false);
    const [alloSheetFeedback, setAlloSheetFeedback] = R.useState({ kind: '', text: '' });
    const [composerRules, setComposerRules] = R.useState([]);
    // Local additions only bridge the round-trip until the canonical session
    // groups prop contains the newly written group. Canonical entries always
    // win duplicate ids, so their selected id/name cannot be overwritten.
    const [createdGroups, setCreatedGroups] = R.useState([]);
    const routingGroups = mergeLivePollingGroups(sessionGroups, createdGroups);
    R.useEffect(function () {
      const source = props.sessionGroups && typeof props.sessionGroups === 'object' && !Array.isArray(props.sessionGroups) ? props.sessionGroups : {};
      const acknowledged = new Set(Object.keys(source).filter(function (id) { return source[id] && typeof source[id] === 'object'; }));
      if (!acknowledged.size) return;
      setCreatedGroups(function (prev) {
        const next = prev.filter(function (entry) { return entry && !acknowledged.has(entry.id); });
        return next.length === prev.length ? prev : next;
      });
    }, [props.sessionGroups]);
    const [newGroupName, setNewGroupName] = R.useState('');
    const [showRoutingPanel, setShowRoutingPanel] = R.useState(false);
    const [studentActivityFilter, setStudentActivityFilter] = R.useState('all');
    const [studentActivitySort, setStudentActivitySort] = R.useState('attention');
    const [studentActivityQuery, setStudentActivityQuery] = R.useState('');
    const [studentActivityExpanded, setStudentActivityExpanded] = R.useState(true);
    const [studentActivityVisibleLimit, setStudentActivityVisibleLimit] = R.useState(50);
    const [selectedStudentActivityUid, setSelectedStudentActivityUid] = R.useState(null);
    const [composerExpanded, setComposerExpanded] = R.useState(true);
    // routingByPoll: { pollId: { uid: groupId } } — used both to suppress
    // duplicate routing on re-submission and to compute aggregates.
    const [routingByPoll, setRoutingByPoll] = R.useState({});
    // Word-cloud terms are held locally until the teacher explicitly approves
    // or hides them. Only approved anonymous aggregates are ever shared.
    const [wordCloudModerationByPoll, setWordCloudModerationByPoll] = R.useState({});
    // Teacher-local aliases let synonymous terms be renamed or merged before
    // any anonymous aggregate is revealed. Raw student terms remain local.
    const [wordCloudAliasesByPoll, setWordCloudAliasesByPoll] = R.useState({});
    const [wordCloudRenameDrafts, setWordCloudRenameDrafts] = R.useState({});
    const [wordCloudModerationFilter, setWordCloudModerationFilter] = R.useState('all');
    const [wordCloudModerationQuery, setWordCloudModerationQuery] = R.useState('');
    const [wordCloudVisibleLimit, setWordCloudVisibleLimit] = R.useState(60);
    const [wordCloudClusterSuggestions, setWordCloudClusterSuggestions] = R.useState([]);
    const [wordCloudClusterBusy, setWordCloudClusterBusy] = R.useState(false);
    const [wordCloudClusterNotice, setWordCloudClusterNotice] = R.useState('');
    // Standard free-text responses stay teacher-private until explicitly
    // approved for a bounded anonymous showcase.
    const [freeTextModerationByPoll, setFreeTextModerationByPoll] = R.useState({});
    const [peerShowcaseRound, setPeerShowcaseRound] = R.useState(null);
    const [peerVotesByRound, setPeerVotesByRound] = R.useState({});
    const [peerVoteCriterion, setPeerVoteCriterion] = R.useState('Which response best supports its thinking with clear evidence?');
    const [feedbackEnabled, setFeedbackEnabled] = R.useState(false);
    const [feedbackCriteria, setFeedbackCriteria] = R.useState('');
    const [audienceMode, setAudienceMode] = R.useState('class');
    const [audienceId, setAudienceId] = R.useState('');
    const [activeParticipantUids, setActiveParticipantUids] = R.useState([]);
    const [responseStatusByPoll, setResponseStatusByPoll] = R.useState({});
    const [feedbackByPoll, setFeedbackByPoll] = R.useState({});
    const [feedbackBusyByPoll, setFeedbackBusyByPoll] = R.useState({});
    const [feedbackBulkBusy, setFeedbackBulkBusy] = R.useState(false);
    const [followUpResourceId, setFollowUpResourceId] = R.useState('');
    const [reviewedActionKeys, setReviewedActionKeys] = R.useState(function () { return readLiveTeacherActionState(sessionCode); });
    const [actionQueueBusyUid, setActionQueueBusyUid] = R.useState('');
    const [actionQueueNotice, setActionQueueNotice] = R.useState({ kind: '', text: '' });
    const [healthNow, setHealthNow] = R.useState(function () { return Date.now(); });
    const [wrapUpExpanded, setWrapUpExpanded] = R.useState(false);
    const [sessionQaState, setSessionQaState] = R.useState(function () {
      return createSessionQaState({ enabled: sessionQaOptIn });
    });
    const [sessionQaSortMode, setSessionQaSortMode] = R.useState('latest');
    // Refs keep onResponse's closure reading current state without
    // re-creating the host (which would tear down all peer connections).
    const activePollRef = R.useRef(null);
    const routingByPollRef = R.useRef({});
    const lastActivitySnapshotRef = R.useRef(null);
    const activitySnapshotSessionRef = R.useRef(sessionCode);
    const transportSessionRef = R.useRef(sessionCode);
    const panelWasOpenRef = R.useRef(isOpen);
    const panelSessionRef = R.useRef(sessionCode);
    R.useEffect(function () {
      if (!isOpen || typeof setInterval !== 'function') return undefined;
      setHealthNow(Date.now());
      const timer = setInterval(function () { setHealthNow(Date.now()); }, 15000);
      return function () { clearInterval(timer); };
    }, [isOpen, sessionCode]);
    R.useEffect(function () {
      writeLiveTeacherActionState(sessionCode, reviewedActionKeys, null, healthNow);
      if (typeof props.onTeacherActionStateChange === 'function') {
        props.onTeacherActionStateChange(normalizeLiveTeacherActionStateMap(reviewedActionKeys, healthNow));
      }
    }, [sessionCode, reviewedActionKeys]);
    R.useEffect(function () { setStudentActivityVisibleLimit(50); }, [studentActivityFilter, studentActivitySort, studentActivityQuery]);
    R.useEffect(function () { setWordCloudVisibleLimit(60); }, [wordCloudModerationFilter, wordCloudModerationQuery]);
    R.useEffect(function () {
      const sessionChanged = transportSessionRef.current !== sessionCode;
      transportSessionRef.current = sessionCode;
      if (hostTransportActive && !sessionChanged) return;
      activePollRef.current = null;
      routingByPollRef.current = {};
      setGuests([]); setActivePoll(null); setActiveParticipantUids([]);
      setResponses({}); setRoutingByPoll({}); setCheckInsByUid({});
      setStudentActivityFilter('all'); setStudentActivitySort('attention'); setStudentActivityQuery('');
      setStudentActivityExpanded(true); setStudentActivityVisibleLimit(50); setComposerExpanded(true);
      setWordCloudModerationByPoll({}); setWordCloudAliasesByPoll({}); setWordCloudRenameDrafts({});
      setWordCloudModerationFilter('all'); setWordCloudModerationQuery(''); setWordCloudVisibleLimit(60);
      setWordCloudClusterSuggestions([]); setWordCloudClusterBusy(false); setWordCloudClusterNotice(''); setFreeTextModerationByPoll({});
      setPeerShowcaseRound(null); setPeerVotesByRound({});
      setResponseStatusByPoll({}); setFeedbackByPoll({}); setFeedbackBusyByPoll({});
      setFeedbackBulkBusy(false); setLastSharedResultsAt(null);
      setReviewedActionKeys(readLiveTeacherActionState(sessionCode)); setActionQueueBusyUid(''); setActionQueueNotice({ kind: '', text: '' });
      if (sessionChanged) {
        setCreatedGroups([]);
        setSessionQaState(createSessionQaState({ enabled: sessionQaOptIn }));
        setSessionQaSortMode('latest');
        setCompletedPolls([]);
        setPendingEndAction(null);
        setAlloSheetReviewOpen(false);
        setAlloSheetFeedback({ kind: '', text: '' });
        setWrapUpExpanded(false);
      }
    }, [hostTransportActive, sessionCode]);
    R.useEffect(function () { activePollRef.current = activePoll; }, [activePoll]);
    R.useEffect(function () { routingByPollRef.current = routingByPoll; }, [routingByPoll]);
    R.useEffect(function () {
      const sessionChanged = panelSessionRef.current !== sessionCode;
      const wasOpen = panelWasOpenRef.current;
      panelSessionRef.current = sessionCode;
      panelWasOpenRef.current = isOpen;
      if (sessionChanged || !wasOpen || isOpen || !hostTransportActive) return;
      const poll = activePollRef.current;
      if (poll) {
        const closedAt = Date.now();
        const responsesForPoll = uniqueResponsesForSummary(responses[poll.id] || []);
        const audienceUidsForPoll = activeParticipantUids.slice();
        setCompletedPolls(function (prev) {
          const next = prev.filter(function (entry) { return entry && entry.poll && entry.poll.id !== poll.id; });
          return next.concat([{ poll: poll, responses: responsesForPoll, audienceCount: audienceUidsForPoll.length, audienceUids: audienceUidsForPoll, startedAt: poll.startedAt, endedAt: closedAt }]).slice(-100);
        });
      }
      if (poll && hostRef.current) hostRef.current.closePoll(poll.id);
      activePollRef.current = null;
      routingByPollRef.current = {};
      setActivePoll(null); setActiveParticipantUids([]);
      setResponses({}); setRoutingByPoll({}); setCheckInsByUid({});
      setWordCloudModerationByPoll({}); setWordCloudAliasesByPoll({}); setWordCloudRenameDrafts({}); setFreeTextModerationByPoll({});
      setPeerShowcaseRound(null); setPeerVotesByRound({});
      setResponseStatusByPoll({}); setFeedbackByPoll({}); setFeedbackBusyByPoll({});
      setFeedbackBulkBusy(false); setLastSharedResultsAt(null);
      setActionQueueBusyUid(''); setActionQueueNotice({ kind: '', text: '' });
    }, [isOpen, hostTransportActive, sessionCode]);

    // One-tap presets (e.g. the Live Session Center's Quick Check) seed the
    // composer when the panel opens; the teacher still reviews + broadcasts.
    // Shape: { type, prompt, ratingMin, ratingMax, ratingLabels, options,
    // afterSubmitMode } — all fields optional.
    const initialPoll = props.initialPoll || null;
    R.useEffect(function () {
      if (!isOpen || !initialPoll) return;
      if (initialPoll.type) setPollType(initialPoll.type);
      if (typeof initialPoll.prompt === 'string') setPollPrompt(initialPoll.prompt);
      if (initialPoll.ratingMin != null) setRatingMin(clampInt(initialPoll.ratingMin, 1, 0, 19));
      if (initialPoll.ratingMax != null) setRatingMax(clampInt(initialPoll.ratingMax, 5, 1, 20));
      if (typeof initialPoll.ratingLabels === 'string') setRatingLabels(initialPoll.ratingLabels);
      if (typeof initialPoll.options === 'string') setPollOptions(initialPoll.options);
      if (initialPoll.afterSubmitMode) setAfterSubmitMode(initialPoll.afterSubmitMode);
      if (initialPoll.feedbackEnabled != null) setFeedbackEnabled(initialPoll.feedbackEnabled === true);
      if (typeof initialPoll.feedbackCriteria === 'string') setFeedbackCriteria(initialPoll.feedbackCriteria);
      const hasAudienceMode = Object.prototype.hasOwnProperty.call(initialPoll, 'audienceMode');
      const hasAudienceId = Object.prototype.hasOwnProperty.call(initialPoll, 'audienceId');
      const hasLegacyMode = Object.prototype.hasOwnProperty.call(initialPoll, 'feedbackAudienceMode');
      const hasLegacyId = Object.prototype.hasOwnProperty.call(initialPoll, 'feedbackAudienceId');
      const useCurrentAudience = hasAudienceMode || hasAudienceId;
      if (!(hasAudienceMode || hasAudienceId || hasLegacyMode || hasLegacyId)) {
        setAudienceMode('class');
        setAudienceId('');
      } else {
        const selectedMode = useCurrentAudience ? initialPoll.audienceMode : initialPoll.feedbackAudienceMode;
        const selectedId = useCurrentAudience ? initialPoll.audienceId : initialPoll.feedbackAudienceId;
        const selection = selectedMode == null || String(selectedMode).trim() === ''
          ? {
              audienceMode: '',
              audienceId: normalizeBoundedText(selectedId, LIVE_POLLING_AUDIENCE_ID_MAX_LENGTH).replace(/\s+/g, ' '),
              valid: false,
            }
          : normalizeLivePollingAudienceSelection(selectedMode, selectedId);
        setAudienceMode(selection.audienceMode);
        setAudienceId(selection.audienceId);
      }
      if (typeof initialPoll.peerVoteCriterion === 'string') {
        setPeerVoteCriterion(normalizePeerVoteCriterion(initialPoll.peerVoteCriterion));
      }
    }, [isOpen, initialPoll]);

    R.useEffect(function () {
      if (!hostTransportActive || !sessionCode) return undefined;
      const transportGeneration = transportGenerationRef.current + 1;
      transportGenerationRef.current = transportGeneration;
      const isCurrentTransport = function () {
        return transportGenerationRef.current === transportGeneration;
      };
      const host = new PollingHost({
        sessionCode: sessionCode,
        enableSessionQa: sessionQaOptIn,
        onSessionQaStateChange: function (nextState) {
          if (!isCurrentTransport()) return;
          setSessionQaState(nextState);
        },
        onGuestConnected: function (uid, codename) {
          if (!isCurrentTransport()) return;
          setGuests(function (prev) { return upsertLiveGuest(prev, uid, codename); });
        },
        onResponse: function (uid, codename, payload) {
          if (!isCurrentTransport()) return;
          if (payload.withdrawn === true) {
            setResponses(function (prev) {
              const next = Object.assign({}, prev);
              next[payload.pollId] = (next[payload.pollId] || []).filter(function (entry) { return entry && entry.uid !== uid; });
              return next;
            });
            setResponseStatusByPoll(function (prev) {
              const next = Object.assign({}, prev);
              next[payload.pollId] = Object.assign({}, next[payload.pollId] || {}, { [uid]: 'withdrawn' });
              return next;
            });
            setLastSharedResultsAt(null);
            return;
          }
          // Auto-route via teacher-authored rules. Reads latest activePoll
          // via ref so rule changes between broadcasts are honored. Writes
          // only the resulting groupId to Firestore (Tier-1 allowlisted);
          // the response itself stays peer-to-peer.
          const poll = activePollRef.current;
          let routedToGroupId = null;
          if (poll && poll.id === payload.pollId && Array.isArray(poll.routingRules) && poll.routingRules.length > 0) {
            const already = routingByPollRef.current[poll.id] && routingByPollRef.current[poll.id][uid];
            if (!already) {
              const groupId = evaluateRoutingRules(poll.routingRules, payload.response);
              if (groupId) {
                routedToGroupId = groupId;
                const ref = sessionDocRef(sessionCode);
                const writer = (typeof window !== 'undefined') && window.__alloWriteToSession;
                if (ref && typeof writer === 'function') {
                  writer(ref, { ['roster.' + uid + '.groupId']: groupId }).catch(function (err) {
                    console.warn('[LivePolling HostPanel] auto-route write failed:', err && err.message);
                  });
                }
                setRoutingByPoll(function (prev) {
                  const next = Object.assign({}, prev);
                  next[poll.id] = Object.assign({}, next[poll.id] || {}, { [uid]: groupId });
                  return next;
                });
              }
            } else {
              routedToGroupId = already;
            }
          }
          setResponses(function (prev) {
            const next = Object.assign({}, prev);
            const entry = { uid: uid, codename: codename, response: payload.response, timestamp: payload.timestamp, routedToGroupId: routedToGroupId, attempt: payload.attempt };
            next[payload.pollId] = isFeedbackPoll(poll)
              ? upsertFeedbackResponse(next[payload.pollId], entry)
              : upsertPollResponse(next[payload.pollId], entry);
            return next;
          });
          setResponseStatusByPoll(function (prev) {
            const next = Object.assign({}, prev);
            next[payload.pollId] = Object.assign({}, next[payload.pollId] || {}, { [uid]: 'submitted' });
            return next;
          });
          if (isFeedbackPoll(poll)) {
            if (clampInt(payload.attempt, 1, 1, 2) > 1) {
              setFeedbackByPoll(function (prev) {
                const next = Object.assign({}, prev);
                const forPoll = Object.assign({}, next[payload.pollId] || {});
                const prior = forPoll[uid] || {};
                forPoll[uid] = Object.assign({}, prior, { draft: '', status: 'pending', attempt: 2 });
                next[payload.pollId] = forPoll;
                return next;
              });
            }
          }
        },
        onResponseStatus: function (uid, codename, payload) {
          if (!isCurrentTransport()) return;
          setResponseStatusByPoll(function (prev) {
            const next = Object.assign({}, prev);
            next[payload.pollId] = Object.assign({}, next[payload.pollId] || {}, { [uid]: payload.status });
            return next;
          });
        },
        onCheckInAck: function (uid, codename, ack) {
          if (!isCurrentTransport()) return;
          setCheckInsByUid(function (prev) {
            const current = prev[uid];
            if (!current || current.id !== ack.checkInId || current.activityId !== ack.activityId) return prev;
            return Object.assign({}, prev, { [uid]: Object.assign({}, current, { status: ack.status, acknowledgedAt: ack.acknowledgedAt }) });
          });
        },
        onHelpRequest: function (uid, codename, packet) {
          if (!isCurrentTransport()) return;
          setCheckInsByUid(function (prev) {
            const next = Object.assign({}, prev);
            if (packet.status === 'cleared') delete next[uid];
            else next[uid] = { id: 'student-request-' + uid, activityId: packet.activityId, status: 'help', acknowledgedAt: packet.requestedAt, studentInitiated: true };
            return next;
          });
        },
        onPeerVote: function (uid, codename, vote) {
          if (!isCurrentTransport()) return;
          setPeerVotesByRound(function (prev) {
            const next = Object.assign({}, prev);
            next[vote.roundId] = upsertPeerVote(next[vote.roundId], uid, vote);
            return next;
          });
        },
        onGuestLeft: function (uid) {
          if (!isCurrentTransport()) return;
          setGuests(function (prev) { return prev.filter(function (g) { return g.uid !== uid; }); });
        },
      });
      hostRef.current = host;
      host.setAllowedUids(allowedUidValues);
      host.start().catch(function (err) { console.warn('[LivePolling HostPanel] start failed', err); });
      // Tier-1 presence marker: student shells gate guest joins on an
      // actually-listening host (see GuestOverlay's hostActive prop) instead
      // of dialing a closed panel on a retry loop. hostOpenedAt doubles as a
      // nonce that re-arms dormant guests' retry budget on panel reopen.
      const presenceRef = sessionDocRef(sessionCode);
      const presenceWriter = (typeof window !== 'undefined') && window.__alloWriteToSession;
      if (presenceRef && typeof presenceWriter === 'function') {
        presenceWriter(presenceRef, { livePolling: { hostActive: true, hostOpenedAt: Date.now() } }).catch(function () {});
      }
      return function () {
        if (transportGenerationRef.current === transportGeneration) {
          transportGenerationRef.current += 1;
        }
        if (presenceRef && typeof presenceWriter === 'function') {
          presenceWriter(presenceRef, { livePolling: { hostActive: false } }).catch(function () {});
        }
        host.stop();
        if (hostRef.current === host) hostRef.current = null;
      };
    }, [hostTransportActive, sessionCode]);

    // Keep the roster gate current as students join without recreating the
    // host (which would tear down every peer connection). undefined prop
    // (older shells) leaves the gate off — legacy allow-all.
    R.useEffect(function () {
      if (!hostRef.current || typeof hostRef.current.setAllowedUids !== 'function') return;
      hostRef.current.setAllowedUids(allowedUidValues);
      if (allowedUidValues == null) return;
      const allowed = new Set(allowedUidValues);
      setGuests(function (prev) {
        const next = prev.filter(function (g) { return g && allowed.has(String(g.uid)); });
        return next.length === prev.length ? prev : next;
      });
      const retainedAudienceUids = activeParticipantUids.filter(function (uid) { return allowed.has(String(uid)); });
      const audienceWasPruned = retainedAudienceUids.length !== activeParticipantUids.length;
      setActiveParticipantUids(function (prev) {
        const next = prev.filter(function (uid) { return allowed.has(String(uid)); });
        return next.length === prev.length ? prev : next;
      });
      if (audienceWasPruned && peerShowcaseRound) {
        if (hostRef.current && typeof hostRef.current.closePeerShowcase === 'function') {
          hostRef.current.closePeerShowcase(peerShowcaseRound.roundId);
        }
        setPeerShowcaseRound(null);
      }
      if (audienceWasPruned && lastSharedResultsAt && activePoll && !isFeedbackPoll(activePoll) && hostRef.current) {
        const eligibleResponses = uniqueResponsesForSummary(filterLivePollingResponsesToAudience(
          responses[activePoll.id] || [],
          retainedAudienceUids
        ));
        const summary = buildPollResultsSummary(activePoll, eligibleResponses, retainedAudienceUids.length, {
          wordCloudModeration: wordCloudModerationByPoll[activePoll.id] || {}
        });
        hostRef.current.broadcastPollResults(activePoll.id, summary);
      }
    }, [allowedUidsSignature]);

    R.useEffect(function () {
      if (hostRef.current && typeof hostRef.current.setSessionQaEnabled === 'function') {
        hostRef.current.setSessionQaEnabled(sessionQaOptIn);
      } else if (!isOpen) {
        setSessionQaState(createSessionQaState({ enabled: sessionQaOptIn }));
      }
    }, [sessionQaOptIn, isOpen]);

    const addRule = function () {
      const defaultPred = pollType === 'mcq' ? 'eq' : 'lte';
      const ratingScale = buildRatingScale(ratingMin, ratingMax, ratingLabels);
      const defaultValue = pollType === 'mcq'
        ? (pollOptions.split('\n').map(function (s) { return s.trim(); }).filter(Boolean)[0] || '')
        : Math.min(ratingScale.max, Math.max(ratingScale.min, Math.round((ratingScale.min + ratingScale.max) / 2)));
      setComposerRules(function (prev) { return prev.concat([{
        id: 'rule-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        when: { predicate: defaultPred, value: defaultValue },
        then: { groupId: (routingGroups[0] && routingGroups[0].id) || '' }
      }]); });
    };
    const removeRule = function (id) {
      setComposerRules(function (prev) { return prev.filter(function (r) { return r.id !== id; }); });
    };
    const updateRule = function (id, patch) {
      setComposerRules(function (prev) { return prev.map(function (r) {
        if (r.id !== id) return r;
        return Object.assign({}, r, patch.when ? { when: Object.assign({}, r.when, patch.when) } : {},
          patch.then ? { then: Object.assign({}, r.then, patch.then) } : {});
      }); });
    };
    const commitGroup = function (name) {
      const id = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      setCreatedGroups(function (prev) { return prev.concat([{ id: id, name: name }]); });
      setNewGroupName('');
      // Mirror to session doc so other AlloFlow features (BridgeSendModal,
      // roster panel) can address this group. Tier-1: 'name' is allowlisted.
      const ref = sessionDocRef(sessionCode);
      const writer = (typeof window !== 'undefined') && window.__alloWriteToSession;
      if (ref && typeof writer === 'function') {
        writer(ref, { ['groups.' + id + '.name']: name }).catch(function () {});
      }
    };
    const addGroup = function () {
      const name = newGroupName.trim();
      if (!name) return;
      if (isAbilityTieredName(name)) {
        setPendingGroupName(name);
        return;
      }
      commitGroup(name);
    };
    const cancelPendingGroupName = function () {
      setPendingGroupName(null);
    };
    const confirmPendingGroupName = function () {
      const name = pendingGroupName;
      setPendingGroupName(null);
      if (name) commitGroup(name);
    };

    const activatePollForAudience = function (poll, audienceUids) {
      if (!hostRef.current || !poll || !Array.isArray(audienceUids) || audienceUids.length === 0) return false;
      activePollRef.current = poll;
      routingByPollRef.current = Object.assign({}, routingByPollRef.current, { [poll.id]: {} });
      hostRef.current.broadcastPoll(poll, audienceUids);
      setActiveParticipantUids(audienceUids);
      setActivePoll(poll);
      setCheckInsByUid({});
      setResponses(function (prev) { const n = Object.assign({}, prev); n[poll.id] = []; return n; });
      setRoutingByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setWordCloudModerationByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setWordCloudAliasesByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setFreeTextModerationByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setWordCloudClusterSuggestions([]); setWordCloudClusterBusy(false); setWordCloudClusterNotice('');
      setPeerShowcaseRound(null);
      setPeerVotesByRound({});
      setResponseStatusByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setFeedbackByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setFeedbackBusyByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setLastSharedResultsAt(null);
      setComposerExpanded(false);
      if (typeof setTimeout === 'function') setTimeout(function () { jumpToLiveWorkspaceSection('active'); }, 0);
      return true;
    };
    const broadcast = function () {
      if (!hostRef.current || !composerValidation.ready) {
        if (activePoll) jumpToLiveWorkspaceSection('active');
        return;
      }
      const validRules = selectLivePollingRoutingRules(composerRules, routingGroups);
      const startedAt = Date.now();
      const poll = {
        id: 'poll-' + startedAt,
        startedAt: startedAt,
        type: pollType,
        prompt: composerValidation.prompt,
        options: pollType === 'mcq'
          ? composerValidation.options
          : null,
        routingRules: (pollType === 'rating' || pollType === 'mcq') ? validRules : [],
        scale: pollType === 'rating' ? buildRatingScale(ratingMin, ratingMax, ratingLabels) : null,
        afterSubmitMode: (pollType === 'freetext' && feedbackEnabled) || pollType === 'wordcloud' ? 'wait' : afterSubmitMode,
        feedback: {
          enabled: pollType === 'freetext' && feedbackEnabled,
          criteria: normalizeBoundedText(feedbackCriteria, FEEDBACK_CRITERIA_MAX_LENGTH),
          maxAttempts: 2,
        },
      };
      const audienceUids = resolveLivePollingAudienceUids(
        guests,
        roster,
        audienceMode,
        audienceId,
        routingGroups
      );
      if (audienceUids.length === 0) return;
      activatePollForAudience(poll, audienceUids);
    };
    const closePoll = function (closePanelAfter) {
      if (!hostRef.current || !activePoll) return;
      const closedAt = Date.now();
      const responsesForPoll = uniqueResponsesForSummary(responses[activePoll.id] || []);
      const audienceUidsForPoll = activeParticipantUids.slice();
      setCompletedPolls(function (prev) {
        const next = prev.filter(function (entry) { return entry && entry.poll && entry.poll.id !== activePoll.id; });
        return next.concat([{ poll: activePoll, responses: responsesForPoll, audienceCount: audienceUidsForPoll.length, audienceUids: audienceUidsForPoll, startedAt: activePoll.startedAt, endedAt: closedAt }]).slice(-100);
      });
      hostRef.current.closePoll(activePoll.id);
      activePollRef.current = null;
      routingByPollRef.current = {};
      setActivePoll(null);
      setCheckInsByUid({});
      setPeerShowcaseRound(null);
      setActiveParticipantUids([]);
      setComposerExpanded(true);
      setPendingEndAction(null);
      if (closePanelAfter && typeof setTimeout === 'function') setTimeout(onClose, 0);
    };
    const requestClosePoll = function () {
      if (!activePoll) return;
      setPendingEndAction('poll');
    };
    const requestPanelClose = function () {
      if (activePoll) setPendingEndAction('panel');
      else onClose();
    };
    const closeStudentActivityDetail = function () { setSelectedStudentActivityUid(null); };
    const cancelPendingEnd = function () { setPendingEndAction(null); };
    const confirmPendingEnd = function () {
      const closePanelAfter = pendingEndAction === 'panel';
      if (!activePoll) {
        setPendingEndAction(null);
        if (closePanelAfter) onClose();
        return;
      }
      closePoll(closePanelAfter);
    };
    const reuseCompletedPoll = function (entry) {
      if (activePoll || !entry || !entry.poll) return;
      const poll = entry.poll;
      const type = ['rating', 'mcq', 'freetext', 'wordcloud'].indexOf(poll.type) >= 0 ? poll.type : 'rating';
      setPollType(type);
      setPollPrompt(normalizeBoundedText(poll.prompt, LIVE_POLL_PROMPT_MAX_LENGTH));
      if (type === 'mcq') setPollOptions(normalizeLivePollChoices(poll.options || []).join('\n'));
      if (type === 'rating') {
        const scale = normalizeRatingScale(poll);
        setRatingMin(scale.min);
        setRatingMax(scale.max);
        setRatingLabels(Object.keys(scale.labels).map(function (key) { return key + ' = ' + scale.labels[key]; }).join('\n'));
      }
      const feedback = normalizeFeedbackConfig(poll);
      setFeedbackEnabled(feedback.enabled);
      setFeedbackCriteria(feedback.criteria || '');
      setAfterSubmitMode(poll.afterSubmitMode === 'wait' ? 'wait' : 'dismiss');
      setAudienceMode('class');
      setAudienceId('');
      setComposerExpanded(true);
      jumpToLiveWorkspaceSection('create');
    };
    const relaunchCompletedPollForIncomplete = function (entry) {
      if (activePoll || !entry || !entry.poll || !hostRef.current) return false;
      const answered = new Set(uniqueResponsesForSummary(entry.responses || []).map(function (row) { return String(row && row.uid || ''); }).filter(Boolean));
      const connected = new Set(guests.map(function (guest) { return String(guest && guest.uid || ''); }).filter(Boolean));
      const incompleteUids = (Array.isArray(entry.audienceUids) ? entry.audienceUids : []).map(String).filter(function (uid) {
        return uid && !answered.has(uid) && connected.has(uid);
      });
      if (!incompleteUids.length) return false;
      const startedAt = Date.now();
      const poll = Object.assign({}, entry.poll, {
        id: 'poll-' + startedAt,
        startedAt: startedAt,
        submissionsLocked: false,
        relaunchOf: String(entry.poll.id || '').slice(0, LIVE_CHECK_IN_ID_MAX_LENGTH),
      });
      return activatePollForAudience(poll, incompleteUids);
    };

    const currentAlloSheetSnapshot = function () {
      if (!activePoll) return null;
      return { poll: activePoll, responses: uniqueResponsesForSummary(responses[activePoll.id] || []), audienceCount: activeParticipantUids.length, audienceUids: activeParticipantUids.slice(), startedAt: activePoll.startedAt, endedAt: Date.now() };
    };
    const openAlloSheetReview = function () {
      if (!activePoll && completedPolls.length === 0) return;
      setAlloSheetFeedback({ kind: '', text: '' });
      setAlloSheetReviewOpen(true);
    };
    const closeAlloSheetReview = function () {
      if (alloSheetBusy) return;
      setAlloSheetReviewOpen(false);
      setAlloSheetFeedback({ kind: '', text: '' });
    };
    const toggleAlloSheetDataset = function (key) {
      setAlloSheetDatasets(function (prev) { return Object.assign({}, prev, { [key]: !prev[key] }); });
    };
    const transferAlloSheetReview = function () {
      if (alloSheetBusy || typeof props.onOpenAlloSheet !== 'function') return;
      const current = currentAlloSheetSnapshot();
      const snapshots = completedPolls.slice();
      if (current && !snapshots.some(function (entry) { return entry && entry.poll && entry.poll.id === current.poll.id; })) snapshots.push(current);
      const envelope = buildLivePollingAlloSheetEnvelope({ sessionCode: sessionCode, polls: snapshots, sessionStartedAt: snapshots[0] && snapshots[0].startedAt, sessionEndedAt: Date.now() }, { includeChoiceLabels: alloSheetIncludeChoiceLabels, datasets: alloSheetDatasets, createdAt: new Date().toISOString() });
      if (!envelope.tables.some(function (table) { return table.rowCount > 0; })) {
        setAlloSheetFeedback({ kind: 'error', text: tr('No completed poll data matches this review.') });
        return;
      }
      setAlloSheetBusy(true);
      setAlloSheetFeedback({ kind: 'status', text: tr('Opening the reviewed aggregate tables in AlloSheet...') });
      try {
        const pending = props.onOpenAlloSheet(envelope);
        if (pending === false || pending == null) throw new Error(tr('AlloSheet could not open. Allow pop-ups and try again.'));
        Promise.resolve(pending).then(function () {
          setAlloSheetReviewOpen(false);
          setAlloSheetFeedback({ kind: '', text: '' });
        }).catch(function (error) {
          setAlloSheetFeedback({ kind: 'error', text: error && error.message ? error.message : tr('AlloSheet could not finish the review.') });
        }).finally(function () { setAlloSheetBusy(false); });
      } catch (error) {
        setAlloSheetFeedback({ kind: 'error', text: error && error.message ? error.message : tr('AlloSheet could not open these tables.') });
        setAlloSheetBusy(false);
      }
    };

    const setWordCloudCollectionLocked = function (locked) {
      if (!hostRef.current || !activePoll || activePoll.type !== 'wordcloud') return false;
      const nextPoll = Object.assign({}, activePoll, { submissionsLocked: !!locked });
      activePollRef.current = nextPoll;
      hostRef.current.broadcastPoll(nextPoll, activeParticipantUids);
      setActivePoll(nextPoll);
      return true;
    };
    const shareResults = function () {
      if (!hostRef.current || !activePoll || isFeedbackPoll(activePoll)) return;
      if (activePoll.type === 'wordcloud' && activePoll.submissionsLocked !== true) setWordCloudCollectionLocked(true);
      const eligibleResponses = uniqueResponsesForSummary(filterLivePollingResponsesToAudience(
        responses[activePoll.id] || [],
        activeParticipantUids
      ));
      const summary = buildPollResultsSummary(activePoll, eligibleResponses, activeParticipantUids.length, {
        wordCloudModeration: wordCloudModerationByPoll[activePoll.id] || {},
        wordCloudAliases: wordCloudAliasesByPoll[activePoll.id] || {}
      });
      hostRef.current.broadcastPollResults(activePoll.id, summary);
      setLastSharedResultsAt(Date.now());
    };
    const groupNameById = function (id) {
      const g = routingGroups.find(function (x) { return x.id === id; });
      return g ? g.name : id;
    };

    // Publish a bounded status/count snapshot to the presentation coordinator.
    // The callback receives no prompt, response, codename, feedback, or routing
    // rule content. The LiveLessonRun sanitizer is the second allowlist boundary.
    R.useEffect(function () {
      if (!onActivitySnapshot) return;
      const closePriorSnapshot = function () {
        const prior = lastActivitySnapshotRef.current;
        if (!prior || prior.phase === 'closed' || prior.phase === 'revealed') return;
        const closed = Object.assign({}, prior, {
          phase: 'closed',
          updatedAt: Date.now(),
          endedAt: Date.now(),
        });
        lastActivitySnapshotRef.current = closed;
        onActivitySnapshot(closed);
      };

      const snapshotSessionChanged = activitySnapshotSessionRef.current !== sessionCode;
      activitySnapshotSessionRef.current = sessionCode;
      if (!hostTransportActive || snapshotSessionChanged || !activePoll) {
        if (!hostTransportActive || snapshotSessionChanged) {
          closePriorSnapshot();
          return;
        }
        const qaSnapshot = buildSessionQaActivitySnapshot(sessionQaState, guests, sessionCode);
        if (qaSnapshot) {
          const prior = lastActivitySnapshotRef.current;
          if (prior && prior.activityId !== qaSnapshot.activityId) closePriorSnapshot();
          lastActivitySnapshotRef.current = qaSnapshot;
          onActivitySnapshot(qaSnapshot);
          return;
        }
        closePriorSnapshot();
        return;
      }

      const audienceUids = activeParticipantUids.slice();
      const responseEntries = uniqueResponsesForSummary(filterLivePollingResponsesToAudience(
        responses[activePoll.id] || [],
        audienceUids
      ));
      const feedbackConfig = normalizeFeedbackConfig(activePoll);
      const responseStatuses = responseStatusByPoll[activePoll.id] || {};
      const feedbackRecords = feedbackByPoll[activePoll.id] || {};
      const participantStatus = {};
      audienceUids.forEach(function (uid) {
        const entry = responseEntries.find(function (item) { return item.uid === uid; });
        if (entry && feedbackConfig.enabled && clampInt(entry.attempt, 1, 1, 2) > 1) {
          participantStatus[uid] = 'revised';
        } else if (entry) {
          participantStatus[uid] = 'submitted';
        } else {
          const status = responseStatuses[uid];
          participantStatus[uid] = status === 'drafting' || status === 'editing' ? 'working' : 'waiting';
        }
      });

      const moderation = wordCloudModerationByPoll[activePoll.id] || {};
      const aliases = wordCloudAliasesByPoll[activePoll.id] || {};
      const wordCloudItems = activePoll.type === 'wordcloud'
        ? buildWordCloudItems(responseEntries, moderation, aliases)
        : [];
      const moderationCounts = wordCloudItems.reduce(function (out, item) {
        out[item.status] = (out[item.status] || 0) + item.count;
        return out;
      }, { approved: 0, hidden: 0, pending: 0 });
      const feedbackSent = audienceUids.filter(function (uid) {
        const record = feedbackRecords[uid];
        return record && record.status === 'sent';
      }).length;
      const submitted = Object.values(participantStatus).filter(function (status) {
        return status === 'submitted' || status === 'revised';
      }).length;
      let phase = lastSharedResultsAt ? 'revealed' : 'collecting';
      if (peerShowcaseRound && (peerShowcaseRound.phase === 'results' || peerShowcaseRound.phase === 'dismissed')) {
        phase = 'revealed';
      } else if (peerShowcaseRound && peerShowcaseRound.phase === 'voting') {
        phase = 'review';
      } else if (!lastSharedResultsAt && feedbackConfig.enabled && (feedbackSent > 0 || (audienceUids.length > 0 && submitted === audienceUids.length))) {
        phase = 'review';
      } else if (!lastSharedResultsAt && activePoll.type === 'wordcloud' && responseEntries.length > 0) {
        phase = 'review';
      } else if (!lastSharedResultsAt && activePoll.type === 'freetext' && responseEntries.length > 0) {
        phase = 'review';
      }
      const kind = feedbackConfig.enabled
        ? 'feedback_response'
        : activePoll.type === 'mcq'
          ? 'multiple_choice'
          : activePoll.type === 'freetext'
            ? 'free_text'
            : activePoll.type === 'wordcloud'
              ? 'word_cloud'
              : 'rating';
      const snapshot = {
        activityId: activePoll.id,
        family: 'polling',
        kind: kind,
        phase: phase,
        audienceUids: audienceUids,
        participantStatus: participantStatus,
        counts: {
          connected: guests.filter(function (guest) { return audienceUids.indexOf(guest.uid) >= 0; }).length,
          approved: moderationCounts.approved || 0,
          hidden: moderationCounts.hidden || 0,
          revealed: lastSharedResultsAt || (peerShowcaseRound && (peerShowcaseRound.phase === 'results' || peerShowcaseRound.phase === 'dismissed')) ? 1 : 0,
          feedbackSent: feedbackSent,
          showcased: peerShowcaseRound && Array.isArray(peerShowcaseRound.candidates) ? peerShowcaseRound.candidates.length : 0,
          votesCast: peerShowcaseRound && peerVotesByRound[peerShowcaseRound.roundId]
            ? Object.keys(peerVotesByRound[peerShowcaseRound.roundId]).length
            : 0,
        },
        startedAt: activePoll.startedAt || 0,
        updatedAt: Date.now(),
        endedAt: (peerShowcaseRound && (peerShowcaseRound.phase === 'results' || peerShowcaseRound.phase === 'dismissed') && peerShowcaseRound.results && peerShowcaseRound.results.closedAt)
          || lastSharedResultsAt
          || 0,
      };
      lastActivitySnapshotRef.current = snapshot;
      onActivitySnapshot(snapshot);
    }, [hostTransportActive, sessionCode, activePoll, activeParticipantUids, guests, responses, responseStatusByPoll, feedbackByPoll, wordCloudModerationByPoll, wordCloudAliasesByPoll, freeTextModerationByPoll, peerShowcaseRound, peerVotesByRound, lastSharedResultsAt, sessionQaState, onActivitySnapshot]);

    useLivePollingDialogFocus(hostDialogRef, isOpen, requestPanelClose, hostCloseRef);
    useLivePollingDialogFocus(alloSheetDialogRef, alloSheetReviewOpen, closeAlloSheetReview, alloSheetInitialRef);
    useLivePollingDialogFocus(groupNameDialogRef, pendingGroupName !== null, cancelPendingGroupName, groupNameCancelRef);
    useLivePollingDialogFocus(endPollDialogRef, pendingEndAction !== null, cancelPendingEnd, endPollCancelRef);
    useLivePollingDialogFocus(studentActivityDialogRef, selectedStudentActivityUid !== null, closeStudentActivityDetail, studentActivityCloseRef);

    if (!isOpen) return null;
    const activeParticipantUidSet = new Set(activeParticipantUids.map(function (uid) { return String(uid); }));
    const activeResponses = filterLivePollingResponsesToAudience(
      (activePoll && responses[activePoll.id]) || [],
      activeParticipantUids
    );
    const uniqueActiveResponses = uniqueResponsesForSummary(activeResponses);
    const activeResponseUidSet = new Set(uniqueActiveResponses.map(function (row) { return String(row && row.uid || ''); }).filter(Boolean));
    const activeIncompleteUids = activeParticipantUids.map(String).filter(function (uid) { return !activeResponseUidSet.has(uid); });
    const activeFeedbackConfig = normalizeFeedbackConfig(activePoll);
    const responseGoalBase = activeParticipantUids.length;
    const responseGoal = Math.max(responseGoalBase, uniqueActiveResponses.length, 1);
    const responsePercent = activePoll ? Math.min(100, Math.round((uniqueActiveResponses.length / responseGoal) * 100)) : 0;
    const activeWordCloudModeration = activePoll ? (wordCloudModerationByPoll[activePoll.id] || {}) : {};
    const activeWordCloudAliases = activePoll ? (wordCloudAliasesByPoll[activePoll.id] || {}) : {};
    const wordCloudTermsForActive = activePoll && activePoll.type === 'wordcloud'
      ? buildWordCloudItems(uniqueActiveResponses, activeWordCloudModeration, activeWordCloudAliases)
      : [];
    const visibleWordCloudTerms = filterWordCloudModerationItems(wordCloudTermsForActive, {
      status: wordCloudModerationFilter,
      query: wordCloudModerationQuery,
    });
    const visiblePendingWordCloudTerms = visibleWordCloudTerms.filter(function (item) { return item.status === 'pending'; });
    const summaryForActive = activePoll ? buildPollResultsSummary(activePoll, uniqueActiveResponses, activeParticipantUids.length, {
      wordCloudModeration: activeWordCloudModeration,
      wordCloudAliases: activeWordCloudAliases
    }) : null;
    const canShareActiveResults = !!(!activeFeedbackConfig.enabled && summaryForActive && (
      activePoll.type === 'wordcloud'
        ? summaryForActive.items.length > 0
        : uniqueActiveResponses.length > 0
    ));
    const feedbackStatusForActive = activePoll ? (responseStatusByPoll[activePoll.id] || {}) : {};
    const feedbackForActive = activePoll ? (feedbackByPoll[activePoll.id] || {}) : {};
    const feedbackBusyForActive = activePoll ? (feedbackBusyByPoll[activePoll.id] || {}) : {};
    const feedbackParticipants = activeFeedbackConfig.enabled ? activeParticipantUids.map(function (uid) {
      const guest = guests.find(function (entry) { return entry.uid === uid; }) || {};
      const rosterEntry = roster[uid] || {};
      const groupId = rosterEntry.groupId || null;
      const group = groupId && sessionGroups[groupId];
      return {
        uid: uid,
        codename: guest.codename || rosterEntry.name || 'Student',
        groupId: groupId,
        groupName: group ? (group.name || groupId) : groupId,
        status: feedbackStatusForActive[uid] || 'waiting',
        responseEntry: activeResponses.find(function (entry) { return entry.uid === uid; }) || null,
      };
    }) : [];
    const rawStudentActivityRows = buildLiveStudentActivityRows({
      roster: roster,
      guests: guests,
      groups: sessionGroups,
      resources: resources,
      activitySnapshots: activitySnapshots,
      activePoll: activePoll,
      activeParticipantUids: activeParticipantUids,
      responses: activeResponses,
      responseStatuses: feedbackStatusForActive,
      now: healthNow,
    });
    const sessionSupportActivityId = buildLiveSessionSupportActivityId(sessionCode);
    const currentSupportActivityId = activePoll ? activePoll.id : sessionSupportActivityId;
    const studentActivityRows = rawStudentActivityRows.map(function (row) {
      const signal = checkInsByUid[row.uid];
      const signalMatches = !!(signal && signal.activityId === currentSupportActivityId);
      const supportStatus = signalMatches && signal.status === 'help' ? 'help' : '';
      if (!signalMatches) return row;
      const supportUpdatedAt = normalizeLiveActivityTimestamp(signal.acknowledgedAt || signal.sentAt);
      const lastSignalAt = Math.max(row.lastSignalAt || 0, supportUpdatedAt);
      const liveSignal = classifyLiveStudentSignal({ now: healthNow, directConnected: row.directConnected, lastSeenAt: row.lastSeenAt, lastSignalAt: lastSignalAt });
      return Object.assign({}, row, {
        supportStatus: supportStatus,
        supportUpdatedAt: supportUpdatedAt,
        lastSignalAt: lastSignalAt,
        signalStatus: liveSignal.signalStatus,
        signalAgeMs: liveSignal.signalAgeMs,
        sessionPresent: liveSignal.sessionPresent,
      });
    });
    const studentActivityCounts = studentActivityRows.reduce(function (out, row) {
      out[row.status] = (out[row.status] || 0) + 1;
      return out;
    }, {});
    const studentActivitySummary = summarizeLiveStudentActivityRows(studentActivityRows);
    const studentEngagementSummary = summarizeLiveStudentEngagementRows(studentActivityRows);
    const visibleStudentActivityRows = filterLiveStudentActivityRows(studentActivityRows, {
      filter: studentActivityFilter,
      sort: studentActivitySort,
      query: studentActivityQuery,
      groups: sessionGroups,
    });
    const selectedStudentActivityRow = selectedStudentActivityUid === null ? null : studentActivityRows.find(function (row) { return String(row.uid) === String(selectedStudentActivityUid); }) || null;
    const selectedStudentActivityDetail = buildLiveStudentActivityDetail(selectedStudentActivityRow, {
      groups: sessionGroups,
      activitySnapshots: activitySnapshots,
      checkIn: selectedStudentActivityRow ? checkInsByUid[selectedStudentActivityRow.uid] : null,
      now: healthNow,
    });
    const externalTeacherActionState = normalizeLiveTeacherActionStateMap(props.teacherActionState, healthNow);
    const effectiveTeacherActionState = Object.assign({}, reviewedActionKeys, externalTeacherActionState);
    const teacherActionQueue = buildLiveTeacherActionQueue(studentActivityRows, effectiveTeacherActionState, healthNow);
    const reviewedActionCount = Object.keys(effectiveTeacherActionState).filter(function (key) { return normalizeLiveTeacherActionState(effectiveTeacherActionState[key], healthNow).status === 'resolved'; }).length;
    const teacherActionCounts = teacherActionQueue.reduce(function (counts, item) {
      counts[item.reason] = (counts[item.reason] || 0) + 1;
      return counts;
    }, {});
    const trace = Array.isArray(props.sessionSyncTrace)
      ? props.sessionSyncTrace
      : ((typeof window !== 'undefined' && Array.isArray(window.__alloSessionSyncTrace)) ? window.__alloSessionSyncTrace : []);
    const transportHealth = buildLiveTransportHealth({
      transportKind: transportKind,
      connectedCount: guests.length,
      expectedCount: Object.keys(roster).length,
      trace: trace,
      now: healthNow,
    });
    const sessionWrapUp = buildLiveSessionWrapUp({
      completedPolls: completedPolls,
      activePoll: activePoll,
      activeResponses: uniqueActiveResponses,
      activeParticipantUids: activeParticipantUids,
      activitySnapshots: activitySnapshots,
      actionQueue: teacherActionQueue,
      sessionQaState: sessionQaState,
      sessionStartedAt: sessionStartedAt,
      now: healthNow,
    });
    const sendTeacherCheckIn = function (row) {
      if (!row || !hostRef.current || typeof hostRef.current.sendCheckIn !== 'function') return;
      if (!row.connected || (activePoll && !activeParticipantUidSet.has(String(row.uid)))) return;
      const packet = hostRef.current.sendCheckIn(row.uid, currentSupportActivityId);
      if (!packet) return;
      setCheckInsByUid(function (prev) {
        return Object.assign({}, prev, { [row.uid]: Object.assign({}, packet, { status: 'sent' }) });
      });
    };
    const updateTeacherActionState = function (item, status, snoozedUntil) {
      if (!item || !item.key) return;
      setReviewedActionKeys(function (prev) {
        const next = Object.assign({}, prev);
        if (status === 'open') delete next[item.key];
        else next[item.key] = normalizeLiveTeacherActionState({ status: status, updatedAt: Date.now(), snoozedUntil: snoozedUntil || 0 });
        return next;
      });
    };
    const markTeacherActionReviewed = function (item) {
      updateTeacherActionState(item, 'resolved');
    };
    const focusTeacherActionStudents = function (item) {
      if (!item) return;
      setStudentActivityExpanded(true);
      setSelectedStudentActivityUid(String(item.uid));
    };
    const sendTeacherActionResource = async function (item) {
      if (!item || !onSendToStudent || !followUpResourceId || actionQueueBusyUid) return;
      setActionQueueBusyUid(item.uid);
      setActionQueueNotice({ kind: '', text: '' });
      try {
        const result = await Promise.resolve(onSendToStudent(item.uid, followUpResourceId));
        if (result && result.pendingConfirmation) {
          setActionQueueNotice({ kind: 'info', text: tr('Complete the resource confirmation, then return to this queue.') });
          return;
        }
        if (result === false || (result && typeof result === 'object' && Number(result.failed) > 0 && Number(result.sent) < 1)) throw new Error('delivery rejected');
        markTeacherActionReviewed(item);
        setActionQueueNotice({ kind: 'success', text: tr('Resource sent to') + ' ' + item.name + '.' });
      } catch (err) {
        setActionQueueNotice({ kind: 'error', text: tr('The resource could not be sent. Check the session connection and try again.') });
      } finally {
        setActionQueueBusyUid('');
      }
    };
    const sendCheckInToIncomplete = function () {
      let sent = 0;
      activeIncompleteUids.forEach(function (uid) {
        const row = studentActivityRows.find(function (entry) { return entry.uid === uid; });
        if (row && row.connected) { sendTeacherCheckIn(row); sent += 1; }
      });
      setActionQueueNotice({ kind: sent ? 'success' : 'error', text: sent ? tr('Check-in sent to') + ' ' + sent + ' ' + tr(sent === 1 ? 'student.' : 'students.') : tr('No incomplete students are currently connected.') });
    };
    const sendResourceToIncomplete = async function () {
      if (!followUpResourceId || !activeIncompleteUids.length || actionQueueBusyUid) return;
      setActionQueueBusyUid('__incomplete__');
      setActionQueueNotice({ kind: '', text: '' });
      try {
        let result;
        if (onSendToStudents) result = await Promise.resolve(onSendToStudents(activeIncompleteUids, followUpResourceId));
        else if (onSendToStudent) result = await Promise.all(activeIncompleteUids.map(function (uid) { return Promise.resolve(onSendToStudent(uid, followUpResourceId)); }));
        else throw new Error('delivery unavailable');
        if (result && result.pendingConfirmation) {
          setActionQueueNotice({ kind: 'info', text: tr('Complete the resource confirmation, then return to this follow-up.') });
          return;
        }
        if (result === false || (Array.isArray(result) && result.some(function (item) { return item === false || (item && Number(item.failed) > 0); })) || (result && !Array.isArray(result) && Number(result.failed) > 0)) throw new Error('delivery rejected');
        setActionQueueNotice({ kind: 'success', text: tr('Resource sent to incomplete students.') });
      } catch (err) {
        setActionQueueNotice({ kind: 'error', text: tr('The resource could not be sent to every incomplete student. Review connection status and retry.') });
      } finally { setActionQueueBusyUid(''); }
    };
    const jumpToLiveWorkspaceSection = function (sectionId) {
      if (!sectionId || !hostDialogRef.current) return;
      if (sectionId === 'students') setStudentActivityExpanded(true);
      if (sectionId === 'create') setComposerExpanded(true);
      const root = hostDialogRef.current;
      const focusSection = function () {
        const target = root.querySelector('[data-live-workspace-section="' + sectionId + '"]');
        if (!target) return;
        let reducedMotion = false;
        try { reducedMotion = !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) {}
        const toolbar = root.querySelector('[data-live-host-toolbar]');
        const toolbarOffset = toolbar && toolbar.getBoundingClientRect ? Math.ceil(toolbar.getBoundingClientRect().height) + 14 : 84;
        if (typeof root.scrollTo === 'function' && Number.isFinite(Number(target.offsetTop))) {
          try { root.scrollTo({ top: Math.max(0, Number(target.offsetTop) - toolbarOffset), behavior: reducedMotion ? 'auto' : 'smooth' }); } catch (err) {}
        } else if (typeof target.scrollIntoView === 'function') {
          try { target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }); } catch (err) { try { target.scrollIntoView(); } catch (scrollErr) {} }
        }
        try { target.focus({ preventScroll: true }); } catch (err) { try { target.focus(); } catch (focusErr) {} }
      };
      if (typeof setTimeout === 'function') setTimeout(focusSection, 0);
      else focusSection();
    };
    const wordCloudStatusCounts = wordCloudTermsForActive.reduce(function (out, item) {
      out[item.status] += item.count;
      return out;
    }, { pending: 0, approved: 0, hidden: 0 });
    const approvedWordCloudUniqueCount = wordCloudTermsForActive.filter(function (item) { return item.status === 'approved'; }).length;
    const setWordCloudTermStatus = function (key, status) {
      if (!activePoll || activePoll.type !== 'wordcloud' || !key) return;
      setWordCloudModerationByPoll(function (prev) {
        const next = Object.assign({}, prev);
        next[activePoll.id] = Object.assign({}, next[activePoll.id] || {}, { [key]: status });
        return next;
      });
      setLastSharedResultsAt(null);
    };
    const setVisiblePendingWordCloudTermsStatus = function (status) {
      if (!activePoll || activePoll.type !== 'wordcloud') return;
      if (status !== 'approved' && status !== 'hidden') return;
      setWordCloudModerationByPoll(function (prev) {
        const next = Object.assign({}, prev);
        const forPoll = Object.assign({}, next[activePoll.id] || {});
        visiblePendingWordCloudTerms.forEach(function (item) {
          forPoll[item.value] = status;
        });
        next[activePoll.id] = forPoll;
        return next;
      });
      setLastSharedResultsAt(null);
    };
    const renameWordCloudTerm = function (key) {
      if (!activePoll || activePoll.type !== 'wordcloud' || !key) return;
      const label = normalizeWordCloudTerm(wordCloudRenameDrafts[key]);
      if (!label) return;
      const targetKey = wordCloudTermKey(label);
      setWordCloudAliasesByPoll(function (prev) {
        const next = Object.assign({}, prev);
        next[activePoll.id] = Object.assign({}, next[activePoll.id] || {}, { [key]: label });
        return next;
      });
      setWordCloudModerationByPoll(function (prev) {
        const next = Object.assign({}, prev);
        const forPoll = Object.assign({}, next[activePoll.id] || {});
        if (forPoll[key] && !forPoll[targetKey]) forPoll[targetKey] = forPoll[key];
        next[activePoll.id] = forPoll;
        return next;
      });
      setLastSharedResultsAt(null);
    };
    const resetWordCloudAliases = function () {
      if (!activePoll || activePoll.type !== 'wordcloud') return;
      setWordCloudAliasesByPoll(function (prev) {
        const next = Object.assign({}, prev);
        delete next[activePoll.id];
        return next;
      });
      setWordCloudRenameDrafts({});
      setWordCloudClusterSuggestions([]);
      setWordCloudClusterNotice('');
      setLastSharedResultsAt(null);
    };
    const suggestWordCloudClusters = async function () {
      if (wordCloudClusterBusy || !activePoll || activePoll.type !== 'wordcloud' || activePoll.submissionsLocked !== true) return;
      const approvedItems = wordCloudTermsForActive.filter(function (item) { return item.status === 'approved'; });
      const prompt = buildWordCloudClusterPrompt(approvedItems);
      const generator = props.callGemini || ((typeof window !== 'undefined') && window.callGemini);
      if (!prompt || typeof generator !== 'function') {
        setWordCloudClusterNotice(tr('Approve at least two terms and connect an AI provider to suggest groups.'));
        return;
      }
      setWordCloudClusterBusy(true); setWordCloudClusterNotice(''); setWordCloudClusterSuggestions([]);
      try {
        const generated = await generator(prompt, false);
        const suggestions = parseWordCloudClusterSuggestions(generated, approvedItems);
        setWordCloudClusterSuggestions(suggestions);
        setWordCloudClusterNotice(suggestions.length ? tr('Review each suggested group before applying it.') : tr('No confident term groups were suggested.'));
      } catch (err) {
        setWordCloudClusterNotice(tr('Term grouping suggestions were unavailable. You can still rename and merge terms manually.'));
      } finally { setWordCloudClusterBusy(false); }
    };
    const applyWordCloudCluster = function (suggestion) {
      if (!activePoll || activePoll.type !== 'wordcloud') return;
      const patch = buildWordCloudAliasPatch(wordCloudTermsForActive, suggestion);
      if (Object.keys(patch).length < 2) return;
      setWordCloudAliasesByPoll(function (prev) {
        const next = Object.assign({}, prev);
        next[activePoll.id] = Object.assign({}, next[activePoll.id] || {}, patch);
        return next;
      });
      setWordCloudClusterSuggestions(function (prev) { return prev.filter(function (item) { return item.id !== suggestion.id; }); });
      setWordCloudClusterNotice(tr('Term group applied. Review the merged label before revealing.'));
      setLastSharedResultsAt(null);
    };
    const activeFreeTextModeration = activePoll ? (freeTextModerationByPoll[activePoll.id] || {}) : {};
    const peerShowcaseReviewRows = activePoll && activePoll.type === 'freetext' && !activeFeedbackConfig.enabled
      ? buildPeerShowcaseReviewRows(uniqueActiveResponses, activeFreeTextModeration)
      : [];
    const approvedPeerShowcaseRows = peerShowcaseReviewRows.filter(function (row) { return row.status === 'approved'; });
    const peerVotesForActiveRound = peerShowcaseRound
      ? (peerVotesByRound[peerShowcaseRound.roundId] || {})
      : {};
    const setFreeTextResponseStatus = function (uid, status) {
      if (!activePoll || activePoll.type !== 'freetext' || activeFeedbackConfig.enabled || !uid) return;
      const normalizedStatus = normalizePeerModerationStatus(status);
      if (normalizedStatus === 'approved') {
        const currentStatus = normalizePeerModerationStatus(activeFreeTextModeration[uid]);
        if (currentStatus !== 'approved' && approvedPeerShowcaseRows.length >= PEER_SHOWCASE_MAX_CANDIDATES) return;
      }
      setFreeTextModerationByPoll(function (prev) {
        const next = Object.assign({}, prev);
        next[activePoll.id] = Object.assign({}, next[activePoll.id] || {}, { [uid]: normalizedStatus });
        return next;
      });
    };
    const startPeerShowcase = function () {
      if (!activePoll || !hostRef.current || peerShowcaseRound || approvedPeerShowcaseRows.length < PEER_SHOWCASE_MIN_CANDIDATES) return;
      const round = buildPeerShowcaseRound({
        roundId: 'showcase-' + Date.now(),
        pollId: activePoll.id,
        prompt: activePoll.prompt,
        criterion: peerVoteCriterion,
        candidates: approvedPeerShowcaseRows.map(function (row) {
          return { ownerUid: row.uid, response: row.response };
        }),
      });
      if (!round) return;
      const opened = hostRef.current.openPeerShowcase(
        round,
        activeParticipantUids
      );
      if (!opened) return;
      setPeerVotesByRound(function (prev) {
        const next = Object.assign({}, prev);
        next[round.roundId] = {};
        return next;
      });
      setPeerShowcaseRound(Object.assign({}, round, { phase: 'voting', results: null }));
    };
    const finishPeerShowcase = function () {
      if (!hostRef.current || !peerShowcaseRound || peerShowcaseRound.phase !== 'voting') return;
      const results = hostRef.current.broadcastPeerVoteResults(peerShowcaseRound.roundId, peerVotesForActiveRound);
      if (results) setPeerShowcaseRound(Object.assign({}, peerShowcaseRound, { phase: 'results', results: results }));
    };
    const cancelPeerShowcase = function () {
      if (!hostRef.current || !peerShowcaseRound) return;
      hostRef.current.closePeerShowcase(peerShowcaseRound.roundId);
      setPeerShowcaseRound(peerShowcaseRound.phase === 'results'
        ? Object.assign({}, peerShowcaseRound, { phase: 'dismissed' })
        : null);
    };

    const updateFeedbackRecordForPoll = function (pollId, uid, patch) {
      if (!pollId || !uid) return;
      setFeedbackByPoll(function (prev) {
        const next = Object.assign({}, prev);
        const forPoll = Object.assign({}, next[pollId] || {});
        forPoll[uid] = Object.assign({}, forPoll[uid] || {}, patch);
        next[pollId] = forPoll;
        return next;
      });
    };
    const updateFeedbackRecord = function (uid, patch) {
      if (!activePoll) return;
      updateFeedbackRecordForPoll(activePoll.id, uid, patch);
    };
    const setFeedbackBusy = function (uid, busy) {
      if (!activePoll || !uid) return;
      setFeedbackBusyByPoll(function (prev) {
        const next = Object.assign({}, prev);
        next[activePoll.id] = Object.assign({}, next[activePoll.id] || {}, { [uid]: !!busy });
        return next;
      });
    };
    const generateFeedbackForUid = async function (uid) {
      if (!activePoll || !activeFeedbackConfig.enabled) return false;
      const feedbackPollId = activePoll.id;
      const entry = activeResponses.find(function (item) { return item.uid === uid; });
      if (!entry) return false;
      const generator = props.callGemini || ((typeof window !== 'undefined') && window.callGemini);
      if (typeof generator !== 'function') {
        updateFeedbackRecordForPoll(feedbackPollId, uid, { draft: '', status: 'error' });
        return false;
      }
      setFeedbackBusy(uid, true);
      try {
        const prompt = buildFeedbackPrompt({
          prompt: activePoll.prompt,
          criteria: activeFeedbackConfig.criteria,
          response: entry.response,
          previousResponse: entry.attempts && entry.attempts.length > 1 ? entry.attempts[0].response : '',
          attempt: entry.attempt || 1,
        });
        const generated = await generator(prompt, false);
        const draft = normalizeBoundedText(generated, FEEDBACK_TEXT_MAX_LENGTH);
        if (!draft) throw new Error('Empty feedback');
        updateFeedbackRecordForPoll(feedbackPollId, uid, { draft: draft, status: 'draft', generatedAt: Date.now(), attempt: entry.attempt || 1 });
        return true;
      } catch (err) {
        console.warn('[LivePolling HostPanel] feedback generation failed:', err && err.message);
        updateFeedbackRecordForPoll(feedbackPollId, uid, { draft: '', status: 'error' });
        return false;
      } finally {
        setFeedbackBusy(uid, false);
      }
    };
    const generateAllFeedback = async function () {
      if (feedbackBulkBusy) return;
      setFeedbackBulkBusy(true);
      try {
        for (let i = 0; i < feedbackParticipants.length; i++) {
          if (feedbackParticipants[i].responseEntry) await generateFeedbackForUid(feedbackParticipants[i].uid);
        }
      } finally {
        setFeedbackBulkBusy(false);
      }
    };
    const changeFeedbackDraft = function (uid, value) {
      const draft = value == null ? '' : String(value).slice(0, FEEDBACK_TEXT_MAX_LENGTH);
      updateFeedbackRecord(uid, { draft: draft, status: 'draft' });
    };
    const sendFeedbackToUid = function (uid) {
      if (!activePoll || !hostRef.current) return;
      const entry = activeResponses.find(function (item) { return item.uid === uid; });
      const record = feedbackForActive[uid];
      if (!entry || !record || !record.draft) return;
      const attempt = clampInt(entry.attempt, 1, 1, activeFeedbackConfig.maxAttempts);
      const sent = hostRef.current.sendFeedback(uid, activePoll.id, {
        feedbackId: 'feedback-' + Date.now() + '-' + uid.slice(0, 12),
        text: record.draft,
        attempt: attempt,
        allowRevision: attempt < activeFeedbackConfig.maxAttempts,
      });
      if (sent) updateFeedbackRecord(uid, { status: 'sent', sentAt: Date.now(), attempt: attempt });
    };
    const sessionGroupEntries = routingGroups;
    const composerAudienceUids = resolveLivePollingAudienceUids(
      guests,
      roster,
      audienceMode,
      audienceId,
      sessionGroupEntries
    );
    const broadcastTargetCount = composerAudienceUids.length;
    const composerValidation = validateLivePollComposer({
      type: pollType,
      prompt: pollPrompt,
      options: pollOptions,
      audienceCount: broadcastTargetCount,
      activePoll: !!activePoll,
    });
    const broadcastDisabled = !composerValidation.ready;
    const composerValidationMessage = function (reason) {
      if (reason === 'active-poll') return tr('End the active poll before broadcasting another.');
      if (reason === 'prompt-required') return tr('Add a poll prompt.');
      if (reason === 'audience-required') return tr('Choose at least one connected student.');
      if (reason === 'mcq-options') return tr('Add at least two different choices.');
      return tr('Review the poll setup.');
    };
    const setSessionQaLocked = function (locked) {
      if (hostRef.current) hostRef.current.setSessionQaSubmissionsLocked(locked);
    };
    const moderateSessionQa = function (questionId, action) {
      if (hostRef.current) hostRef.current.setSessionQaQuestionStatus(questionId, action);
    };
    const featureSessionQa = function (questionId) {
      if (hostRef.current) hostRef.current.featureSessionQaQuestion(questionId);
    };

    const renderStudentActivityDetail = function () {
      if (selectedStudentActivityUid === null) return null;
      const detail = selectedStudentActivityDetail;
      const row = selectedStudentActivityRow;
      const signalStatus = detail && ['active', 'recent', 'quiet', 'offline'].indexOf(detail.signalStatus) >= 0 ? detail.signalStatus : 'unknown';
      const signalPresentation = {
        active: { label: tr('Active now'), color: '#166534', background: '#dcfce7' },
        recent: { label: tr('Recent signal'), color: '#0f766e', background: '#ccfbf1' },
        quiet: { label: tr('Quiet 3+ min'), color: '#92400e', background: '#fef3c7' },
        offline: { label: tr('Likely offline'), color: '#991b1b', background: '#fee2e2' },
        unknown: { label: tr('No signal yet'), color: '#475569', background: '#f1f5f9' },
      }[signalStatus];
      const directConnected = !!(detail && detail.directConnected);
      const currentCheckIn = row && checkInsByUid[row.uid];
      const checkInPending = !!(currentCheckIn && currentCheckIn.activityId === currentSupportActivityId && currentCheckIn.status === 'sent');
      const canCheckIn = !!(row && directConnected && (!activePoll || (activeParticipantUidSet.has(String(row.uid)) && ['submitted', 'revised', 'complete'].indexOf(row.status) < 0)));
      return ce('div', {
        role: 'presentation',
        onMouseDown: function (event) { if (event.target === event.currentTarget) closeStudentActivityDetail(); },
        style: { position: 'fixed', inset: 0, zIndex: 10004, background: 'rgba(15,23,42,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }
      },
        ce('div', {
          ref: studentActivityDialogRef,
          tabIndex: -1,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'live-student-detail-title',
          'aria-describedby': 'live-student-detail-privacy',
          style: { width: '100%', maxWidth: 860, maxHeight: 'calc(100dvh - 1.5rem)', overflowY: 'auto', boxSizing: 'border-box', background: 'white', borderRadius: 14, padding: '1.1rem', boxShadow: '0 24px 64px rgba(0,0,0,0.42)' }
        },
          ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 } },
            ce('div', { style: { minWidth: 0 } },
              ce('div', { style: { color: '#4338ca', fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em' } }, tr('Privacy-safe student activity view')),
              ce('h2', { id: 'live-student-detail-title', style: { margin: '0.18rem 0 0', color: '#0f172a', fontSize: '1.2rem', overflowWrap: 'anywhere' } }, detail ? detail.name : tr('Student unavailable')),
              detail && detail.groupName ? ce('span', { style: { display: 'block', marginTop: 2, color: '#64748b', fontSize: '0.72rem', fontWeight: 750 } }, detail.groupName) : null
            ),
            ce('button', { ref: studentActivityCloseRef, type: 'button', onClick: closeStudentActivityDetail, 'aria-label': tr('Close student activity view'), style: { minWidth: 44, minHeight: 44, border: '1px solid #cbd5e1', borderRadius: 7, background: 'white', color: '#334155', fontWeight: 850, cursor: 'pointer' } }, tr('Close'))
          ),
          ce('div', { id: 'live-student-detail-privacy', role: 'note', style: { marginTop: 10, padding: '0.65rem 0.75rem', border: '1px solid #c7d2fe', borderRadius: 8, background: '#eef2ff', color: '#3730a3', fontSize: '0.74rem', lineHeight: 1.45 } },
            ce('strong', null, tr('This is an activity view, not a live screen.')), ' ',
            tr('It shows only AlloFlow progress and session signals. Answer text, private drafts, and screen pixels are not captured.')
          ),
          detail ? ce(R.Fragment, null,
            ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 8, marginTop: 10 } },
              ce('section', { 'aria-label': tr('Student connection'), style: { padding: '0.65rem', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' } },
                ce('span', { style: { display: 'block', color: '#64748b', fontSize: '0.64rem', fontWeight: 850, textTransform: 'uppercase' } }, tr('Connection')),
                ce('strong', { style: { display: 'block', marginTop: 3, color: directConnected || detail.sessionPresent ? '#166534' : '#64748b', fontSize: '0.85rem' } }, directConnected ? tr('Direct live connection') : detail.sessionPresent ? tr('Present via session signal') : tr('No current presence signal'))
              ),
              ce('section', { 'aria-label': tr('Student activity signal'), style: { padding: '0.65rem', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' } },
                ce('span', { style: { display: 'block', color: '#64748b', fontSize: '0.64rem', fontWeight: 850, textTransform: 'uppercase' } }, tr('Activity signal')),
                ce('span', { style: { display: 'inline-block', marginTop: 4, padding: '0.2rem 0.45rem', borderRadius: 999, background: signalPresentation.background, color: signalPresentation.color, fontSize: '0.72rem', fontWeight: 900 } }, signalPresentation.label),
                detail.signalAgeMs !== null ? ce('span', { style: { display: 'block', marginTop: 3, color: '#64748b', fontSize: '0.65rem' } }, formatLiveElapsed(detail.signalAgeMs) + ' ' + tr('ago')) : null
              ),
              ce('section', { 'aria-label': tr('Student current activity'), style: { padding: '0.65rem', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' } },
                ce('span', { style: { display: 'block', color: '#64748b', fontSize: '0.64rem', fontWeight: 850, textTransform: 'uppercase' } }, tr('Current activity')),
                ce('strong', { style: { display: 'block', marginTop: 3, color: '#0f172a', fontSize: '0.82rem', overflowWrap: 'anywhere' } }, tr(detail.activity)),
                ce('span', { style: { display: 'block', marginTop: 2, color: '#475569', fontSize: '0.68rem', fontWeight: 800 } }, tr(detail.status))
              ),
              ce('section', { 'aria-label': tr('Student progress'), style: { padding: '0.65rem', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' } },
                ce('span', { style: { display: 'block', color: '#64748b', fontSize: '0.64rem', fontWeight: 850, textTransform: 'uppercase' } }, tr('Progress')),
                ce('strong', { style: { display: 'block', marginTop: 3, color: '#0f172a', fontSize: '0.85rem' } }, detail.progressDetail ? detail.progressDetail + ' ' + tr('completed') : tr(detail.status)),
                detail.progressPercent !== null ? ce('div', { role: 'progressbar', 'aria-label': tr('Activity completion'), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': detail.progressPercent, style: { height: 8, marginTop: 6, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' } }, ce('div', { style: { width: detail.progressPercent + '%', height: '100%', background: '#4f46e5' } })) : null
              )
            ),
            ce('section', { 'aria-labelledby': 'live-student-detail-timeline-title', style: { marginTop: 10, padding: '0.75rem', border: '1px solid #dbeafe', borderRadius: 9, background: '#f8fafc' } },
              ce('h3', { id: 'live-student-detail-timeline-title', style: { margin: 0, color: '#1e3a8a', fontSize: '0.86rem' } }, tr('Recent activity milestones')),
              ce('p', { style: { margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.66rem' } }, tr('Content-free status changes from this live session.')),
              detail.timeline.length ? ce('ol', { style: { margin: '0.65rem 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 } }, detail.timeline.map(function (item) {
                return ce('li', { key: item.id, style: { display: 'grid', gridTemplateColumns: 'minmax(88px, auto) 1fr', gap: 8, alignItems: 'start', padding: '0.48rem 0.55rem', border: '1px solid #e2e8f0', borderRadius: 7, background: 'white' } },
                  ce('time', { dateTime: new Date(item.at).toISOString(), style: { color: '#64748b', fontSize: '0.64rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' } }, formatLiveElapsed(Math.max(0, healthNow - item.at)) + ' ' + tr('ago')),
                  ce('span', { style: { color: '#1e293b', fontSize: '0.72rem' } }, ce('strong', null, tr(item.label)), item.detail ? ce('span', { style: { display: 'block', marginTop: 1, color: '#64748b', fontSize: '0.66rem' } }, tr(item.detail)) : null)
                );
              })) : ce('p', { style: { margin: '0.65rem 0 0', color: '#64748b', fontSize: '0.72rem' } }, tr('No activity milestones have arrived yet.'))
            ),
            ce('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 10 } },
              canCheckIn ? ce('button', { type: 'button', disabled: checkInPending, onClick: function () { sendTeacherCheckIn(row); }, style: { minHeight: 44, padding: '0.45rem 0.7rem', border: '1px solid #2563eb', borderRadius: 7, background: 'white', color: checkInPending ? '#94a3b8' : '#1d4ed8', fontWeight: 850, cursor: checkInPending ? 'default' : 'pointer' } }, checkInPending ? tr('Check-in sent') : tr('Send private check-in')) : null,
              ce('button', { type: 'button', onClick: function () { setStudentActivityExpanded(true); setStudentActivityFilter('all'); setStudentActivityQuery(detail.name); closeStudentActivityDetail(); }, style: { minHeight: 44, padding: '0.45rem 0.7rem', border: '1px solid #64748b', borderRadius: 7, background: 'white', color: '#334155', fontWeight: 850, cursor: 'pointer' } }, tr('Show in roster'))
            ),
            ce('aside', { style: { marginTop: 10, padding: '0.65rem 0.75rem', border: '1px solid #fde68a', borderRadius: 8, background: '#fffbeb', color: '#78350f', fontSize: '0.7rem', lineHeight: 1.45 } },
              ce('strong', null, tr('Literal screen sharing is not enabled.')), ' ',
              tr('A future screen-share mode would require each student to knowingly choose and authorize a screen, visible capture controls, and a separate consent-aware media connection.')
            )
          ) : ce('p', { role: 'status', style: { margin: '1rem 0 0', color: '#64748b' } }, tr('This student is no longer in the live roster. Close this view and refresh the roster.'))
        )
      );
    };

    const renderAlloSheetReview = function () {
      if (!alloSheetReviewOpen) return null;
      const current = currentAlloSheetSnapshot();
      const snapshots = completedPolls.slice();
      if (current && !snapshots.some(function (entry) { return entry && entry.poll && entry.poll.id === current.poll.id; })) snapshots.push(current);
      const preview = buildLivePollingAlloSheetEnvelope({ sessionCode: sessionCode, polls: snapshots, sessionStartedAt: snapshots[0] && snapshots[0].startedAt, sessionEndedAt: Date.now() }, { includeChoiceLabels: alloSheetIncludeChoiceLabels, datasets: alloSheetDatasets, createdAt: new Date().toISOString() });
      const previewRows = preview.tables.reduce(function (sum, table) { return sum + (table.rowCount || 0); }, 0);
      const datasetOptions = [
        ['sessionSummary', tr('Session summary'), tr('Counts, duration, and response-rate status.')],
        ['itemSummary', tr('Item summary'), tr('Coded poll rows with no prompt text.')],
        ['answerDistribution', tr('Coded answer distribution'), tr('Rating/choice counts with small-group suppression.')],
        ['timeSummary', tr('15-minute time summary'), tr('Response volume by UTC time bucket.')],
      ];
      return ce('div', { role: 'presentation', onMouseDown: function (event) { if (event.target === event.currentTarget) closeAlloSheetReview(); }, style: { position: 'fixed', inset: 0, zIndex: 10003, background: 'rgba(15,23,42,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' } },
        ce('div', { ref: alloSheetDialogRef, tabIndex: -1, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'live-polling-allosheet-title', 'aria-describedby': 'live-polling-allosheet-description', style: { width: '100%', maxWidth: 620, maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' } },
          ce('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' } },
            ce('div', null,
              ce('div', { style: { color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' } }, tr('One-way reviewed handoff')),
              ce('h2', { id: 'live-polling-allosheet-title', style: { margin: '0.2rem 0 0', color: '#0f172a', fontSize: '1.1rem' } }, tr('Open Live Polling in AlloSheet')),
              ce('p', { id: 'live-polling-allosheet-description', style: { margin: '0.45rem 0 0', color: '#475569', fontSize: '0.78rem', lineHeight: 1.45 } }, tr('Review a bounded post-session aggregate copy. Poll prompts, response text, codenames, routing, feedback, Q&A, and signaling metadata are excluded. AlloSheet cannot write back or enable AI.'))
            ),
            ce('button', { ref: alloSheetInitialRef, type: 'button', onClick: closeAlloSheetReview, disabled: alloSheetBusy, 'aria-label': tr('Close Live Polling AlloSheet review'), style: { minWidth: 44, minHeight: 44, border: '1px solid #cbd5e1', borderRadius: 6, background: 'white', color: '#0f172a', fontWeight: 800, cursor: alloSheetBusy ? 'default' : 'pointer' } }, '×')
          ),
          ce('fieldset', { style: { margin: '1rem 0 0', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.75rem' } },
            ce('legend', { style: { padding: '0 0.35rem', color: '#0f172a', fontSize: '0.78rem', fontWeight: 900 } }, tr('Tables to copy')),
            datasetOptions.map(function (entry) { return ce('label', { key: entry[0], style: { display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0.45rem 0', color: '#334155', fontSize: '0.78rem' } }, ce('input', { type: 'checkbox', 'aria-label': entry[1] + ' for AlloSheet', checked: !!alloSheetDatasets[entry[0]], disabled: alloSheetBusy, onChange: function () { toggleAlloSheetDataset(entry[0]); }, style: { marginTop: 2 } }), ce('span', null, ce('strong', null, entry[1]), ce('span', { style: { display: 'block', color: '#64748b', fontSize: '0.7rem', lineHeight: 1.35 } }, entry[2]))); })
          ),
          ce('label', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: '0.8rem', color: '#334155', fontSize: '0.78rem' } },
            ce('input', { type: 'checkbox', 'aria-label': tr('Include teacher-authored choice labels in AlloSheet'), checked: alloSheetIncludeChoiceLabels, disabled: alloSheetBusy, onChange: function (event) { setAlloSheetIncludeChoiceLabels(event.target.checked); }, style: { marginTop: 2 } }),
            ce('span', null, ce('strong', null, tr('Include teacher-authored choice labels')), ce('span', { style: { display: 'block', color: '#64748b', fontSize: '0.7rem', lineHeight: 1.35 } }, tr('Off by default. Prompts and learner-authored text remain excluded.')))
          ),
          ce('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: '0.9rem', padding: '0.65rem 0.75rem', borderRadius: 7, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', fontSize: '0.75rem', lineHeight: 1.4 } }, tr('Preview: ') + preview.tables.length + ' ' + tr('tables') + ', ' + previewRows + ' ' + tr('rows') + '. Small groups and small answer buckets are suppressed below five.'),
          alloSheetFeedback.text ? ce('div', { role: alloSheetFeedback.kind === 'error' ? 'alert' : 'status', style: { marginTop: 8, color: alloSheetFeedback.kind === 'error' ? '#b91c1c' : '#334155', fontSize: '0.76rem' } }, alloSheetFeedback.text) : null,
          ce('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem', flexWrap: 'wrap' } },
            ce('button', { type: 'button', onClick: closeAlloSheetReview, disabled: alloSheetBusy, style: { minHeight: 44, padding: '0.55rem 0.85rem', border: '1px solid #94a3b8', borderRadius: 7, background: 'white', color: '#334155', fontWeight: 800, cursor: alloSheetBusy ? 'default' : 'pointer' } }, tr('Cancel')),
            ce('button', { type: 'button', onClick: transferAlloSheetReview, disabled: alloSheetBusy || previewRows === 0, style: { minHeight: 44, padding: '0.55rem 0.9rem', border: 'none', borderRadius: 7, background: '#1d4ed8', color: 'white', fontWeight: 900, cursor: alloSheetBusy || previewRows === 0 ? 'default' : 'pointer' } }, alloSheetBusy ? tr('Opening AlloSheet...') : tr('Open in AlloSheet'))
          )
        )
      );
    };

    return ce(R.Fragment, null,
      ce('div', {
        role: 'presentation',
        style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }
      },
        ce('div', {
          ref: hostDialogRef,
          tabIndex: -1,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'live-polling-host-title',
          'aria-describedby': 'live-polling-host-description',
          'aria-hidden': (pendingGroupName !== null || pendingEndAction !== null || alloSheetReviewOpen || selectedStudentActivityUid !== null) ? 'true' : undefined,
          inert: (pendingGroupName !== null || pendingEndAction !== null || alloSheetReviewOpen || selectedStudentActivityUid !== null) ? '' : undefined,
          style: { background: 'white', boxSizing: 'border-box', maxWidth: 1480, width: 'calc(100vw - 1rem)', height: 'calc(100dvh - 1rem)', maxHeight: 'calc(100dvh - 1rem)', overflow: 'auto', borderRadius: 14, padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }
        },
        ce('div', { 'data-live-host-toolbar': '', style: { position: 'sticky', top: '-1.25rem', zIndex: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '-1.25rem -1.25rem 0.75rem', padding: '0.9rem 1.25rem', background: 'rgba(255,255,255,0.97)', borderBottom: '1px solid #e2e8f0', borderRadius: '14px 14px 0 0', boxShadow: '0 4px 12px rgba(15,23,42,0.06)' } },
          ce('h2', { id: 'live-polling-host-title', style: { margin: 0, fontSize: '1.15rem', color: '#0f172a' } }, tr('Live Polling —') + ' ', ce('span', { style: { fontFamily: 'monospace', color: '#1e3a8a' } }, sessionCode), activePoll ? ce('span', { style: { display: 'inline-block', marginLeft: 8, padding: '0.18rem 0.42rem', borderRadius: 999, background: '#dcfce7', color: '#166534', fontSize: '0.66rem', verticalAlign: 'middle' } }, tr('Poll live')) : null),
          ce('select', {
            defaultValue: '',
            onChange: function (event) { jumpToLiveWorkspaceSection(event.target.value); event.target.value = ''; },
            'aria-label': tr('Jump to live session section'),
            style: { minHeight: 44, padding: '0.4rem 2rem 0.4rem 0.6rem', border: '1px solid #94a3b8', borderRadius: 6, background: 'white', color: '#0f172a', fontWeight: 750, fontSize: '0.76rem' }
          },
            ce('option', { value: '', disabled: true }, tr('Jump to...')),
            ce('option', { value: 'students' }, tr('Students and progress')),
            sessionQaOptIn ? ce('option', { value: 'questions' }, tr('Live Q&A')) : null,
            ce('option', { value: 'create' }, tr('Create poll')),
            ce('option', { value: 'active', disabled: !activePoll }, activePoll ? tr('Active poll') + ' (' + uniqueActiveResponses.length + '/' + responseGoalBase + ')' : tr('No active poll')),
            completedPolls.length ? ce('option', { value: 'recent' }, tr('Recent polls') + ' (' + completedPolls.length + ')') : null,
            ce('option', { value: 'wrap-up' }, tr('Session wrap-up'))
          ),
          ce('button', { type: 'button', onClick: openAlloSheetReview, disabled: !activePoll && completedPolls.length === 0, 'aria-label': tr('Review Live Polling aggregates in AlloSheet'), style: { minHeight: 44, padding: '0.4rem 0.7rem', border: '1px solid #2563eb', borderRadius: 6, background: 'white', color: '#1d4ed8', cursor: (!activePoll && completedPolls.length === 0) ? 'default' : 'pointer', fontWeight: 800, fontSize: '0.76rem' } }, tr('Open in AlloSheet')),
                    ce('button', { ref: hostCloseRef, type: 'button', onClick: requestPanelClose, style: { minWidth: 44, minHeight: 44, background: '#f1f5f9', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600 } }, tr('Close'))
        ),
        ce('p', { id: 'live-polling-host-description', style: { fontSize: '0.85rem', color: '#475569', margin: '0 0 0.75rem 0' } }, tr('Connected:') + ' ',
          ce('strong', null, guests.length), ' ' + (guests.length === 1 ? tr('guest') : tr('guests')),
          guests.length > 0 ? ' (' + guests.map(function (g) { return g.codename; }).join(', ') + ')' : ''
        ),
        ce('section', { 'aria-label': tr('Live session connection health'), style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: '0.8rem', padding: '0.6rem 0.7rem', border: '1px solid ' + (transportHealth.status === 'attention' ? '#fecaca' : transportHealth.status === 'healthy' ? '#bbf7d0' : '#fde68a'), borderRadius: 9, background: transportHealth.status === 'attention' ? '#fef2f2' : transportHealth.status === 'healthy' ? '#f0fdf4' : '#fffbeb' } },
          ce('div', { style: { minWidth: 0 } },
            ce('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
              ce('strong', { style: { color: '#0f172a', fontSize: '0.78rem' } }, tr(transportHealth.providerLabel)),
              ce('span', { role: 'status', style: { padding: '0.16rem 0.42rem', borderRadius: 999, background: transportHealth.status === 'attention' ? '#fee2e2' : transportHealth.status === 'healthy' ? '#dcfce7' : '#fef3c7', color: transportHealth.status === 'attention' ? '#991b1b' : transportHealth.status === 'healthy' ? '#166534' : '#92400e', fontSize: '0.64rem', fontWeight: 900 } }, transportHealth.status === 'attention' ? tr('Sync needs attention') : transportHealth.status === 'healthy' ? tr('Sync healthy') : tr('Waiting for students'))
            ),
            ce('div', { style: { marginTop: 3, color: '#475569', fontSize: '0.68rem', lineHeight: 1.35 } },
              transportHealth.directCount + ' / ' + transportHealth.expectedCount + ' ' + tr('students connected'),
              transportHealth.lastSyncAgeMs !== null ? ' · ' + tr('Last sync') + ' ' + formatLiveElapsed(transportHealth.lastSyncAgeMs) + ' ' + tr('ago') : '',
              transportHealth.problemEvent ? ' · ' + tr('Latest issue:') + ' ' + transportHealth.problemEvent : ''
            )
          ),
          onOpenDiagnostics ? ce('button', { type: 'button', onClick: onOpenDiagnostics, style: { minHeight: 40, padding: '0.35rem 0.6rem', border: '1px solid #64748b', borderRadius: 6, background: 'white', color: '#334155', fontSize: '0.68rem', fontWeight: 850, cursor: 'pointer' } }, tr('Open diagnostics')) : null
        ),
        ce('section', { 'aria-labelledby': 'live-student-activity-title', 'data-live-workspace-section': 'students', tabIndex: -1, style: { scrollMarginTop: 76, marginBottom: '0.85rem', padding: '0.75rem', border: '1px solid #bfdbfe', borderRadius: 10, background: '#eff6ff' } },
          ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' } },
            ce('div', null,
              ce('h3', { id: 'live-student-activity-title', style: { margin: 0, color: '#1e3a8a', fontSize: '0.95rem' } }, tr('Student activity status')),
              ce('p', { style: { margin: '0.2rem 0 0', color: '#475569', fontSize: '0.72rem', lineHeight: 1.4 } }, tr('See each learner’s current live activity and completion state. Response content stays out of this named view.'))
            ),
            ce('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap', fontSize: '0.69rem', fontWeight: 850 } },
              ['working', 'opened', 'complete', 'submitted', 'revised', 'failed', 'withdrawn', 'waiting'].map(function (status) {
                const count = studentActivityCounts[status] || 0;
                if (!count) return null;
                return ce('span', { key: status, style: { padding: '0.2rem 0.45rem', borderRadius: 999, background: status === 'submitted' || status === 'revised' || status === 'complete' || status === 'opened' ? '#dcfce7' : status === 'working' ? '#fef3c7' : status === 'withdrawn' || status === 'failed' ? '#fee2e2' : 'white', color: status === 'submitted' || status === 'revised' || status === 'complete' || status === 'opened' ? '#166534' : status === 'working' ? '#92400e' : status === 'withdrawn' || status === 'failed' ? '#991b1b' : '#475569', border: '1px solid #cbd5e1' } }, count + ' ' + tr(status));
              })
            ),
            ce('button', {
              type: 'button',
              onClick: function () { setStudentActivityExpanded(function (value) { return !value; }); },
              'aria-expanded': studentActivityExpanded,
              'aria-controls': 'live-student-activity-details',
              style: { minHeight: 40, padding: '0.38rem 0.62rem', border: '1px solid #93c5fd', borderRadius: 7, background: 'white', color: '#1d4ed8', fontWeight: 850, cursor: 'pointer', fontSize: '0.72rem' }
            }, studentActivityExpanded ? tr('Hide details') : tr('Show details'))
          ),
          studentActivityRows.length ? ce('section', { 'aria-label': tr('Progress and engagement signals'), style: { marginTop: 9, padding: '0.65rem', border: '1px solid #bae6fd', borderRadius: 9, background: '#f8fafc' } },
            ce('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
              ce('strong', { style: { color: '#0f172a', fontSize: '0.76rem' } }, tr('Progress and engagement signals')),
              ce('span', { style: { color: '#64748b', fontSize: '0.64rem' } }, tr('Signals show session activity, not effort or attention.'))
            ),
            ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 6, marginTop: 6 } },
              [
                { id: 'active', label: tr('Active signal'), color: '#166534', background: '#f0fdf4', border: '#bbf7d0' },
                { id: 'recent', label: tr('Recent signal'), color: '#0f766e', background: '#f0fdfa', border: '#99f6e4' },
                { id: 'quiet', label: tr('Quiet 3+ min'), color: '#92400e', background: '#fffbeb', border: '#fde68a' },
                { id: 'offline', label: tr('Likely offline'), color: '#991b1b', background: '#fef2f2', border: '#fecaca' },
                { id: 'unknown', label: tr('No signal yet'), color: '#475569', background: '#f8fafc', border: '#cbd5e1' },
              ].map(function (metric) {
                return ce('div', { key: metric.id, style: { padding: '0.45rem 0.55rem', border: '1px solid ' + metric.border, borderRadius: 7, background: metric.background } },
                  ce('strong', { style: { display: 'block', color: metric.color, fontSize: '1rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' } }, studentEngagementSummary[metric.id] || 0),
                  ce('span', { style: { display: 'block', marginTop: 3, color: metric.color, fontSize: '0.65rem', fontWeight: 800 } }, metric.label)
                );
              })
            )
          ) : null,
          teacherActionQueue.length ? ce('section', { 'aria-labelledby': 'live-teacher-action-queue-title', style: { marginTop: 9, padding: '0.7rem', border: '1px solid #c4b5fd', borderRadius: 9, background: '#faf5ff' } },
            ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' } },
              ce('div', null,
                ce('h4', { id: 'live-teacher-action-queue-title', style: { margin: 0, color: '#5b21b6', fontSize: '0.82rem' } }, tr('Teacher action queue') + ' (' + teacherActionQueue.length + ')'),
                ce('p', { style: { margin: '0.2rem 0 0', color: '#6b21a8', fontSize: '0.68rem', lineHeight: 1.35 } }, tr('Private follow-ups are prioritized here; named response content is not shown.'))
              ),
              ce('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' } },
                LIVE_TEACHER_ACTION_REASONS.map(function (reason) {
                  const count = teacherActionCounts[reason] || 0;
                  return count ? ce('span', { key: reason, style: { padding: '0.18rem 0.38rem', border: '1px solid #ddd6fe', borderRadius: 999, background: 'white', color: reason === 'help' || reason === 'failed' ? '#b91c1c' : '#5b21b6', fontSize: '0.64rem', fontWeight: 900 } }, count + ' ' + tr(reason)) : null;
                }),
                reviewedActionCount ? ce('button', { type: 'button', onClick: function () { setReviewedActionKeys({}); }, style: { minHeight: 36, padding: '0.25rem 0.45rem', border: '1px solid #7c3aed', borderRadius: 5, background: 'white', color: '#6d28d9', fontWeight: 850, fontSize: '0.64rem', cursor: 'pointer' } }, tr('Restore reviewed') + ' (' + reviewedActionCount + ')') : null
              )
            ),
            onSendToStudent && resources.length ? ce('label', { style: { display: 'block', marginTop: 7, color: '#581c87', fontSize: '0.67rem', fontWeight: 850 } },
              tr('Follow-up resource for queue actions'),
              ce('select', { value: followUpResourceId, onChange: function (event) { setFollowUpResourceId(event.target.value); }, 'aria-label': tr('Select a follow-up resource for the teacher action queue'), style: { display: 'block', width: '100%', minHeight: 42, marginTop: 3, padding: '0.38rem 0.5rem', border: '1px solid #c4b5fd', borderRadius: 6, background: 'white', color: '#1e293b' } },
                ce('option', { value: '' }, tr('Select a resource (optional)')),
                resources.slice(0, 250).map(function (resource) { return ce('option', { key: resource.id, value: resource.id }, resource.title || resource.label || resource.id); })
              )
            ) : null,
            ce('div', { role: 'list', 'aria-label': tr('Students needing teacher follow-up'), style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 6, marginTop: 7 } },
              teacherActionQueue.slice(0, 8).map(function (item) {
                const row = studentActivityRows.find(function (entry) { return entry.uid === item.uid; });
                const signal = checkInsByUid[item.uid];
                const checkInPending = !!(signal && signal.activityId === currentSupportActivityId && signal.status === 'sent');
                const reasonLabel = item.reason === 'help' ? tr('Help requested') : item.reason === 'failed' ? tr('Resource delivery failed') : item.reason === 'offline' ? tr('Student is offline') : item.reason === 'withdrawn' ? tr('Response withdrawn') : tr('Waiting to begin');
                const resourceBusy = actionQueueBusyUid === item.uid;
                return ce('article', { key: item.key, role: 'listitem', style: { padding: '0.55rem', border: '1px solid #ddd6fe', borderRadius: 7, background: 'white' } },
                  ce('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' } },
                    ce('strong', { style: { display: 'block', color: '#1e293b', fontSize: '0.76rem' } }, item.name),
                    ce('span', { style: { color: item.waitMs >= 120000 ? '#b91c1c' : '#64748b', fontSize: '0.63rem', fontWeight: 900, whiteSpace: 'nowrap' } }, tr('Waiting') + ' ' + formatLiveElapsed(item.waitMs))
                  ),
                  ce('span', { style: { display: 'block', marginTop: 2, color: item.reason === 'help' || item.reason === 'failed' ? '#b91c1c' : '#6b21a8', fontSize: '0.67rem', fontWeight: 900 } }, reasonLabel),
                  item.actionStatus === 'claimed' ? ce('span', { style: { display: 'inline-block', marginTop: 3, padding: '0.14rem 0.34rem', borderRadius: 999, background: '#ede9fe', color: '#5b21b6', fontSize: '0.61rem', fontWeight: 900 } }, tr('Claimed')) : null,
                  ce('span', { style: { display: 'block', marginTop: 2, color: '#64748b', fontSize: '0.64rem' } }, tr(item.activity)),
                  ce('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 } },
                    item.connected && row ? ce('button', { type: 'button', disabled: checkInPending, onClick: function () { sendTeacherCheckIn(row); updateTeacherActionState(item, 'claimed'); }, style: { minHeight: 38, padding: '0.3rem 0.5rem', border: '1px solid #7c3aed', borderRadius: 5, background: 'white', color: checkInPending ? '#94a3b8' : '#6d28d9', fontWeight: 850, fontSize: '0.65rem', cursor: checkInPending ? 'default' : 'pointer' } }, checkInPending ? tr('Check-in sent') : tr('Check in')) : null,
                    onSendToStudent && followUpResourceId ? ce('button', { type: 'button', disabled: !!actionQueueBusyUid, onClick: function () { sendTeacherActionResource(item); }, style: { minHeight: 38, padding: '0.3rem 0.5rem', border: '1px solid #2563eb', borderRadius: 5, background: '#eff6ff', color: resourceBusy ? '#94a3b8' : '#1d4ed8', fontWeight: 850, fontSize: '0.65rem', cursor: actionQueueBusyUid ? 'default' : 'pointer' } }, resourceBusy ? tr('Sending...') : tr('Send resource')) : null,
                    ce('button', { type: 'button', onClick: function () { updateTeacherActionState(item, item.actionStatus === 'claimed' ? 'open' : 'claimed'); }, style: { minHeight: 38, padding: '0.3rem 0.5rem', border: '1px solid #7c3aed', borderRadius: 5, background: item.actionStatus === 'claimed' ? '#ede9fe' : 'white', color: '#6d28d9', fontWeight: 850, fontSize: '0.65rem', cursor: 'pointer' } }, item.actionStatus === 'claimed' ? tr('Release') : tr('Claim')),
                    ce('button', { type: 'button', onClick: function () { updateTeacherActionState(item, 'snoozed', Date.now() + 120000); }, style: { minHeight: 38, padding: '0.3rem 0.5rem', border: '1px solid #94a3b8', borderRadius: 5, background: 'white', color: '#475569', fontWeight: 850, fontSize: '0.65rem', cursor: 'pointer' } }, tr('Snooze 2m')),
                    ce('button', { type: 'button', onClick: function () { focusTeacherActionStudents(item); }, style: { minHeight: 38, padding: '0.3rem 0.5rem', border: '1px solid #94a3b8', borderRadius: 5, background: 'white', color: '#475569', fontWeight: 850, fontSize: '0.65rem', cursor: 'pointer' } }, tr('View student')),
                    ce('button', { type: 'button', onClick: function () { markTeacherActionReviewed(item); }, style: { minHeight: 38, padding: '0.3rem 0.5rem', border: '1px solid #16a34a', borderRadius: 5, background: 'white', color: '#166534', fontWeight: 850, fontSize: '0.65rem', cursor: 'pointer' } }, tr('Resolve'))
                  )
                );
              })
            ),
            teacherActionQueue.length > 8 ? ce('p', { style: { margin: '0.45rem 0 0', color: '#6b21a8', fontSize: '0.67rem', fontWeight: 800 } }, tr('{n} more students are available in the filtered activity table.', { n: teacherActionQueue.length - 8 })) : null,
            actionQueueNotice.text ? ce('p', { role: actionQueueNotice.kind === 'error' ? 'alert' : 'status', 'aria-live': 'polite', style: { margin: '0.45rem 0 0', color: actionQueueNotice.kind === 'error' ? '#b91c1c' : '#166534', fontSize: '0.7rem', fontWeight: 850 } }, actionQueueNotice.text) : null
          ) : studentActivityRows.length ? ce('div', { role: 'status', style: { marginTop: 9, padding: '0.5rem 0.6rem', border: '1px solid #bbf7d0', borderRadius: 7, background: '#f0fdf4', color: '#166534', fontSize: '0.7rem', fontWeight: 850 } },
            tr('Teacher action queue is clear.'),
            reviewedActionCount ? ce('button', { type: 'button', onClick: function () { setReviewedActionKeys({}); }, style: { display: 'block', minHeight: 40, marginTop: 5, padding: '0.3rem 0.5rem', border: '1px solid #16a34a', borderRadius: 5, background: 'white', color: '#166534', fontWeight: 850, cursor: 'pointer' } }, tr('Restore reviewed') + ' (' + reviewedActionCount + ')') : null
          ) : null,
          ce('div', { id: 'live-student-activity-details', hidden: !studentActivityExpanded },
          studentActivityRows.length ? ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 6, marginTop: 9 }, role: 'group', 'aria-label': tr('Filter student activity') },
            [
              { id: 'all', label: tr('All students') },
              { id: 'help', label: tr('Help requested') },
              { id: 'in-progress', label: tr('In progress') },
              { id: 'finished', label: tr('Finished') },
              { id: 'attention', label: tr('Needs attention') },
              { id: 'offline', label: tr('Offline') },
            ].map(function (option) {
              const selected = studentActivityFilter === option.id;
              return ce('button', {
                key: option.id,
                type: 'button',
                onClick: function () { setStudentActivityFilter(option.id); },
                'aria-pressed': selected,
                style: { minHeight: 44, padding: '0.42rem 0.5rem', border: '1px solid ' + (selected ? '#1d4ed8' : '#bfdbfe'), borderRadius: 8, background: selected ? '#1d4ed8' : 'white', color: selected ? 'white' : '#1e3a8a', textAlign: 'left', cursor: 'pointer' }
              },
                ce('strong', { style: { display: 'block', fontSize: '1rem', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' } }, studentActivitySummary[option.id] || 0),
                ce('span', { style: { display: 'block', marginTop: 2, fontSize: '0.68rem', fontWeight: 800 } }, option.label)
              );
            })
          ) : null,
          studentActivityRows.length ? ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8, marginTop: 8 } },
            ce('label', { style: { display: 'block', color: '#334155', fontSize: '0.7rem', fontWeight: 800 } },
              tr('Find a student, activity, or group'),
              ce('input', {
                type: 'search',
                value: studentActivityQuery,
                onChange: function (event) { setStudentActivityQuery(normalizeBoundedText(event.target.value, 80)); },
                placeholder: tr('Search live activity'),
                'aria-label': tr('Find a student, activity, or group'),
                style: { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 3, minHeight: 44, padding: '0.45rem 0.6rem', border: '1px solid #93c5fd', borderRadius: 7, background: 'white', color: '#0f172a' }
              })
            ),
            ce('label', { style: { display: 'block', color: '#334155', fontSize: '0.7rem', fontWeight: 800 } },
              tr('Sort students'),
              ce('select', {
                value: studentActivitySort,
                onChange: function (event) { setStudentActivitySort(LIVE_STUDENT_ACTIVITY_SORTS.indexOf(event.target.value) >= 0 ? event.target.value : 'attention'); },
                'aria-label': tr('Sort student activity'),
                style: { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 3, minHeight: 44, padding: '0.45rem 0.6rem', border: '1px solid #93c5fd', borderRadius: 7, background: 'white', color: '#0f172a', fontWeight: 750 }
              },
                ce('option', { value: 'attention' }, tr('Needs attention first')),
                ce('option', { value: 'name' }, tr('Student name'))
              )
            )
          ) : null,
          visibleStudentActivityRows.length ? ce('div', { role: 'region', 'aria-label': tr('Scrollable live student activity table'), tabIndex: 0, style: { marginTop: 8, maxHeight: 'min(42dvh, 520px)', overflow: 'auto', border: '1px solid #dbeafe', borderRadius: 8, background: 'white' } },
            ce('table', { 'aria-label': tr('Live student activity status'), style: { width: '100%', minWidth: 1040, borderCollapse: 'collapse', fontSize: '0.75rem' } },
              ce('thead', null, ce('tr', { style: { position: 'sticky', top: 0, zIndex: 1, background: '#f8fafc', color: '#334155', textAlign: 'left' } },
                ce('th', { scope: 'col', style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #e2e8f0' } }, tr('Student')),
                ce('th', { scope: 'col', style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #e2e8f0' } }, tr('Connection')),
                ce('th', { scope: 'col', style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #e2e8f0' } }, tr('Activity signal')),
                ce('th', { scope: 'col', style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #e2e8f0' } }, tr('Current activity')),
                ce('th', { scope: 'col', style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #e2e8f0' } }, tr('Progress')),
                ce('th', { scope: 'col', style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #e2e8f0' } }, tr('Teacher check-in')),
                ce('th', { scope: 'col', style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #e2e8f0' } }, tr('Student view'))
              )),
              ce('tbody', null, visibleStudentActivityRows.slice(0, studentActivityVisibleLimit).map(function (row) {
                const group = row.groupId && sessionGroups[row.groupId];
                const checkIn = checkInsByUid[row.uid];
                const checkInForCurrentSupport = !!(checkIn && checkIn.activityId === currentSupportActivityId);
                const checkInPending = checkInForCurrentSupport && checkIn.status === 'sent';
                const hasDirectConnection = row.directConnected === true || (row.directConnected == null && row.connected === true);
                const canCheckIn = !!(hasDirectConnection && (!activePoll || (activeParticipantUidSet.has(String(row.uid)) && ['submitted', 'revised', 'complete'].indexOf(row.status) < 0)));
                const signalStatus = ['active', 'recent', 'quiet', 'offline'].indexOf(row.signalStatus) >= 0 ? row.signalStatus : 'unknown';
                const signalPresentation = {
                  active: { label: tr('Active now'), color: '#166534', background: '#dcfce7' },
                  recent: { label: tr('Recent'), color: '#0f766e', background: '#ccfbf1' },
                  quiet: { label: tr('Quiet'), color: '#92400e', background: '#fef3c7' },
                  offline: { label: tr('Likely offline'), color: '#991b1b', background: '#fee2e2' },
                  unknown: { label: tr('No signal yet'), color: '#475569', background: '#f1f5f9' },
                }[signalStatus];
                const connectionLabel = hasDirectConnection
                  ? tr('Direct live')
                  : row.presenceStatus === 'active'
                    ? tr('In session')
                    : row.presenceStatus === 'recent'
                      ? tr('Recently present')
                      : liveStudentRowIsOffline(row)
                        ? tr('Offline')
                        : tr('No presence signal');
                const connectionColor = hasDirectConnection || row.presenceStatus === 'active' ? '#166534' : row.presenceStatus === 'recent' ? '#92400e' : '#64748b';
                return ce('tr', { key: row.uid },
                  ce('th', { scope: 'row', style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #f1f5f9', color: '#0f172a', textAlign: 'left' } }, row.name, group ? ce('span', { style: { display: 'block', color: '#64748b', fontSize: '0.65rem', fontWeight: 600 } }, group.name || row.groupId) : null),
                  ce('td', { style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #f1f5f9', color: connectionColor, fontWeight: 750 } }, connectionLabel),
                  ce('td', { style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #f1f5f9' } },
                    ce('span', { style: { display: 'inline-block', padding: '0.18rem 0.42rem', borderRadius: 999, background: signalPresentation.background, color: signalPresentation.color, fontWeight: 850 } }, signalPresentation.label),
                    row.signalAgeMs !== null && row.signalAgeMs !== undefined ? ce('span', { style: { display: 'block', marginTop: 2, color: '#64748b', fontSize: '0.63rem', fontVariantNumeric: 'tabular-nums' } }, formatLiveElapsed(row.signalAgeMs) + ' ' + tr('ago')) : null
                  ),
                  ce('td', { style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #f1f5f9', color: '#334155' } }, tr(row.activity)),
                  ce('td', { style: { padding: '0.45rem 0.55rem', borderBottom: '1px solid #f1f5f9' } },
                    ce('span', { style: { display: 'inline-block', padding: '0.18rem 0.42rem', borderRadius: 999, background: row.status === 'submitted' || row.status === 'revised' || row.status === 'complete' || row.status === 'opened' ? '#dcfce7' : row.status === 'working' ? '#fef3c7' : row.status === 'withdrawn' || row.status === 'failed' ? '#fee2e2' : '#f1f5f9', color: row.status === 'submitted' || row.status === 'revised' || row.status === 'complete' || row.status === 'opened' ? '#166534' : row.status === 'working' ? '#92400e' : row.status === 'withdrawn' || row.status === 'failed' ? '#991b1b' : '#475569', fontWeight: 850 } }, tr(row.status)),
                    row.progressDetail ? ce('span', { style: { display: 'block', marginTop: 2, color: '#64748b', fontSize: '0.66rem', fontVariantNumeric: 'tabular-nums' } }, row.progressDetail + ' ' + tr('completed')) : null
                  ),
                  ce('td', { style: { padding: '0.35rem 0.55rem', borderBottom: '1px solid #f1f5f9' } },
                    canCheckIn ? ce('button', {
                      type: 'button', disabled: checkInPending,
                      onClick: function () { sendTeacherCheckIn(row); },
                      'aria-label': (checkInForCurrentSupport && checkIn.status === 'help' ? tr('Check in again with') : tr('Check in with')) + ' ' + row.name,
                      style: { minHeight: 40, padding: '0.3rem 0.55rem', border: '1px solid ' + (checkInForCurrentSupport && checkIn.status === 'help' ? '#dc2626' : '#2563eb'), borderRadius: 6, background: 'white', color: checkInPending ? '#94a3b8' : checkInForCurrentSupport && checkIn.status === 'help' ? '#b91c1c' : '#1d4ed8', cursor: checkInPending ? 'default' : 'pointer', fontWeight: 850, fontSize: '0.68rem' }
                    }, checkInPending ? tr('Check-in sent') : checkInForCurrentSupport && checkIn.status === 'help' ? tr('Needs help - check again') : tr('Check in')) : ce('span', { style: { color: '#94a3b8', fontSize: '0.67rem' } }, row.connected ? tr('No check-in needed') : tr('Reconnect needed')),
                    checkInForCurrentSupport && checkIn.status === 'working' ? ce('span', { role: 'status', style: { display: 'block', marginTop: 3, color: '#166534', fontSize: '0.65rem', fontWeight: 850 } }, tr('Student says they are working')) : null,
                    checkInForCurrentSupport && checkIn.status === 'help' ? ce('span', { role: 'status', style: { display: 'block', marginTop: 3, color: '#b91c1c', fontSize: '0.65rem', fontWeight: 850 } }, tr('Student asked for help')) : null
                  ),
                  ce('td', { style: { padding: '0.35rem 0.55rem', borderBottom: '1px solid #f1f5f9' } },
                    ce('button', {
                      type: 'button',
                      onClick: function () { setSelectedStudentActivityUid(String(row.uid)); },
                      'aria-label': tr('Open activity view for') + ' ' + row.name + ' - ' + tr('not a live screen'),
                      title: tr('Activity view - not a live screen'),
                      style: { minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.3rem 0.55rem', border: '1px solid #6366f1', borderRadius: 6, background: 'white', color: '#4338ca', cursor: 'pointer', fontWeight: 850, fontSize: '0.68rem', whiteSpace: 'nowrap' }
                    },
                      ce('span', { 'aria-hidden': 'true', style: { width: 18, height: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', border: '2px solid currentColor', borderRadius: '50%' } }, ce('span', { style: { width: 5, height: 5, borderRadius: '50%', background: 'currentColor' } })),
                      tr('Activity view')
                    )
                  )
                );
              }))
            ),
            visibleStudentActivityRows.length > studentActivityVisibleLimit ? ce('button', { type: 'button', onClick: function () { setStudentActivityVisibleLimit(function (limit) { return limit + 50; }); }, style: { width: '100%', minHeight: 44, border: 'none', borderTop: '1px solid #dbeafe', background: '#eff6ff', color: '#1d4ed8', fontWeight: 850, cursor: 'pointer' } }, tr('Show 50 more students') + ' (' + (visibleStudentActivityRows.length - studentActivityVisibleLimit) + ' ' + tr('remaining') + ')') : null
          ) : ce('p', { style: { margin: '0.6rem 0 0', color: '#64748b', fontSize: '0.75rem' } }, studentActivityRows.length ? tr('No students match this activity filter.') : tr('Students will appear here when they join the session.'))
          )
        ),
        sessionQaOptIn ? ce('div', { 'data-live-workspace-section': 'questions', tabIndex: -1, style: { scrollMarginTop: 76 } }, ce(SessionQaHostPanel, {
          state: sessionQaState,
          sortMode: sessionQaSortMode,
          onSortMode: setSessionQaSortMode,
          onSetLocked: setSessionQaLocked,
          onModerate: moderateSessionQa,
          onFeature: featureSessionQa,
        })) : null,
        ce('div', { 'data-live-workspace-section': 'create', tabIndex: -1, style: { scrollMarginTop: 76, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem' } },
          ce('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: composerExpanded ? '0.5rem' : 0 } },
            ce('h3', { style: { margin: 0, fontSize: '0.95rem' } }, tr('Create poll')),
            ce('button', {
              type: 'button',
              onClick: function () { setComposerExpanded(function (value) { return !value; }); },
              'aria-expanded': composerExpanded,
              'aria-controls': 'live-poll-composer-details',
              style: { minHeight: 40, padding: '0.38rem 0.62rem', border: '1px solid #cbd5e1', borderRadius: 7, background: 'white', color: '#334155', fontWeight: 850, cursor: 'pointer', fontSize: '0.72rem' }
            }, composerExpanded ? tr('Collapse') : tr('Compose a poll'))
          ),
          composerExpanded ? ce('div', { id: 'live-poll-composer-details' },
          ce('div', { style: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
            ['rating', 'mcq', 'freetext', 'wordcloud'].map(function (t) {
              return ce('button', {
                key: t, onClick: function () { setPollType(t); },
                style: { padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid ' + (pollType === t ? '#1e3a8a' : '#cbd5e1'), background: pollType === t ? '#1e3a8a' : 'white', color: pollType === t ? 'white' : '#0f172a', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }
              }, t === 'rating' ? tr('Rating 1–5') : t === 'mcq' ? tr('Multiple choice') : t === 'wordcloud' ? tr('Word cloud') : tr('Free text'));
            })
          ),
          ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 7, marginBottom: 8, padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff' } },
            ce('label', { style: { color: '#475569', fontWeight: 700, fontSize: '0.72rem' } },
              tr('Audience'),
              ce('select', {
                value: audienceMode,
                onChange: function (event) { setAudienceMode(event.target.value); setAudienceId(''); },
                'aria-label': tr('Poll audience'),
                style: { display: 'block', marginTop: 3, width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, background: 'white' }
              },
                audienceMode === '' ? ce('option', { value: '', disabled: true }, tr('Choose audience…')) : null,
                ce('option', { value: 'class' }, tr('Whole class')),
                ce('option', { value: 'group' }, tr('One group')),
                ce('option', { value: 'individual' }, tr('One student'))
              )
            ),
            audienceMode === 'group' ? ce('label', { style: { color: '#475569', fontWeight: 700, fontSize: '0.72rem' } },
              tr('Group'),
              ce('select', {
                value: audienceId,
                onChange: function (event) { setAudienceId(normalizeLivePollingAudienceSelection('group', event.target.value).audienceId); },
                'aria-label': tr('Choose poll group'),
                style: { display: 'block', marginTop: 3, width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, background: 'white' }
              },
                ce('option', { value: '' }, tr('Choose group…')),
                sessionGroupEntries.map(function (group) { return ce('option', { key: group.id, value: group.id }, group.name); })
              )
            ) : audienceMode === 'individual' ? ce('label', { style: { color: '#475569', fontWeight: 700, fontSize: '0.72rem' } },
              tr('Student'),
              ce('select', {
                value: audienceId,
                onChange: function (event) { setAudienceId(normalizeLivePollingAudienceSelection('individual', event.target.value).audienceId); },
                'aria-label': tr('Choose poll student'),
                style: { display: 'block', marginTop: 3, width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, background: 'white' }
              },
                ce('option', { value: '' }, tr('Choose student…')),
                guests.map(function (guest) { return ce('option', { key: guest.uid, value: guest.uid }, guest.codename); })
              )
            ) : ce('p', { style: { margin: '20px 0 0 0', color: audienceMode ? '#475569' : '#b91c1c', fontSize: '0.7rem', fontWeight: audienceMode ? 400 : 800 } },
              audienceMode ? tr('All connected students') : tr('Choose a valid audience before broadcasting.')
            )
          ),
          ce('input', { type: 'text', value: pollPrompt, maxLength: LIVE_POLL_PROMPT_MAX_LENGTH, onChange: function (e) { setPollPrompt(e.target.value); }, placeholder: tr('Poll prompt'), 'aria-label': tr('Poll prompt'), 'aria-describedby': 'live-poll-prompt-count', style: { width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' } }),
          ce('div', { id: 'live-poll-prompt-count', style: { margin: '2px 0 8px', color: '#64748b', fontSize: '0.66rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, Math.min(pollPrompt.length, LIVE_POLL_PROMPT_MAX_LENGTH) + ' / ' + LIVE_POLL_PROMPT_MAX_LENGTH),
          pollType === 'wordcloud' ? ce('p', { style: { margin: '0 0 8px 0', padding: '0.45rem 0.55rem', borderRadius: 6, background: '#fff7ed', color: '#9a3412', fontSize: '0.75rem', lineHeight: 1.4 } }, tr('Student terms stay on this teacher device until you approve them. Only approved anonymous totals can be revealed.')) : null,
          pollType === 'freetext' ? ce('div', { style: { marginBottom: 8, padding: '0.55rem', border: '1px solid #c7d2fe', background: feedbackEnabled ? '#eef2ff' : 'white', borderRadius: 7 } },
            ce('label', { style: { display: 'flex', alignItems: 'center', gap: 7, color: '#312e81', fontSize: '0.8rem', fontWeight: 800 } },
              ce('input', { type: 'checkbox', checked: feedbackEnabled, onChange: function (event) { setFeedbackEnabled(event.target.checked); if (event.target.checked) setAfterSubmitMode('wait'); } }),
              tr('Feedback + one revision attempt')
            ),
            feedbackEnabled ? ce('div', { style: { marginTop: 7, display: 'flex', flexDirection: 'column', gap: 7 } },
              ce('label', { style: { color: '#475569', fontWeight: 700, fontSize: '0.72rem' } },
                tr('Teacher criteria'),
                ce('textarea', { value: feedbackCriteria, maxLength: FEEDBACK_CRITERIA_MAX_LENGTH, onChange: function (event) { setFeedbackCriteria(event.target.value); }, 'aria-label': tr('Feedback criteria'), rows: 3, placeholder: tr('What should strong responses demonstrate?'), style: { display: 'block', marginTop: 3, width: '100%', boxSizing: 'border-box', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', fontSize: '0.78rem' } })
              ),
              ce('p', { style: { margin: 0, color: '#4f46e5', fontSize: '0.7rem', fontWeight: 700 } }, tr('Private drafting, teacher-reviewed feedback, and targeted follow-up resources.'))
            ) : null
          ) : null,
          pollType === 'rating' ? ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 8 } },
            ce('label', { style: { fontSize: '0.75rem', color: '#475569', fontWeight: 700 } }, tr('Scale starts'),
              ce('input', { type: 'number', value: ratingMin, min: 0, max: 19, onChange: function (e) { setRatingMin(clampInt(e.target.value, 1, 0, 19)); }, 'aria-label': tr('Rating scale minimum'), style: { display: 'block', marginTop: 3, width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' } })
            ),
            ce('label', { style: { fontSize: '0.75rem', color: '#475569', fontWeight: 700 } }, tr('Scale ends'),
              ce('input', { type: 'number', value: ratingMax, min: 1, max: 20, onChange: function (e) { setRatingMax(clampInt(e.target.value, 5, 1, 20)); }, 'aria-label': tr('Rating scale maximum'), style: { display: 'block', marginTop: 3, width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' } })
            ),
            ce('label', { style: { gridColumn: '1 / -1', fontSize: '0.75rem', color: '#475569', fontWeight: 700 } }, tr('Optional labels, one per line'),
              ce('textarea', { value: ratingLabels, onChange: function (e) { setRatingLabels(e.target.value); }, 'aria-label': tr('Rating labels'), placeholder: '1 = Not yet\n5 = Very well', rows: 3, style: { display: 'block', marginTop: 3, width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.8rem' } })
            )
          ) : null,
          pollType === 'mcq' ? ce('div', { style: { marginBottom: 8 } },
            ce('textarea', { value: pollOptions, maxLength: (LIVE_POLL_CHOICE_MAX_LENGTH + 1) * LIVE_POLL_MAX_CHOICES, onChange: function (e) { setPollOptions(e.target.value); }, 'aria-label': tr('Choices (one per line)'), 'aria-describedby': 'live-poll-choice-count', placeholder: tr('One choice per line'), rows: 4, style: { width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box', fontFamily: 'inherit' } }),
            ce('div', { id: 'live-poll-choice-count', style: { marginTop: 2, color: composerValidation.options.length >= 2 ? '#166534' : '#b45309', fontSize: '0.66rem', textAlign: 'right', fontWeight: 750 } }, composerValidation.options.length + ' / ' + LIVE_POLL_MAX_CHOICES + ' ' + tr('different choices'))
          ) : null,
          pollType === 'freetext' && feedbackEnabled ? ce('p', { style: { margin: '0 0 8px 0', color: '#475569', fontSize: '0.72rem' } }, tr('The response remains open while the teacher reviews and sends feedback.')) : ce('label', { style: { display: 'block', fontSize: '0.75rem', color: '#475569', fontWeight: 700, marginBottom: 8 } }, tr('After a student submits'),
            ce('select', { value: afterSubmitMode, onChange: function (e) { setAfterSubmitMode(e.target.value); }, 'aria-label': tr('After submit behavior'), style: { display: 'block', marginTop: 3, width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: 6, background: 'white', color: '#0f172a' } },
              ce('option', { value: 'dismiss' }, tr('Dismiss poll on their device')),
              ce('option', { value: 'wait' }, tr('Keep poll open until I close it'))
            )
          ),
          // ── Routing-rules expandable section ────────────────────────
          (pollType === 'rating' || pollType === 'mcq') ? ce('div', { style: { marginBottom: 8 } },
            ce('button', {
              onClick: function () { setShowRoutingPanel(function (v) { return !v; }); },
              style: { background: 'none', border: 'none', color: '#1e3a8a', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }
            }, showRoutingPanel ? '▾' : '▸', ' ' + tr('Routing rules') + ' ', ce('span', { style: { fontWeight: 400, color: '#64748b' } }, '(' + composerRules.length + ' ' + (composerRules.length === 1 ? tr('rule') : tr('rules')) + ')'))
          ) : null,
          ((pollType === 'rating' || pollType === 'mcq') && showRoutingPanel) ? ce('div', { style: { background: 'white', border: '1px dashed #c7d2fe', borderRadius: 6, padding: '0.6rem', marginBottom: 8 } },
            ce('p', { style: { fontSize: '0.75rem', color: '#475569', margin: '0 0 0.5rem 0', lineHeight: 1.4 } },
              tr('Auto-route students into groups based on their response. Use this for') + ' ',
              ce('strong', null, tr('choice')), ' ' + tr('(e.g., "Pirate Crew vs Space Crew") or') + ' ',
              ce('strong', null, tr('formative-assessment')), ' ' + tr('(e.g., "rating ≤ 2 → support group").')
            ),
            // Group quick-create row
            ce('div', { style: { display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' } },
              ce('input', { type: 'text', value: newGroupName, onChange: function (e) { setNewGroupName(e.target.value); }, placeholder: tr('New group name (e.g., Pirate Crew)'), 'aria-label': tr('New group name'), style: { flex: 1, padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' } }),
              ce('button', { ref: groupNameTriggerRef, type: 'button', onClick: addGroup, disabled: !newGroupName.trim(), style: { minHeight: 44, padding: '0.35rem 0.7rem', borderRadius: 4, border: '1px solid #059669', background: !newGroupName.trim() ? '#f1f5f9' : '#059669', color: !newGroupName.trim() ? '#94a3b8' : 'white', cursor: !newGroupName.trim() ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.75rem' } }, tr('+ Add group'))
            ),
            routingGroups.length === 0 ? ce('p', { style: { fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', margin: '0 0 0.5rem 0' } }, tr('Create at least one group above to start adding routing rules.')) : null,
            // Rules list
            composerRules.length > 0 ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              composerRules.map(function (rule) {
                const isMcq = pollType === 'mcq';
                const opts = pollOptions.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
                const valueInput = isMcq
                  ? ce('select', {
                      value: rule.when.value, 'aria-label': tr('Choice'), onChange: function (e) { updateRule(rule.id, { when: { value: e.target.value } }); },
                      style: { padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }
                    }, opts.map(function (opt) { return ce('option', { key: opt, value: opt }, opt); }))
                  : (rule.when.predicate === 'between'
                      ? ce('span', { style: { display: 'inline-flex', gap: 4 } },
                          ce('input', { type: 'number', value: (rule.when.value && rule.when.value[0]) || buildRatingScale(ratingMin, ratingMax, ratingLabels).min, min: buildRatingScale(ratingMin, ratingMax, ratingLabels).min, max: buildRatingScale(ratingMin, ratingMax, ratingLabels).max, 'aria-label': 'Range min', onChange: function (e) { const scale = buildRatingScale(ratingMin, ratingMax, ratingLabels); const v = Math.max(scale.min, Math.min(scale.max, Number(e.target.value) || scale.min)); updateRule(rule.id, { when: { value: [v, (rule.when.value && rule.when.value[1]) || scale.max] } }); }, style: { width: 50, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' } }),
                          ce('span', { style: { alignSelf: 'center', fontSize: '0.75rem' } }, tr('to')),
                          ce('input', { type: 'number', value: (rule.when.value && rule.when.value[1]) || buildRatingScale(ratingMin, ratingMax, ratingLabels).max, min: buildRatingScale(ratingMin, ratingMax, ratingLabels).min, max: buildRatingScale(ratingMin, ratingMax, ratingLabels).max, 'aria-label': 'Range max', onChange: function (e) { const scale = buildRatingScale(ratingMin, ratingMax, ratingLabels); const v = Math.max(scale.min, Math.min(scale.max, Number(e.target.value) || scale.max)); updateRule(rule.id, { when: { value: [(rule.when.value && rule.when.value[0]) || scale.min, v] } }); }, style: { width: 50, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' } })
                        )
                      : ce('input', { type: 'number', value: rule.when.value, min: buildRatingScale(ratingMin, ratingMax, ratingLabels).min, max: buildRatingScale(ratingMin, ratingMax, ratingLabels).max, 'aria-label': 'Rating value', onChange: function (e) { const scale = buildRatingScale(ratingMin, ratingMax, ratingLabels); updateRule(rule.id, { when: { value: Math.max(scale.min, Math.min(scale.max, Number(e.target.value) || scale.min)) } }); }, style: { width: 60, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' } })
                    );
                return ce('div', { key: rule.id, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem', background: '#f8fafc', borderRadius: 4, fontSize: '0.8rem', flexWrap: 'wrap' } },
                  ce('span', { style: { color: '#64748b' } }, tr('When')),
                  ce('select', {
                    value: rule.when.predicate, 'aria-label': tr('Predicate'), onChange: function (e) {
                      const newPred = e.target.value;
                      const scale = buildRatingScale(ratingMin, ratingMax, ratingLabels);
                      // Reset value when predicate changes between scalar/array forms
                      let newVal = rule.when.value;
                      if (newPred === 'between' && !Array.isArray(rule.when.value)) newVal = [scale.min, scale.max];
                      if (newPred !== 'between' && Array.isArray(rule.when.value)) newVal = isMcq ? (opts[0] || '') : Math.min(scale.max, Math.max(scale.min, Math.round((scale.min + scale.max) / 2)));
                      updateRule(rule.id, { when: { predicate: newPred, value: newVal } });
                    },
                    style: { padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }
                  },
                    isMcq ? ce('option', { value: 'eq' }, tr('is')) : null,
                    !isMcq ? ce('option', { value: 'eq' }, tr('equals')) : null,
                    !isMcq ? ce('option', { value: 'lte' }, '≤') : null,
                    !isMcq ? ce('option', { value: 'gte' }, '≥') : null,
                    !isMcq ? ce('option', { value: 'between' }, tr('between')) : null
                  ),
                  valueInput,
                  ce('span', { style: { color: '#64748b' } }, tr('→ route to')),
                  ce('select', {
                    value: rule.then.groupId, 'aria-label': tr('Target group'), onChange: function (e) { updateRule(rule.id, { then: { groupId: e.target.value } }); },
                    style: { padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }
                  },
                    ce('option', { value: '' }, tr('— pick group —')),
                    routingGroups.map(function (g) { return ce('option', { key: g.id, value: g.id }, g.name); })
                  ),
                  ce('button', {
                    onClick: function () { removeRule(rule.id); },
                    'aria-label': tr('Remove rule'),
                    style: { marginLeft: 'auto', padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid #fca5a5', background: 'white', color: '#b91c1c', cursor: 'pointer', fontSize: '0.75rem' }
                  }, '✕')
                );
              })
            ) : null,
            ce('button', {
              onClick: addRule, disabled: routingGroups.length === 0,
              style: { marginTop: composerRules.length > 0 ? 6 : 0, padding: '0.35rem 0.7rem', borderRadius: 4, border: '1px dashed ' + (routingGroups.length === 0 ? '#cbd5e1' : '#1e3a8a'), background: 'white', color: routingGroups.length === 0 ? '#94a3b8' : '#1e3a8a', cursor: routingGroups.length === 0 ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.75rem' }
            }, tr('+ Add rule'))
          ) : null,
          ce('div', { id: 'live-poll-composer-readiness', role: 'status', 'aria-live': 'polite', style: { marginBottom: 7, padding: '0.45rem 0.55rem', borderRadius: 7, background: composerValidation.ready ? '#f0fdf4' : '#fff7ed', border: '1px solid ' + (composerValidation.ready ? '#bbf7d0' : '#fed7aa'), color: composerValidation.ready ? '#166534' : '#9a3412', fontSize: '0.72rem', lineHeight: 1.4 } },
            composerValidation.ready
              ? tr('Ready to broadcast to') + ' ' + broadcastTargetCount + ' ' + (broadcastTargetCount === 1 ? tr('student') : tr('students')) + '.'
              : composerValidation.reasons.map(composerValidationMessage).join(' ')
          ),
          ce('button', { onClick: broadcast, disabled: broadcastDisabled, 'aria-describedby': 'live-poll-composer-readiness', style: { minHeight: 44, padding: '0.5rem 1rem', borderRadius: 6, border: 'none', background: broadcastDisabled ? '#cbd5e1' : '#1e3a8a', color: 'white', cursor: broadcastDisabled ? 'default' : 'pointer', fontWeight: 700 } }, activePoll ? tr('Finish active poll first') : tr('Broadcast to') + ' ' + broadcastTargetCount + ' ' + (broadcastTargetCount === 1 ? tr('guest') : tr('guests')))
          ) : null
        ),
        activePoll ? ce('div', { 'data-live-workspace-section': 'active', tabIndex: -1, style: { scrollMarginTop: 76, border: '1px solid #c7d2fe', background: '#eef2ff', borderRadius: 8, padding: '0.75rem' } },
          ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' } },
            ce('div', null,
              ce('div', { style: { fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 700, textTransform: 'uppercase' } }, activePoll.type),
              ce('div', { style: { fontWeight: 600, marginTop: 2 } }, activePoll.prompt)
            ),
            ce('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' } },
              activePoll.type === 'wordcloud' ? ce('button', { type: 'button', onClick: function () { setWordCloudCollectionLocked(!activePoll.submissionsLocked); }, style: { minHeight: 40, padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid #b45309', background: activePoll.submissionsLocked ? '#fffbeb' : 'white', color: '#92400e', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' } }, activePoll.submissionsLocked ? tr('Resume collecting') : tr('Pause and review')) : null,
              !activeFeedbackConfig.enabled ? ce('button', { onClick: shareResults, disabled: !canShareActiveResults, style: { padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid ' + (!canShareActiveResults ? '#cbd5e1' : '#2563eb'), background: 'white', color: !canShareActiveResults ? '#94a3b8' : '#1d4ed8', cursor: !canShareActiveResults ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.8rem' } }, activePoll.type === 'wordcloud' ? (lastSharedResultsAt ? tr('Reveal updated word cloud') : tr('Reveal approved word cloud')) : (lastSharedResultsAt ? tr('Share updated results') : tr('Share anonymous results'))) : null,
              ce('button', { onClick: requestClosePoll, style: { minHeight: 40, padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid #b91c1c', background: 'white', color: '#b91c1c', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' } }, tr('End poll'))
            )
          ),
          ce('div', { style: { marginTop: '0.6rem', fontSize: '0.85rem' } },
            ce('strong', null, uniqueActiveResponses.length), ' / ', responseGoalBase + ' ' + tr('responded'),
            lastSharedResultsAt ? ce('span', { style: { marginLeft: 8, color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 700 } }, tr('Results shared')) : null
          ),
          ce('div', { style: { marginTop: 8, height: 8, borderRadius: 999, background: '#dbeafe', overflow: 'hidden' }, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': responsePercent, 'aria-label': tr('Poll response progress') },
            ce('div', { style: { width: responsePercent + '%', height: '100%', background: responsePercent >= 100 ? '#16a34a' : '#2563eb', transition: 'width 180ms ease' } })
          ),
          activeIncompleteUids.length ? ce('section', { 'aria-label': tr('Follow up with incomplete students'), style: { marginTop: 9, padding: '0.6rem', border: '1px solid #fcd34d', borderRadius: 8, background: '#fffbeb' } },
            ce('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
              ce('div', null,
                ce('strong', { style: { color: '#78350f', fontSize: '0.76rem' } }, activeIncompleteUids.length + ' ' + tr(activeIncompleteUids.length === 1 ? 'student has not responded' : 'students have not responded')),
                ce('div', { style: { marginTop: 2, color: '#92400e', fontSize: '0.67rem' } }, tr('Follow up privately without exposing response content.'))
              ),
              ce('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap' } },
                ce('button', { type: 'button', onClick: function () { setStudentActivityExpanded(true); setStudentActivityFilter('in-progress'); setStudentActivityQuery(''); jumpToLiveWorkspaceSection('students'); }, style: { minHeight: 40, padding: '0.35rem 0.55rem', border: '1px solid #b45309', borderRadius: 6, background: 'white', color: '#92400e', fontWeight: 850, fontSize: '0.68rem', cursor: 'pointer' } }, tr('View incomplete')),
                ce('button', { type: 'button', onClick: sendCheckInToIncomplete, style: { minHeight: 40, padding: '0.35rem 0.55rem', border: '1px solid #7c3aed', borderRadius: 6, background: 'white', color: '#6d28d9', fontWeight: 850, fontSize: '0.68rem', cursor: 'pointer' } }, tr('Check in with all')),
                (onSendToStudents || onSendToStudent) && followUpResourceId ? ce('button', { type: 'button', disabled: !!actionQueueBusyUid, onClick: sendResourceToIncomplete, style: { minHeight: 40, padding: '0.35rem 0.55rem', border: '1px solid #2563eb', borderRadius: 6, background: 'white', color: actionQueueBusyUid ? '#94a3b8' : '#1d4ed8', fontWeight: 850, fontSize: '0.68rem', cursor: actionQueueBusyUid ? 'default' : 'pointer' } }, actionQueueBusyUid === '__incomplete__' ? tr('Sending...') : tr('Send selected resource')) : null
              )
            ),
            resources.length ? ce('label', { style: { display: 'block', marginTop: 6, color: '#78350f', fontSize: '0.66rem', fontWeight: 850 } }, tr('Optional follow-up resource'),
              ce('select', { value: followUpResourceId, onChange: function (event) { setFollowUpResourceId(event.target.value); }, style: { display: 'block', width: '100%', minHeight: 40, marginTop: 3, padding: '0.35rem 0.5rem', border: '1px solid #fcd34d', borderRadius: 6, background: 'white' } },
                ce('option', { value: '' }, tr('Choose a resource')),
                resources.slice(0, 250).map(function (resource) { return ce('option', { key: resource.id, value: resource.id }, resource.title || resource.label || resource.id); })
              )
            ) : null
          ) : null,
          activeFeedbackConfig.enabled ? ce(FeedbackResponseGallery, {
            participants: feedbackParticipants,
            feedbackByUid: feedbackForActive,
            busyByUid: feedbackBusyForActive,
            bulkBusy: feedbackBulkBusy,
            resources: resources,
            followUpResourceId: followUpResourceId,
            onSetFollowUpResourceId: setFollowUpResourceId,
            onGenerate: generateFeedbackForUid,
            onGenerateAll: generateAllFeedback,
            onDraftChange: changeFeedbackDraft,
            onSendFeedback: sendFeedbackToUid,
            onSendToStudent: onSendToStudent,
            onSendToGroup: onSendToGroup,
          }) : null,
          activePoll.type === 'wordcloud' ? ce('div', { style: { marginTop: 10, background: 'rgba(255,255,255,0.82)', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: 8 } },
            ce('ol', { 'aria-label': tr('Word cloud workflow'), style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 5, listStyle: 'none', padding: 0, margin: 0 } },
              [
                { label: tr('1. Collect'), active: !activePoll.submissionsLocked && !lastSharedResultsAt, done: !!activePoll.submissionsLocked || !!lastSharedResultsAt },
                { label: tr('2. Review'), active: !!activePoll.submissionsLocked && !lastSharedResultsAt, done: !!lastSharedResultsAt },
                { label: tr('3. Reveal'), active: !!lastSharedResultsAt, done: false },
              ].map(function (step) { return ce('li', { key: step.label, 'aria-current': step.active ? 'step' : undefined, style: { minWidth: 0, padding: '0.35rem 0.3rem', borderRadius: 6, background: step.active ? '#9a3412' : step.done ? '#dcfce7' : '#f1f5f9', color: step.active ? 'white' : step.done ? '#166534' : '#64748b', textAlign: 'center', fontSize: '0.67rem', fontWeight: 900 } }, step.label); })
            ),
            ce('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
              ce('div', null,
                ce('div', { style: { fontSize: '0.74rem', color: '#9a3412', fontWeight: 800, textTransform: 'uppercase' } }, tr('Teacher review')),
                ce('div', { style: { marginTop: 2, fontSize: '0.75rem', color: '#475569' } }, tr('Hold, approve, or hide each normalized term before revealing the cloud.'))
              ),
              ce('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                ce('button', { type: 'button', onClick: suggestWordCloudClusters, disabled: wordCloudClusterBusy || !activePoll.submissionsLocked || approvedWordCloudUniqueCount < 2, title: !activePoll.submissionsLocked ? tr('Pause collection before grouping terms') : undefined, style: { minHeight: 44, padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid ' + (activePoll.submissionsLocked && approvedWordCloudUniqueCount >= 2 ? '#7c3aed' : '#cbd5e1'), background: 'white', color: activePoll.submissionsLocked && approvedWordCloudUniqueCount >= 2 ? '#6d28d9' : '#94a3b8', cursor: wordCloudClusterBusy || !activePoll.submissionsLocked || approvedWordCloudUniqueCount < 2 ? 'default' : 'pointer', fontWeight: 800, fontSize: '0.75rem' } }, wordCloudClusterBusy ? tr('Finding groups...') : !activePoll.submissionsLocked ? tr('Pause to group terms') : tr('Suggest similar approved terms')),
                Object.keys(activeWordCloudAliases).length ? ce('button', {
                  onClick: resetWordCloudAliases,
                  style: { minHeight: 44, padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid #94a3b8', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem' }
                }, tr('Reset term groups')) : null
              )
            ),
            ce('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: '0.72rem', fontWeight: 700 } },
              ce('span', { style: { color: '#9a3412' } }, tr('Held:') + ' ' + wordCloudStatusCounts.pending),
              ce('span', { style: { color: '#166534' } }, tr('Approved:') + ' ' + wordCloudStatusCounts.approved),
              ce('span', { style: { color: '#64748b' } }, tr('Hidden:') + ' ' + wordCloudStatusCounts.hidden)
            ),
            wordCloudClusterNotice ? ce('p', { role: 'status', 'aria-live': 'polite', style: { margin: 0, color: '#6d28d9', fontSize: '0.7rem', fontWeight: 750 } }, wordCloudClusterNotice) : null,
            wordCloudClusterSuggestions.length ? ce('div', { role: 'list', 'aria-label': tr('Suggested word cloud term groups'), style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 6 } },
              wordCloudClusterSuggestions.map(function (suggestion, suggestionIndex) {
                return ce('article', { key: suggestion.label + '-' + suggestionIndex, role: 'listitem', style: { padding: '0.5rem', border: '1px solid #c4b5fd', borderRadius: 7, background: '#faf5ff' } },
                  ce('strong', { style: { display: 'block', color: '#5b21b6', fontSize: '0.72rem' } }, suggestion.label),
                  ce('span', { style: { display: 'block', marginTop: 2, color: '#64748b', fontSize: '0.66rem', overflowWrap: 'anywhere' } }, suggestion.members.join(' + ')),
                  ce('div', { style: { display: 'flex', gap: 5, marginTop: 5 } },
                    ce('button', { type: 'button', onClick: function () { applyWordCloudCluster(suggestion); }, style: { minHeight: 38, flex: 1, border: '1px solid #7c3aed', borderRadius: 5, background: 'white', color: '#6d28d9', fontSize: '0.66rem', fontWeight: 850, cursor: 'pointer' } }, tr('Apply group')),
                    ce('button', { type: 'button', onClick: function () { setWordCloudClusterSuggestions(function (items) { return items.filter(function (_, index) { return index !== suggestionIndex; }); }); }, 'aria-label': tr('Dismiss suggested group') + ' ' + suggestion.label, style: { minHeight: 38, border: '1px solid #94a3b8', borderRadius: 5, background: 'white', color: '#475569', fontSize: '0.66rem', fontWeight: 850, cursor: 'pointer' } }, tr('Dismiss'))
                  )
                );
              })
            ) : null,
            summaryForActive.items.length > 0 ? renderWordCloudItems(summaryForActive.items, tr('Approved word cloud preview')) : ce('p', { style: { margin: 0, padding: '0.55rem', borderRadius: 6, background: '#f8fafc', color: '#64748b', fontSize: '0.78rem' } }, wordCloudTermsForActive.length > 0 ? tr('No terms are approved yet. Review the held terms below.') : tr('Waiting for student terms.')),
            wordCloudTermsForActive.length > 0 ? ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 7 } },
              ce('div', { role: 'group', 'aria-label': tr('Filter word cloud moderation'), style: { display: 'flex', gap: 5, flexWrap: 'wrap', gridColumn: '1 / -1' } },
                [
                  { id: 'all', label: tr('All') },
                  { id: 'pending', label: tr('Held') },
                  { id: 'approved', label: tr('Approved') },
                  { id: 'hidden', label: tr('Hidden') },
                ].map(function (option) {
                  const selected = wordCloudModerationFilter === option.id;
                  const count = option.id === 'all' ? wordCloudTermsForActive.length : wordCloudTermsForActive.filter(function (item) { return item.status === option.id; }).length;
                  return ce('button', {
                    key: option.id,
                    type: 'button',
                    onClick: function () { setWordCloudModerationFilter(option.id); },
                    'aria-pressed': selected,
                    style: { minHeight: 44, padding: '0.35rem 0.65rem', borderRadius: 999, border: '1px solid ' + (selected ? '#9a3412' : '#fed7aa'), background: selected ? '#9a3412' : 'white', color: selected ? 'white' : '#9a3412', cursor: 'pointer', fontWeight: 850, fontSize: '0.72rem' }
                  }, option.label + ' (' + count + ')');
                })
              ),
              ce('label', { style: { color: '#475569', fontWeight: 800, fontSize: '0.7rem' } },
                tr('Find a submitted term'),
                ce('input', {
                  type: 'search',
                  value: wordCloudModerationQuery,
                  maxLength: 80,
                  onChange: function (event) { setWordCloudModerationQuery(event.target.value.slice(0, 80)); },
                  placeholder: tr('Search terms or grouped variants'),
                  'aria-label': tr('Find a submitted word cloud term'),
                  style: { display: 'block', width: '100%', minHeight: 44, boxSizing: 'border-box', marginTop: 3, padding: '0.4rem 0.55rem', border: '1px solid #fed7aa', borderRadius: 7, background: 'white', color: '#0f172a' }
                })
              ),
              ce('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' } },
                ce('button', {
                  type: 'button',
                  onClick: function () { setVisiblePendingWordCloudTermsStatus('approved'); },
                  disabled: visiblePendingWordCloudTerms.length === 0,
                  style: { minHeight: 44, flex: '1 1 145px', padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid ' + (visiblePendingWordCloudTerms.length ? '#15803d' : '#cbd5e1'), background: 'white', color: visiblePendingWordCloudTerms.length ? '#166534' : '#94a3b8', cursor: visiblePendingWordCloudTerms.length ? 'pointer' : 'default', fontWeight: 850, fontSize: '0.72rem' }
                }, tr('Approve visible held') + ' (' + visiblePendingWordCloudTerms.length + ')'),
                ce('button', {
                  type: 'button',
                  onClick: function () { setVisiblePendingWordCloudTermsStatus('hidden'); },
                  disabled: visiblePendingWordCloudTerms.length === 0,
                  style: { minHeight: 44, flex: '1 1 145px', padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid ' + (visiblePendingWordCloudTerms.length ? '#64748b' : '#cbd5e1'), background: 'white', color: visiblePendingWordCloudTerms.length ? '#475569' : '#94a3b8', cursor: visiblePendingWordCloudTerms.length ? 'pointer' : 'default', fontWeight: 850, fontSize: '0.72rem' }
                }, tr('Hide visible held') + ' (' + visiblePendingWordCloudTerms.length + ')')
              )
            ) : null,
            visibleWordCloudTerms.length > 0 ? ce('div', { role: 'list', 'aria-label': tr('Word cloud moderation'), style: { display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 320, overflow: 'auto' } },
              visibleWordCloudTerms.slice(0, wordCloudVisibleLimit).map(function (item) {
                return ce('div', { key: item.value, role: 'listitem', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, alignItems: 'center', padding: '0.4rem 0.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6 } },
                  ce('span', { style: { minWidth: 0, overflowWrap: 'anywhere', fontSize: '0.82rem' } },
                    ce('strong', null, item.label),
                    ce('span', { style: { marginLeft: 6, color: '#64748b', fontSize: '0.72rem' } }, '×' + item.count),
                    item.sourceKeys && item.sourceKeys.length > 1 ? ce('span', { style: { display: 'block', marginTop: 2, color: '#7c3aed', fontSize: '0.66rem', fontWeight: 800 } }, item.sourceKeys.length + ' ' + tr('terms grouped')) : null
                  ),
                  ce('div', { style: { display: 'flex', gap: 5, minWidth: 0 } },
                    ce('input', {
                      type: 'text',
                      value: Object.prototype.hasOwnProperty.call(wordCloudRenameDrafts, item.value) ? wordCloudRenameDrafts[item.value] : item.label,
                      maxLength: WORD_CLOUD_MAX_LENGTH,
                      onChange: function (event) { const value = event.target.value; setWordCloudRenameDrafts(function (prev) { return Object.assign({}, prev, { [item.value]: value }); }); },
                      onKeyDown: function (event) { if (event.key === 'Enter') { event.preventDefault(); renameWordCloudTerm(item.value); } },
                      'aria-label': tr('Rename or group') + ' ' + item.label,
                      style: { width: '100%', minWidth: 0, padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: 5, fontSize: '0.75rem' }
                    }),
                    ce('button', {
                      type: 'button',
                      onClick: function () { renameWordCloudTerm(item.value); },
                      disabled: !normalizeWordCloudTerm(Object.prototype.hasOwnProperty.call(wordCloudRenameDrafts, item.value) ? wordCloudRenameDrafts[item.value] : item.label),
                      title: tr('Use the same label on multiple terms to merge them'),
                      style: { padding: '0.3rem 0.5rem', border: '1px solid #7c3aed', borderRadius: 5, background: 'white', color: '#6d28d9', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }
                    }, tr('Apply'))
                  ),
                  ce('select', {
                    value: item.status,
                    'aria-label': tr('Moderation for') + ' ' + item.label,
                    onChange: function (e) { setWordCloudTermStatus(item.value, e.target.value); },
                    style: { padding: '0.3rem 0.4rem', borderRadius: 5, border: '1px solid #cbd5e1', background: item.status === 'approved' ? '#dcfce7' : item.status === 'hidden' ? '#f1f5f9' : '#fff7ed', color: '#0f172a', fontSize: '0.75rem', fontWeight: 700 }
                  },
                    ce('option', { value: 'pending' }, tr('Hold')),
                    ce('option', { value: 'approved' }, tr('Approve')),
                    ce('option', { value: 'hidden' }, tr('Hide'))
                  )
                );
              }),
              visibleWordCloudTerms.length > wordCloudVisibleLimit ? ce('button', { type: 'button', onClick: function () { setWordCloudVisibleLimit(function (limit) { return limit + 60; }); }, style: { minHeight: 44, border: '1px solid #fed7aa', borderRadius: 6, background: '#fff7ed', color: '#9a3412', fontWeight: 850, cursor: 'pointer' } }, tr('Show 60 more terms') + ' (' + (visibleWordCloudTerms.length - wordCloudVisibleLimit) + ' ' + tr('remaining') + ')') : null
            ) : wordCloudTermsForActive.length > 0 ? ce('p', { role: 'status', style: { margin: 0, padding: '0.55rem', borderRadius: 6, background: '#fff7ed', color: '#9a3412', fontSize: '0.76rem', fontWeight: 750 } }, tr('No submitted terms match this moderation filter.')) : null
          ) : null,
          !activeFeedbackConfig.enabled && activePoll.type !== 'wordcloud' && summaryForActive && summaryForActive.items && summaryForActive.items.length > 0 ? ce('div', { style: { marginTop: 10, background: 'rgba(255,255,255,0.72)', border: '1px solid #dbeafe', borderRadius: 8, padding: '0.55rem', display: 'flex', flexDirection: 'column', gap: 6 } },
            ce('div', { style: { fontSize: '0.74rem', color: '#1e3a8a', fontWeight: 800, textTransform: 'uppercase' } }, tr('Anonymous summary')),
            summaryForActive.items.map(function (item, i) {
              const pct = Math.max(0, Math.min(100, Number(item.percent) || 0));
              return ce('div', { key: String(item.value || item.label || i), style: { display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) minmax(120px, 2fr) auto', gap: 8, alignItems: 'center', fontSize: '0.78rem', color: '#0f172a' } },
                ce('span', { style: { fontWeight: 700, overflowWrap: 'anywhere' } }, item.label || String(item.value || tr('Response'))),
                ce('span', { style: { height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' } },
                  ce('span', { style: { display: 'block', width: pct + '%', height: '100%', background: '#2563eb' } })
                ),
                ce('span', { style: { color: '#475569', fontVariantNumeric: 'tabular-nums' } }, (Number(item.count) || 0) + ' / ' + pct + '%')
              );
            })
          ) : null,
          // Aggregate routing summary (teacher-only; counts per group)
          activePoll && Array.isArray(activePoll.routingRules) && activePoll.routingRules.length > 0
            ? (function () {
                const counts = {};
                const routedMap = routingByPoll[activePoll.id] || {};
                Object.keys(routedMap).forEach(function (uid) {
                  if (!activeParticipantUidSet.has(String(uid))) return;
                  const gid = routedMap[uid];
                  counts[gid] = (counts[gid] || 0) + 1;
                });
                const entries = Object.keys(counts);
                if (entries.length === 0) return null;
                return ce('div', { style: { marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  ce('span', { style: { fontWeight: 600, color: '#1e3a8a' } }, tr('Auto-routed:')),
                  entries.map(function (gid) {
                    return ce('span', { key: gid, style: { background: '#eef2ff', color: '#1e3a8a', padding: '0.1rem 0.5rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 } },
                      counts[gid] + ' → ' + groupNameById(gid));
                  })
                );
              })()
            : null,
          !activeFeedbackConfig.enabled && activePoll.type === 'freetext' && uniqueActiveResponses.length > 0 ? ce('section', { 'aria-label': tr('Peer showcase moderation'), style: { marginTop: 10, padding: '0.65rem', background: 'rgba(255,255,255,0.88)', border: '1px solid #a5b4fc', borderRadius: 8 } },
            ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' } },
              ce('div', null,
                ce('div', { style: { fontSize: '0.74rem', color: '#3730a3', fontWeight: 900, textTransform: 'uppercase' } }, tr('Peer showcase')),
                ce('p', { style: { margin: '0.2rem 0 0', color: '#475569', fontSize: '0.73rem', lineHeight: 1.35 } }, tr('Responses stay private until you approve 2-8 exemplars. Students vote anonymously against your criterion.'))
              ),
              ce('span', { style: { color: '#4338ca', fontWeight: 900, fontSize: '0.72rem' } }, approvedPeerShowcaseRows.length + ' / ' + PEER_SHOWCASE_MAX_CANDIDATES + ' ' + tr('approved'))
            ),
            ce('label', { style: { display: 'block', marginTop: 7, color: '#312e81', fontSize: '0.7rem', fontWeight: 800 } },
              tr('Voting criterion'),
              ce('input', {
                type: 'text',
                value: peerVoteCriterion,
                maxLength: PEER_VOTE_CRITERION_MAX_LENGTH,
                disabled: !!peerShowcaseRound,
                onChange: function (e) { setPeerVoteCriterion(e.target.value); },
                'aria-label': tr('Peer voting criterion'),
                style: { width: '100%', marginTop: 3, padding: '0.42rem 0.5rem', border: '1px solid #c7d2fe', borderRadius: 6, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.76rem' }
              })
            ),
            ce('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 260, overflowY: 'auto', marginTop: 7 } },
              peerShowcaseReviewRows.map(function (row) {
                return ce('div', { key: row.uid, role: 'listitem', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 7, alignItems: 'center', padding: '0.45rem 0.5rem', border: '1px solid #e2e8f0', borderRadius: 7, background: 'white' } },
                  ce('div', { style: { minWidth: 0 } },
                    ce('strong', { style: { display: 'block', color: '#1e3a8a', fontSize: '0.73rem' } }, row.codename),
                    ce('div', { style: { marginTop: 2, color: '#1e293b', fontSize: '0.78rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, row.response)
                  ),
                  ce('select', {
                    value: row.status,
                    disabled: !!peerShowcaseRound,
                    onChange: function (e) { setFreeTextResponseStatus(row.uid, e.target.value); },
                    'aria-label': tr('Moderation for') + ' ' + row.codename,
                    style: { padding: '0.3rem 0.4rem', borderRadius: 5, border: '1px solid #cbd5e1', background: row.status === 'approved' ? '#dcfce7' : row.status === 'hidden' ? '#f1f5f9' : '#fff7ed', fontSize: '0.72rem', fontWeight: 800 }
                  },
                    ce('option', { value: 'pending' }, tr('Hold')),
                    ce('option', { value: 'approved' }, tr('Approve')),
                    ce('option', { value: 'hidden' }, tr('Hide'))
                  )
                );
              })
            ),
            !peerShowcaseRound ? ce('button', {
              onClick: startPeerShowcase,
              disabled: approvedPeerShowcaseRows.length < PEER_SHOWCASE_MIN_CANDIDATES,
              style: { width: '100%', marginTop: 7, padding: '0.5rem', border: 'none', borderRadius: 6, background: approvedPeerShowcaseRows.length >= PEER_SHOWCASE_MIN_CANDIDATES ? '#4f46e5' : '#cbd5e1', color: 'white', fontWeight: 900, cursor: approvedPeerShowcaseRows.length >= PEER_SHOWCASE_MIN_CANDIDATES ? 'pointer' : 'default' }
            }, tr('Open anonymous peer vote')) : null,
            peerShowcaseRound && peerShowcaseRound.phase === 'voting' ? ce('div', { style: { marginTop: 8, padding: '0.55rem', borderRadius: 7, background: '#eef2ff' } },
              ce('p', { role: 'status', style: { margin: 0, color: '#312e81', fontSize: '0.76rem', fontWeight: 800 } }, Object.keys(peerVotesForActiveRound).length + ' ' + tr('votes received. Candidate totals stay hidden until you close voting.')),
              ce('div', { style: { display: 'flex', gap: 6, marginTop: 6 } },
                ce('button', { onClick: finishPeerShowcase, style: { flex: 1, padding: '0.45rem', border: 'none', borderRadius: 6, background: '#4f46e5', color: 'white', fontWeight: 900, cursor: 'pointer' } }, tr('Close voting and reveal')),
                ce('button', { onClick: cancelPeerShowcase, style: { padding: '0.45rem 0.7rem', border: '1px solid #a5b4fc', borderRadius: 6, background: 'white', color: '#4338ca', fontWeight: 800, cursor: 'pointer' } }, tr('Cancel'))
              )
            ) : null,
            peerShowcaseRound && peerShowcaseRound.phase === 'results' && peerShowcaseRound.results ? ce('div', { style: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 } },
              ce('strong', { style: { color: '#312e81', fontSize: '0.76rem' } }, peerShowcaseRound.results.votesCast + ' ' + tr('votes cast')),
              peerShowcaseRound.results.candidates.map(function (candidate) {
                const internal = peerShowcaseRound.candidates.find(function (item) { return item.candidateId === candidate.candidateId; }) || {};
                const owner = guests.find(function (item) { return item.uid === internal.ownerUid; }) || roster[internal.ownerUid] || {};
                const ownerGroupId = roster[internal.ownerUid] && roster[internal.ownerUid].groupId;
                return ce('div', { key: candidate.candidateId, style: { padding: '0.5rem', border: '1px solid #c7d2fe', borderRadius: 7, background: 'white' } },
                  ce('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, color: '#1e293b', fontSize: '0.78rem' } },
                    ce('span', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, candidate.response),
                    ce('strong', { style: { color: '#4338ca', whiteSpace: 'nowrap' } }, candidate.count + ' / ' + candidate.percent + '%')
                  ),
                  ce('div', { style: { marginTop: 4, color: '#64748b', fontSize: '0.66rem' } }, tr('Teacher view - author:') + ' ' + (owner.codename || owner.name || tr('Student'))),
                  onUsePeerShowcaseResponse ? ce('button', {
                    onClick: function () {
                      onUsePeerShowcaseResponse(candidate.response, {
                        pollId: peerShowcaseRound.pollId,
                        roundId: peerShowcaseRound.roundId,
                        candidateId: candidate.candidateId,
                        votes: candidate.count,
                        percent: candidate.percent,
                      });
                    },
                    style: { marginTop: 4, padding: '0.25rem 0.4rem', border: '1px solid #34d399', borderRadius: 5, background: '#ecfdf5', color: '#065f46', fontSize: '0.64rem', fontWeight: 900, cursor: 'pointer' }
                  }, tr('Use as Adventure action')) : null,
                  followUpResourceId && onSendToStudent ? ce('button', {
                    onClick: function () { onSendToStudent(internal.ownerUid, followUpResourceId); },
                    style: { marginTop: 4, padding: '0.25rem 0.4rem', border: '1px solid #a5b4fc', borderRadius: 5, background: '#eef2ff', color: '#3730a3', fontSize: '0.64rem', fontWeight: 800, cursor: 'pointer' }
                  }, tr('Send follow-up to author')) : null,
                  followUpResourceId && ownerGroupId && onSendToGroup ? ce('button', {
                    onClick: function () { onSendToGroup(ownerGroupId, followUpResourceId); },
                    style: { marginTop: 4, marginLeft: 4, padding: '0.25rem 0.4rem', border: '1px solid #a5b4fc', borderRadius: 5, background: 'white', color: '#3730a3', fontSize: '0.64rem', fontWeight: 800, cursor: 'pointer' }
                  }, tr('Send to author group')) : null
                );
              }),
              resources.length > 0 ? ce('select', {
                value: followUpResourceId,
                onChange: function (e) { setFollowUpResourceId(e.target.value); },
                'aria-label': tr('Peer showcase follow-up resource'),
                style: { padding: '0.4rem', border: '1px solid #c7d2fe', borderRadius: 6, background: 'white', fontSize: '0.72rem' }
              },
                ce('option', { value: '' }, tr('Choose an optional follow-up resource')),
                resources.map(function (resource) { return ce('option', { key: resource.id, value: resource.id }, resource.title || resource.label || resource.type || resource.id); })
              ) : null,
              ce('button', { onClick: cancelPeerShowcase, style: { padding: '0.4rem', border: '1px solid #a5b4fc', borderRadius: 6, background: 'white', color: '#4338ca', fontWeight: 800, cursor: 'pointer' } }, tr('Close showcase'))
            ) : null,
            ce('p', { style: { margin: '0.45rem 0 0', color: '#64748b', fontSize: '0.65rem', lineHeight: 1.35 } }, tr('Candidate text is shared only after teacher approval. Votes and author identities remain on the teacher device.'))
          ) : null,
          !activeFeedbackConfig.enabled && activePoll.type !== 'wordcloud' && activePoll.type !== 'freetext' && uniqueActiveResponses.length > 0 ? ce('ul', { style: { listStyle: 'none', padding: 0, margin: '0.5rem 0 0 0', maxHeight: 240, overflow: 'auto' } },
            uniqueActiveResponses.map(function (r, i) {
              const display = typeof r.response === 'object' ? JSON.stringify(r.response) : String(r.response);
              return ce('li', { key: i, style: { padding: '0.4rem 0.6rem', background: 'white', borderRadius: 4, marginBottom: 4, fontSize: '0.85rem', borderLeft: '3px solid #1e3a8a', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
                ce('strong', { style: { color: '#1e3a8a' } }, r.codename),
                ce('span', null, display),
                r.routedToGroupId ? ce('span', { style: { marginLeft: 'auto', background: '#dcfce7', color: '#166534', padding: '0.1rem 0.5rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 } }, '-> ' + groupNameById(r.routedToGroupId)) : null
              );
            })
          ) : null
        ) : ce('p', { style: { fontSize: '0.8rem', color: '#64748b', marginTop: 0 } }, tr('No active poll. Compose above and broadcast to start.')),
        ce('section', { 'data-live-workspace-section': 'wrap-up', tabIndex: -1, 'aria-labelledby': 'live-session-wrap-up-title', style: { scrollMarginTop: 76, marginTop: '0.8rem', padding: '0.7rem', border: '1px solid #a7f3d0', borderRadius: 9, background: '#ecfdf5' } },
          ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' } },
            ce('div', null,
              ce('h3', { id: 'live-session-wrap-up-title', style: { margin: 0, color: '#065f46', fontSize: '0.9rem' } }, tr('Session wrap-up')),
              ce('p', { style: { margin: '0.2rem 0 0', color: '#047857', fontSize: '0.68rem' } }, tr('A content-free readiness check before you end the live session.'))
            ),
            ce('button', { type: 'button', onClick: function () { setWrapUpExpanded(function (value) { return !value; }); }, 'aria-expanded': wrapUpExpanded, 'aria-controls': 'live-session-wrap-up-details', style: { minHeight: 40, padding: '0.35rem 0.55rem', border: '1px solid #059669', borderRadius: 6, background: 'white', color: '#047857', fontWeight: 850, fontSize: '0.68rem', cursor: 'pointer' } }, wrapUpExpanded ? tr('Hide wrap-up') : tr('Review and end'))
          ),
          ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6, marginTop: 7 } },
            [
              [tr('Duration'), formatLiveElapsed(sessionWrapUp.durationMs)],
              [tr('Activities'), sessionWrapUp.activityCount],
              [tr('Poll response rate'), sessionWrapUp.responseRate + '%'],
              [tr('Needs attention'), sessionWrapUp.unresolvedCount],
            ].map(function (metric) { return ce('div', { key: metric[0], style: { padding: '0.45rem', border: '1px solid #a7f3d0', borderRadius: 7, background: 'white' } }, ce('strong', { style: { display: 'block', color: '#064e3b', fontSize: '0.9rem' } }, metric[1]), ce('span', { style: { color: '#047857', fontSize: '0.64rem', fontWeight: 750 } }, metric[0])); })
          ),
          ce('div', { id: 'live-session-wrap-up-details', hidden: !wrapUpExpanded },
            sessionWrapUp.unresolvedCount || sessionWrapUp.pendingQuestionCount || sessionWrapUp.incompleteUids.length ? ce('div', { role: 'status', style: { marginTop: 7, padding: '0.5rem', border: '1px solid #fcd34d', borderRadius: 7, background: '#fffbeb', color: '#78350f', fontSize: '0.68rem', lineHeight: 1.45 } },
              sessionWrapUp.helpRequestCount ? sessionWrapUp.helpRequestCount + ' ' + tr('help requests') + '. ' : '',
              sessionWrapUp.deliveryFailureCount ? sessionWrapUp.deliveryFailureCount + ' ' + tr('delivery failures') + '. ' : '',
              sessionWrapUp.pendingQuestionCount ? sessionWrapUp.pendingQuestionCount + ' ' + tr('pending questions') + '. ' : '',
              sessionWrapUp.incompleteUids.length ? sessionWrapUp.incompleteUids.length + ' ' + tr('students incomplete across polls') + '.' : ''
            ) : ce('p', { role: 'status', style: { margin: '7px 0 0', color: '#166534', fontSize: '0.7rem', fontWeight: 850 } }, tr('No unresolved live-session follow-ups are visible.')),
            sessionWrapUp.timeline.length ? ce('ol', { 'aria-label': tr('Live session activity timeline'), style: { margin: '7px 0 0', paddingLeft: '1.25rem', color: '#334155', fontSize: '0.68rem' } }, sessionWrapUp.timeline.slice(0, 8).map(function (item) { return ce('li', { key: item.id, style: { marginBottom: 3 } }, tr(item.kind) + ' · ' + item.responded + '/' + item.invited + ' ' + tr('completed') + ' · ' + tr(item.phase)); })) : null,
            ce('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 } },
              sessionWrapUp.unresolvedCount ? ce('button', { type: 'button', onClick: function () { setStudentActivityExpanded(true); setStudentActivityFilter('attention'); setStudentActivityQuery(''); jumpToLiveWorkspaceSection('students'); }, style: { minHeight: 42, padding: '0.4rem 0.65rem', border: '1px solid #b45309', borderRadius: 6, background: 'white', color: '#92400e', fontWeight: 850, fontSize: '0.7rem', cursor: 'pointer' } }, tr('Review needs attention')) : null,
              ce('button', { type: 'button', onClick: openAlloSheetReview, disabled: !activePoll && completedPolls.length === 0, style: { minHeight: 42, padding: '0.4rem 0.65rem', border: '1px solid #2563eb', borderRadius: 6, background: 'white', color: (!activePoll && completedPolls.length === 0) ? '#94a3b8' : '#1d4ed8', fontWeight: 850, fontSize: '0.7rem', cursor: (!activePoll && completedPolls.length === 0) ? 'default' : 'pointer' } }, tr('Review aggregates')),
              onRequestEndSession ? ce('button', { type: 'button', onClick: onRequestEndSession, style: { minHeight: 42, padding: '0.4rem 0.65rem', border: '1px solid #b91c1c', borderRadius: 6, background: '#b91c1c', color: 'white', fontWeight: 850, fontSize: '0.7rem', cursor: 'pointer' } }, tr('End live session')) : null
            )
          )
        ),
        completedPolls.length ? ce('section', { 'data-live-workspace-section': 'recent', tabIndex: -1, 'aria-labelledby': 'live-recent-polls-title', style: { scrollMarginTop: 76, marginTop: '0.8rem', padding: '0.7rem', border: '1px solid #e2e8f0', borderRadius: 9, background: '#f8fafc' } },
          ce('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
            ce('h3', { id: 'live-recent-polls-title', style: { margin: 0, color: '#0f172a', fontSize: '0.9rem' } }, tr('Recent polls')),
            ce('span', { style: { color: '#64748b', fontSize: '0.68rem', fontWeight: 750 } }, tr('Teacher-authored prompts and aggregate counts only'))
          ),
          ce('div', { role: 'list', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6, marginTop: 7 } },
            completedPolls.slice(-6).reverse().map(function (entry) {
              const poll = entry && entry.poll ? entry.poll : {};
              const responseCount = uniqueResponsesForSummary(entry.responses || []).length;
              const audienceCount = Math.max(0, Number(entry.audienceCount) || 0);
              const completedUidSet = new Set(uniqueResponsesForSummary(entry.responses || []).map(function (row) { return String(row && row.uid || ''); }).filter(Boolean));
              const connectedUidSet = new Set(guests.map(function (guest) { return String(guest && guest.uid || ''); }).filter(Boolean));
              const incompleteConnectedCount = (Array.isArray(entry.audienceUids) ? entry.audienceUids : []).map(String).filter(function (uid) { return uid && !completedUidSet.has(uid) && connectedUidSet.has(uid); }).length;
              return ce('div', { key: poll.id || String(entry.endedAt), role: 'listitem', style: { minWidth: 0, padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: 7, background: 'white' } },
                ce('div', { style: { color: '#475569', fontSize: '0.65rem', fontWeight: 850, textTransform: 'uppercase' } }, tr(poll.type || 'poll')),
                ce('div', { title: poll.prompt || '', style: { marginTop: 2, color: '#0f172a', fontSize: '0.76rem', fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, poll.prompt || tr('Untitled poll')),
                ce('div', { style: { marginTop: 4, color: '#64748b', fontSize: '0.68rem', fontVariantNumeric: 'tabular-nums' } }, responseCount + ' / ' + audienceCount + ' ' + tr('responded')),
                ce('button', { type: 'button', disabled: !!activePoll, onClick: function () { reuseCompletedPoll(entry); }, style: { width: '100%', minHeight: 40, marginTop: 6, padding: '0.35rem 0.55rem', border: '1px solid #2563eb', borderRadius: 6, background: 'white', color: activePoll ? '#94a3b8' : '#1d4ed8', cursor: activePoll ? 'default' : 'pointer', fontWeight: 850, fontSize: '0.7rem' } }, activePoll ? tr('Finish active poll first') : tr('Use again')),
                incompleteConnectedCount ? ce('button', { type: 'button', disabled: !!activePoll, onClick: function () { relaunchCompletedPollForIncomplete(entry); }, style: { width: '100%', minHeight: 40, marginTop: 5, padding: '0.35rem 0.55rem', border: '1px solid #b45309', borderRadius: 6, background: '#fffbeb', color: activePoll ? '#94a3b8' : '#92400e', cursor: activePoll ? 'default' : 'pointer', fontWeight: 850, fontSize: '0.7rem' } }, tr('Relaunch for incomplete') + ' (' + incompleteConnectedCount + ')') : null
              );
            })
          )
        ) : null
      )
    ),

    renderStudentActivityDetail(),
    renderAlloSheetReview(),

    pendingEndAction !== null ? ce('div', {
      role: 'presentation',
      onMouseDown: function (event) { if (event.target === event.currentTarget) cancelPendingEnd(); },
      style: { position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(15,23,42,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }
    },
      ce('div', {
        ref: endPollDialogRef,
        tabIndex: -1,
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'live-polling-end-title',
        'aria-describedby': 'live-polling-end-summary live-polling-end-guidance',
        style: { width: '100%', maxWidth: 500, maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', background: 'white', border: '2px solid #f59e0b', borderRadius: 12, padding: '1.25rem', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }
      },
        ce('h2', { id: 'live-polling-end-title', style: { margin: '0 0 0.65rem', color: '#78350f', fontSize: '1.1rem' } }, pendingEndAction === 'panel' ? tr('End poll and close the dashboard?') : tr('End this poll?')),
        ce('p', { id: 'live-polling-end-summary', style: { margin: '0 0 0.55rem', color: '#1e293b', lineHeight: 1.5 } }, ce('strong', null, uniqueActiveResponses.length + ' / ' + responseGoalBase), ' ' + tr('students responded.') + (lastSharedResultsAt ? ' ' + tr('Anonymous results were shared.') : ' ' + tr('Results have not been shared.'))),
        ce('p', { id: 'live-polling-end-guidance', style: { margin: '0 0 1rem', color: '#475569', lineHeight: 1.5, fontSize: '0.84rem' } }, tr('Ending saves this poll in Recent Polls for review or reuse. Students can no longer submit to it.')),
        ce('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' } },
          ce('button', { ref: endPollCancelRef, type: 'button', onClick: cancelPendingEnd, style: { minHeight: 44, padding: '0.6rem 0.9rem', border: '1px solid #94a3b8', borderRadius: 7, background: 'white', color: '#334155', cursor: 'pointer', fontWeight: 800 } }, tr('Keep poll open')),
          ce('button', { type: 'button', onClick: confirmPendingEnd, style: { minHeight: 44, padding: '0.6rem 0.9rem', border: '1px solid #b45309', borderRadius: 7, background: '#b45309', color: 'white', cursor: 'pointer', fontWeight: 850 } }, pendingEndAction === 'panel' ? tr('End poll and close') : tr('End poll'))
        )
      )
    ) : null,

    pendingGroupName !== null ? ce('div', {
      role: 'presentation',
      onClick: function (event) { if (event.target === event.currentTarget) cancelPendingGroupName(); },
      style: { position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(15,23,42,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }
    },
      ce('div', {
        ref: groupNameDialogRef,
        tabIndex: -1,
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'live-polling-group-warning-title',
        'aria-describedby': 'live-polling-group-warning-message live-polling-group-warning-guidance',
        style: { width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', background: 'white', border: '2px solid #f59e0b', borderRadius: 12, padding: '1.25rem', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }
      },
        ce('h2', { id: 'live-polling-group-warning-title', style: { margin: '0 0 0.75rem', color: '#78350f', fontSize: '1.1rem' } }, tr('Use this group name?')),
        ce('p', { id: 'live-polling-group-warning-message', style: { margin: '0 0 0.65rem', color: '#1e293b', lineHeight: 1.5 } }, tr('"{name}" looks like an ability-tiered group name.', { name: pendingGroupName })),
        ce('p', { id: 'live-polling-group-warning-guidance', style: { margin: '0 0 1rem', color: '#475569', lineHeight: 1.5 } }, tr('EL/UDL practice recommends neutral or theme-based names such as Indigo, Sage, Pirate Crew, or Space Crew.')),
        ce('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' } },
          ce('button', { ref: groupNameCancelRef, type: 'button', onClick: cancelPendingGroupName, style: { minHeight: 44, padding: '0.6rem 0.9rem', border: '1px solid #94a3b8', borderRadius: 7, background: 'white', color: '#334155', cursor: 'pointer', fontWeight: 800 } }, tr('Choose a neutral name')),
          ce('button', { type: 'button', onClick: confirmPendingGroupName, style: { minHeight: 44, padding: '0.6rem 0.9rem', border: '1px solid #b45309', borderRadius: 7, background: '#b45309', color: 'white', cursor: 'pointer', fontWeight: 800 } }, tr('Use anyway'))
        )
      )
    ) : null
  );
  };

  const GuestOverlay = !R ? null : function GuestOverlay(props) {
    useLivePollingI18n();
    const sessionCode = props.sessionCode;
    const userUid = props.userUid;
    const codename = props.codename;
    // hostActive: Tier-1 presence marker (sessionData.livePolling.hostActive)
    // written by HostPanel. Gates joining so guests only dial while a host is
    // actually listening — otherwise every closed-panel minute becomes
    // signaling churn (offer writes) against nobody. `undefined` (older
    // shells that don't pass it) keeps the legacy always-on behavior.
    const hostActive = props.hostActive;
    const hostNonce = props.hostNonce || 0;
    // Off by default: host and guest shells must explicitly opt into Q&A.
    const sessionQaOptIn = props.enableSessionQa === true;
    const enabled = !!(sessionCode && userUid && props.enabled && hostActive !== false);
    const sessionSupportActivityId = buildLiveSessionSupportActivityId(sessionCode);
    const guestRef = R.useRef(null);
    const pollDialogRef = R.useRef(null);
    const [activePoll, setActivePoll] = R.useState(null);
    const [pollMinimized, setPollMinimized] = R.useState(false);
    const [submitted, setSubmitted] = R.useState(false);
    const [responseValue, setResponseValue] = R.useState('');
    const [sharedResults, setSharedResults] = R.useState(null);
    const [peerShowcase, setPeerShowcase] = R.useState(null);
    const [peerVoteSelection, setPeerVoteSelection] = R.useState('');
    const [peerVoteSubmitted, setPeerVoteSubmitted] = R.useState(false);
    const [peerVoteResults, setPeerVoteResults] = R.useState(null);
    const [sessionQaState, setSessionQaState] = R.useState(null);
    const [sessionQaViewOpen, setSessionQaViewOpen] = R.useState(false);
    const [sessionQaDraft, setSessionQaDraft] = R.useState(function () {
      const restored = readLiveSessionQaDraft(sessionCode, userUid);
      return restored ? restored.text : '';
    });
    const [sessionQaSortMode, setSessionQaSortMode] = R.useState('latest');
    const [sessionQaNotice, setSessionQaNotice] = R.useState(null);
    const [supportTrayExpanded, setSupportTrayExpanded] = R.useState(false);
    const [connectionState, setConnectionState] = R.useState('idle');
    const [submitNotice, setSubmitNotice] = R.useState(null);
    const [teacherCheckIn, setTeacherCheckIn] = R.useState(null);
    const [helpRequested, setHelpRequested] = R.useState(false);
    const [studentFeedback, setStudentFeedback] = R.useState(null);
    const [currentAttempt, setCurrentAttempt] = R.useState(1);
    const [submittedResponse, setSubmittedResponse] = R.useState('');
    const studentPollIdRef = R.useRef(null);
    const statusSentRef = R.useRef('');
    const helpRequestedRef = R.useRef(false);
    const helpActivityIdRef = R.useRef('');
    // Auto-rejoin: bumping joinNonce re-runs the join effect with a fresh
    // PollingGuest (fresh offer/signaling doc). The host accepts re-offers,
    // so this is the student half of the reconnect story.
    const [joinNonce, setJoinNonce] = R.useState(0);
    const retryCountRef = R.useRef(0);
    const retryTimerRef = R.useRef(null);
    const hostNonceRef = R.useRef(hostNonce);
    const guestTransportKind = normalizeLiveTransportKind(props.transportKind);
    const guestTransportLabel = guestTransportKind === 'mailbox' ? tr('Google Mailbox live') : guestTransportKind === 'lan' ? tr('Local network live') : tr('Firebase live');

    R.useEffect(function () {
      if (!enabled) return undefined;
      let disposed = false;
      // A fresh hostOpenedAt means the teacher (re)opened the panel: reset the
      // retry budget so dormant guests wake up and dial again.
      if (hostNonceRef.current !== hostNonce) {
        hostNonceRef.current = hostNonce;
        retryCountRef.current = 0;
      }
      const REJOIN_DELAYS_MS = [2000, 5000, 10000, 20000, 30000];
      // Cap auto-rejoins so a stale hostActive marker (teacher tab crashed
      // without cleanup) can't generate signaling churn forever; a hostNonce
      // change re-arms the budget.
      const MAX_AUTO_REJOINS = 8;
      const scheduleRejoin = function () {
        if (disposed) return;
        if (retryCountRef.current >= MAX_AUTO_REJOINS) return;
        const delay = REJOIN_DELAYS_MS[Math.min(retryCountRef.current, REJOIN_DELAYS_MS.length - 1)];
        retryCountRef.current += 1;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(function () {
          retryTimerRef.current = null;
          setJoinNonce(function (n) { return n + 1; });
        }, delay);
      };
      setConnectionState(function (prev) { return prev === 'connected' ? prev : 'connecting'; });
      const guest = new PollingGuest({
        sessionCode: sessionCode,
        userUid: userUid,
        codename: codename,
        onPoll: function (p) {
          const samePoll = !!(p && studentPollIdRef.current === p.id);
          studentPollIdRef.current = p && p.id;
          setActivePoll(p);
          setSharedResults(null);
          if (!samePoll) {
            const savedDraft = p ? readLivePollDraft(sessionCode, userUid, p.id) : null;
            setPeerShowcase(null);
            setPeerVoteSelection('');
            setPeerVoteSubmitted(false);
            setPeerVoteResults(null);
            setSubmitted(false);
            setResponseValue(savedDraft && savedDraft.type === p.type ? savedDraft.value : '');
            setSubmittedResponse('');
            setStudentFeedback(null);
            setTeacherCheckIn(null);
            setHelpRequested(false);
            helpRequestedRef.current = false;
            helpActivityIdRef.current = '';
            setCurrentAttempt(1);
            statusSentRef.current = '';
            setPollMinimized(false);
            if (savedDraft && savedDraft.type === p.type) setSubmitNotice(tr('Draft restored from this browser.'));
          }
          if (samePoll) setSubmitNotice(p && p.type === 'wordcloud' && p.submissionsLocked ? tr('The teacher paused new terms while reviewing the word cloud. Your draft is still saved.') : null);
        },
        onPollClose: function (payload) {
          setActivePoll(function (current) {
            if (!shouldApplyPollClose(current, payload)) return current;
            if (current) clearLivePollDraft(sessionCode, userUid, current.id);
            setSubmitted(false);
            setResponseValue('');
            setSubmittedResponse('');
            setStudentFeedback(null);
            setTeacherCheckIn(null);
            setHelpRequested(false);
            helpRequestedRef.current = false;
            helpActivityIdRef.current = '';
            setPollMinimized(false);
            setCurrentAttempt(1);
            studentPollIdRef.current = null;
            statusSentRef.current = '';
            setSubmitNotice(null);
            setPeerShowcase(null);
            setPeerVoteSelection('');
            setPeerVoteSubmitted(false);
            return null;
          });
        },
        onPollResults: function (summary) {
          clearLivePollDraft(sessionCode, userUid, (summary && summary.pollId) || studentPollIdRef.current);
          setSharedResults(summary); setActivePoll(null); setSubmitted(false); setResponseValue('');
          setSubmittedResponse(''); setStudentFeedback(null); setCurrentAttempt(1);
          setTeacherCheckIn(null);
          setHelpRequested(false);
          helpRequestedRef.current = false;
          helpActivityIdRef.current = '';
          setPollMinimized(false);
          setPeerShowcase(null); setPeerVoteSelection(''); setPeerVoteSubmitted(false);
          studentPollIdRef.current = null; statusSentRef.current = ''; setSubmitNotice(null);
        },
        onPeerShowcase: function (round) {
          setPeerShowcase(function (current) {
            if (!current || current.roundId !== round.roundId) {
              setPeerVoteSelection('');
              setPeerVoteSubmitted(false);
            }
            return round;
          });
          setPeerVoteResults(null);
          setSharedResults(null);
        },
        onPeerVoteResults: function (results) {
          setPeerVoteResults(results);
          setPeerShowcase(null);
        },
        onPeerShowcaseClose: function (payload) {
          setPeerShowcase(function (current) {
            if (current && payload && payload.roundId && current.roundId !== payload.roundId) return current;
            return null;
          });
          setPeerVoteSelection('');
          setPeerVoteSubmitted(false);
        },
        onSessionQaState: function (packet) {
          if (!sessionQaOptIn) return;
          setSessionQaState(packet);
          if (!packet || !packet.enabled) setSessionQaViewOpen(false);
        },
        onSessionQaFeatured: function (packet) {
          if (!sessionQaOptIn) return;
          setSessionQaState(function (current) {
            return current ? Object.assign({}, current, { featuredQuestion: packet || null }) : current;
          });
        },
        onFeedback: function (packet) {
          setActivePoll(function (current) {
            if (current && current.id === packet.pollId && isFeedbackPoll(current)) {
              setStudentFeedback(packet);
              setSubmitted(true);
            }
            return current;
          });
        },
        onCheckIn: function (packet) {
          if (packet && (packet.activityId === sessionSupportActivityId || packet.activityId === studentPollIdRef.current)) {
            setTeacherCheckIn(Object.assign({}, packet, { status: 'received' }));
            setSupportTrayExpanded(true);
          }
        },
        onHostClosed: function () {
          // Terminal event: the teacher closed the polling panel. Force-clear
          // any active poll so the student is never left answering into a dead
          // channel; keep already-shared results readable. Rejoin quietly in
          // the background so we reconnect if the teacher reopens the panel.
          setActivePoll(null);
          setPollMinimized(false);
          setSubmitted(false);
          setResponseValue('');
          setSubmittedResponse('');
          setStudentFeedback(null);
          setTeacherCheckIn(null);
          setHelpRequested(false);
          helpRequestedRef.current = false;
          helpActivityIdRef.current = '';
          setCurrentAttempt(1);
          setPeerShowcase(null);
          setPeerVoteSelection('');
          setPeerVoteSubmitted(false);
          setPeerVoteResults(null);
          setSessionQaState(null);
          setSessionQaViewOpen(false);
          setSessionQaNotice(null);
          studentPollIdRef.current = null;
          statusSentRef.current = '';
          setSubmitNotice(null);
          setConnectionState('reconnecting');
          scheduleRejoin();
        },
        onConnected: function () {
          retryCountRef.current = 0;
          setConnectionState('connected');
          setSubmitNotice(null);
          if (helpRequestedRef.current && helpActivityIdRef.current) guest.sendHelpRequest(helpActivityIdRef.current, true);
        },
        onDisconnected: function () { setConnectionState('reconnecting'); scheduleRejoin(); },
        onFailed: function () {
          setConnectionState(function (prev) { return prev === 'connected' ? prev : 'failed'; });
          scheduleRejoin();
        },
      });
      guestRef.current = guest;
      guest.join().catch(function (err) { console.warn('[LivePolling GuestOverlay] join failed', err); setConnectionState('failed'); scheduleRejoin(); });
      return function () {
        disposed = true;
        if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
        guest.leave();
        guestRef.current = null;
      };
    }, [enabled, sessionCode, userUid, codename, joinNonce, hostNonce, sessionQaOptIn]);

    R.useEffect(function () { helpRequestedRef.current = helpRequested; }, [helpRequested]);

    R.useEffect(function () {
      const restored = readLiveSessionQaDraft(sessionCode, userUid);
      setSessionQaDraft(restored ? restored.text : '');
    }, [sessionCode, userUid]);

    R.useEffect(function () {
      writeLiveSessionQaDraft(sessionCode, userUid, sessionQaDraft);
    }, [sessionCode, userUid, sessionQaDraft]);

    R.useEffect(function () {
      if (!activePoll || submitted) return;
      writeLivePollDraft(sessionCode, userUid, activePoll, responseValue);
    }, [sessionCode, userUid, activePoll, responseValue, submitted]);

    R.useEffect(function () {
      if (!activePoll || !isFeedbackPoll(activePoll) || submitted) return;
      if (!normalizeFeedbackResponseText(responseValue)) return;
      const key = activePoll.id + ':' + currentAttempt + ':drafting';
      if (statusSentRef.current === key) return;
      if (guestRef.current && guestRef.current.sendResponseStatus(activePoll.id, 'drafting', currentAttempt)) {
        statusSentRef.current = key;
      }
    }, [activePoll, responseValue, submitted, currentAttempt, connectionState]);

    const renderResultsSummary = function (summary) {
      const items = Array.isArray(summary && summary.items) ? summary.items : [];
      const total = Number(summary && summary.totalResponses) || 0;
      const sharedCount = summary && summary.wordCloud ? (Number(summary.approvedResponseCount) || 0) : total;
      return ce('div', {
        role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Shared poll results'),
        style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }
      },
        ce('div', { style: { background: 'white', maxWidth: 560, width: '100%', borderRadius: 12, padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } },
          ce('div', { style: { fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 } }, tr('Anonymous class results')),
          ce('h2', { style: { margin: '0 0 0.4rem 0', fontSize: '1.1rem', color: '#0f172a' } }, (summary && summary.prompt) || tr('Poll results')),
          ce('p', { style: { margin: '0 0 0.8rem 0', color: '#475569', fontSize: '0.85rem' } }, tr(sharedCount === 1 ? '{n} response shared by the teacher.' : '{n} responses shared by the teacher.', { n: sharedCount })),
          summary && summary.wordCloud ? ce('div', { style: { marginBottom: 10 } },
            renderWordCloudItems(items, tr('Teacher-approved anonymous word cloud')),
            ce('p', { style: { fontSize: '0.75rem', color: '#64748b', margin: '0.45rem 0 0 0' } }, tr('Only anonymous terms approved by the teacher are shown.'))
          ) : items.length > 0 ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 } },
            items.map(function (item, i) {
              const percent = Math.max(0, Math.min(100, Number(item.percent) || 0));
              return ce('div', { key: String(item.value || item.label || i), style: { border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.55rem' } },
                ce('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 } },
                  ce('strong', null, item.label || String(item.value || tr('Response'))),
                  ce('span', null, (Number(item.count) || 0) + ' (' + percent + '%)')
                ),
                ce('div', { style: { height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' } },
                  ce('div', { style: { width: percent + '%', height: '100%', background: '#2563eb' } })
                )
              );
            })
          ) : null,
          summary && summary.freeTextSuppressed ? ce('p', { style: { fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.8rem 0' } }, tr('Free-text answers stay private on the teacher device; only the response count is shared.')) : null,
          ce('button', { onClick: function () { setSharedResults(null); }, style: { padding: '0.6rem 1.2rem', borderRadius: 6, border: 'none', background: '#1e3a8a', color: 'white', cursor: 'pointer', fontWeight: 700, width: '100%' } }, tr('Close results'))
        )
      );
    };

    const renderPeerVoteResults = function (results) {
      const candidates = Array.isArray(results && results.candidates) ? results.candidates : [];
      return ce('div', {
        role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Peer voting results'),
        style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }
      },
        ce('div', { style: { background: 'white', maxWidth: 620, width: '100%', maxHeight: '88vh', overflowY: 'auto', borderRadius: 12, padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } },
          ce('div', { style: { color: '#4338ca', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase' } }, tr('Anonymous peer showcase')),
          ce('h2', { style: { margin: '0.25rem 0', color: '#0f172a', fontSize: '1.08rem' } }, (results && results.criterion) || tr('Peer voting results')),
          ce('p', { style: { margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.78rem' } }, (Number(results && results.votesCast) || 0) + ' ' + tr('votes cast. Discuss the reasoning, not who wrote it.')),
          ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 7 } },
            candidates.map(function (candidate) {
              return ce('div', { key: candidate.candidateId, style: { padding: '0.65rem', border: '1px solid #c7d2fe', borderRadius: 8, background: '#f8fafc' } },
                ce('div', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: '#1e293b', fontSize: '0.84rem' } }, candidate.response),
                ce('div', { style: { marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 } },
                  ce('span', { style: { flex: 1, height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' } },
                    ce('span', { style: { display: 'block', width: (Number(candidate.percent) || 0) + '%', height: '100%', background: '#6366f1' } })
                  ),
                  ce('strong', { style: { color: '#4338ca', fontSize: '0.75rem', whiteSpace: 'nowrap' } }, (Number(candidate.count) || 0) + ' / ' + (Number(candidate.percent) || 0) + '%')
                )
              );
            })
          ),
          ce('button', { onClick: function () { setPeerVoteResults(null); }, style: { marginTop: 10, width: '100%', padding: '0.55rem', border: 'none', borderRadius: 6, background: '#4338ca', color: 'white', fontWeight: 900, cursor: 'pointer' } }, tr('Close results'))
        )
      );
    };
    const renderPeerShowcase = function (round) {
      const candidates = Array.isArray(round && round.candidates) ? round.candidates : [];
      const canSendVote = !!(peerVoteSelection && guestRef.current && connectionState === 'connected');
      const sendVote = function () {
        if (!canSendVote) return;
        if (guestRef.current.sendPeerVote(round.roundId, peerVoteSelection)) setPeerVoteSubmitted(true);
      };
      return ce('div', {
        role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Anonymous peer showcase'),
        style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }
      },
        ce('div', { style: { background: 'white', maxWidth: 620, width: '100%', maxHeight: '88vh', overflowY: 'auto', borderRadius: 12, padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } },
          ce('div', { style: { color: '#4338ca', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase' } }, tr('Anonymous peer showcase')),
          ce('h2', { style: { margin: '0.25rem 0', color: '#0f172a', fontSize: '1.08rem' } }, round.criterion),
          ce('p', { style: { margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.78rem' } }, tr('Choose the response that best meets the criterion. You may update your vote until the teacher closes voting.')),
          ce('div', { role: 'radiogroup', 'aria-label': tr('Peer showcase responses'), style: { display: 'flex', flexDirection: 'column', gap: 7 } },
            candidates.map(function (candidate) {
              const selected = peerVoteSelection === candidate.candidateId;
              return ce('button', {
                key: candidate.candidateId,
                type: 'button',
                role: 'radio',
                'aria-checked': selected,
                disabled: candidate.own,
                onClick: function () { if (!candidate.own) { setPeerVoteSelection(candidate.candidateId); setPeerVoteSubmitted(false); } },
                style: { textAlign: 'left', padding: '0.7rem', border: '2px solid ' + (selected ? '#4f46e5' : '#cbd5e1'), borderRadius: 8, background: candidate.own ? '#f8fafc' : selected ? '#eef2ff' : 'white', color: candidate.own ? '#64748b' : '#1e293b', cursor: candidate.own ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }
              },
                ce('span', { style: { display: 'block', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.84rem' } }, candidate.response),
                candidate.own ? ce('small', { style: { display: 'block', marginTop: 4, color: '#64748b', fontWeight: 800 } }, tr('Your response - choose a classmate idea.')) : null
              );
            })
          ),
          ce('button', { onClick: sendVote, disabled: !canSendVote, style: { marginTop: 10, width: '100%', padding: '0.55rem', border: 'none', borderRadius: 6, background: canSendVote ? '#4f46e5' : '#cbd5e1', color: 'white', fontWeight: 900, cursor: canSendVote ? 'pointer' : 'default' } }, peerVoteSubmitted ? tr('Update vote') : tr('Submit vote')),
          peerVoteSubmitted ? ce('p', { role: 'status', style: { margin: '0.5rem 0 0', color: '#166534', fontSize: '0.75rem', fontWeight: 800 } }, tr('Vote recorded. Totals will appear when the teacher closes voting.')) : null,
          connectionState !== 'connected' ? ce('p', { role: 'status', style: { margin: '0.5rem 0 0', color: '#b45309', fontSize: '0.72rem' } }, tr('Reconnect to cast or update your vote.')) : null
        )
      );
    };


    const renderSessionQaLauncher = function () {
      const approvedCount = sessionQaState && Array.isArray(sessionQaState.questions)
        ? sessionQaState.questions.filter(function (question) { return question.status === 'approved'; }).length
        : 0;
      return ce('button', {
        type: 'button',
        onClick: function () { setSessionQaViewOpen(true); setSessionQaNotice(null); },
        'aria-label': tr('Open live questions and answers'),
        style: { position: 'fixed', right: '1rem', bottom: '1rem', zIndex: 9998, minHeight: 44, padding: '0.6rem 0.9rem', border: '1px solid #0284c7', borderRadius: 999, background: '#0369a1', color: 'white', boxShadow: '0 8px 24px rgba(15,23,42,0.25)', fontWeight: 900, cursor: 'pointer' }
      }, tr('Ask / Q&A') + (approvedCount ? ' · ' + approvedCount : ''));
    };

    const renderSessionQaView = function () {
      const packet = sessionQaState || { questions: [] };
      const questions = sortSessionQaQuestions(packet.questions, sessionQaSortMode);
      const normalizedDraft = normalizeSessionQaQuestionText(sessionQaDraft);
      const canAsk = !!(
        normalizedDraft
        && !packet.submissionsLocked
        && guestRef.current
        && connectionState === 'connected'
      );
      const submitQuestion = function () {
        if (!canAsk) return;
        const clientQuestionId = 'qa-client-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        if (guestRef.current.sendSessionQaQuestion(normalizedDraft, clientQuestionId)) {
          setSessionQaDraft('');
          clearLiveSessionQaDraft(sessionCode, userUid);
          setSessionQaNotice(tr('Question sent for teacher review.'));
        } else {
          setSessionQaNotice(tr('Connection lost — reconnecting. Your question was not sent.'));
        }
      };
      const setUpvote = function (question) {
        if (!guestRef.current || connectionState !== 'connected' || question.own) return;
        if (!guestRef.current.sendSessionQaUpvote(question.questionId, !question.upvotedByViewer)) {
          setSessionQaNotice(tr('Reconnect to update your vote.'));
        }
      };
      return ce('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': tr('Live questions and answers'),
        style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }
      },
        ce('div', { style: { background: 'white', maxWidth: 620, width: '100%', maxHeight: '88vh', overflowY: 'auto', borderRadius: 12, padding: '1.1rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } },
          ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
            ce('div', null,
              ce('div', { style: { color: '#0369a1', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' } }, tr('Anonymous class Q&A')),
              ce('h2', { style: { margin: '0.15rem 0 0', color: '#0f172a', fontSize: '1.08rem' } }, tr('Ask and explore questions'))
            ),
            ce('button', {
              type: 'button',
              onClick: function () { setSessionQaViewOpen(false); setSessionQaNotice(null); },
              style: { minWidth: 44, minHeight: 44, border: 'none', borderRadius: 6, background: '#f1f5f9', color: '#334155', fontWeight: 800, cursor: 'pointer' }
            }, tr('Close'))
          ),
          packet.featuredQuestion ? ce('section', { 'aria-label': tr('Featured question'), style: { marginTop: 9, padding: '0.65rem', border: '1px solid #f59e0b', borderRadius: 8, background: '#fef3c7' } },
            ce('strong', { style: { display: 'block', color: '#92400e', fontSize: '0.68rem', textTransform: 'uppercase' } }, tr('Teacher featured question')),
            ce('div', { style: { marginTop: 3, color: '#1e293b', fontSize: '0.86rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, packet.featuredQuestion.text),
            ce('span', { style: { display: 'block', marginTop: 4, color: '#92400e', fontSize: '0.7rem', fontWeight: 800 } }, '▲ ' + packet.featuredQuestion.upvoteCount)
          ) : null,
          ce('section', { 'aria-label': tr('Ask a question'), style: { marginTop: 9, padding: '0.65rem', border: '1px solid #bae6fd', borderRadius: 8, background: '#f0f9ff' } },
            ce('textarea', {
              value: sessionQaDraft,
              maxLength: SESSION_QA_QUESTION_MAX_LENGTH,
              disabled: packet.submissionsLocked,
              onChange: function (event) { setSessionQaDraft(event.target.value); setSessionQaNotice(null); },
              'aria-label': tr('Your question'),
              placeholder: packet.submissionsLocked ? tr('The teacher has paused new questions.') : tr('What would you like the class to explore?'),
              rows: 3,
              style: { width: '100%', boxSizing: 'border-box', padding: '0.6rem', border: '1px solid #7dd3fc', borderRadius: 6, background: packet.submissionsLocked ? '#f8fafc' : 'white', fontFamily: 'inherit', resize: 'vertical' }
            }),
            ce('button', {
              type: 'button',
              onClick: submitQuestion,
              disabled: !canAsk,
              style: { width: '100%', minHeight: 44, marginTop: 6, border: 'none', borderRadius: 6, background: canAsk ? '#0369a1' : '#cbd5e1', color: 'white', fontWeight: 900, cursor: canAsk ? 'pointer' : 'default' }
            }, packet.submissionsLocked ? tr('Questions paused') : tr('Send for teacher review')),
            ce('p', { style: { margin: '0.4rem 0 0', color: '#64748b', fontSize: '0.7rem', lineHeight: 1.35 } }, tr('Your question is private until the teacher approves it. Approved questions appear without names.')),
            connectionState !== 'connected' ? ce('p', { role: 'status', style: { margin: '0.4rem 0 0', color: '#b45309', fontSize: '0.7rem', fontWeight: 800, lineHeight: 1.35 } }, tr('Direct connection unavailable - reconnecting. New questions remain in this browser until the connection returns; nothing is uploaded as a fallback.')) : null
          ),
          sessionQaNotice ? ce('p', { role: 'status', style: { margin: '0.55rem 0 0', color: '#075985', fontSize: '0.75rem', fontWeight: 800 } }, sessionQaNotice) : null,
          ce('div', { style: { marginTop: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
            ce('strong', { style: { color: '#1e293b', fontSize: '0.82rem' } }, tr('Approved questions')),
            ce('div', { role: 'group', 'aria-label': tr('Sort class Q&A'), style: { display: 'flex', gap: 4 } },
              ['latest', 'top'].map(function (mode) {
                const selected = sessionQaSortMode === mode;
                return ce('button', {
                  key: mode,
                  type: 'button',
                  onClick: function () { setSessionQaSortMode(mode); },
                  'aria-pressed': selected,
                  style: { minHeight: 36, padding: '0.25rem 0.5rem', border: '1px solid #7dd3fc', borderRadius: 5, background: selected ? '#e0f2fe' : 'white', color: '#075985', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }
                }, mode === 'top' ? tr('Top voted') : tr('Latest'));
              })
            )
          ),
          questions.length ? ce('div', { role: 'list', 'aria-label': tr('Anonymous approved questions'), style: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 7 } },
            questions.map(function (question) {
              const approved = question.status === 'approved';
              return ce('article', { key: question.questionId, role: 'listitem', style: { padding: '0.65rem', border: '1px solid ' + (question.featured ? '#f59e0b' : '#e2e8f0'), borderRadius: 8, background: question.featured ? '#fffbeb' : 'white' } },
                ce('div', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: '#1e293b', fontSize: '0.84rem' } }, question.text),
                approved ? ce('div', { style: { marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
                  ce('span', { style: { color: '#64748b', fontSize: '0.68rem', fontWeight: 800 } }, question.own ? tr('Your approved question') : tr('Anonymous class question')),
                  ce('button', {
                    type: 'button',
                    disabled: question.own || connectionState !== 'connected',
                    onClick: function () { setUpvote(question); },
                    'aria-pressed': question.upvotedByViewer,
                    'aria-label': question.upvotedByViewer ? tr('Remove anonymous upvote') : tr('Upvote anonymous question'),
                    style: { minHeight: 40, padding: '0.3rem 0.6rem', border: '1px solid #38bdf8', borderRadius: 999, background: question.upvotedByViewer ? '#e0f2fe' : 'white', color: question.own ? '#94a3b8' : '#075985', fontWeight: 900, cursor: question.own ? 'default' : 'pointer' }
                  }, '▲ ' + question.upvoteCount)
                ) : ce('div', { style: { marginTop: 5, color: question.status === 'dismissed' ? '#64748b' : '#b45309', fontSize: '0.7rem', fontWeight: 800 } }, question.status === 'dismissed' ? tr('Your question was dismissed.') : tr('Your question is held for teacher review.'))
              );
            })
          ) : ce('p', { style: { margin: '0.65rem 0 0', padding: '0.6rem', borderRadius: 7, background: '#f8fafc', color: '#64748b', fontSize: '0.76rem' } }, tr('No approved questions yet.'))
        )
      );
    };

    const currentStudentSupportActivityId = activePoll ? activePoll.id : sessionSupportActivityId;
    const teacherCheckInForCurrentSupport = !!(teacherCheckIn && teacherCheckIn.activityId === currentStudentSupportActivityId);
    const answerTeacherCheckIn = function (status) {
      if (!teacherCheckInForCurrentSupport || !guestRef.current || connectionState !== 'connected') {
        setSubmitNotice(tr('Reconnect to answer the teacher check-in.'));
        return;
      }
      const sent = guestRef.current.sendCheckInAck(teacherCheckIn.id, teacherCheckIn.activityId, status);
      if (!sent) {
        setSubmitNotice(tr('Your check-in answer was not sent. Please try again.'));
        return;
      }
      if (status === 'working' && helpRequested) {
        const helpActivityId = helpActivityIdRef.current || teacherCheckIn.activityId;
        if (guestRef.current.sendHelpRequest(helpActivityId, false)) {
          setHelpRequested(false);
          helpRequestedRef.current = false;
          helpActivityIdRef.current = '';
        }
      }
      if (status === 'help') {
        setHelpRequested(true);
        helpRequestedRef.current = true;
        helpActivityIdRef.current = teacherCheckIn.activityId;
      }
      setTeacherCheckIn(function (current) { return current ? Object.assign({}, current, { status: status }) : current; });
      setSubmitNotice(null);
    };
    const toggleHelpRequest = function () {
      if (!guestRef.current || connectionState !== 'connected') {
        setSubmitNotice(tr('Reconnect to update your help request.'));
        return;
      }
      const next = !helpRequested;
      const activityId = next ? currentStudentSupportActivityId : (helpActivityIdRef.current || currentStudentSupportActivityId);
      if (!guestRef.current.sendHelpRequest(activityId, next)) {
        setSubmitNotice(tr('Your help request was not sent. Please try again.'));
        return;
      }
      setHelpRequested(next);
      helpRequestedRef.current = next;
      helpActivityIdRef.current = next ? activityId : '';
      setSubmitNotice(next ? tr('Your teacher can now see that you requested help.') : tr('Your help request was cancelled.'));
    };
    const renderLiveSupportTray = function () {
      const qaAvailable = !!(sessionQaOptIn && sessionQaState && sessionQaState.enabled);
      const connectionLabel = connectionState === 'connected' ? tr('Connected') : connectionState === 'failed' ? tr('Direct connection unavailable') : connectionState === 'reconnecting' ? tr('Reconnecting') : tr('Connecting');
      if (!supportTrayExpanded) return ce('aside', { 'aria-label': tr('Live session support'), style: { position: 'fixed', right: 'max(0.75rem, env(safe-area-inset-right))', bottom: 'max(0.75rem, env(safe-area-inset-bottom))', zIndex: 9998, width: 'min(420px, calc(100vw - 1.5rem))', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', padding: '0.5rem', border: '1px solid #c4b5fd', borderRadius: 999, background: 'rgba(255,255,255,0.98)', boxShadow: '0 10px 28px rgba(15,23,42,0.22)' } },
        ce('span', { role: 'status', 'aria-label': connectionLabel, title: guestTransportLabel + ' - ' + connectionLabel, style: { width: 10, height: 10, flex: '0 0 10px', borderRadius: 999, background: connectionState === 'connected' ? '#16a34a' : connectionState === 'failed' ? '#dc2626' : '#f59e0b' } }),
        ce('strong', { style: { color: '#312e81', fontSize: '0.72rem' } }, activePoll ? (activePoll.submissionsLocked ? tr('Teacher reviewing') : submitted ? tr('Response sent') : tr('Activity ready')) : tr('Live session')),
        helpRequested ? ce('span', { style: { padding: '0.15rem 0.35rem', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontSize: '0.61rem', fontWeight: 900 } }, tr('Help requested')) : null,
        activePoll ? ce('button', { type: 'button', onClick: function () { setPollMinimized(false); }, style: { minHeight: 40, marginLeft: 'auto', padding: '0.3rem 0.55rem', border: '1px solid #2563eb', borderRadius: 999, background: 'white', color: '#1d4ed8', fontWeight: 900, fontSize: '0.66rem', cursor: 'pointer' } }, tr('Open activity')) : null,
        ce('button', { type: 'button', onClick: function () { setSupportTrayExpanded(true); }, 'aria-expanded': false, style: { minWidth: 40, minHeight: 40, marginLeft: activePoll ? 0 : 'auto', border: '1px solid #7c3aed', borderRadius: 999, background: '#f5f3ff', color: '#6d28d9', fontWeight: 900, fontSize: '0.66rem', cursor: 'pointer' } }, teacherCheckInForCurrentSupport ? tr('Check in') : tr('Support'))
      );
      return ce('aside', { 'aria-label': tr('Live session support'), style: { position: 'fixed', right: 'max(0.75rem, env(safe-area-inset-right))', bottom: 'max(0.75rem, env(safe-area-inset-bottom))', zIndex: 9998, width: 'min(360px, calc(100vw - 1.5rem))', boxSizing: 'border-box', padding: '0.75rem', border: '1px solid #c4b5fd', borderRadius: 12, background: 'rgba(255,255,255,0.98)', boxShadow: '0 14px 36px rgba(15,23,42,0.24)' } },
        ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
          ce('div', null,
            ce('strong', { style: { display: 'block', color: '#312e81', fontSize: '0.82rem' } }, tr('Live session')),
            ce('span', { role: 'status', 'aria-live': 'polite', style: { color: connectionState === 'connected' ? '#166534' : connectionState === 'failed' ? '#b91c1c' : '#b45309', fontSize: '0.63rem', fontWeight: 900 } }, guestTransportLabel + ' · ' + connectionLabel)
          ),
          ce('button', { type: 'button', onClick: function () { setSupportTrayExpanded(false); }, 'aria-expanded': true, 'aria-label': tr('Collapse live session support'), style: { minWidth: 40, minHeight: 40, border: '1px solid #c4b5fd', borderRadius: 999, background: 'white', color: '#6d28d9', fontWeight: 900, cursor: 'pointer' } }, tr('Collapse'))
        ),
        activePoll ? ce('section', { style: { marginTop: 7, padding: '0.55rem', border: '1px solid #bfdbfe', borderRadius: 7, background: '#eff6ff' } },
          ce('strong', { style: { display: 'block', color: '#1e3a8a', fontSize: '0.73rem' } }, activePoll.submissionsLocked ? tr('Teacher is reviewing') : submitted ? tr('Response sent') : tr('Activity in progress')),
          ce('span', { style: { display: 'block', marginTop: 2, color: '#475569', fontSize: '0.68rem', lineHeight: 1.35, overflowWrap: 'anywhere' } }, activePoll.prompt),
          !submitted ? ce('span', { style: { display: 'block', marginTop: 3, color: '#1d4ed8', fontSize: '0.64rem', fontWeight: 800 } }, tr('Your draft is saved only in this browser session.')) : null,
          ce('button', { type: 'button', onClick: function () { setPollMinimized(false); }, style: { minHeight: 44, width: '100%', marginTop: 6, padding: '0.4rem 0.6rem', border: '1px solid #2563eb', borderRadius: 6, background: 'white', color: '#1d4ed8', fontWeight: 900, cursor: 'pointer' } }, submitted ? tr('Return to activity') : tr('Continue activity'))
        ) : ce('p', { style: { margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.68rem', lineHeight: 1.35 } }, tr('No poll is open. You can still request private support or respond to a teacher check-in.')),
        teacherCheckInForCurrentSupport ? ce('section', { role: 'status', 'aria-live': 'assertive', 'aria-label': tr('Private teacher check-in'), style: { marginTop: 7, padding: '0.55rem', border: '2px solid #7c3aed', borderRadius: 7, background: '#f5f3ff', color: '#4c1d95' } },
          ce('strong', { style: { display: 'block', fontSize: '0.72rem' } }, tr('Your teacher is checking in privately.')),
          ce('p', { style: { margin: '0.25rem 0 0', fontSize: '0.67rem', lineHeight: 1.35 } }, teacherCheckIn.status === 'received' ? tr('Share only whether you are continuing or would like support.') : teacherCheckIn.status === 'help' ? tr('Your teacher can see that you would like help.') : tr('Your teacher can see that you are working.')),
          teacherCheckIn.status === 'received' ? ce('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 6 } },
            ce('button', { type: 'button', onClick: function () { answerTeacherCheckIn('working'); }, disabled: connectionState !== 'connected', style: { minHeight: 44, padding: '0.35rem', border: '1px solid #16a34a', borderRadius: 6, background: 'white', color: '#166534', fontWeight: 850 } }, tr("I'm working")),
            ce('button', { type: 'button', onClick: function () { answerTeacherCheckIn('help'); }, disabled: connectionState !== 'connected', style: { minHeight: 44, padding: '0.35rem', border: '1px solid #dc2626', borderRadius: 6, background: 'white', color: '#b91c1c', fontWeight: 850 } }, tr('I need help'))
          ) : ce('button', { type: 'button', onClick: function () { setTeacherCheckIn(null); }, style: { minHeight: 44, width: '100%', marginTop: 6, border: '1px solid #7c3aed', borderRadius: 6, background: 'white', color: '#6d28d9', fontWeight: 850, cursor: 'pointer' } }, tr('Dismiss check-in'))
        ) : null,
        ce('div', { style: { display: 'grid', gridTemplateColumns: qaAvailable ? '1fr 1fr' : '1fr', gap: 5, marginTop: 7 } },
          ce('button', { type: 'button', onClick: toggleHelpRequest, disabled: connectionState !== 'connected', 'aria-pressed': helpRequested, style: { minHeight: 44, padding: '0.4rem', border: '1px solid ' + (helpRequested ? '#dc2626' : '#7c3aed'), borderRadius: 6, background: helpRequested ? '#fef2f2' : 'white', color: connectionState === 'connected' ? (helpRequested ? '#b91c1c' : '#6d28d9') : '#94a3b8', fontWeight: 900, cursor: connectionState === 'connected' ? 'pointer' : 'default' } }, helpRequested ? tr('Cancel help request') : tr('Request help')),
          qaAvailable ? ce('button', { type: 'button', onClick: function () { setSessionQaViewOpen(true); setSessionQaNotice(null); }, style: { minHeight: 44, padding: '0.4rem', border: '1px solid #38bdf8', borderRadius: 6, background: 'white', color: '#075985', fontWeight: 900, cursor: 'pointer' } }, tr('Ask / Q&A')) : null
        ),
        submitNotice ? ce('p', { role: 'status', 'aria-live': 'polite', style: { margin: '0.5rem 0 0', color: '#92400e', fontSize: '0.67rem', lineHeight: 1.35 } }, submitNotice) : null
      );
    };

    const pollDialogVisible = !!(enabled && activePoll && !pollMinimized && !peerVoteResults && !peerShowcase && !sharedResults && !sessionQaViewOpen);
    useLivePollingDialogFocus(pollDialogRef, pollDialogVisible, function () {}, null);
    if (!enabled) return null;
    if (peerVoteResults) return renderPeerVoteResults(peerVoteResults);
    if (peerShowcase) return renderPeerShowcase(peerShowcase);
    if (sharedResults) return renderResultsSummary(sharedResults);
    if (sessionQaViewOpen && sessionQaOptIn && sessionQaState && sessionQaState.enabled) return renderSessionQaView();
    if (!activePoll || pollMinimized) return renderLiveSupportTray();

    const feedbackConfig = normalizeFeedbackConfig(activePoll);
    const ratingScale = activePoll.type === 'rating' ? normalizeRatingScale(activePoll) : null;
    const ratingValues = ratingScale ? getRatingValues(ratingScale) : [];
    const hasResponse = activePoll.type === 'rating'
      ? responseValue !== ''
      : activePoll.type === 'wordcloud'
        ? !!normalizeWordCloudTerm(responseValue)
        : !!String(responseValue || '').trim();
    const submissionTransportReady = connectionState === 'connected' || connectionState === 'failed';
    const canSubmit = !submitted && activePoll.submissionsLocked !== true && !!guestRef.current && hasResponse && submissionTransportReady;
    const submitButtonLabel = activePoll.submissionsLocked
      ? tr('Teacher is reviewing - submissions paused')
      : connectionState === 'failed'
      ? tr('Download response for teacher')
      : connectionState === 'reconnecting'
        ? tr('Reconnecting - keep editing')
        : connectionState === 'connecting'
          ? tr('Connecting...')
          : feedbackConfig.enabled && currentAttempt > 1 ? tr('Submit revision') : tr('Submit response');
    const submit = function () {
      if (!canSubmit) return;
      let payload;
      if (activePoll.type === 'rating') payload = Number(responseValue);
      else if (activePoll.type === 'wordcloud') payload = normalizeWordCloudTerm(responseValue);
      else if (activePoll.type === 'mcq') payload = String(responseValue);
      else if (feedbackConfig.enabled) payload = normalizeFeedbackResponseText(responseValue);
      else payload = String(responseValue);
      if (activePoll.type === 'rating' && responseValue === '') return;
      if (activePoll.type !== 'rating' && !String(payload).trim()) return;
      const finishSubmitted = function () {
        if (feedbackConfig.enabled || activePoll.afterSubmitMode === 'wait') setSubmitted(true);
        else { setSubmitted(false); setResponseValue(''); setActivePoll(null); setPollMinimized(false); studentPollIdRef.current = null; }
      };
      const sent = guestRef.current.sendResponse(activePoll.id, payload, feedbackConfig.enabled ? { attempt: currentAttempt } : null);
      if (sent) {
        clearLivePollDraft(sessionCode, userUid, activePoll.id);
        setSubmittedResponse(payload);
        if (helpRequested && guestRef.current.sendHelpRequest(helpActivityIdRef.current || activePoll.id, false)) {
          setHelpRequested(false);
          helpRequestedRef.current = false;
          helpActivityIdRef.current = '';
        }
        if (feedbackConfig.enabled) {
          setStudentFeedback(null);
          guestRef.current.sendResponseStatus(activePoll.id, 'submitted', currentAttempt);
          statusSentRef.current = activePoll.id + ':' + currentAttempt + ':submitted';
        }
        setSubmitNotice(null);
        finishSubmitted();
      }
      else if (connectionState === 'failed') {
        exportResponseForFallback(activePoll.id, payload, codename);
        clearLivePollDraft(sessionCode, userUid, activePoll.id);
        if (feedbackConfig.enabled) {
          setSubmittedResponse(payload);
          setSubmitNotice(tr('Your response was exported. A direct connection is required to receive private feedback and revise here.'));
        }
        finishSubmitted();
      } else {
        // Channel dropped mid-poll: say so instead of silently ignoring the
        // click (the old dead-submit state). The auto-rejoin keeps working in
        // the background and the host will resync the poll on reconnect.
        setSubmitNotice(tr('Connection lost — reconnecting. Your response was not sent; try again in a few seconds.'));
      }
    };
    return ce('div', {
      ref: pollDialogRef,
      tabIndex: -1,
      role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Poll:') + ' ' + activePoll.prompt,
      style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }
    },
      ce('div', { style: { background: 'white', maxWidth: 520, width: '100%', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', boxSizing: 'border-box', borderRadius: 12, padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } },
        ce('div', { style: { fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 } }, feedbackConfig.enabled ? tr('Feedback response') + ' · ' + tr('Attempt') + ' ' + currentAttempt : (activePoll.type === 'rating' && ratingScale ? tr('rating') + ' ' + ratingScale.min + '-' + ratingScale.max : activePoll.type)),
        ce('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: '0.55rem' } },
          ce('h2', { style: { margin: 0, fontSize: '1.15rem', color: '#0f172a', minWidth: 0, overflowWrap: 'anywhere' } }, activePoll.prompt),
          ce('button', { type: 'button', onClick: function () { setPollMinimized(true); }, 'aria-label': tr('Minimize activity and keep draft'), style: { minHeight: 44, flexShrink: 0, padding: '0.35rem 0.55rem', border: '1px solid #94a3b8', borderRadius: 6, background: 'white', color: '#334155', fontWeight: 850, cursor: 'pointer', fontSize: '0.68rem' } }, tr('Minimize'))
        ),
        ce('div', { role: 'status', 'aria-live': 'polite', style: { display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 0.75rem', padding: '0.42rem 0.55rem', borderRadius: 7, background: connectionState === 'connected' ? '#f0fdf4' : connectionState === 'failed' ? '#fef2f2' : '#fff7ed', border: '1px solid ' + (connectionState === 'connected' ? '#bbf7d0' : connectionState === 'failed' ? '#fecaca' : '#fed7aa'), color: connectionState === 'connected' ? '#166534' : connectionState === 'failed' ? '#991b1b' : '#9a3412', fontSize: '0.72rem', fontWeight: 800 } },
          ce('span', { 'aria-hidden': 'true' }, connectionState === 'connected' ? '●' : connectionState === 'failed' ? '!' : '↻'),
          connectionState === 'connected' ? tr('Connected - response ready to send') : connectionState === 'failed' ? tr('Direct connection unavailable - download fallback ready') : connectionState === 'reconnecting' ? tr('Reconnecting - your draft stays here') : tr('Connecting - your draft stays here')
        ),
        activePoll.submissionsLocked ? ce('div', { role: 'status', 'aria-live': 'polite', style: { margin: '0 0 0.75rem', padding: '0.6rem', border: '1px solid #fcd34d', borderRadius: 7, background: '#fffbeb', color: '#78350f', fontSize: '0.74rem', fontWeight: 800, lineHeight: 1.4 } }, tr('The teacher paused new submissions while reviewing. Your draft stays in this browser, and you can submit if collecting resumes.')) : null,
        teacherCheckInForCurrentSupport ? ce('section', { role: 'status', 'aria-live': 'assertive', 'aria-label': tr('Private teacher check-in'), style: { margin: '0 0 0.8rem', padding: '0.7rem', border: '2px solid #7c3aed', borderRadius: 9, background: '#f5f3ff', color: '#4c1d95' } },
          ce('strong', { style: { display: 'block', fontSize: '0.78rem' } }, tr('Your teacher is checking in privately.')),
          ce('p', { style: { margin: '0.3rem 0 0', fontSize: '0.74rem', lineHeight: 1.4 } }, teacherCheckIn.status === 'received' ? tr('Let your teacher know whether you are continuing or would like support. Your response content is not shared by this check-in.') : teacherCheckIn.status === 'help' ? tr('Your teacher can now see that you would like help.') : tr('Your teacher can now see that you are working.')),
          teacherCheckIn.status === 'received' ? ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 7, marginTop: 8 } },
            ce('button', { type: 'button', onClick: function () { answerTeacherCheckIn('working'); }, disabled: connectionState !== 'connected', style: { minHeight: 44, padding: '0.45rem 0.65rem', border: '1px solid #16a34a', borderRadius: 6, background: 'white', color: '#166534', fontWeight: 850, cursor: connectionState === 'connected' ? 'pointer' : 'default' } }, tr("I'm working")),
            ce('button', { type: 'button', onClick: function () { answerTeacherCheckIn('help'); }, disabled: connectionState !== 'connected', style: { minHeight: 44, padding: '0.45rem 0.65rem', border: '1px solid #dc2626', borderRadius: 6, background: 'white', color: '#b91c1c', fontWeight: 850, cursor: connectionState === 'connected' ? 'pointer' : 'default' } }, tr('I need help'))
          ) : ce('button', { type: 'button', onClick: function () { setTeacherCheckIn(null); }, style: { minHeight: 44, width: '100%', marginTop: 8, padding: '0.4rem 0.65rem', border: '1px solid #7c3aed', borderRadius: 6, background: 'white', color: '#6d28d9', fontWeight: 850, cursor: 'pointer' } }, tr('Dismiss check-in'))
        ) : null,
        feedbackConfig.enabled && feedbackConfig.criteria ? ce('div', { style: { margin: '0 0 0.8rem 0', padding: '0.55rem', background: '#f8fafc', borderLeft: '3px solid #6366f1', borderRadius: 6, color: '#475569', fontSize: '0.76rem', lineHeight: 1.4 } },
          ce('strong', { style: { display: 'block', color: '#312e81', fontSize: '0.68rem', textTransform: 'uppercase', marginBottom: 2 } }, tr('Success criteria')),
          feedbackConfig.criteria
        ) : null,
        submitted ? (feedbackConfig.enabled ? ce('div', { style: { padding: '0.75rem', background: studentFeedback ? '#eef2ff' : '#dcfce7', color: studentFeedback ? '#312e81' : '#166534', borderRadius: 8 } },
          ce('div', { style: { fontWeight: 800 } }, studentFeedback ? tr('Your teacher reviewed your response') : (currentAttempt > 1 ? tr('Revision sent. Waiting for teacher feedback.') : tr('Response sent. Waiting for teacher feedback.'))),
          studentFeedback ? ce('div', { style: { marginTop: 7, padding: '0.6rem', background: 'white', border: '1px solid #c7d2fe', borderRadius: 7, whiteSpace: 'pre-wrap', color: '#1e293b', fontSize: '0.86rem', lineHeight: 1.45 } }, studentFeedback.text) : null,
          studentFeedback && studentFeedback.allowRevision && currentAttempt < feedbackConfig.maxAttempts ? ce('button', {
            onClick: function () {
              const nextAttempt = Math.min(feedbackConfig.maxAttempts, currentAttempt + 1);
              setCurrentAttempt(nextAttempt);
              setResponseValue(submittedResponse);
              setSubmitted(false);
              setStudentFeedback(null);
              statusSentRef.current = '';
              if (guestRef.current) guestRef.current.sendResponseStatus(activePoll.id, 'editing', nextAttempt);
            },
            style: { marginTop: 8, padding: '0.55rem 0.9rem', borderRadius: 6, border: 'none', background: '#4f46e5', color: 'white', cursor: 'pointer', fontWeight: 800, width: '100%' }
          }, tr('Revise using this feedback')) : studentFeedback ? ce('p', { style: { margin: '0.55rem 0 0 0', fontSize: '0.75rem', fontWeight: 700 } }, tr('Feedback cycle complete.')) : null
        ) : ce('div', { style: { padding: '0.75rem', background: '#dcfce7', color: '#166534', borderRadius: 8, fontWeight: 600 } },
          ce('div', null, tr('Response sent. Waiting for the teacher to close this poll.')),
          activePoll.type === 'wordcloud' ? ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6, marginTop: 8 } },
            ce('button', {
              type: 'button',
              disabled: activePoll.submissionsLocked === true,
              onClick: function () {
                setResponseValue(submittedResponse);
                setSubmitted(false);
                statusSentRef.current = '';
                if (guestRef.current) guestRef.current.sendResponseStatus(activePoll.id, 'editing', currentAttempt);
              },
              style: { minHeight: 44, padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #2563eb', background: 'white', color: activePoll.submissionsLocked ? '#94a3b8' : '#1d4ed8', cursor: activePoll.submissionsLocked ? 'default' : 'pointer', fontWeight: 800 }
            }, tr('Revise term')),
            ce('button', {
              type: 'button',
              disabled: activePoll.submissionsLocked === true,
              onClick: function () {
                if (!guestRef.current || !guestRef.current.sendResponse(activePoll.id, '', { withdrawn: true })) {
                  setSubmitNotice(tr('Reconnect to withdraw your term.'));
                  return;
                }
                guestRef.current.sendResponseStatus(activePoll.id, 'withdrawn', currentAttempt);
                clearLivePollDraft(sessionCode, userUid, activePoll.id);
                setSubmitted(false);
                setResponseValue('');
                setSubmittedResponse('');
                setSubmitNotice(tr('Your term was withdrawn. You may submit another.'));
              },
              style: { minHeight: 44, padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #b91c1c', background: 'white', color: activePoll.submissionsLocked ? '#94a3b8' : '#b91c1c', cursor: activePoll.submissionsLocked ? 'default' : 'pointer', fontWeight: 800 }
            }, tr('Withdraw term'))
          ) : null,
          ce('button', { onClick: function () { setPollMinimized(true); }, style: { marginTop: 8, minHeight: 44, padding: '0.45rem 0.8rem', borderRadius: 6, border: '1px solid #86efac', background: 'white', color: '#166534', cursor: 'pointer', fontWeight: 800, width: '100%' } }, tr('Minimize while waiting'))
        )) :
          activePoll.type === 'rating' ? ce('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'stretch', flexWrap: 'wrap', margin: '1rem 0' } },
            ratingValues.map(function (n) {
              const selected = Number(responseValue) === n;
              const label = ratingScale.labels[String(n)];
              return ce('button', { key: n, onClick: function () { setResponseValue(n); }, style: { minWidth: 54, minHeight: 52, borderRadius: 14, border: '2px solid ' + (selected ? '#1e3a8a' : '#cbd5e1'), background: selected ? '#1e3a8a' : 'white', color: selected ? 'white' : '#0f172a', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', padding: '0.4rem 0.55rem' } },
                ce('span', { style: { display: 'block' } }, n),
                label ? ce('span', { style: { display: 'block', fontSize: '0.62rem', fontWeight: 600, marginTop: 2, maxWidth: 80, lineHeight: 1.15 } }, label) : null
              );
            })
          ) :
          activePoll.type === 'mcq' ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, margin: '0.5rem 0 1rem 0' } },
            (activePoll.options || []).map(function (opt, i) {
              return ce('button', { key: i, onClick: function () { setResponseValue(opt); }, style: { textAlign: 'left', padding: '0.6rem 0.9rem', borderRadius: 8, border: '2px solid ' + (responseValue === opt ? '#1e3a8a' : '#cbd5e1'), background: responseValue === opt ? '#eef2ff' : 'white', cursor: 'pointer', fontWeight: 500 } }, opt);
            })
          ) :
          activePoll.type === 'wordcloud' ? ce('div', { style: { margin: '0.5rem 0 1rem 0' } },
            ce('input', { type: 'text', value: responseValue, maxLength: WORD_CLOUD_MAX_LENGTH, disabled: activePoll.submissionsLocked === true, onChange: function (e) { setResponseValue(e.target.value); }, 'aria-label': tr('Your word or short phrase'), placeholder: activePoll.submissionsLocked ? tr('Teacher review in progress') : tr('Enter one word or short phrase'), style: { width: '100%', padding: '0.7rem', border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box', background: activePoll.submissionsLocked ? '#f8fafc' : 'white' } }),
            ce('p', { style: { margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.72rem' } }, tr('Your term is held for teacher review before it can appear in the class word cloud.'))
          ) :
          ce('textarea', { value: responseValue, maxLength: feedbackConfig.enabled ? FEEDBACK_RESPONSE_MAX_LENGTH : undefined, onChange: function (e) { setResponseValue(e.target.value); }, 'aria-label': tr('Your response'), placeholder: feedbackConfig.enabled && currentAttempt > 1 ? tr('Revise your response using the feedback') : tr('Type your response'), rows: 5, style: { width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box', margin: '0 0 1rem 0' } }),
        submitted ? null : ce('button', { onClick: submit, disabled: !canSubmit, style: { minHeight: 48, padding: '0.6rem 1.2rem', borderRadius: 6, border: 'none', background: canSubmit ? (connectionState === 'failed' ? '#b45309' : '#1e3a8a') : '#cbd5e1', color: 'white', cursor: canSubmit ? 'pointer' : 'default', fontWeight: 800, width: '100%' } }, submitButtonLabel),
        ce('button', {
          type: 'button',
          onClick: toggleHelpRequest,
          disabled: connectionState !== 'connected',
          'aria-pressed': helpRequested,
          'aria-label': helpRequested ? tr('Cancel private help request') : tr('Request private teacher help'),
          style: { marginTop: 7, minHeight: 44, width: '100%', padding: '0.5rem', border: '1px solid ' + (helpRequested ? '#dc2626' : '#7c3aed'), borderRadius: 6, background: helpRequested ? '#fef2f2' : 'white', color: connectionState === 'connected' ? (helpRequested ? '#b91c1c' : '#6d28d9') : '#94a3b8', fontWeight: 900, cursor: connectionState === 'connected' ? 'pointer' : 'default' }
        }, helpRequested ? tr('Cancel help request') : tr('Request help')),
        sessionQaOptIn && sessionQaState && sessionQaState.enabled ? ce('button', {
          type: 'button',
          onClick: function () { setSessionQaViewOpen(true); setSessionQaNotice(null); },
          style: { marginTop: 7, minHeight: 44, width: '100%', padding: '0.5rem', border: '1px solid #38bdf8', borderRadius: 6, background: 'white', color: '#075985', fontWeight: 900, cursor: 'pointer' }
        }, tr('Ask / Q&A')) : null,
        submitNotice ? ce('p', { role: 'status', style: { fontSize: '0.75rem', color: '#b45309', marginTop: '0.75rem', marginBottom: 0 } }, submitNotice) : null,
        connectionState === 'failed' ? ce('p', { style: { fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.75rem', marginBottom: 0 } }, tr('Direct connection failed. Submitting will export your response as a downloadable file for the teacher to import.')) :
          connectionState === 'reconnecting' ? ce('p', { style: { fontSize: '0.75rem', color: '#b45309', marginTop: '0.75rem', marginBottom: 0 } }, tr('Connection lost — reconnecting…')) :
          connectionState === 'connecting' ? ce('p', { style: { fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem', marginBottom: 0 } }, tr('Connecting...')) : null
      )
    );
  };
  const LivePolling = {
    createHost: (config) => new PollingHost(config),
    createGuest: (config) => new PollingGuest(config),
    exportResponseForFallback: exportResponseForFallback,
    evaluateRoutingRules: evaluateRoutingRules,
    mergeLivePollingGroups: mergeLivePollingGroups,
    selectLivePollingRoutingRules: selectLivePollingRoutingRules,
    matchesPredicate: matchesPredicate,
    isAbilityTieredName: isAbilityTieredName,
    buildRatingScale: buildRatingScale,
    normalizeLivePollChoices: normalizeLivePollChoices,
    validateLivePollComposer: validateLivePollComposer,
    LIVE_POLL_PROMPT_MAX_LENGTH: LIVE_POLL_PROMPT_MAX_LENGTH,
    LIVE_POLL_CHOICE_MAX_LENGTH: LIVE_POLL_CHOICE_MAX_LENGTH,
    LIVE_POLL_MAX_CHOICES: LIVE_POLL_MAX_CHOICES,
    normalizeLiveCheckInPacket: normalizeLiveCheckInPacket,
    normalizeLiveCheckInAckPacket: normalizeLiveCheckInAckPacket,
    LIVE_CHECK_IN_ACK_STATUSES: LIVE_CHECK_IN_ACK_STATUSES,
    normalizeLiveHelpRequestPacket: normalizeLiveHelpRequestPacket,
    LIVE_HELP_REQUEST_STATUSES: LIVE_HELP_REQUEST_STATUSES,
    buildLiveSessionSupportActivityId: buildLiveSessionSupportActivityId,
    livePollDraftStorageKey: livePollDraftStorageKey,
    normalizeLivePollDraft: normalizeLivePollDraft,
    readLivePollDraft: readLivePollDraft,
    writeLivePollDraft: writeLivePollDraft,
    clearLivePollDraft: clearLivePollDraft,
    LIVE_POLL_DRAFT_MAX_CHARS: LIVE_POLL_DRAFT_MAX_CHARS,
    liveSessionQaDraftStorageKey: liveSessionQaDraftStorageKey,
    normalizeLiveSessionQaDraft: normalizeLiveSessionQaDraft,
    readLiveSessionQaDraft: readLiveSessionQaDraft,
    writeLiveSessionQaDraft: writeLiveSessionQaDraft,
    clearLiveSessionQaDraft: clearLiveSessionQaDraft,
    LIVE_QA_DRAFT_MAX_AGE_MS: LIVE_QA_DRAFT_MAX_AGE_MS,
    normalizeRatingScale: normalizeRatingScale,
    buildPollResultsSummary: buildPollResultsSummary,
    buildLivePollingAlloSheetEnvelope: buildLivePollingAlloSheetEnvelope,
    normalizeWordCloudTerm: normalizeWordCloudTerm,
    buildWordCloudItems: buildWordCloudItems,
    filterWordCloudModerationItems: filterWordCloudModerationItems,
    WORD_CLOUD_MODERATION_FILTERS: WORD_CLOUD_MODERATION_FILTERS,
    buildWordCloudClusterPrompt: buildWordCloudClusterPrompt,
    parseWordCloudClusterSuggestions: parseWordCloudClusterSuggestions,
    buildWordCloudAliasPatch: buildWordCloudAliasPatch,
    WORD_CLOUD_CLUSTER_MAX_TERMS: WORD_CLOUD_CLUSTER_MAX_TERMS,
    WORD_CLOUD_CLUSTER_MAX_SUGGESTIONS: WORD_CLOUD_CLUSTER_MAX_SUGGESTIONS,
    stableWordCloudColor: stableWordCloudColor,
    stableWordCloudSize: stableWordCloudSize,
    normalizeLiveActivityTimestamp: normalizeLiveActivityTimestamp,
    classifyLiveStudentSignal: classifyLiveStudentSignal,
    buildLiveStudentActivityRows: buildLiveStudentActivityRows,
    buildLiveStudentActivityDetail: buildLiveStudentActivityDetail,
    summarizeLiveStudentActivityRows: summarizeLiveStudentActivityRows,
    summarizeLiveStudentEngagementRows: summarizeLiveStudentEngagementRows,
    filterLiveStudentActivityRows: filterLiveStudentActivityRows,
    LIVE_STUDENT_SIGNAL_ACTIVE_MS: LIVE_STUDENT_SIGNAL_ACTIVE_MS,
    LIVE_STUDENT_SIGNAL_RECENT_MS: LIVE_STUDENT_SIGNAL_RECENT_MS,
    LIVE_STUDENT_ACTIVITY_FILTERS: LIVE_STUDENT_ACTIVITY_FILTERS,
    LIVE_STUDENT_ACTIVITY_SORTS: LIVE_STUDENT_ACTIVITY_SORTS,
    buildLiveTeacherActionQueue: buildLiveTeacherActionQueue,
    LIVE_TEACHER_ACTION_REASONS: LIVE_TEACHER_ACTION_REASONS,
    normalizeLiveTeacherActionState: normalizeLiveTeacherActionState,
    liveTeacherActionStorageKey: liveTeacherActionStorageKey,
    normalizeLiveTeacherActionStateMap: normalizeLiveTeacherActionStateMap,
    readLiveTeacherActionState: readLiveTeacherActionState,
    writeLiveTeacherActionState: writeLiveTeacherActionState,
    LIVE_TEACHER_ACTION_STATE_MAX_AGE_MS: LIVE_TEACHER_ACTION_STATE_MAX_AGE_MS,
    normalizeLiveTransportKind: normalizeLiveTransportKind,
    formatLiveElapsed: formatLiveElapsed,
    buildLiveTransportHealth: buildLiveTransportHealth,
    buildLiveSessionWrapUp: buildLiveSessionWrapUp,
    renderWordCloudItems: renderWordCloudItems,
    WORD_CLOUD_MAX_LENGTH: WORD_CLOUD_MAX_LENGTH,
    normalizeFeedbackConfig: normalizeFeedbackConfig,
    normalizeFeedbackResponseText: normalizeFeedbackResponseText,
    sanitizeFeedbackPacket: sanitizeFeedbackPacket,
    upsertFeedbackResponse: upsertFeedbackResponse,
    normalizeLivePollingAudienceSelection: normalizeLivePollingAudienceSelection,
    resolveLivePollingAudienceUids: resolveLivePollingAudienceUids,
    filterLivePollingResponsesToAudience: filterLivePollingResponsesToAudience,
    resolveFeedbackAudienceUids: resolveFeedbackAudienceUids,
    LIVE_POLLING_AUDIENCE_ID_MAX_LENGTH: LIVE_POLLING_AUDIENCE_ID_MAX_LENGTH,
    buildFeedbackPrompt: buildFeedbackPrompt,
    normalizePeerShowcaseText: normalizePeerShowcaseText,
    normalizePeerVoteCriterion: normalizePeerVoteCriterion,
    buildPeerShowcaseReviewRows: buildPeerShowcaseReviewRows,
    buildPeerShowcaseRound: buildPeerShowcaseRound,
    sanitizePeerShowcaseRound: sanitizePeerShowcaseRound,
    normalizePeerVote: normalizePeerVote,
    upsertPeerVote: upsertPeerVote,
    buildPeerVoteResults: buildPeerVoteResults,
    PEER_SHOWCASE_MIN_CANDIDATES: PEER_SHOWCASE_MIN_CANDIDATES,
    PEER_SHOWCASE_MAX_CANDIDATES: PEER_SHOWCASE_MAX_CANDIDATES,
    PEER_SHOWCASE_RESPONSE_MAX_LENGTH: PEER_SHOWCASE_RESPONSE_MAX_LENGTH,
    PEER_VOTE_CRITERION_MAX_LENGTH: PEER_VOTE_CRITERION_MAX_LENGTH,
    FEEDBACK_RESPONSE_MAX_LENGTH: FEEDBACK_RESPONSE_MAX_LENGTH,
    FEEDBACK_CRITERIA_MAX_LENGTH: FEEDBACK_CRITERIA_MAX_LENGTH,
    FEEDBACK_TEXT_MAX_LENGTH: FEEDBACK_TEXT_MAX_LENGTH,
    createSessionQaState: createSessionQaState,
    normalizeSessionQaQuestionText: normalizeSessionQaQuestionText,
    submitSessionQaQuestion: submitSessionQaQuestion,
    moderateSessionQaQuestion: moderateSessionQaQuestion,
    setSessionQaUpvote: setSessionQaUpvote,
    getSessionQaUpvoteCount: getSessionQaUpvoteCount,
    sortSessionQaQuestions: sortSessionQaQuestions,
    sanitizeSessionQaState: sanitizeSessionQaState,
    sanitizeSessionQaGuestPacket: sanitizeSessionQaGuestPacket,
    sanitizeFeaturedQaPacket: sanitizeFeaturedQaPacket,
    buildSessionQaActivitySnapshot: buildSessionQaActivitySnapshot,
    SESSION_QA_MAX_QUESTIONS: SESSION_QA_MAX_QUESTIONS,
    SESSION_QA_MAX_PER_AUTHOR: SESSION_QA_MAX_PER_AUTHOR,
    SESSION_QA_QUESTION_MAX_LENGTH: SESSION_QA_QUESTION_MAX_LENGTH,
    upsertLiveGuest: upsertLiveGuest,
    upsertPollResponse: upsertPollResponse,
    uniqueResponsesForSummary: uniqueResponsesForSummary,
    shouldApplyPollClose: shouldApplyPollClose,
    PollingHost: PollingHost,
    PollingGuest: PollingGuest,
    HostPanel: HostPanel,
    GuestOverlay: GuestOverlay,
    _meta: {
      version: '1.16.0',
      description: 'FERPA-by-design peer-to-peer live polling with a near-fullscreen teacher Command Center, provider-aware presence and engagement signals, scalable progress, privacy-safe per-student activity views, private claim/snooze/resolve follow-ups, incomplete-student actions, a content-free wrap-up, poll and Q&A draft recovery, and staged Word Cloud collection/review/reveal with teacher-approved AI grouping. Uses provider-neutral session APIs for Firebase and Google Class Mailbox parity.',
    },
  };

  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.LivePolling = LivePolling;
  }
})();
