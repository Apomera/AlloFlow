'use strict';
// Executes the production teacher mailbox effect verbatim. RTC/network/image
// boundaries and the browser scheduler are controlled; no Vitest worker needed.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const sourcePath = path.resolve(root, process.argv[2] || 'AlloFlowANTI.txt');
const label = process.argv[3] || 'current';
const raw = fs.readFileSync(sourcePath);
const source = raw.toString('utf8').replace(/\r\n/g, '\n');
const start = '  useEffect(() => {\n      if (!mbLive || !mbConfig?.url) return undefined;';
const end = '  useEffect(() => {\n      let cancelled = false;\n      if (!mbLive?.joinUrl)';
assert.equal(source.split(start).length, 2, 'unique teacher effect start');
const a = source.indexOf(start), b = source.indexOf(end, a);
assert(b > a, 'teacher effect end');
const effect = source.slice(a, b);
const runEffect = new Function('deps', 'with (deps) {\n' + effect + '\n}');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 70; i += 1) await Promise.resolve(); };
const offer = (uid = 'student-1') => ({ kind: 'rtc', uid, sdp: { type: 'offer', sdp: 'controlled offer' } });
const student = (name = 'Current learner') => ({ kind: 'student', uid: 'student-1', name, hand: true });
const evidence = () => ({ kind: 'hw-evidence', uid: 'student-1', directionsId: 'directions-1', doneCount: 2, total: 3, objectives: [{ label: 'Observe', done: true, confirmed: true }] });
const response = (values = [], n = 1) => ({ t: 123, b: { up: { n, m: values.map(v => [n, { t: 124, v }]) } } });

function harness(options = {}) {
  const events = [], pcs = [], timers = new Map(), listeners = new Map();
  const replies = [...(options.replies || [response([offer(), student(), evidence()])])];
  const gates = options.gates || {};
  const state = { roster: {}, evidence: {}, now: null, live: null, status: null };
  let cleanup, timerId = 0, activeRecv = 0, maxActiveRecv = 0, recvCount = 0, nudgeSender = null;
  const stage = async (name, value) => {
    events.push({ stage: name, value });
    if (gates[name]) await gates[name].promise;
    return value;
  };
  class Peer {
    constructor() { pcs.push(this); this.localDescription = { type: 'answer', sdp: 'controlled answer' }; this.closed = false; }
    async setRemoteDescription(sdp) { await stage('remote', sdp); }
    async createAnswer() { return stage('answer', this.localDescription); }
    async setLocalDescription(sdp) { await stage('local', sdp); this.localDescription = sdp; }
    close() { this.closed = true; events.push({ stage: 'pc-close' }); }
  }
  const peersRef = { current: {} };
  const apply = key => value => { state[key] = typeof value === 'function' ? value(state[key]) : value; events.push({ stage: 'state-' + key }); };
  const deps = {
    useEffect(callback) { cleanup = callback(); },
    mbLive: { code: 'CLASS-1' }, mbConfig: { url: 'https://mailbox.invalid', admin: 'controlled' },
    mbPeersRef: peersRef, mbPackItemsRef: { current: [] }, mbUpCursorRef: { current: 0 },
    setMbRoster: apply('roster'), setMbHwEvidence: apply('evidence'), setMbNow: apply('now'), setMbLive: apply('live'), setMbStatus: apply('status'),
    RTCPeerConnection: Peer, _alloMailboxRtcConfig: () => ({}),
    async _alloWaitIceComplete(pc) { await stage('ice', pc); },
    async _alloMailboxCall(url, payload) {
      assert.equal(payload.a, 'recv'); recvCount += 1; activeRecv += 1; maxActiveRecv = Math.max(maxActiveRecv, activeRecv);
      events.push({ stage: 'recv', since: payload.since });
      try { const reply = replies.shift() || response([], recvCount); return await (reply && reply.promise ? reply.promise : reply); }
      finally { activeRecv -= 1; }
    },
    async _alloMailboxCallWithRetry(url, payload) { events.push({ stage: 'send-answer', payload }); return {}; },
    _alloMbRecvDocPs: () => [], _alloMbRecvDocsDelivered: docs => events.push({ stage: 'docs', docs }),
    _alloMbNudge: () => events.push({ stage: 'nudge' }), _alloMbSetNudgeSender: fn => { nudgeSender = fn; },
    async prepareMailboxResourceImages(item) { return stage('prepare', item); },
    async _alloEncodeAlloPack(text) { return stage('encode', text); },
    _alloSplitPackChunks: text => ['part-1', 'part-2'],
    async _alloDcSendDrained(dc, text) { await stage('drain', JSON.parse(text)); dc.send(text); },
    _alloNextPollDelay: () => 999,
    warnLog: (...args) => events.push({ stage: 'warning', args }),
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    document: { hidden: false, addEventListener(name, fn) { listeners.set('document:' + name, fn); }, removeEventListener(name) { listeners.delete('document:' + name); } },
    window: { addEventListener(name, fn) { listeners.set('window:' + name, fn); }, removeEventListener(name) { listeners.delete('window:' + name); } },
    localStorage: { removeItem() {} }, ALLO_MB_LIVE_KEY: 'controlled-key', Date, Math, JSON, String, Number, Array, Object,
    _mbCloseTeacherPeers() { for (const peer of Object.values(peersRef.current)) { peer.dc?.close(); peer.pc?.close(); } peersRef.current = {}; },
  };
  runEffect(deps);
  const result = {
    deps, events, pcs, state, peersRef, replies, gates, timers,
    cleanup() { if (cleanup) cleanup(); },
    get recvCount() { return recvCount; }, get activeRecv() { return activeRecv; }, get maxActiveRecv() { return maxActiveRecv; },
    channel(pc = pcs.at(-1)) {
      const dc = { readyState: 'open', sent: [], closed: false, send(text) { this.sent.push(JSON.parse(text)); }, close() { this.closed = true; this.readyState = 'closed'; } };
      pc.ondatachannel({ channel: dc }); return dc;
    },
    wake() { const listener = listeners.get('window:online'); if (listener) listener(); },
    runTimer() { const entry = [...timers.entries()].at(-1); assert(entry, 'scheduled poll'); timers.delete(entry[0]); entry[1].fn(); },
    addReply(reply) { replies.push(reply); },
    stageCount(name) { return events.filter(entry => entry.stage === name).length; },
    nudgeSender() { return nudgeSender; },
  };
  return result;
}
const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const connected = async options => { const h = harness(options); await flush(); const dc = h.channel(); return { h, dc }; };
const replaced = async () => {
  const { h, dc: old } = await connected(); old.onopen(); await flush();
  h.addReply(response([offer()], 2)); h.wake(); h.runTimer(); await flush();
  const current = h.channel(); current.onopen(); await flush();
  assert.equal(h.pcs.length, 2); assert.equal(h.state.roster['student-1'].rtc, true);
  return { h, old, current, oldPc: h.pcs[0] };
};

check('current handshake, presence and device evidence are applied', async () => {
  const h = harness(); await flush();
  assert.deepEqual(['remote', 'answer', 'local', 'ice', 'send-answer'].map(name => h.stageCount(name)), [1, 1, 1, 1, 1]);
  assert.equal(h.state.roster['student-1'].name, 'Current learner');
  assert.equal(h.state.evidence['student-1|directions-1'].doneCount, 2);
  assert.equal(h.deps.mbUpCursorRef.current, 1); h.cleanup();
});
check('answer echoes current offer attempt identity', async () => {
  const offerId = 'attempt-current-1', h = harness({ replies: [response([{ ...offer(), offerId }])] }); await flush();
  const sent = h.events.find(entry => entry.stage === 'send-answer');
  assert(sent, 'answer sent'); assert.equal(sent.payload.v.offerId, offerId); assert.equal(sent.payload.v.to, 'student-1'); h.cleanup();
});
check('tokenless legacy offer still negotiates without invented attempt identity', async () => {
  const h = harness({ replies: [response([offer()])] }); await flush();
  const sent = h.events.find(entry => entry.stage === 'send-answer');
  assert(sent, 'legacy answer sent'); assert.equal(sent.payload.v.offerId, undefined); assert.equal(sent.payload.v.to, 'student-1'); h.cleanup();
});
check('current channel message, nudge, open and close work', async () => {
  const { h, dc } = await connected();
  dc.onmessage({ data: JSON.stringify(student('Channel learner')) });
  dc.onmessage({ data: JSON.stringify({ kind: 'sdocv' }) });
  dc.onopen(); await flush(); assert.equal(h.state.roster['student-1'].rtc, true);
  dc.onclose(); assert.equal(h.state.roster['student-1'].rtc, false);
  assert.equal(h.state.roster['student-1'].name, 'Channel learner'); assert.equal(h.stageCount('nudge'), 1); h.cleanup();
});
check('current welcome prepares, encodes and sends all resource chunks', async () => {
  const { h, dc } = await connected(); h.deps.mbPackItemsRef.current = [{ id: 'resource-1' }, { id: 'resource-2' }];
  dc.onopen(); await flush(); assert.equal(h.stageCount('prepare'), 2); assert.equal(h.stageCount('encode'), 2); assert.equal(h.stageCount('drain'), 4); assert.equal(dc.sent.length, 4); h.cleanup();
});
for (const kind of ['presence', 'evidence', 'nudge']) check('replaced channel ignores stale ' + kind + ' message', async () => {
  const { h, old } = await replaced(); const before = JSON.stringify(h.state); const nudgeBefore = h.stageCount('nudge');
  old.onmessage({ data: JSON.stringify(kind === 'presence' ? student('Stale learner') : kind === 'evidence' ? { ...evidence(), doneCount: 999 } : { kind: 'sdocv' }) });
  assert.equal(JSON.stringify(h.state), before); assert.equal(h.stageCount('nudge'), nudgeBefore); h.cleanup();
});
check('replaced channel close cannot clear replacement RTC status', async () => {
  const { h, old } = await replaced(); old.onclose(); assert.equal(h.state.roster['student-1'].rtc, true); h.cleanup();
});
check('replaced channel open cannot start a welcome', async () => {
  const { h, old } = await replaced(); h.deps.mbPackItemsRef.current = [{ id: 'resource-1' }]; const count = h.stageCount('prepare');
  old.onopen(); await flush(); assert.equal(h.stageCount('prepare'), count); h.cleanup();
});
check('replaced peer ignores late datachannel registration', async () => {
  const { h, oldPc } = await replaced(); const dc = h.channel(oldPc);
  assert.equal(dc.onmessage, undefined); assert.equal(dc.onopen, undefined); assert.equal(dc.onclose, undefined); h.cleanup();
});
for (const kind of ['presence', 'evidence', 'nudge']) check('disposed effect ignores stale ' + kind + ' message', async () => {
  const { h, dc } = await connected(); h.cleanup(); const before = JSON.stringify(h.state); const nudgeBefore = h.stageCount('nudge');
  dc.onmessage({ data: JSON.stringify(kind === 'presence' ? student('Disposed learner') : kind === 'evidence' ? { ...evidence(), doneCount: 999 } : { kind: 'sdocv' }) });
  assert.equal(JSON.stringify(h.state), before); assert.equal(h.stageCount('nudge'), nudgeBefore);
});
check('disposed effect ignores late open and welcome', async () => {
  const { h, dc } = await connected(); h.deps.mbPackItemsRef.current = [{ id: 'resource-1' }]; h.cleanup(); const before = JSON.stringify(h.state);
  dc.onopen(); await flush(); assert.equal(JSON.stringify(h.state), before); assert.equal(h.stageCount('prepare'), 0);
});
check('disposed effect ignores late datachannel registration', async () => {
  const h = harness(); await flush(); h.cleanup(); const dc = h.channel();
  assert.equal(dc.onmessage, undefined); assert.equal(dc.onopen, undefined); assert.equal(dc.onclose, undefined);
});
for (const boundary of ['remote', 'answer', 'local', 'ice']) check('disposed negotiation stops after awaited ' + boundary + ' boundary and skips remaining batch', async () => {
  const gate = deferred(), h = harness({ gates: { [boundary]: gate } }); await flush();
  assert.equal(h.stageCount(boundary), 1); h.cleanup(); const stagesAtCleanup = h.events.filter(entry => ['remote', 'answer', 'local', 'ice', 'send-answer'].includes(entry.stage)).map(entry => entry.stage);
  gate.resolve(); await flush();
  assert.deepEqual(h.events.filter(entry => ['remote', 'answer', 'local', 'ice', 'send-answer'].includes(entry.stage)).map(entry => entry.stage), stagesAtCleanup);
  assert.deepEqual(h.state.roster, {}); assert.deepEqual(h.state.evidence, {}); assert.equal(h.timers.size, 0);
});
for (const boundary of ['prepare', 'encode', 'drain']) check('disposed welcome stops after awaited ' + boundary + ' boundary', async () => {
  const gate = deferred(), { h, dc } = await connected({ gates: { [boundary]: gate } });
  h.deps.mbPackItemsRef.current = [{ id: 'resource-1' }, { id: 'resource-2' }]; dc.onopen(); await flush(); assert.equal(h.stageCount(boundary), 1);
  h.cleanup(); const stageBefore = h.events.filter(entry => ['prepare', 'encode', 'drain'].includes(entry.stage)).map(entry => entry.stage); gate.resolve(); await flush();
  assert.deepEqual(h.events.filter(entry => ['prepare', 'encode', 'drain'].includes(entry.stage)).map(entry => entry.stage), stageBefore);
});
check('wakes coalesce during active receive and request one follow-up', async () => {
  const first = deferred(), h = harness({ replies: [first, response([], 2)] }); await flush(); assert.equal(h.activeRecv, 1);
  h.wake(); if (h.timers.size) h.runTimer(); await flush(); h.wake(); if (h.timers.size) h.runTimer(); await flush(); assert.equal(h.recvCount, 1); assert.equal(h.maxActiveRecv, 1);
  first.resolve(response([], 1)); await flush(); assert.equal(h.timers.size, 1); assert.equal([...h.timers.values()][0].delay, 50); h.runTimer(); await flush(); assert.equal(h.recvCount, 2); assert.equal(h.maxActiveRecv, 1); h.cleanup();
});
check('disposed active receive applies nothing and schedules no follow-up', async () => {
  const first = deferred(), h = harness({ replies: [first] }); await flush(); h.cleanup(); first.resolve(response([student(), evidence()])); await flush();
  assert.deepEqual(h.state.roster, {}); assert.deepEqual(h.state.evidence, {}); assert.equal(h.state.now, null); assert.equal(h.timers.size, 0);
});

(async () => {
  const results = [];
  for (const { name, fn } of checks) {
    try { await fn(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.stack || String(error) }); }
  }
  const report = { source: sourcePath, sourceSha256: crypto.createHash('sha256').update(raw).digest('hex'), effectSha256: crypto.createHash('sha256').update(effect).digest('hex'), completedAt: new Date().toISOString(), actualProductionEffect: true, controlledBoundaries: ['RTCPeerConnection', 'mailbox replies', 'resource image preparation/encoding', 'data-channel draining', 'browser event listeners and timers'], total: results.length, passed: results.filter(item => item.passed).length, failed: results.filter(item => !item.passed).length, results };
  fs.writeFileSync(path.join(__dirname, label + '.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ report: path.join(__dirname, label + '.json'), total: report.total, passed: report.passed, failed: report.failed }));
  if (report.failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
