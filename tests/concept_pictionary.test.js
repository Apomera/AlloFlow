// Smoke test for the Concept Pictionary WebRTC protocol.
//
// Loads the COMPILED concept_pictionary_module.js (the same file that ships to
// the CDN), then exercises PictionaryHost + PictionaryGuest through their
// public API. Mocks just enough of the browser surface — React stub, minimal
// WebRTC peer-connection, and an in-memory Firestore signaling pubsub — to
// let the module load and the classes operate.
//
// The WebRTC handshake itself (offer/answer/ICE) is bypassed via a manual
// "link" helper that injects paired FakeDataChannels into the host's peer
// map and the guest's dc field. Each .send() on one channel synchronously
// fires .onmessage on its peer. This is the right level of coverage for a
// smoke test: the handshake is browser-plumbing that vitest+jsdom can't
// faithfully reproduce, but the message protocol (roundStart / stroke /
// guess / roundResolved / strokeUndo / strokeHistory) is pure JS and
// regression-prone.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

// ── Mock WebRTC ─────────────────────────────────────────────────────────
class FakeDataChannel {
  constructor() {
    this.readyState = 'open';
    this.peer = null;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
  }
  send(data) {
    if (!this.peer || typeof this.peer.onmessage !== 'function') return;
    // Synchronous delivery keeps tests deterministic; production uses an
    // ordered WebRTC channel, which behaves the same way as far as the
    // protocol logic is concerned.
    this.peer.onmessage({ data });
  }
  close() {
    this.readyState = 'closed';
    if (typeof this.onclose === 'function') this.onclose();
  }
}

class FakePeerConnection {
  constructor() {
    this.signalingState = 'stable';
    this.connectionState = 'new';
    this.localDescription = null;
    this.remoteDescription = null;
    this.onicecandidate = null;
    this.ondatachannel = null;
    this.onconnectionstatechange = null;
  }
  createDataChannel(name) {
    const dc = new FakeDataChannel();
    this._createdDc = dc;
    return dc;
  }
  async createOffer() { return { type: 'offer', sdp: 'fake-offer-sdp' }; }
  async createAnswer() { return { type: 'answer', sdp: 'fake-answer-sdp' }; }
  async setLocalDescription(desc) {
    this.localDescription = desc;
    if (desc && desc.type === 'offer') this.signalingState = 'have-local-offer';
  }
  async setRemoteDescription(desc) { this.remoteDescription = desc; }
  async addIceCandidate() { /* no-op */ }
  close() {
    this.connectionState = 'closed';
    if (typeof this.onconnectionstatechange === 'function') this.onconnectionstatechange();
  }
}

class FakeRTCSessionDescription {
  constructor(init) { this.type = init && init.type; this.sdp = init && init.sdp; }
}
class FakeRTCIceCandidate {
  constructor(init) { Object.assign(this, init || {}); }
}

// ── Mock Firebase signaling (in-memory pubsub) ─────────────────────────
// Just enough to let host.start() and guest.join() complete without throwing.
// The smoke test bypasses the handshake by manually linking host <-> guest
// post-instantiation, so the contents don't actually need to drive a real
// offer/answer exchange.
function makeFakeFirebase() {
  const docs = new Map();              // 'path' -> data
  const collectionListeners = new Map(); // 'collectionPath' -> Set<callback>
  const docListeners = new Map();      // 'path' -> Set<callback>

  const refToPath = (ref) => ref && ref._path;

  return {
    db: { fake: true },
    doc: (db, ...segments) => ({ _path: segments.join('/'), _kind: 'doc' }),
    collection: (db, ...segments) => ({ _path: segments.join('/'), _kind: 'collection' }),
    setDoc: async (ref, data, opts) => {
      const path = refToPath(ref);
      const existing = (opts && opts.merge) ? (docs.get(path) || {}) : {};
      docs.set(path, { ...existing, ...data });
      // Fire doc listeners
      (docListeners.get(path) || new Set()).forEach((cb) => {
        try { cb({ data: () => docs.get(path), exists: true }); } catch (_) {}
      });
      // Fire collection listeners with a docChanges shim
      const collectionPath = path.split('/').slice(0, -1).join('/');
      (collectionListeners.get(collectionPath) || new Set()).forEach((cb) => {
        try {
          cb({
            docChanges: () => [{
              type: 'added',
              doc: {
                id: path.split('/').pop(),
                data: () => docs.get(path),
                ref: { _path: path, _kind: 'doc' },
              },
            }],
          });
        } catch (_) {}
      });
    },
    deleteDoc: async (ref) => { docs.delete(refToPath(ref)); },
    updateDoc: async (ref, data) => {
      const path = refToPath(ref);
      docs.set(path, { ...(docs.get(path) || {}), ...data });
    },
    onSnapshot: (ref, cb) => {
      const path = refToPath(ref);
      const targetMap = ref._kind === 'collection' ? collectionListeners : docListeners;
      if (!targetMap.has(path)) targetMap.set(path, new Set());
      targetMap.get(path).add(cb);
      // Fire once with empty initial snapshot
      try {
        if (ref._kind === 'collection') {
          cb({ docChanges: () => [] });
        } else {
          const data = docs.get(path);
          cb({ data: () => data || null, exists: !!data });
        }
      } catch (_) {}
      return () => { targetMap.get(path) && targetMap.get(path).delete(cb); };
    },
    _docs: docs,
  };
}

// ── Polyfills and module load ───────────────────────────────────────────
let ConceptPictionary;
let PictionaryHost;
let PictionaryGuest;

beforeAll(() => {
  // The compiled IIFE bails out if window.React is missing. Provide a stub
  // that at least has the hook signatures the source destructures off it.
  // The classes themselves never call React; this stub only satisfies the
  // top-level guard.
  window.React = window.React || {
    useState: () => [undefined, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useContext: () => null,
    memo: (c) => c,
    createElement: () => null,
    Fragment: 'fragment',
  };

  // WebRTC mocks
  global.RTCPeerConnection = FakePeerConnection;
  window.RTCPeerConnection = FakePeerConnection;
  global.RTCSessionDescription = FakeRTCSessionDescription;
  window.RTCSessionDescription = FakeRTCSessionDescription;
  global.RTCIceCandidate = FakeRTCIceCandidate;
  window.RTCIceCandidate = FakeRTCIceCandidate;

  // Firebase signaling mock
  window.__alloFirebase = makeFakeFirebase();
  window.appId = 'test-app';

  loadAlloModule('concept_pictionary_module.js');
  ConceptPictionary = window.AlloModules.ConceptPictionary;
  if (!ConceptPictionary) throw new Error('ConceptPictionary module failed to register');
  PictionaryHost = ConceptPictionary.PictionaryHost;
  PictionaryGuest = ConceptPictionary.PictionaryGuest;
  if (!PictionaryHost || !PictionaryGuest) throw new Error('Host/Guest classes not exported');
});

// ── Test helpers ────────────────────────────────────────────────────────
// Manually link a host and a guest by injecting a paired FakeDataChannel.
// Bypasses the offer/answer/ICE handshake which would require a real WebRTC
// implementation. After linking, the host treats `uid` as a connected peer
// (eligible to be assigned as a drawer or guesser) and the guest's `.dc`
// is a working channel that mirrors what `join()` would have set up.
function linkHostAndGuest(host, guest, uid, codename) {
  const hostDc = new FakeDataChannel();
  const guestDc = new FakeDataChannel();
  hostDc.peer = guestDc;
  guestDc.peer = hostDc;

  // Host side: mimic the dc.onmessage wiring set up inside _acceptPeer.
  hostDc.onmessage = (msg) => {
    try {
      const parsed = JSON.parse(msg.data);
      if (!parsed || !parsed.type) return;
      if (parsed.type === 'stroke' && parsed.payload) {
        host._onIncomingStroke(uid, codename, parsed.payload);
      } else if (parsed.type === 'strokeUndo' && parsed.payload && parsed.payload.strokeId) {
        host._onIncomingStrokeUndo(uid, parsed.payload.strokeId);
      } else if (parsed.type === 'guess' && parsed.payload) {
        host.onGuess(uid, codename, parsed.payload);
      }
    } catch (_) {}
  };
  host.peers.set(uid, {
    pc: new FakePeerConnection(),
    dc: hostDc,
    signalingRef: { _path: `signaling/${uid}` },
    codename,
    sentIce: [],
  });
  // Fire onGuestConnected the way _acceptPeer's dc.onopen would.
  host.onGuestConnected(uid, codename);

  // Guest side: install dc + mimic the dc.onmessage wiring from join().
  guest.dc = guestDc;
  guest.userUid = uid;
  guest.codename = codename;
  guestDc.onmessage = (msg) => {
    try {
      const parsed = JSON.parse(msg.data);
      if (!parsed || !parsed.type) return;
      if (parsed.type === 'roundStart') guest.onRoundStart(parsed.payload);
      else if (parsed.type === 'roundResolved') guest.onRoundResolved(parsed.payload);
      else if (parsed.type === 'stroke') guest.onStroke(parsed.payload);
      else if (parsed.type === 'strokeUndo' && parsed.payload && parsed.payload.strokeId) guest.onStrokeUndo(parsed.payload.strokeId);
      else if (parsed.type === 'strokeHistory') guest.onStrokeHistory((parsed.payload && parsed.payload.strokes) || []);
      else if (parsed.type === 'canvasClear') guest.onCanvasClear();
    } catch (_) {}
  };

  return { hostDc, guestDc };
}

// ── Tests ───────────────────────────────────────────────────────────────
describe('PictionaryHost + PictionaryGuest smoke test', () => {
  let host;
  let drawer;
  let guesser;
  let hostEvents;

  beforeEach(() => {
    hostEvents = {
      guestConnections: [],
      strokes: [],
      strokeUndos: [],
      guesses: [],
      autoResolves: [],
    };
    host = new PictionaryHost({
      sessionCode: 'TESTROOM',
      onGuestConnected: (uid, codename) => hostEvents.guestConnections.push({ uid, codename }),
      onStroke: (uid, codename, stroke) => hostEvents.strokes.push({ uid, stroke }),
      onStrokeUndo: (uid, strokeId) => hostEvents.strokeUndos.push({ uid, strokeId }),
      onGuess: (uid, codename, payload) => hostEvents.guesses.push({ uid, payload }),
      onRoundAutoResolved: (info) => hostEvents.autoResolves.push(info),
    });

    drawer = new PictionaryGuest({
      sessionCode: 'TESTROOM',
      userUid: 'drawer-1',
      codename: 'BraveWolf',
      onRoundStart: vi.fn(),
      onRoundResolved: vi.fn(),
      onStroke: vi.fn(),
      onStrokeHistory: vi.fn(),
      onStrokeUndo: vi.fn(),
      onCanvasClear: vi.fn(),
    });
    guesser = new PictionaryGuest({
      sessionCode: 'TESTROOM',
      userUid: 'guesser-1',
      codename: 'QuickFox',
      onRoundStart: vi.fn(),
      onRoundResolved: vi.fn(),
      onStroke: vi.fn(),
      onStrokeHistory: vi.fn(),
      onStrokeUndo: vi.fn(),
      onCanvasClear: vi.fn(),
    });
  });

  afterEach(() => {
    try { host && host.stop(); } catch (_) {}
  });

  it('links host + guests and fires onGuestConnected per peer', () => {
    linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
    linkHostAndGuest(host, guesser, 'guesser-1', 'QuickFox');
    expect(hostEvents.guestConnections).toHaveLength(2);
    expect(hostEvents.guestConnections[0]).toMatchObject({ uid: 'drawer-1', codename: 'BraveWolf' });
    expect(hostEvents.guestConnections[1]).toMatchObject({ uid: 'guesser-1', codename: 'QuickFox' });
    expect(host.peers.size).toBe(2);
  });

  it('startRound sends the concept ONLY to drawers and an empty concept to guessers', () => {
    linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
    linkHostAndGuest(host, guesser, 'guesser-1', 'QuickFox');
    host.startRound({ concept: 'photosynthesis', drawerUids: ['drawer-1'] });

    const drawerCalls = drawer.onRoundStart.mock.calls;
    const guesserCalls = guesser.onRoundStart.mock.calls;
    expect(drawerCalls).toHaveLength(1);
    expect(guesserCalls).toHaveLength(1);
    expect(drawerCalls[0][0]).toMatchObject({ isDrawer: true, concept: 'photosynthesis' });
    expect(guesserCalls[0][0]).toMatchObject({ isDrawer: false, concept: null });
    // drawerUids array is broadcast to both sides for per-drawer color logic
    expect(drawerCalls[0][0].drawerUids).toEqual(['drawer-1']);
    expect(guesserCalls[0][0].drawerUids).toEqual(['drawer-1']);
  });

  it('rejects strokes from peers who are not drawers in the active round', () => {
    linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
    linkHostAndGuest(host, guesser, 'guesser-1', 'QuickFox');
    host.startRound({ concept: 'mitosis', drawerUids: ['drawer-1'] });

    // Drawer's stroke should be accepted, broadcast to guesser, and buffered.
    drawer.sendStroke({ strokeId: 'sA', color: '#c53030', points: [[10, 10], [20, 20]] });
    expect(hostEvents.strokes).toHaveLength(1);
    expect(hostEvents.strokes[0].stroke.strokeId).toBe('sA');
    expect(guesser.onStroke).toHaveBeenCalledTimes(1);
    expect(host.strokeHistory).toHaveLength(1);

    // Guesser's "stroke" should be silently rejected by the host (not a drawer).
    guesser.sendStroke({ strokeId: 'sB', color: '#2b6cb0', points: [[5, 5]] });
    expect(hostEvents.strokes).toHaveLength(1);
    expect(host.strokeHistory).toHaveLength(1);
  });

  it('re-broadcasts strokes to every OTHER peer (not the sender)', () => {
    linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
    linkHostAndGuest(host, guesser, 'guesser-1', 'QuickFox');
    const drawer2 = new PictionaryGuest({
      sessionCode: 'TESTROOM',
      userUid: 'drawer-2',
      codename: 'SwiftEagle',
      onRoundStart: vi.fn(),
      onRoundResolved: vi.fn(),
      onStroke: vi.fn(),
      onStrokeHistory: vi.fn(),
      onStrokeUndo: vi.fn(),
      onCanvasClear: vi.fn(),
    });
    linkHostAndGuest(host, drawer2, 'drawer-2', 'SwiftEagle');
    host.startRound({ concept: 'mitosis', drawerUids: ['drawer-1', 'drawer-2'] });

    drawer.sendStroke({ strokeId: 's1', color: '#c53030', points: [[1, 1]] });
    // Drawer-2 + guesser receive; drawer-1 does NOT (it's the sender).
    expect(drawer.onStroke).not.toHaveBeenCalled();
    expect(drawer2.onStroke).toHaveBeenCalledTimes(1);
    expect(guesser.onStroke).toHaveBeenCalledTimes(1);
  });

  it('delivers guesses from guesser to host with codename + text', () => {
    linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
    linkHostAndGuest(host, guesser, 'guesser-1', 'QuickFox');
    host.startRound({ concept: 'photosynthesis', drawerUids: ['drawer-1'] });

    guesser.sendGuess('plants making food');
    expect(hostEvents.guesses).toHaveLength(1);
    expect(hostEvents.guesses[0]).toMatchObject({
      uid: 'guesser-1',
      payload: expect.objectContaining({ text: 'plants making food', codename: 'QuickFox' }),
    });
  });

  it('strokeUndo from the originator is accepted, buffered-removed, and re-broadcast', () => {
    linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
    linkHostAndGuest(host, guesser, 'guesser-1', 'QuickFox');
    host.startRound({ concept: 'mitosis', drawerUids: ['drawer-1'] });

    drawer.sendStroke({ strokeId: 'sA', color: '#c53030', points: [[1, 1]] });
    drawer.sendStroke({ strokeId: 'sB', color: '#c53030', points: [[2, 2]] });
    expect(host.strokeHistory).toHaveLength(2);

    drawer.sendStrokeUndo('sB');
    expect(host.strokeHistory).toHaveLength(1);
    expect(host.strokeHistory[0].strokeId).toBe('sA');
    expect(hostEvents.strokeUndos).toEqual([{ uid: 'drawer-1', strokeId: 'sB' }]);
    expect(guesser.onStrokeUndo).toHaveBeenCalledWith('sB');
  });

  it('rejects strokeUndo of a stroke owned by a different drawer', () => {
    linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
    const drawer2 = new PictionaryGuest({
      sessionCode: 'TESTROOM',
      userUid: 'drawer-2',
      codename: 'SwiftEagle',
      onRoundStart: vi.fn(),
      onRoundResolved: vi.fn(),
      onStroke: vi.fn(),
      onStrokeHistory: vi.fn(),
      onStrokeUndo: vi.fn(),
      onCanvasClear: vi.fn(),
    });
    linkHostAndGuest(host, drawer2, 'drawer-2', 'SwiftEagle');
    host.startRound({ concept: 'mitosis', drawerUids: ['drawer-1', 'drawer-2'] });

    drawer.sendStroke({ strokeId: 'sA', color: '#c53030', points: [[1, 1]] });
    expect(host.strokeHistory).toHaveLength(1);

    // drawer-2 tries to undo drawer-1's stroke. Host rejects silently.
    drawer2.sendStrokeUndo('sA');
    expect(host.strokeHistory).toHaveLength(1);
    expect(hostEvents.strokeUndos).toHaveLength(0);
  });

  it('round timer auto-resolves after durationMs and fires onRoundAutoResolved with full snapshot', async () => {
    vi.useFakeTimers();
    try {
      linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
      linkHostAndGuest(host, guesser, 'guesser-1', 'QuickFox');
      host.startRound({ concept: 'mitosis', drawerUids: ['drawer-1'], durationMs: 30000 });

      // Before the timeout, round is still active.
      expect(host.activeRound).not.toBeNull();
      expect(hostEvents.autoResolves).toHaveLength(0);

      vi.advanceTimersByTime(30001);

      expect(host.activeRound).toBeNull();
      expect(hostEvents.autoResolves).toHaveLength(1);
      expect(hostEvents.autoResolves[0]).toMatchObject({
        concept: 'mitosis',
        reason: 'timeout',
        drawerUids: ['drawer-1'],
        durationMs: 30000,
      });
      // All peers received roundResolved with reason: 'timeout'
      expect(drawer.onRoundResolved).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'timeout', concept: 'mitosis' })
      );
      expect(guesser.onRoundResolved).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'timeout', concept: 'mitosis' })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('manual resolveRound clears the timer + broadcasts with reason=manual', () => {
    vi.useFakeTimers();
    try {
      linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
      linkHostAndGuest(host, guesser, 'guesser-1', 'QuickFox');
      host.startRound({ concept: 'mitosis', drawerUids: ['drawer-1'], durationMs: 30000 });

      host.resolveRound({ winnerUid: 'guesser-1', reason: 'manual' });
      expect(host.activeRound).toBeNull();

      // Auto-resolve should NEVER fire after manual resolution.
      vi.advanceTimersByTime(60000);
      expect(hostEvents.autoResolves).toHaveLength(0);

      expect(guesser.onRoundResolved).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'manual', winnerUid: 'guesser-1' })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('clearCanvas wipes strokeHistory and broadcasts canvasClear to all peers', () => {
    linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
    linkHostAndGuest(host, guesser, 'guesser-1', 'QuickFox');
    host.startRound({ concept: 'mitosis', drawerUids: ['drawer-1'] });
    drawer.sendStroke({ strokeId: 'sA', color: '#c53030', points: [[1, 1]] });
    expect(host.strokeHistory).toHaveLength(1);

    host.clearCanvas();
    expect(host.strokeHistory).toHaveLength(0);
    expect(drawer.onCanvasClear).toHaveBeenCalled();
    expect(guesser.onCanvasClear).toHaveBeenCalled();
  });

  it('resolveRound clears strokeHistory (each round starts with a fresh canvas)', () => {
    linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
    host.startRound({ concept: 'A', drawerUids: ['drawer-1'] });
    drawer.sendStroke({ strokeId: 's1', color: '#c53030', points: [[1, 1]] });
    expect(host.strokeHistory).toHaveLength(1);

    host.resolveRound({ winnerUid: null, reason: 'manual' });
    expect(host.strokeHistory).toHaveLength(0);
  });

  it('stop() tears down all peers and clears active round + timer', () => {
    vi.useFakeTimers();
    try {
      linkHostAndGuest(host, drawer, 'drawer-1', 'BraveWolf');
      host.startRound({ concept: 'A', drawerUids: ['drawer-1'], durationMs: 60000 });
      expect(host.peers.size).toBe(1);

      host.stop();
      expect(host.peers.size).toBe(0);
      expect(host.activeRound).toBeNull();

      // Pending timer should be cancelled — no auto-resolve fires after stop.
      vi.advanceTimersByTime(120000);
      expect(hostEvents.autoResolves).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sendStroke / sendGuess / sendStrokeUndo return false when the channel is not open', () => {
    // Guest with no dc at all simulates pre-connection state.
    const lonely = new PictionaryGuest({
      sessionCode: 'TESTROOM',
      userUid: 'lonely',
      codename: 'Pending',
    });
    expect(lonely.sendStroke({ strokeId: 'x', color: '#000', points: [] })).toBe(false);
    expect(lonely.sendGuess('hi')).toBe(false);
    expect(lonely.sendStrokeUndo('x')).toBe(false);
  });
});

// ── Pure-function sanity checks ─────────────────────────────────────────
describe('PEN_COLORS palette', () => {
  it('exposes 6 distinct hexes for the per-drawer default color rotation', () => {
    expect(Array.isArray(ConceptPictionary.PEN_COLORS)).toBe(true);
    expect(ConceptPictionary.PEN_COLORS.length).toBe(6);
    const hexes = new Set(ConceptPictionary.PEN_COLORS.map((c) => c.hex));
    expect(hexes.size).toBe(6);
  });
});
