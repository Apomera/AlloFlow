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
        PropertiesService: { getScriptProperties: () => ({ getProperty: k => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => props.set(k, String(v)) }) },
        LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
        ContentService: (() => {
            const svc = { MimeType: { JSON: 'json' } };
            svc.createTextOutput = s => { const o = { _c: s, setMimeType: () => o, getContent: () => o._c }; return o; };
            return svc;
        })(),
        DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => folder }), createFolder: () => folder },
        Utilities: { getUuid: () => `aaaaaaaa-bbbb-cccc-dddd-${String(uuidCounter++).padStart(12, '0')}` },
    };
    const factory = new Function(...Object.keys(services), gsSource + '; return { handle: handle, doGet: doGet, doPost: doPost };');
    const gs = factory(...Object.values(services));
    return { call: p => JSON.parse(gs.handle(p).getContent()), gs, driveFiles };
}

describe('Code.gs protocol (real source, mocked Google services)', () => {
    it('runs the full live-session lifecycle with capability checks', () => {
        const { call } = makeGsSandbox();
        const K = 'k_secret_k_secret_20';
        expect(call({ a: 'hello' }).ok).toBe(true);
        const claim = call({ a: 'claim' });
        expect(claim.ok).toBe(true);
        expect(claim.admin.length).toBeGreaterThanOrEqual(32);
        expect(call({ a: 'claim' }).e).toBe('claimed');
        expect(call({ a: 'open', c: 'ABC23', k: K }).e).toBe('not-admin');
        expect(call({ a: 'open', admin: claim.admin, c: 'ABC23', k: K }).ok).toBe(true);
        const sent = call({ a: 'send', c: 'ABC23', k: K, from: 'mb-1', box: 'up', v: { kind: 'student', uid: 'mb-1', name: 'Ada', hand: true } });
        expect(sent.i).toBe(1);
        const recv = call({ a: 'recv', c: 'ABC23', k: K, box: 'up', since: '0' });
        expect(recv.b.up.m.length).toBe(1);
        expect(recv.b.up.m[0][1].v.name).toBe('Ada');
        expect(recv.b.up.n).toBe(1);
        // Cursor advances: nothing new on second poll.
        expect(call({ a: 'recv', c: 'ABC23', k: K, box: 'up', since: String(recv.b.up.n) }).b.up.m.length).toBe(0);
        // Capability checks.
        expect(call({ a: 'recv', c: 'ABC23', k: 'x_wrong_x_wrong_x_20', box: 'up', since: '0' }).e).toBe('denied');
        expect(call({ a: 'send', c: 'ABC23', k: K, box: 'sig', v: 1 }).e).toBe('bad-box');
        expect(call({ a: 'recv', c: 'ZZZ99', k: K, box: 'up', since: '0' }).e).toBe('no-session');
        // End tears down.
        expect(call({ a: 'end', c: 'ABC23', k: K }).ok).toBe(true);
        expect(call({ a: 'recv', c: 'ABC23', k: K, box: 'up', since: '0' }).e).toBe('no-session');
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
                 _buildAlloMailboxEntryUrl, _alloRandomToken, _alloBase64UrlEncode };`
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

    it('teacher panel, hosted-QR button, and hand-raise are wired', () => {
        expect(anti).toMatch(/Live class without accounts/);
        expect(anti).toMatch(/Connect & self-test/);
        expect(anti).toMatch(/Push current resource to class/);
        expect(anti).toMatch(/Host on Class Mailbox \(small QR, images OK\)/);
        expect(anti).toMatch(/aria-label=\{mbHandUp \? 'Lower hand' : 'Raise hand'\}/);
        // Hosted variant renders without QR suppression and with the Drive note.
        expect(anti).toMatch(/assignment-pack-hosted/);
        expect(anti).toMatch(/AlloFlow Class Mailbox" Drive folder/);
    });

    it('open/putpack are admin-gated in Code.gs and boxes are restricted to up/down', () => {
        expect(gsSource).toMatch(/a === 'open'[\s\S]{0,80}not-admin/);
        expect(gsSource).toMatch(/a === 'putpack'[\s\S]{0,120}not-admin/);
        expect(gsSource).toMatch(/b === 'up' \|\| b === 'down'/);
    });
});
