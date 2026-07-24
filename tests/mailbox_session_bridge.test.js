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
const publicMailboxSource = fs.readFileSync(path.join(ROOT, 'desktop/web-app', 'public', 'apps_script', 'session_mailbox', 'Code.gs'), 'utf8');

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
        Utilities: {
            getUuid: () => 'aaaaaaaa-bbbb-cccc-dddd-' + String(uuidCounter++).padStart(12, '0'),
            computeHmacSha256Signature: (value, key) => Array.from(Buffer.from((String(key) + '|' + String(value)).repeat(8)).subarray(0, 32)),
            base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'),
        },
    };
    const factory = new Function(...Object.keys(services), gsSource + '; return { handle: handle };');
    const gs = factory(...Object.values(services));
    return { call: p => JSON.parse(gs.handle(p).getContent()), cacheStore, props };
}

function openedSandbox(code = 'AB2CD', secret = 'k_secret_k_secret_20') {
    const sandbox = makeGsSandbox();
    const admin = sandbox.call({ a: 'claim' }).admin;
    expect(sandbox.call({ a: 'open', admin, c: code, k: secret }).ok).toBe(true);
    const teacherCall = payload => sandbox.call({ admin, ...payload });
    const joinParticipant = () => {
        const joined = sandbox.call({ a: 'join', c: code, k: secret });
        expect(joined.ok).toBe(true);
        return { uid: joined.uid, pt: joined.pt };
    };
    return { ...sandbox, admin, code, secret, teacherCall, joinParticipant };
}

describe('Code.gs v7 role-aware session document store (real source)', () => {
    it('reports v6 and keeps the doc store behind the session secret', () => {
        const sb = makeGsSandbox();
        expect(sb.call({ a: 'hello' }).v).toBeGreaterThanOrEqual(7);
        expect(sb.call({ a: 'dget', c: 'AB2CD', k: 'k_secret_k_secret_20', ps: [{ p: 's' }] }).e).toBe('no-session');
        const opened = openedSandbox();
        expect(opened.call({ a: 'dget', c: opened.code, k: 'x_wrong_x_wrong_x_20', ps: [{ p: 's' }] }).e).toBe('denied');
        expect(opened.teacherCall({ a: 'dset', c: opened.code, k: opened.secret, p: 'bad path!', d: {} }).e).toBe('bad-path');
    });

    it('dset/dget round-trips with version-delta short-circuiting', () => {
        const sb = openedSandbox();
        const set = sb.teacherCall({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync', roster: {} } });
        expect(set.ok).toBe(true);
        expect(set.w).toBe(1);
        const fresh = sb.teacherCall({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 's' }] });
        expect(fresh.docs[0].w).toBe(1);
        expect(fresh.docs[0].d.mode).toBe('sync');
        // Caller already has w=1: body omitted (the poll stays cheap).
        const cached = sb.teacherCall({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 's', w: 1 }] });
        expect(cached.docs[0].w).toBe(1);
        expect(cached.docs[0].d).toBeUndefined();
        // Unknown docs report missing (never an error).
        const missing = sb.teacherCall({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 'g:signaling:u1' }] });
        expect(missing.docs[0].missing).toBe(true);
    });

    it('dpatch applies dot paths, nested creation and deleteField like Firestore updateDoc', () => {
        const sb = openedSandbox();
        expect(sb.teacherCall({ a: 'dpatch', c: sb.code, k: sb.secret, p: 's', u: { x: 1 } }).e).toBe('no-doc');
        sb.teacherCall({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { roster: {}, quizState: { isActive: false } } });
        const patched = sb.teacherCall({ a: 'dpatch', c: sb.code, k: sb.secret, p: 's', u: {
            'roster.mb-1.name': 'Brave Fox',
            'roster.mb-1.xp': 40,
            'quizState.isActive': true,
        } });
        expect(patched.ok).toBe(true);
        expect(patched.d.roster['mb-1'].name).toBe('Brave Fox');
        expect(patched.d.quizState.isActive).toBe(true);
        expect(patched.w).toBe(2);
        const removed = sb.teacherCall({ a: 'dpatch', c: sb.code, k: sb.secret, p: 's', u: {
            'roster.mb-1.xp': { __op: 'deleteField' },
        } });
        expect(removed.d.roster['mb-1'].xp).toBeUndefined();
        expect(removed.d.roster['mb-1'].name).toBe('Brave Fox');
    });

    it('dset merge, collection indexes and ddel maintain the membership doc', () => {
        const sb = openedSandbox();
        sb.teacherCall({ a: 'dset', c: sb.code, k: sb.secret, p: 'g:quiz-signaling:mb-user00001', d: { offer: { sdp: 'o1' } }, col: 'c:quiz-signaling', id: 'mb-user00001' });
        sb.teacherCall({ a: 'dset', c: sb.code, k: sb.secret, p: 'g:quiz-signaling:mb-user00002', d: { offer: { sdp: 'o2' } }, col: 'c:quiz-signaling', id: 'mb-user00002' });
        let index = sb.teacherCall({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 'c:quiz-signaling' }] }).docs[0];
        expect(Object.keys(index.d).sort()).toEqual(['mb-user00001', 'mb-user00002']);
        // Host answers with a merge-set: guest fields survive.
        sb.teacherCall({ a: 'dset', c: sb.code, k: sb.secret, p: 'g:quiz-signaling:mb-user00001', d: { answer: { sdp: 'a1' } }, merge: 1, col: 'c:quiz-signaling', id: 'mb-user00001' });
        const child = sb.teacherCall({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 'g:quiz-signaling:mb-user00001' }] }).docs[0];
        expect(child.d.offer.sdp).toBe('o1');
        expect(child.d.answer.sdp).toBe('a1');
        sb.teacherCall({ a: 'ddel', c: sb.code, k: sb.secret, p: 'g:quiz-signaling:mb-user00001', col: 'c:quiz-signaling', id: 'mb-user00001' });
        index = sb.teacherCall({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 'c:quiz-signaling' }] }).docs[0];
        expect(Object.keys(index.d)).toEqual(['mb-user00002']);
    });

    it('recv piggybacks the doc watch list: one poll returns messages AND changed docs', () => {
        const sb = openedSandbox();
        sb.teacherCall({ a: 'dset', c: sb.code, p: 's', d: { mode: 'sync', roster: {} } });
        const guest = sb.joinParticipant();
        sb.call({ a: 'send', ...guest, c: sb.code, box: 'up', v: { kind: 'student', name: 'Ada' } });
        const res = sb.teacherCall({ a: 'recv', c: sb.code, box: 'up', since: '0', ps: [{ p: 's' }] });
        expect(res.b.up.m.length).toBe(1);
        expect(res.docs[0].d.mode).toBe('sync');
        // Known version: the piggyback stays cheap (no body).
        const cached = sb.teacherCall({ a: 'recv', c: sb.code, k: sb.secret, box: 'up', since: String(res.b.up.n), ps: [{ p: 's', w: res.docs[0].w }] });
        expect(cached.docs[0].d).toBeUndefined();
        // No ps → no docs key at all (old-client shape unchanged).
        expect(sb.teacherCall({ a: 'recv', c: sb.code, k: sb.secret, box: 'up', since: '0' }).docs).toBeUndefined();
    });

    it('rejects oversized docs, clears docs on end, and re-open does not resurrect a previous class', () => {
        const sb = openedSandbox();
        expect(sb.teacherCall({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { blob: 'x'.repeat(90 * 1024) } }).e).toBe('too-big');
        sb.teacherCall({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync' } });
        expect(sb.teacherCall({ a: 'end', c: sb.code, k: sb.secret }).ok).toBe(true);
        expect(sb.teacherCall({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 's' }] }).e).toBe('no-session');
        // Same code re-opened later (random collision): the old doc is gone.
        expect(sb.teacherCall({ a: 'open', admin: sb.admin, c: sb.code, k: sb.secret }).ok).toBe(true);
        expect(sb.teacherCall({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 's' }] }).docs[0].missing).toBe(true);
    });

    it('projects private class state and rejects cross-student or teacher-only operations', () => {
        const sb = openedSandbox();
        const one = sb.joinParticipant();
        const two = sb.joinParticipant();
        sb.teacherCall({ a: 'dset', c: sb.code, p: 's', d: {
            mode: 'sync',
            roster: {
                [one.uid]: { name: 'One', groupId: 'g1' },
                [two.uid]: { name: 'Two', signal: 'stuck' },
            },
            quizState: {
                allResponses: { [one.uid]: { 0: 'A' }, [two.uid]: { 0: 'B' } },
                responses: { [one.uid]: 1, [two.uid]: 2 },
                teams: { [one.uid]: 'red', [two.uid]: 'blue' },
            },
            bridgeReactions: { [one.uid]: { emoji: 'ok' }, [two.uid]: { emoji: 'help' } },
            democracy: { votes: { [one.uid]: 'A', [two.uid]: 'B' } },
        } });
        const view = sb.call({ a: 'dget', ...one, c: sb.code, ps: [{ p: 's' }] }).docs[0].d;
        expect(Object.keys(view.roster)).toEqual([one.uid]);
        expect(view.participantCount).toBe(2);
        expect(Object.keys(view.quizState.allResponses)).toEqual([one.uid]);
        expect(Object.keys(view.bridgeReactions)).toEqual([one.uid]);
        expect(Object.keys(view.democracy.votes)).toEqual([one.uid]);
        expect(sb.call({ a: 'dpatch', ...one, c: sb.code, p: 's', u: {
            ['roster.' + one.uid + '.name']: 'Updated',
        } }).ok).toBe(true);
        expect(sb.call({ a: 'dpatch', ...one, c: sb.code, p: 's', u: {
            ['roster.' + two.uid + '.name']: 'Forged',
        } }).e).toBe('denied');
        expect(sb.call({ a: 'dpatch', ...one, c: sb.code, p: 's', u: {
            ['roster.' + one.uid + '.groupId']: 'teacher-group',
        } }).e).toBe('denied');
        expect(sb.call({ a: 'dpatch', ...one, c: sb.code, p: 's', u: { mode: 'async' } }).e).toBe('denied');
        expect(sb.call({ a: 'ddel', ...one, c: sb.code, p: 's' }).e).toBe('denied');
        expect(sb.call({ a: 'end', ...one, c: sb.code }).e).toBe('not-admin');
    });

    it('scopes signaling to the issued participant and rejects hostile patch keys', () => {
        const sb = openedSandbox();
        const one = sb.joinParticipant();
        const two = sb.joinParticipant();
        sb.teacherCall({ a: 'dset', c: sb.code, p: 's', d: { roster: {} } });
        const ownPath = 'g:quiz-signaling:' + one.uid;
        const otherPath = 'g:quiz-signaling:' + two.uid;
        expect(sb.call({ a: 'dset', ...one, c: sb.code, p: ownPath, d: { offer: { sdp: 'one' } } }).ok).toBe(true);
        expect(sb.call({ a: 'dget', ...one, c: sb.code, ps: [{ p: ownPath }] }).docs[0].d.offer.sdp).toBe('one');
        expect(sb.call({ a: 'dget', ...two, c: sb.code, ps: [{ p: ownPath }] }).e).toBe('denied');
        expect(sb.call({ a: 'dset', ...one, c: sb.code, p: otherPath, d: { offer: { sdp: 'forged' } } }).e).toBe('denied');
        expect(sb.call({ a: 'dget', ...one, c: sb.code, ps: [{ p: 'c:quiz-signaling' }] }).e).toBe('denied');
        const poison = {};
        Object.defineProperty(poison, 'roster.' + one.uid + '.__proto__.polluted', { value: true, enumerable: true });
        expect(sb.call({ a: 'dpatch', ...one, c: sb.code, p: 's', u: poison }).e).toBe('bad-data');
        expect(sb.teacherCall({ a: 'dset', c: sb.code, p: 'g:quiz-signaling:mb-hostile001', d:
            JSON.parse('{"offer":{"constructor":{"polluted":true}}}') }).e).toBe('bad-data');
        expect({}.polluted).toBeUndefined();
    });

    it('supports compare-and-swap recovery so a stale re-seed cannot overwrite a recreated document', () => {
        const sb = openedSandbox();
        const first = sb.teacherCall({ a: 'dset', c: sb.code, p: 's', d: { mode: 'sync' } });
        expect(first.w).toBe(1);
        const conflict = sb.teacherCall({ a: 'dset', c: sb.code, p: 's', d: { mode: 'stale' }, xw: 0 });
        expect(conflict).toMatchObject({ ok: false, e: 'conflict', w: 1 });
        expect(sb.teacherCall({ a: 'dget', c: sb.code, ps: [{ p: 's' }] }).docs[0].d.mode).toBe('sync');
    });});

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
            recvPs: () => _alloMbRecvDocPs(),
            deliver: (docs) => _alloMbRecvDocsDelivered(docs),
            nudge: () => _alloMbNudge(),
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
            const stored = sb.teacherCall({ a: 'dget', c: 'ZZ9XY', k: sb.secret, ps: [{ p: 's' }] }).docs[0];
            expect(stored.d.mode).toBe('sync');
            expect(stored.d.resources).toBeUndefined(); // pack channel carries content
        } finally { api.teardown(); }
    });

    it('student flow uses a participant capability and can update only its own roster entry', async () => {
        const { api, sb } = makeBridge();
        sb.teacherCall({ a: 'dset', c: sb.code, p: 's', d: { mode: 'sync', roster: {}, isActive: true } });
        const guest = sb.joinParticipant();
        api.install({ url: 'https://mb/exec', code: sb.code, participant: guest.pt, isTeacher: false, uid: guest.uid });
        try {
            expect(api.bridgeUser().uid).toBe(guest.uid);
            const ref = api.doc(...sessionArgs(sb.code));
            const snap = await api.getDoc(ref);
            expect(snap.exists()).toBe(true);
            expect(snap.data().mode).toBe('sync');
            const seen = [];
            api.onSnapshot(ref, value => seen.push(value.data()));
            await api.updateDoc(ref, {
                ['roster.' + guest.uid + '.name']: 'Brave Fox',
                ['roster.' + guest.uid + '.signal']: { __testDelete: true },
                resources: [{ id: 'nope' }],
            });
            expect(seen.length).toBeGreaterThan(0);
            expect(seen[seen.length - 1].roster[guest.uid].name).toBe('Brave Fox');
            const stored = sb.teacherCall({ a: 'dget', c: sb.code, ps: [{ p: 's' }] }).docs[0];
            expect(stored.d.roster[guest.uid].name).toBe('Brave Fox');
            expect(stored.d.resources).toBeUndefined();
            await expect(api.updateDoc(ref, { mode: 'async' })).rejects.toMatchObject({ code: 'allo/mailbox-denied' });
        } finally { api.teardown(); }
    });
    it('doc watchers receive remote changes via the pump', async () => {
        const { api, sb } = makeBridge();
        sb.teacherCall({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync', roster: {} } });
        api.install({ url: 'https://mb/exec', code: sb.code, secret: sb.secret, admin: sb.admin, isTeacher: true });
        try {
            const ref = api.doc(...sessionArgs(sb.code));
            const seen = [];
            api.onSnapshot(ref, s => seen.push(s.data()));
            await api.pump();
            expect(seen.length).toBe(1); // initial state pulled
            // A student patches server-side (as their own bridge would).
            sb.teacherCall({ a: 'dpatch', c: sb.code, k: sb.secret, p: 's', u: { 'roster.mb-9.name': 'Calm Owl' } });
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
        sb.teacherCall({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync' } });
        api.install({ url: 'https://mb/exec', code: sb.code, secret: sb.secret, admin: sb.admin, isTeacher: true });
        try {
            const colRef = api.collection(...peersColArgs(sb.code));
            expect(colRef.__alloMbCol).toBe('quiz-signaling');
            const events = [];
            api.onSnapshot(colRef, snap => {
                snap.docChanges().forEach(ch => events.push({ type: ch.type, id: ch.doc.id, data: ch.doc.data(), ref: ch.doc.ref }));
            });
            // Guest writes an offer (their bridge does exactly this dset).
            const guestRef = api.doc(...peerArgs(sb.code, 'mb-guest0001'));
            expect(guestRef.__alloMbRef).toBe('peer');
            await api.setDoc(guestRef, { offer: { type: 'offer', sdp: 'sdp-1' }, codename: 'Brave Fox' });
            await api.pump();
            const added = events.find(e => e.type === 'added' && e.id === 'mb-guest0001');
            expect(added).toBeTruthy();
            expect(added.data.offer.sdp).toBe('sdp-1');
            // Host answers on the change ref with a merge-set, like LivePolling does.
            await api.setDoc(added.ref, { answer: { type: 'answer', sdp: 'sdp-a' } }, { merge: true });
            const child = sb.teacherCall({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 'g:quiz-signaling:mb-guest0001' }] }).docs[0];
            expect(child.d.offer.sdp).toBe('sdp-1');
            expect(child.d.answer.sdp).toBe('sdp-a');
            // Cleanup deletion surfaces as a 'removed' change.
            await api.deleteDoc(added.ref);
            await api.pump();
            expect(events.some(e => e.type === 'removed' && e.id === 'mb-guest0001')).toBe(true);
        } finally { api.teardown(); }
    });

    it('session end on the server exits through the standard ended pathway', async () => {
        const { api, sb } = makeBridge();
        sb.teacherCall({ a: 'dset', c: sb.code, p: 's', d: { mode: 'sync' } });
        const guest = sb.joinParticipant();
        api.install({ url: 'https://mb/exec', code: sb.code, participant: guest.pt, isTeacher: false, uid: guest.uid });
        try {
            const ref = api.doc(...sessionArgs(sb.code));
            const snaps = [];
            api.onSnapshot(ref, value => snaps.push(value.exists()));
            await api.pump();
            expect(snaps[snaps.length - 1]).toBe(true);
            sb.teacherCall({ a: 'end', c: sb.code });
            await api.pump();
            expect(snaps[snaps.length - 1]).toBe(false);
        } finally { api.teardown(); }
    });
    it('participant calls fail closed when the bridge has no issued credential', async () => {
        const { api, sb } = makeBridge();
        api.install({ url: 'https://mb/exec', code: sb.code, isTeacher: false, uid: 'mb-missing0001' });
        try {
            const ref = api.doc(...sessionArgs(sb.code));
            await expect(api.getDoc(ref)).rejects.toMatchObject({ code: 'allo/mailbox-denied' });
        } finally { api.teardown(); }
    });
    it('recv-fed deliveries update watchers and idle the pump; a nudge overrides the idle skip', async () => {
        const { api, sb, calls } = makeBridge();
        sb.teacherCall({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync', roster: {} } });
        const guest = sb.joinParticipant();
        api.install({ url: 'https://mb/exec', code: sb.code, participant: guest.pt, isTeacher: false, uid: guest.uid });
        try {
            const ref = api.doc(...sessionArgs(sb.code));
            const seen = [];
            api.onSnapshot(ref, s => seen.push(s.data()));
            // A recv loop would fetch with the watch list and hand docs back:
            const ps = api.recvPs();
            expect(Array.isArray(ps) && ps.length).toBeTruthy();
            const recvRes = sb.call({ a: 'recv', ...guest, c: sb.code, box: 'down', since: '0', ps });
            await api.deliver(recvRes.docs);
            expect(seen.length).toBe(1);
            expect(seen[0].mode).toBe('sync');
            // Just fed → the pump skips its own request entirely.
            const dgetsBefore = calls.filter(c => c.a === 'dget').length;
            await api.pump();
            expect(calls.filter(c => c.a === 'dget').length).toBe(dgetsBefore);
            // A nudge means a change is waiting NOW → the pump pulls anyway.
            sb.teacherCall({ a: 'dpatch', c: sb.code, k: sb.secret, p: 's', u: { 'roster.mb-9.name': 'Calm Owl' } });
            api.nudge();
            await api.pump();
            expect(calls.filter(c => c.a === 'dget').length).toBe(dgetsBefore + 1);
            expect(seen[seen.length - 1].roster[guest.uid]).toBeUndefined();
        } finally { api.teardown(); }
    });

    it('sheds the quiz fallback store and retries when a patch hits the doc size ceiling', async () => {
        const { api, sb } = makeBridge();
        sb.teacherCall({ a: 'dset', c: sb.code, k: sb.secret, p: 's', d: { mode: 'sync', roster: {}, quizState: { isActive: true, allResponses: { filler: 'x'.repeat(60 * 1024) } } } });
        api.install({ url: 'https://mb/exec', code: sb.code, secret: sb.secret, admin: sb.admin, isTeacher: true });
        try {
            const ref = api.doc(...sessionArgs(sb.code));
            // This patch pushes the doc past 85KB; the adapter must shed
            // quizState.allResponses (P2P carries answers normally) and retry
            // instead of leaving every subsequent session write failing.
            await api.updateDoc(ref, { 'quizState.bigField': 'y'.repeat(40 * 1024), 'quizState.phase': 'answering' });
            const stored = sb.teacherCall({ a: 'dget', c: sb.code, k: sb.secret, ps: [{ p: 's' }] }).docs[0];
            expect(stored.d.quizState.phase).toBe('answering');
            expect(stored.d.quizState.bigField.length).toBe(40 * 1024);
            expect(Object.keys(stored.d.quizState.allResponses || {})).toEqual([]);
        } finally { api.teardown(); }
    });

    it('only session-scoped refs reroute; foreign codes and other collections stay on Firestore', () => {
        const { api, sb } = makeBridge();
        const guest = sb.joinParticipant();
        api.install({ url: 'https://mb/exec', code: sb.code, participant: guest.pt, isTeacher: false, uid: guest.uid });
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
        fs.readFileSync(path.join(ROOT, 'desktop/web-app', 'src', 'AlloFlowANTI.txt'), 'utf8'),
        fs.readFileSync(path.join(ROOT, 'desktop/web-app', 'src', 'App.jsx'), 'utf8'),
    ].map(source => source.replace(/\r\n/g, '\n'));
    it('the bridge block and the unified wiring are identical in all three copies', () => {
        const sections = source => [
            sliceBetween(source, '// ── Class Mailbox session-document bridge (Phase C: single-pathway unification) ──', 'let WebSearchProvider = null;'),
            sliceBetween(source, 'const startMailboxLiveSession = useCallback', 'const _mbCloseTeacherPeers'),
            sliceBetween(source, '// Mailbox live-session student entry (?allo_mb=…)', '// Keep the announced nickname current'),
        ].join('\n--- SECTION ---\n');
        const [root, prismflow, appJsx] = copies.map(sections);
        expect(prismflow).toBe(root);
        expect(appJsx).toBe(root);
    });
    it('every copy wires the nudges and the unified join', () => {
        copies.forEach(source => {
            expect(source).toContain("if (parsed && parsed.kind === 'sdocv') { _alloMbNudge(); return; }");
            expect(source).toContain("dc.send(JSON.stringify({ kind: 'sdocv' }))");
            expect(source).toContain('participant: student.participant');
            expect(source).toContain('joinClassSession(mbJoinCode)');
            expect(source).toContain('await startClassSessionRef.current();');
            expect(source).toContain("updateDoc(sessionRef, { isActive: false, status: 'ended' })");
        });
    });
    it('every copy jitters class-wide nudges and re-pumps on visibility wake', () => {
        copies.forEach(source => {
            expect(source).toContain('function _alloMbNudgeDelay()');
            expect(source).toContain('_alloMbSchedulePump(_alloMbNudgeDelay());');
            expect(source).toContain('__alloMbVisWakeWired');
            expect(source).toContain("document.addEventListener('visibilitychange', () => {\n          if (!document.hidden) _alloMbNudge();");
        });
    });
    it('every copy folds the doc watch list into both recv loops (one request per client)', () => {
        copies.forEach(source => {
            const wired = source.split('pollPayload.ps = bridgePs').length - 1;
            expect(wired).toBe(2); // teacher 'up' loop + student 'down' loop
            expect(source.split('_alloMbRecvDocsDelivered(res.docs)').length - 1).toBe(2);
        });
    });
    it('every copy serves group/individual pushes from the pack-fed pool over the mailbox', () => {
        copies.forEach(source => {
            // The pack handler maintains the same pool the session-doc
            // consumers read…
            expect(source.split('hydratedHistoryRef.current = next;').length - 1).toBe(2); // res + res-remove
            // …and the snapshot consumer falls back to it when the bridged
            // session doc (deliberately) carries no resources.
            const consumer = sliceBetween(source, 'let resourcesToRender = [];', 'if (data.bridgePayload && data.bridgePayload.timestamp) {');
            expect(consumer).toContain('_alloMbBridgeActive() && Array.isArray(hydratedHistoryRef.current) && hydratedHistoryRef.current.length');
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
    it('ships the mailbox server script inside the app, byte-identical to Code.gs', () => {
        copies.forEach(source => {
            const start = source.indexOf('const ALLO_MB_SCRIPT_SOURCE = `');
            expect(start).toBeGreaterThan(-1);
            const open = source.indexOf('`', start);
            // Escape-aware scan for the closing backtick: the embedded copy
            // escapes backslashes and backticks, so a naive indexOf can stop
            // at an escaped backtick inside the script.
            let close = open + 1;
            while (close < source.length && source[close] !== '`') {
                close += source[close] === '\\' ? 2 : 1;
            }
            expect(close).toBeLessThan(source.length);
            const literal = source.slice(open, close + 1);
            // Evaluate the template literal so escape handling (backslashes)
            // is exercised exactly the way the browser will see it.
            const embedded = new Function('return ' + literal + ';')();
            expect(embedded).toBe(gsSource);
            expect(publicMailboxSource).toBe(gsSource);
        });
    });
    it('every copy hands teachers the embedded script and nudges outdated deployments', () => {
        const serverVersion = Number((gsSource.match(/var VERSION = (\d+);/) || [])[1]);
        expect(serverVersion).toBeGreaterThanOrEqual(6);
        copies.forEach(source => {
            expect(source).toContain('copyToClipboard(ALLO_MB_SCRIPT_SOURCE)');
            // The old CDN fetch was CORS-fragile in Canvas and dead offline.
            expect(source).not.toContain("const res = await fetch('https://alloflow-cdn.pages.dev/apps_script");
            expect(source).toContain('v: Number(mbHello && mbHello.v) || 0');
            // Banner threshold must track the shipped server VERSION so a
            // future bump cannot silently stop nudging teachers to update.
            expect(source).toContain(`Number(mbConfig.v) < ${serverVersion}`);
        });
    });
});

// ── Durable live-resource parity (packRef self-heal) + large-pack HW reroute ──

describe('mailbox live-resource parity: durable packRef self-heal', () => {
    it('putpack + a tiny packRef let a participant rebuild the whole pack; packRef survives projection', () => {
        const sb = openedSandbox();
        const PK = 'PK-12345678-1234-1234-1234-123456789012';
        const secret = 'p_secret_p_secret_20';
        // Teacher hosts the whole student-safe pack in two chunks (the durable
        // data.resources analogue) and advertises only a tiny pointer.
        expect(sb.teacherCall({ a: 'putpack', id: PK, k: secret, part: 1, of: 2, data: 'AAAA', title: 'Live pack' }).ok).toBe(true);
        expect(sb.teacherCall({ a: 'putpack', id: PK, k: secret, part: 2, of: 2, data: 'BBBB', title: 'Live pack' }).ok).toBe(true);
        sb.teacherCall({ a: 'dset', c: sb.code, p: 's', d: { mode: 'sync', roster: {}, packRef: { id: PK, k: secret, n: 3, t: 111 } } });
        const guest = sb.joinParticipant();
        // A participant's privacy-filtered view keeps packRef (only roster/quiz/etc.
        // are projected away), so every student can find the pack.
        const view = sb.call({ a: 'dget', ...guest, c: sb.code, ps: [{ p: 's' }] }).docs[0].d;
        expect(view.packRef.id).toBe(PK);
        expect(view.packRef.k).toBe(secret);
        // getpack is secret-gated only — the student reassembles the full pack,
        // and can do so again after any local history wipe (self-heal).
        const gp = sb.call({ a: 'getpack', id: PK, k: secret, part: 1 });
        expect(gp.ok).toBe(true);
        expect(gp.data).toBe('AAAABBBB');
        expect(gp.of).toBe(1);
    });

    it('the bridge publishes packRef on a session write but still strips resources', async () => {
        const { api, sb } = makeBridge();
        sb.teacherCall({ a: 'dset', c: sb.code, p: 's', d: { mode: 'sync', roster: {} } });
        api.install({ url: 'https://mb/exec', code: sb.code, secret: sb.secret, admin: sb.admin, isTeacher: true });
        try {
            const ref = api.doc(...sessionArgs(sb.code));
            await api.updateDoc(ref, { packRef: { id: 'PK-live', k: 'kkkkkkkkkkkkkkkk', n: 3, t: 42 }, resources: [{ id: 'nope' }] });
            const stored = sb.teacherCall({ a: 'dget', c: sb.code, ps: [{ p: 's' }] }).docs[0].d;
            expect(stored.packRef.t).toBe(42);
            expect(stored.packRef.id).toBe('PK-live');
            expect(stored.resources).toBeUndefined(); // the pointer rides the doc; the payload stays in the pack
        } finally { api.teardown(); }
    });

    const NEW_COPIES = [
        anti,
        fs.readFileSync(path.join(ROOT, 'desktop/web-app', 'src', 'AlloFlowANTI.txt'), 'utf8'),
        fs.readFileSync(path.join(ROOT, 'desktop/web-app', 'src', 'App.jsx'), 'utf8'),
    ];

    it('every copy hosts the whole pack + advertises packRef, and students getpack-heal', () => {
        NEW_COPIES.forEach(source => {
            // Teacher: fingerprint-gated whole-pack host + tiny pointer publish.
            expect(source).toContain("a: 'putpack', admin: mbConfig.admin, id, k, part: i + 1, of: parts.length, title: 'Live pack', data: parts[i]");
            // Stage 3: packRef write = injected publishPackRef op (cycle
            // algorithm module-owned in SessionTransport).
            expect(source).toContain('await updateDoc(sessionRef, { packRef: { id: ref.id, k: ref.k, n: ref.n, t: ref.t } });');
            // Stage 3: the fingerprint gate lives in SessionTransport's
            // runMailboxPackCycle; the host injects get/setHostedFp.
            expect(source).toContain('getHostedFp: () => mbHostedPackFpRef.current');
            expect(source).toContain('setHostedFp: (fp) => { mbHostedPackFpRef.current = fp; }');
            // Student: self-heal branch reads packRef and rebuilds via getpack.
            expect(source).toContain('} else if (data.packRef && data.packRef.id && _alloMbBridgeActive()) {');
            expect(source).toContain("a: 'getpack', id: data.packRef.id, k: data.packRef.k, part");
            expect(source).toContain('hydratedHistoryRef.current = merged;');
            // Preserve the pinned mailbox fallback + the exactly-two invariant.
            expect(source).toContain('_alloMbBridgeActive() && Array.isArray(hydratedHistoryRef.current) && hydratedHistoryRef.current.length');
            expect(source.split('hydratedHistoryRef.current = next;').length - 1).toBe(2);
            // Best-effort cleanup on end.
            expect(source).toContain("a: 'delpack', admin: mbConfig.admin, id: mbLivePackRef.current.id");
        });
    });

    it('every copy routes the auto-sync loop through the module-owned cycle (stage 3)', () => {
        // Per-item failure isolation now lives in SessionTransport's
        // runMailboxPackCycle (unit-tested in tests/session_transport.test.js);
        // the host injects the push primitive + error hook.
        NEW_COPIES.forEach(source => {
            expect(source).toContain("pushItem: (item) => _mbPushOneResource(item, { open: false, quiet: true })");
            expect(source).toContain("onItemError: (item, itemErr) => warnLog('Mailbox pack sync: one resource failed, continuing:', itemErr?.message)");
            expect(source).toContain('typeof _stMb.runMailboxPackCycle === ');
        });
    });

    it('every copy guards the offline-history loader against clobbering a live student', () => {
        NEW_COPIES.forEach(source => {
            // Current guard form (@41cc1dd52): mailbox entries are checked via
            // the entry params directly; Firebase live students self-heal from
            // data.resources so they no longer need an explicit term here.
            expect(source).toContain('if (!isTeacherMode && (activeSessionCode || _alloMbBridgeActive()');
            expect(source).toContain("|| _alloReadMailboxEntryParam('allo_mb') || _alloReadMailboxEntryParam('allo_mbp'))) {");
        });
    });

    it('every copy wires online/pageshow recovery (refresh-resilience wave)', () => {
        NEW_COPIES.forEach(source => {
            // Module-scope session-doc pump nudges on network return + bfcache restore.
            expect(source).toContain('window.__alloMbNetWakeWired = true;');
            expect(source).toContain("window.addEventListener('pageshow', (event) => { if (event && event.persisted) _alloMbNudge(); });");
            // Student recv loop + teacher roster loop both re-poll on 'online'/'pageshow' (and clean up).
            expect(source.split("try { window.addEventListener('online', onNetBack); window.addEventListener('pageshow', onPageShow); } catch (_) {}").length - 1).toBe(2);
            expect(source.split("try { window.removeEventListener('online', onNetBack); window.removeEventListener('pageshow', onPageShow); } catch (_) {}").length - 1).toBe(2);
            // RTC retry resets its backoff on network return + bfcache restore.
            expect(source).toContain("try { window.addEventListener('online', onRtcNetBack); window.addEventListener('pageshow', onRtcPageShow); } catch (_) {}");
            expect(source).toContain("try { window.removeEventListener('online', onRtcNetBack); window.removeEventListener('pageshow', onRtcPageShow); } catch (_) {}");
            // Mailbox join auto-retries only TRANSIENT failures; terminal ones
            // (old script / ended session / denied) keep the manual button.
            expect(source).toContain('setMbJoinRetryable(!oldScript && !sessionGone);');
            expect(source).toContain('}, [mbJoinError, mbJoinRetryable]);');
        });
    });

    it('every copy reroutes oversize homework packs to the mailbox host instead of dead-ending', () => {
        NEW_COPIES.forEach(source => {
            const fn = sliceBetween(source, 'const createSelfContainedHomeworkLink = useCallback', 'const hostPackOnMailbox = useCallback');
            expect(fn).toContain('shareUrl.length > ALLO_QR_PACK_MAX_URL_CHARS');
            expect(fn).toContain('return hostPackOnMailboxRef.current ? hostPackOnMailboxRef.current() : null;');
            // The old dead-end error toast is gone.
            expect(fn).not.toContain('too large for a self-contained link. Host it on your Class Mailbox (images OK) or use the HTML export');
            // The redirect toast only fires when the mailbox is ready (no double toast).
            expect(fn).toContain('if (mbConfig?.url && mbConfig?.admin) {');
            // Not-connected queues the host for after the connect self-test lands.
            const host = sliceBetween(source, 'const hostPackOnMailbox = useCallback', 'const toggleMbHand = useCallback');
            expect(host).toContain('mbPendingHostRef.current = true;');
            expect(source).toContain('if (mbPendingHostRef.current && mbConfig?.url && mbConfig?.admin) {');
            expect(source).toContain('hostPackOnMailboxRef.current = hostPackOnMailbox;');
        });
    });
});
