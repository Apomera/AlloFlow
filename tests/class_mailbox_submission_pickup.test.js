// Class Mailbox v29 submission pickup: the owner's AlloFlow lists, downloads
// and marks submission files instead of the teacher downloading them from
// Drive by hand. Runs the REAL Code.gs with mocked Google services.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gsSource = fs.readFileSync(path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs'), 'utf8');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');

function makeSandbox({ searchThrows = false } = {}) {
    const cacheStore = new Map();
    const props = new Map();
    const driveFiles = new Map();
    // Hand-made files are dated 2020, before anything the script indexes now.
    let clock = 1_600_000_000_000;
    let uuidCounter = 0;
    const cache = {
        get: k => (cacheStore.has(k) ? cacheStore.get(k) : null),
        put: (k, v) => { cacheStore.set(k, String(v)); },
        getAll: keys => { const o = {}; keys.forEach(k => { if (cacheStore.has(k)) o[k] = cacheStore.get(k); }); return o; },
        remove: k => { cacheStore.delete(k); },
    };
    const fileObj = name => ({
        getName: () => name,
        getDateCreated: () => new Date(driveFiles.get(name).created),
        setContent: c => { driveFiles.get(name).content = String(c); },
        getBlob: () => ({ getDataAsString: () => driveFiles.get(name).content }),
        setTrashed: () => { driveFiles.delete(name); },
    });
    const iter = names => { let i = 0; return { hasNext: () => i < names.length, next: () => fileObj(names[i++]) }; };
    const folder = {
        getFilesByName: name => iter(driveFiles.has(name) ? [name] : []),
        getFiles: () => iter([...driveFiles.keys()]),
        searchFiles: query => {
            if (searchThrows) throw new Error('search unavailable');
            expect(query).toContain('submission-');
            return iter([...driveFiles.keys()].filter(n => n.includes('submission-')));
        },
        createFile: (name, content) => { driveFiles.set(name, { content: String(content), created: clock++ }); return fileObj(name); },
    };
    const services = {
        Session: { getActiveUser: () => ({ getEmail: () => 'owner@example.test' }), getEffectiveUser: () => ({ getEmail: () => 'owner@example.test' }) },
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
    const factory = new Function(...Object.keys(services), gsSource + '; return { handle: handle, setupMailboxOwner: setupMailboxOwner };');
    const gs = factory(...Object.values(services));
    const call = p => JSON.parse(gs.handle(p).getContent());
    gs.setupMailboxOwner();
    return { call, admin: props.get('admin'), driveFiles, folder };
}

const PACK = 'PK-11111111-2222-3333-4444-555555555555';
const PACK_K = 'k_secret_k_secret_20';
const sid = n => 'SUB-00000000-0000-0000-0000-' + String(n).padStart(12, '0');

function submit(call, n, body) {
    const data = JSON.stringify(body);
    const size = 60000;
    const parts = Math.max(1, Math.ceil(data.length / size));
    let last;
    for (let part = 1; part <= parts; part++) {
        last = call({ a: 'putsubmission', id: PACK, k: PACK_K, sid: sid(n), part, of: parts, data: data.slice((part - 1) * size, part * size) });
    }
    return last;
}

function fetchWhole(call, admin, n) {
    let text = '';
    let of = 1;
    for (let part = 1; part <= of; part++) {
        const r = call({ a: 'getsubmission', admin, n, part });
        expect(r.ok).toBe(true);
        of = r.of;
        text += r.data;
    }
    return { text, of };
}

describe('Class Mailbox v29 submission pickup', () => {
    it('lists, downloads and marks submissions, including files saved before v29', () => {
        const { call, admin, driveFiles, folder } = makeSandbox();
        expect(call({ a: 'hello' }).v).toBe(29);
        // A file an older script saved, with no index yet.
        folder.createFile('submission-Old_Kid-20260101-000000-aaaaaaaa.json', JSON.stringify({ studentName: 'Old Kid', kind: 'alloflow-student-submission' }));
        expect(call({ a: 'putpack', admin, id: PACK, k: PACK_K, part: 1, of: 1, title: 'T', expiresAt: new Date(Date.now() + 864e5).toISOString(), activities: [], data: '{}' }).ok).toBe(true);

        const big = { studentName: 'Ana', kind: 'alloflow-take-home-submission', takeHomeResult: { pad: 'x'.repeat(200000) } };
        const receipt = submit(call, 1, big);
        expect(receipt.ok).toBe(true);
        // A retried final part answers from the cached receipt: no second entry.
        expect(submit(call, 1, big).filename).toBe(receipt.filename);
        submit(call, 2, { studentName: 'Ben', kind: 'alloflow-take-home-submission', takeHomeResult: {} });

        const list = call({ a: 'listsubmissions', admin });
        expect(list.ok).toBe(true);
        expect(list.complete).toBe(true);
        const names = list.items.map(i => i.n);
        expect(names).toHaveLength(3);
        expect(names).toContain('submission-Old_Kid-20260101-000000-aaaaaaaa.json');
        expect(names[0]).toMatch(/^submission-Ben-/);
        const ana = list.items.find(i => /Ana/.test(i.n));
        expect(ana).toMatchObject({ kind: 'homework', src: PACK, got: 0 });
        // Pack files, chunk files and the admin-token note are never listed.
        expect(names.every(n => /^submission-/.test(n))).toBe(true);
        expect(driveFiles.has('submissions-index.json')).toBe(true);

        const whole = fetchWhole(call, admin, ana.n);
        expect(whole.of).toBeGreaterThan(1);
        const parsed = JSON.parse(whole.text);
        expect(parsed.studentName).toBe('Ana');
        expect(parsed.takeHomeResult.pad).toHaveLength(200000);
        expect(parsed.mailboxReceipt).toMatchObject({ sourceKind: 'homework', sourceId: PACK });

        expect(call({ a: 'marksubmissions', admin, names: [ana.n, 'submission-Old_Kid-20260101-000000-aaaaaaaa.json', '../evil'] }).marked).toBe(2);
        const fresh = call({ a: 'listsubmissions', admin });
        expect(fresh.items.map(i => i.n)).toEqual([names[0]]);
        const all = call({ a: 'listsubmissions', admin, all: true });
        expect(all.items).toHaveLength(3);
        expect(all.items.find(i => i.n === ana.n).got).toBeGreaterThan(0);
        // Marking is not deletion.
        expect(driveFiles.has(ana.n)).toBe(true);
    });

    it('requires the admin token and reads only submission files', () => {
        const { call, admin, folder } = makeSandbox();
        folder.createFile('pack-' + PACK + '.json', JSON.stringify({ k: PACK_K }));
        folder.createFile('ADMIN-TOKEN (do not share).txt', admin);
        folder.createFile('submission-A-1-bbbbbbbb.json', '{"studentName":"A"}');
        for (const a of ['listsubmissions', 'getsubmission', 'marksubmissions']) {
            expect(call({ a, n: 'submission-A-1-bbbbbbbb.json', names: [] }).e).toBe('not-admin');
            expect(call({ a, admin: 'wrong-token', n: 'submission-A-1-bbbbbbbb.json', names: [] }).e).toBe('not-admin');
        }
        for (const n of ['pack-' + PACK + '.json', 'ADMIN-TOKEN (do not share).txt', 'submissions-index.json', 'submission-../x.json', 'submission-A.json/../x', '']) {
            expect(call({ a: 'getsubmission', admin, n }).e).toBe('bad-request');
        }
        expect(call({ a: 'getsubmission', admin, n: 'submission-missing.json' }).e).toBe('no-file');
        expect(call({ a: 'getsubmission', admin, n: 'submission-A-1-bbbbbbbb.json', part: 2 }).e).toBe('bad-part');
        expect(call({ a: 'getsubmission', admin, n: 'submission-A-1-bbbbbbbb.json' }).data).toBe('{"studentName":"A"}');
    });

    it('falls back to a full folder walk when Drive search is unavailable', () => {
        const { call, admin, folder } = makeSandbox({ searchThrows: true });
        folder.createFile('pack-' + PACK + '-1.txt', 'chunk');
        folder.createFile('submission-B-2-cccccccc.json', '{"studentName":"B"}');
        const list = call({ a: 'listsubmissions', admin });
        expect(list.items.map(i => i.n)).toEqual(['submission-B-2-cccccccc.json']);
        // Later files dropped into Drive by hand show up after a rescan.
        folder.createFile('submission-C-3-dddddddd.json', '{"studentName":"C"}');
        expect(call({ a: 'listsubmissions', admin }).items).toHaveLength(1);
        expect(call({ a: 'listsubmissions', admin, rescan: true }).items).toHaveLength(2);
    });
});

// The REAL host hook from AlloFlowANTI.txt, talking to the REAL Code.gs.
function loadHook(handler, connection) {
    const start = anti.indexOf('      const call = payload => _alloMailboxCallWithRetry(connection.url');
    const end = anti.indexOf('      return () => { try { delete window.__alloMailboxSubmissions', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const win = {};
    const transport = async (url, payload) => {
        expect(url).toBe(connection.url);
        const res = handler(JSON.parse(JSON.stringify(payload)));
        if (!res || res.ok !== true) { const err = new Error('Mailbox error: ' + (res && res.e)); err.code = 'allo/mailbox-' + (res && res.e); throw err; }
        return res;
    };
    new Function('window', 'connection', 'ready', '_alloMailboxCallWithRetry', 'setMbPanelOpen', anti.slice(start, end))(
        win, connection, !!(connection && connection.url && connection.admin), transport, () => { win.setupOpened = true; });
    return win;
}

describe('host submission pickup hook', () => {
    it('pulls new files whole, skips ones the inbox has, and marks what it is told to', async () => {
        const { call, admin } = makeSandbox();
        expect(call({ a: 'putpack', admin, id: PACK, k: PACK_K, part: 1, of: 1, title: 'T', expiresAt: new Date(Date.now() + 864e5).toISOString(), activities: [], data: '{}' }).ok).toBe(true);
        const ana = submit(call, 1, { studentName: 'Ana', kind: 'alloflow-take-home-submission', takeHomeResult: { pad: 'y'.repeat(320000) } }).filename;
        const ben = submit(call, 2, { studentName: 'Ben', kind: 'alloflow-take-home-submission', takeHomeResult: {} }).filename;
        const seen = [];
        const win = loadHook(p => { seen.push(p.a); return call(p); }, { url: 'https://script.google.com/macros/s/X/exec', admin });
        const api = win.__alloMailboxSubmissions;
        expect(api.connected).toBe(true);

        const progress = [];
        const first = await api.pull({ skip: [ben], onProgress: (i, n) => progress.push([i, n]) });
        expect(first).toMatchObject({ ok: true, failed: [], more: 0, complete: true, skipped: 1 });
        expect(first.files.map(f => f.name)).toEqual([ana]);
        expect(JSON.parse(first.files[0].text).takeHomeResult.pad).toHaveLength(320000);
        expect(seen.filter(a => a === 'getsubmission').length).toBe(3);
        expect(progress).toEqual([[0, 1]]);

        expect((await api.mark([ana])).marked).toBe(1);
        const second = await api.pull({});
        expect(second.files.map(f => f.name)).toEqual([ben]);
        const all = await api.pull({ all: true, skip: [ben] });
        expect(all.files.map(f => f.name)).toEqual([ana]);
        expect(await api.mark([])).toMatchObject({ ok: true, marked: 0 });
    });

    it('reports an outdated script without calling anything it lacks, and a missing connection', async () => {
        const seen = [];
        const old = loadHook(p => { seen.push(p.a); return p.a === 'hello' ? { ok: true, v: 28 } : { ok: false, e: 'bad-action' }; },
            { url: 'https://script.google.com/macros/s/X/exec', admin: 'tok' }).__alloMailboxSubmissions;
        expect(await old.pull({})).toEqual({ ok: false, e: 'update-needed', v: 28 });
        expect(seen).toEqual(['hello']);
        const none = loadHook(() => ({ ok: true }), null);
        expect(none.__alloMailboxSubmissions.connected).toBe(false);
        expect(await none.__alloMailboxSubmissions.pull({})).toEqual({ ok: false, e: 'not-connected' });
        none.__alloMailboxSubmissions.openSetup();
        expect(none.setupOpened).toBe(true);
    });
});
