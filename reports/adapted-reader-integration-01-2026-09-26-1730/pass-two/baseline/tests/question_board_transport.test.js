// Phase 5 — the PRODUCTION transport, end to end against the real server.
//
// Every earlier board test used a double. This one loads the actual
// apps_script/session_mailbox/Code.gs with mocked Google services, hosts a real
// assignment pack containing a real question_board activity, and points the
// real question_board_transport_module.js at it. Nothing between the student's
// text and Drive is simulated except Google itself.
//
// What this is designed to catch is the class of bug that unit tests on either
// side cannot see: the two halves each behaving correctly while disagreeing
// about the payload between them.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gsSource = fs.readFileSync(path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs'), 'utf8');

const C = require(path.join(ROOT, 'question_board_contract_module.js'));
const T = require(path.join(ROOT, 'question_board_transport_module.js'));
const V = require(path.join(ROOT, 'question_board_view_module.js'));

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
    return { call: p => JSON.parse(gs.handle(p).getContent()), driveFiles };
}

const PACK = 'PK-92345678-1234-1234-1234-123456789012';
const AID = 'AC-82345678-1234-1234-1234-123456789012';
const SECRET = 'p_secret_p_secret_20';

// A memory-backed localStorage so credential reuse is exercised, not stubbed.
function memStorage() {
    const m = new Map();
    return {
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: k => m.delete(k),
        _size: () => m.size,
    };
}

function hostBoard(call, overrides) {
    const admin = call({ a: 'claim' }).admin;
    const activity = Object.assign({
        activityId: AID,
        type: 'question_board',
        delivery: 'shared_async',
        prompt: 'What do you wonder about ecosystems?',
        revealPolicy: 'auto_publish',
        minParticipants: 3,
        itemsPerStudent: 2,
        boardCap: 50,
    }, overrides || {});
    const hosted = call({
        a: 'putpack', admin, id: PACK, k: SECRET, part: 1, of: 1, data: 'PACK',
        title: 'Ecosystems', expiresAt: new Date(Date.now() + 86400000).toISOString(),
        activities: [activity],
    });
    expect(hosted.ok).toBe(true);
    return admin;
}

// The injected call. The production app passes _alloMailboxCallWithRetry, which
// THROWS on transport failure and returns the parsed body otherwise; this
// matches that contract so the module is exercised the way it will really run.
function transportCall(call) {
    return async (_url, payload) => call(payload);
}

let sandbox, admin, student, teacher;

beforeEach(() => {
    sandbox = makeGsSandbox();
    admin = hostBoard(sandbox.call);
    student = T.createMailboxTransport({
        call: transportCall(sandbox.call), url: 'https://example/exec',
        packId: PACK, activityId: AID, packSecret: SECRET,
        isTeacher: false, storage: memStorage(), displayName: 'Ada',
    });
    teacher = T.createMailboxTransport({
        call: transportCall(sandbox.call), url: 'https://example/exec',
        packId: PACK, activityId: AID, admin, isTeacher: true,
    });
});

describe('a question actually reaches the server and comes back', () => {
    it('posts and reads back the board in CONTRACT shape', async () => {
        const posted = await student.addItem('Why do wolves matter?');
        expect(posted.ok).toBe(true);
        expect(posted.board.config.type).toBe('question_board');
        expect(posted.board.items).toHaveLength(1);
        expect(posted.board.items[0]).toMatchObject({
            text: 'Why do wolves matter?', status: 'approved', displayName: 'Ada',
        });
        expect(posted.board.items[0].uid).toMatch(/^ma-/);
    });

    it('carries author identity, without which the board cannot function', async () => {
        // Not a cosmetic field: the contract distinguishes own from peer items
        // by uid, so an item without one is invisible to its own author.
        await student.addItem('Mine');
        const loaded = await student.load();
        expect(loaded.board.items[0].uid).toBe(student.uid);
        expect(C.visibleItemsFor(student.actor(), loaded.board)).toHaveLength(1);
    });

    it('reuses the credential instead of minting a new identity per call', async () => {
        await student.addItem('One');
        const uid = student.uid;
        await student.addItem('Two');
        expect(student.uid).toBe(uid);
        const loaded = await student.load();
        expect(loaded.board.items.every(i => i.uid === uid)).toBe(true);
    });

    it('feeds the view model directly, with no reshaping in between', async () => {
        const posted = await student.addItem('Why do wolves matter?');
        const vm = V.buildBoardViewModel(C, posted.board, student.actor(), { transport: 'mailbox' });
        expect(vm.myItems).toHaveLength(1);
        expect(vm.peerItems).toHaveLength(0);
        expect(vm.remaining).toBe(1);
        expect(vm.canPost).toBe(true);
    });
});

describe('server refusals arrive as contract reasons, not raw codes', () => {
    it('refuses past the per-student cap', async () => {
        expect((await student.addItem('a')).ok).toBe(true);
        expect((await student.addItem('b')).ok).toBe(true);
        const third = await student.addItem('c');
        expect(third).toMatchObject({ ok: false, reason: 'item-cap', transport: false });
    });

    it('refuses a full board', async () => {
        const s = makeGsSandbox();
        const adminId = hostBoard(s.call, { boardCap: 1, itemsPerStudent: 5 });
        const one = T.createMailboxTransport({
            call: transportCall(s.call), url: 'u', packId: PACK, activityId: AID,
            packSecret: SECRET, isTeacher: false, storage: memStorage(),
        });
        expect(adminId).toBeTruthy();
        expect((await one.addItem('first')).ok).toBe(true);
        expect((await one.addItem('second')).reason).toBe('board-full');
    });

    it('refuses empty text before spending a request', async () => {
        const out = await student.addItem('    ');
        expect(out).toMatchObject({ ok: false, reason: 'empty-text' });
    });

    it('distinguishes a transport failure from a refusal', async () => {
        const broken = T.createMailboxTransport({
            call: async () => { const e = new Error('down'); e.code = 'unreachable'; throw e; },
            url: 'u', packId: PACK, activityId: AID, packSecret: SECRET,
            isTeacher: false, storage: memStorage(),
        });
        const out = await broken.load();
        // "Check your connection" and "the board is full" are different
        // messages, and only this flag can tell the UI which one to show.
        expect(out).toMatchObject({ ok: false, transport: true });
    });

    it('maps an unknown server code to a generic error rather than inventing one', () => {
        expect(T.reasonFor('some-future-code')).toBe('error');
        expect(T.reasonFor('board-bytes')).toBe('board-full');
    });
});

describe('teacher_review holds a question from PEERS but never from its author', () => {
    let s, held, other;
    beforeEach(() => {
        s = makeGsSandbox();
        hostBoard(s.call, { revealPolicy: 'teacher_review', minParticipants: 1, itemsPerStudent: 3 });
        held = T.createMailboxTransport({
            call: transportCall(s.call), url: 'u', packId: PACK, activityId: AID,
            packSecret: SECRET, isTeacher: false, storage: memStorage(), displayName: 'Ada',
        });
        other = T.createMailboxTransport({
            call: transportCall(s.call), url: 'u', packId: PACK, activityId: AID,
            packSecret: SECRET, isTeacher: false, storage: memStorage(), displayName: 'Ben',
        });
    });

    it('translates the wire status into the contract vocabulary', async () => {
        const posted = await held.addItem('A held question');
        expect(posted.board.items[0].status).toBe('held');   // server said 'pending'
    });

    it('does not send a held question to a peer AT ALL', async () => {
        await held.addItem('A held question');
        await other.addItem('Something of my own');
        const peerView = await other.load();
        // The strongest property of the mailbox path (spec §10.4b): the held
        // text never leaves the server, so it cannot leak through a client bug.
        expect(peerView.board.items.map(i => i.text)).toEqual(['Something of my own']);
        expect(JSON.stringify(peerView.board)).not.toContain('A held question');
    });

    it('always shows an author their own held question', async () => {
        await held.addItem('A held question');
        const mine = await held.load();
        expect(mine.board.items.map(i => i.text)).toEqual(['A held question']);
    });
});

describe('the teacher surface can see and act on everything', () => {
    it('sees held items the students cannot', async () => {
        const s = makeGsSandbox();
        const a = hostBoard(s.call, { revealPolicy: 'teacher_review', itemsPerStudent: 3 });
        const st = T.createMailboxTransport({
            call: transportCall(s.call), url: 'u', packId: PACK, activityId: AID,
            packSecret: SECRET, isTeacher: false, storage: memStorage(),
        });
        const tt = T.createMailboxTransport({
            call: transportCall(s.call), url: 'u', packId: PACK, activityId: AID,
            admin: a, isTeacher: true,
        });
        await st.addItem('Held from a student');
        const view = await tt.load();
        expect(view.board.items).toHaveLength(1);
        expect(view.board.items[0].status).toBe('held');
    });

    it('approves an item, and the student body then sees it', async () => {
        const s = makeGsSandbox();
        const a = hostBoard(s.call, { revealPolicy: 'teacher_review', minParticipants: 3, itemsPerStudent: 3 });
        const author = T.createMailboxTransport({
            call: transportCall(s.call), url: 'u', packId: PACK, activityId: AID,
            packSecret: SECRET, isTeacher: false, storage: memStorage(),
        });
        const peer = T.createMailboxTransport({
            call: transportCall(s.call), url: 'u', packId: PACK, activityId: AID,
            packSecret: SECRET, isTeacher: false, storage: memStorage(),
        });
        // A third author, because the k-anonymity floor is 3 and no peer sees
        // anything at all below it — approving is not enough on its own.
        const third = T.createMailboxTransport({
            call: transportCall(s.call), url: 'u', packId: PACK, activityId: AID,
            packSecret: SECRET, isTeacher: false, storage: memStorage(),
        });
        const tt = T.createMailboxTransport({
            call: transportCall(s.call), url: 'u', packId: PACK, activityId: AID,
            admin: a, isTeacher: true,
        });
        const posted = await author.addItem('Should this be public?');
        await peer.addItem('Peer question');
        await third.addItem('Third question');
        expect((await peer.load()).board.items.map(i => i.text)).toEqual(['Peer question']);

        const item = posted.board.items[0];
        expect((await tt.setStatus(item.uid, item.id, 'approved')).ok).toBe(true);

        const after = await peer.load();
        expect(after.board.items.map(i => i.text).sort()).toEqual(['Peer question', 'Should this be public?']);
        // The third student's question stays held — approval is per ITEM.
        expect(after.board.items.map(i => i.text)).not.toContain('Third question');
    });

    it('marks a question answered with a note — the mark a sticky note cannot make', async () => {
        const posted = await student.addItem('What eats algae?');
        const item = posted.board.items[0];
        expect((await teacher.setAnswered(item.uid, item.id, true, 'Covered Tuesday')).ok).toBe(true);
        const after = await teacher.load();
        expect(after.board.items[0].answered).toMatchObject({ note: 'Covered Tuesday' });
    });

    it('un-marks an answered question', async () => {
        const posted = await student.addItem('What eats algae?');
        const item = posted.board.items[0];
        await teacher.setAnswered(item.uid, item.id, true, 'note');
        await teacher.setAnswered(item.uid, item.id, false);
        expect((await teacher.load()).board.items[0].answered).toBe(false);
    });

    it('produces the export a teacher keeps, straight from server data', async () => {
        await student.addItem('Still open one');
        const posted = await student.addItem('Answered one');
        const answeredItem = posted.board.items.find(i => i.text === 'Answered one');
        await teacher.setAnswered(answeredItem.uid, answeredItem.id, true, 'Day 3');
        const record = V.exportBoardRecord(C, (await teacher.load()).board);
        expect(record.stats).toMatchObject({ total: 2, answered: 1, open: 1 });
        expect(record.markdown).toContain('Still open one');
        expect(record.markdown).toContain('Day 3');
    });
});

describe('item ids are unique across the WHOLE board', () => {
    it('does not reuse an id when two students post in the same millisecond', async () => {
        // This is exactly what happened: 'Q-' + Date.now() + rowIndex gave two
        // different students' first questions the same id, which collides as a
        // React key and makes id-only lookups ambiguous.
        const s = makeGsSandbox();
        hostBoard(s.call, { itemsPerStudent: 2 });
        const make = () => T.createMailboxTransport({
            call: transportCall(s.call), url: 'u', packId: PACK, activityId: AID,
            packSecret: SECRET, isTeacher: false, storage: memStorage(),
        });
        const people = [make(), make(), make()];
        for (const p of people) { await p.addItem('same instant'); await p.addItem('again'); }
        const items = (await people[0].load()).board.items;
        expect(items).toHaveLength(6);
        expect(new Set(items.map(i => i.id)).size).toBe(6);
    });
});

describe('a student cannot act as the host, whatever the client does', () => {
    it('refuses moderation locally without an admin secret', async () => {
        const out = await student.setStatus('ma-whatever', 'Q1', 'approved');
        expect(out).toMatchObject({ ok: false, reason: 'host-only' });
    });

    it('and the SERVER refuses too, which is the check that counts', async () => {
        const posted = await student.addItem('Mine');
        const item = posted.board.items[0];
        // Bypass the client guard entirely — a hostile client would.
        const raw = sandbox.call({
            a: 'moderateactivity', id: PACK, aid: AID,
            uid: item.uid, itemId: item.id, status: 'hidden',
        });
        expect(raw).toMatchObject({ ok: false, e: 'not-admin' });
    });

    it('refuses a host attempting to post as a student', async () => {
        expect((await teacher.addItem('teacher question')).reason).toBe('host-cannot-post');
    });
});

describe('the k-anonymity floor is enforced by the SERVER, not the view', () => {
    it('hides peers until enough students have contributed', async () => {
        const s = makeGsSandbox();
        hostBoard(s.call, { minParticipants: 3, itemsPerStudent: 2 });
        const make = () => T.createMailboxTransport({
            call: transportCall(s.call), url: 'u', packId: PACK, activityId: AID,
            packSecret: SECRET, isTeacher: false, storage: memStorage(),
        });
        const a = make(), b = make(), c = make();
        await a.addItem('first');
        await b.addItem('second');
        // Two authors, floor of three: each sees only their own.
        expect((await a.load()).board.items.map(i => i.text)).toEqual(['first']);
        await c.addItem('third');
        const all = (await a.load()).board.items.map(i => i.text).sort();
        expect(all).toEqual(['first', 'second', 'third']);
    });
});

describe('the board is actually reachable from the app', () => {
    const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
    const panelSource = read('shared_activity_source.jsx');
    const HOST_COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

    it('mounts a board panel from the extracted shared activity panel and both hosts load it', () => {
        expect(panelSource).toContain('const AlloQuestionBoardPanel = React.memo(');
        expect(panelSource).toContain('if (isQuestionBoard) {');
        expect(panelSource).toContain('<AlloQuestionBoardPanel activity={activity}');
        for (const p of HOST_COPIES) {
            const host = read(p);
            expect(host, p).toContain("loadModule('SharedActivity'");
            expect(host, p).toContain('Shared activity tools are still loading.');
            expect(host, p).not.toContain('const AlloQuestionBoardPanel = React.memo(');
        }
    });

    it('branches AFTER every hook, so switching activity type cannot reorder hooks', () => {
        const panelStart = panelSource.indexOf('const SharedAssignmentActivityPanel = React.memo(');
        const branch = panelSource.indexOf('if (isQuestionBoard) {', panelStart);
        expect(branch).toBeGreaterThan(panelStart);
        const componentEnd = panelSource.indexOf(String.fromCharCode(10) + '});', branch);
        const tail = panelSource.slice(branch, componentEnd);
        expect(tail.length).toBeGreaterThan(5000);
        expect(tail.match(/React\.use[A-Z]/g)).toBeNull();
    });

    it('keeps pure helpers before JSX panels for direct deterministic tests', () => {
        const start = panelSource.indexOf('function _alloNormalizeSharedRatingActivity(value)');
        const end = panelSource.indexOf('const SharedAssignmentActivityPanel', start);
        expect(start).toBeGreaterThan(-1);
        expect(end).toBeGreaterThan(start);
        expect(panelSource.slice(start, end).includes('AlloQuestionBoardPanel')).toBe(false);
    });

    it("gives the board its own label and dialog id rather than the word cloud's", () => {
        expect(panelSource).toContain('shared-assignment-question-board-title');
        expect(panelSource).toContain("title: 'Driving questions board'");
    });

    it('asks the student for a name, because nothing upstream supplies one', () => {
        expect(panelSource).toContain("localStorage.setItem('allo_display_name'");
        expect(panelSource).toContain('transport.setDisplayName(displayName)');
    });
});

describe('the transport module ships and loads like the rest of the pair', () => {
    const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

    it('is build-managed', () => {
        expect(read('build.js')).toContain("filename: 'question_board_transport_module.js'");
    });

    it('is loaded by BOTH ANTI copies under its registry name', () => {
        for (const p of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
            expect(read(p), p).toContain("loadModule('QuestionBoardTransport'");
        }
        expect(read('question_board_transport_module.js')).toContain('root.AlloModules.QuestionBoardTransport =');
    });
});
