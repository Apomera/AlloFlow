/* Google Classroom acquisition and first-roster conversion. No default network or credentials. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else { root.AlloModules = root.AlloModules || {}; root.AlloModules.GoogleClassroomImport = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const READONLY_SCOPES = Object.freeze([
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.rosters.readonly'
    ]);
    const ORIGIN = 'https://classroom.googleapis.com';
    const DEFAULT_LIMITS = Object.freeze({
        timeoutMs: 30000, maxPageBytes: 262144, maxTotalBytes: 2097152,
        maxPages: 50, maxCourses: 250, maxStudents: 500, maxTeachers: 100, pageSize: 100
    });
    const FIELDS = Object.freeze({
        profile: 'id', courses: 'courses(id,name,section,courseState),nextPageToken',
        teachers: 'teachers(courseId,userId),nextPageToken',
        students: 'students(courseId,userId,profile(id,name(fullName,givenName,familyName))),nextPageToken'
    });
    const CONSISTENCY = 'PAGINATED_MEMBERSHIP_CAN_CHANGE';
    const ID = /^[A-Za-z0-9_-]{1,160}$/;
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
    const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
        && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
    class ImportError extends Error {
        constructor(code) { super(code); this.name = 'ClassroomImportError'; this.code = code; }
    }
    function fail(code) { throw new ImportError(code); }
    function shape(value, allowed, required, code = 'MALFORMED_RESPONSE') {
        if (!record(value) || Object.keys(value).some(key => !allowed.includes(key))
            || required.some(key => !own(value, key))) fail(code);
    }
    function identifier(value, code = 'MALFORMED_RESPONSE') {
        if (typeof value !== 'string' || !ID.test(value)) fail(code);
        return value;
    }
    function text(value, max, nonempty = false) {
        if (typeof value !== 'string' || [...value].length > max || (nonempty && !value.trim())
            || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
            || [...value].some(char => /^[\ud800-\udfff]$/.test(char))) fail('MALFORMED_RESPONSE');
        return value;
    }
    function pageToken(value) {
        if (typeof value !== 'string' || value.length > 4096 || /[^\x21-\x7e]/.test(value)) {
            if (value !== '') fail('MALFORMED_RESPONSE');
        }
        return value;
    }
    function course(value) {
        shape(value, ['id', 'name', 'section', 'courseState'], ['id', 'name', 'courseState']);
        const result = { id: identifier(value.id), name: text(value.name, 750, true), courseState: value.courseState };
        if (!['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED'].includes(value.courseState)) fail('MALFORMED_RESPONSE');
        if (own(value, 'section')) result.section = text(value.section, 2800);
        return result;
    }
    function member(value, courseId, withProfile) {
        shape(value, withProfile ? ['courseId', 'userId', 'profile'] : ['courseId', 'userId'], ['courseId', 'userId']);
        if (identifier(value.courseId) !== courseId) fail('COURSE_MISMATCH');
        const result = { courseId, userId: identifier(value.userId) };
        if (withProfile && own(value, 'profile')) {
            shape(value.profile, ['id', 'name'], []);
            result.profile = {};
            if (own(value.profile, 'id')) {
                if (identifier(value.profile.id) !== result.userId) fail('IDENTITY_MISMATCH');
                result.profile.id = value.profile.id;
            }
            if (own(value.profile, 'name')) {
                shape(value.profile.name, ['fullName', 'givenName', 'familyName'], []);
                result.profile.name = {};
                for (const key of Object.keys(value.profile.name)) result.profile.name[key] = text(value.profile.name[key], 1000);
            }
        }
        return result;
    }
    function normalizedPage(value, collection, courseId) {
        shape(value, [collection, 'nextPageToken'], []);
        const rows = own(value, collection) ? value[collection] : [];
        if (!Array.isArray(rows)) fail('MALFORMED_RESPONSE');
        return {
            [collection]: rows.map(row => collection === 'courses' ? course(row) : member(row, courseId, collection === 'students')),
            nextPageToken: own(value, 'nextPageToken') ? pageToken(value.nextPageToken) : ''
        };
    }
    function stopped(ctx) { if (ctx.controller.signal.aborted) fail(ctx.abortCode); }
    // The explicit race also bounds injected providers/transports that ignore AbortSignal.
    function controlled(call, ctx, errorCode) {
        return new Promise((resolve, reject) => {
            const signal = ctx.controller.signal;
            let settled = false;
            const finish = (fn, value) => {
                if (settled) return;
                settled = true;
                signal.removeEventListener('abort', onAbort);
                fn(value);
            };
            const onAbort = () => finish(reject, new ImportError(ctx.abortCode));
            if (signal.aborted) { onAbort(); return; }
            signal.addEventListener('abort', onAbort, { once: true });
            Promise.resolve().then(() => { stopped(ctx); return call(); }).then(
                value => signal.aborted ? onAbort() : finish(resolve, value),
                () => signal.aborted ? onAbort() : finish(reject, new ImportError(errorCode))
            );
        });
    }
    function abort(ctx, code) {
        if (ctx && !ctx.controller.signal.aborted) { ctx.abortCode = code; ctx.controller.abort(); }
    }
    function quietlyCancel(body) {
        try { if (body && typeof body.cancel === 'function') Promise.resolve(body.cancel()).catch(() => {}); } catch (_) { /* Never expose response errors. */ }
    }
    function containsCredential(value, token) {
        const pending = [value], encoded = encodeURIComponent(token);
        while (pending.length) {
            const item = pending.pop();
            if (typeof item === 'string' && (item.includes(token) || item.includes(encoded))) return true;
            if (item && typeof item === 'object') {
                for (const [key, child] of Object.entries(item)) {
                    if (key.includes(token) || key.includes(encoded)) return true;
                    pending.push(child);
                }
            }
        }
        return false;
    }
    function createConnector(options) {
        shape(options, ['fetchImpl', 'getAccessToken', 'allowedAccountIds', 'limits'], ['fetchImpl', 'getAccessToken'], 'INVALID_CONFIGURATION');
        if (typeof options.fetchImpl !== 'function' || typeof options.getAccessToken !== 'function') fail('INVALID_CONFIGURATION');
        const fetchImpl = options.fetchImpl;
        const getAccessToken = options.getAccessToken;
        const limits = { ...DEFAULT_LIMITS };
        if (own(options, 'limits')) {
            shape(options.limits, Object.keys(DEFAULT_LIMITS), [], 'INVALID_CONFIGURATION');
            for (const [key, value] of Object.entries(options.limits)) {
                if (!Number.isInteger(value) || value < 1 || value > DEFAULT_LIMITS[key]) fail('INVALID_CONFIGURATION');
                limits[key] = value;
            }
        }
        let allowedAccounts = null;
        if (own(options, 'allowedAccountIds')) {
            if (!Array.isArray(options.allowedAccountIds) || !options.allowedAccountIds.length || options.allowedAccountIds.length > 250) fail('INVALID_CONFIGURATION');
            allowedAccounts = new Set(options.allowedAccountIds.map(id => identifier(id, 'INVALID_CONFIGURATION')));
        }
        let active = null, disposed = false, accountId = null, selectedIds = new Set();
        let status = { phase: 'idle', code: null };

        async function request(ctx, token, path, params) {
            stopped(ctx);
            const url = new URL(path, ORIGIN);
            for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
            // Endpoints and all query keys are owned by this module, never by UI or configuration.
            if (url.origin !== ORIGIN || url.username || url.password || url.hash) fail('INVALID_REQUEST');
            if (url.href.includes(token) || url.href.includes(encodeURIComponent(token))) fail('CREDENTIAL_IN_REQUEST');
            const response = await controlled(() => fetchImpl(url.href, {
                method: 'GET', headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
                redirect: 'error', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
                signal: ctx.controller.signal
            }), ctx, 'NETWORK_ERROR');
            if (!response || !Number.isInteger(response.status) || !response.headers || typeof response.headers.get !== 'function') fail('MALFORMED_RESPONSE');
            if (response.redirected || response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)
                || (response.url && response.url !== url.href)) {
                quietlyCancel(response.body); fail('REDIRECT_REJECTED');
            }
            if (response.status !== 200) {
                quietlyCancel(response.body);
                if (response.status === 401) fail('AUTH_REQUIRED');
                if (response.status === 403) fail('ACCESS_DENIED');
                if (response.status === 404) fail('NOT_FOUND');
                if (response.status === 429) fail('RATE_LIMITED');
                if (response.status >= 500 && response.status <= 599) fail('SERVICE_UNAVAILABLE');
                fail('HTTP_ERROR');
            }
            const contentType = response.headers.get('content-type');
            if (typeof contentType !== 'string' || !/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
                quietlyCancel(response.body); fail('MALFORMED_RESPONSE');
            }
            const declared = response.headers.get('content-length');
            if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limits.maxPageBytes)) {
                quietlyCancel(response.body); fail('RESPONSE_TOO_LARGE');
            }
            if (!response.body || typeof response.body.getReader !== 'function') fail('MALFORMED_RESPONSE');
            const reader = response.body.getReader();
            let bytes = 0, complete = false, body = '';
            try {
                const decoder = new TextDecoder('utf-8', { fatal: true });
                while (true) {
                    const chunk = await controlled(() => reader.read(), ctx, 'NETWORK_ERROR');
                    if (!chunk || typeof chunk.done !== 'boolean') fail('MALFORMED_RESPONSE');
                    if (chunk.done) { complete = true; break; }
                    // Fetch streams can originate in a different realm (for example a browser frame).
                    if (!ArrayBuffer.isView(chunk.value) || Object.prototype.toString.call(chunk.value) !== '[object Uint8Array]') fail('MALFORMED_RESPONSE');
                    bytes += chunk.value.byteLength;
                    ctx.totalBytes += chunk.value.byteLength;
                    if (bytes > limits.maxPageBytes || ctx.totalBytes > limits.maxTotalBytes) fail('RESPONSE_TOO_LARGE');
                    body += decoder.decode(chunk.value, { stream: true });
                }
                body += decoder.decode();
            } finally {
                if (!complete) quietlyCancel(reader);
                try { reader.releaseLock(); } catch (_) { /* A pending aborted read may retain its lock until settlement. */ }
            }
            stopped(ctx);
            // Guard against even an unexpected successful response reflecting a bearer credential.
            if (body.includes(token) || body.includes(encodeURIComponent(token))) fail('CREDENTIAL_IN_RESPONSE');
            let parsed;
            try { parsed = JSON.parse(body); } catch (_) { fail('MALFORMED_RESPONSE'); }
            body = '';
            // JSON escapes must not hide credentials in a course label or subsequent page token.
            if (containsCredential(parsed, token)) fail('CREDENTIAL_IN_RESPONSE');
            return parsed;
        }
        async function pages(ctx, token, collection, courseId) {
            let next = '', count = 0;
            const seenTokens = new Set(), seenIds = new Set(), result = [];
            const cap = collection === 'courses' ? limits.maxCourses : collection === 'teachers' ? limits.maxTeachers : limits.maxStudents;
            do {
                if (result.length >= limits.maxPages) fail('PAGE_LIMIT');
                const params = { pageSize: String(limits.pageSize), fields: FIELDS[collection] };
                if (collection === 'courses') { params.teacherId = 'me'; params.courseStates = 'ACTIVE'; }
                if (next) params.pageToken = next;
                const path = collection === 'courses' ? '/v1/courses' : '/v1/courses/' + encodeURIComponent(courseId) + '/' + collection;
                const response = normalizedPage(await request(ctx, token, path, params), collection, courseId);
                if (response[collection].length > limits.pageSize) fail('MALFORMED_RESPONSE');
                for (const row of response[collection]) {
                    const id = collection === 'courses' ? row.id : row.userId;
                    if (seenIds.has(id)) fail('DUPLICATE_RECORD');
                    seenIds.add(id);
                    if (++count > cap) fail('COUNT_LIMIT');
                    if (collection === 'courses' && row.courseState !== 'ACTIVE') fail('COURSE_STATE_MISMATCH');
                }
                result.push({ requestPageToken: next, response });
                next = response.nextPageToken;
                if (next && seenTokens.has(next)) fail('REPEATED_PAGE_TOKEN');
                if (next) seenTokens.add(next);
            } while (next);
            return { pages: result, count };
        }
        async function currentAccount(ctx, token) {
            const profile = await request(ctx, token, '/v1/userProfiles/me', { fields: FIELDS.profile });
            shape(profile, ['id'], ['id']);
            const id = identifier(profile.id);
            if (allowedAccounts && !allowedAccounts.has(id)) fail('ACCOUNT_NOT_ALLOWED');
            if (accountId !== null && id !== accountId) fail('ACCOUNT_CHANGED');
            return id;
        }
        async function run(phase, signal, task) {
            if (disposed) fail('DISPOSED');
            if (active) fail('BUSY');
            if (signal !== undefined && (!signal || typeof signal.aborted !== 'boolean'
                || typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function')) fail('INVALID_REQUEST');
            const ctx = { controller: new AbortController(), abortCode: 'CANCELLED', totalBytes: 0 };
            active = ctx;
            status = { phase, code: null };
            const onAbort = () => abort(ctx, 'CANCELLED');
            if (signal) { signal.addEventListener('abort', onAbort, { once: true }); if (signal.aborted) onAbort(); }
            const timer = setTimeout(() => abort(ctx, 'TIMEOUT'), limits.timeoutMs);
            let token = '';
            try {
                stopped(ctx);
                token = await controlled(() => getAccessToken({ signal: ctx.controller.signal }), ctx, 'AUTH_REQUIRED');
                if (typeof token !== 'string' || !token || token.length > 8192 || !/^[A-Za-z0-9._~+\/-]+=*$/.test(token)) fail('AUTH_REQUIRED');
                const result = await task(ctx, token);
                stopped(ctx);
                status = { phase: 'complete', code: null };
                return result;
            } catch (error) {
                const code = ctx.controller.signal.aborted ? ctx.abortCode : error instanceof ImportError ? error.code : 'MALFORMED_RESPONSE';
                status = { phase: code === 'CANCELLED' ? 'cancelled' : code === 'DISPOSED' ? 'disposed' : 'error', code };
                // A failed operation invalidates old course selections; retry starts at class listing.
                selectedIds.clear();
                throw new ImportError(code);
            } finally {
                token = '';
                clearTimeout(timer);
                if (signal) signal.removeEventListener('abort', onAbort);
                active = null;
            }
        }
        return Object.freeze({
            listTeacherCourses({ signal } = {}) {
                return run('listing', signal, async (ctx, token) => {
                    selectedIds.clear();
                    const id = await currentAccount(ctx, token);
                    const listing = await pages(ctx, token, 'courses');
                    stopped(ctx);
                    const courses = listing.pages.flatMap(page => page.response.courses);
                    accountId = id;
                    selectedIds = new Set(courses.map(item => item.id));
                    return { status: 'complete', courses };
                });
            },
            readSelectedCourse({ courseId, signal } = {}) {
                return run('reading', signal, async (ctx, token) => {
                    identifier(courseId, 'INVALID_SELECTION');
                    if (accountId === null || !selectedIds.has(courseId)) fail('INVALID_SELECTION');
                    const id = await currentAccount(ctx, token);
                    const teachers = await pages(ctx, token, 'teachers', courseId);
                    if (!teachers.pages.some(page => page.response.teachers.some(teacher => teacher.userId === id))) fail('NOT_A_COURSE_TEACHER');
                    const roster = await pages(ctx, token, 'students', courseId);
                    stopped(ctx);
                    return {
                        status: 'complete', selectedCourseId: courseId, expectedStudentCount: roster.count,
                        consistency: CONSISTENCY,
                        pages: roster.pages.map(page => ({ status: 'success', courseId, ...page }))
                    };
                });
            },
            cancel() { abort(active, 'CANCELLED'); },
            dispose() { disposed = true; selectedIds.clear(); accountId = null; status = { phase: 'disposed', code: 'DISPOSED' }; abort(active, 'DISPOSED'); },
            getStatus() { return { ...status }; }
        });
    }

    function assertEmptyDestination(destination) {
        if (destination === null) return;
        shape(destination, ['groups', 'students'], ['groups', 'students'], 'EMPTY_DESTINATION_REQUIRED');
        if (!record(destination.groups) || !record(destination.students)
            || Object.keys(destination.groups).length || Object.keys(destination.students).length) fail('EMPTY_DESTINATION_REQUIRED');
    }
    function completeStudents(snapshot) {
        shape(snapshot, ['status', 'selectedCourseId', 'expectedStudentCount', 'consistency', 'pages'],
            ['status', 'selectedCourseId', 'expectedStudentCount', 'pages'], 'INVALID_COMPLETE_SNAPSHOT');
        const courseId = identifier(snapshot.selectedCourseId, 'INVALID_COMPLETE_SNAPSHOT');
        if (snapshot.status !== 'complete' || (own(snapshot, 'consistency') && snapshot.consistency !== CONSISTENCY)
            || !Number.isInteger(snapshot.expectedStudentCount) || snapshot.expectedStudentCount < 0 || snapshot.expectedStudentCount > 500
            || !Array.isArray(snapshot.pages) || !snapshot.pages.length || snapshot.pages.length > DEFAULT_LIMITS.maxPages) fail('INVALID_COMPLETE_SNAPSHOT');
        const seenTokens = new Set(), seenStudents = new Set(), students = [];
        let expectedToken = '';
        for (let index = 0; index < snapshot.pages.length; index++) {
            const page = snapshot.pages[index];
            shape(page, ['status', 'courseId', 'requestPageToken', 'response'], ['status', 'courseId', 'requestPageToken', 'response'], 'INVALID_PAGE_CHAIN');
            if (page.status !== 'success' || page.courseId !== courseId || page.requestPageToken !== expectedToken) fail('INVALID_PAGE_CHAIN');
            const normalized = normalizedPage(page.response, 'students', courseId);
            const next = normalized.nextPageToken;
            if ((index < snapshot.pages.length - 1 && !next) || (next && seenTokens.has(next))) fail('INVALID_PAGE_CHAIN');
            if (next) seenTokens.add(next);
            for (const student of normalized.students) {
                if (seenStudents.has(student.userId)) fail('DUPLICATE_RECORD');
                seenStudents.add(student.userId);
                students.push(student);
                if (students.length > 500) fail('COUNT_LIMIT');
            }
            expectedToken = next;
        }
        if (expectedToken) fail('INCOMPLETE_PAGINATION');
        if (students.length !== snapshot.expectedStudentCount) fail('STUDENT_COUNT_MISMATCH');
        return students;
    }
    function convertSnapshot(snapshot, options) {
        shape(options, ['destinationRoster'], ['destinationRoster'], 'EMPTY_DESTINATION_REQUIRED');
        assertEmptyDestination(options.destinationRoster);
        const students = completeStudents(snapshot);
        const adjectives = ['Brave', 'Bright', 'Calm', 'Clever', 'Curious', 'Gentle', 'Kind', 'Mighty', 'Quiet', 'Swift'];
        const animals = ['Bear', 'Dolphin', 'Falcon', 'Fox', 'Otter', 'Owl', 'Panda', 'Tiger', 'Turtle', 'Wolf'];
        const used = new Set();
        function opaque(prefix) {
            for (let attempt = 0; attempt < 8; attempt++) {
                let value;
                try { value = globalThis.crypto.randomUUID(); } catch (_) { fail('ID_GENERATION_FAILED'); }
                if (typeof value !== 'string' || !UUID.test(value)) fail('ID_GENERATION_FAILED');
                value = value.toLowerCase();
                if (!used.has(value)) { used.add(value); return prefix + '-' + value; }
            }
            fail('ID_COLLISION_LIMIT');
        }
        const roster = {
            className: '', classId: opaque('CLS'), groups: {}, students: {}, learnerIds: {},
            learnerPreferences: {}, readingThemeDefault: 'default', progressHistory: {}, sessionHistory: [], exportVersion: 4
        };
        const preview = students.map((student, index) => {
            const cycle = Math.floor(index / 100);
            const codename = adjectives[Math.floor(index / 10) % 10] + ' ' + animals[index % 10] + (cycle ? ' ' + (cycle + 1) : '');
            const learnerId = opaque('LRN');
            roster.students[codename] = '';
            roster.learnerIds[codename] = learnerId;
            const name = student.profile && student.profile.name;
            const fullName = name ? name.fullName || [name.givenName, name.familyName].filter(Boolean).join(' ') : '';
            // This private preview is intentionally separate from roster/json and has no source IDs.
            return { fullName, codename, learnerId };
        });
        const json = JSON.stringify(roster, null, 2);
        if (new TextEncoder().encode(json).byteLength > 2 * 1024 * 1024) fail('EXPORT_TOO_LARGE');
        return { roster, json, studentCount: students.length, preview };
    }
    return Object.freeze({ VERSION: '1.0.0', READONLY_SCOPES, DEFAULT_LIMITS, createConnector, convertSnapshot, assertEmptyDestination });
}));
