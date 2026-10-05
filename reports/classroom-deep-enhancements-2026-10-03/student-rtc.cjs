'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const sourceFile = path.resolve(root, process.argv[2] || 'AlloFlowANTI.txt');
const source = fs.readFileSync(sourceFile, 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('  // Real-time upgrade: the student offers');
const end = source.indexOf('  // Mailbox-hosted homework entry', start);
assert(start >= 0 && end > start, 'Actual student RTC effect anchors');
const effect = source.slice(start, end);
const tick = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function mount(options = {}) {
  const peers = [], sent = [], applied = [], timers = new Map(), warnings = [];
  let cleanup, nextTimer = 1;
  const rtc = options.rtc || { current: null };
  class Peer {
    constructor() { this.connectionState = 'new'; this.signalingState = 'have-local-offer'; this.remote = []; this.local = []; peers.push(this); }
    createDataChannel() { return this.dc = { readyState: 'connecting', sent: [], send(value) { this.sent.push(value); }, close() { this.readyState = 'closed'; this.onclose?.(); } }; }
    createOffer() { return options.offer?.promise || Promise.resolve({ type: 'offer', sdp: 'offer-' + peers.length }); }
    async setLocalDescription(value) { this.local.push(value); this.localDescription = value; }
    async setRemoteDescription(value) { this.remote.push(value); }
    close() { this.connectionState = 'closed'; }
  }
  const env = {
    useEffect(fn) { cleanup = fn(); }, mbStudent: { url: 'local-mailbox', uid: 'student-a', participant: 'test-participant', code: 'ROOM' },
    RTCPeerConnection: Peer, mbRtcRef: rtc,
    mbNicknameRef: { current: 'Learner' }, mbHandRef: { current: false },
    applyMbDownPayload(value) { applied.push(value); },
    _alloMailboxRtcConfig() { return {}; }, _alloWaitIceComplete() { return options.ice?.promise || Promise.resolve(); },
    _alloMailboxCallWithRetry(url, payload) { sent.push({ url, payload }); return Promise.resolve({ ok: true }); },
    warnLog(...args) { warnings.push(args); },
    setTimeout(fn, ms) { const id = nextTimer++; timers.set(id, { fn, ms }); return id; }, clearTimeout(id) { timers.delete(id); },
    document: { hidden: false, addEventListener() {}, removeEventListener() {} }, window: { addEventListener() {}, removeEventListener() {} },
  };
  new Function(...Object.keys(env), effect)(...Object.values(env));
  return { peers, rtc, sent, applied, timers, warnings, cleanup: () => cleanup?.(), async retry() {
    const entry = [...timers.entries()][0]; assert(entry, 'A retry is scheduled'); timers.delete(entry[0]); await entry[1].fn(); await tick();
  } };
}
const cases = [];
const check = (name, run) => cases.push({ name, run });
check('matching echoed offer token is accepted by its current peer', async () => {
  const h = mount(); await tick(); const holder = h.rtc.current;
  assert.equal(typeof holder.offerId, 'string'); assert(holder.offerId.length > 0);
  assert.equal(h.sent[0].payload.v.offerId, holder.offerId);
  holder.onSignal({ to: 'student-a', offerId: holder.offerId, sdp: { type: 'answer', sdp: 'matching' } }); await tick();
  assert.equal(holder.pc.remote.length, 1); h.cleanup();
});
check('answer to earlier offer cannot be applied to a new current peer', async () => {
  const h = mount(); await tick(); const old = h.rtc.current; old.dc.onclose(); await h.retry();
  const current = h.rtc.current;
  current.onSignal({ to: 'student-a', offerId: old.offerId || 'obsolete-id', sdp: { type: 'answer', sdp: 'old-answer' } }); await tick();
  assert.equal(current.pc.remote.length, 0); h.cleanup();
});
check('active peer sends offer, presence, resource payload and accepts answer', async () => {
  const h = mount(); await tick(); const p = h.peers[0];
  assert.equal(h.sent.length, 1); assert.equal(h.sent[0].payload.v.sdp.type, 'offer');
  p.dc.readyState = 'open'; p.dc.onopen(); p.dc.onmessage({ data: JSON.stringify({ kind: 'res', rid: 'current' }) });
  h.rtc.current.onSignal({ to: 'student-a', sdp: { type: 'answer', sdp: 'current-answer' } }); await tick();
  assert.equal(p.dc.sent.length, 1); assert.equal(h.applied[0].rid, 'current'); assert.equal(p.remote.length, 1); h.cleanup();
});
check('late data channel message after session cleanup cannot reach receiver', async () => {
  const h = mount(); await tick(); const cb = h.peers[0].dc.onmessage; h.cleanup();
  cb({ data: JSON.stringify({ kind: 'res', rid: 'retired-session' }) }); assert.deepEqual(h.applied, []);
});
check('replaced connection cannot deliver messages into new receiver', async () => {
  const h = mount(); await tick(); const old = h.peers[0]; old.dc.onclose(); await h.retry();
  old.dc.onmessage({ data: JSON.stringify({ kind: 'res', rid: 'retired-connection' }) });
  h.peers[1].dc.onmessage({ data: JSON.stringify({ kind: 'res', rid: 'fresh-connection' }) });
  assert.deepEqual(h.applied.map(v => v.rid), ['fresh-connection']); h.cleanup();
});
check('obsolete channel opening cannot send presence or reset retry state', async () => {
  const h = mount(); await tick(); const old = h.peers[0]; old.dc.onclose(); await h.retry();
  const before = old.dc.sent.length; old.dc.onopen(); assert.equal(old.dc.sent.length, before); h.cleanup();
});
check('obsolete close cannot schedule replacement of a healthy peer', async () => {
  const h = mount(); await tick(); const old = h.peers[0]; old.dc.onclose(); await h.retry();
  h.timers.clear(); old.dc.onclose(); assert.equal(h.timers.size, 0); h.cleanup();
});
check('obsolete failed connection cannot schedule a retry', async () => {
  const h = mount(); await tick(); const old = h.peers[0]; old.dc.onclose(); await h.retry();
  h.timers.clear(); old.connectionState = 'failed'; old.onconnectionstatechange(); assert.equal(h.timers.size, 0); h.cleanup();
});
check('obsolete answer callback cannot change remote description', async () => {
  const h = mount(); await tick(); const oldHolder = h.rtc.current; oldHolder.dc.onclose(); await h.retry();
  oldHolder.onSignal({ to: 'student-a', sdp: { type: 'answer', sdp: 'stale-answer' } }); await tick();
  assert.equal(oldHolder.pc.remote.length, 0); h.cleanup();
});
check('ICE completion for replaced peer cannot publish a stale offer', async () => {
  const ice = deferred(); const h = mount({ ice }); await tick(); const old = h.peers[0];
  old.dc.onclose(); const entry = [...h.timers.entries()][0]; h.timers.delete(entry[0]); entry[1].fn(); await tick();
  ice.resolve(); await tick(); assert.equal(h.sent.length, 1); assert.equal(h.sent[0].payload.v.sdp.sdp, 'offer-2'); h.cleanup();
});
check('offer completion after cleanup cannot call setLocalDescription', async () => {
  const offer = deferred(); const h = mount({ offer }); h.cleanup(); offer.resolve({ type: 'offer', sdp: 'late' }); await tick();
  assert.deepEqual(h.peers[0].local, []); assert.deepEqual(h.sent, []);
});
check('retired negotiation rejection cannot schedule or surface a current error', async () => {
  const offer = deferred(); const h = mount({ offer }); await tick(); const old = h.peers[0]; old.dc.onclose();
  const entry = [...h.timers.entries()][0]; h.timers.delete(entry[0]); entry[1].fn(); await tick();
  offer.reject(new Error('old connection failed')); await tick();
  // Both attempts share this controlled rejection; the current one owns one warning/retry.
  assert.equal(h.warnings.length, 1); assert.equal(h.timers.size, 1); h.cleanup();
});
check('old effect cleanup preserves a peer owned by newer effect', async () => {
  const rtc = { current: null }; const old = mount({ rtc }); await tick(); const fresh = mount({ rtc }); await tick();
  const current = rtc.current; old.cleanup(); assert.equal(rtc.current, current); assert.notEqual(current.pc.connectionState, 'closed'); fresh.cleanup();
});
check('current failed connection still schedules and completes reconnect', async () => {
  const h = mount(); await tick(); h.peers[0].connectionState = 'failed'; h.peers[0].onconnectionstatechange();
  assert.equal(h.timers.size, 1); await h.retry(); assert.equal(h.peers.length, 2); assert.equal(h.sent.length, 2); h.cleanup();
});
(async () => {
  const results = [];
  for (const entry of cases) { try { await entry.run(); results.push({ name: entry.name, passed: true }); } catch (err) { results.push({ name: entry.name, passed: false, error: err.stack }); } }
  const report = { sourceFile, sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex'), actualEffect: true, completedAt: new Date().toISOString(), passed: results.every(r => r.passed), cases: results };
  const output = process.argv[3]; if (output) fs.writeFileSync(path.resolve(root, output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checks: results.length, failed: results.filter(r => !r.passed).map(r => r.name) })); if (!report.passed) process.exitCode = 1;
})();
