import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const service = require('../classroom_import_service.js');
const SECRET = 'FICTIONAL_BEARER_ONLY_AUTHORIZATION_9001';
const ACCOUNT = '900000001';
const COURSE = '800000001';
const otherCourse = '800000002';
const student = (id, name = 'Invented Learner') => ({
    courseId: COURSE, userId: String(id), profile: { id: String(id), name: { fullName: name } }
});
const course = (id = COURSE) => ({ id, name: 'Invented Course', section: 'Invented Section', courseState: 'ACTIVE' });
const teacherPage = { teachers: [{ courseId: COURSE, userId: ACCOUNT }] };
const profile = { id: ACCOUNT };
function response(body, init = {}) {
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status: 200, headers: { 'content-type': 'application/json' }, ...init
    });
}
function mockQueue(items, options = {}) {
    const queue = [...items], calls = [];
    const fetchImpl = vi.fn(async (url, init) => {
        calls.push({ url, init });
        if (!queue.length) throw new Error('Unexpected mock request');
        const item = queue.shift();
        if (typeof item === 'function') return item(url, init);
        return item instanceof Response ? item : response(item);
    });
    const connector = service.createConnector({ fetchImpl, getAccessToken: async () => SECRET, ...options });
    return { connector, fetchImpl, calls, queue };
}
function rosterQueue(rosterPages = [{ students: [student('700000001')] }], options = {}) {
    return mockQueue([profile, { courses: [course()] }, profile, teacherPage, ...rosterPages], options);
}
async function acquire(mock) {
    await mock.connector.listTeacherCourses();
    return mock.connector.readSelectedCourse({ courseId: COURSE });
}
async function refusal(promise, code) {
    try { await promise; throw new Error('Expected refusal'); }
    catch (error) {
        expect(error.name).toBe('ClassroomImportError');
        expect(error.code).toBe(code);
        expect(error.message).toBe(code);
        expect(JSON.stringify(error)).not.toContain(SECRET);
        expect(error.stack).not.toContain(SECRET);
        expect(error).not.toHaveProperty('cause');
        expect(error).not.toHaveProperty('snapshot');
    }
}
afterEach(() => vi.restoreAllMocks());

describe('read-only Google Classroom acquisition', () => {
    it('uses the current REST fields and exactly two readonly scopes with no default credentials or transport', () => {
        expect(service.READONLY_SCOPES).toEqual([
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.rosters.readonly'
        ]);
        for (const bad of [undefined, {}, { fetchImpl: fetch }, { fetchImpl: fetch, getAccessToken() {}, endpoint: 'https://example.test' }]) {
            expect(() => service.createConnector(bad)).toThrow('INVALID_CONFIGURATION');
        }
    });

    it('pins the account, consumes all course/student pages, and creates a complete derived-count snapshot', async () => {
        const mock = mockQueue([
            profile, { courses: [course()], nextPageToken: 'COURSE_PAGE_2' }, { courses: [course(otherCourse)] },
            profile, { teachers: [{ courseId: COURSE, userId: '900000002' }], nextPageToken: 'TEACHER_PAGE_2' }, teacherPage,
            { students: [student('700000001', 'Élodie Example')], nextPageToken: 'ROSTER_PAGE_2' },
            { students: [student('700000002', 'E\u0301lodie Example'), student('700000003', '勇敢 示例')] }
        ]);
        const listing = await mock.connector.listTeacherCourses();
        expect(listing.courses).toHaveLength(2);
        listing.courses[0].id = 'changed-copy';
        const snapshot = await mock.connector.readSelectedCourse({ courseId: COURSE });
        expect(snapshot.status).toBe('complete');
        expect(snapshot.expectedStudentCount).toBe(3);
        expect(snapshot.consistency).toBe('PAGINATED_MEMBERSHIP_CAN_CHANGE');
        expect(snapshot.pages).toHaveLength(2);
        expect(snapshot.pages.map(page => page.requestPageToken)).toEqual(['', 'ROSTER_PAGE_2']);
        expect(snapshot.pages[1].response.nextPageToken).toBe('');
        expect(mock.queue).toHaveLength(0);
        expect(mock.connector.getStatus()).toEqual({ phase: 'complete', code: null });
        for (const call of mock.calls) {
            const url = new URL(call.url);
            expect(url.origin).toBe('https://classroom.googleapis.com');
            expect(call.url).not.toContain(SECRET);
            expect(call.init).toMatchObject({ method: 'GET', redirect: 'error', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
            expect(call.init.headers.Authorization).toBe('Bearer ' + SECRET);
            expect(call.init).not.toHaveProperty('body');
            expect(url.searchParams.get('fields')).not.toMatch(/email|photo|guardian|studentWorkFolder/);
            if (url.pathname === '/v1/courses') {
                expect(url.searchParams.get('teacherId')).toBe('me');
                expect(url.searchParams.get('studentId')).toBeNull();
                expect(url.searchParams.get('courseStates')).toBe('ACTIVE');
            }
        }
        const first = new URL(mock.calls[6].url), second = new URL(mock.calls[7].url);
        second.searchParams.delete('pageToken');
        expect(second.href).toBe(first.href);
        expect(JSON.stringify(snapshot)).not.toContain(SECRET);
    });

    it('handles omitted empty collections, empty intermediate pages, and explicit empty final tokens', async () => {
        const mock = rosterQueue([{ nextPageToken: 'EMPTY_THEN_MORE' }, { students: [], nextPageToken: '' }]);
        const snapshot = await acquire(mock);
        expect(snapshot.expectedStudentCount).toBe(0);
        expect(snapshot.pages).toHaveLength(2);
        const empty = mockQueue([profile, {}]);
        expect((await empty.connector.listTeacherCourses()).courses).toEqual([]);
    });

    it('rejects arbitrary course selection before any roster request', async () => {
        const mock = mockQueue([profile, { courses: [course()] }]);
        await mock.connector.listTeacherCourses();
        await refusal(mock.connector.readSelectedCourse({ courseId: otherCourse }), 'INVALID_SELECTION');
        expect(mock.calls).toHaveLength(2);
    });

    it('blocks an account switch even when both accounts teach the selected course', async () => {
        const mock = mockQueue([profile, { courses: [course()] }, { id: '900000002' }]);
        await mock.connector.listTeacherCourses();
        await refusal(mock.connector.readSelectedCourse({ courseId: COURSE }), 'ACCOUNT_CHANGED');
        expect(mock.calls).toHaveLength(3);
    });

    it('enforces an explicit allowed-account list without requesting email scopes', async () => {
        const mock = mockQueue([profile], { allowedAccountIds: ['900000002'] });
        await refusal(mock.connector.listTeacherCourses(), 'ACCOUNT_NOT_ALLOWED');
        expect(mock.calls).toHaveLength(1);
    });

    it('rejects an account removed from the course teachers before reading students', async () => {
        const mock = mockQueue([profile, { courses: [course()] }, profile, { teachers: [{ courseId: COURSE, userId: '900000002' }] }]);
        await refusal(acquire(mock), 'NOT_A_COURSE_TEACHER');
        expect(mock.calls.every(call => !new URL(call.url).pathname.endsWith('/students'))).toBe(true);
    });

    it.each([[401, 'AUTH_REQUIRED'], [403, 'ACCESS_DENIED'], [404, 'NOT_FOUND'], [429, 'RATE_LIMITED'], [503, 'SERVICE_UNAVAILABLE'], [418, 'HTTP_ERROR']])(
        'redacts HTTP %i and never exports or automatically retries a partial roster', async (status, code) => {
            const mock = rosterQueue([
                { students: [student('700000001')], nextPageToken: 'MORE' },
                response({ error: { message: SECRET + ' private-name' } }, { status })
            ]);
            await refusal(acquire(mock), code);
            expect(mock.calls).toHaveLength(6);
            expect(mock.connector.getStatus()).toEqual({ phase: 'error', code });
            await refusal(mock.connector.readSelectedCourse({ courseId: COURSE }), 'INVALID_SELECTION');
        }
    );

    it('rejects a repeated page token instead of looping or returning accumulated students', async () => {
        const mock = rosterQueue([
            { students: [student('700000001')], nextPageToken: 'REPEAT' },
            { students: [student('700000002')], nextPageToken: 'REPEAT' }
        ]);
        await refusal(acquire(mock), 'REPEATED_PAGE_TOKEN');
        expect(mock.calls).toHaveLength(6);
    });

    it.each([
        [{ students: [student('700000001'), student('700000001')] }, 'DUPLICATE_RECORD'],
        [{ students: [{ ...student('700000001'), courseId: otherCourse }] }, 'COURSE_MISMATCH'],
        [{ students: [{ ...student('700000001'), profile: { id: '700000002' } }] }, 'IDENTITY_MISMATCH'],
        [{ students: null }, 'MALFORMED_RESPONSE'],
        [{ students: [], unexpected: true }, 'MALFORMED_RESPONSE'],
        [{ students: [{ ...student('700000001'), profile: { emailAddress: 'invented@example.test' } }] }, 'MALFORMED_RESPONSE'],
        [{ students: [student('700000001')], nextPageToken: 3 }, 'MALFORMED_RESPONSE'],
        [{ students: [student('700000001')], nextPageToken: 'bad\nnext' }, 'MALFORMED_RESPONSE']
    ])('fails closed on malformed or mismatched roster data %#', async (page, code) => {
        await refusal(acquire(rosterQueue([page])), code);
    });

    it('rejects duplicate students across pages and duplicate courses across pages', async () => {
        await refusal(acquire(rosterQueue([
            { students: [student('700000001')], nextPageToken: 'MORE' },
            { students: [student('700000001')] }
        ])), 'DUPLICATE_RECORD');
        const duplicateCourses = mockQueue([profile, { courses: [course()], nextPageToken: 'MORE' }, { courses: [course()] }]);
        await refusal(duplicateCourses.connector.listTeacherCourses(), 'DUPLICATE_RECORD');
    });

    it('requires the complete teacher page chain even if the account occurs on its first page', async () => {
        const mock = mockQueue([profile, { courses: [course()] }, profile,
            { ...teacherPage, nextPageToken: 'MORE' }, response({}, { status: 403 })]);
        await refusal(acquire(mock), 'ACCESS_DENIED');
        expect(mock.calls).toHaveLength(5);
    });

    it('enforces page, row count and byte bounds including streams without content-length', async () => {
        await refusal(acquire(rosterQueue([{ nextPageToken: 'MORE' }], { limits: { maxPages: 1 } })), 'PAGE_LIMIT');
        await refusal(acquire(rosterQueue([{ students: [student('700000001'), student('700000002')] }], { limits: { maxStudents: 1 } })), 'COUNT_LIMIT');
        const bytes = mockQueue([response(' '.repeat(1000))], { limits: { maxPageBytes: 100 } });
        await refusal(bytes.connector.listTeacherCourses(), 'RESPONSE_TOO_LARGE');
        const declared = mockQueue([response('{}', { headers: { 'content-type': 'application/json', 'content-length': '999999999' } })]);
        await refusal(declared.connector.listTeacherCourses(), 'RESPONSE_TOO_LARGE');
        const total = mockQueue([profile, { courses: [course()] }], { limits: { maxTotalBytes: 40 } });
        await refusal(total.connector.listTeacherCourses(), 'RESPONSE_TOO_LARGE');
    });

    it('rejects redirect responses and unexpected response URLs', async () => {
        const redirect = mockQueue([response('', { status: 302, headers: { location: 'https://example.test/' } })]);
        await refusal(redirect.connector.listTeacherCourses(), 'REDIRECT_REJECTED');
        const moved = response(profile);
        Object.defineProperty(moved, 'url', { value: 'https://example.test/' });
        await refusal(mockQueue([moved]).connector.listTeacherCourses(), 'REDIRECT_REJECTED');
    });

    it('rejects invalid JSON, invalid UTF-8 and non-JSON responses', async () => {
        await refusal(mockQueue([response('{bad')]).connector.listTeacherCourses(), 'MALFORMED_RESPONSE');
        await refusal(mockQueue([response('hello', { headers: { 'content-type': 'text/html' } })]).connector.listTeacherCourses(), 'MALFORMED_RESPONSE');
        const invalid = new Response(new Uint8Array([255]), { headers: { 'content-type': 'application/json' } });
        await refusal(mockQueue([invalid]).connector.listTeacherCourses(), 'MALFORMED_RESPONSE');
    });

    it('does not expose a token from provider/fetch errors or successful reflected response fields', async () => {
        const logging = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')];
        const provider = mockQueue([], { getAccessToken: () => { throw new Error(SECRET); } });
        await refusal(provider.connector.listTeacherCourses(), 'AUTH_REQUIRED');
        expect(provider.fetchImpl).not.toHaveBeenCalled();
        const transport = mockQueue([() => { throw new Error(SECRET); }]);
        await refusal(transport.connector.listTeacherCourses(), 'NETWORK_ERROR');
        const reflected = mockQueue([profile, { courses: [{ ...course(), name: SECRET }] }]);
        await refusal(reflected.connector.listTeacherCourses(), 'CREDENTIAL_IN_RESPONSE');
        for (const log of logging) expect(log).not.toHaveBeenCalled();
        expect(JSON.stringify(reflected.connector.getStatus())).not.toContain(SECRET);
    });

    it('rejects JSON-escaped credentials before they can become pagination URLs or preview labels', async () => {
        const encodedToken = [...SECRET].map(char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')).join('');
        const reflected = mockQueue([profile, response('{"courses":[],"nextPageToken":"' + encodedToken + '"}')]);
        await refusal(reflected.connector.listTeacherCourses(), 'CREDENTIAL_IN_RESPONSE');
        expect(reflected.calls).toHaveLength(2);
        expect(reflected.calls.every(call => !call.url.includes(SECRET))).toBe(true);
    });

    it('stops on an interrupted later roster body and cancels an in-progress roster read', async () => {
        const interrupted = new Response(new ReadableStream({
            start(controller) { controller.error(new Error(SECRET)); }
        }), { headers: { 'content-type': 'application/json' } });
        await refusal(acquire(rosterQueue([
            { students: [student('700000001')], nextPageToken: 'MORE' }, interrupted
        ])), 'NETWORK_ERROR');
        const signal = new AbortController();
        const mock = rosterQueue([(_url, init) => { signal.abort(SECRET); return new Promise(() => {}); }]);
        await mock.connector.listTeacherCourses();
        await refusal(mock.connector.readSelectedCourse({ courseId: COURSE, signal: signal.signal }), 'CANCELLED');
        expect(mock.calls).toHaveLength(5);
    });

    it('cancels before provider execution and while a transport ignores the signal', async () => {
        const signal = new AbortController();
        signal.abort(SECRET);
        const provider = vi.fn(async () => SECRET);
        const early = mockQueue([], { getAccessToken: provider });
        await refusal(early.connector.listTeacherCourses({ signal: signal.signal }), 'CANCELLED');
        expect(provider).not.toHaveBeenCalled();
        const pending = mockQueue([() => new Promise(() => {})]);
        const run = pending.connector.listTeacherCourses();
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
        pending.connector.cancel();
        await refusal(run, 'CANCELLED');
    });

    it('bounds token-provider hangs and streaming-body hangs with the operation timeout', async () => {
        const provider = mockQueue([], { getAccessToken: () => new Promise(() => {}), limits: { timeoutMs: 10 } });
        await refusal(provider.connector.listTeacherCourses(), 'TIMEOUT');
        const stalled = new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'application/json' } });
        await refusal(mockQueue([stalled], { limits: { timeoutMs: 10 } }).connector.listTeacherCourses(), 'TIMEOUT');
    });

    it('rejects concurrent work, and dispose cancels a pending operation and forbids reuse', async () => {
        const mock = mockQueue([], { getAccessToken: () => new Promise(() => {}) });
        const pending = mock.connector.listTeacherCourses();
        await refusal(mock.connector.listTeacherCourses(), 'BUSY');
        mock.connector.dispose();
        await refusal(pending, 'DISPOSED');
        await refusal(mock.connector.listTeacherCourses(), 'DISPOSED');
        expect(mock.connector.getStatus()).toEqual({ phase: 'disposed', code: 'DISPOSED' });
    });
});

describe('private teacher review to codename-only v4 export', () => {
    it('exports no source identities and keeps duplicate/Unicode names distinct in a separate preview', async () => {
        const snapshot = await acquire(rosterQueue([{ students: [
            student('700000001', 'Élodie Example'), student('700000002', 'E\u0301lodie Example'),
            student('700000003', 'Élodie Example'), student('700000004', '勇敢 示例')
        ] }]));
        const output = service.convertSnapshot(snapshot, { destinationRoster: null });
        expect(output.studentCount).toBe(4);
        expect(output.roster.exportVersion).toBe(4);
        expect(output.roster.groups).toEqual({});
        expect(output.roster.className).toBe('');
        expect(Object.keys(output.roster.students)).toHaveLength(4);
        expect(output.preview.map(row => row.fullName)).toEqual(['Élodie Example', 'E\u0301lodie Example', 'Élodie Example', '勇敢 示例']);
        expect(new Set(output.preview.map(row => row.learnerId)).size).toBe(4);
        for (const row of output.preview) {
            expect(output.roster.learnerIds[row.codename]).toBe(row.learnerId);
            expect(row).not.toHaveProperty('userId');
        }
        for (const privateValue of [SECRET, COURSE, ACCOUNT, '700000001', 'Élodie', 'Example', '勇敢', 'profile', 'fullName']) expect(output.json).not.toContain(privateValue);
        expect(JSON.parse(output.json)).toEqual(output.roster);
        expect(output.roster.classId).toMatch(/^CLS-[0-9a-f-]{36}$/);
        expect(service.convertSnapshot(snapshot, { destinationRoster: null }).roster.classId).not.toBe(output.roster.classId);
    });

    it('requires a new/empty destination and rejects source credentials or unrecognized snapshot fields', async () => {
        const snapshot = await acquire(rosterQueue());
        for (const destination of [undefined, {}, { students: { 'Calm Owl': '' }, groups: {} }, { students: {}, groups: {}, progressHistory: {} }]) {
            expect(() => service.convertSnapshot(snapshot, { destinationRoster: destination })).toThrow('EMPTY_DESTINATION_REQUIRED');
        }
        expect(() => service.convertSnapshot({ ...snapshot, accessToken: SECRET }, { destinationRoster: null })).toThrow('INVALID_COMPLETE_SNAPSHOT');
        expect(service.convertSnapshot(snapshot, { destinationRoster: { students: {}, groups: {} } }).studentCount).toBe(1);
    });

    it('refuses incomplete chains, count assertions, failed pages and duplicate source identities at conversion', async () => {
        const snapshot = await acquire(rosterQueue());
        const change = mutate => { const copy = structuredClone(snapshot); mutate(copy); return () => service.convertSnapshot(copy, { destinationRoster: null }); };
        expect(change(copy => { copy.expectedStudentCount = 2; })).toThrow('STUDENT_COUNT_MISMATCH');
        expect(change(copy => { copy.status = 'partial'; })).toThrow('INVALID_COMPLETE_SNAPSHOT');
        expect(change(copy => { copy.pages[0].status = 'failed'; })).toThrow('INVALID_PAGE_CHAIN');
        expect(change(copy => { copy.pages[0].response.nextPageToken = 'MORE'; })).toThrow('INCOMPLETE_PAGINATION');
        expect(change(copy => { copy.pages[0].response.students.push(copy.pages[0].response.students[0]); })).toThrow('DUPLICATE_RECORD');
    });

    it('creates unique codenames and opaque IDs at the 500-student boundary and fails closed without secure UUIDs', async () => {
        const pages = Array.from({ length: 5 }, (_, page) => ({
            students: Array.from({ length: 100 }, (_, index) => student(String(700000001 + page * 100 + index))),
            nextPageToken: page < 4 ? 'PAGE_' + (page + 2) : ''
        }));
        const snapshot = await acquire(rosterQueue(pages));
        const result = service.convertSnapshot(snapshot, { destinationRoster: null });
        expect(result.studentCount).toBe(500);
        expect(new Set(Object.keys(result.roster.students).map(name => name.toLowerCase().replace(/[^a-z0-9]/g, ''))).size).toBe(500);
        expect(new Set(Object.values(result.roster.learnerIds)).size).toBe(500);
        expect(new TextEncoder().encode(result.json).byteLength).toBeLessThan(2 * 1024 * 1024);
        const rng = vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => { throw new Error(SECRET); });
        expect(() => service.convertSnapshot(snapshot, { destinationRoster: null })).toThrow('ID_GENERATION_FAILED');
        rng.mockReturnValue('11111111-1111-4111-8111-111111111111');
        expect(() => service.convertSnapshot(snapshot, { destinationRoster: null })).toThrow('ID_COLLISION_LIMIT');
    });

    it('has no persistence, endpoint configuration, global fetch fallback, or source identity hashes', () => {
        const source = readFileSync('classroom_import_service.js', 'utf8');
        expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|console\.(log|error|warn)|createHash|subtle\.digest/);
        expect(source).not.toMatch(/fetchImpl\s*=\s*(?:globalThis\.)?fetch/);
        expect(source).toContain("redirect: 'error'");
    });
});
