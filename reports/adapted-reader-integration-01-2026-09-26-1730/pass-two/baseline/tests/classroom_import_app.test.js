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
        convertSnapshot: vi.fn(() => converted)
    };
    w.AlloModules = { GoogleClassroomImport: service };
    if (overrides.unconfigured) w.eval(defaultConfig);
    else w.ALLOFLOW_CLASSROOM_IMPORT_CONFIG = {
        enabled: true, reviewedDeployment: true,
        clientId: '123456789-fictional.apps.googleusercontent.com',
        allowedOrigins: [w.location.origin], allowedAccountIds: [], ...overrides.config
    };
    if (overrides.framed) dom.reconfigure({ windowTop: {} });
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
