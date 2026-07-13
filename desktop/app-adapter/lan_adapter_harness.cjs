'use strict';
// End-to-end harness for the STAGED in-app LAN session adapter
// (lan_session_adapter.snippet.js). It compiles the snippet verbatim on top of
// stubbed Firestore bindings — exactly the shape it will have inside
// AlloFlowANTI.txt — and drives it against the REAL desktop runtime server
// (createServer() from alloflow-desktop-runtime.cjs) in-process. This proves
// the client and server halves of the bridge contract against each other
// before the snippet ever lands in the canonical source.
//
// Run: node desktop/app-adapter/lan_adapter_harness.cjs

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const runtime = require(path.join(__dirname, '..', 'runtime', 'alloflow-desktop-runtime.cjs'));

// ── Browser globals the snippet expects ────────────────────────────────────
const localStore = new Map();
global.window = {
  localStorage: {
    getItem: (key) => (localStore.has(key) ? localStore.get(key) : null),
    setItem: (key, value) => localStore.set(key, String(value)),
    removeItem: (key) => localStore.delete(key),
  },
};

// Minimal EventSource over node http — supports what the adapter uses:
// addEventListener('session'), onerror, close(), readyState (2 = CLOSED).
class MiniEventSource {
  constructor(url) {
    this.readyState = 0;
    this.listeners = {};
    this.onerror = null;
    const req = http.get(url, { headers: { accept: 'text/event-stream' } }, (res) => {
      if (res.statusCode !== 200) {
        this.readyState = 2;
        res.resume();
        if (this.onerror) this.onerror();
        return;
      }
      this.readyState = 1;
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          let eventName = 'message';
          let data = '';
          frame.split('\n').forEach((line) => {
            if (line.startsWith('event: ')) eventName = line.slice(7);
            else if (line.startsWith('data: ')) data += line.slice(6);
          });
          (this.listeners[eventName] || []).forEach((fn) => fn({ data }));
        }
      });
      res.on('end', () => {
        if (this.readyState !== 2) {
          this.readyState = 2;
          if (this.onerror) this.onerror();
        }
      });
    });
    req.on('error', () => {
      this.readyState = 2;
      if (this.onerror) this.onerror();
    });
    this._req = req;
  }
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }
  close() {
    this.readyState = 2;
    try { this._req.destroy(); } catch (_) {}
  }
}
global.EventSource = MiniEventSource;

// ── Compile the snippet on top of stub Firestore bindings ──────────────────
const snippet = fs.readFileSync(path.join(__dirname, 'lan_session_adapter.snippet.js'), 'utf8');
const prelude = `'use strict';
const baseCalls = [];
let doc = (...args) => ({ __fbBase: true, args });
let getDoc = async (ref) => { baseCalls.push(['getDoc', ref]); return { exists: () => false, data: () => undefined }; };
let setDoc = async (ref) => { baseCalls.push(['setDoc', ref]); };
let updateDoc = async (ref) => { baseCalls.push(['updateDoc', ref]); };
let deleteDoc = async (ref) => { baseCalls.push(['deleteDoc', ref]); };
let deleteField = () => ({ _methodName: 'FieldValue.delete' });
let onSnapshot = (ref, cb) => { baseCalls.push(['onSnapshot', ref]); return () => {}; };
`;
const epilogue = `
module.exports = {
  api: () => ({ doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, onSnapshot }),
  baseCalls,
  refreshConfigCache: () => { _alloLanCfgCache.at = 0; },
  reapply: _applyLanSessionAdapter,
};
`;
const compiledPath = path.join(os.tmpdir(), 'allo_lan_adapter_under_test.cjs');
fs.writeFileSync(compiledPath, prelude + snippet + epilogue, 'utf8');
const adapter = require(compiledPath);

// ── Assertions ──────────────────────────────────────────────────────────────
let passed = 0;
const failures = [];
function check(name, condition) {
  if (condition) { passed += 1; }
  else { failures.push(name); console.error('  FAIL: ' + name); }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function seedConfig(port, extra = {}) {
  localStore.set('alloflow_live_session_config', JSON.stringify({
    mode: 'schoolbox-lan',
    firestoreAllowed: false,
    cloudSessionAllowed: false,
    lanApiBase: 'http://127.0.0.1:' + port,
    lanPin: 'HARNESS-PIN',
    source: 'harness',
    ...extra,
  }));
  adapter.refreshConfigCache();
}

async function main() {
  const server = runtime.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const A = adapter.api();
    const sessionArgs = ['DB', 'artifacts', 'harness-app', 'public', 'data', 'sessions', 'HARN1'];

    // 0. LAN inactive → full passthrough, even for session paths.
    localStore.delete('alloflow_live_session_config');
    adapter.refreshConfigCache();
    check('inactive: session doc() falls through to base', A.doc(...sessionArgs).__fbBase === true);

    // 1. Active config.
    seedConfig(port);
    const sRef = A.doc(...sessionArgs);
    check('active: session doc() returns LAN ref', sRef.__alloLanRef === 'session' && sRef.id === 'HARN1');
    check('active: non-session doc() still falls through', A.doc('DB', 'artifacts', 'x', 'users', 'u1').__fbBase === true);
    check('active: signaling doc() still falls through',
      A.doc('DB', 'artifacts', 'x', 'public', 'data', 'signaling', 'p1').__fbBase === true);

    // 2. Missing doc reads like Firestore: exists() === false, no throw.
    const missingSnap = await A.getDoc(sRef);
    check('getDoc(missing) → exists() false', missingSnap.exists() === false && missingSnap.data() === undefined);

    // 3. Teacher creates (full-overwrite setDoc → POST).
    await A.setDoc(sRef, { mode: 'sync', isActive: true, roster: {} });
    const created = await A.getDoc(sRef);
    check('setDoc → getDoc roundtrip', created.exists() && created.data().mode === 'sync');

    // 4. Student roster join (dotted updateDoc → PATCH).
    await A.updateDoc(sRef, { 'roster.stu1.name': 'Learner', 'roster.stu1.signal': 'stuck' });
    const joined = await A.getDoc(sRef);
    check('dotted PATCH lands', joined.data().roster.stu1.name === 'Learner');

    // 5. deleteField() sentinel translation.
    await A.updateDoc(sRef, { 'roster.stu1.signal': A.deleteField() });
    const cleared = await A.getDoc(sRef);
    check('deleteField sentinel deletes over the bridge',
      cleared.data().roster.stu1.name === 'Learner' && !('signal' in cleared.data().roster.stu1));

    // 6. Session assets ride /api/lan-docs.
    const aRef = A.doc('DB', 'artifacts', 'harness-app', 'public', 'data', 'session_assets', 'asset_harness_1');
    check('asset doc() returns LAN ref', aRef.__alloLanRef === 'asset');
    await A.setDoc(aRef, { kind: 'sessionResource', resource: { id: 'r1', title: 'T' } });
    const asset = await A.getDoc(aRef);
    check('asset setDoc → getDoc roundtrip', asset.exists() && asset.data().resource.id === 'r1');
    const missingAsset = await A.getDoc(A.doc('DB', 'artifacts', 'harness-app', 'public', 'data', 'session_assets', 'asset_none'));
    check('asset getDoc(missing) → exists() false', missingAsset.exists() === false);

    // 7. Live snapshots over SSE: initial → patched → deleted (exists false).
    const snaps = [];
    const unsubscribe = A.onSnapshot(sRef, (snap) => snaps.push(snap), () => snaps.push('ERROR'));
    await sleep(250);
    check('SSE initial snapshot', snaps.length >= 1 && snaps[0] !== 'ERROR' && snaps[0].exists());
    await A.updateDoc(sRef, { 'quizState.phase': 'question' });
    await sleep(250);
    const patchedSnap = snaps[snaps.length - 1];
    check('SSE snapshot after PATCH', patchedSnap && patchedSnap !== 'ERROR' && patchedSnap.data().quizState.phase === 'question');
    await A.deleteDoc(sRef);
    await sleep(250);
    const finalSnap = snaps[snaps.length - 1];
    check('SSE snapshot after DELETE → exists() false', finalSnap && finalSnap !== 'ERROR' && finalSnap.exists() === false);
    unsubscribe();
    const confirmGone = await A.getDoc(sRef);
    check('deleteDoc really deleted', confirmGone.exists() === false);

    // 8. The PIN travels as the x-allo-lan-pin header on fetches.
    let seenPin = null;
    const echo = http.createServer((req, res) => {
      seenPin = req.headers['x-allo-lan-pin'] || null;
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
    await new Promise((resolve) => echo.listen(0, '127.0.0.1', resolve));
    seedConfig(echo.address().port);
    await A.getDoc(A.doc(...sessionArgs));
    check('PIN header sent on bridge reads', seenPin === 'HARNESS-PIN');
    await new Promise((resolve) => echo.close(resolve));

    // 9. Explicit cloud opt-in is honored even with a lanApiBase present.
    seedConfig(port, { mode: 'byo-firebase', firestoreAllowed: true });
    check('cloud opt-in falls through to base', A.doc(...sessionArgs).__fbBase === true);

    // 10. Re-applying after a shim upgrade is idempotent (no double-wrap).
    adapter.reapply();
    seedConfig(port);
    check('re-apply idempotent', A.doc === adapter.api().doc || adapter.api().doc(...sessionArgs).__alloLanRef === 'session');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    try { fs.unlinkSync(compiledPath); } catch (_) {}
  }

  console.log('\n[LAN adapter harness] ' + passed + ' passed, ' + failures.length + ' failed');
  if (failures.length) {
    failures.forEach((name) => console.error(' - ' + name));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[LAN adapter harness] crashed:', error);
  process.exitCode = 1;
});
