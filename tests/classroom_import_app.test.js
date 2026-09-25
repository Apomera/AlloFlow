import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { JSDOM } from 'jsdom';

const html = readFileSync('classroom-import.html', 'utf8');
const app = readFileSync('classroom_import_app.js', 'utf8');
const defaultConfig = readFileSync('classroom_import_config.js', 'utf8');
const SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly'
];
const SECRET = 'FICTIONAL_UI_BEARER_NEVER_IN_DOWNLOAD';
const COURSE = '800000001';
const PRIVATE_NAME = 'Private Élodie Example';
const roots = [];
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
function prepared(names = [PRIVATE_NAME]) {
    const roster = {
        className: '', classId: 'CLS-11111111-1111-4111-8111-111111111111', groups: {}, students: {}, learnerIds: {},
        learnerPreferences: {}, readingThemeDefault: 'default', progressHistory: {}, sessionHistory: [], exportVersion: 4
    };
    const preview = names.map((fullName, index) => {
        const codename = 'Calm Owl ' + (index + 1), learnerId = 'LRN-22222222-2222-4222-8222-' + String(index + 1).padStart(12, '0');
        roster.students[codename] = ''; roster.learnerIds[codename] = learnerId;
        return { fullName, codename, learnerId };
    });
    return { roster, json: JSON.stringify(roster), preview, studentCount: names.length };
}
function harness(overrides = {}) {
    const dom = new JSDOM(html, { url: overrides.url || 'https://alloflow.example.test/classroom-import.html', runScripts: 'outside-only' });
    roots.push(dom);
    const w = dom.window, $ = id => w.document.getElementById(id);
    let clock = 1000000, nextTimer = 0;
    const timers = new Map(), blobs = [], clients = [], connectors = [];
    w.Date.now = () => clock;
    w.setTimeout = vi.fn((fn, ms) => { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; });
    w.clearTimeout = vi.fn(id => timers.delete(id));
    w.Blob = NodeBlob;
    w.URL.createObjectURL = vi.fn(blob => { blobs.push(blob); return 'blob:https://alloflow.example.test/fictional-' + blobs.length; });
    w.URL.revokeObjectURL = vi.fn();
    w.HTMLAnchorElement.prototype.click = vi.fn();
    w.fetch = vi.fn(() => { throw new Error('No network permitted in UI tests'); });
    w.confirm = vi.fn(() => true);
    const logs = ['log', 'warn', 'error'].map(method => vi.spyOn(w.console, method));
    const scopeCheck = vi.fn(response => SCOPES.every(scope => String(response.scope || '').split(' ').includes(scope)));
    const oauth = {
        hasGrantedAllScopes: scopeCheck,
        initTokenClient: vi.fn(config => { const client = { config, requestAccessToken: vi.fn() }; clients.push(client); return client; }),
        revoke: vi.fn()
    };
    w.google = { accounts: { oauth2: oauth } };
    const converted = overrides.prepared || prepared();
    const service = {
        READONLY_SCOPES: SCOPES,
        createConnector: vi.fn(options => {
            const connector = {
                options,
                listTeacherCourses: vi.fn(async () => {
                    options.getAccessToken();
                    return overrides.listing ? overrides.listing.promise : { status: 'complete', courses: [{ id: COURSE, name: 'Invented Class', section: 'Invented Section' }] };
                }),
                readSelectedCourse: vi.fn(async () => {
                    options.getAccessToken();
                    if (overrides.readError) throw overrides.readError;
                    return overrides.reading ? overrides.reading.promise : { status: 'complete', selectedCourseId: COURSE, privateFixtureName: PRIVATE_NAME };
                }),
                dispose: vi.fn(), cancel: vi.fn()
            };
            connectors.push(connector); return connector;
        }),
        convertSnapshot: vi.fn(() => converted),
        ...(overrides.serviceExtras || {})
    };
    w.AlloModules = { GoogleClassroomImport: service };
    if (overrides.unconfigured) w.eval(defaultConfig);
    else w.ALLOFLOW_CLASSROOM_IMPORT_CONFIG = {
        enabled: true, reviewedDeployment: true,
        clientId: '123456789-fictional.apps.googleusercontent.com',
        allowedOrigins: [w.location.origin], allowedAccountIds: [], ...overrides.config
    };
    if (overrides.framed) dom.reconfigure({ windowTop: {} });
    if (overrides.opener) Object.defineProperty(w, 'opener', { configurable: true, value: overrides.opener });
    w.eval(app);
    const googleScript = w.document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    function ready() { if (googleScript) googleScript.dispatchEvent(new w.Event('load')); }
    function click(id) { $(id).click(); }
    function choose() { $('classroom-course').value = COURSE; $('classroom-course').dispatchEvent(new w.Event('change')); }
    function acknowledge() { $('confirm-new-class').checked = true; $('confirm-new-class').dispatchEvent(new w.Event('change')); }
    async function grant(response = {}) {
        clients.at(-1).config.callback({ access_token: SECRET, expires_in: 3600, token_type: 'Bearer', scope: SCOPES.join(' '), ...response });
        await flush();
    }
    async function connect() { ready(); click('connect-classroom'); await grant(); }
    async function read() { choose(); click('read-classroom'); await flush(); }
    return { dom, w, $, timers, blobs, clients, connectors, oauth, logs, service, googleScript, ready, click, choose, acknowledge, grant, connect, read, advance: ms => { clock += ms; } };
}
afterEach(() => { while (roots.length) roots.pop().window.close(); vi.restoreAllMocks(); });

describe('shipped Classroom teacher helper UI', () => {
    it('keeps the shipped configuration disabled and does not request Google resources or student data', () => {
        const h = harness({ unconfigured: true });
        expect(h.googleScript).toBeNull();
        expect(h.$('connect-classroom').disabled).toBe(true);
        h.$('connect-classroom').onclick();
        expect(h.oauth.initTokenClient).not.toHaveBeenCalled();
        expect(h.service.createConnector).not.toHaveBeenCalled();
        expect(h.w.fetch).not.toHaveBeenCalled();
        expect(h.$('import-status').textContent).toContain('Not configured');
    });

    it.each([
        { config: { reviewedDeployment: false } },
        { config: { allowedOrigins: ['https://other.example.test'] } },
        { config: { clientId: 'not-a-google-client' } },
        { config: { allowedAccountIds: '900000001' } },
        { config: { allowedAccountIds: ['not valid'] } },
        { config: { unsupportedEndpoint: 'https://example.test' } },
        { url: 'http://school.example.test/classroom-import.html' },
        { framed: true }
    ])('fails closed for unapproved or malformed deployment configuration %#', options => {
        const h = harness(options);
        expect(h.googleScript).toBeNull();
        expect(h.$('connect-classroom').disabled).toBe(true);
        expect(h.w.fetch).not.toHaveBeenCalled();
    });

    it('requests exactly two readonly scopes from a teacher gesture and blocks a double connect', async () => {
        const h = harness({ config: { allowedAccountIds: ['900000001'] } });
        expect(h.oauth.initTokenClient).not.toHaveBeenCalled();
        expect(h.$('connect-classroom').disabled).toBe(true);
        h.ready(); h.click('connect-classroom'); h.$('connect-classroom').onclick();
        expect(h.oauth.initTokenClient).toHaveBeenCalledTimes(1);
        const client = h.clients[0];
        expect(client.config.scope).toBe(SCOPES.join(' '));
        expect(client.config.include_granted_scopes).toBe(false);
        expect(client.requestAccessToken).toHaveBeenCalledWith({ prompt: 'select_account' });
        await h.grant();
        expect(h.service.createConnector).toHaveBeenCalledTimes(1);
        expect(h.connectors[0].options.allowedAccountIds).toEqual(['900000001']);
        expect(h.$('course-section').hidden).toBe(false);
        expect(h.$('classroom-course').options[1].textContent).toBe('Invented Class · Invented Section');
        expect(h.w.location.href).not.toContain(COURSE);
        expect(h.w.location.href).not.toContain(SECRET);
    });

    it.each([
        { error: 'access_denied', error_description: SECRET },
        { scope: SCOPES[0] },
        { access_token: '' },
        { expires_in: 0 },
        { expires_in: 'bad' }
    ])('rejects denied, incomplete or expired authorization without displaying raw errors %#', async response => {
        const h = harness(); h.ready(); h.click('connect-classroom'); await h.grant(response);
        expect(h.service.createConnector).not.toHaveBeenCalled();
        expect(h.$('import-status').textContent).toContain('not completed');
        expect(h.w.document.body.textContent).not.toContain(SECRET);
        expect(h.$('connect-classroom').disabled).toBe(false);
    });

    it('handles scope-check exceptions and popup failure without an unhandled callback', async () => {
        const h = harness(); h.ready(); h.click('connect-classroom');
        h.oauth.hasGrantedAllScopes.mockImplementation(() => { throw new Error(SECRET); });
        await h.grant();
        expect(h.service.createConnector).not.toHaveBeenCalled();
        expect(h.$('connect-classroom').disabled).toBe(false);
        h.click('connect-classroom');
        h.clients.at(-1).config.error_callback({ type: 'popup_closed', error_description: SECRET });
        expect(h.$('import-status').textContent).toContain('closed');
        expect(h.w.document.body.textContent).not.toContain(SECRET);
    });

    it('ignores duplicate Google token/error callbacks after the first response', async () => {
        const h = harness(); await h.connect();
        await h.grant();
        h.clients[0].config.error_callback({ type: 'unknown' });
        expect(h.service.createConnector).toHaveBeenCalledTimes(1);
        expect(h.connectors[0].dispose).not.toHaveBeenCalled();
        expect(h.$('course-section').hidden).toBe(false);
    });

    it('requires complete acquisition and explicit confirmation before downloading only the codename JSON', async () => {
        const h = harness(); await h.connect(); await h.read();
        expect(h.connectors[0].readSelectedCourse).toHaveBeenCalledWith({ courseId: COURSE });
        expect(h.service.convertSnapshot).toHaveBeenCalledWith(expect.objectContaining({ status: 'complete' }), { destinationRoster: null });
        expect(h.$('roster-preview').textContent).toContain(PRIVATE_NAME);
        expect(h.$('download-classroom').disabled).toBe(true);
        h.$('download-classroom').onclick();
        expect(h.blobs).toHaveLength(0);
        h.acknowledge(); h.click('download-classroom');
        expect(h.blobs).toHaveLength(1);
        const exported = await h.blobs[0].text();
        expect(JSON.parse(exported).exportVersion).toBe(4);
        for (const privateValue of [PRIVATE_NAME, SECRET, COURSE, 'preview', 'fullName', 'privateFixtureName']) expect(exported).not.toContain(privateValue);
        expect(h.w.HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
        expect(h.$('confirm-new-class').checked).toBe(false);
        expect(h.$('download-classroom').disabled).toBe(true);
        for (const log of h.logs) expect(log).not.toHaveBeenCalled();
        expect(h.w.localStorage.length).toBe(0);
        expect(h.w.sessionStorage.length).toBe(0);
    });

    it('renders names as text and cannot execute supplied markup', async () => {
        const payload = '<img src=x onerror="window.FICTIONAL_XSS=true">';
        const h = harness({ prepared: prepared([payload]) }); await h.connect(); await h.read();
        expect(h.$('roster-preview').textContent).toContain(payload);
        expect(h.$('roster-preview').querySelector('img')).toBeNull();
        expect(h.w.FICTIONAL_XSS).toBeUndefined();
        h.acknowledge(); h.click('download-classroom');
        expect(await h.blobs[0].text()).not.toContain(payload);
    });

    it('warns explicitly and blocks export when a private name cannot be matched', async () => {
        const h = harness({ prepared: prepared(['', PRIVATE_NAME]) }); await h.connect(); await h.read();
        expect(h.$('missing-name-warning').hidden).toBe(false);
        expect(h.$('roster-preview').textContent).toContain('Name unavailable');
        expect(h.$('import-status').textContent).toContain('Download is blocked');
        h.acknowledge(); h.$('download-classroom').onclick();
        expect(h.$('download-classroom').disabled).toBe(true);
        expect(h.blobs).toHaveLength(0);
    });

    it('invalidates preview and confirmation when the teacher changes course', async () => {
        const h = harness(); await h.connect(); await h.read(); h.acknowledge();
        h.$('classroom-course').value = ''; h.$('classroom-course').dispatchEvent(new h.w.Event('change'));
        expect(h.$('preview-section').hidden).toBe(true);
        expect(h.$('roster-preview').textContent).toBe('');
        expect(h.$('confirm-new-class').checked).toBe(false);
        expect(h.$('download-classroom').disabled).toBe(true);
    });

    it('clears the session while authorization is pending and ignores the late token response', async () => {
        const h = harness(); h.ready(); h.click('connect-classroom');
        expect(h.$('clear-classroom').disabled).toBe(false);
        h.click('clear-classroom'); await h.grant();
        expect(h.service.createConnector).not.toHaveBeenCalled();
        expect(h.$('course-section').hidden).toBe(true);
        expect(h.$('import-status').textContent).toContain('Session cleared');
    });

    it('cancels a listing and never restores class metadata from its late completion', async () => {
        const listing = deferred(), h = harness({ listing });
        await h.connect(); h.click('clear-classroom');
        listing.resolve({ status: 'complete', courses: [{ id: COURSE, name: PRIVATE_NAME }] }); await flush();
        expect(h.connectors[0].dispose).toHaveBeenCalledTimes(1);
        expect(h.$('course-section').hidden).toBe(true);
        expect(h.w.document.body.textContent).not.toContain(PRIVATE_NAME);
    });

    it('blocks double roster reads and ignores late results after cancel', async () => {
        const reading = deferred(), h = harness({ reading }); await h.connect();
        h.choose(); h.click('read-classroom'); h.$('read-classroom').onclick(); await flush();
        expect(h.connectors[0].readSelectedCourse).toHaveBeenCalledTimes(1);
        h.click('cancel-classroom');
        reading.resolve({ status: 'complete', privateFixtureName: PRIVATE_NAME }); await flush();
        expect(h.service.convertSnapshot).not.toHaveBeenCalled();
        expect(h.$('preview-section').hidden).toBe(true);
        expect(h.$('roster-preview').textContent).toBe('');
        expect(h.$('import-status').textContent).toContain('cancelled');
    });

    it('clears private data and invalidates its token provider when access expires', async () => {
        const h = harness(); await h.connect(); await h.read();
        const provider = h.connectors[0].options.getAccessToken;
        expect(provider()).toBe(SECRET);
        const expiry = [...h.timers.values()].find(timer => timer.ms > 10000);
        expiry.fn();
        expect(() => provider()).toThrow('AUTH_REQUIRED');
        expect(h.connectors[0].dispose).toHaveBeenCalledTimes(1);
        expect(h.$('roster-preview').textContent).toBe('');
        expect(h.$('import-status').textContent).toContain('expired');
    });

    it('rejects an expired token even when its timer has not fired and clears a revoked/denied read', async () => {
        const h = harness(); await h.connect(); h.advance(3600001); await h.read();
        expect(h.service.convertSnapshot).not.toHaveBeenCalled();
        expect(h.$('course-section').hidden).toBe(true);
        expect(h.$('import-status').textContent).toContain('Reconnect to retry');
        const denied = harness({ readError: new Error(SECRET) }); await denied.connect(); await denied.read();
        expect(denied.connectors[0].dispose).toHaveBeenCalledTimes(1);
        expect(denied.$('read-classroom').disabled).toBe(true);
        expect(denied.w.document.body.textContent).not.toContain(SECRET);
    });

    it('revokes only on explicit confirmation and ignores revocation callbacks from a cleared generation', async () => {
        const h = harness(); await h.connect();
        h.w.confirm.mockReturnValueOnce(false); h.click('revoke-classroom');
        expect(h.oauth.revoke).not.toHaveBeenCalled();
        h.click('revoke-classroom');
        expect(h.oauth.revoke).toHaveBeenCalledWith(SECRET, expect.any(Function));
        expect(h.connectors[0].dispose).toHaveBeenCalledTimes(1);
        expect(h.$('course-section').hidden).toBe(true);
        h.click('connect-classroom');
        h.oauth.revoke.mock.calls[0][1]({ successful: false, error_description: SECRET });
        expect(h.$('import-status').textContent).toContain('Choose your school');
        expect(h.w.document.body.textContent).not.toContain(SECRET);
    });

    it('clears private preview and pending download URLs on pagehide or explicit clearing', async () => {
        const h = harness(); await h.connect(); await h.read(); h.acknowledge(); h.click('download-classroom');
        h.w.dispatchEvent(new h.w.Event('pagehide'));
        expect(h.w.URL.revokeObjectURL).toHaveBeenCalledWith('blob:https://alloflow.example.test/fictional-1');
        expect(h.$('roster-preview').textContent).toBe('');
        expect(h.$('preview-section').hidden).toBe(true);
        expect(() => h.connectors[0].options.getAccessToken()).toThrow('AUTH_REQUIRED');
    });

    it('cleans up failed download attempts without logging private values or losing the reviewed preview', async () => {
        const h = harness(); await h.connect(); await h.read(); h.acknowledge();
        h.w.HTMLAnchorElement.prototype.click.mockImplementation(() => { throw new Error(SECRET); });
        h.click('download-classroom');
        expect(h.w.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
        expect(h.w.document.querySelector('a[download]')).toBeNull();
        expect(h.$('roster-preview').textContent).toContain(PRIVATE_NAME);
        expect(h.$('import-status').textContent).toContain('could not start');
        expect(h.w.document.body.textContent).not.toContain(SECRET);
    });
});

describe('in-app handoff to the AlloFlow tab that opened the helper', () => {
    const sameOrigin = 'https://alloflow.example.test';
    function opener(origin = sameOrigin, extra = {}) {
        const location = {};
        Object.defineProperty(location, 'origin', { get() { if (origin === 'throw') throw new Error('SecurityError'); return origin; } });
        return { closed: false, location, postMessage: vi.fn(), focus: vi.fn(), ...extra };
    }
    async function reviewed(h) { await h.connect(); await h.read(); h.acknowledge(); }
    function reply(h, target, data, origin = sameOrigin) {
        const event = new h.w.MessageEvent('message', { data, origin });
        Object.defineProperty(event, 'source', { value: target });
        h.w.dispatchEvent(event);
    }

    it('offers no send button without a same-origin opener', async () => {
        for (const o of [undefined, opener('https://other.example.test'), opener('throw'), opener(sameOrigin, { closed: true })]) {
            const h = harness({ opener: o });
            await reviewed(h);
            expect(h.$('send-classroom').hidden).toBe(true);
            expect(h.$('handoff-note').hidden).toBe(true);
            expect(h.$('download-classroom').disabled).toBe(false);
            if (o) expect(o.postMessage.mock.calls.every(([message]) => message.type === 'alloflow-classroom-hello')).toBe(true);
        }
    });

    it('posts only the codename JSON to its own origin after review and confirmation, then reports the reply', async () => {
        const o = opener();
        const h = harness({ opener: o });
        h.ready();
        expect(o.postMessage.mock.calls).toEqual([[{ type: 'alloflow-classroom-hello' }, sameOrigin]]);
        o.postMessage.mockClear();
        expect(h.$('send-classroom').hidden).toBe(false);
        expect(h.$('send-classroom').disabled).toBe(true);
        h.click('send-classroom');
        expect(o.postMessage).not.toHaveBeenCalled();
        await h.connect(); await h.read();
        expect(h.$('send-classroom').disabled).toBe(true);
        h.acknowledge();
        expect(h.$('send-classroom').disabled).toBe(false);
        h.click('send-classroom');
        expect(o.postMessage).toHaveBeenCalledTimes(1);
        const [message, targetOrigin] = o.postMessage.mock.calls[0];
        expect(targetOrigin).toBe(sameOrigin);
        expect(message).toEqual({ type: 'alloflow-classroom-roster', json: prepared().json, mode: 'replace' });
        expect(JSON.stringify(message)).not.toContain(PRIVATE_NAME);
        expect(JSON.stringify(message)).not.toContain(SECRET);
        expect(o.focus).toHaveBeenCalled();
        expect(h.$('confirm-new-class').checked).toBe(false);
        expect(h.$('import-status').textContent).toContain('Roster sent');
        expect(h.$('roster-preview').children).toHaveLength(1);
        expect(h.blobs).toHaveLength(0);
        reply(h, {}, { type: 'alloflow-classroom-roster-received', ok: true, message: 'ignored: wrong source' });
        reply(h, o, { type: 'alloflow-classroom-roster-received', ok: true, message: 'ignored: wrong origin' }, 'https://other.example.test');
        expect(h.$('import-status').textContent).toContain('Roster sent');
        reply(h, o, { type: 'alloflow-classroom-roster-received', ok: false, message: 'Roster replacement cancelled. Nothing changed.' });
        expect(h.$('import-status').textContent).toBe('AlloFlow did not import the roster. Roster replacement cancelled. Nothing changed.');
        h.acknowledge(); h.click('send-classroom');
        reply(h, o, { type: 'alloflow-classroom-roster-received', ok: true, message: 'Roster imported: 0 groups and 1 codenames. Legacy real-name fields were removed.' });
        expect(h.$('import-status').textContent).toContain('AlloFlow imported the roster. Roster imported: 0 groups and 1 codenames.');
        expect(h.$('import-status').textContent).not.toContain('<');
    });

    it('tells the teacher to switch tabs while AlloFlow waits for confirmation, without the no-reply warning', async () => {
        const o = opener();
        const h = harness({ opener: o });
        await reviewed(h);
        h.click('send-classroom');
        const pending = [...h.timers.values()].find(timer => timer.ms === 20000);
        reply(h, o, { type: 'alloflow-classroom-roster-received', ok: true, pending: true, message: 'Switch to the AlloFlow tab: the roster is waiting there for your confirmation.' });
        expect(h.$('import-status').textContent).toBe('Switch to the AlloFlow tab: the roster is waiting there for your confirmation.');
        expect(h.w.clearTimeout).toHaveBeenCalled();
        expect([...h.timers.values()]).not.toContain(pending);
        reply(h, o, { type: 'alloflow-classroom-roster-received', ok: true, pending: false, message: 'Roster imported: 0 groups and 1 codenames.' });
        expect(h.$('import-status').textContent).toContain('AlloFlow imported the roster. Roster imported');
    });

    it('tells the teacher to download instead when AlloFlow never confirms, and cannot be spoofed by markup', async () => {
        const o = opener();
        const h = harness({ opener: o });
        await reviewed(h);
        h.click('send-classroom');
        const pending = [...h.timers.values()].find(timer => timer.ms === 20000);
        expect(pending).toBeTruthy();
        pending.fn();
        expect(h.$('import-status').textContent).toContain('download the roster instead');
        h.acknowledge(); h.click('send-classroom');
        reply(h, o, { type: 'alloflow-classroom-roster-received', ok: true, message: '<img src=x onerror="alert(1)">' + 'x'.repeat(1000) });
        expect(h.$('import-status').querySelector('img')).toBeNull();
        expect(h.$('import-status').textContent.length).toBeLessThan(420);
        expect(h.logs.every(spy => spy.mock.calls.every(call => !JSON.stringify(call).includes(PRIVATE_NAME) && !JSON.stringify(call).includes(SECRET)))).toBe(true);
    });
});

describe('linked Classroom sync in the helper', () => {
    const sameOrigin = 'https://alloflow.example.test';
    const KEY = 'K'.repeat(42) + 'A';
    const LINKED_CLASS = 'CLS-33333333-3333-4333-8333-333333333333';
    const RETURNING = 'LRN-44444444-4444-4444-8444-444444444444';
    function opener() {
        const location = {};
        Object.defineProperty(location, 'origin', { get: () => sameOrigin });
        return { closed: false, location, postMessage: vi.fn(), focus: vi.fn() };
    }
    function linkedResult(status = 'new') {
        const base = prepared();
        return { ...base, preview: base.preview.map(row => ({ ...row, status })), returningCount: status === 'returning' ? 1 : 0, newCount: status === 'new' ? 1 : 0, absentCount: status === 'returning' ? 2 : 0 };
    }
    function context(h, o, data, origin = sameOrigin) {
        const event = new h.w.MessageEvent('message', { data: { type: 'alloflow-classroom-context', ...data }, origin });
        Object.defineProperty(event, 'source', { value: o });
        h.w.dispatchEvent(event);
    }
    function extras(result = linkedResult(), ids = { [COURSE]: LINKED_CLASS }) {
        return { convertLinkedSnapshot: vi.fn(async () => { if (result instanceof Error) throw result; return result; }), linkedClassIds: vi.fn(async () => ids) };
    }

    it('links a new class: hides download, converts with the device key and sends in link mode', async () => {
        const o = opener(), serviceExtras = extras();
        const h = harness({ opener: o, serviceExtras });
        context(h, o, { mode: 'link', syncKey: KEY, classId: null, existing: {} });
        expect(h.$('send-classroom').textContent).toBe('Send to AlloFlow and link this class');
        expect(h.$('download-classroom').hidden).toBe(true);
        await h.connect(); await h.read();
        expect(serviceExtras.convertLinkedSnapshot).toHaveBeenCalledWith(expect.objectContaining({ selectedCourseId: COURSE }), { syncKey: KEY, classId: null, existing: {} });
        expect(h.service.convertSnapshot).not.toHaveBeenCalled();
        expect(h.$('preview-count').textContent).toContain('Sending links this class');
        h.acknowledge();
        expect(h.$('download-classroom').disabled).toBe(true);
        h.click('download-classroom');
        expect(h.blobs).toHaveLength(0);
        h.click('send-classroom');
        const sent = o.postMessage.mock.calls.find(([message]) => message.type === 'alloflow-classroom-roster')[0];
        expect(sent.mode).toBe('link');
        expect(JSON.stringify(sent)).not.toContain(KEY);
        expect(h.$('import-status').textContent).not.toContain(KEY);
        expect(h.logs.every(spy => spy.mock.calls.every(call => !JSON.stringify(call).includes(KEY)))).toBe(true);
    });

    it('syncs a linked class: preselects the linked course, shows what changes and sends in sync mode', async () => {
        const o = opener(), serviceExtras = extras(linkedResult('returning'));
        const h = harness({ opener: o, serviceExtras });
        context(h, o, { mode: 'sync', syncKey: KEY, classId: LINKED_CLASS, existing: { [RETURNING]: 'Calm Owl 1' } });
        expect(h.$('send-classroom').textContent).toBe('Send update to AlloFlow');
        expect(h.$('confirm-text').textContent).toContain('AlloFlow will list every change');
        await h.connect();
        expect(serviceExtras.linkedClassIds).toHaveBeenCalledWith(KEY, [COURSE]);
        expect(h.$('classroom-course').value).toBe(COURSE);
        expect(h.$('import-status').textContent).toContain('linked to this AlloFlow class is selected');
        h.click('read-classroom'); await flush();
        expect(serviceExtras.convertLinkedSnapshot.mock.calls[0][1]).toEqual({ syncKey: KEY, classId: LINKED_CLASS, existing: { [RETURNING]: 'Calm Owl 1' } });
        expect(h.$('preview-count').textContent).toBe('1 students read: 1 keep their codenames, 0 new, and 2 in AlloFlow are no longer in this Classroom class (AlloFlow keeps them).');
        h.acknowledge(); h.click('send-classroom');
        expect(o.postMessage.mock.calls.find(([message]) => message.type === 'alloflow-classroom-roster')[0].mode).toBe('sync');
        expect(h.$('import-status').textContent).toContain('Update sent');
    });

    it('explains a class mismatch without discarding the connection, and says when no listed class is the linked one', async () => {
        const mismatch = Object.assign(new Error('LINKED_CLASS_MISMATCH'), { code: 'LINKED_CLASS_MISMATCH' });
        const o = opener(), serviceExtras = extras(mismatch, { [COURSE]: 'CLS-55555555-5555-4555-8555-555555555555' });
        const h = harness({ opener: o, serviceExtras });
        context(h, o, { mode: 'sync', syncKey: KEY, classId: LINKED_CLASS, existing: {} });
        await h.connect();
        expect(h.$('import-status').textContent).toContain('None of the classes this account teaches is the one linked');
        await h.read();
        expect(h.$('import-status').textContent).toContain('linked to a different Google Classroom class');
        expect(h.$('preview-section').hidden).toBe(true);
        expect(h.$('course-section').hidden).toBe(false);
        expect(h.connectors[0].dispose).not.toHaveBeenCalled();
    });

    it('ignores malformed contexts and contexts from anywhere but its own opener', async () => {
        const o = opener(), serviceExtras = extras();
        const h = harness({ opener: o, serviceExtras });
        context(h, o, { mode: 'sync', syncKey: 'short', classId: LINKED_CLASS, existing: {} });
        context(h, o, { mode: 'link', syncKey: KEY, classId: LINKED_CLASS, existing: {} });
        context(h, o, { mode: 'link', syncKey: KEY, classId: null, existing: { [RETURNING]: 'Calm Owl' } });
        context(h, o, { mode: 'admin', syncKey: KEY, classId: null, existing: {} });
        context(h, {}, { mode: 'link', syncKey: KEY, classId: null, existing: {} });
        context(h, o, { mode: 'link', syncKey: KEY, classId: null, existing: {} }, 'https://other.example.test');
        expect(h.$('send-classroom').textContent).toBe('Send to the AlloFlow tab');
        expect(h.$('download-classroom').hidden).toBe(false);
        await h.connect(); await h.read();
        expect(serviceExtras.convertLinkedSnapshot).not.toHaveBeenCalled();
        expect(h.service.convertSnapshot).toHaveBeenCalled();
    });
});
