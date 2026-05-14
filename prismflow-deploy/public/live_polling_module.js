// live_polling_module.js
// FERPA-by-design live polling via WebRTC peer-to-peer.
//
// Application data (poll prompts, student responses including free text,
// codenames) flows browser-to-browser over RTCDataChannel and never persists
// on any server. Only the WebRTC signaling handshake (SDP descriptions and
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
//   host.broadcastPoll({ id, type, prompt, options? });
//   host.closePoll(pollId);
//   host.stop();
//
//   const guest = LivePolling.createGuest({
//     sessionCode: 'ABCD',
//     userUid: user.uid,
//     codename: studentNickname,
//     onPoll:        (poll) => ...,
//     onPollClose:   ({ pollId }) => ...,
//     onConnected:   () => ...,
//     onDisconnected: () => ...,
//     onFailed:      () => ...,  // signaling timeout; UI should fall back to async
//   });
//   await guest.join();
//   guest.sendResponse(pollId, response);
//   guest.leave();

(function () {
  const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
  const RTC_CONFIG = { iceServers: STUN_SERVERS };
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
  const signalingDocRef = (sessionCode, peerUid) => {
    const fb = getFb();
    if (!fb) return null;
    return fb.doc(fb.db, 'artifacts', getAppId(), 'public', 'data', 'signaling', sessionCode, 'peers', peerUid);
  };
  const signalingCollectionRef = (sessionCode) => {
    const fb = getFb();
    if (!fb || !fb.collection) return null;
    return fb.collection(fb.db, 'artifacts', getAppId(), 'public', 'data', 'signaling', sessionCode, 'peers');
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
      this.onGuestLeft = config.onGuestLeft || (() => {});
      this.peers = new Map();
      this.collectionUnsub = null;
      this.activePoll = null;
      this._stopped = false;
    }

    async start() {
      const fb = getFb();
      if (!fb) throw new Error('LivePolling: Firebase not available');
      if (!this.sessionCode) throw new Error('LivePolling: sessionCode required');
      const peersRef = signalingCollectionRef(this.sessionCode);
      if (!peersRef) throw new Error('LivePolling: cannot resolve signaling collection');
      this.collectionUnsub = fb.onSnapshot(peersRef, (snap) => {
        if (this._stopped) return;
        snap.docChanges().forEach((change) => {
          if (change.type === 'removed') return;
          const uid = change.doc.id;
          const data = change.doc.data() || {};
          if (data.offer && !this.peers.has(uid)) {
            this._acceptPeer(uid, data, change.doc.ref);
          } else if (data.iceFromGuest && this.peers.has(uid)) {
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
      const pc = new RTCPeerConnection(RTC_CONFIG);
      const codename = (typeof offerData.codename === 'string' && offerData.codename.slice(0, 64)) || 'Guest';
      const peerRecord = { pc, dc: null, signalingRef, codename, sentIce: [] };
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
          if (this.activePoll) {
            try { dc.send(JSON.stringify({ type: 'poll', payload: this.activePoll })); } catch (err) {}
          }
        };
        dc.onmessage = (msg) => {
          try {
            const parsed = JSON.parse(msg.data);
            if (parsed && parsed.type === 'response' && parsed.payload) {
              this.onResponse(uid, codename, parsed.payload);
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

    broadcastPoll(poll) {
      if (!poll || !poll.id) return;
      this.activePoll = poll;
      const msg = JSON.stringify({ type: 'poll', payload: poll });
      this.peers.forEach((peer) => {
        if (peer.dc && peer.dc.readyState === 'open') {
          try { peer.dc.send(msg); } catch (err) {}
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
      if (this.activePoll && this.activePoll.id === idToClose) this.activePoll = null;
    }

    _cleanupPeer(uid) {
      const peer = this.peers.get(uid);
      if (!peer) return;
      try { if (peer.pc) peer.pc.close(); } catch (err) {}
      if (peer.signalingRef) {
        const fb = getFb();
        if (fb) fb.deleteDoc(peer.signalingRef).catch(() => {});
      }
      this.peers.delete(uid);
      this.onGuestLeft(uid);
    }

    stop() {
      this._stopped = true;
      if (this.collectionUnsub) {
        try { this.collectionUnsub(); } catch (err) {}
        this.collectionUnsub = null;
      }
      const uids = Array.from(this.peers.keys());
      uids.forEach((uid) => this._cleanupPeer(uid));
      this.activePoll = null;
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
      this.onConnected = config.onConnected || (() => {});
      this.onDisconnected = config.onDisconnected || (() => {});
      this.onFailed = config.onFailed || (() => {});
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
      this.signalingRef = signalingDocRef(this.sessionCode, this.userUid);
      if (!this.signalingRef) throw new Error('LivePolling: cannot resolve signaling doc');

      this.pc = new RTCPeerConnection(RTC_CONFIG);
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

    sendResponse(pollId, response) {
      if (!this.dc || this.dc.readyState !== 'open') return false;
      const payload = {
        pollId: pollId,
        response: response,
        codename: this.codename,
        timestamp: Date.now(),
      };
      try {
        this.dc.send(JSON.stringify({ type: 'response', payload: payload }));
        return true;
      } catch (err) {
        console.warn('[LivePolling guest] sendResponse failed:', err && err.message);
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

  const HostPanel = !R ? null : function HostPanel(props) {
    const sessionCode = props.sessionCode || '';
    const isOpen = !!props.isOpen;
    const onClose = props.onClose || (() => {});
    const hostRef = R.useRef(null);
    const [guests, setGuests] = R.useState([]);
    const [responses, setResponses] = R.useState({});
    const [pollType, setPollType] = R.useState('rating');
    const [pollPrompt, setPollPrompt] = R.useState('');
    const [pollOptions, setPollOptions] = R.useState('Option A\nOption B\nOption C');
    const [activePoll, setActivePoll] = R.useState(null);
    const [composerRules, setComposerRules] = R.useState([]);
    const [groups, setGroups] = R.useState([]);
    const [newGroupName, setNewGroupName] = R.useState('');
    const [showRoutingPanel, setShowRoutingPanel] = R.useState(false);
    // routingByPoll: { pollId: { uid: groupId } } — used both to suppress
    // duplicate routing on re-submission and to compute aggregates.
    const [routingByPoll, setRoutingByPoll] = R.useState({});
    // Refs keep onResponse's closure reading current state without
    // re-creating the host (which would tear down all peer connections).
    const activePollRef = R.useRef(null);
    const routingByPollRef = R.useRef({});
    R.useEffect(function () { activePollRef.current = activePoll; }, [activePoll]);
    R.useEffect(function () { routingByPollRef.current = routingByPoll; }, [routingByPoll]);

    R.useEffect(function () {
      if (!isOpen || !sessionCode) return undefined;
      const host = new PollingHost({
        sessionCode: sessionCode,
        onGuestConnected: function (uid, codename) {
          setGuests(function (prev) { return prev.concat([{ uid: uid, codename: codename }]); });
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
            const list = next[payload.pollId] ? next[payload.pollId].slice() : [];
            list.push({ uid: uid, codename: codename, response: payload.response, timestamp: payload.timestamp, routedToGroupId: routedToGroupId });
            next[payload.pollId] = list;
            return next;
          });
        },
        onGuestLeft: function (uid) {
          setGuests(function (prev) { return prev.filter(function (g) { return g.uid !== uid; }); });
        },
      });
      hostRef.current = host;
      host.start().catch(function (err) { console.warn('[LivePolling HostPanel] start failed', err); });
      return function () {
        host.stop();
        hostRef.current = null;
      };
    }, [isOpen, sessionCode]);

    const addRule = function () {
      const defaultPred = pollType === 'mcq' ? 'eq' : 'lte';
      const defaultValue = pollType === 'mcq'
        ? (pollOptions.split('\n').map(function (s) { return s.trim(); }).filter(Boolean)[0] || '')
        : 3;
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
        const ok = window.confirm('"' + name + '" looks like an ability-tiered group name. EL/UDL practice recommends neutral or theme-based names (Indigo, Sage, Pirate Crew, Space Crew). Use anyway?');
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
      const poll = {
        id: 'poll-' + Date.now(),
        type: pollType,
        prompt: pollPrompt.trim(),
        options: pollType === 'mcq'
          ? pollOptions.split('\n').map(function (s) { return s.trim(); }).filter(Boolean)
          : null,
        routingRules: validRules,
      };
      hostRef.current.broadcastPoll(poll);
      setActivePoll(poll);
      setResponses(function (prev) { const n = Object.assign({}, prev); n[poll.id] = []; return n; });
      setRoutingByPoll(function (prev) { const n = Object.assign({}, prev); n[poll.id] = {}; return n; });
    };
    const closePoll = function () {
      if (!hostRef.current || !activePoll) return;
      hostRef.current.closePoll(activePoll.id);
      setActivePoll(null);
    };
    const groupNameById = function (id) {
      const g = groups.find(function (x) { return x.id === id; });
      return g ? g.name : id;
    };

    if (!isOpen) return null;
    const activeResponses = (activePoll && responses[activePoll.id]) || [];

    return ce('div', {
      role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Live Polling Host',
      style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }
    },
      ce('div', { style: { background: 'white', maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto', borderRadius: 12, padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } },
        ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' } },
          ce('h2', { style: { margin: 0, fontSize: '1.15rem', color: '#0f172a' } }, 'Live Polling — ', ce('span', { style: { fontFamily: 'monospace', color: '#1e3a8a' } }, sessionCode)),
          ce('button', { onClick: onClose, style: { background: '#f1f5f9', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600 } }, 'Close')
        ),
        ce('p', { style: { fontSize: '0.85rem', color: '#475569', margin: '0 0 0.75rem 0' } }, 'Connected: ',
          ce('strong', null, guests.length), ' guest', guests.length === 1 ? '' : 's',
          guests.length > 0 ? ' (' + guests.map(function (g) { return g.codename; }).join(', ') + ')' : ''
        ),
        ce('div', { style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem' } },
          ce('h3', { style: { margin: '0 0 0.5rem 0', fontSize: '0.95rem' } }, 'Create poll'),
          ce('div', { style: { display: 'flex', gap: 8, marginBottom: 8 } },
            ['rating', 'mcq', 'freetext'].map(function (t) {
              return ce('button', {
                key: t, onClick: function () { setPollType(t); },
                style: { padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid ' + (pollType === t ? '#1e3a8a' : '#cbd5e1'), background: pollType === t ? '#1e3a8a' : 'white', color: pollType === t ? 'white' : '#0f172a', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }
              }, t === 'rating' ? 'Rating 1–5' : t === 'mcq' ? 'Multiple choice' : 'Free text');
            })
          ),
          ce('input', { type: 'text', value: pollPrompt, onChange: function (e) { setPollPrompt(e.target.value); }, placeholder: 'Poll prompt', 'aria-label': 'Poll prompt', style: { width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 6, marginBottom: 8, boxSizing: 'border-box' } }),
          pollType === 'mcq' ? ce('textarea', { value: pollOptions, onChange: function (e) { setPollOptions(e.target.value); }, 'aria-label': 'Choices (one per line)', placeholder: 'One choice per line', rows: 4, style: { width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 6, marginBottom: 8, boxSizing: 'border-box', fontFamily: 'inherit' } }) : null,
          // ── Routing-rules expandable section ────────────────────────
          pollType !== 'freetext' ? ce('div', { style: { marginBottom: 8 } },
            ce('button', {
              onClick: function () { setShowRoutingPanel(function (v) { return !v; }); },
              style: { background: 'none', border: 'none', color: '#1e3a8a', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }
            }, showRoutingPanel ? '▾' : '▸', ' Routing rules ', ce('span', { style: { fontWeight: 400, color: '#64748b' } }, '(' + composerRules.length + ' rule' + (composerRules.length === 1 ? '' : 's') + ')'))
          ) : null,
          (pollType !== 'freetext' && showRoutingPanel) ? ce('div', { style: { background: 'white', border: '1px dashed #c7d2fe', borderRadius: 6, padding: '0.6rem', marginBottom: 8 } },
            ce('p', { style: { fontSize: '0.75rem', color: '#475569', margin: '0 0 0.5rem 0', lineHeight: 1.4 } },
              'Auto-route students into groups based on their response. Use this for ',
              ce('strong', null, 'choice'), ' (e.g., "Pirate Crew vs Space Crew") or ',
              ce('strong', null, 'formative-assessment'), ' (e.g., "rating ≤ 2 → support group").'
            ),
            // Group quick-create row
            ce('div', { style: { display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' } },
              ce('input', { type: 'text', value: newGroupName, onChange: function (e) { setNewGroupName(e.target.value); }, placeholder: 'New group name (e.g., Pirate Crew)', 'aria-label': 'New group name', style: { flex: 1, padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' } }),
              ce('button', { onClick: addGroup, disabled: !newGroupName.trim(), style: { padding: '0.35rem 0.7rem', borderRadius: 4, border: '1px solid #059669', background: !newGroupName.trim() ? '#f1f5f9' : '#059669', color: !newGroupName.trim() ? '#94a3b8' : 'white', cursor: !newGroupName.trim() ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.75rem' } }, '+ Add group')
            ),
            groups.length === 0 ? ce('p', { style: { fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', margin: '0 0 0.5rem 0' } }, 'Create at least one group above to start adding routing rules.') : null,
            // Rules list
            composerRules.length > 0 ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              composerRules.map(function (rule) {
                const isMcq = pollType === 'mcq';
                const opts = pollOptions.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
                const valueInput = isMcq
                  ? ce('select', {
                      value: rule.when.value, 'aria-label': 'Choice', onChange: function (e) { updateRule(rule.id, { when: { value: e.target.value } }); },
                      style: { padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }
                    }, opts.map(function (opt) { return ce('option', { key: opt, value: opt }, opt); }))
                  : (rule.when.predicate === 'between'
                      ? ce('span', { style: { display: 'inline-flex', gap: 4 } },
                          ce('input', { type: 'number', value: (rule.when.value && rule.when.value[0]) || 1, min: 1, max: 5, 'aria-label': 'Range min', onChange: function (e) { const v = Math.max(1, Math.min(5, Number(e.target.value) || 1)); updateRule(rule.id, { when: { value: [v, (rule.when.value && rule.when.value[1]) || 5] } }); }, style: { width: 50, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' } }),
                          ce('span', { style: { alignSelf: 'center', fontSize: '0.75rem' } }, 'to'),
                          ce('input', { type: 'number', value: (rule.when.value && rule.when.value[1]) || 5, min: 1, max: 5, 'aria-label': 'Range max', onChange: function (e) { const v = Math.max(1, Math.min(5, Number(e.target.value) || 5)); updateRule(rule.id, { when: { value: [(rule.when.value && rule.when.value[0]) || 1, v] } }); }, style: { width: 50, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' } })
                        )
                      : ce('input', { type: 'number', value: rule.when.value, min: 1, max: 5, 'aria-label': 'Rating value', onChange: function (e) { updateRule(rule.id, { when: { value: Math.max(1, Math.min(5, Number(e.target.value) || 1)) } }); }, style: { width: 60, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' } })
                    );
                return ce('div', { key: rule.id, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem', background: '#f8fafc', borderRadius: 4, fontSize: '0.8rem', flexWrap: 'wrap' } },
                  ce('span', { style: { color: '#64748b' } }, 'When'),
                  ce('select', {
                    value: rule.when.predicate, 'aria-label': 'Predicate', onChange: function (e) {
                      const newPred = e.target.value;
                      // Reset value when predicate changes between scalar/array forms
                      let newVal = rule.when.value;
                      if (newPred === 'between' && !Array.isArray(rule.when.value)) newVal = [1, 5];
                      if (newPred !== 'between' && Array.isArray(rule.when.value)) newVal = isMcq ? (opts[0] || '') : 3;
                      updateRule(rule.id, { when: { predicate: newPred, value: newVal } });
                    },
                    style: { padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }
                  },
                    isMcq ? ce('option', { value: 'eq' }, 'is') : null,
                    !isMcq ? ce('option', { value: 'eq' }, 'equals') : null,
                    !isMcq ? ce('option', { value: 'lte' }, '≤') : null,
                    !isMcq ? ce('option', { value: 'gte' }, '≥') : null,
                    !isMcq ? ce('option', { value: 'between' }, 'between') : null
                  ),
                  valueInput,
                  ce('span', { style: { color: '#64748b' } }, '→ route to'),
                  ce('select', {
                    value: rule.then.groupId, 'aria-label': 'Target group', onChange: function (e) { updateRule(rule.id, { then: { groupId: e.target.value } }); },
                    style: { padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }
                  },
                    ce('option', { value: '' }, '— pick group —'),
                    groups.map(function (g) { return ce('option', { key: g.id, value: g.id }, g.name); })
                  ),
                  ce('button', {
                    onClick: function () { removeRule(rule.id); },
                    'aria-label': 'Remove rule',
                    style: { marginLeft: 'auto', padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid #fca5a5', background: 'white', color: '#b91c1c', cursor: 'pointer', fontSize: '0.75rem' }
                  }, '✕')
                );
              })
            ) : null,
            ce('button', {
              onClick: addRule, disabled: groups.length === 0,
              style: { marginTop: composerRules.length > 0 ? 6 : 0, padding: '0.35rem 0.7rem', borderRadius: 4, border: '1px dashed ' + (groups.length === 0 ? '#cbd5e1' : '#1e3a8a'), background: 'white', color: groups.length === 0 ? '#94a3b8' : '#1e3a8a', cursor: groups.length === 0 ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.75rem' }
            }, '+ Add rule')
          ) : null,
          ce('button', { onClick: broadcast, disabled: !pollPrompt.trim() || guests.length === 0, style: { padding: '0.5rem 1rem', borderRadius: 6, border: 'none', background: !pollPrompt.trim() || guests.length === 0 ? '#cbd5e1' : '#1e3a8a', color: 'white', cursor: !pollPrompt.trim() || guests.length === 0 ? 'default' : 'pointer', fontWeight: 700 } }, 'Broadcast to ' + guests.length + ' guest' + (guests.length === 1 ? '' : 's'))
        ),
        activePoll ? ce('div', { style: { border: '1px solid #c7d2fe', background: '#eef2ff', borderRadius: 8, padding: '0.75rem' } },
          ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
            ce('div', null,
              ce('div', { style: { fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 700, textTransform: 'uppercase' } }, activePoll.type),
              ce('div', { style: { fontWeight: 600, marginTop: 2 } }, activePoll.prompt)
            ),
            ce('button', { onClick: closePoll, style: { padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid #b91c1c', background: 'white', color: '#b91c1c', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' } }, 'Close poll')
          ),
          ce('div', { style: { marginTop: '0.6rem', fontSize: '0.85rem' } },
            ce('strong', null, activeResponses.length), ' / ', guests.length, ' responded'
          ),
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
                  ce('span', { style: { fontWeight: 600, color: '#1e3a8a' } }, 'Auto-routed:'),
                  entries.map(function (gid) {
                    return ce('span', { key: gid, style: { background: '#eef2ff', color: '#1e3a8a', padding: '0.1rem 0.5rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 } },
                      counts[gid] + ' → ' + groupNameById(gid));
                  })
                );
              })()
            : null,
          activeResponses.length > 0 ? ce('ul', { style: { listStyle: 'none', padding: 0, margin: '0.5rem 0 0 0', maxHeight: 240, overflow: 'auto' } },
            activeResponses.map(function (r, i) {
              const display = typeof r.response === 'object' ? JSON.stringify(r.response) : String(r.response);
              return ce('li', { key: i, style: { padding: '0.4rem 0.6rem', background: 'white', borderRadius: 4, marginBottom: 4, fontSize: '0.85rem', borderLeft: '3px solid #1e3a8a', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
                ce('strong', { style: { color: '#1e3a8a' } }, r.codename),
                ce('span', null, display),
                r.routedToGroupId ? ce('span', { style: { marginLeft: 'auto', background: '#dcfce7', color: '#166534', padding: '0.1rem 0.5rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 } }, '→ ' + groupNameById(r.routedToGroupId)) : null
              );
            })
          ) : null
        ) : ce('p', { style: { fontSize: '0.8rem', color: '#64748b', marginTop: 0 } }, 'No active poll. Compose above and broadcast to start.')
      )
    );
  };

  const GuestOverlay = !R ? null : function GuestOverlay(props) {
    const sessionCode = props.sessionCode;
    const userUid = props.userUid;
    const codename = props.codename;
    const enabled = !!(sessionCode && userUid && props.enabled);
    const guestRef = R.useRef(null);
    const [activePoll, setActivePoll] = R.useState(null);
    const [submitted, setSubmitted] = R.useState(false);
    const [responseValue, setResponseValue] = R.useState('');
    const [connectionState, setConnectionState] = R.useState('idle');

    R.useEffect(function () {
      if (!enabled) return undefined;
      setConnectionState('connecting');
      const guest = new PollingGuest({
        sessionCode: sessionCode,
        userUid: userUid,
        codename: codename,
        onPoll: function (p) { setActivePoll(p); setSubmitted(false); setResponseValue(''); },
        onPollClose: function () { setActivePoll(null); setSubmitted(false); setResponseValue(''); },
        onConnected: function () { setConnectionState('connected'); },
        onDisconnected: function () { setConnectionState('disconnected'); },
        onFailed: function () { setConnectionState('failed'); },
      });
      guestRef.current = guest;
      guest.join().catch(function (err) { console.warn('[LivePolling GuestOverlay] join failed', err); setConnectionState('failed'); });
      return function () {
        guest.leave();
        guestRef.current = null;
      };
    }, [enabled, sessionCode, userUid, codename]);

    if (!enabled || !activePoll) return null;

    const submit = function () {
      if (submitted || !guestRef.current) return;
      let payload;
      if (activePoll.type === 'rating') payload = Number(responseValue) || 0;
      else if (activePoll.type === 'mcq') payload = String(responseValue);
      else payload = String(responseValue);
      if (activePoll.type === 'rating' && !payload) return;
      if (activePoll.type !== 'rating' && !String(payload).trim()) return;
      const sent = guestRef.current.sendResponse(activePoll.id, payload);
      if (sent) setSubmitted(true);
      else if (connectionState === 'failed') {
        exportResponseForFallback(activePoll.id, payload, codename);
        setSubmitted(true);
      }
    };

    return ce('div', {
      role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Poll: ' + activePoll.prompt,
      style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }
    },
      ce('div', { style: { background: 'white', maxWidth: 520, width: '100%', borderRadius: 12, padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } },
        ce('div', { style: { fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 } }, activePoll.type),
        ce('h2', { style: { margin: '0 0 1rem 0', fontSize: '1.15rem', color: '#0f172a' } }, activePoll.prompt),
        submitted ? ce('div', { style: { padding: '0.75rem', background: '#dcfce7', color: '#166534', borderRadius: 6, fontWeight: 600 } }, 'Response sent. Waiting for the teacher to close this poll.') :
          activePoll.type === 'rating' ? ce('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', margin: '1rem 0' } },
            [1, 2, 3, 4, 5].map(function (n) {
              return ce('button', { key: n, onClick: function () { setResponseValue(n); }, style: { width: 48, height: 48, borderRadius: 24, border: '2px solid ' + (Number(responseValue) === n ? '#1e3a8a' : '#cbd5e1'), background: Number(responseValue) === n ? '#1e3a8a' : 'white', color: Number(responseValue) === n ? 'white' : '#0f172a', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' } }, n);
            })
          ) :
          activePoll.type === 'mcq' ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, margin: '0.5rem 0 1rem 0' } },
            (activePoll.options || []).map(function (opt, i) {
              return ce('button', { key: i, onClick: function () { setResponseValue(opt); }, style: { textAlign: 'left', padding: '0.6rem 0.9rem', borderRadius: 8, border: '2px solid ' + (responseValue === opt ? '#1e3a8a' : '#cbd5e1'), background: responseValue === opt ? '#eef2ff' : 'white', cursor: 'pointer', fontWeight: 500 } }, opt);
            })
          ) :
          ce('textarea', { value: responseValue, onChange: function (e) { setResponseValue(e.target.value); }, 'aria-label': 'Your response', placeholder: 'Type your response', rows: 5, style: { width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box', margin: '0 0 1rem 0' } }),
        submitted ? null : ce('button', { onClick: submit, style: { padding: '0.6rem 1.2rem', borderRadius: 6, border: 'none', background: '#1e3a8a', color: 'white', cursor: 'pointer', fontWeight: 700, width: '100%' } }, 'Submit response'),
        connectionState === 'failed' ? ce('p', { style: { fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.75rem', marginBottom: 0 } }, 'Direct connection failed. Submitting will export your response as a downloadable file for the teacher to import.') :
          connectionState === 'connecting' ? ce('p', { style: { fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem', marginBottom: 0 } }, 'Connecting…') : null
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
    PollingHost: PollingHost,
    PollingGuest: PollingGuest,
    HostPanel: HostPanel,
    GuestOverlay: GuestOverlay,
    _meta: {
      version: '1.1.0',
      description: 'FERPA-by-design live polling via WebRTC peer-to-peer with teacher-authored auto-routing rules. Signaling-only Firestore use; application data flows browser-to-browser; only Tier-1 groupId writes touch the session doc.',
    },
  };

  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.LivePolling = LivePolling;
  }
})();
