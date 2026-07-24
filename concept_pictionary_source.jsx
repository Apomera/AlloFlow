// concept_pictionary_source.jsx
// Concept Pictionary + Sketch Response — two live drawing modes on one engine.
//
// Pictionary assigns student drawers to a shared canvas while classmates guess.
// Sketch Response gives selected students individual private boards collected in
// a teacher gallery, with moderated anonymous reveal and targeted follow-up
// resources. Both modes reuse the same canvas, round lifecycle, and WebRTC star.
//
// FERPA-by-design: strokes + guesses flow peer-to-peer over WebRTC and never
// persist. Sketch strokes stop at the teacher host; they are not rebroadcast to
// peers unless the teacher explicitly approves and anonymously reveals a board.
// The only Firestore writes are (a) WebRTC signaling docs (deleted on connect)
// and (b) Tier-1 roster role/resource ids and pictionaryRound metadata. Prompts
// are sent peer-to-peer only to selected drawing participants.
//
// Sibling to LivePolling — same star-topology architecture, separate signaling
// collection so both activities can coexist on the same session.

// ── Helpers ─────────────────────────────────────────────────────────────
const _pic_genId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── Guess match SUGGESTION (2026-07-16) ─────────────────────────────────────
// Guesses are deliberately teacher-judged (this is a concept probe, and near-miss
// vocabulary is teaching signal) — so this NEVER auto-awards. It only highlights
// guesses that look like the concept so the teacher can spot them in a busy feed.
// Tolerates case, accents, punctuation, articles, spacing, and simple plurals.
const _pic_normalizeGuess = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\b(the|a|an)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const _pic_guessLooksRight = (guess, concept) => {
  const g = _pic_normalizeGuess(guess);
  const c = _pic_normalizeGuess(concept);
  if (!g || !c) return false;
  if (g === c) return true;
  if (g.includes(c) || c.includes(g)) return true;   // "the water cycle!!" vs "water cycle"
  const stem = (w) => w.replace(/(es|s)$/, '');
  return g.split(' ').map(stem).join(' ') === c.split(' ').map(stem).join(' ');
};

// Fullscreen helper hook — works against the standard Fullscreen API with
// the webkit-prefixed fallback for older Safari. Returns [isFullscreen, toggle].
// Pass a ref to the element you want fullscreened. Cleans up the listener on
// unmount; gracefully no-ops if the API isn't available (e.g. iframed contexts).
const useFullscreen = (elementRef) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  React.useEffect(() => {
    const handler = () => {
      const fsEl = (typeof document !== 'undefined') && (document.fullscreenElement || document.webkitFullscreenElement || null);
      setIsFullscreen(!!fsEl && elementRef && elementRef.current === fsEl);
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, [elementRef]);
  const toggle = React.useCallback(() => {
    if (typeof document === 'undefined') return;
    const el = elementRef && elementRef.current;
    if (!el) return;
    const inFs = document.fullscreenElement || document.webkitFullscreenElement;
    try {
      if (inFs) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else {
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      }
    } catch (_) {}
  }, [elementRef]);
  return [isFullscreen, toggle];
};

const PEN_COLORS = [
  { name: 'black',  hex: '#1a202c' },
  { name: 'red',    hex: '#c53030' },
  { name: 'blue',   hex: '#2b6cb0' },
  { name: 'green',  hex: '#2f855a' },
  { name: 'orange', hex: '#dd6b20' },
  { name: 'purple', hex: '#6b46c1' },
];
const ERASER_SENTINEL = '__eraser__';

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 480;
const STROKE_THROTTLE_MS = 33;
const STROKE_HISTORY_CAP = 800;  // beyond this, oldest strokes get merged into baseline image
const CONNECTION_TIMEOUT_MS = 10000;
const PICTIONARY_SIGNALING_PATH = 'pictionary-signaling';
const PICTIONARY_ACTIVITY_MODE = 'pictionary';
const SKETCH_RESPONSE_ACTIVITY_MODE = 'sketch';

const normalizePictionaryActivityMode = (value) =>
  value === SKETCH_RESPONSE_ACTIVITY_MODE ? SKETCH_RESPONSE_ACTIVITY_MODE : PICTIONARY_ACTIVITY_MODE;

const groupSketchStrokesByUid = (strokes) => {
  const grouped = {};
  (Array.isArray(strokes) ? strokes : []).forEach((stroke) => {
    if (!stroke || !stroke.uid) return;
    if (!grouped[stroke.uid]) grouped[stroke.uid] = [];
    grouped[stroke.uid].push(stroke);
  });
  return grouped;
};

const sanitizeSketchRevealStrokes = (strokes) => {
  const allowedColors = new Set(PEN_COLORS.map((entry) => entry.hex).concat([ERASER_SENTINEL]));
  return (Array.isArray(strokes) ? strokes : []).slice(-STROKE_HISTORY_CAP).map((stroke, index) => {
    if (!stroke || !Array.isArray(stroke.points)) return null;
    const points = stroke.points.slice(0, 600).map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const x = Number(point[0]);
      const y = Number(point[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return [
        Math.max(0, Math.min(CANVAS_WIDTH, x)),
        Math.max(0, Math.min(CANVAS_HEIGHT, y)),
      ];
    }).filter(Boolean);
    if (!points.length) return null;
    return {
      strokeId: String(stroke.strokeId || ('reveal-' + index)).slice(0, 80),
      color: allowedColors.has(stroke.color) ? stroke.color : PEN_COLORS[0].hex,
      points,
      ts: Number(stroke.ts) || 0,
    };
  }).filter(Boolean);
};

const buildSketchSubmissionSummary = (participantUids, strokesByUid, statuses, moderation) => {
  const grouped = strokesByUid && typeof strokesByUid === 'object' ? strokesByUid : {};
  const safeStatuses = statuses && typeof statuses === 'object' ? statuses : {};
  const safeModeration = moderation && typeof moderation === 'object' ? moderation : {};
  return (Array.isArray(participantUids) ? participantUids : []).map((uid) => {
    const strokes = Array.isArray(grouped[uid]) ? grouped[uid] : [];
    const review = safeModeration[uid] === 'approved' || safeModeration[uid] === 'hidden'
      ? safeModeration[uid]
      : 'hold';
    return {
      uid,
      strokeCount: strokes.length,
      status: safeStatuses[uid] === 'submitted' ? 'submitted' : 'drawing',
      moderation: review,
      revealable: strokes.length > 0 && safeStatuses[uid] === 'submitted' && review === 'approved',
    };
  });
};

// ── Firebase helpers (mirror LivePolling's getFb pattern) ───────────────
const _getFb = () => {
  const fb = (typeof window !== 'undefined') && window.__alloFirebase;
  if (!fb || !fb.db || !fb.doc || !fb.setDoc || !fb.onSnapshot) return null;
  return fb;
};
const _getAppId = () => {
  if (typeof window === 'undefined') return 'default-app-id';
  if (window.appId) return window.appId;
  if (typeof window.__app_id !== 'undefined') return window.__app_id;
  return 'default-app-id';
};
const _signalingDocRef = (sessionCode, peerUid) => {
  const fb = _getFb();
  if (!fb) return null;
  return fb.doc(fb.db, 'artifacts', _getAppId(), 'public', 'data', PICTIONARY_SIGNALING_PATH, sessionCode, 'peers', peerUid);
};
const _signalingCollectionRef = (sessionCode) => {
  const fb = _getFb();
  if (!fb || !fb.collection) return null;
  return fb.collection(fb.db, 'artifacts', _getAppId(), 'public', 'data', PICTIONARY_SIGNALING_PATH, sessionCode, 'peers');
};

const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const RTC_CONFIG = { iceServers: STUN_SERVERS };
// Deploy-time override hook (mirrors LivePolling's getRtcConfig): set
// window.__alloRtcConfig = { iceServers: [...] } to add TURN servers for
// UDP-blocked school networks without a module change.
const _getRtcConfig = () => {
  const cfg = (typeof window !== 'undefined') && window.__alloRtcConfig;
  return (cfg && Array.isArray(cfg.iceServers) && cfg.iceServers.length > 0) ? cfg : RTC_CONFIG;
};

// ── PictionaryHost (teacher) ────────────────────────────────────────────
// Mirrors PollingHost: collection listener, accept-peer flow, per-peer
// data channel. The differences vs polling:
//   - Stroke broadcast: re-emits incoming strokes from drawers to all OTHER
//     peers (so guessers see every drawer's strokes, and drawers see each
//     other's so they can coordinate).
//   - Stroke history buffer: every stroke is stored on the host in memory;
//     when a new peer connects mid-round, host replays the buffer so the
//     joiner sees the same canvas as everyone else. Memory only, never
//     persisted. Cleared on round end.
//   - Concept prompt: sent only to peers whose uid is in the drawerUids set.
class PictionaryHost {
  constructor(config) {
    this.sessionCode = config.sessionCode;
    this.onGuestConnected = config.onGuestConnected || (() => {});
    this.onGuestLeft = config.onGuestLeft || (() => {});
    this.onStroke = config.onStroke || (() => {});
    this.onGuess = config.onGuess || (() => {});
    // Fired when a drawer broadcasts an undo so the host view can drop the
    // stroke from its local rendering state (the host's strokeHistory buffer
    // is updated inside _onIncomingStrokeUndo).
    this.onStrokeUndo = config.onStrokeUndo || (() => {});
    this.onSketchStatus = config.onSketchStatus || (() => {});
    // Fired when an active round auto-resolves due to timer expiration. The
    // view uses this to flip its own round-resolved local state since the
    // resolution didn't originate from a user click.
    this.onRoundAutoResolved = config.onRoundAutoResolved || (() => {});
    this.peers = new Map();           // uid -> { pc, dc, codename, signalingRef }
    this.collectionUnsub = null;
    this.activeRound = null;          // { roundId, concept, drawerUids: Set, status, startedAt, durationMs }
    this.strokeHistory = [];          // [{strokeId, uid, color, points}]
    this.lastResolvedSketch = null;     // { prompt } while the host gallery remains open
    this._timeoutHandle = null;
    this._stopped = false;
    // Roster gate: when set (Set of uids), offers from unknown uids are
    // ignored — defense-in-depth against drive-by connections to a guessed
    // session code (not a security boundary alone; see
    // docs/LIVE_SESSION_HARDENING_PROPOSAL.md). null = allow all (legacy).
    this._allowedUids = config.allowedUids ? new Set(config.allowedUids) : null;
  }
  setAllowedUids(uids) {
    this._allowedUids = uids ? new Set(uids) : null;
  }
  async start() {
    const fb = _getFb();
    if (!fb) throw new Error('Pictionary: Firebase not available');
    if (!this.sessionCode) throw new Error('Pictionary: sessionCode required');
    const peersRef = _signalingCollectionRef(this.sessionCode);
    if (!peersRef) throw new Error('Pictionary: cannot resolve signaling collection');
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
          // Re-offer: the student reloaded (or auto-rejoined after a drop)
          // while the host still holds their old, dead peer. Replace it and
          // answer the fresh offer; otherwise reconnect silently fails until
          // the stale RTC connection times out.
          this._cleanupPeer(uid);
          this._acceptPeer(uid, data, change.doc.ref);
        } else if (data.iceFromGuest && existing) {
          (data.iceFromGuest || []).forEach((c) => {
            try { existing.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}); } catch (_) {}
          });
        }
      });
    }, (err) => {
      console.warn('[Pictionary host] signaling subscribe error:', err && err.message);
    });
  }
  async _acceptPeer(uid, offerData, signalingRef) {
    const fb = _getFb();
    if (!fb) return;
    const pc = new RTCPeerConnection(_getRtcConfig());
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
        // Pictionary peers share one canvas. Sketch Response peers receive
        // only their own private history on reconnect; no classmate strokes.
        if (this.strokeHistory.length > 0) {
          const privateSketch = (this.activeRound && this.activeRound.mode === SKETCH_RESPONSE_ACTIVITY_MODE)
            || (!this.activeRound && this.lastResolvedSketch);
          const replay = privateSketch
            ? this.strokeHistory.filter((stroke) => stroke && stroke.uid === uid)
            : this.strokeHistory;
          if (replay.length > 0) {
            try { dc.send(JSON.stringify({ type: 'strokeHistory', payload: { strokes: replay } })); } catch (_) {}
          }
        }
        // If a round is active, also send the round-start (with concept only if drawer).
        // Includes startedAt + durationMs so late-joiners can sync their countdown.
        if (this.activeRound) {
          const isDrawer = this.activeRound.drawerUids.has(uid);
          if (this.activeRound.mode === SKETCH_RESPONSE_ACTIVITY_MODE && !isDrawer) {
            try { dc.send(JSON.stringify({ type: 'roundSync', payload: { active: false } })); } catch (_) {}
            return;
          }
          const payload = {
            roundId: this.activeRound.roundId,
            status: this.activeRound.status,
            mode: normalizePictionaryActivityMode(this.activeRound.mode),
            isDrawer,
            concept: isDrawer ? this.activeRound.concept : null,
            drawerUids: Array.from(this.activeRound.drawerUids),
            startedAt: this.activeRound.startedAt,
            durationMs: this.activeRound.durationMs,
            isPaused: !!this.activeRound.isPaused,
            pausedAt: this.activeRound.pausedAt || null,
            pausedTotalMs: this.activeRound.pausedTotalMs || 0,
            // Host clock at send time: guests anchor their countdown to the
            // host's clock (device clocks skew by minutes in real classrooms).
            hostNow: Date.now(),
          };
          try { dc.send(JSON.stringify({ type: 'roundStart', payload })); } catch (_) {}
        } else {
          // State sync on (re)connect: a reconnecting guest may hold a stale
          // round from before the drop; an explicit "no round" clears it.
          try { dc.send(JSON.stringify({ type: 'roundSync', payload: { active: false } })); } catch (_) {}
        }
      };
      dc.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          if (!parsed || !parsed.type) return;
          if (parsed.type === 'stroke' && parsed.payload) {
            this._onIncomingStroke(uid, codename, parsed.payload);
          } else if (parsed.type === 'strokeUndo' && parsed.payload && parsed.payload.strokeId) {
            this._onIncomingStrokeUndo(uid, parsed.payload.strokeId);
          } else if (parsed.type === 'sketchStatus' && parsed.payload) {
            this._onIncomingSketchStatus(uid, codename, parsed.payload);
          } else if (parsed.type === 'guess' && parsed.payload) {
            if (!this.activeRound || this.activeRound.isPaused || this.activeRound.mode === SKETCH_RESPONSE_ACTIVITY_MODE) return;
            this.onGuess(uid, codename, parsed.payload);
          }
        } catch (_) {}
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
      console.warn('[Pictionary host] accept peer failed:', err && err.message);
      this._cleanupPeer(uid);
    }
  }
  _onIncomingStroke(senderUid, senderCodename, stroke) {
    // Reject strokes from peers not currently assigned as drawers
    if (!this.activeRound || this.activeRound.isPaused || !this.activeRound.drawerUids.has(senderUid)) return;
    // Sanitize untrusted peer payloads before buffering or forwarding. This
    // also bounds point arrays when a whole class sketches concurrently.
    const safeStroke = sanitizeSketchRevealStrokes([stroke])[0];
    if (!safeStroke) return;
    const augmented = { ...safeStroke, uid: senderUid };
    // Buffer (cap memory)
    this.strokeHistory.push(augmented);
    if (this.strokeHistory.length > STROKE_HISTORY_CAP) {
      this.strokeHistory.splice(0, this.strokeHistory.length - STROKE_HISTORY_CAP);
    }
    // Pictionary is collaborative and re-broadcasts strokes. Sketch
    // Response is private-by-default: strokes stop at the teacher host.
    if (this.activeRound.mode !== SKETCH_RESPONSE_ACTIVITY_MODE) {
      const msg = JSON.stringify({ type: 'stroke', payload: augmented });
      this.peers.forEach((peer, uid) => {
        if (uid === senderUid) return;
        if (peer.dc && peer.dc.readyState === 'open') {
          try { peer.dc.send(msg); } catch (_) {}
        }
      });
    }
    this.onStroke(senderUid, senderCodename, augmented);
  }
  _onIncomingSketchStatus(senderUid, senderCodename, payload) {
    if (!this.activeRound || this.activeRound.mode !== SKETCH_RESPONSE_ACTIVITY_MODE || !this.activeRound.drawerUids.has(senderUid)) return;
    const status = payload && payload.status;
    if (status !== 'submitted' && status !== 'editing') return;
    this.onSketchStatus(senderUid, senderCodename, {
      status,
      roundId: this.activeRound.roundId,
      timestamp: Number(payload.timestamp) || Date.now(),
    });
  }
  _onIncomingStrokeUndo(senderUid, strokeId) {
    if (!this.activeRound || this.activeRound.isPaused || !this.activeRound.drawerUids.has(senderUid)) return;
    // Only let a drawer undo their own strokes — silently no-op for everyone else.
    const idx = this.strokeHistory.findIndex((s) => s && s.strokeId === strokeId);
    if (idx < 0) return;
    if (this.strokeHistory[idx].uid !== senderUid) return;
    this.strokeHistory.splice(idx, 1);
    // Collaborative Pictionary peers must mirror undo. Private Sketch
    // Response boards do not disclose the undo or the underlying stroke.
    if (this.activeRound.mode !== SKETCH_RESPONSE_ACTIVITY_MODE) {
      const msg = JSON.stringify({ type: 'strokeUndo', payload: { strokeId } });
      this.peers.forEach((peer, uid) => {
        if (uid === senderUid) return;
        if (peer.dc && peer.dc.readyState === 'open') {
          try { peer.dc.send(msg); } catch (_) {}
        }
      });
    }
    this.onStrokeUndo(senderUid, strokeId);
  }
  startRound(roundData) {
    // roundData: { concept, drawerUids: string[], durationMs?: number }
    const drawerSet = new Set((roundData && roundData.drawerUids) || []);
    const activityMode = normalizePictionaryActivityMode(roundData && roundData.mode);
    const startedAt = Date.now();
    const durationMs = (roundData && typeof roundData.durationMs === 'number' && roundData.durationMs > 0) ? roundData.durationMs : null;
    this.activeRound = {
      roundId: _pic_genId('round'),
      concept: String((roundData && roundData.concept) || ''),
      drawerUids: drawerSet,
      mode: activityMode,
      status: 'drawing',
      startedAt,
      durationMs,
      isPaused: false,
      pausedAt: null,
      pausedTotalMs: 0,
    };
    this.strokeHistory = [];
    this.lastResolvedSketch = null;
    // Auto-resolve timeout when a duration is set. Pause clears this handle; resume re-arms it.
    this._armRoundTimer(durationMs);
    // Send roundStart to each peer; only drawers receive the concept
    this.peers.forEach((peer, uid) => {
      if (!peer.dc || peer.dc.readyState !== 'open') return;
      const isDrawer = drawerSet.has(uid);
      const payload = {
        roundId: this.activeRound.roundId,
        status: 'drawing',
        mode: activityMode,
        isDrawer,
        concept: isDrawer ? this.activeRound.concept : null,
        drawerUids: Array.from(drawerSet),
        startedAt,
        durationMs,
        isPaused: false,
        pausedAt: null,
        pausedTotalMs: 0,
        hostNow: Date.now(),
      };
      if (activityMode === SKETCH_RESPONSE_ACTIVITY_MODE && !isDrawer) {
        try { peer.dc.send(JSON.stringify({ type: 'roundSync', payload: { active: false } })); } catch (_) {}
      } else {
        try { peer.dc.send(JSON.stringify({ type: 'roundStart', payload })); } catch (_) {}
      }
    });
  }
  _armRoundTimer(delayMs) {
    if (this._timeoutHandle) { clearTimeout(this._timeoutHandle); this._timeoutHandle = null; }
    if (!this.activeRound || delayMs == null) return;
    this._timeoutHandle = setTimeout(() => {
      this._timeoutHandle = null;
      if (!this.activeRound || this.activeRound.isPaused) return;
      const snapshot = {
        concept: this.activeRound.concept,
        drawerUids: Array.from(this.activeRound.drawerUids),
        durationMs: this.activeRound.durationMs,
        startedAt: this.activeRound.startedAt,
        mode: normalizePictionaryActivityMode(this.activeRound.mode),
        reason: 'timeout',
      };
      this.resolveRound({ winnerUid: null, reason: 'timeout' });
      try { this.onRoundAutoResolved(snapshot); } catch (_) {}
    }, Math.max(1, delayMs));
  }
  _broadcastRoundTiming() {
    if (!this.activeRound) return;
    const payload = {
      roundId: this.activeRound.roundId,
      startedAt: this.activeRound.startedAt,
      durationMs: this.activeRound.durationMs,
      isPaused: !!this.activeRound.isPaused,
      pausedAt: this.activeRound.pausedAt || null,
      pausedTotalMs: this.activeRound.pausedTotalMs || 0,
      hostNow: Date.now(),
    };
    const msg = JSON.stringify({ type: 'roundTiming', payload });
    this.peers.forEach((peer) => {
      if (peer.dc && peer.dc.readyState === 'open') { try { peer.dc.send(msg); } catch (_) {} }
    });
  }
  pauseRound() {
    const round = this.activeRound;
    if (!round || !round.durationMs || round.isPaused) return false;
    const now = Date.now();
    const elapsed = now - round.startedAt - (round.pausedTotalMs || 0);
    round.isPaused = true;
    round.pausedAt = now;
    round.remainingMs = Math.max(0, round.durationMs - elapsed);
    if (this._timeoutHandle) { clearTimeout(this._timeoutHandle); this._timeoutHandle = null; }
    this._broadcastRoundTiming();
    return true;
  }
  resumeRound() {
    const round = this.activeRound;
    if (!round || !round.durationMs || !round.isPaused) return false;
    const now = Date.now();
    round.pausedTotalMs = (round.pausedTotalMs || 0) + Math.max(0, now - round.pausedAt);
    round.pausedAt = null;
    round.isPaused = false;
    const remainingMs = Math.max(0, round.durationMs - (now - round.startedAt - round.pausedTotalMs));
    round.remainingMs = remainingMs;
    this._broadcastRoundTiming();
    this._armRoundTimer(remainingMs);
    return true;
  }
  resolveRound(result) {
    // result: { winnerUid?: string, reason?: 'timeout' | 'manual' }
    if (!this.activeRound) return;
    if (this._timeoutHandle) { clearTimeout(this._timeoutHandle); this._timeoutHandle = null; }
    const resolvedMode = normalizePictionaryActivityMode(this.activeRound.mode);
    const resolvedPrompt = this.activeRound.concept;
    const resolvedParticipants = Array.from(this.activeRound.drawerUids);
    const payload = {
      roundId: this.activeRound.roundId,
      status: 'resolved',
      mode: resolvedMode,
      winnerUid: (result && result.winnerUid) || null,
      concept: resolvedPrompt,
      reason: (result && result.reason) || 'manual',
    };
    const msg = JSON.stringify({ type: 'roundResolved', payload });
    this.peers.forEach((peer, uid) => {
      if (resolvedMode === SKETCH_RESPONSE_ACTIVITY_MODE && !resolvedParticipants.includes(uid)) return;
      if (peer.dc && peer.dc.readyState === 'open') {
        try { peer.dc.send(msg); } catch (_) {}
      }
    });
    this.activeRound = null;
    if (resolvedMode === SKETCH_RESPONSE_ACTIVITY_MODE) {
      this.lastResolvedSketch = { prompt: resolvedPrompt, participantUids: resolvedParticipants };
    } else {
      this.strokeHistory = [];
      this.lastResolvedSketch = null;
    }
  }
  broadcastSketchReveal(sourceUid, prompt) {
    if (!sourceUid) return null;
    const strokes = sanitizeSketchRevealStrokes(this.strokeHistory.filter((stroke) => stroke && stroke.uid === sourceUid));
    if (!strokes.length) return null;
    const payload = {
      revealId: _pic_genId('sketch-reveal'),
      label: 'Anonymous sketch',
      prompt: String(prompt || (this.activeRound && this.activeRound.concept) || (this.lastResolvedSketch && this.lastResolvedSketch.prompt) || '').slice(0, 500),
      strokes,
    };
    const msg = JSON.stringify({ type: 'sketchReveal', payload });
    const participantUids = this.activeRound && this.activeRound.mode === SKETCH_RESPONSE_ACTIVITY_MODE
      ? Array.from(this.activeRound.drawerUids)
      : (this.lastResolvedSketch && this.lastResolvedSketch.participantUids) || [];
    this.peers.forEach((peer, uid) => {
      if (!participantUids.includes(uid)) return;
      if (peer.dc && peer.dc.readyState === 'open') {
        try { peer.dc.send(msg); } catch (_) {}
      }
    });
    return payload;
  }
  clearCanvas() {
    this.strokeHistory = [];
    this.lastResolvedSketch = null;
    const msg = JSON.stringify({ type: 'canvasClear', payload: {} });
    this.peers.forEach((peer) => {
      if (peer.dc && peer.dc.readyState === 'open') {
        try { peer.dc.send(msg); } catch (_) {}
      }
    });
  }
  _cleanupPeer(uid) {
    const peer = this.peers.get(uid);
    if (!peer) return;
    try { if (peer.pc) peer.pc.close(); } catch (_) {}
    // Deliberately do NOT delete the signaling doc here. A reconnecting guest
    // overwrites that same doc with a fresh offer; deleting it from a
    // stale-peer cleanup raced that write and destroyed the new offer before
    // the host could answer it. Signaling docs are already deleted on
    // successful connect (~750ms post-connect, both sides) and by the guest's
    // own leave().
    this.peers.delete(uid);
    this.onGuestLeft(uid);
  }
  stop() {
    if (this._stopped) return;
    this._stopped = true;
    if (this._timeoutHandle) { clearTimeout(this._timeoutHandle); this._timeoutHandle = null; }
    if (this.collectionUnsub) {
      try { this.collectionUnsub(); } catch (_) {}
      this.collectionUnsub = null;
    }
    // Terminal event: tell every connected guest the host dashboard is going
    // away so guest overlays can clear/close instead of dangling on a dead
    // channel. Peers are torn down shortly after so the send buffer can flush.
    const terminal = JSON.stringify({ type: 'hostClosed', payload: {} });
    let notified = false;
    this.peers.forEach((peer) => {
      if (peer.dc && peer.dc.readyState === 'open') {
        try { peer.dc.send(terminal); notified = true; } catch (_) {}
      }
    });
    this.activeRound = null;
    this.strokeHistory = [];
    const teardown = () => {
      Array.from(this.peers.keys()).forEach((uid) => this._cleanupPeer(uid));
    };
    if (notified) setTimeout(teardown, 300);
    else teardown();
  }
}

// ── PictionaryGuest (student) ───────────────────────────────────────────
class PictionaryGuest {
  constructor(config) {
    this.sessionCode = config.sessionCode;
    this.userUid = config.userUid;
    this.codename = (typeof config.codename === 'string' && config.codename.slice(0, 64)) || 'Guest';
    this.onConnected = config.onConnected || (() => {});
    this.onDisconnected = config.onDisconnected || (() => {});
    this.onFailed = config.onFailed || (() => {});
    this.onRoundStart = config.onRoundStart || (() => {});
    this.onRoundResolved = config.onRoundResolved || (() => {});
    this.onRoundSync = config.onRoundSync || (() => {});
    this.onRoundTiming = config.onRoundTiming || (() => {});
    this.onHostClosed = config.onHostClosed || (() => {});
    this.onStroke = config.onStroke || (() => {});
    this.onStrokeHistory = config.onStrokeHistory || (() => {});
    this.onStrokeUndo = config.onStrokeUndo || (() => {});
    this.onCanvasClear = config.onCanvasClear || (() => {});
    this.onSketchReveal = config.onSketchReveal || (() => {});
    this.pc = null;
    this.dc = null;
    this.signalingRef = null;
    this.signalingUnsub = null;
    this.sentIce = [];
    this._connected = false;
    this._timeoutHandle = null;
  }
  async join() {
    const fb = _getFb();
    if (!fb) throw new Error('Pictionary: Firebase not available');
    if (!this.sessionCode || !this.userUid) throw new Error('Pictionary: sessionCode + userUid required');
    this.signalingRef = _signalingDocRef(this.sessionCode, this.userUid);
    this.pc = new RTCPeerConnection(_getRtcConfig());
    this.dc = this.pc.createDataChannel('pictionary', { ordered: true });
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
    this.dc.onclose = () => { if (this._connected) this.onDisconnected(); };
    this.dc.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        if (!parsed || !parsed.type) return;
        if (parsed.type === 'roundStart') this.onRoundStart(parsed.payload);
        else if (parsed.type === 'roundResolved') this.onRoundResolved(parsed.payload);
        else if (parsed.type === 'roundSync') this.onRoundSync(parsed.payload || {});
        else if (parsed.type === 'roundTiming') this.onRoundTiming(parsed.payload || {});
        else if (parsed.type === 'hostClosed') this.onHostClosed(parsed.payload || {});
        else if (parsed.type === 'stroke') this.onStroke(parsed.payload);
        else if (parsed.type === 'strokeUndo' && parsed.payload && parsed.payload.strokeId) this.onStrokeUndo(parsed.payload.strokeId);
        else if (parsed.type === 'strokeHistory') this.onStrokeHistory((parsed.payload && parsed.payload.strokes) || []);
        else if (parsed.type === 'canvasClear') this.onCanvasClear();
        else if (parsed.type === 'sketchReveal') this.onSketchReveal(parsed.payload || {});
      } catch (_) {}
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
      });
    } catch (err) {
      console.warn('[Pictionary guest] setup failed:', err && err.message);
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
    }, () => {});
    this._timeoutHandle = setTimeout(() => {
      if (!this._connected) {
        console.warn('[Pictionary guest] connection timeout');
        this.onFailed();
      }
    }, CONNECTION_TIMEOUT_MS);
  }
  sendStroke(stroke) {
    if (!this.dc || this.dc.readyState !== 'open') return false;
    try { this.dc.send(JSON.stringify({ type: 'stroke', payload: stroke })); return true; } catch (_) { return false; }
  }
  sendStrokeUndo(strokeId) {
    if (!this.dc || this.dc.readyState !== 'open') return false;
    try { this.dc.send(JSON.stringify({ type: 'strokeUndo', payload: { strokeId } })); return true; } catch (_) { return false; }
  }
  sendSketchStatus(status) {
    if (!this.dc || this.dc.readyState !== 'open') return false;
    if (status !== 'submitted' && status !== 'editing') return false;
    try {
      this.dc.send(JSON.stringify({ type: 'sketchStatus', payload: { status, timestamp: Date.now() } }));
      return true;
    } catch (_) { return false; }
  }
  sendGuess(text) {
    if (!this.dc || this.dc.readyState !== 'open') return false;
    const payload = { text: String(text || '').slice(0, 200), timestamp: Date.now(), codename: this.codename };
    try { this.dc.send(JSON.stringify({ type: 'guess', payload })); return true; } catch (_) { return false; }
  }
  leave() {
    if (this._timeoutHandle) { clearTimeout(this._timeoutHandle); this._timeoutHandle = null; }
    if (this.signalingUnsub) { try { this.signalingUnsub(); } catch (_) {} this.signalingUnsub = null; }
    if (this.signalingRef) {
      const fb = _getFb();
      if (fb) fb.deleteDoc(this.signalingRef).catch(() => {});
    }
    try { if (this.pc) this.pc.close(); } catch (_) {}
    this.pc = null;
    this.dc = null;
  }
}

// ── Canvas component ───────────────────────────────────────────────────
// Renders strokes via 2D canvas. drawingEnabled gates user input;
// onStrokeComplete fires when the user lifts pen/finger with the
// accumulated point batch ready to broadcast.
const PictionaryCanvas = React.memo((props) => {
  const strokes = Array.isArray(props.strokes) ? props.strokes : [];
  const drawingEnabled = !!props.drawingEnabled;
  const color = props.color || PEN_COLORS[0].hex;
  const mode = props.mode || 'pen';            // 'pen' | 'eraser'
  const onStrokeBatch = props.onStrokeBatch || (() => {});  // (stroke) => void
  const onLiveStrokeStart = props.onLiveStrokeStart;        // optional: live partial broadcast hook
  const liveOpacity = props.liveOpacity == null ? 1 : props.liveOpacity;
  const showWatchingBadge = props.showWatchingBadge !== false;
  const canvasAriaLabel = props.ariaLabel || 'Pictionary drawing canvas';
  // When true, the canvas wrapper lifts the 720px max-width cap so the canvas
  // can fill an OS-level fullscreen viewport. Aspect ratio is still preserved
  // by the canvas's intrinsic dimensions.
  const fullscreenMode = !!props.fullscreenMode;
  const canvasRef = React.useRef(null);
  const drawingRef = React.useRef({
    isDrawing: false,
    points: [],
    strokeId: null,
    lastFlush: 0,
  });
  // Cap DPR at 3× — beyond that, the bitmap memory cost dominates the visual
  // gain and stutters touch drawing on iPad. Stroke coordinates stay in
  // logical (CSS-pixel) space so the wire format is unaffected; we just
  // render at higher fidelity locally.
  const dpr = Math.min(3, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));

  // Draw whenever strokes prop changes. Bitmap is sized to CANVAS_W*dpr ×
  // CANVAS_H*dpr; ctx is scaled by dpr so all drawing code can use logical
  // coordinates (0..CANVAS_WIDTH, 0..CANVAS_HEIGHT).
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Re-size bitmap to match current DPR. Setting canvas.width/height resets
    // the context to identity transform; we re-apply the dpr scale every render.
    const targetW = Math.round(CANVAS_WIDTH * dpr);
    const targetH = Math.round(CANVAS_HEIGHT * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Paper background
    ctx.fillStyle = '#fffefb';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Replay all strokes (logical coords)
    strokes.forEach((s) => _renderStroke(ctx, s, 1));
  }, [strokes, dpr]);

  const _renderStroke = (ctx, stroke, opacity) => {
    if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) return;
    const isErase = stroke.color === ERASER_SENTINEL;
    ctx.save();
    ctx.globalCompositeOperation = isErase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = isErase ? 'rgba(0,0,0,1)' : stroke.color;
    ctx.lineWidth = isErase ? 28 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    const p0 = stroke.points[0];
    ctx.moveTo(p0[0], p0[1]);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
    }
    ctx.stroke();
    ctx.restore();
  };

  const _posFromEvent = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    // Use LOGICAL canvas size (not bitmap size) for the scale so stored
    // stroke coords stay in 720×480 space regardless of DPR. The bitmap's
    // dpr multiplier is applied via ctx.setTransform on render.
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
  };

  const _drawLocalSegment = (from, to) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // The render-effect set ctx.setTransform(dpr, ...) on the last full
    // redraw, so the context already has the dpr scale applied. Drawing in
    // logical coords below is rendered at full DPR.
    const isErase = mode === 'eraser';
    ctx.save();
    ctx.globalCompositeOperation = isErase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = isErase ? 'rgba(0,0,0,1)' : color;
    ctx.lineWidth = isErase ? 28 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = liveOpacity;
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
    ctx.restore();
  };

  const handlePointerDown = (e) => {
    if (!drawingEnabled) return;
    e.preventDefault();
    const pos = _posFromEvent(e);
    drawingRef.current.isDrawing = true;
    drawingRef.current.points = [pos];
    drawingRef.current.strokeId = _pic_genId('stroke');
    drawingRef.current.lastFlush = Date.now();
    if (typeof onLiveStrokeStart === 'function') {
      onLiveStrokeStart(drawingRef.current.strokeId, mode === 'eraser' ? ERASER_SENTINEL : color);
    }
  };
  const handlePointerMove = (e) => {
    if (!drawingEnabled || !drawingRef.current.isDrawing) return;
    e.preventDefault();
    const pos = _posFromEvent(e);
    const prev = drawingRef.current.points[drawingRef.current.points.length - 1];
    drawingRef.current.points.push(pos);
    if (prev) _drawLocalSegment(prev, pos);
    // Throttled live-broadcast hook could go here in v2; v1 sends only on pointer-up.
  };
  const handlePointerUp = () => {
    if (!drawingRef.current.isDrawing) return;
    const points = drawingRef.current.points.slice();
    const stroke = {
      strokeId: drawingRef.current.strokeId,
      color: mode === 'eraser' ? ERASER_SENTINEL : color,
      points,
      ts: Date.now(),
    };
    drawingRef.current.isDrawing = false;
    drawingRef.current.points = [];
    drawingRef.current.strokeId = null;
    if (points.length >= 1) onStrokeBatch(stroke);
  };

  return (
    <div
      className="pic-canvas-wrap"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: fullscreenMode ? '100%' : CANVAS_WIDTH,
        margin: '0 auto',
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: '100%',
          height: fullscreenMode ? 'auto' : 'auto',
          maxHeight: fullscreenMode ? 'calc(100vh - 160px)' : 'none',
          background: '#fffefb',
          border: '2px solid #cbd5e0',
          borderRadius: '12px',
          touchAction: 'none',
          cursor: drawingEnabled ? (mode === 'eraser' ? 'cell' : 'crosshair') : 'default',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          display: 'block',
        }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        aria-label={canvasAriaLabel}
      />
      {!drawingEnabled && showWatchingBadge ? (
        <div style={{ position: 'absolute', bottom: 8, right: 12, background: 'rgba(255,255,255,0.85)', padding: '4px 10px', borderRadius: 6, fontSize: 11, color: '#4a5568', fontWeight: 600 }}>
          👀 watching
        </div>
      ) : null}
    </div>
  );
});

// ── Round countdown (shared by all three views) ────────────────────────
// Renders a ticking countdown badge + slim progress bar. Pure-clock: computes
// remaining time from (now - startedAt) vs durationMs so all peers agree
// without needing the host to broadcast tick messages.
const RoundCountdown = React.memo((props) => {
  const startedAt = props.startedAt;
  const durationMs = props.durationMs;
  // clockOffsetMs = (local clock − host clock), measured at roundStart
  // receipt; anchors the countdown to the HOST's clock so a guest device
  // whose clock is minutes off still shows the same remaining time.
  const clockOffsetMs = props.clockOffsetMs || 0;
  const isPaused = !!props.isPaused;
  const pausedAt = props.pausedAt || null;
  const pausedTotalMs = props.pausedTotalMs || 0;
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    setNow(Date.now());
  }, [isPaused, pausedAt, pausedTotalMs]);
  React.useEffect(() => {
    if (!startedAt || !durationMs) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt, durationMs]);
  if (!startedAt || !durationMs) return null;
  const hostNow = now - clockOffsetMs;
  const effectiveNow = isPaused && pausedAt ? pausedAt : hostNow;
  const elapsed = effectiveNow - startedAt - pausedTotalMs;
  const remaining = Math.max(0, durationMs - elapsed);
  const secs = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(100, (remaining / durationMs) * 100));
  const isUrgent = remaining > 0 && remaining < 10000;
  const isDone = remaining <= 0;
  const barColor = isDone ? 'bg-slate-400' : isUrgent ? 'bg-red-500' : 'bg-emerald-500';
  const textColor = isDone ? 'text-slate-500' : isUrgent ? 'text-red-700' : 'text-slate-700';
  return (
    <div className="flex items-center gap-2 text-xs font-bold" role="timer" aria-live="off" aria-label={isPaused ? `Timer paused at ${secs} seconds` : `Time remaining: ${secs} seconds`}>
      <span className={textColor}>{isPaused ? 'Paused · ' : ''}⏱ {isDone ? '0s' : secs + 's'}</span>
      <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-200 motion-reduce:transition-none ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
});

// ── Toolbox (drawers only) ─────────────────────────────────────────────
const DrawerToolbox = React.memo((props) => {
  const color = props.color || PEN_COLORS[0].hex;
  const setColor = props.setColor || (() => {});
  const mode = props.mode || 'pen';
  const setMode = props.setMode || (() => {});
  const onClear = props.onClear || null;
  const onUndo = props.onUndo || null;
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 mb-2 px-2">
      <div className="flex gap-1">
        {PEN_COLORS.map((c) => (
          <button type="button"
            key={c.name}
            onClick={() => { setColor(c.hex); setMode('pen'); }}
            aria-pressed={mode === 'pen' && color === c.hex}
            aria-label={`Pen color ${c.name}`}
            title={c.name}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: c.hex,
              border: (mode === 'pen' && color === c.hex) ? '3px solid #1a202c' : '2px solid #fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
      <button type="button"
        onClick={() => setMode(mode === 'eraser' ? 'pen' : 'eraser')}
        aria-pressed={mode === 'eraser'}
        aria-label="Eraser"
        className={`px-3 py-1.5 text-xs font-bold rounded-full border ${mode === 'eraser' ? 'bg-slate-700 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
      >🧽 Eraser</button>
      {onUndo ? (
        <button type="button"
          onClick={onUndo}
          className="px-3 py-1.5 text-xs font-bold rounded-full border bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          aria-label="Undo last stroke"
        >↶ Undo</button>
      ) : null}
      {onClear ? (
        <button type="button"
          onClick={onClear}
          className="px-3 py-1.5 text-xs font-bold rounded-full border bg-white text-red-700 border-red-300 hover:bg-red-50"
          aria-label="Clear canvas"
        >✕ Clear</button>
      ) : null}
    </div>
  );
});

// ── Sketch Response teacher gallery ───────────────────────────────────
const SketchResponseGallery = React.memo((props) => {
  const participants = Array.isArray(props.participants) ? props.participants : [];
  const strokesByUid = props.strokesByUid || {};
  const statuses = props.statuses || {};
  const moderation = props.moderation || {};
  const resources = Array.isArray(props.resources) ? props.resources : [];
  const followUpResourceId = props.followUpResourceId || '';
  const onSetFollowUpResourceId = props.onSetFollowUpResourceId || (() => {});
  const onModerationChange = props.onModerationChange || (() => {});
  const onApproveSubmitted = props.onApproveSubmitted || (() => {});
  const onReveal = props.onReveal || (() => {});
  const onSendToStudent = props.onSendToStudent || null;
  const onSendToGroup = props.onSendToGroup || null;
  const groups = props.groups || {};
  const submissions = buildSketchSubmissionSummary(
    participants.map((entry) => entry.uid),
    strokesByUid,
    statuses,
    moderation
  );
  const submittedCount = submissions.filter((entry) => entry.status === 'submitted').length;
  const approvedCount = submissions.filter((entry) => entry.moderation === 'approved').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-indigo-900">{submittedCount}/{participants.length} submitted</span>
        <span className="text-[10px] text-slate-600">· {approvedCount} approved</span>
        <button type="button"
          onClick={onApproveSubmitted}
          disabled={submittedCount === 0}
          className="ml-auto px-2 py-1 text-[10px] font-bold rounded border border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 disabled:opacity-40"
        >Approve submitted</button>
      </div>
      <p className="m-0 text-[11px] text-slate-600 leading-snug">
        Boards remain private to the teacher. Reveal is anonymous and available only after a submitted board is approved.
      </p>
      {resources.length > 0 ? (
        <label className="block text-[11px] font-bold text-slate-700">
          Follow-up resource
          <select
            value={followUpResourceId}
            onChange={(event) => onSetFollowUpResourceId(event.target.value)}
            className="block w-full mt-1 text-xs border border-slate-300 rounded p-1.5 bg-white"
            aria-label="Choose a follow-up resource for sketch responses"
          >
            <option value="">Choose a lesson resource…</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>{resource.title || resource.label || resource.type || 'Resource'}</option>
            ))}
          </select>
        </label>
      ) : null}
      {participants.length === 0 ? (
        <div className="p-3 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg">Choose participants to begin collecting private sketches.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="list" aria-label="Private sketch response gallery">
          {participants.map((participant) => {
            const strokes = Array.isArray(strokesByUid[participant.uid]) ? strokesByUid[participant.uid] : [];
            const status = statuses[participant.uid] === 'submitted' ? 'submitted' : 'drawing';
            const review = moderation[participant.uid] === 'approved' || moderation[participant.uid] === 'hidden'
              ? moderation[participant.uid]
              : 'hold';
            const groupId = participant.groupId || null;
            const groupName = groupId && groups[groupId] ? (groups[groupId].name || groupId) : groupId;
            const revealable = strokes.length > 0 && status === 'submitted' && review === 'approved';
            return (
              <article key={participant.uid} role="listitem" className="p-2 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <strong className="text-xs text-slate-800">{participant.name}</strong>
                  <span className="ml-auto text-[10px] font-bold text-slate-600">{status === 'submitted' ? '✓ submitted' : strokes.length > 0 ? 'drawing' : 'waiting'}</span>
                </div>
                <PictionaryCanvas
                  strokes={strokes}
                  drawingEnabled={false}
                  showWatchingBadge={false}
                  ariaLabel={'Private sketch response from ' + participant.name}
                />
                <div className="grid grid-cols-[1fr_auto] gap-2 mt-2">
                  <select
                    value={review}
                    onChange={(event) => onModerationChange(participant.uid, event.target.value)}
                    aria-label={'Moderation for ' + participant.name}
                    className="text-[11px] border border-slate-300 rounded p-1 bg-white"
                  >
                    <option value="hold">Hold</option>
                    <option value="approved">Approve</option>
                    <option value="hidden">Hide</option>
                  </select>
                  <button type="button"
                    onClick={() => onReveal(participant.uid)}
                    disabled={!revealable}
                    className="px-2 py-1 text-[10px] font-bold rounded bg-indigo-600 text-white disabled:opacity-40"
                  >Reveal anonymously</button>
                </div>
                {followUpResourceId ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {onSendToStudent ? (
                      <button type="button"
                        onClick={() => onSendToStudent(participant.uid, followUpResourceId)}
                        className="px-2 py-1 text-[10px] font-bold rounded border border-blue-300 text-blue-800 bg-blue-50"
                      >Send resource to student</button>
                    ) : null}
                    {groupId && onSendToGroup ? (
                      <button type="button"
                        onClick={() => onSendToGroup(groupId, followUpResourceId)}
                        className="px-2 py-1 text-[10px] font-bold rounded border border-violet-300 text-violet-800 bg-violet-50"
                      >Send to {groupName || 'group'}</button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ── Host view (teacher dashboard) ──────────────────────────────────────
const PictionaryHostView = React.memo((props) => {
  const isOpen = !!props.isOpen;
  const onClose = props.onClose || (() => {});
  const sessionCode = props.sessionCode;
  const roster = (props.sessionData && props.sessionData.roster) || {};
  const writeToSession = props.writeToSession || null;
  const sessionRef = props.sessionRef || null;
  const callGemini = props.callGemini || null;
  const sourceText = props.sourceText || '';
  const initialMode = normalizePictionaryActivityMode(props.initialMode);
  const resources = Array.isArray(props.resources) ? props.resources : [];
  const groups = (props.sessionData && props.sessionData.groups) || {};
  const onSendToStudent = props.onSendToStudent || null;
  const onSendToGroup = props.onSendToGroup || null;
  const onActivitySnapshot = typeof props.onActivitySnapshot === 'function' ? props.onActivitySnapshot : null;
  // Pre-populated concept candidates passed in from a bridge tool (e.g., the
  // Anchor Chart "Play Pictionary with these terms" button). Each time isOpen
  // flips to true with a non-empty list, we seed `conceptIdeas` so the teacher
  // sees the chart's section labels as one-click options.
  const initialConceptIdeas = Array.isArray(props.initialConceptIdeas) ? props.initialConceptIdeas : null;
  // Fullscreen support: the entire modal card can go fullscreen. Useful on
  // small screens (iPad portrait / phone) where the room for the canvas is
  // otherwise constrained by the modal chrome.
  const containerRef = React.useRef(null);
  const [isFullscreen, toggleFullscreen] = useFullscreen(containerRef);

  // WebRTC host instance
  const hostRef = React.useRef(null);
  const [connectedGuests, setConnectedGuests] = React.useState({});  // uid -> codename
  const [strokes, setStrokes] = React.useState([]);
  const [activityMode, setActivityMode] = React.useState(initialMode);
  const activityModeRef = React.useRef(initialMode);
  const [sketchStrokesByUid, setSketchStrokesByUid] = React.useState({});
  const [sketchStatuses, setSketchStatuses] = React.useState({});
  const [sketchModeration, setSketchModeration] = React.useState({});
  const [followUpResourceId, setFollowUpResourceId] = React.useState('');
  const [lastRevealedSketchUid, setLastRevealedSketchUid] = React.useState(null);
  React.useEffect(() => { activityModeRef.current = activityMode; }, [activityMode]);
  const [guessFeed, setGuessFeed] = React.useState([]);              // [{uid, codename, text, ts, marked}]
  // Per-student guess mute (host-side): muted guessers' incoming guesses are
  // dropped before they reach the feed. Ref mirror so the WebRTC callback
  // reads current state without re-creating the host.
  const [mutedGuessers, setMutedGuessers] = React.useState({});      // uid -> true
  const mutedGuessersRef = React.useRef({});
  React.useEffect(() => { mutedGuessersRef.current = mutedGuessers; }, [mutedGuessers]);
  const toggleMuteGuesser = (uid) => setMutedGuessers((prev) => {
    const next = { ...prev };
    if (next[uid]) delete next[uid]; else next[uid] = true;
    return next;
  });
  // Round config
  const [concept, setConcept] = React.useState('');
  const [conceptIdeas, setConceptIdeas] = React.useState([]);
  const [drawerUids, setDrawerUids] = React.useState([]);            // string[]
  const [durationMs, setDurationMs] = React.useState(60000);         // 1 min default; 0 = unlimited
  const [activeRoundMeta, setActiveRoundMeta] = React.useState(null); // { startedAt, durationMs }
  const [roundActive, setRoundActive] = React.useState(false);
  const [roundResolved, setRoundResolved] = React.useState(null);    // { concept, winnerUid, reason }
  const [isLoadingIdeas, setIsLoadingIdeas] = React.useState(false);
  // Session-scoped round log. Each entry: { id, concept, winnerUid, winnerCodename,
  // drawerUids, drawerNames, resolution: 'correct'|'timeout'|'manual', durationMs, ts }
  // Lives in host memory only; cleared when the modal closes. No Firestore writes.
  const [roundLog, setRoundLog] = React.useState([]);
  const activeActivityRef = React.useRef(null);
  const lastActivitySnapshotRef = React.useRef(null);
  // ── Team mode (2026-07-16) ────────────────────────────────────────────────
  // Optional: split the roster into two teams. Correct guess = +2 to the
  // guesser's team, +1 to each drawing team (clear drawing is rewarded too).
  // Host-side only (the teacher's screen is usually projected); scores are not
  // broadcast — a transport extension is a listed follow-up. Rotation keeps
  // drawer turns fair instead of the same eager artists every round.
  const [teamMode, setTeamMode] = React.useState(false);
  const [picTeams, setPicTeams] = React.useState({});           // uid -> 'A' | 'B'
  const [picTeamScores, setPicTeamScores] = React.useState({ A: 0, B: 0 });
  const picRotationRef = React.useRef({ A: 0, B: 0 });
  const assignTeams = () => {
    const uids = Object.keys(roster);
    const next = {};
    uids.forEach((uid, i) => { next[uid] = i % 2 === 0 ? 'A' : 'B'; });
    setPicTeams(next);
    setPicTeamScores({ A: 0, B: 0 });
    picRotationRef.current = { A: 0, B: 0 };
  };
  const suggestNextDrawers = () => {
    // One drawer from each team, rotating through each team's members in join order.
    const byTeam = { A: [], B: [] };
    Object.keys(roster).forEach((uid) => { const tm = picTeams[uid]; if (tm) byTeam[tm].push(uid); });
    const picks = [];
    ['A', 'B'].forEach((tm) => {
      if (byTeam[tm].length === 0) return;
      const idx = picRotationRef.current[tm] % byTeam[tm].length;
      picks.push(byTeam[tm][idx]);
      picRotationRef.current[tm] = idx + 1;
    });
    if (picks.length > 0) setDrawerUids(picks);
  };
  const [showRoundLogDetail, setShowRoundLogDetail] = React.useState(false);
  // Per-drawer last-stroke timestamp for the "X is drawing right now" indicator.
  // Ref so updates don't re-render; a separate tick state forces re-render
  // every 250ms while a round is active.
  const drawerActivityRef = React.useRef(new Map());
  const [activityTick, setActivityTick] = React.useState(0);
  React.useEffect(() => {
    if (!roundActive) return;
    const id = setInterval(() => setActivityTick((t) => (t + 1) % 1000000), 250);
    return () => clearInterval(id);
  }, [roundActive]);
  const isDrawerActive = (uid) => {
    const last = drawerActivityRef.current.get(uid);
    return last && (Date.now() - last) < 1500;
  };

  // Publish only run-state metadata to the Live Lesson coordination layer.
  // Strokes, guesses, concepts/prompts, feedback, and codenames remain inside
  // this existing activity owner and never enter the snapshot callback.
  React.useEffect(() => {
    if (!onActivitySnapshot) return;
    const activity = activeActivityRef.current;
    if (!activity) return;

    if (!isOpen) {
      const prior = lastActivitySnapshotRef.current;
      if (prior && prior.phase !== 'closed' && prior.phase !== 'revealed') {
        const closed = { ...prior, phase: 'closed', updatedAt: Date.now(), endedAt: Date.now() };
        lastActivitySnapshotRef.current = closed;
        onActivitySnapshot(closed);
      }
      return;
    }

    let phase = 'closed';
    if (roundActive) phase = activeRoundMeta && activeRoundMeta.isPaused ? 'paused' : 'collecting';
    else if (roundResolved) phase = activity.mode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'review' : 'revealed';

    const participantStatus = {};
    activity.audienceUids.forEach((uid) => {
      if (activity.mode === SKETCH_RESPONSE_ACTIVITY_MODE) {
        if (sketchStatuses[uid] === 'submitted') participantStatus[uid] = 'submitted';
        else if ((sketchStrokesByUid[uid] || []).length > 0 || sketchStatuses[uid] === 'drawing') participantStatus[uid] = 'working';
        else participantStatus[uid] = 'waiting';
        return;
      }
      const acted = strokes.some((stroke) => stroke && stroke.uid === uid)
        || guessFeed.some((guess) => guess && guess.uid === uid);
      if (roundResolved && acted) participantStatus[uid] = 'submitted';
      else if (acted) participantStatus[uid] = 'working';
      else participantStatus[uid] = 'waiting';
    });

    const moderationCounts = Object.values(sketchModeration).reduce((out, status) => {
      if (status === 'approved' || status === 'hidden') out[status] += 1;
      return out;
    }, { approved: 0, hidden: 0 });
    const snapshot = {
      activityId: activity.activityId,
      family: 'pictionary',
      kind: activity.mode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'sketch_response' : 'pictionary',
      phase,
      audienceUids: activity.audienceUids,
      participantStatus,
      counts: {
        connected: activity.audienceUids.filter((uid) => !!connectedGuests[uid]).length,
        approved: moderationCounts.approved,
        hidden: moderationCounts.hidden,
        revealed: lastRevealedSketchUid ? 1 : (phase === 'revealed' ? 1 : 0),
        guesses: guessFeed.length,
      },
      startedAt: activity.startedAt,
      updatedAt: Date.now(),
      endedAt: phase === 'closed' || phase === 'revealed' ? Date.now() : 0,
      durationMs: activity.durationMs || 0,
    };
    lastActivitySnapshotRef.current = snapshot;
    onActivitySnapshot(snapshot);
  }, [
    isOpen,
    roundActive,
    roundResolved,
    activeRoundMeta,
    connectedGuests,
    strokes,
    guessFeed,
    sketchStrokesByUid,
    sketchStatuses,
    sketchModeration,
    lastRevealedSketchUid,
    onActivitySnapshot,
  ]);

  // Live Session Center presets switch the existing host between the
  // game and private Sketch Response without creating another panel.
  React.useEffect(() => {
    if (!isOpen || roundActive) return;
    setActivityMode(initialMode);
    activityModeRef.current = initialMode;
    if (initialMode === SKETCH_RESPONSE_ACTIVITY_MODE) {
      setDrawerUids(Object.keys(roster));
    }
  }, [isOpen, initialMode]);

  // Seed concept ideas from a bridge tool when the overlay opens.
  React.useEffect(() => {
    if (!isOpen) return;
    if (initialConceptIdeas && initialConceptIdeas.length > 0) {
      setConceptIdeas(initialConceptIdeas.slice(0, 12).map(String));
    }
  }, [isOpen, initialConceptIdeas]);

  // Defensive cleanup: when the host modal unmounts WITHOUT an explicit
  // resolve, students would otherwise stay locked in their guest overlay
  // because sessionData.pictionaryRound.active and their roster.{uid}.role
  // were left dangling. Track the latest state in a ref so the cleanup can
  // see whether a round was actually active at unmount time and only fire
  // resolveRound + the session-doc clear in that case (idempotent regardless).
  const cleanupStateRef = React.useRef({ roundActive: false });
  React.useEffect(() => { cleanupStateRef.current.roundActive = roundActive; }, [roundActive]);
  React.useEffect(() => {
    return () => {
      try {
        if (hostRef.current) {
          if (hostRef.current.activeRound) {
            hostRef.current.resolveRound({ winnerUid: null, reason: 'manual' });
          }
        }
      } catch (_) {}
      if (cleanupStateRef.current.roundActive) {
        // Best-effort clear of session-doc fields. The ref-captured
        // _clearRolesAndRound closes over roster/writeToSession/sessionRef
        // from the latest render, so it has fresh values.
        try { _clearRolesAndRound(); } catch (_) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!isOpen || !sessionCode) return;
    if (hostRef.current) return;
    const host = new PictionaryHost({
      sessionCode,
      onGuestConnected: (uid, codename) => setConnectedGuests((prev) => ({ ...prev, [uid]: codename })),
      onGuestLeft: (uid) => setConnectedGuests((prev) => { const next = { ...prev }; delete next[uid]; return next; }),
      onStroke: (uid, codename, stroke) => {
        if (activityModeRef.current === SKETCH_RESPONSE_ACTIVITY_MODE) {
          setSketchStrokesByUid((prev) => ({
            ...prev,
            [uid]: (prev[uid] || []).concat([stroke]),
          }));
          setSketchStatuses((prev) => ({ ...prev, [uid]: 'drawing' }));
        } else {
          setStrokes((prev) => prev.concat([stroke]));
        }
        drawerActivityRef.current.set(uid, Date.now());
      },
      onStrokeUndo: (uid, strokeId) => {
        if (activityModeRef.current === SKETCH_RESPONSE_ACTIVITY_MODE) {
          setSketchStrokesByUid((prev) => ({
            ...prev,
            [uid]: (prev[uid] || []).filter((stroke) => stroke.strokeId !== strokeId),
          }));
          setSketchStatuses((prev) => ({ ...prev, [uid]: 'drawing' }));
        } else {
          setStrokes((prev) => prev.filter((stroke) => stroke.strokeId !== strokeId));
        }
      },
      onSketchStatus: (uid, codename, payload) => {
        setSketchStatuses((prev) => ({ ...prev, [uid]: payload.status === 'submitted' ? 'submitted' : 'drawing' }));
      },
      onGuess: (uid, codename, payload) => {
        if (mutedGuessersRef.current[uid]) return;
        setGuessFeed((prev) => prev.concat([{
          id: _pic_genId('guess'), uid, codename, text: payload.text, ts: payload.timestamp || Date.now(), marked: null,
        }]));
      },
      onRoundAutoResolved: (info) => {
        // Timer expired; round resolved with no winner. The host already
        // broadcast roundResolved to peers; just sync local view state.
        const resolvedConcept = (info && info.concept) || '';
        setRoundResolved({ concept: resolvedConcept, winnerUid: null, reason: 'timeout', mode: normalizePictionaryActivityMode(info && info.mode) });
        setRoundActive(false);
        setActiveRoundMeta(null);
        if (!info || info.mode !== SKETCH_RESPONSE_ACTIVITY_MODE) {
          _appendRoundToLog({ concept: resolvedConcept, winnerUid: null, winnerCodename: null, resolution: 'timeout' });
        }
        _clearRolesAndRound();
      },
    });
    host.setAllowedUids(Object.keys(roster));
    host.start().catch((err) => console.warn('[Pictionary host] start failed:', err && err.message));
    hostRef.current = host;
    return () => {
      try { hostRef.current && hostRef.current.stop(); } catch (_) {}
      hostRef.current = null;
    };
  }, [isOpen, sessionCode]);

  // Keep the roster gate current as students join/leave without recreating
  // the host (which would tear down every peer connection).
  React.useEffect(() => {
    if (hostRef.current && typeof hostRef.current.setAllowedUids === 'function') {
      hostRef.current.setAllowedUids(Object.keys(roster));
    }
  }, [roster]);

  const handleAISuggestConcepts = async () => {
    if (!callGemini || isLoadingIdeas) return;
    setIsLoadingIdeas(true);
    try {
      const trimmed = (sourceText || '').slice(0, 3000);
      const prompt = `Suggest 8 short concepts students could draw to demonstrate their understanding of this lesson. Each concept should be a single noun or 2-3 word phrase that's drawable (visualizable as a sketch). No abstract feelings. Source: "${trimmed}". Return ONLY a JSON object: { "concepts": ["concept 1", "concept 2", ...] }`;
      const result = await callGemini(prompt, true);
      const _stripFences = (s) => String(s || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      const _cleaner = (typeof window !== 'undefined' && window.__alloUtils && window.__alloUtils.cleanJson) || _stripFences;
      const parsed = JSON.parse(_cleaner(result));
      if (Array.isArray(parsed.concepts)) setConceptIdeas(parsed.concepts.slice(0, 8).map(String));
    } catch (err) { console.warn('[Pictionary] concept suggest failed:', err && err.message); }
    finally { setIsLoadingIdeas(false); }
  };

  const toggleDrawer = (uid) => {
    setDrawerUids((prev) => {
      if (prev.includes(uid)) return prev.filter((x) => x !== uid);
      if (activityMode === PICTIONARY_ACTIVITY_MODE && prev.length >= 4) return prev;
      return prev.concat([uid]);
    });
  };

  const handleStartRound = async () => {
    if (!hostRef.current || !concept.trim() || drawerUids.length === 0) return;
    const startedAt = Date.now();
    const activityId = _pic_genId('round');
    const effectiveDuration = durationMs > 0 ? durationMs : null;
    activeActivityRef.current = {
      activityId,
      startedAt,
      durationMs: effectiveDuration || 0,
      mode: activityMode,
      audienceUids: (activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? drawerUids : Object.keys(roster)).slice(),
    };
    hostRef.current.startRound({ concept: concept.trim(), drawerUids, durationMs: effectiveDuration, mode: activityMode });
    setStrokes([]);
    setGuessFeed([]);
    setSketchStrokesByUid({});
    setSketchStatuses(Object.fromEntries(drawerUids.map((uid) => [uid, 'drawing'])));
    setSketchModeration(Object.fromEntries(drawerUids.map((uid) => [uid, 'hold'])));
    setLastRevealedSketchUid(null);
    setRoundActive(true);
    setRoundResolved(null);
    setActiveRoundMeta(effectiveDuration ? { startedAt, durationMs: effectiveDuration, isPaused: false, pausedAt: null, pausedTotalMs: 0 } : null);
    // Write Tier-1 role markers to session doc so each peer can identify its role,
    // plus a pictionaryRound aggregate that late-joiners use to auto-open the
    // guest overlay (gets defaulted to 'guesser' on their side).
    if (writeToSession && sessionRef) {
      const updates = {
        pictionaryRound: { active: true, roundId: activityId, startedAt, mode: activityMode },
      };
      Object.keys(roster).forEach((uid) => {
        updates[`roster.${uid}.role`] = drawerUids.includes(uid) ? 'drawer' : (activityMode === PICTIONARY_ACTIVITY_MODE ? 'guesser' : null);
      });
      try { await writeToSession(sessionRef, updates); } catch (err) {
        console.warn('[Pictionary] role write failed:', err && err.message);
      }
    }
  };
  const _clearRolesAndRound = async () => {
    if (!writeToSession || !sessionRef) return;
    const updates = { pictionaryRound: { active: false } };
    Object.keys(roster).forEach((uid) => { updates[`roster.${uid}.role`] = null; });
    try { await writeToSession(sessionRef, updates); } catch (_) {}
  };
  // Append a resolved-round entry to the session log. Caller passes overrides
  // for drawerUids/durationMs when the closure may be stale (e.g. the auto-
  // resolved timeout callback that fires from inside the WebRTC host).
  const _appendRoundToLog = (entry) => {
    const effectiveDrawerUids = (entry && Array.isArray(entry.drawerUids)) ? entry.drawerUids : drawerUids;
    const effectiveDuration = (entry && entry.durationMs != null)
      ? entry.durationMs
      : (activeRoundMeta && activeRoundMeta.durationMs) || null;
    setRoundLog((prev) => prev.concat([{
      id: _pic_genId('rlog'),
      concept: (entry && entry.concept) || '',
      winnerUid: (entry && entry.winnerUid) || null,
      winnerCodename: (entry && entry.winnerCodename) || null,
      resolution: (entry && entry.resolution) || 'manual',
      drawerUids: effectiveDrawerUids.slice(),
      drawerNames: effectiveDrawerUids.map((uid) => (roster[uid] && roster[uid].name) || 'Student'),
      durationMs: effectiveDuration,
      ts: Date.now(),
    }]));
  };
  const handleMarkCorrect = async (guessId) => {
    setGuessFeed((prev) => prev.map((g) => g.id === guessId ? { ...g, marked: 'correct' } : g));
    const correctGuess = guessFeed.find((g) => g.id === guessId);
    const winnerUid = correctGuess && correctGuess.uid;
    const winnerCodename = correctGuess && correctGuess.codename;
    // Team scoring (2026-07-16): +2 guesser's team, +1 each unique drawing team.
    // Captured BEFORE resolveRound clears activeRound.
    if (teamMode && winnerUid) {
      const drawerSet = (hostRef.current && hostRef.current.activeRound && hostRef.current.activeRound.drawerUids) || new Set(drawerUids);
      setPicTeamScores((prev) => {
        const next = { ...prev };
        const winnerTeam = picTeams[winnerUid];
        if (winnerTeam) next[winnerTeam] = (next[winnerTeam] || 0) + 2;
        const drawerTeams = new Set();
        Array.from(drawerSet).forEach((uid) => { const tm = picTeams[uid]; if (tm) drawerTeams.add(tm); });
        drawerTeams.forEach((tm) => { next[tm] = (next[tm] || 0) + 1; });
        return next;
      });
    }
    if (hostRef.current) hostRef.current.resolveRound({ winnerUid, reason: 'manual' });
    setRoundResolved({ concept, winnerUid, reason: 'manual' });
    setRoundActive(false);
    setActiveRoundMeta(null);
    _appendRoundToLog({ concept, winnerUid, winnerCodename, resolution: 'correct' });
    await _clearRolesAndRound();
  };
  const handleSketchModerationChange = (uid, status) => {
    if (status !== 'approved' && status !== 'hidden' && status !== 'hold') return;
    setSketchModeration((prev) => ({ ...prev, [uid]: status }));
  };
  const handleApproveSubmittedSketches = () => {
    setSketchModeration((prev) => {
      const next = { ...prev };
      drawerUids.forEach((uid) => {
        if (sketchStatuses[uid] === 'submitted') next[uid] = 'approved';
      });
      return next;
    });
  };
  const handleRevealSketch = (uid) => {
    if (sketchModeration[uid] !== 'approved' || sketchStatuses[uid] !== 'submitted') return;
    const payload = hostRef.current && hostRef.current.broadcastSketchReveal(uid, concept);
    if (payload) setLastRevealedSketchUid(uid);
  };
  const handleTogglePause = () => {
    const host = hostRef.current;
    if (!host || !host.activeRound || !activeRoundMeta) return;
    const changed = host.activeRound.isPaused ? host.resumeRound() : host.pauseRound();
    if (!changed || !host.activeRound) return;
    setActiveRoundMeta({
      startedAt: host.activeRound.startedAt,
      durationMs: host.activeRound.durationMs,
      isPaused: !!host.activeRound.isPaused,
      pausedAt: host.activeRound.pausedAt || null,
      pausedTotalMs: host.activeRound.pausedTotalMs || 0,
    });
  };
  const handleEndRound = async () => {
    if (hostRef.current) hostRef.current.resolveRound({ winnerUid: null, reason: 'manual' });
    setRoundResolved({ concept, winnerUid: null, reason: 'manual', mode: activityMode });
    setRoundActive(false);
    setActiveRoundMeta(null);
    if (activityMode === PICTIONARY_ACTIVITY_MODE) {
      _appendRoundToLog({ concept, winnerUid: null, winnerCodename: null, resolution: 'manual' });
    }
    await _clearRolesAndRound();
  };
  const handleResetForNextRound = () => {
    setConcept('');
    setDrawerUids([]);
    setStrokes([]);
    setGuessFeed([]);
    setSketchStrokesByUid({});
    setSketchStatuses({});
    setSketchModeration({});
    setLastRevealedSketchUid(null);
    setRoundResolved(null);
    setActiveRoundMeta(null);
    if (hostRef.current) hostRef.current.clearCanvas();
  };

  if (!isOpen) return null;
  const rosterEntries = Object.keys(roster).map((uid) => ({
    uid,
    name: (roster[uid] && roster[uid].name) || 'Student',
    groupId: (roster[uid] && roster[uid].groupId) || null,
    connected: !!connectedGuests[uid],
  }));
  const sketchParticipants = rosterEntries.filter((entry) => drawerUids.includes(entry.uid));
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-2 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Concept Pictionary host dashboard">
      <button type="button" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-label="Close Concept Pictionary host dashboard" />
      <div
        ref={containerRef}
        className="relative bg-white shadow-2xl w-full max-w-5xl overflow-y-auto border border-slate-200"
        style={isFullscreen
          ? { width: '100vw', height: '100vh', maxWidth: 'none', margin: 0, borderRadius: 0, marginTop: 0 }
          : { borderRadius: '1rem', marginTop: '2rem', marginBottom: '2rem' }
        }
      >
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">{activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Live response' : 'Live game'}</div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">🎨 {activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Sketch Response' : 'Concept Pictionary'}</h2>
            <p className="text-xs text-slate-600 mt-1 leading-snug hidden sm:block">{activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Private student canvases, teacher-moderated anonymous reveal, never stored.' : 'Multi-drawer collaborative comprehension probe. Strokes + guesses peer-to-peer, never stored.'}</p>
          </div>
          <div className="flex items-start gap-1 flex-shrink-0">
            <button type="button"
              onClick={toggleFullscreen}
              className="text-slate-500 hover:text-slate-800 text-lg leading-none p-1.5 rounded hover:bg-slate-100"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen the dashboard'}
            >{isFullscreen ? '↙' : '⛶'}</button>
            <button type="button" onClick={onClose} className="text-slate-600 hover:text-slate-700 text-2xl leading-none p-1 rounded hover:bg-slate-100" aria-label="Close">✕</button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-5">
          <div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">{activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Private response gallery' : 'Canvas'}</div>
                <div className="flex items-center gap-2">
                  {roundActive && activeRoundMeta ? (
                    <RoundCountdown startedAt={activeRoundMeta.startedAt} durationMs={activeRoundMeta.durationMs} isPaused={activeRoundMeta.isPaused} pausedAt={activeRoundMeta.pausedAt} pausedTotalMs={activeRoundMeta.pausedTotalMs} />
                  ) : null}
                  {roundActive ? (
                    <span role="status" className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">{activeRoundMeta && activeRoundMeta.isPaused ? 'Round paused' : 'Round live'}</span>
                  ) : roundResolved ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Resolved</span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-300">Idle</span>
                  )}
                  {roundActive && activeRoundMeta ? (
                    <button type="button" onClick={handleTogglePause} aria-pressed={!!activeRoundMeta.isPaused} className="px-2 py-1 text-xs font-bold rounded bg-amber-100 hover:bg-amber-200 text-amber-900">{activeRoundMeta.isPaused ? 'Resume timer' : 'Pause timer'}</button>
                  ) : null}
                  {roundActive ? (
                    <button type="button" onClick={handleEndRound} className="px-2 py-1 text-xs font-bold rounded bg-slate-200 hover:bg-slate-300 text-slate-800">End round</button>
                  ) : null}
                </div>
              </div>
              {activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? (
                <SketchResponseGallery
                  participants={sketchParticipants}
                  strokesByUid={sketchStrokesByUid}
                  statuses={sketchStatuses}
                  moderation={sketchModeration}
                  resources={resources}
                  followUpResourceId={followUpResourceId}
                  onSetFollowUpResourceId={setFollowUpResourceId}
                  onModerationChange={handleSketchModerationChange}
                  onApproveSubmitted={handleApproveSubmittedSketches}
                  onReveal={handleRevealSketch}
                  onSendToStudent={onSendToStudent}
                  onSendToGroup={onSendToGroup}
                  groups={groups}
                />
              ) : (
                <PictionaryCanvas strokes={strokes} drawingEnabled={false} fullscreenMode={isFullscreen} />
              )}
              {lastRevealedSketchUid ? (
                <div role="status" className="mt-2 text-[11px] font-bold text-indigo-800">Anonymous reveal sent to connected students.</div>
              ) : null}
              {roundResolved ? (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">
                  <strong>{activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Prompt:' : 'Concept:'}</strong> {roundResolved.concept || '(none)'}{' '}
                  {activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? (
                    <span className="italic">— collection ended; review or reveal the private gallery above</span>
                  ) : roundResolved.winnerUid && roster[roundResolved.winnerUid] ? (
                    <span>— first correct: <strong>{roster[roundResolved.winnerUid].name}</strong></span>
                  ) : roundResolved.reason === 'timeout' ? (
                    <span className="italic">— ⏱ time's up</span>
                  ) : (
                    <span className="italic">— ended without a winner</span>
                  )}
                  <div className="mt-2">
                    <button type="button" onClick={handleResetForNextRound} className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-600 text-white hover:bg-emerald-700">Set up next round →</button>
                  </div>
                </div>
              ) : null}
            </div>
            {activityMode === PICTIONARY_ACTIVITY_MODE ? (
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Guesses ({guessFeed.length})</div>
              {guessFeed.length === 0 ? (
                <div className="text-xs text-slate-600 italic">No guesses yet.</div>
              ) : (
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {guessFeed.slice().reverse().map((g) => {
                    // Suggest-only highlight — the teacher stays the judge.
                    const looksRight = roundActive && g.marked == null && _pic_guessLooksRight(g.text, concept);
                    return (
                    <li key={g.id} className={`flex items-center gap-2 p-2 rounded ${g.marked === 'correct' ? 'bg-emerald-50 border border-emerald-200' : looksRight ? 'bg-amber-50 border border-amber-300' : 'hover:bg-slate-50'}`}>
                      <span className="font-bold text-slate-700 text-xs flex-shrink-0">{g.codename}:</span>
                      <span className="flex-1 text-sm text-slate-800">{g.text}</span>
                      {looksRight && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5 flex-shrink-0" title="Looks like the concept — your call">≈ match?</span>
                      )}
                      {roundActive && g.marked == null ? (
                        <button type="button" onClick={() => handleMarkCorrect(g.id)} className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700">✓ correct</button>
                      ) : g.marked === 'correct' ? (
                        <span className="text-[10px] font-bold text-emerald-700">✓</span>
                      ) : null}
                      <button type="button"
                        onClick={() => toggleMuteGuesser(g.uid)}
                        title={mutedGuessers[g.uid] ? 'Unmute this guesser' : 'Mute this guesser (their guesses stop appearing here)'}
                        aria-label={(mutedGuessers[g.uid] ? 'Unmute ' : 'Mute ') + g.codename}
                        className={`px-1.5 py-0.5 text-[10px] rounded border ${mutedGuessers[g.uid] ? 'bg-slate-700 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                      >{mutedGuessers[g.uid] ? '🔇' : '🔊'}</button>
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>
            ) : null}
          </div>
          <div className="space-y-3">
            {!roundActive ? (
              <div className="grid grid-cols-2 gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1">
                <button type="button"
                  onClick={() => { setActivityMode(PICTIONARY_ACTIVITY_MODE); setDrawerUids([]); }}
                  aria-pressed={activityMode === PICTIONARY_ACTIVITY_MODE}
                  className={activityMode === PICTIONARY_ACTIVITY_MODE ? 'px-2 py-1.5 text-xs font-bold rounded-lg bg-white text-rose-800 shadow' : 'px-2 py-1.5 text-xs font-bold rounded-lg text-slate-600'}
                >Pictionary</button>
                <button type="button"
                  onClick={() => { setActivityMode(SKETCH_RESPONSE_ACTIVITY_MODE); setDrawerUids(Object.keys(roster)); }}
                  aria-pressed={activityMode === SKETCH_RESPONSE_ACTIVITY_MODE}
                  className={activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'px-2 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-800 shadow' : 'px-2 py-1.5 text-xs font-bold rounded-lg text-slate-600'}
                >Sketch Response</button>
              </div>
            ) : null}
            {/* Team mode (2026-07-16): optional 2-team play with fair drawer rotation. */}
            {activityMode === PICTIONARY_ACTIVITY_MODE ? (
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 cursor-pointer select-none">
                <input type="checkbox" checked={teamMode} onChange={(e) => { setTeamMode(e.target.checked); if (e.target.checked) assignTeams(); }} className="w-4 h-4" />
                {'Team mode'}
              </label>
              {teamMode && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded-lg bg-blue-100 border border-blue-300 text-blue-900 text-sm font-black">A · {picTeamScores.A || 0}</span>
                    <span className="px-2 py-1 rounded-lg bg-rose-100 border border-rose-300 text-rose-900 text-sm font-black">B · {picTeamScores.B || 0}</span>
                    <button type="button" onClick={assignTeams} title="Re-split the current roster into two teams (resets scores)" className="ml-auto px-2 py-1 text-[10px] font-bold rounded border border-slate-300 hover:bg-slate-50">↻ re-team</button>
                  </div>
                  <div className="text-[11px] text-slate-600 leading-snug">
                    {Object.keys(picTeams).length === 0 ? 'No students in the roster yet.' : (
                      <>
                        <span className="font-bold text-blue-800">A:</span> {Object.keys(picTeams).filter(u => picTeams[u] === 'A').map(u => (roster[u] && roster[u].name) || 'Student').join(', ') || '—'}
                        <span className="font-bold text-rose-800 ml-2">B:</span> {Object.keys(picTeams).filter(u => picTeams[u] === 'B').map(u => (roster[u] && roster[u].name) || 'Student').join(', ') || '—'}
                      </>
                    )}
                  </div>
                  {!roundActive && (
                    <button type="button" onClick={suggestNextDrawers} className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-indigo-300 text-indigo-800 hover:bg-indigo-50" title="Fair rotation: picks the next drawer from each team in join order">
                      🎨 Suggest next drawers (one per team)
                    </button>
                  )}
                  <div className="text-[10px] text-slate-500">Correct guess: +2 guesser's team · +1 drawing team.</div>
                </div>
              )}
            </div>
            ) : null}
            {!roundActive ? (
              <>
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">1. {activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Drawing prompt' : 'Concept to draw'}</div>
                  <textarea
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder={activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'e.g. Draw a model showing how energy moves through this system.' : 'e.g. photosynthesis, checks and balances...'}
                    className="w-full text-sm border border-slate-300 rounded p-2 outline-none focus:ring-2 focus:ring-rose-300 resize-y min-h-[44px]"
                    aria-label={activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Sketch response prompt' : 'Concept to draw'}
                  />
                  {callGemini ? (
                    <button type="button" onClick={handleAISuggestConcepts} disabled={isLoadingIdeas} className="mt-2 w-full px-2 py-1 text-xs font-bold rounded bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 disabled:opacity-50">
                      {isLoadingIdeas ? 'Thinking…' : '✨ Suggest from lesson'}
                    </button>
                  ) : null}
                  {conceptIdeas.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {conceptIdeas.map((idea, i) => (
                        <button type="button" key={i} onClick={() => setConcept(idea)} className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100">
                          {idea}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">2. {activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Choose participants' : 'Pick drawers (max 4)'}</div>
                  {activityMode === SKETCH_RESPONSE_ACTIVITY_MODE && rosterEntries.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mb-2">
                      <button type="button" onClick={() => setDrawerUids(Object.keys(roster))} className="px-2 py-1 text-[10px] font-bold rounded border border-indigo-300 text-indigo-800">Whole class</button>
                      {Object.entries(groups).map(([groupId, group]) => {
                        const memberUids = Object.keys(roster).filter((uid) => roster[uid] && roster[uid].groupId === groupId);
                        return (
                          <button type="button" key={groupId} disabled={memberUids.length === 0} onClick={() => setDrawerUids(memberUids)} className="px-2 py-1 text-[10px] font-bold rounded border border-violet-300 text-violet-800 disabled:opacity-40">
                            {group && group.name ? group.name : groupId}
                          </button>
                        );
                      })}
                      <button type="button" onClick={() => setDrawerUids([])} className="px-2 py-1 text-[10px] font-bold rounded border border-slate-300 text-slate-600">Clear</button>
                    </div>
                  ) : null}
                  {rosterEntries.length === 0 ? (
                    <div className="text-xs text-slate-600 italic">No students in the session yet. Drawer assignment opens once they join.</div>
                  ) : (
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {rosterEntries.map((s) => {
                        const isDrawer = drawerUids.includes(s.uid);
                        return (
                          <li key={s.uid}>
                            <button type="button"
                              onClick={() => toggleDrawer(s.uid)}
                              disabled={activityMode === PICTIONARY_ACTIVITY_MODE && !isDrawer && drawerUids.length >= 4}
                              className={'w-full text-left flex items-center justify-between p-2 rounded text-sm border ' + (isDrawer ? (activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'bg-indigo-50 border-indigo-300 text-indigo-900' : 'bg-rose-50 border-rose-300 text-rose-900') : 'bg-white border-slate-200 hover:bg-slate-50 disabled:opacity-40')}
                            >
                              <span>{s.name}{s.connected ? '' : <span className="ml-2 text-[10px] text-slate-600 italic">(offline)</span>}</span>
                              <span className="text-[10px] font-bold">{isDrawer ? (activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'selected' : '🎨 drawer') : (activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'not selected' : 'guesser')}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">3. Round timer</div>
                  <select
                    value={durationMs}
                    onChange={(e) => setDurationMs(Number(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded p-1.5 outline-none focus:ring-2 focus:ring-rose-300"
                    aria-label="Round timer"
                  >
                    <option value={0}>No timer (manual end)</option>
                    <option value={30000}>30 seconds</option>
                    <option value={60000}>1 minute</option>
                    <option value={90000}>90 seconds</option>
                    <option value={120000}>2 minutes</option>
                    <option value={180000}>3 minutes</option>
                  </select>
                  <p className="text-[11px] text-slate-500 italic mt-1 leading-snug">{activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'When time ends, drawing stops and the private teacher gallery remains available for review.' : 'When the timer runs out, the round auto-resolves and the concept reveals.'}</p>
                </div>
                <button type="button"
                  onClick={handleStartRound}
                  disabled={!concept.trim() || drawerUids.length === 0}
                  className="w-full px-3 py-2 text-sm font-black rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 shadow-lg shadow-rose-500/30"
                >▶ {activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Start sketch response' : 'Start round'}</button>
              </>
            ) : (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs">
                <div className="font-bold text-rose-800 mb-1">{activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Sketch collection in progress' : 'Round in progress'}</div>
                <div className="text-slate-700"><strong>{activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Prompt:' : 'Concept:'}</strong> {concept}</div>
                <div className="text-slate-700 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <strong>{activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Participants:' : 'Drawers:'}</strong>
                  {drawerUids.map((uid, i) => {
                    const active = isDrawerActive(uid);
                    const dotColor = (PEN_COLORS[i % PEN_COLORS.length] && PEN_COLORS[i % PEN_COLORS.length].hex) || '#1a202c';
                    const name = (roster[uid] && roster[uid].name) || 'Student';
                    return (
                      <span key={uid} className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block rounded-full ${active ? 'pic-drawer-pulse' : ''}`}
                          style={{ width: 9, height: 9, background: dotColor, opacity: active ? 1 : 0.3, boxShadow: active ? `0 0 0 2px ${dotColor}30` : 'none' }}
                          aria-hidden="true"
                          title={active ? `${name} is drawing` : name}
                        />
                        <span>{name}</span>
                        {!connectedGuests[uid] && (
                          <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-full px-1.5" title={`${name} lost their connection — their strokes aren't arriving`}>offline</span>
                        )}
                      </span>
                    );
                  })}
                </div>
                <p className="text-slate-500 italic mt-2 leading-snug">{activityMode === SKETCH_RESPONSE_ACTIVITY_MODE ? 'Activity dots glow as private strokes arrive. Review, approve, reveal, or send follow-up resources from the gallery.' : 'Mark a guess correct on the left when someone gets it. Activity dots glow while a drawer is actively streaming strokes.'}</p>
              </div>
            )}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-[11px] text-slate-600">
              <div className="font-bold text-slate-700 mb-1">Connected: {Object.keys(connectedGuests).length}</div>
              {Object.keys(connectedGuests).length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(connectedGuests).map(([uid, codename]) => (
                    <span key={uid} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">{codename}</span>
                  ))}
                </div>
              ) : null}
            </div>
            {activityMode === PICTIONARY_ACTIVITY_MODE && roundLog.length > 0 ? (() => {
              // Aggregate stats from the session log.
              const total = roundLog.length;
              const correct = roundLog.filter(r => r.resolution === 'correct').length;
              const timedOut = roundLog.filter(r => r.resolution === 'timeout').length;
              const guesserTally = new Map();   // codename -> correct count
              roundLog.forEach(r => {
                if (r.resolution === 'correct' && r.winnerCodename) {
                  guesserTally.set(r.winnerCodename, (guesserTally.get(r.winnerCodename) || 0) + 1);
                }
              });
              const topGuessers = Array.from(guesserTally.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                  <div className="font-bold text-amber-900 mb-1 flex items-center justify-between">
                    <span>🏆 Session log</span>
                    <button type="button"
                      onClick={() => setShowRoundLogDetail((v) => !v)}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline"
                      aria-expanded={showRoundLogDetail}
                    >{showRoundLogDetail ? 'Hide rounds' : 'Show rounds'}</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-white border border-amber-200 rounded p-1.5 text-center">
                      <div className="text-base font-black text-amber-900 leading-none">{total}</div>
                      <div className="text-[9px] uppercase tracking-wider text-amber-700 mt-0.5">rounds</div>
                    </div>
                    <div className="bg-white border border-emerald-200 rounded p-1.5 text-center">
                      <div className="text-base font-black text-emerald-800 leading-none">{correct}</div>
                      <div className="text-[9px] uppercase tracking-wider text-emerald-700 mt-0.5">identified</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-1.5 text-center">
                      <div className="text-base font-black text-slate-700 leading-none">{timedOut}</div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-600 mt-0.5">timeouts</div>
                    </div>
                  </div>
                  {topGuessers.length > 0 ? (
                    <div className="mb-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">Top guessers</div>
                      <ul className="space-y-0.5">
                        {topGuessers.map(([codename, count], i) => (
                          <li key={codename} className="flex items-center justify-between text-[11px]">
                            <span className="text-amber-900">{i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '   '}{codename}</span>
                            <span className="font-bold text-amber-900">{count}×</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {showRoundLogDetail ? (
                    <ul className="space-y-1 max-h-40 overflow-y-auto mt-2 pt-2 border-t border-amber-200">
                      {roundLog.slice().reverse().map((r) => (
                        <li key={r.id} className="text-[11px] flex items-start gap-1.5">
                          <span aria-hidden="true">
                            {r.resolution === 'correct' ? '✓' : r.resolution === 'timeout' ? '⏱' : '⏸'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 truncate">{r.concept || '(no concept)'}</div>
                            <div className="text-slate-500 text-[10px]">
                              {r.resolution === 'correct' && r.winnerCodename
                                ? `→ ${r.winnerCodename}`
                                : r.resolution === 'timeout'
                                ? 'time’s up'
                                : 'ended manually'}
                              {r.drawerNames && r.drawerNames.length ? <span className="opacity-70"> · drawn by {r.drawerNames.join(', ')}</span> : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-[10px] text-amber-700 italic mt-2 leading-snug">Session-only. Closes with this dialog; nothing persists.</p>
                </div>
              );
            })() : null}
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Guest overlay (student-side, drawer or guesser depending on role) ──
const PictionaryGuestOverlay = React.memo((props) => {
  const sessionCode = props.sessionCode;
  const userUid = props.userUid;
  const codename = props.codename || 'Guest';
  const myRole = props.myRole || null;                  // 'drawer' | 'guesser' | null
  const onClose = props.onClose || (() => {});

  const guestRef = React.useRef(null);
  const guestContainerRef = React.useRef(null);
  const [isGuestFullscreen, toggleGuestFullscreen] = useFullscreen(guestContainerRef);
  // 'connecting' | 'connected' | 'reconnecting' | 'failed'
  const [connState, setConnState] = React.useState('connecting');
  const [strokes, setStrokes] = React.useState([]);
  const [activeRound, setActiveRound] = React.useState(null);  // { roundId, status, concept?, isDrawer }
  const [resolved, setResolved] = React.useState(null);        // { concept, winnerUid }
  const [color, setColor] = React.useState(PEN_COLORS[0].hex);
  const [mode, setMode] = React.useState('pen');
  const [myStrokeIds, setMyStrokeIds] = React.useState([]);    // for undo of MY own strokes
  const [guessText, setGuessText] = React.useState('');
  const [sketchSubmitted, setSketchSubmitted] = React.useState(false);
  const [sharedSketch, setSharedSketch] = React.useState(null);
  // Auto-rejoin: bumping joinNonce re-runs the join effect with a fresh
  // PictionaryGuest (fresh offer over the same signaling doc). The host
  // accepts re-offers, so a reload/Wi-Fi blip no longer strands the student.
  const [joinNonce, setJoinNonce] = React.useState(0);
  const retryCountRef = React.useRef(0);
  const retryTimerRef = React.useRef(null);
  // Refs so WebRTC callbacks see current values without re-creating the guest.
  const resolvedRef = React.useRef(null);
  React.useEffect(() => { resolvedRef.current = resolved; }, [resolved]);
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  React.useEffect(() => {
    if (!sessionCode || !userUid) return;
    let disposed = false;
    const REJOIN_DELAYS_MS = [2000, 5000, 10000, 20000, 30000];
    // Cap auto-rejoins so an overlay left open against a gone host (e.g.
    // student reading the resolution after the teacher closed the dashboard)
    // doesn't generate signaling churn forever. The manual Retry button
    // resets the budget.
    const MAX_AUTO_REJOINS = 8;
    const scheduleRejoin = () => {
      if (disposed) return;
      if (retryCountRef.current >= MAX_AUTO_REJOINS) return;
      const delay = REJOIN_DELAYS_MS[Math.min(retryCountRef.current, REJOIN_DELAYS_MS.length - 1)];
      retryCountRef.current += 1;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        setJoinNonce((n) => n + 1);
      }, delay);
    };
    setConnState((prev) => (prev === 'connected' ? prev : 'connecting'));
    const guest = new PictionaryGuest({
      sessionCode,
      userUid,
      codename,
      onConnected: () => { retryCountRef.current = 0; setConnState('connected'); },
      onDisconnected: () => { setConnState('reconnecting'); scheduleRejoin(); },
      onFailed: () => {
        setConnState((prev) => (prev === 'connected' ? prev : 'failed'));
        scheduleRejoin();
      },
      onRoundSync: (payload) => {
        // Host state sync on (re)connect: no active round → drop any stale one.
        if (payload && payload.active === false) {
          setActiveRound(null);
          setStrokes([]);
          setMyStrokeIds([]);
          setSketchSubmitted(false);
          setSharedSketch(null);
        }
      },
      onHostClosed: () => {
        // Terminal event: teacher closed the Pictionary dashboard. Clear the
        // round and close the overlay so the student is never stuck "waiting
        // for the teacher" on a dead channel. If the round's resolution is on
        // screen, leave the overlay up so they can read the reveal. The shell
        // re-opens the overlay automatically when a new round starts.
        setActiveRound(null);
        setStrokes([]);
        setMyStrokeIds([]);
        if (!resolvedRef.current && typeof onCloseRef.current === 'function') {
          onCloseRef.current();
        }
      },
      onRoundTiming: (timing) => {
        if (!timing || !timing.roundId) return;
        const clockOffsetMs = typeof timing.hostNow === 'number' ? (Date.now() - timing.hostNow) : 0;
        setActiveRound((prev) => prev && prev.roundId === timing.roundId ? { ...prev, ...timing, clockOffsetMs } : prev);
      },
      onRoundStart: (round) => {
        const clockOffsetMs = (round && typeof round.hostNow === 'number') ? (Date.now() - round.hostNow) : 0;
        setActiveRound(round ? { ...round, clockOffsetMs } : round);
        setStrokes([]);
        setMyStrokeIds([]);
        setResolved(null);
        setSketchSubmitted(false);
        setSharedSketch(null);
        // Per-drawer default color: each drawer gets a distinct hue from the
        // palette based on their position in the drawerUids array. Lets the
        // teacher and guessers visually parse who drew what during multi-drawer
        // collaboration. Drawer can still change colors freely.
        if (round && round.isDrawer && Array.isArray(round.drawerUids)) {
          const myPos = round.drawerUids.indexOf(userUid);
          if (myPos >= 0) {
            const defaultColor = PEN_COLORS[myPos % PEN_COLORS.length];
            if (defaultColor) {
              setColor(defaultColor.hex);
              setMode('pen');
            }
          }
        }
      },
      onRoundResolved: (r) => { setResolved(r); setActiveRound(null); },
      onStroke: (stroke) => setStrokes((prev) => prev.concat([stroke])),
      onStrokeHistory: (history) => setStrokes(history || []),
      onCanvasClear: () => { setStrokes([]); setMyStrokeIds([]); setSketchSubmitted(false); },
      onStrokeUndo: (strokeId) => setStrokes((prev) => prev.filter((s) => s.strokeId !== strokeId)),
      onSketchReveal: (payload) => setSharedSketch(payload && Array.isArray(payload.strokes) ? payload : null),
    });
    guest.join().catch((err) => {
      console.warn('[Pictionary guest] join failed:', err && err.message);
      setConnState('failed');
      scheduleRejoin();
    });
    guestRef.current = guest;
    return () => {
      disposed = true;
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      try { guestRef.current && guestRef.current.leave(); } catch (_) {}
      guestRef.current = null;
    };
  }, [sessionCode, userUid, codename, joinNonce]);

  const handleManualRetry = () => {
    retryCountRef.current = 0;
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    setJoinNonce((n) => n + 1);
  };

  const isDrawer = !!(activeRound && activeRound.isDrawer);
  const isSketchResponse = !!((activeRound && activeRound.mode === SKETCH_RESPONSE_ACTIVITY_MODE) || (resolved && resolved.mode === SKETCH_RESPONSE_ACTIVITY_MODE));
  const handleStrokeBatch = (stroke) => {
    setStrokes((prev) => prev.concat([{ ...stroke, uid: userUid }]));
    setMyStrokeIds((prev) => prev.concat([stroke.strokeId]));
    if (isSketchResponse && sketchSubmitted) {
      setSketchSubmitted(false);
      if (guestRef.current) guestRef.current.sendSketchStatus('editing');
    }
    if (guestRef.current) guestRef.current.sendStroke(stroke);
  };
  const handleUndo = () => {
    if (myStrokeIds.length === 0) return;
    const lastId = myStrokeIds[myStrokeIds.length - 1];
    setMyStrokeIds((prev) => prev.slice(0, -1));
    setStrokes((prev) => prev.filter((s) => s.strokeId !== lastId));
    // Broadcast so every peer (other drawers, guessers, host) drops the stroke
    // from their canvas too. Host validates that the originator owns the stroke
    // before re-broadcasting, so undo only ever affects the sender's own work.
    if (guestRef.current) guestRef.current.sendStrokeUndo(lastId);
  };
  const handleSketchSubmit = () => {
    if (!isSketchResponse || strokes.length === 0 || !guestRef.current) return;
    if (guestRef.current.sendSketchStatus('submitted')) setSketchSubmitted(true);
  };
  const handleSketchEdit = () => {
    if (!isSketchResponse || !guestRef.current) return;
    if (guestRef.current.sendSketchStatus('editing')) setSketchSubmitted(false);
  };
  // Guess cooldown: one guess per 3s keeps a rapid-fire guesser from
  // flooding the teacher's feed (the host can also mute per-student).
  const GUESS_COOLDOWN_MS = 3000;
  const lastGuessAtRef = React.useRef(0);
  const [guessNotice, setGuessNotice] = React.useState(null);
  const handleSubmitGuess = () => {
    const t = guessText.trim();
    if (!t || !guestRef.current) return;
    const now = Date.now();
    const waitMs = lastGuessAtRef.current + GUESS_COOLDOWN_MS - now;
    if (waitMs > 0) {
      setGuessNotice(`One guess at a time — try again in ${Math.ceil(waitMs / 1000)}s.`);
      return;
    }
    if (guestRef.current.sendGuess(t)) {
      lastGuessAtRef.current = now;
      setGuessText('');
      setGuessNotice(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-2 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Concept Pictionary">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={guestContainerRef}
        className="relative bg-white shadow-2xl w-full max-w-3xl overflow-y-auto border border-slate-200"
        style={isGuestFullscreen
          ? { width: '100vw', height: '100vh', maxWidth: 'none', margin: 0, borderRadius: 0 }
          : { borderRadius: '1rem', marginTop: '2rem', marginBottom: '2rem' }
        }
      >
        <div className="flex items-start justify-between p-3 sm:p-4 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-amber-50 gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">{isSketchResponse ? '🎨 Private sketch response' : isDrawer ? '🎨 You are a drawer' : '👀 You are a guesser'}</div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 mt-0.5">{isSketchResponse ? 'Sketch Response' : 'Concept Pictionary'}</h2>
            {connState === 'connecting' ? <div className="text-[11px] text-amber-700 mt-1">Connecting…</div> : null}
            {connState === 'reconnecting' ? <div className="text-[11px] text-amber-700 mt-1" role="status">Connection lost — reconnecting…</div> : null}
            {connState === 'failed' ? (
              <div className="text-[11px] text-red-700 mt-1 flex items-center gap-2" role="status">
                <span>Can't reach the teacher's device.</span>
                <button type="button"
                  onClick={handleManualRetry}
                  className="px-2 py-0.5 text-[10px] font-bold rounded border border-red-300 bg-white text-red-700 hover:bg-red-50"
                >Retry</button>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            {activeRound && activeRound.durationMs && activeRound.startedAt ? (
              <RoundCountdown startedAt={activeRound.startedAt} durationMs={activeRound.durationMs} clockOffsetMs={activeRound.clockOffsetMs || 0} isPaused={activeRound.isPaused} pausedAt={activeRound.pausedAt} pausedTotalMs={activeRound.pausedTotalMs} />
            ) : null}
            <button type="button"
              onClick={toggleGuestFullscreen}
              className="text-slate-500 hover:text-slate-800 text-lg leading-none p-1.5 rounded hover:bg-slate-100"
              aria-label={isGuestFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isGuestFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
            >{isGuestFullscreen ? '↙' : '⛶'}</button>
            <button type="button" onClick={onClose} className="text-slate-600 hover:text-slate-700 text-2xl leading-none p-1 rounded hover:bg-slate-100" aria-label="Close">✕</button>
          </div>
        </div>
        <div className="p-3 sm:p-4">
          {sharedSketch ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">{sharedSketch.label || 'Anonymous sketch'}</div>
                  <div className="text-sm font-bold text-indigo-950">{sharedSketch.prompt || 'Class sketch response'}</div>
                </div>
                <button type="button" onClick={() => setSharedSketch(null)} className="ml-auto px-2 py-1 text-[10px] font-bold rounded border border-indigo-300 bg-white text-indigo-800">Dismiss</button>
              </div>
              <PictionaryCanvas
                strokes={sharedSketch.strokes || []}
                drawingEnabled={false}
                showWatchingBadge={false}
                ariaLabel="Anonymously shared sketch response"
              />
            </div>
          ) : null}
          {activeRound && activeRound.isPaused ? (
            <div role="status" className="bg-amber-100 border border-amber-300 rounded-lg p-3 mb-3 text-sm font-bold text-amber-900">Round paused by the teacher. Drawing and guessing will resume with the timer.</div>
          ) : null}
          {activeRound && isDrawer ? (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">{isSketchResponse ? 'Drawing prompt' : 'Concept to draw together'}</div>
              <div className="text-xl font-black text-rose-900 mt-1">{activeRound.concept}</div>
              <div className="text-[11px] text-rose-700 italic mt-1">{isSketchResponse ? 'Your board stays private to the teacher until an approved anonymous reveal.' : 'No letters or numbers — just the picture. Other drawers can add to your sketch.'}</div>
            </div>
          ) : null}
          {activeRound && !isDrawer && !isSketchResponse ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
              <div className="text-xs font-bold text-amber-800">Watch the drawing and guess what concept they're representing.</div>
            </div>
          ) : null}
          {!activeRound && !resolved ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-center text-sm text-slate-600">
              Waiting for the teacher to start a round…
            </div>
          ) : null}
          {resolved ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">{isSketchResponse ? 'Sketch collection ended' : 'Round resolved'}</div>
              <div className="text-base font-black text-emerald-900 mt-1">{isSketchResponse ? 'Prompt: ' : 'Concept was: '}{resolved.concept || '(not revealed)'}</div>
            </div>
          ) : null}
          <PictionaryCanvas
            strokes={strokes}
            drawingEnabled={!!(activeRound && isDrawer && activeRound.status === 'drawing' && !activeRound.isPaused && !(isSketchResponse && sketchSubmitted))}
            ariaLabel={isSketchResponse ? 'Your private sketch response canvas' : 'Pictionary drawing canvas'}
            color={color}
            mode={mode}
            onStrokeBatch={handleStrokeBatch}
            fullscreenMode={isGuestFullscreen}
          />
          {activeRound && isDrawer && !activeRound.isPaused && !(isSketchResponse && sketchSubmitted) ? (
            <DrawerToolbox
              color={color}
              setColor={setColor}
              mode={mode}
              setMode={setMode}
              onUndo={myStrokeIds.length > 0 ? handleUndo : null}
            />
          ) : null}
          {activeRound && isSketchResponse && isDrawer && !activeRound.isPaused ? (
            <div className="mt-3">
              {sketchSubmitted ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">
                  <strong>Drawing submitted.</strong> It remains private until the teacher approves and reveals it.
                  <button type="button" onClick={handleSketchEdit} className="block w-full mt-2 px-3 py-2 text-xs font-bold rounded border border-emerald-300 bg-white text-emerald-800">Edit drawing</button>
                </div>
              ) : (
                <button type="button" onClick={handleSketchSubmit} disabled={strokes.length === 0} className="w-full px-4 py-2 text-sm font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40">Submit drawing</button>
              )}
            </div>
          ) : null}
          {activeRound && !isDrawer && !isSketchResponse ? (
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={guessText}
                onChange={(e) => setGuessText(e.target.value)}
                disabled={!!activeRound.isPaused}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitGuess(); }}
                placeholder={(typeof window !== 'undefined' && window.__alloT && window.__alloT("placeholders.type_guess")) || "Type your guess…"}
                className="flex-1 text-sm border border-slate-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-amber-300"
                aria-label="Your guess"
              />
              <button type="button"
                onClick={handleSubmitGuess}
                disabled={!guessText.trim() || !!activeRound.isPaused}
                className="px-4 py-2 text-sm font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40"
              >Send</button>
            </div>
          ) : null}
          {activeRound && !isDrawer && guessNotice ? (
            <p className="text-[11px] text-amber-700 mt-1" role="status">{guessNotice}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
});
