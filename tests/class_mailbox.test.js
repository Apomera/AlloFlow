// Class Mailbox (teacher-owned Apps Script rendezvous) — protocol + client.
// The server test evaluates the REAL apps_script/session_mailbox/Code.gs with
// mocked Google services and drives full flows: claim → open → send/recv →
// end, and chunked putpack → getpack. Client tests exercise the real ANTI
// helpers. Pins guard the no-Firebase invariant of the student entries.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const gsSource = fs.readFileSync(path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs'), 'utf8');

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
    const factory = new Function(...Object.keys(services), gsSource + '; return { handle: handle, doGet: doGet, doPost: doPost };');
    const gs = factory(...Object.values(services));
    return { call: p => JSON.parse(gs.handle(p).getContent()), gs, driveFiles, cacheStore, props };
}

describe('Code.gs protocol (real source, mocked Google services)', () => {
    it('runs the full live-session lifecycle with separated teacher and participant capabilities', () => {
        const { call } = makeGsSandbox();
        const K = 'k_secret_k_secret_20';
        expect(call({ a: 'hello' }).v).toBeGreaterThanOrEqual(7);
        const claim = call({ a: 'claim' });
        expect(claim.ok).toBe(true);
        expect(claim.admin.length).toBeGreaterThanOrEqual(32);
        expect(call({ a: 'claim' }).e).toBe('claimed');
        expect(call({ a: 'open', c: 'ABC23', k: K }).e).toBe('not-admin');
        expect(call({ a: 'open', admin: claim.admin, c: 'ABC23', k: K }).ok).toBe(true);

        const joined = call({ a: 'join', c: 'ABC23', k: K });
        expect(joined).toMatchObject({ ok: true });
        expect(joined.uid).toMatch(/^mb-/);
        expect(joined.pt.length).toBeGreaterThan(20);
        const participant = { uid: joined.uid, pt: joined.pt };

        const sent = call({ a: 'send', ...participant, c: 'ABC23', box: 'up', v: { kind: 'student', uid: 'forged', name: 'Ada', hand: true } });
        expect(sent.i).toBe(1);
        const recv = call({ a: 'recv', admin: claim.admin, c: 'ABC23', box: 'up', since: '0' });
        expect(recv.b.up.m.length).toBe(1);
        expect(recv.b.up.m[0][1].f).toBe(joined.uid);
        expect(recv.b.up.m[0][1].v.name).toBe('Ada');
        expect(call({ a: 'recv', admin: claim.admin, c: 'ABC23', box: 'up', since: String(recv.b.up.n) }).b.up.m.length).toBe(0);

        expect(call({ a: 'send', ...participant, c: 'ABC23', box: 'down', v: { kind: 'end' } }).e).toBe('denied');
        expect(call({ a: 'recv', ...participant, c: 'ABC23', box: 'up', since: '0' }).e).toBe('denied');
        expect(call({ a: 'end', ...participant, c: 'ABC23' }).e).toBe('not-admin');
        expect(call({ a: 'send', uid: joined.uid, pt: 'wrong_wrong_wrong_wrong', c: 'ABC23', box: 'up', v: 1 }).e).toBe('denied');
        expect(call({ a: 'recv', admin: claim.admin, c: 'ZZZ99', box: 'up', since: '0' }).e).toBe('no-session');

        expect(call({ a: 'end', admin: claim.admin, c: 'ABC23' }).ok).toBe(true);
        expect(call({ a: 'recv', admin: claim.admin, c: 'ABC23', box: 'up', since: '0' }).e).toBe('no-session');
    });
    it('assembles chunked pack uploads and serves sliced downloads behind the pack secret', () => {
        const { call, driveFiles } = makeGsSandbox();
        const admin = call({ a: 'claim' }).admin;
        const id = 'PK-12345678-1234-1234-1234-123456789012';
        const PK = 'p_secret_p_secret_20';
        expect(call({ a: 'putpack', id, k: PK, part: 1, of: 2, data: 'AAA' }).e).toBe('not-admin');
        expect(call({ a: 'putpack', admin, id, k: PK, part: 1, of: 2, data: 'AAA' }).ok).toBe(true);
        const fin = call({ a: 'putpack', admin, id, k: PK, part: 2, of: 2, data: 'BBB', title: 'Cells unit' });
        expect(fin.ok).toBe(true);
        expect(fin.chars).toBe(6);
        expect(driveFiles.has('pack-' + id + '.json')).toBe(true);
        expect(JSON.parse(driveFiles.get('pack-' + id + '.json')).data).toBeUndefined();
        expect(driveFiles.has('pack-' + id + '-1.txt')).toBe(true);
        const got = call({ a: 'getpack', id, k: PK, part: 1 });
        expect(got.data).toBe('AAABBB');
        expect(got.of).toBe(1);
        expect(got.title).toBe('Cells unit');
        expect(call({ a: 'getpack', id, k: 'wrong_wrong_wrong_20', part: 1 }).e).toBe('denied');
        expect(call({ a: 'getpack', id: 'PK-00000000-0000-0000-0000-000000000000', k: PK }).e).toBe('no-pack');
        expect(call({ a: 'delpack', admin, id }).ok).toBe(true);
        expect(call({ a: 'getpack', id, k: PK }).e).toBe('no-pack');
    });
});

function sliceBetween(startMarker, endMarker) {
    const start = anti.indexOf(startMarker);
    const end = anti.indexOf(endMarker, start);
    if (start === -1 || end === -1) throw new Error(`markers not found: ${startMarker} .. ${endMarker}`);
    return anti.slice(start, end);
}

const helperSource = sliceBetween('function _alloBase64UrlEncode(value)', 'function _alloValidFirebaseConfig(config)');

function buildClientHelpers({ windowObj, fetchImpl, configuredBase = 'https://alloflow-cdn.pages.dev/app/' } = {}) {
    const factory = new Function(
        'window', 'fetch', '_alloGetConfiguredStudentBaseUrl', '_alloShareHostIsNotStudentReachable',
        helperSource + `;
        return { _alloCleanMailboxUrl, _alloMailboxCall, _alloSplitPackChunks, _alloReadMailboxEntryParam,
                 _buildAlloMailboxEntryUrl, _alloRandomToken, _alloBase64UrlEncode,
                 _alloMailboxCallWithRetry, _alloNextPollDelay, _alloCollectResChunk, _alloWaitIceComplete };`
    );
    return factory(windowObj, fetchImpl, () => configuredBase, () => false);
}

describe('ANTI mailbox client helpers', () => {
    it('accepts only https Apps Script hosts', () => {
        const H = buildClientHelpers({});
        expect(H._alloCleanMailboxUrl('https://script.google.com/macros/s/ABC/exec')).toContain('script.google.com');
        expect(H._alloCleanMailboxUrl('http://script.google.com/macros/s/ABC/exec')).toBe('');
        expect(H._alloCleanMailboxUrl('https://evil.example.com/exec')).toBe('');
        expect(H._alloCleanMailboxUrl('')).toBe('');
    });

    it('round-trips the join handoff through build + read', () => {
        const H = buildClientHelpers({ windowObj: { location: { href: 'https://x.test/', search: '', hash: '' } } });
        const url = H._buildAlloMailboxEntryUrl('allo_mb', { u: 'https://script.google.com/macros/s/ABC/exec', c: 'ABC23', k: 'k_secret_k_secret_20' });
        expect(url.startsWith('https://alloflow-cdn.pages.dev/app/?')).toBe(true);
        expect(url).toContain('allo_ai=off');
        const search = new URL(url).search;
        const reader = buildClientHelpers({ windowObj: { location: { href: url, search, hash: '' } } });
        const entry = reader._alloReadMailboxEntryParam('allo_mb');
        expect(entry.c).toBe('ABC23');
        expect(entry.k).toBe('k_secret_k_secret_20');
        expect(entry.u).toContain('script.google.com');
    });

    it('_alloMailboxCall posts preflight-free text/plain and surfaces server error codes', async () => {
        const calls = [];
        const okFetch = async (url, opts) => { calls.push({ url, opts }); return { status: 200, text: async () => JSON.stringify({ ok: true, i: 7 }) }; };
        const H = buildClientHelpers({ fetchImpl: okFetch });
        const res = await H._alloMailboxCall('https://script.google.com/macros/s/A/exec', { a: 'send' });
        expect(res.i).toBe(7);
        expect(calls[0].opts.method).toBe('POST');
        expect(calls[0].opts.headers['Content-Type']).toContain('text/plain');
        expect(Object.keys(calls[0].opts.headers)).toEqual(['Content-Type']);
        const errFetch = async () => ({ status: 200, text: async () => JSON.stringify({ ok: false, e: 'no-session' }) });
        const H2 = buildClientHelpers({ fetchImpl: errFetch });
        await expect(H2._alloMailboxCall('https://script.google.com/macros/s/A/exec', { a: 'recv' })).rejects.toMatchObject({ code: 'allo/mailbox-no-session' });
    });

    it('splits and rejoins chunks losslessly', () => {
        const H = buildClientHelpers({});
        const text = 'x'.repeat(150000) + 'END';
        const parts = H._alloSplitPackChunks(text, 60000);
        expect(parts.length).toBe(3);
        expect(parts.join('')).toBe(text);
    });
});

describe('Code.gs hardening (v2)', () => {
    it("'auth' verifies admin tokens without protocol side effects", () => {
        const { call } = makeGsSandbox();
        expect(call({ a: 'auth', admin: 'whatever' })).toMatchObject({ ok: true, admin: false, claimed: false });
        const claim = call({ a: 'claim' });
        expect(call({ a: 'auth', admin: 'wrong-token' })).toMatchObject({ ok: true, admin: false, claimed: true });
        expect(call({ a: 'auth', admin: claim.admin })).toMatchObject({ ok: true, admin: true, claimed: true });
    });

    it('backs the admin token up as a Drive note at claim and refreshes it on auth (v3)', () => {
        const { call, driveFiles } = makeGsSandbox();
        const noteName = 'ADMIN-TOKEN (do not share).txt';
        const claim = call({ a: 'claim' });
        expect(driveFiles.has(noteName)).toBe(true);
        expect(driveFiles.get(noteName)).toContain(claim.admin);
        // Wrong token must NOT rewrite the note; valid auth refreshes it.
        driveFiles.delete(noteName);
        call({ a: 'auth', admin: 'wrong-token' });
        expect(driveFiles.has(noteName)).toBe(false);
        call({ a: 'auth', admin: claim.admin });
        expect(driveFiles.get(noteName)).toContain(claim.admin);
    });

    it('survives cache eviction of the session marker via the durable Properties fallback (v4)', () => {
        const { call, gs, driveFiles, ...rest } = makeGsSandbox();
        const K = 'k_secret_k_secret_20';
        const admin = call({ a: 'claim' }).admin;
        expect(call({ a: 'open', admin, c: 'EVICT', k: K }).ok).toBe(true);
        const joined = call({ a: 'join', c: 'EVICT', k: K });
        expect(call({ a: 'send', uid: joined.uid, pt: joined.pt, c: 'EVICT', box: 'up', v: { kind: 'student', name: 'A' } }).ok).toBe(true);
        // Simulate CacheService eviction of the marker mid-class.
        gs.handle({ a: 'noop' }); // no-op to keep shape; eviction below
        rest.cacheStore.delete('s:EVICT');
        expect(call({ a: 'recv', admin, c: 'EVICT', box: 'up', since: '0' }).ok).toBe(true);
        // Rewarmed: marker is back in cache.
        expect(rest.cacheStore.has('s:EVICT')).toBe(true);
        // 'end' clears the durable copy too — session stays dead.
        expect(call({ a: 'end', admin, c: 'EVICT' }).ok).toBe(true);
        rest.cacheStore.delete('s:EVICT');
        expect(call({ a: 'recv', admin, c: 'EVICT', box: 'up', since: '0' }).e).toBe('no-session');
    });

    it("'mysessions' returns the admin's open sessions for server-side resume (v5)", () => {
        const { call } = makeGsSandbox();
        const K1 = 'k_one_k_one_k_one_20';
        const K2 = 'k_two_k_two_k_two_20';
        expect(call({ a: 'mysessions', admin: 'nope' }).e).toBe('not-admin');
        const admin = call({ a: 'claim' }).admin;
        expect(call({ a: 'mysessions', admin }).sessions).toEqual([]);
        call({ a: 'open', admin, c: 'ROOM1', k: K1 });
        call({ a: 'open', admin, c: 'ROOM2', k: K2 });
        const mine = call({ a: 'mysessions', admin });
        expect(mine.ok).toBe(true);
        const codes = mine.sessions.map(s => s.c).sort();
        expect(codes).toEqual(['ROOM1', 'ROOM2']);
        // Secrets are returned (caller proved admin) so the client can resume.
        expect(mine.sessions.find(s => s.c === 'ROOM1').k).toBe(K1);
        // Ended sessions drop off the list.
        call({ a: 'end', admin, c: 'ROOM1' });
        expect(call({ a: 'mysessions', admin }).sessions.map(s => s.c)).toEqual(['ROOM2']);
    });

    it('purges replay messages when a code is ended and later reused', () => {
        const { call } = makeGsSandbox();
        const admin = call({ a: 'claim' }).admin;
        const secret = 'reused_secret_reused_20';
        call({ a: 'open', admin, c: 'REUSE', k: secret });
        call({ a: 'send', admin, c: 'REUSE', box: 'down', v: { kind: 'end', stale: true } });
        call({ a: 'end', admin, c: 'REUSE' });
        call({ a: 'open', admin, c: 'REUSE', k: secret });
        const joined = call({ a: 'join', c: 'REUSE', k: secret });
        const fresh = call({ a: 'recv', uid: joined.uid, pt: joined.pt, c: 'REUSE', box: 'down', since: '0' });
        expect(fresh.b.down.m).toEqual([]);
        expect(fresh.b.down.latest).toBe(0);
    });
    it('rotates the admin token safely and closes active sessions only with explicit force', () => {
        const { call } = makeGsSandbox();
        const admin = call({ a: 'claim' }).admin;
        call({ a: 'open', admin, c: 'ROTAT', k: 'rotate_secret_rotate_20' });
        expect(call({ a: 'rotateadmin', admin }).e).toBe('sessions-active');
        const rotated = call({ a: 'rotateadmin', admin, force: true });
        expect(rotated.ok).toBe(true);
        expect(rotated.admin).not.toBe(admin);
        expect(call({ a: 'auth', admin })).toMatchObject({ ok: true, admin: false });
        expect(call({ a: 'auth', admin: rotated.admin })).toMatchObject({ ok: true, admin: true });
        expect(call({ a: 'join', c: 'ROTAT', k: 'rotate_secret_rotate_20' }).e).toBe('no-session');
    });
    it('caps participant writes independently and bounds message cache slots', () => {
        const { call, cacheStore } = makeGsSandbox();
        const K = 'k_secret_k_secret_20';
        const admin = call({ a: 'claim' }).admin;
        expect(call({ a: 'open', admin, c: 'FLOOD', k: K }).ok).toBe(true);
        const joined = call({ a: 'join', c: 'FLOOD', k: K });
        for (let i = 0; i < 120; i += 1) {
            expect(call({ a: 'send', uid: joined.uid, pt: joined.pt, c: 'FLOOD', box: 'up', v: { kind: 'student', name: 'A' } }).ok).toBe(true);
        }
        expect(call({ a: 'send', uid: joined.uid, pt: joined.pt, c: 'FLOOD', box: 'up', v: { kind: 'student', name: 'A' } }).e).toBe('rate-limited');
        for (let i = 0; i < 300; i += 1) {
            expect(call({ a: 'send', admin, c: 'FLOOD', box: 'down', v: i }).ok).toBe(true);
        }
        const slots = [...cacheStore.keys()].filter(k => k.startsWith('m:FLOOD:down:'));
        expect(slots.length).toBeLessThanOrEqual(240);
    });
});

describe('resilience helpers', () => {
    it('retry wrapper retries transient failures and never retries protocol denials', async () => {
        let flaky = 0;
        const flakyFetch = async () => {
            flaky += 1;
            if (flaky < 3) return { status: 200, text: async () => JSON.stringify({ ok: false, e: 'busy' }) };
            return { status: 200, text: async () => JSON.stringify({ ok: true, i: 1 }) };
        };
        const H = buildClientHelpers({ fetchImpl: flakyFetch });
        const res = await H._alloMailboxCallWithRetry('https://script.google.com/macros/s/A/exec', { a: 'send' }, 3, 1);
        expect(res.i).toBe(1);
        expect(flaky).toBe(3);
        let denialCalls = 0;
        const denialFetch = async () => { denialCalls += 1; return { status: 200, text: async () => JSON.stringify({ ok: false, e: 'denied' }) }; };
        const H2 = buildClientHelpers({ fetchImpl: denialFetch });
        await expect(H2._alloMailboxCallWithRetry('https://script.google.com/macros/s/A/exec', { a: 'send' }, 3, 1)).rejects.toMatchObject({ code: 'allo/mailbox-denied' });
        expect(denialCalls).toBe(1);
    });

    it('poll-delay policy: hidden parks, errors back off capped, idle stretches, jitter bounded', () => {
        const H = buildClientHelpers({});
        expect(H._alloNextPollDelay({ hidden: true })).toBe(5000);
        expect(H._alloNextPollDelay({ errorCount: 1 })).toBe(5000);
        expect(H._alloNextPollDelay({ errorCount: 3 })).toBe(15000);
        expect(H._alloNextPollDelay({ errorCount: 9 })).toBe(15000);
        for (let i = 0; i < 20; i += 1) {
            const active = H._alloNextPollDelay({});
            expect(active).toBeGreaterThanOrEqual(2250);
            expect(active).toBeLessThanOrEqual(2750);
            const idle = H._alloNextPollDelay({ idleMs: 300000 });
            expect(idle).toBeGreaterThanOrEqual(3600);
            expect(idle).toBeLessThanOrEqual(4400);
        }
    });

    it('chunk fold assembles once and dedups replayed rids across transports', () => {
        const H = buildClientHelpers({});
        const store = { parts: {}, applied: new Set() };
        expect(H._alloCollectResChunk(store, { kind: 'res', rid: 'r1', part: 1, of: 2, data: 'AA' })).toBe(null);
        expect(H._alloCollectResChunk(store, { kind: 'res', rid: 'r1', part: 2, of: 2, data: 'BB' })).toBe('AABB');
        // Mailbox replay of the same rid after the channel already delivered it.
        expect(H._alloCollectResChunk(store, { kind: 'res', rid: 'r1', part: 1, of: 2, data: 'AA' })).toBe(null);
        expect(H._alloCollectResChunk(store, { kind: 'res', rid: 'r1', part: 2, of: 2, data: 'BB' })).toBe(null);
        expect(H._alloCollectResChunk(store, { kind: 'student' })).toBe(null);
    });

    it('ICE-complete wait resolves on completion and on timeout', async () => {
        const H = buildClientHelpers({});
        let listener = null;
        const pc = {
            iceGatheringState: 'gathering',
            addEventListener: (_, cb) => { listener = cb; },
            removeEventListener: () => {},
        };
        const done = H._alloWaitIceComplete(pc, 5000);
        pc.iceGatheringState = 'complete';
        listener();
        await expect(done).resolves.toBeUndefined();
        const stuck = { iceGatheringState: 'gathering', addEventListener: () => {}, removeEventListener: () => {} };
        await expect(H._alloWaitIceComplete(stuck, 30)).resolves.toBeUndefined();
    });
});

describe('ANTI wiring pins', () => {
    it('student mailbox entries never touch Firebase', () => {
        const live = sliceBetween('// Mailbox live-session student entry', '// Mailbox-hosted homework entry');
        expect(live).toMatch(/__alloInstallQrStudentAiGuard/);
        expect(live).not.toMatch(/_alloEnsureAuthenticatedUser|getDoc|doc\(db|onSnapshot/);
        const hosted = sliceBetween('// Mailbox-hosted homework entry', "if (activeView === 'adventure'");
        expect(hosted).toMatch(/getpack/);
        expect(hosted).toMatch(/setPendingQrAssignmentResource\(firstResource\)/);
        expect(hosted).not.toMatch(/_alloEnsureAuthenticatedUser|getDoc|doc\(db|onSnapshot/);
    });

    it('live-session transport chooser, hosted-QR button, and hand-raise are wired', () => {
        expect(anti).toMatch(/Start live session/);
        expect(anti).toMatch(/Standard live session/);
        expect(anti).toMatch(/Class Mailbox QR session/);
        expect(anti).toMatch(/Connect & self-test/);
        expect(anti).not.toMatch(/Push current resource to class/);
        expect(anti).toMatch(/Host on Class Mailbox \(small QR, images OK\)/);
        expect(anti).toMatch(/aria-label=\{mbHandUp \? 'Lower hand' : 'Raise hand'\}/);
        // Hosted variant renders without QR suppression and with the Drive note.
        expect(anti).toMatch(/assignment-pack-hosted/);
        expect(anti).toMatch(/AlloFlow Class Mailbox" Drive folder/);
        expect(anti).toMatch(/isMailboxSession=\{!!mbLive\}/);
        expect(anti).toMatch(/mailboxJoinUrl=\{mbLive\?\.joinUrl \|\| ''\}/);
        expect(anti).toMatch(/onEndMailboxSession=\{mbLive \? endMailboxLiveSession : null\}/);
    });

    it('open/putpack are admin-gated in Code.gs and boxes are restricted to up/down', () => {
        expect(gsSource).toMatch(/a === 'open'[\s\S]{0,80}not-admin/);
        expect(gsSource).toMatch(/a === 'putpack'[\s\S]{0,120}not-admin/);
        expect(gsSource).toMatch(/b === 'up' \|\| b === 'down'/);
    });

    it('backend-free boot: empty-env shell falls back to a valid-shaped placeholder config', () => {
        // Root cause pin: getFirestore() throws at module scope when projectId
        // is empty, freezing the whole app for #allo_pack / ?allo_mb /
        // ?allo_mbp / bare-landing entries (the only ones without allo_fb).
        expect(anti).toMatch(/ALLO_FIREBASE_PLACEHOLDER_CONFIG = Object\.freeze/);
        expect(anti).toMatch(/_alloValidFirebaseConfig\(_alloEnvFirebaseConfig\) \? _alloEnvFirebaseConfig : ALLO_FIREBASE_PLACEHOLDER_CONFIG/);
        // Anything that actually needs Firebase reports a precise code…
        expect(anti).toMatch(/allo\/no-backend-configured/);
        // …and auth/data-provider bootstraps are skipped, not error-spammed.
        expect(anti).toMatch(/!_alloQrFirebaseHandoffRequiredButMissing && !_alloFirebaseIsPlaceholder\) _initAlloData\(\)/);
        expect(anti).toMatch(/Firebase auth skipped: no backend configured/);
        // The placeholder must satisfy the same shape check the handoff uses.
        const start = anti.indexOf('const ALLO_FIREBASE_PLACEHOLDER_CONFIG');
        const block = anti.slice(start, anti.indexOf('});', start));
        expect(block).toMatch(/apiKey: '[^']+'/);
        expect(block).toMatch(/projectId: '[^']+'/);
        expect(block).toMatch(/appId: '[^']+'/);
    });

    it('hardening + real-time wiring is present on both sides', () => {
        // Teacher: token UX, RTC answerer, dual-path push, staleness UI.
        expect(anti).toMatch(/Admin token — save it like a password/);
        expect(anti).toMatch(/Admin token \(only when reconnecting from a new device\)/);
        expect(anti).toMatch(/answerRtcOffer/);
        expect(anti).toMatch(/ondatachannel/);
        expect(anti).toMatch(/instant, ' \+ Math\.max\(0, total - rtcCount\) \+ ' via mailbox/);
        expect(anti).toMatch(/· away\?/);
        expect(anti).toMatch(/real-time ⚡/);
        // Student: heartbeat, visibility handling, RTC offerer with retry cap,
        // channel-first presence, shared dedup store.
        expect(anti).toMatch(/Date\.now\(\) - lastAnnounce > 60000/);
        const visibilityCount = (anti.match(/visibilitychange/g) || []).length;
        expect(visibilityCount).toBeGreaterThanOrEqual(4); // add+remove on both loops
        expect(anti).toMatch(/pc\.createDataChannel\('allo'\)/);
        // v4: capped-backoff retry-forever replaced the old 4-try cap.
        expect(anti).toMatch(/Math\.min\(15000 \* Math\.pow\(2/);
        expect(anti).toMatch(/applyMbDownPayload/);
        expect(anti).toMatch(/_alloCollectResChunk\(store, v\)/);
        // Poll cadence: slower base while the channel is open.
        expect(anti).toMatch(/rtcOpen \? 8000 : ALLO_MB_POLL_MS/);
    });

    it('live sessions host a durable pack + advertise packRef, and students getpack-heal it', () => {
        // Teacher publishes a tiny pointer to a putpack-hosted full pack (the
        // durable data.resources analogue that makes the mailbox self-healing).
        expect(anti).toContain('await updateDoc(sessionRef, { packRef: { id, k, n: candidates.length, t: Date.now() } });');
        expect(anti).toContain("a: 'putpack', admin: mbConfig.admin, id, k, part: i + 1, of: parts.length, title: 'Live pack', data: parts[i]");
        // Student self-heal branch reassembles the full set from packRef via getpack.
        expect(anti).toContain('} else if (data.packRef && data.packRef.id && _alloMbBridgeActive()) {');
        expect(anti).toContain("a: 'getpack', id: data.packRef.id, k: data.packRef.k, part");
        // Large homework packs route to the mailbox host instead of dead-ending.
        expect(anti).toContain('return hostPackOnMailboxRef.current ? hostPackOnMailboxRef.current() : null;');
        // The offline-history loader no longer clobbers a joining live student.
        expect(anti).toContain('if (!isTeacherMode && (activeSessionCode || _alloMbBridgeActive() || _qrLiveStudent)) {');
    });
});
