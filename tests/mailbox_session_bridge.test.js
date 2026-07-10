// Phase C — mailbox session-document bridge (single-pathway unification).
// Server tests evaluate the REAL apps_script/session_mailbox/Code.gs (v6 doc
// store: dget/dset/dpatch/ddel + collection indexes) with mocked Google
// services. Bridge tests evaluate the REAL adapter block sliced from
// AlloFlowANTI.txt and wire its mailbox calls straight into that server
// sandbox — an end-to-end client↔server exercise of the rerouted
// doc/setDoc/updateDoc/onSnapshot/collection surface that lets the standard
// session UI (roster, polls, quiz, pictionary signaling) run over the mailbox.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const gsSource = fs.readFileSync(path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs'), 'utf8');

function sliceBetween(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    if (start === -1) throw new Error('start marker not found: ' + startMarker);
    const end = source.indexOf(endMarker, start);
    if (end === -1) throw new Error('end marker not found: ' + endMarker);
    return source.slice(start, end);
}

function makeGsSandbox() {
    const cacheStore = new Map();
    const props = new Map();
    const driveFiles = new Map();
    let uuidCounter = 0;
    const cache = {
        get: k => (cacheStore.has(k) ? cacheStore.get(k) : null),
        put: (k, v) => { cacheStore.set(k, String(v)); },
        getAll: keys => { const o = {}; keys.forEach(k => { if (cacheStore.has(k)) o[k] = cacheStore.get(k); }); return o; },
        remove: k => { cacheStore.delete(k); },
    };
    const fileObj = name => ({
        setContent: c => { driveFiles.set(name, String(c)); },
        getBlob: () => ({ getDataAsString: () => driveFiles.get(name) }),
        setTrashed: () => { driveFiles.delete(name); },
    });
    const folder = {
        getFilesByName: name => {
            let used = false;
            return { hasNext: () => driveFiles.has(name) && !used, next: () => { used = true; return fileObj(name); } };
        },
        createFile: (name, content) => { driveFiles.set(name, String(content)); return fileObj(name); },
    };
    const services = {
        CacheService: { getScriptCache: () => cache },
        PropertiesService: { getScriptProperties: () => ({
            getProperty: k => (props.has(k) ? props.get(k) : null),
            setProperty: (k, v) => props.set(k, String(v)),
            deleteProperty: k => { props.delete(k); },
            getProperties: () => Object.fromEntries(props),
        }) },
        LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
        ContentService: (() => {
            const svc = { MimeType: { JSON: 'json' } };
            svc.createTextOutput = s => { const o = { _c: s, setMimeType: () => o, getContent: () => o._c }; return o; };
            return svc;
        })(),
        DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => folder }), createFolder: () => folder },
        Utilities: { getUuid: () => `aaaaaaaa-bbbb-cccc-dddd-${String(uuidCounter++).padStart(12, '0')}` },
    };
    const factory = new Function(...Object.keys(services), gsSource + '; return { handle: handle };');
    const gs = factory(...Object.values(services));
    return { call: p => JSON.parse(gs.handle(p).getContent()), cacheStore, props };
}

function openedSandbox(code = 'AB2CD', secret = 'k_secret_k_secret_20') {
    const sandbox = makeGsSandbox();
    const admin = sandbox.call({ a: 'claim' }).admin;
    expect(sandbox.call({ a: 'open', admin, c: code, k: secret }).ok).toBe(true);
    return { ...sandbox, admin, code, secret };
}

describe('Code.gs v6 session document store (real source)', () => {
    it('reports v6 and keeps the doc store behind the session secret', () => {
        const sb = makeGsSandbox();
        expect(sb.call({ a: 'hello' }).v).toBeGreaterThanOrEqual(6);
        expect(sb.call({ a: 'dget', c: 'AB2CD', k: 'k_secret_k_secret_20', ps: [{ p: 's' }] }).e).toBe('no-session');
        const opened = openedSandbox();
        expect(opened.call({ a: 'dget', c: opened.code, k: 'x_wrong_x_wrong_x_20', ps: [{ p: 's' }] }).e).toBe('denied');
        expect(opened.call({ a: 'dset', c: opened.code, k: opened.secret, p: 'bad path!', d: {} }).e).toBe('bad-path');
    });

    it('dset/dget round-trips with version-delta short-circuiting', () => {
        const sb = openedSandbox();
        const set = sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync', roster: {} } });
        expect(set.ok).toBe(true);
        expect(set.w).toBe(1);
        const fresh = sb.call({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 's' }] });
        expect(fresh.docs[0].w).toBe(1);
        expect(fresh.docs[0].d.mode).toBe('sync');
        // Caller already has w=1: body omitted (the poll stays cheap).
        const cached = sb.call({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 's', w: 1 }] });
        expect(cached.docs[0].w).toBe(1);
        expect(cached.docs[0].d).toBeUndefined();
        // Unknown docs report missing (never an error).
        const missing = sb.call({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 'g:signaling:u1' }] });
        expect(missing.docs[0].missing).toBe(true);
    });

    it('dpatch applies dot paths, nested creation and deleteField like Firestore updateDoc', () => {
        const sb = openedSandbox();
        expect(sb.call({ a: 'dpatch', c: sb.code, k: sb.secret, p: 's', u: { x: 1 } }).e).toBe('no-doc');
        sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { roster: {}, quizState: { isActive: false } } });
        const patched = sb.call({ a: 'dpatch', c: sb.code, k: sb.secret, p: 's', u: {
            'roster.mb-1.name': 'Brave Fox',
            'roster.mb-1.xp': 40,
            'quizState.isActive': true,
        } });
        expect(patched.ok).toBe(true);
        expect(patched.d.roster['mb-1'].name).toBe('Brave Fox');
        expect(patched.d.quizState.isActive).toBe(true);
        expect(patched.w).toBe(2);
        const removed = sb.call({ a: 'dpatch', c: sb.code, k: sb.secret, p: 's', u: {
            'roster.mb-1.xp': { __op: 'deleteField' },
        } });
        expect(removed.d.roster['mb-1'].xp).toBeUndefined();
        expect(removed.d.roster['mb-1'].name).toBe('Brave Fox');
    });

    it('dset merge, collection indexes and ddel maintain the membership doc', () => {
        const sb = openedSandbox();
        sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 'g:quiz-signaling:u1', d: { offer: { sdp: 'o1' } }, col: 'c:quiz-signaling', id: 'u1' });
        sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 'g:quiz-signaling:u2', d: { offer: { sdp: 'o2' } }, col: 'c:quiz-signaling', id: 'u2' });
        let index = sb.call({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 'c:quiz-signaling' }] }).docs[0];
        expect(Object.keys(index.d).sort()).toEqual(['u1', 'u2']);
        // Host answers with a merge-set: guest fields survive.
        sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 'g:quiz-signaling:u1', d: { answer: { sdp: 'a1' } }, merge: 1, col: 'c:quiz-signaling', id: 'u1' });
        const child = sb.call({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 'g:quiz-signaling:u1' }] }).docs[0];
        expect(child.d.offer.sdp).toBe('o1');
        expect(child.d.answer.sdp).toBe('a1');
        sb.call({ a: 'ddel', c: sb.code, k: sb.secret, p: 'g:quiz-signaling:u1', col: 'c:quiz-signaling', id: 'u1' });
        index = sb.call({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 'c:quiz-signaling' }] }).docs[0];
        expect(Object.keys(index.d)).toEqual(['u2']);
    });

    it('rejects oversized docs, clears docs on end, and re-open does not resurrect a previous class', () => {
        const sb = openedSandbox();
        expect(sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { blob: 'x'.repeat(90 * 1024) } }).e).toBe('too-big');
        sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync' } });
        expect(sb.call({ a: 'end', c: sb.code, k: sb.secret }).ok).toBe(true);
        expect(sb.call({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 's' }] }).e).toBe('no-session');
        // Same code re-opened later (random collision): the old doc is gone.
        expect(sb.call({ a: 'open', admin: sb.admin, c: sb.code, k: sb.secret }).ok).toBe(true);
        expect(sb.call({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 's' }] }).docs[0].missing).toBe(true);
    });
});

// ── Bridge (real ANTI adapter) ↔ real Code.gs, end to end ──────────────────

const bridgeBlock = sliceBetween(
    anti,
    '// ── Class Mailbox session-document bridge (Phase C: single-pathway unification) ──',
    '_applyMbSessionAdapter(); // Boot wrap'
);

function makeBridge(serverOverride) {
    const sb = serverOverride || openedSandbox();
    const calls = [];
    const mailboxCall = async (url, payload) => {
        calls.push(payload);
        const res = sb.call(payload);
        if (!res || res.ok !== true) {
            const err = new Error('Mailbox error: ' + ((res && res.e) || 'unknown'));
            err.code = 'allo/mailbox-' + ((res && res.e) || 'unknown');
            throw err;
        }
        return res;
    };
    const base = {
        doc: (...args) => ({ __fsRef: args.slice(1) }),
        getDoc: async () => { throw new Error('base getDoc must not run in bridge tests'); },
        setDoc: async () => { throw new Error('base setDoc must not run'); },
        updateDoc: async () => { throw new Error('base updateDoc must not run'); },
        deleteDoc: async () => { throw new Error('base deleteDoc must not run'); },
        onSnapshot: () => { throw new Error('base onSnapshot must not run'); },
        collection: (...args) => ({ __fsCol: args.slice(1) }),
        mailboxCall,
        isDeleteSentinel: v => !!(v && typeof v === 'object' && (v.__testDelete === true || v.__op === 'deleteField')),
    };
    const factory = new Function('base', `
        let doc = base.doc, getDoc = base.getDoc, setDoc = base.setDoc, updateDoc = base.updateDoc,
            deleteDoc = base.deleteDoc, onSnapshot = base.onSnapshot, collection = base.collection;
        const _alloMailboxCall = base.mailboxCall;
        const _alloMailboxCallWithRetry = base.mailboxCall;
        const _alloLanIsDeleteSentinel = base.isDeleteSentinel;
        ${bridgeBlock}
        _applyMbSessionAdapter();
        return {
            doc: (...a) => doc(...a),
            collection: (...a) => collection(...a),
            getDoc: (ref) => getDoc(ref),
            setDoc: (ref, d, o) => setDoc(ref, d, o),
            updateDoc: (ref, u) => updateDoc(ref, u),
            deleteDoc: (ref) => deleteDoc(ref),
            onSnapshot: (t, cb, ecb) => onSnapshot(t, cb, ecb),
            install: _alloMbInstallBridge,
            teardown: _alloMbTeardownBridge,
            active: _alloMbBridgeActive,
            bridgeUser: _alloMbBridgeUser,
            state: () => _alloMbBridgeState,
            pump: () => _alloMbPumpTick(_alloMbBridgeState),
        };
    `);
    const api = factory(base);
    return { api, sb, calls };
}

const DB = {};
const sessionArgs = code => [DB, 'artifacts', 'test-app', 'public', 'data', 'sessions', code];
const peerArgs = (code, uid, sig = 'quiz-signaling') => [DB, 'artifacts', 'test-app', 'public', 'data', sig, code, 'peers', uid];
const peersColArgs = (code, sig = 'quiz-signaling') => [DB, 'artifacts', 'test-app', 'public', 'data', sig, code, 'peers'];

describe('mailbox session bridge (real ANTI block against real Code.gs)', () => {
    it('routes nothing while no bridge is installed', () => {
        const { api } = makeBridge();
        const ref = api.doc(...sessionArgs('AB2CD'));
        expect(ref.__alloMbRef).toBeUndefined();
        expect(ref.__fsRef).toBeDefined();
    });

    it('teacher adopt-on-create: the standard setDoc claims the code and strips resources', async () => {
        const { api, sb, calls } = makeBridge();
        api.install({ url: 'https://mb/exec', admin: sb.admin, secret: sb.secret, isTeacher: true });
        try {
            const ref = api.doc(...sessionArgs('ZZ9XY'));
            expect(ref.__alloMbRef).toBe('session');
            await api.setDoc(ref, { resources: [{ id: 'r1', data: 'huge' }], mode: 'sync', roster: {}, quizState: { isActive: false } });
            expect(api.state().code).toBe('ZZ9XY');
            expect(calls.some(c => c.a === 'open' && c.c === 'ZZ9XY')).toBe(true);
            const stored = sb.call({ a: 'dget', c: 'ZZ9XY', k: sb.secret, ps: [{ p: 's' }] }).docs[0];
            expect(stored.d.mode).toBe('sync');
            expect(stored.d.resources).toBeUndefined(); // pack channel carries content
        } finally { api.teardown(); }
    });

    it('student flow: getDoc, dot-path roster updateDoc, deleteField translation, local echo to watchers', async () => {
        const { api, sb } = makeBridge();
        sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync', roster: {}, isActive: true } });
        api.install({ url: 'https://mb/exec', code: sb.code, secret: sb.secret, isTeacher: false, uid: 'mb-stu1' });
        try {
            expect(api.bridgeUser().uid).toBe('mb-stu1');
            const ref = api.doc(...sessionArgs(sb.code));
            const snap = await api.getDoc(ref);
            expect(snap.exists()).toBe(true);
            expect(snap.data().mode).toBe('sync');
            const seen = [];
            api.onSnapshot(ref, s => seen.push(s.data()));
            await api.updateDoc(ref, {
                'roster.mb-stu1.name': 'Brave Fox',
                'roster.mb-stu1.signal': { __testDelete: true },
                resources: [{ id: 'nope' }], // stripped for session refs
            });
            // Local echo: our own write lands on watchers without waiting for a poll.
            expect(seen.length).toBeGreaterThan(0);
            expect(seen[seen.length - 1].roster['mb-stu1'].name).toBe('Brave Fox');
            const stored = sb.call({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 's' }] }).docs[0];
            expect(stored.d.roster['mb-stu1'].name).toBe('Brave Fox');
            expect(stored.d.resources).toBeUndefined();
        } finally { api.teardown(); }
    });

    it('doc watchers receive remote changes via the pump', async () => {
        const { api, sb } = makeBridge();
        sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync', roster: {} } });
        api.install({ url: 'https://mb/exec', code: sb.code, secret: sb.secret, admin: sb.admin, isTeacher: true });
        try {
            const ref = api.doc(...sessionArgs(sb.code));
            const seen = [];
            api.onSnapshot(ref, s => seen.push(s.data()));
            await api.pump();
            expect(seen.length).toBe(1); // initial state pulled
            // A student patches server-side (as their own bridge would).
            sb.call({ a: 'dpatch', c: sb.code, k: sb.secret, p: 's', u: { 'roster.mb-9.name': 'Calm Owl' } });
            await api.pump();
            expect(seen[seen.length - 1].roster['mb-9'].name).toBe('Calm Owl');
            // Nothing new: the pump must not re-fire watchers.
            const count = seen.length;
            await api.pump();
            expect(seen.length).toBe(count);
        } finally { api.teardown(); }
    });

    it('signaling handshake: collection docChanges, merge answers, delete removal', async () => {
        const { api, sb } = makeBridge();
        sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync' } });
        api.install({ url: 'https://mb/exec', code: sb.code, secret: sb.secret, admin: sb.admin, isTeacher: true });
        try {
            const colRef = api.collection(...peersColArgs(sb.code));
            expect(colRef.__alloMbCol).toBe('quiz-signaling');
            const events = [];
            api.onSnapshot(colRef, snap => {
                snap.docChanges().forEach(ch => events.push({ type: ch.type, id: ch.doc.id, data: ch.doc.data(), ref: ch.doc.ref }));
            });
            // Guest writes an offer (their bridge does exactly this dset).
            const guestRef = api.doc(...peerArgs(sb.code, 'mb-g1'));
            expect(guestRef.__alloMbRef).toBe('peer');
            await api.setDoc(guestRef, { offer: { type: 'offer', sdp: 'sdp-1' }, codename: 'Brave Fox' });
            await api.pump();
            const added = events.find(e => e.type === 'added' && e.id === 'mb-g1');
            expect(added).toBeTruthy();
            expect(added.data.offer.sdp).toBe('sdp-1');
            // Host answers on the change ref with a merge-set, like LivePolling does.
            await api.setDoc(added.ref, { answer: { type: 'answer', sdp: 'sdp-a' } }, { merge: true });
            const child = sb.call({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 'g:quiz-signaling:mb-g1' }] }).docs[0];
            expect(child.d.offer.sdp).toBe('sdp-1');
            expect(child.d.answer.sdp).toBe('sdp-a');
            // Cleanup deletion surfaces as a 'removed' change.
            await api.deleteDoc(added.ref);
            await api.pump();
            expect(events.some(e => e.type === 'removed' && e.id === 'mb-g1')).toBe(true);
        } finally { api.teardown(); }
    });

    it('session end on the server exits through the standard ended pathway (exists() === false)', async () => {
        const { api, sb } = makeBridge();
        sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync' } });
        api.install({ url: 'https://mb/exec', code: sb.code, secret: sb.secret, isTeacher: false, uid: 'mb-stu1' });
        try {
            const ref = api.doc(...sessionArgs(sb.code));
            const snaps = [];
            api.onSnapshot(ref, s => snaps.push(s.exists()));
            await api.pump();
            expect(snaps[snaps.length - 1]).toBe(true);
            sb.call({ a: 'end', c: sb.code, k: sb.secret });
            await api.pump();
            expect(snaps[snaps.length - 1]).toBe(false);
        } finally { api.teardown(); }
    });

    it('pre-v6 mailbox (bad-action) degrades silently to the legacy flows', async () => {
        const sbReal = openedSandbox();
        const legacy = {
            ...sbReal,
            call: p => (String(p.a).startsWith('d') ? { ok: false, e: 'bad-action' } : sbReal.call(p)),
        };
        const { api } = makeBridge(legacy);
        api.install({ url: 'https://mb/exec', code: legacy.code, secret: legacy.secret, isTeacher: false, uid: 'mb-stu1' });
        try {
            const ref = api.doc(...sessionArgs(legacy.code));
            const snaps = [];
            api.onSnapshot(ref, s => snaps.push(s));
            await api.pump(); // must swallow bad-action, fire nothing, stop pumping
            expect(snaps.length).toBe(0);
            expect(api.active()).toBe(true);
        } finally { api.teardown(); }
    });

    it('sheds the quiz fallback store and retries when a patch hits the doc size ceiling', async () => {
        const { api, sb } = makeBridge();
        sb.call({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync', roster: {}, quizState: { isActive: true, allResponses: { filler: 'x'.repeat(60 * 1024) } } } });
        api.install({ url: 'https://mb/exec', code: sb.code, secret: sb.secret, admin: sb.admin, isTeacher: true });
        try {
            const ref = api.doc(...sessionArgs(sb.code));
            // This patch pushes the doc past 85KB; the adapter must shed
            // quizState.allResponses (P2P carries answers normally) and retry
            // instead of leaving every subsequent session write failing.
            await api.updateDoc(ref, { 'quizState.bigField': 'y'.repeat(40 * 1024), 'quizState.phase': 'answering' });
            const stored = sb.call({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 's' }] }).docs[0];
            expect(stored.d.quizState.phase).toBe('answering');
            expect(stored.d.quizState.bigField.length).toBe(40 * 1024);
            expect(Object.keys(stored.d.quizState.allResponses || {})).toEqual([]);
        } finally { api.teardown(); }
    });

    it('only session-scoped refs reroute; foreign codes and other collections stay on Firestore', () => {
        const { api, sb } = makeBridge();
        api.install({ url: 'https://mb/exec', code: sb.code, secret: sb.secret, isTeacher: false, uid: 'mb-stu1' });
        try {
            expect(api.doc(...sessionArgs('OTHER'))?.__alloMbRef).toBeUndefined();
            expect(api.doc(DB, 'artifacts', 'app', 'public', 'data', 'conceptMastery', 'u1')?.__alloMbRef).toBeUndefined();
            expect(api.doc(...peerArgs('OTHER', 'u1'))?.__alloMbRef).toBeUndefined();
            expect(api.doc(...peerArgs(sb.code, 'u1', 'not-a-channel'))?.__alloMbRef).toBeUndefined();
            // session_assets writes are absorbed (packs carry the content).
            const assetRef = api.doc(DB, 'artifacts', 'app', 'public', 'data', 'session_assets', 'asset_1');
            expect(assetRef.__alloMbRef).toBe('asset');
        } finally { api.teardown(); }
    });
});

describe('three-copy sync pins (Phase C sections)', () => {
    const copies = [
        anti,
        fs.readFileSync(path.join(ROOT, 'prismflow-deploy', 'src', 'AlloFlowANTI.txt'), 'utf8'),
        fs.readFileSync(path.join(ROOT, 'prismflow-deploy', 'src', 'App.jsx'), 'utf8'),
    ];
    it('the bridge block and the unified wiring are identical in all three copies', () => {
        const sections = source => [
            sliceBetween(source, '// ── Class Mailbox session-document bridge (Phase C: single-pathway unification) ──', 'let WebSearchProvider = null;'),
            sliceBetween(source, 'const startMailboxLiveSession = useCallback', 'const _mbCloseTeacherPeers'),
            sliceBetween(source, '// Phase C — unified session pathway', 'return () => {'),
        ].join('\n--- SECTION ---\n');
        const [root, prismflow, appJsx] = copies.map(sections);
        expect(prismflow).toBe(root);
        expect(appJsx).toBe(root);
    });
    it('every copy wires the nudges and the unified join', () => {
        copies.forEach(source => {
            expect(source).toContain("if (parsed && parsed.kind === 'sdocv') { _alloMbSchedulePump(120); return; }");
            expect(source).toContain("dc.send(JSON.stringify({ kind: 'sdocv' }))");
            expect(source).toContain('_alloMbInstallBridge({ url: entry.u, code: mbJoinCode');
            expect(source).toContain('joinClassSession(mbJoinCode)');
            expect(source).toContain('await startClassSessionRef.current();');
            expect(source).toContain("updateDoc(sessionRef, { isActive: false, status: 'ended' })");
        });
    });
    it('every copy jitters class-wide nudges and re-pumps on visibility wake', () => {
        copies.forEach(source => {
            expect(source).toContain('function _alloMbNudgeDelay()');
            // Student-side nudge (whole class at once) is jittered; the
            // teacher-side one (single client) stays immediate.
            expect(source).toContain("_alloMbSchedulePump(_alloMbNudgeDelay());\n          return;");
            expect(source).toContain('__alloMbVisWakeWired');
            expect(source).toContain("document.addEventListener('visibilitychange', () => {\n          if (!document.hidden) _alloMbSchedulePump(_alloMbNudgeDelay());");
        });
    });
    it('every copy routes Canvas/backend-free homework QRs away from the dead Firestore read', () => {
        copies.forEach(source => {
            const fn = sliceBetween(source, 'const createHomeworkAssignmentLink = useCallback', 'const [includeSourceCitations');
            const gate = fn.indexOf('if (_isCanvasEnv || _alloFirebaseIsPlaceholder)');
            const hosted = fn.indexOf('await hostPackOnMailbox()');
            const selfContained = fn.indexOf('return createSelfContainedHomeworkLink();');
            const cloudWrite = fn.indexOf("'HW-' + generateUUID()");
            expect(gate).toBeGreaterThanOrEqual(0);
            expect(hosted).toBeGreaterThan(gate);
            expect(selfContained).toBeGreaterThan(hosted);
            // The gate must run BEFORE the cloud path ever starts.
            expect(gate).toBeLessThan(cloudWrite);
        });
    });
    it('every copy self-heals a bridged student roster entry dropped by a re-seed', () => {
        copies.forEach(source => {
            const heal = sliceBetween(source, '// Mailbox-bridge roster self-heal', '// Delivery acknowledgment');
            expect(heal).toContain('if (!_alloMbBridgeActive()) return;');
            expect(heal).toContain('sessionData.roster[user.uid]) return;');
            expect(heal).toContain('[`roster.${user.uid}`]');
        });
    });
});
