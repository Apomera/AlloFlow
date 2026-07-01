// Reconnect-safe transport tests for live_polling_module.js (2026-07-01
// hardening). Pins the terminal-event + reconnect protocol:
//   - stop() broadcasts a hostClosed terminal event before tearing peers
//     down (deferred ~300ms so the send buffer flushes) — student overlays
//     clear instead of dangling on a dead channel.
//   - On (re)connect the host syncs poll state: active poll re-sent,
//     otherwise an id-less closePoll clears any stale overlay.
//   - A re-offer for an already-known uid (student reloaded / auto-rejoined)
//     replaces the stale peer instead of being ignored, and stale-peer
//     cleanup must NOT delete the fresh signaling doc (that race destroyed
//     reconnect offers).
//   - PollingGuest routes hostClosed to onHostClosed.
//
// Mirrors the mock strategy in tests/concept_pictionary.test.js: fake
// WebRTC classes + an in-memory Firestore pubsub, with the handshake
// completed via a manually-fired ondatachannel/onopen.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

class FakeDataChannel {
  constructor() { this.readyState = 'open'; this.peer = null; this.onopen = null; this.onmessage = null; this.onclose = null; }
  send(data) { if (this.peer && typeof this.peer.onmessage === 'function') this.peer.onmessage({ data }); }
  close() { this.readyState = 'closed'; if (typeof this.onclose === 'function') this.onclose(); }
}
class FakePeerConnection {
  constructor(cfg) { this._cfg = cfg; this.signalingState = 'stable'; this.connectionState = 'new'; this.onicecandidate = null; this.ondatachannel = null; this.onconnectionstatechange = null; }
  createDataChannel() { const dc = new FakeDataChannel(); this._createdDc = dc; return dc; }
  async createOffer() { return { type: 'offer', sdp: 'fake-offer-sdp' }; }
  async createAnswer() { return { type: 'answer', sdp: 'fake-answer-sdp' }; }
  async setLocalDescription(desc) { if (desc && desc.type === 'offer') this.signalingState = 'have-local-offer'; }
  async setRemoteDescription() {}
  async addIceCandidate() {}
  close() { this.connectionState = 'closed'; if (typeof this.onconnectionstatechange === 'function') this.onconnectionstatechange(); }
}

function makeFakeFirebase() {
  const docs = new Map();
  const collectionListeners = new Map();
  const docListeners = new Map();
  const refToPath = (ref) => ref && ref._path;
  return {
    db: { fake: true },
    doc: (db, ...segments) => ({ _path: segments.join('/'), _kind: 'doc' }),
    collection: (db, ...segments) => ({ _path: segments.join('/'), _kind: 'collection' }),
    setDoc: async (ref, data, opts) => {
      const path = refToPath(ref);
      const existing = (opts && opts.merge) ? (docs.get(path) || {}) : {};
      docs.set(path, { ...existing, ...data });
      (docListeners.get(path) || new Set()).forEach((cb) => { try { cb({ data: () => docs.get(path), exists: true }); } catch (_) {} });
      const collectionPath = path.split('/').slice(0, -1).join('/');
      (collectionListeners.get(collectionPath) || new Set()).forEach((cb) => {
        try {
          cb({ docChanges: () => [{ type: 'added', doc: { id: path.split('/').pop(), data: () => docs.get(path), ref: { _path: path, _kind: 'doc' } } }] });
        } catch (_) {}
      });
    },
    deleteDoc: async (ref) => { docs.delete(refToPath(ref)); },
    onSnapshot: (ref, cb) => {
      const path = refToPath(ref);
      const targetMap = ref._kind === 'collection' ? collectionListeners : docListeners;
      if (!targetMap.has(path)) targetMap.set(path, new Set());
      targetMap.get(path).add(cb);
      try {
        if (ref._kind === 'collection') cb({ docChanges: () => [] });
        else { const data = docs.get(path); cb({ data: () => data || null, exists: !!data }); }
      } catch (_) {}
      return () => { targetMap.get(path) && targetMap.get(path).delete(cb); };
    },
    _docs: docs,
  };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

let LP;
beforeAll(() => {
  global.RTCPeerConnection = FakePeerConnection;
  window.RTCPeerConnection = FakePeerConnection;
  global.RTCSessionDescription = class { constructor(init) { Object.assign(this, init || {}); } };
  window.RTCSessionDescription = global.RTCSessionDescription;
  global.RTCIceCandidate = class { constructor(init) { Object.assign(this, init || {}); } };
  window.RTCIceCandidate = global.RTCIceCandidate;
  window.appId = 'test-app';
  loadAlloModule('live_polling_module.js');
  LP = window.AlloModules.LivePolling;
  if (!LP) throw new Error('LivePolling failed to register');
});

describe('reconnect-safe transport', () => {
  it('stop() broadcasts hostClosed to open channels, then tears peers down', () => {
    vi.useFakeTimers();
    try {
      const host = LP.createHost({ sessionCode: 'RECON' });
      const sent = [];
      host.peers.set('u1', { pc: new FakePeerConnection(), dc: { readyState: 'open', send: (m) => sent.push(JSON.parse(m)) }, codename: 'Stu', signalingRef: null, sentIce: [] });
      host.activePoll = { id: 'poll-9' };

      host.stop();
      expect(sent.some((m) => m.type === 'hostClosed' && m.payload.pollId === 'poll-9')).toBe(true);
      expect(host.peers.size).toBe(1); // teardown deferred so the send flushes
      vi.advanceTimersByTime(300);
      expect(host.peers.size).toBe(0);
      expect(host.activePoll).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('syncs poll state on connect: active poll re-sent, otherwise id-less closePoll clears stale overlays', async () => {
    const fb = makeFakeFirebase();
    window.__alloFirebase = fb;
    const host = LP.createHost({ sessionCode: 'SYNCROOM' });
    await host.start();
    const docRef = fb.doc(fb.db, 'artifacts', 'test-app', 'public', 'data', 'signaling', 'SYNCROOM', 'peers', 'stu-1');
    await fb.setDoc(docRef, { offer: { type: 'offer', sdp: 'sdp-1' }, codename: 'Stu' });
    await tick();
    const peer = host.peers.get('stu-1');
    expect(peer).toBeTruthy();

    // No active poll: connect should push an id-less closePoll (state sync).
    const received = [];
    const hostDc = new FakeDataChannel();
    hostDc.peer = { onmessage: (m) => received.push(JSON.parse(m.data)) };
    peer.pc.ondatachannel({ channel: hostDc });
    hostDc.onopen();
    expect(received.some((m) => m.type === 'closePoll' && !m.payload.pollId)).toBe(true);

    // Active poll: (re)connect pushes the poll itself.
    host.activePoll = { id: 'poll-1', type: 'rating', prompt: 'Ready?' };
    const received2 = [];
    const hostDc2 = new FakeDataChannel();
    hostDc2.peer = { onmessage: (m) => received2.push(JSON.parse(m.data)) };
    peer.pc.ondatachannel({ channel: hostDc2 });
    hostDc2.onopen();
    expect(received2.some((m) => m.type === 'poll' && m.payload.id === 'poll-1')).toBe(true);
    host.stop();
  });

  it('accepts a re-offer for an already-known uid and keeps the fresh signaling doc', async () => {
    const fb = makeFakeFirebase();
    window.__alloFirebase = fb;
    const host = LP.createHost({ sessionCode: 'REROOM' });
    await host.start();
    const docRef = fb.doc(fb.db, 'artifacts', 'test-app', 'public', 'data', 'signaling', 'REROOM', 'peers', 'stu-re');
    await fb.setDoc(docRef, { offer: { type: 'offer', sdp: 'sdp-A' }, codename: 'Stu' });
    await tick();
    const firstPeer = host.peers.get('stu-re');
    expect(firstPeer.offerSdp).toBe('sdp-A');

    // Student reloads: full-overwrite setDoc with a fresh offer.
    await fb.setDoc(docRef, { offer: { type: 'offer', sdp: 'sdp-B' }, codename: 'Stu' });
    await tick();
    const secondPeer = host.peers.get('stu-re');
    expect(secondPeer.offerSdp).toBe('sdp-B');
    expect(secondPeer).not.toBe(firstPeer);
    expect(firstPeer.pc.connectionState).toBe('closed');
    // The stale-peer cleanup must NOT have deleted the fresh offer doc.
    expect(fb._docs.has('artifacts/test-app/public/data/signaling/REROOM/peers/stu-re')).toBe(true);
    host.stop();
  });

  it('ignores offers from uids outside the roster gate; accepts after the gate updates', async () => {
    const fb = makeFakeFirebase();
    window.__alloFirebase = fb;
    const host = LP.createHost({ sessionCode: 'GATED' });
    host.setAllowedUids(['stu-ok']);
    await host.start();
    const badRef = fb.doc(fb.db, 'artifacts', 'test-app', 'public', 'data', 'signaling', 'GATED', 'peers', 'stu-late');
    await fb.setDoc(badRef, { offer: { type: 'offer', sdp: 'sdp-x' }, codename: 'Latecomer' });
    await tick();
    expect(host.peers.has('stu-late')).toBe(false);

    // Roster catches up (student joined): gate update + fresh offer accepted.
    host.setAllowedUids(['stu-ok', 'stu-late']);
    await fb.setDoc(badRef, { offer: { type: 'offer', sdp: 'sdp-y' }, codename: 'Latecomer' });
    await tick();
    expect(host.peers.has('stu-late')).toBe(true);
    host.stop();
  });

  it('honors window.__alloRtcConfig for new peer connections (TURN override hook)', async () => {
    const fb = makeFakeFirebase();
    window.__alloFirebase = fb;
    window.__alloRtcConfig = { iceServers: [{ urls: 'turn:turn.example.org:3478', username: 'u', credential: 'c' }] };
    try {
      const host = LP.createHost({ sessionCode: 'TURNROOM' });
      await host.start();
      const ref = fb.doc(fb.db, 'artifacts', 'test-app', 'public', 'data', 'signaling', 'TURNROOM', 'peers', 'stu-t');
      await fb.setDoc(ref, { offer: { type: 'offer', sdp: 'sdp-t' }, codename: 'Stu' });
      await tick();
      const peer = host.peers.get('stu-t');
      expect(peer.pc._cfg.iceServers[0].urls).toBe('turn:turn.example.org:3478');
      host.stop();
    } finally {
      delete window.__alloRtcConfig;
    }
  });

  it('guest routes hostClosed to onHostClosed', async () => {
    const fb = makeFakeFirebase();
    window.__alloFirebase = fb;
    const onHostClosed = vi.fn();
    const guest = LP.createGuest({ sessionCode: 'GROOM', userUid: 'g1', codename: 'Fox', onHostClosed });
    await guest.join();
    guest.dc.onmessage({ data: JSON.stringify({ type: 'hostClosed', payload: { pollId: null } }) });
    expect(onHostClosed).toHaveBeenCalledWith({ pollId: null });
    guest.leave();
  });
});
