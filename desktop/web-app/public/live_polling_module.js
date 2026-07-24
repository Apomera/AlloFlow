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
  const buildWordCloudItems = (responseList, moderationByKey) => {
    const responses = uniqueResponsesForSummary(responseList);
    const moderation = moderationByKey && typeof moderationByKey === 'object' ? moderationByKey : {};
    const buckets = Object.create(null);
    responses.forEach((entry) => {
      const label = normalizeWordCloudTerm(entry && entry.response);
      const key = wordCloudTermKey(label);
      if (!key) return;
      if (!buckets[key]) buckets[key] = { value: key, label: label, count: 0 };
      buckets[key].count += 1;
    });
    return Object.keys(buckets).map((key) => {
      const status = moderation[key] === 'approved' || moderation[key] === 'hidden'
        ? moderation[key]
        : 'pending';
      return Object.assign({}, buckets[key], { status: status });
    }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
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
  const resolveFeedbackAudienceUids = (guestList, roster, mode, targetId) => {
    const guests = Array.isArray(guestList) ? guestList : [];
    const rosterMap = roster && typeof roster === 'object' ? roster : {};
    const seen = new Set();
    return guests.reduce((out, guest) => {
      const uid = guest && guest.uid ? String(guest.uid) : '';
      if (!uid || seen.has(uid)) return out;
      const included = mode === 'individual'
        ? uid === String(targetId || '')
        : mode === 'group'
          ? !!(targetId && rosterMap[uid] && rosterMap[uid].groupId === targetId)
          : true;
      if (included) { seen.add(uid); out.push(uid); }
      return out;
    }, []);
  };
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
      const terms = buildWordCloudItems(responses, moderation);
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
      this.onResponseStatus = config.onResponseStatus || (() => {});
      this.onGuestLeft = config.onGuestLeft || (() => {});
      this.peers = new Map();
      this.collectionUnsub = null;
      this.activePoll = null;
      this.activeAudienceUids = null;
      this._stopped = false;
      // Roster gate: when set (Set of uids), offers from unknown uids are
      // ignored. Defense-in-depth against drive-by connections to a guessed
      // session code — NOT a security boundary on its own, since the roster
      // lives in a client-writable doc until Firestore rules land (see
      // docs/LIVE_SESSION_HARDENING_PROPOSAL.md). null = allow all (legacy).
      this._allowedUids = config.allowedUids ? new Set(config.allowedUids) : null;
      this.signalingPath = config.signalingPath || 'signaling';
    }

    setAllowedUids(uids) {
      this._allowedUids = uids ? new Set(uids) : null;
    }

    _isUidInActiveAudience(uid) {
      return !this.activeAudienceUids || this.activeAudienceUids.has(uid);
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
          if (this._allowedUids && !this._allowedUids.has(uid)) return;
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
      if (!fb) return;
      const pc = new RTCPeerConnection(getRtcConfig());
      const codename = (typeof offerData.codename === 'string' && offerData.codename.slice(0, 64)) || 'Guest';
      const peerRecord = { pc, dc: null, signalingRef, codename, sentIce: [], offerSdp: (offerData.offer && offerData.offer.sdp) || null };
      this.peers.set(uid, peerRecord);

      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        peerRecord.sentIce.push(e.candidate.toJSON());
        fb.setDoc(signalingRef, { iceFromHost: peerRecord.sentIce }, { merge: true }).catch(() => {});
      };

      pc.ondatachannel = (e) => {
        const dc = e.channel;
        peerRecord.dc = dc;
        dc.onopen = () => {
          this.onGuestConnected(uid, codename);
          // State sync on (re)connect. A reconnecting guest may hold a stale
          // poll overlay from before the drop; sending an id-less closePoll
          // clears it (shouldApplyPollClose treats a missing pollId as
          // "close whatever is showing").
          if (this.activePoll && this._isUidInActiveAudience(uid)) {
            try { dc.send(JSON.stringify({ type: 'poll', payload: this.activePoll })); } catch (err) {}
          } else {
            try { dc.send(JSON.stringify({ type: 'closePoll', payload: {} })); } catch (err) {}
          }
        };
        dc.onmessage = (msg) => {
          try {
            const parsed = JSON.parse(msg.data);
            if (parsed && parsed.type === 'response' && parsed.payload) {
              if (this.activePoll && parsed.payload.pollId === this.activePoll.id && this._isUidInActiveAudience(uid)) {
                this.onResponse(uid, codename, parsed.payload);
              }
            } else if (parsed && parsed.type === 'responseStatus' && parsed.payload) {
              if (this.activePoll && parsed.payload.pollId === this.activePoll.id && this._isUidInActiveAudience(uid)) {
                const status = parsed.payload.status === 'submitted' || parsed.payload.status === 'editing'
                  ? parsed.payload.status
                  : 'drafting';
                this.onResponseStatus(uid, codename, {
                  pollId: parsed.payload.pollId,
                  status: status,
                  attempt: clampInt(parsed.payload.attempt, 1, 1, 2),
                  timestamp: Number(parsed.payload.timestamp) || Date.now(),
                });
              }
            }
          } catch (err) {}
        };
        dc.onclose = () => this._cleanupPeer(uid);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setTimeout(() => fb.deleteDoc(signalingRef).catch(() => {}), 750);
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
          this._cleanupPeer(uid);
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offerData.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await fb.setDoc(signalingRef, { answer: { type: answer.type, sdp: answer.sdp } }, { merge: true });
      } catch (err) {
        console.warn('[LivePolling host] accept peer failed:', err && err.message);
        this._cleanupPeer(uid);
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
      this.activePoll = poll;
      this.activeAudienceUids = Array.isArray(audienceUids) ? new Set(audienceUids) : null;
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
      const msg = JSON.stringify({ type: 'closePoll', payload: { pollId: idToClose } });
      this.peers.forEach((peer) => {
        if (peer.dc && peer.dc.readyState === 'open') {
          try { peer.dc.send(msg); } catch (err) {}
        }
      });
      if (this.activePoll && this.activePoll.id === idToClose) {
        this.activePoll = null;
        this.activeAudienceUids = null;
      }
    }

    broadcastPollResults(pollId, summary) {
      if (!pollId || !summary) return;
      const safeSummary = Object.assign({}, summary, { pollId: pollId });
      const msg = JSON.stringify({ type: 'pollResults', payload: safeSummary });
      this.peers.forEach((peer, uid) => {
        if (peer.dc && peer.dc.readyState === 'open' && this._isUidInActiveAudience(uid)) {
          try { peer.dc.send(msg); } catch (err) {}
        }
      });
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

    _cleanupPeer(uid) {
      const peer = this.peers.get(uid);
      if (!peer) return;
      try { if (peer.pc) peer.pc.close(); } catch (err) {}
      // Deliberately do NOT delete the signaling doc here. A reconnecting
      // guest overwrites that same doc with a fresh offer; deleting it from a
      // stale-peer cleanup raced that write and destroyed the new offer before
      // the host could answer it. Signaling docs are already deleted on
      // successful connect (both sides, ~750ms post-connect) and by the
      // guest's own leave(); a doc for a guest that never connected simply
      // waits for the guest's next overwrite.
      this.peers.delete(uid);
      this.onGuestLeft(uid);
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
      this.onFeedback = config.onFeedback || (() => {});
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

      this.pc = new RTCPeerConnection(getRtcConfig());
      this.dc = this.pc.createDataChannel('polling', { ordered: true });

      this.pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        this.sentIce.push(e.candidate.toJSON());
        fb.setDoc(this.signalingRef, { iceFromGuest: this.sentIce }, { merge: true }).catch(() => {});
      };

      this.dc.onopen = () => {
        this._connected = true;
        if (this._timeoutHandle) { clearTimeout(this._timeoutHandle); this._timeoutHandle = null; }
        this.onConnected();
      };
      this.dc.onclose = () => {
        if (this._connected) this.onDisconnected();
      };
      this.dc.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          if (parsed && parsed.type === 'poll') this.onPoll(parsed.payload);
          else if (parsed && parsed.type === 'closePoll') this.onPollClose(parsed.payload);
          else if (parsed && parsed.type === 'pollResults') this.onPollResults(parsed.payload);
          else if (parsed && parsed.type === 'feedback') {
            const packet = sanitizeFeedbackPacket(parsed.payload, parsed.payload && parsed.payload.pollId);
            if (packet) this.onFeedback(packet);
          }
          else if (parsed && parsed.type === 'hostClosed') this.onHostClosed(parsed.payload || {});
        } catch (err) {}
      };

      this.pc.onconnectionstatechange = () => {
        if (this.pc.connectionState === 'connected') {
          setTimeout(() => fb.deleteDoc(this.signalingRef).catch(() => {}), 750);
        } else if (this.pc.connectionState === 'failed') {
          this.onFailed();
        }
      };

      try {
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        await fb.setDoc(this.signalingRef, {
          offer: { type: offer.type, sdp: offer.sdp },
          codename: this.codename,
          createdAt: Date.now(),
          expiresAt: Date.now() + SIGNALING_TTL_MS,
        });
      } catch (err) {
        console.warn('[LivePolling guest] setup failed:', err && err.message);
        this.onFailed();
        return;
      }

      this.signalingUnsub = fb.onSnapshot(this.signalingRef, (snap) => {
        const data = (snap && snap.data && snap.data()) || null;
        if (!data) return;
        if (data.answer && this.pc.signalingState === 'have-local-offer') {
          this.pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(() => {});
        }
        if (Array.isArray(data.iceFromHost)) {
          data.iceFromHost.forEach((c) => {
            this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          });
        }
      }, (err) => {
        console.warn('[LivePolling guest] signaling subscribe error:', err && err.message);
      });

      this._timeoutHandle = setTimeout(() => {
        if (!this._connected) {
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
      const safeStatus = status === 'submitted' || status === 'editing' ? status : 'drafting';
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

    leave() {
      if (this._timeoutHandle) { clearTimeout(this._timeoutHandle); this._timeoutHandle = null; }
      if (this.signalingUnsub) {
        try { this.signalingUnsub(); } catch (err) {}
        this.signalingUnsub = null;
      }
      if (this.signalingRef) {
        const fb = getFb();
        if (fb) fb.deleteDoc(this.signalingRef).catch(() => {});
      }
      try { if (this.pc) this.pc.close(); } catch (err) {}
      this.pc = null;
      this.dc = null;
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

  const renderWordCloudItems = function (items, ariaLabel) {
    const safeItems = Array.isArray(items) ? items.filter((item) => item && item.label) : [];
    if (!safeItems.length) return null;
    const maxCount = Math.max.apply(null, safeItems.map((item) => Number(item.count) || 1));
    const colors = ['#1d4ed8', '#7c3aed', '#0f766e', '#be123c', '#b45309', '#0369a1'];
    return ce('div', {
      role: 'list',
      'aria-label': ariaLabel || tr('Word cloud'),
      style: { display: 'flex', alignItems: 'center', justifyContent: 'center', alignContent: 'center', flexWrap: 'wrap', gap: '0.45rem 0.8rem', minHeight: 110, padding: '0.8rem', background: 'white', border: '1px solid #dbeafe', borderRadius: 10 }
    }, safeItems.map(function (item, index) {
      const count = Math.max(1, Number(item.count) || 1);
      const strength = count / maxCount;
      const size = (0.88 + (strength * 1.45)).toFixed(2) + 'rem';
      return ce('span', {
        key: String(item.value || item.label || index),
        role: 'listitem',
        'aria-label': item.label + ': ' + count,
        title: item.label + ' — ' + count,
        style: { color: colors[index % colors.length], fontSize: size, fontWeight: strength >= 0.75 ? 850 : 700, lineHeight: 1.05, overflowWrap: 'anywhere' }
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

  const HostPanel = !R ? null : function HostPanel(props) {
    useLivePollingI18n();
    const sessionCode = props.sessionCode || '';
    const isOpen = !!props.isOpen;
    const onClose = props.onClose || (() => {});
    const resources = Array.isArray(props.resources) ? props.resources : [];
    const roster = props.roster && typeof props.roster === 'object' ? props.roster : {};
    const sessionGroups = props.sessionGroups && typeof props.sessionGroups === 'object' ? props.sessionGroups : {};
    const onSendToStudent = typeof props.onSendToStudent === 'function' ? props.onSendToStudent : null;
    const onSendToGroup = typeof props.onSendToGroup === 'function' ? props.onSendToGroup : null;
    const onActivitySnapshot = typeof props.onActivitySnapshot === 'function' ? props.onActivitySnapshot : null;
    const hostRef = R.useRef(null);
    const [guests, setGuests] = R.useState([]);
    const [responses, setResponses] = R.useState({});
    const [pollType, setPollType] = R.useState('rating');
    const [pollPrompt, setPollPrompt] = R.useState('');
    const [pollOptions, setPollOptions] = R.useState('Option A\nOption B\nOption C');
    const [ratingMin, setRatingMin] = R.useState(1);
    const [ratingMax, setRatingMax] = R.useState(5);
    const [ratingLabels, setRatingLabels] = R.useState('1 = Not yet\n2 = A little\n3 = Somewhat\n4 = Mostly\n5 = Very well');
    const [afterSubmitMode, setAfterSubmitMode] = R.useState('dismiss');
    const [lastSharedResultsAt, setLastSharedResultsAt] = R.useState(null);
    const [activePoll, setActivePoll] = R.useState(null);
    const [composerRules, setComposerRules] = R.useState([]);
    const [groups, setGroups] = R.useState([]);
    const [newGroupName, setNewGroupName] = R.useState('');
    const [showRoutingPanel, setShowRoutingPanel] = R.useState(false);
    // routingByPoll: { pollId: { uid: groupId } } — used both to suppress
    // duplicate routing on re-submission and to compute aggregates.
    const [routingByPoll, setRoutingByPoll] = R.useState({});
    // Word-cloud terms are held locally until the teacher explicitly approves
    // or hides them. Only approved anonymous aggregates are ever shared.
    const [wordCloudModerationByPoll, setWordCloudModerationByPoll] = R.useState({});
    const [feedbackEnabled, setFeedbackEnabled] = R.useState(false);
    const [feedbackCriteria, setFeedbackCriteria] = R.useState('');
    const [feedbackAudienceMode, setFeedbackAudienceMode] = R.useState('class');
    const [feedbackAudienceId, setFeedbackAudienceId] = R.useState('');
    const [activeParticipantUids, setActiveParticipantUids] = R.useState([]);
    const [responseStatusByPoll, setResponseStatusByPoll] = R.useState({});
    const [feedbackByPoll, setFeedbackByPoll] = R.useState({});
    const [feedbackBusyByPoll, setFeedbackBusyByPoll] = R.useState({});
    const [feedbackBulkBusy, setFeedbackBulkBusy] = R.useState(false);
    const [followUpResourceId, setFollowUpResourceId] = R.useState('');
    // Refs keep onResponse's closure reading current state without
    // re-creating the host (which would tear down all peer connections).
    const activePollRef = R.useRef(null);
    const routingByPollRef = R.useRef({});
    const lastActivitySnapshotRef = R.useRef(null);
    R.useEffect(function () { activePollRef.current = activePoll; }, [activePoll]);
    R.useEffect(function () { routingByPollRef.current = routingByPoll; }, [routingByPoll]);

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
      if (initialPoll.feedbackAudienceMode) setFeedbackAudienceMode(initialPoll.feedbackAudienceMode);
      if (typeof initialPoll.feedbackAudienceId === 'string') setFeedbackAudienceId(initialPoll.feedbackAudienceId);
    }, [isOpen, initialPoll]);

    R.useEffect(function () {
      if (!isOpen || !sessionCode) return undefined;
      const host = new PollingHost({
        sessionCode: sessionCode,
        onGuestConnected: function (uid, codename) {
          setGuests(function (prev) { return upsertLiveGuest(prev, uid, codename); });
        },
        onResponse: function (uid, codename, payload) {
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
          if (isFeedbackPoll(poll)) {
            setResponseStatusByPoll(function (prev) {
              const next = Object.assign({}, prev);
              next[payload.pollId] = Object.assign({}, next[payload.pollId] || {}, { [uid]: 'submitted' });
              return next;
            });
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
          setResponseStatusByPoll(function (prev) {
            const next = Object.assign({}, prev);
            next[payload.pollId] = Object.assign({}, next[payload.pollId] || {}, { [uid]: payload.status });
            return next;
          });
        },
        onGuestLeft: function (uid) {
          setGuests(function (prev) { return prev.filter(function (g) { return g.uid !== uid; }); });
        },
      });
      hostRef.current = host;
      if (props.allowedUids) host.setAllowedUids(props.allowedUids);
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
        if (presenceRef && typeof presenceWriter === 'function') {
          presenceWriter(presenceRef, { livePolling: { hostActive: false } }).catch(function () {});
        }
        host.stop();
        hostRef.current = null;
      };
    }, [isOpen, sessionCode]);

    // Keep the roster gate current as students join without recreating the
    // host (which would tear down every peer connection). undefined prop
    // (older shells) leaves the gate off — legacy allow-all.
    R.useEffect(function () {
      if (hostRef.current && typeof hostRef.current.setAllowedUids === 'function' && props.allowedUids) {
        hostRef.current.setAllowedUids(props.allowedUids);
      }
    }, [props.allowedUids]);

    const addRule = function () {
      const defaultPred = pollType === 'mcq' ? 'eq' : 'lte';
      const ratingScale = buildRatingScale(ratingMin, ratingMax, ratingLabels);
      const defaultValue = pollType === 'mcq'
        ? (pollOptions.split('\n').map(function (s) { return s.trim(); }).filter(Boolean)[0] || '')
        : Math.min(ratingScale.max, Math.max(ratingScale.min, Math.round((ratingScale.min + ratingScale.max) / 2)));
      setComposerRules(function (prev) { return prev.concat([{
        id: 'rule-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        when: { predicate: defaultPred, value: defaultValue },
        then: { groupId: (groups[0] && groups[0].id) || '' }
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
    const addGroup = function () {
      const name = newGroupName.trim();
      if (!name) return;
      if (isAbilityTieredName(name)) {
        const ok = window.confirm(tr('"{name}" looks like an ability-tiered group name. EL/UDL practice recommends neutral or theme-based names (Indigo, Sage, Pirate Crew, Space Crew). Use anyway?', { name: name }));
        if (!ok) return;
      }
      const id = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      setGroups(function (prev) { return prev.concat([{ id: id, name: name }]); });
      setNewGroupName('');
      // Mirror to session doc so other AlloFlow features (BridgeSendModal,
      // roster panel) can address this group. Tier-1: 'name' is allowlisted.
      const ref = sessionDocRef(sessionCode);
      const writer = (typeof window !== 'undefined') && window.__alloWriteToSession;
      if (ref && typeof writer === 'function') {
        writer(ref, { ['groups.' + id + '.name']: name }).catch(function () {});
      }
    };

    const broadcast = function () {
      if (!hostRef.current || !pollPrompt.trim()) return;
      const validRules = composerRules.filter(function (r) {
        return r && r.when && r.then && r.then.groupId;
      });
      const startedAt = Date.now();
      const poll = {
        id: 'poll-' + startedAt,
        startedAt: startedAt,
        type: pollType,
        prompt: pollPrompt.trim(),
        options: pollType === 'mcq'
          ? pollOptions.split('\n').map(function (s) { return s.trim(); }).filter(Boolean)
          : null,
        routingRules: (pollType === 'rating' || pollType === 'mcq') ? validRules : [],
        scale: pollType === 'rating' ? buildRatingScale(ratingMin, ratingMax, ratingLabels) : null,
        afterSubmitMode: pollType === 'freetext' && feedbackEnabled ? 'wait' : afterSubmitMode,
        feedback: {
          enabled: pollType === 'freetext' && feedbackEnabled,
          criteria: normalizeBoundedText(feedbackCriteria, FEEDBACK_CRITERIA_MAX_LENGTH),
          maxAttempts: 2,
        },
      };
      const audienceUids = isFeedbackPoll(poll)
        ? resolveFeedbackAudienceUids(guests, roster, feedbackAudienceMode, feedbackAudienceId)
        : guests.map(function (guest) { return guest.uid; });
      if (audienceUids.length === 0) return;
      hostRef.current.broadcastPoll(poll, audienceUids);
      setActiveParticipantUids(audienceUids);
      setActivePoll(poll);
      setResponses(function (prev) { const n = Object.assign({}, prev); n[poll.id] = []; return n; });
      setRoutingByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setWordCloudModerationByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setResponseStatusByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setFeedbackByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setFeedbackBusyByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
      setLastSharedResultsAt(null);
    };
    const closePoll = function () {
      if (!hostRef.current || !activePoll) return;
      hostRef.current.closePoll(activePoll.id);
      setActivePoll(null);
      setActiveParticipantUids([]);
    };
    const shareResults = function () {
      if (!hostRef.current || !activePoll || isFeedbackPoll(activePoll)) return;
      const summary = buildPollResultsSummary(activePoll, uniqueResponsesForSummary(responses[activePoll.id] || []), guests.length, {
        wordCloudModeration: wordCloudModerationByPoll[activePoll.id] || {}
      });
      hostRef.current.broadcastPollResults(activePoll.id, summary);
      setLastSharedResultsAt(Date.now());
    };
    const groupNameById = function (id) {
      const g = groups.find(function (x) { return x.id === id; });
      return g ? g.name : id;
    };

    // Publish a bounded status/count snapshot to the presentation coordinator.
    // The callback receives no prompt, response, codename, feedback, or routing
    // rule content. The LiveLessonRun sanitizer is the second allowlist boundary.
    R.useEffect(function () {
      if (!onActivitySnapshot) return;
      if (!isOpen || !activePoll) {
        const prior = lastActivitySnapshotRef.current;
        if (prior && prior.phase !== 'closed' && prior.phase !== 'revealed') {
          const closed = Object.assign({}, prior, {
            phase: 'closed',
            updatedAt: Date.now(),
            endedAt: Date.now(),
          });
          lastActivitySnapshotRef.current = closed;
          onActivitySnapshot(closed);
        }
        return;
      }

      const audienceUids = activeParticipantUids.length
        ? activeParticipantUids.slice()
        : guests.map(function (guest) { return guest.uid; });
      const responseEntries = uniqueResponsesForSummary(responses[activePoll.id] || []);
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
      const wordCloudItems = activePoll.type === 'wordcloud'
        ? buildWordCloudItems(responseEntries, moderation)
        : [];
      const moderationCounts = wordCloudItems.reduce(function (out, item) {
        out[item.status] = (out[item.status] || 0) + item.count;
        return out;
      }, { approved: 0, hidden: 0, pending: 0 });
      const feedbackSent = Object.values(feedbackRecords).filter(function (record) {
        return record && record.status === 'sent';
      }).length;
      const submitted = Object.values(participantStatus).filter(function (status) {
        return status === 'submitted' || status === 'revised';
      }).length;
      let phase = lastSharedResultsAt ? 'revealed' : 'collecting';
      if (!lastSharedResultsAt && feedbackConfig.enabled && (feedbackSent > 0 || (audienceUids.length > 0 && submitted === audienceUids.length))) {
        phase = 'review';
      } else if (!lastSharedResultsAt && activePoll.type === 'wordcloud' && responseEntries.length > 0) {
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
          revealed: lastSharedResultsAt ? 1 : 0,
          feedbackSent: feedbackSent,
        },
        startedAt: activePoll.startedAt || 0,
        updatedAt: Date.now(),
        endedAt: lastSharedResultsAt || 0,
      };
      lastActivitySnapshotRef.current = snapshot;
      onActivitySnapshot(snapshot);
    }, [isOpen, activePoll, activeParticipantUids, guests, responses, responseStatusByPoll, feedbackByPoll, wordCloudModerationByPoll, lastSharedResultsAt, onActivitySnapshot]);

    if (!isOpen) return null;
    const activeResponses = (activePoll && responses[activePoll.id]) || [];
    const uniqueActiveResponses = uniqueResponsesForSummary(activeResponses);
    const activeFeedbackConfig = normalizeFeedbackConfig(activePoll);
    const responseGoalBase = activeFeedbackConfig.enabled ? activeParticipantUids.length : guests.length;
    const responseGoal = Math.max(responseGoalBase, uniqueActiveResponses.length, 1);
    const responsePercent = activePoll ? Math.min(100, Math.round((uniqueActiveResponses.length / responseGoal) * 100)) : 0;
    const activeWordCloudModeration = activePoll ? (wordCloudModerationByPoll[activePoll.id] || {}) : {};
    const wordCloudTermsForActive = activePoll && activePoll.type === 'wordcloud'
      ? buildWordCloudItems(uniqueActiveResponses, activeWordCloudModeration)
      : [];
    const summaryForActive = activePoll ? buildPollResultsSummary(activePoll, uniqueActiveResponses, guests.length, {
      wordCloudModeration: activeWordCloudModeration
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
    const wordCloudStatusCounts = wordCloudTermsForActive.reduce(function (out, item) {
      out[item.status] += item.count;
      return out;
    }, { pending: 0, approved: 0, hidden: 0 });
    const setWordCloudTermStatus = function (key, status) {
      if (!activePoll || activePoll.type !== 'wordcloud' || !key) return;
      setWordCloudModerationByPoll(function (prev) {
        const next = Object.assign({}, prev);
        next[activePoll.id] = Object.assign({}, next[activePoll.id] || {}, { [key]: status });
        return next;
      });
      setLastSharedResultsAt(null);
    };
    const approvePendingWordCloudTerms = function () {
      if (!activePoll || activePoll.type !== 'wordcloud') return;
      setWordCloudModerationByPoll(function (prev) {
        const next = Object.assign({}, prev);
        const forPoll = Object.assign({}, next[activePoll.id] || {});
        wordCloudTermsForActive.forEach(function (item) {
          if (item.status === 'pending') forPoll[item.value] = 'approved';
        });
        next[activePoll.id] = forPoll;
        return next;
      });
      setLastSharedResultsAt(null);
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
    const sessionGroupEntries = Object.keys(sessionGroups).map(function (id) {
      return { id: id, name: (sessionGroups[id] && sessionGroups[id].name) || id };
    });
    const composerAudienceUids = pollType === 'freetext' && feedbackEnabled
      ? resolveFeedbackAudienceUids(guests, roster, feedbackAudienceMode, feedbackAudienceId)
      : guests.map(function (guest) { return guest.uid; });
    const broadcastTargetCount = composerAudienceUids.length;
    const broadcastDisabled = !pollPrompt.trim() || broadcastTargetCount === 0;

    return ce('div', {
      role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Live Polling Host'),
      style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }
    },
      ce('div', { style: { background: 'white', maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto', borderRadius: 12, padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } },
        ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' } },
          ce('h2', { style: { margin: 0, fontSize: '1.15rem', color: '#0f172a' } }, tr('Live Polling —') + ' ', ce('span', { style: { fontFamily: 'monospace', color: '#1e3a8a' } }, sessionCode)),
          ce('button', { onClick: onClose, style: { background: '#f1f5f9', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600 } }, tr('Close'))
        ),
        ce('p', { style: { fontSize: '0.85rem', color: '#475569', margin: '0 0 0.75rem 0' } }, tr('Connected:') + ' ',
          ce('strong', null, guests.length), ' ' + (guests.length === 1 ? tr('guest') : tr('guests')),
          guests.length > 0 ? ' (' + guests.map(function (g) { return g.codename; }).join(', ') + ')' : ''
        ),
        ce('div', { style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem' } },
          ce('h3', { style: { margin: '0 0 0.5rem 0', fontSize: '0.95rem' } }, tr('Create poll')),
          ce('div', { style: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
            ['rating', 'mcq', 'freetext', 'wordcloud'].map(function (t) {
              return ce('button', {
                key: t, onClick: function () { setPollType(t); },
                style: { padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid ' + (pollType === t ? '#1e3a8a' : '#cbd5e1'), background: pollType === t ? '#1e3a8a' : 'white', color: pollType === t ? 'white' : '#0f172a', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }
              }, t === 'rating' ? tr('Rating 1–5') : t === 'mcq' ? tr('Multiple choice') : t === 'wordcloud' ? tr('Word cloud') : tr('Free text'));
            })
          ),
          ce('input', { type: 'text', value: pollPrompt, onChange: function (e) { setPollPrompt(e.target.value); }, placeholder: tr('Poll prompt'), 'aria-label': tr('Poll prompt'), style: { width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 6, marginBottom: 8, boxSizing: 'border-box' } }),
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
              ce('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 7 } },
                ce('label', { style: { color: '#475569', fontWeight: 700, fontSize: '0.72rem' } },
                  tr('Audience'),
                  ce('select', { value: feedbackAudienceMode, onChange: function (event) { setFeedbackAudienceMode(event.target.value); setFeedbackAudienceId(''); }, 'aria-label': tr('Feedback response audience'), style: { display: 'block', marginTop: 3, width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, background: 'white' } },
                    ce('option', { value: 'class' }, tr('Whole class')),
                    ce('option', { value: 'group' }, tr('One group')),
                    ce('option', { value: 'individual' }, tr('One student'))
                  )
                ),
                feedbackAudienceMode === 'group' ? ce('label', { style: { color: '#475569', fontWeight: 700, fontSize: '0.72rem' } },
                  tr('Group'),
                  ce('select', { value: feedbackAudienceId, onChange: function (event) { setFeedbackAudienceId(event.target.value); }, 'aria-label': tr('Choose feedback group'), style: { display: 'block', marginTop: 3, width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, background: 'white' } },
                    ce('option', { value: '' }, tr('Choose group…')),
                    sessionGroupEntries.map(function (group) { return ce('option', { key: group.id, value: group.id }, group.name); })
                  )
                ) : feedbackAudienceMode === 'individual' ? ce('label', { style: { color: '#475569', fontWeight: 700, fontSize: '0.72rem' } },
                  tr('Student'),
                  ce('select', { value: feedbackAudienceId, onChange: function (event) { setFeedbackAudienceId(event.target.value); }, 'aria-label': tr('Choose feedback student'), style: { display: 'block', marginTop: 3, width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, background: 'white' } },
                    ce('option', { value: '' }, tr('Choose student…')),
                    guests.map(function (guest) { return ce('option', { key: guest.uid, value: guest.uid }, guest.codename); })
                  )
                ) : ce('p', { style: { margin: '20px 0 0 0', color: '#475569', fontSize: '0.7rem' } }, tr('All connected students'))
              ),
              ce('p', { style: { margin: 0, color: '#4f46e5', fontSize: '0.7rem', fontWeight: 700 } }, tr('Private drafting, teacher-reviewed feedback, and targeted follow-up resources.'))
            ) : null
          ) : null,
          pollType === 'rating' ? ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 8 } },
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
          pollType === 'mcq' ? ce('textarea', { value: pollOptions, onChange: function (e) { setPollOptions(e.target.value); }, 'aria-label': tr('Choices (one per line)'), placeholder: tr('One choice per line'), rows: 4, style: { width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 6, marginBottom: 8, boxSizing: 'border-box', fontFamily: 'inherit' } }) : null,
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
              ce('button', { onClick: addGroup, disabled: !newGroupName.trim(), style: { padding: '0.35rem 0.7rem', borderRadius: 4, border: '1px solid #059669', background: !newGroupName.trim() ? '#f1f5f9' : '#059669', color: !newGroupName.trim() ? '#94a3b8' : 'white', cursor: !newGroupName.trim() ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.75rem' } }, tr('+ Add group'))
            ),
            groups.length === 0 ? ce('p', { style: { fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', margin: '0 0 0.5rem 0' } }, tr('Create at least one group above to start adding routing rules.')) : null,
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
                    groups.map(function (g) { return ce('option', { key: g.id, value: g.id }, g.name); })
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
              onClick: addRule, disabled: groups.length === 0,
              style: { marginTop: composerRules.length > 0 ? 6 : 0, padding: '0.35rem 0.7rem', borderRadius: 4, border: '1px dashed ' + (groups.length === 0 ? '#cbd5e1' : '#1e3a8a'), background: 'white', color: groups.length === 0 ? '#94a3b8' : '#1e3a8a', cursor: groups.length === 0 ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.75rem' }
            }, tr('+ Add rule'))
          ) : null,
          ce('button', { onClick: broadcast, disabled: broadcastDisabled, style: { padding: '0.5rem 1rem', borderRadius: 6, border: 'none', background: broadcastDisabled ? '#cbd5e1' : '#1e3a8a', color: 'white', cursor: broadcastDisabled ? 'default' : 'pointer', fontWeight: 700 } }, tr('Broadcast to') + ' ' + broadcastTargetCount + ' ' + (broadcastTargetCount === 1 ? tr('guest') : tr('guests')))
        ),
        activePoll ? ce('div', { style: { border: '1px solid #c7d2fe', background: '#eef2ff', borderRadius: 8, padding: '0.75rem' } },
          ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
            ce('div', null,
              ce('div', { style: { fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 700, textTransform: 'uppercase' } }, activePoll.type),
              ce('div', { style: { fontWeight: 600, marginTop: 2 } }, activePoll.prompt)
            ),
            ce('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' } },
              !activeFeedbackConfig.enabled ? ce('button', { onClick: shareResults, disabled: !canShareActiveResults, style: { padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid ' + (!canShareActiveResults ? '#cbd5e1' : '#2563eb'), background: 'white', color: !canShareActiveResults ? '#94a3b8' : '#1d4ed8', cursor: !canShareActiveResults ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.8rem' } }, activePoll.type === 'wordcloud' ? (lastSharedResultsAt ? tr('Reveal updated word cloud') : tr('Reveal approved word cloud')) : (lastSharedResultsAt ? tr('Share updated results') : tr('Share anonymous results'))) : null,
              ce('button', { onClick: closePoll, style: { padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid #b91c1c', background: 'white', color: '#b91c1c', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' } }, tr('Close poll'))
            )
          ),
          ce('div', { style: { marginTop: '0.6rem', fontSize: '0.85rem' } },
            ce('strong', null, uniqueActiveResponses.length), ' / ', responseGoalBase + ' ' + tr('responded'),
            lastSharedResultsAt ? ce('span', { style: { marginLeft: 8, color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 700 } }, tr('Results shared')) : null
          ),
          ce('div', { style: { marginTop: 8, height: 8, borderRadius: 999, background: '#dbeafe', overflow: 'hidden' }, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': responsePercent, 'aria-label': tr('Poll response progress') },
            ce('div', { style: { width: responsePercent + '%', height: '100%', background: responsePercent >= 100 ? '#16a34a' : '#2563eb', transition: 'width 180ms ease' } })
          ),
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
            ce('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
              ce('div', null,
                ce('div', { style: { fontSize: '0.74rem', color: '#9a3412', fontWeight: 800, textTransform: 'uppercase' } }, tr('Teacher review')),
                ce('div', { style: { marginTop: 2, fontSize: '0.75rem', color: '#475569' } }, tr('Hold, approve, or hide each normalized term before revealing the cloud.'))
              ),
              ce('button', {
                onClick: approvePendingWordCloudTerms,
                disabled: wordCloudStatusCounts.pending === 0,
                style: { padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid ' + (wordCloudStatusCounts.pending === 0 ? '#cbd5e1' : '#15803d'), background: 'white', color: wordCloudStatusCounts.pending === 0 ? '#94a3b8' : '#166534', cursor: wordCloudStatusCounts.pending === 0 ? 'default' : 'pointer', fontWeight: 800, fontSize: '0.75rem' }
              }, tr('Approve all pending'))
            ),
            ce('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: '0.72rem', fontWeight: 700 } },
              ce('span', { style: { color: '#9a3412' } }, tr('Held:') + ' ' + wordCloudStatusCounts.pending),
              ce('span', { style: { color: '#166534' } }, tr('Approved:') + ' ' + wordCloudStatusCounts.approved),
              ce('span', { style: { color: '#64748b' } }, tr('Hidden:') + ' ' + wordCloudStatusCounts.hidden)
            ),
            summaryForActive.items.length > 0 ? renderWordCloudItems(summaryForActive.items, tr('Approved word cloud preview')) : ce('p', { style: { margin: 0, padding: '0.55rem', borderRadius: 6, background: '#f8fafc', color: '#64748b', fontSize: '0.78rem' } }, wordCloudTermsForActive.length > 0 ? tr('No terms are approved yet. Review the held terms below.') : tr('Waiting for student terms.')),
            wordCloudTermsForActive.length > 0 ? ce('div', { role: 'list', 'aria-label': tr('Word cloud moderation'), style: { display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 230, overflow: 'auto' } },
              wordCloudTermsForActive.map(function (item) {
                return ce('div', { key: item.value, role: 'listitem', style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center', padding: '0.4rem 0.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6 } },
                  ce('span', { style: { minWidth: 0, overflowWrap: 'anywhere', fontSize: '0.82rem' } },
                    ce('strong', null, item.label),
                    ce('span', { style: { marginLeft: 6, color: '#64748b', fontSize: '0.72rem' } }, '×' + item.count)
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
              })
            ) : null
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
          !activeFeedbackConfig.enabled && activePoll.type !== 'wordcloud' && uniqueActiveResponses.length > 0 ? ce('ul', { style: { listStyle: 'none', padding: 0, margin: '0.5rem 0 0 0', maxHeight: 240, overflow: 'auto' } },
            uniqueActiveResponses.map(function (r, i) {
              const display = typeof r.response === 'object' ? JSON.stringify(r.response) : String(r.response);
              return ce('li', { key: i, style: { padding: '0.4rem 0.6rem', background: 'white', borderRadius: 4, marginBottom: 4, fontSize: '0.85rem', borderLeft: '3px solid #1e3a8a', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
                ce('strong', { style: { color: '#1e3a8a' } }, r.codename),
                ce('span', null, display),
                r.routedToGroupId ? ce('span', { style: { marginLeft: 'auto', background: '#dcfce7', color: '#166534', padding: '0.1rem 0.5rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 } }, '→ ' + groupNameById(r.routedToGroupId)) : null
              );
            })
          ) : null
        ) : ce('p', { style: { fontSize: '0.8rem', color: '#64748b', marginTop: 0 } }, tr('No active poll. Compose above and broadcast to start.'))
      )
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
    const enabled = !!(sessionCode && userUid && props.enabled && hostActive !== false);
    const guestRef = R.useRef(null);
    const [activePoll, setActivePoll] = R.useState(null);
    const [submitted, setSubmitted] = R.useState(false);
    const [responseValue, setResponseValue] = R.useState('');
    const [sharedResults, setSharedResults] = R.useState(null);
    const [connectionState, setConnectionState] = R.useState('idle');
    const [submitNotice, setSubmitNotice] = R.useState(null);
    const [studentFeedback, setStudentFeedback] = R.useState(null);
    const [currentAttempt, setCurrentAttempt] = R.useState(1);
    const [submittedResponse, setSubmittedResponse] = R.useState('');
    const studentPollIdRef = R.useRef(null);
    const statusSentRef = R.useRef('');
    // Auto-rejoin: bumping joinNonce re-runs the join effect with a fresh
    // PollingGuest (fresh offer/signaling doc). The host accepts re-offers,
    // so this is the student half of the reconnect story.
    const [joinNonce, setJoinNonce] = R.useState(0);
    const retryCountRef = R.useRef(0);
    const retryTimerRef = R.useRef(null);
    const hostNonceRef = R.useRef(hostNonce);

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
            setSubmitted(false);
            setResponseValue('');
            setSubmittedResponse('');
            setStudentFeedback(null);
            setCurrentAttempt(1);
            statusSentRef.current = '';
          }
          setSubmitNotice(null);
        },
        onPollClose: function (payload) {
          setActivePoll(function (current) {
            if (!shouldApplyPollClose(current, payload)) return current;
            setSubmitted(false);
            setResponseValue('');
            setSubmittedResponse('');
            setStudentFeedback(null);
            setCurrentAttempt(1);
            studentPollIdRef.current = null;
            statusSentRef.current = '';
            setSubmitNotice(null);
            return null;
          });
        },
        onPollResults: function (summary) {
          setSharedResults(summary); setActivePoll(null); setSubmitted(false); setResponseValue('');
          setSubmittedResponse(''); setStudentFeedback(null); setCurrentAttempt(1);
          studentPollIdRef.current = null; statusSentRef.current = ''; setSubmitNotice(null);
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
        onHostClosed: function () {
          // Terminal event: the teacher closed the polling panel. Force-clear
          // any active poll so the student is never left answering into a dead
          // channel; keep already-shared results readable. Rejoin quietly in
          // the background so we reconnect if the teacher reopens the panel.
          setActivePoll(null);
          setSubmitted(false);
          setResponseValue('');
          setSubmittedResponse('');
          setStudentFeedback(null);
          setCurrentAttempt(1);
          studentPollIdRef.current = null;
          statusSentRef.current = '';
          setSubmitNotice(null);
          setConnectionState('reconnecting');
          scheduleRejoin();
        },
        onConnected: function () { retryCountRef.current = 0; setConnectionState('connected'); setSubmitNotice(null); },
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
    }, [enabled, sessionCode, userUid, codename, joinNonce, hostNonce]);

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

    if (!enabled) return null;
    if (sharedResults) return renderResultsSummary(sharedResults);
    if (!activePoll) return null;

    const feedbackConfig = normalizeFeedbackConfig(activePoll);
    const ratingScale = activePoll.type === 'rating' ? normalizeRatingScale(activePoll) : null;
    const ratingValues = ratingScale ? getRatingValues(ratingScale) : [];
    const hasResponse = activePoll.type === 'rating'
      ? responseValue !== ''
      : activePoll.type === 'wordcloud'
        ? !!normalizeWordCloudTerm(responseValue)
        : !!String(responseValue || '').trim();
    const canSubmit = !submitted && !!guestRef.current && hasResponse;
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
        else { setSubmitted(false); setResponseValue(''); setActivePoll(null); studentPollIdRef.current = null; }
      };
      const sent = guestRef.current.sendResponse(activePoll.id, payload, feedbackConfig.enabled ? { attempt: currentAttempt } : null);
      if (sent) {
        if (feedbackConfig.enabled) {
          setSubmittedResponse(payload);
          setStudentFeedback(null);
          guestRef.current.sendResponseStatus(activePoll.id, 'submitted', currentAttempt);
          statusSentRef.current = activePoll.id + ':' + currentAttempt + ':submitted';
        }
        setSubmitNotice(null);
        finishSubmitted();
      }
      else if (connectionState === 'failed') {
        exportResponseForFallback(activePoll.id, payload, codename);
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
      role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Poll:') + ' ' + activePoll.prompt,
      style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }
    },
      ce('div', { style: { background: 'white', maxWidth: 520, width: '100%', borderRadius: 12, padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } },
        ce('div', { style: { fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 } }, feedbackConfig.enabled ? tr('Feedback response') + ' · ' + tr('Attempt') + ' ' + currentAttempt : (activePoll.type === 'rating' && ratingScale ? tr('rating') + ' ' + ratingScale.min + '-' + ratingScale.max : activePoll.type)),
        ce('h2', { style: { margin: '0 0 0.55rem 0', fontSize: '1.15rem', color: '#0f172a' } }, activePoll.prompt),
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
          ce('button', { onClick: function () { setActivePoll(null); setSubmitted(false); setResponseValue(''); studentPollIdRef.current = null; }, style: { marginTop: 8, padding: '0.45rem 0.8rem', borderRadius: 6, border: '1px solid #86efac', background: 'white', color: '#166534', cursor: 'pointer', fontWeight: 800, width: '100%' } }, tr('Hide while waiting'))
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
            ce('input', { type: 'text', value: responseValue, maxLength: WORD_CLOUD_MAX_LENGTH, onChange: function (e) { setResponseValue(e.target.value); }, 'aria-label': tr('Your word or short phrase'), placeholder: tr('Enter one word or short phrase'), style: { width: '100%', padding: '0.7rem', border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' } }),
            ce('p', { style: { margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.72rem' } }, tr('Your term is held for teacher review before it can appear in the class word cloud.'))
          ) :
          ce('textarea', { value: responseValue, maxLength: feedbackConfig.enabled ? FEEDBACK_RESPONSE_MAX_LENGTH : undefined, onChange: function (e) { setResponseValue(e.target.value); }, 'aria-label': tr('Your response'), placeholder: feedbackConfig.enabled && currentAttempt > 1 ? tr('Revise your response using the feedback') : tr('Type your response'), rows: 5, style: { width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box', margin: '0 0 1rem 0' } }),
        submitted ? null : ce('button', { onClick: submit, disabled: !canSubmit, style: { padding: '0.6rem 1.2rem', borderRadius: 6, border: 'none', background: canSubmit ? '#1e3a8a' : '#cbd5e1', color: 'white', cursor: canSubmit ? 'pointer' : 'default', fontWeight: 700, width: '100%' } }, feedbackConfig.enabled && currentAttempt > 1 ? tr('Submit revision') : tr('Submit response')),
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
    matchesPredicate: matchesPredicate,
    isAbilityTieredName: isAbilityTieredName,
    buildRatingScale: buildRatingScale,
    normalizeRatingScale: normalizeRatingScale,
    buildPollResultsSummary: buildPollResultsSummary,
    normalizeWordCloudTerm: normalizeWordCloudTerm,
    buildWordCloudItems: buildWordCloudItems,
    WORD_CLOUD_MAX_LENGTH: WORD_CLOUD_MAX_LENGTH,
    normalizeFeedbackConfig: normalizeFeedbackConfig,
    normalizeFeedbackResponseText: normalizeFeedbackResponseText,
    sanitizeFeedbackPacket: sanitizeFeedbackPacket,
    upsertFeedbackResponse: upsertFeedbackResponse,
    resolveFeedbackAudienceUids: resolveFeedbackAudienceUids,
    buildFeedbackPrompt: buildFeedbackPrompt,
    FEEDBACK_RESPONSE_MAX_LENGTH: FEEDBACK_RESPONSE_MAX_LENGTH,
    FEEDBACK_CRITERIA_MAX_LENGTH: FEEDBACK_CRITERIA_MAX_LENGTH,
    FEEDBACK_TEXT_MAX_LENGTH: FEEDBACK_TEXT_MAX_LENGTH,
    upsertLiveGuest: upsertLiveGuest,
    upsertPollResponse: upsertPollResponse,
    uniqueResponsesForSummary: uniqueResponsesForSummary,
    shouldApplyPollClose: shouldApplyPollClose,
    PollingHost: PollingHost,
    PollingGuest: PollingGuest,
    HostPanel: HostPanel,
    GuestOverlay: GuestOverlay,
    _meta: {
      version: '1.8.0',
      description: 'FERPA-by-design live polling via WebRTC peer-to-peer with rating, multiple choice, free text, teacher-reviewed feedback and revision, and teacher-moderated word clouds; custom rating scales; teacher-selected post-submit behavior; anonymous aggregate result sharing; teacher-authored auto-routing rules; reconnect-safe transport (hostClosed terminal event, re-offer handling, state sync on reconnect, guest auto-rejoin); initialPoll composer presets (Live Session Center Quick Check, Word Cloud, and Feedback Response); a roster gate on incoming offers (allowedUids); and a window.__alloRtcConfig TURN override hook.',
    },
  };

  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.LivePolling = LivePolling;
  }
})();
