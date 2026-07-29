import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createAlloSheetGristBridge,
  normalizeBaseUrl,
  validatePatchRecords,
} = require(resolve(process.cwd(), 'desktop', 'runtime', 'allosheet-grist-bridge.cjs'));

const TEST_ELECTRON_KEY = 'AbCdEfGhIjKlMnOpQrStUv';
const TEST_ELECTRON_KEY_ROTATED = 'ZyXwVuTsRqPoNmLkJiHgFe';
const TEST_SESSION_COOKIE = 'allosheet_1234567890abcdef';

function responseHeaders(source = {}) {
  const values = new Map(
    Object.entries(source).map(([name, value]) => [name.toLowerCase(), value])
  );
  return {
    get(name) {
      const value = values.get(String(name).toLowerCase());
      return Array.isArray(value) ? value.join(', ') : (value || null);
    },
    getSetCookie() {
      const value = values.get('set-cookie');
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    },
  };
}

function jsonResponse(payload, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: responseHeaders(headers),
    text: async () => JSON.stringify(payload),
  };
}

describe('AlloSheet server-side Grist bridge', () => {
  it('never returns the Grist API key in public configuration', () => {
    const bridge = createAlloSheetGristBridge({
      env: {
        ALLOFLOW_GRIST_URL: 'http://127.0.0.1:8484',
        ALLOFLOW_GRIST_API_KEY: 'top-secret-key',
      },
      fetchImpl: async () => jsonResponse({}),
    });

    const config = bridge.getPublicConfig();
    expect(config.configured).toBe(true);
    expect(config.baseUrl).toBe('http://127.0.0.1:8484');
    expect(JSON.stringify(config)).not.toContain('top-secret-key');
    expect(config).not.toHaveProperty('apiKey');
  });

  it('allows loopback by default and requires explicit HTTPS opt-in for remote Grist', () => {
    expect(normalizeBaseUrl('http://localhost:8484', false).origin).toBe('http://localhost:8484');
    expect(() => normalizeBaseUrl('https://grist.school.example', false)).toThrow(/disabled/i);
    expect(() => normalizeBaseUrl('http://grist.school.example', true)).toThrow(/HTTPS/i);
    expect(normalizeBaseUrl('https://grist.school.example', true).origin).toBe('https://grist.school.example');
  });

  it('brokers a private runtime-managed loopback session without exposing it or requiring an API key', async () => {
    const calls = [];
    const bridge = createAlloSheetGristBridge({
      env: {},
      connectionProvider: () => ({
        baseUrl: 'http://127.0.0.1:49152',
        bootstrapSession: true,
        managed: true,
        electronKey: TEST_ELECTRON_KEY,
        sessionCookieName: TEST_SESSION_COOKIE,
      }),
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), options });
        const pathname = new URL(url).pathname;
        if (pathname === '/') {
          return jsonResponse({}, 302, {
            location: '/session-ready',
            'set-cookie': `${TEST_SESSION_COOKIE}=private-session-value; Path=/; HttpOnly; SameSite=Lax`,
          });
        }
        if (pathname === '/session-ready') {
          return jsonResponse({}, 200, {
            'set-cookie': 'grist_sid_status=active; Path=/; HttpOnly',
          });
        }
        return jsonResponse({ orgs: [] });
      },
    });

    expect(bridge.getPublicConfig()).toMatchObject({
      configured: true,
      mode: 'managed-local',
      managedEngine: true,
    });
    expect(JSON.stringify(bridge.getPublicConfig())).not.toContain('private-session-value');
    expect(JSON.stringify(bridge.getPublicConfig())).not.toContain(TEST_ELECTRON_KEY);
    await expect(bridge.handleOperation({ operation: 'status' })).resolves.toMatchObject({
      connected: true,
      managedEngine: true,
    });
    expect(calls.map((call) => call.url)).toEqual([
      'http://127.0.0.1:49152/',
      'http://127.0.0.1:49152/session-ready',
      'http://127.0.0.1:49152/api/orgs',
    ]);
    expect(calls[0].options.headers.Cookie).toContain(`electron_key=${TEST_ELECTRON_KEY}`);
    expect(calls[0].options.headers.Cookie).not.toContain(TEST_SESSION_COOKIE);
    expect(calls[1].options.headers.Cookie).toContain(`${TEST_SESSION_COOKIE}=private-session-value`);
    expect(calls[2].options.headers.Cookie).toContain(`${TEST_SESSION_COOKIE}=private-session-value`);
    expect(calls[2].options.headers).not.toHaveProperty('Authorization');
  });

  it('finds and caches the stable managed workbook without exposing a create operation', async () => {
    const calls = [];
    const bridge = createAlloSheetGristBridge({
      env: {},
      connectionProvider: () => ({
        baseUrl: 'http://127.0.0.1:49152',
        bootstrapSession: true,
        managed: true,
        electronKey: TEST_ELECTRON_KEY,
        sessionCookieName: TEST_SESSION_COOKIE,
      }),
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), options });
        const pathname = new URL(url).pathname;
        if (pathname === '/') {
          return jsonResponse({}, 200, {
            'set-cookie': `${TEST_SESSION_COOKIE}=private-session-value; Path=/; HttpOnly`,
          });
        }
        if (pathname === '/api/orgs/current/workspaces') {
          return jsonResponse([{
            id: 4,
            name: 'Home',
            orgDomain: 'alloflow',
            docs: [],
          }, {
            id: 5,
            name: 'Curriculum',
            orgDomain: 'alloflow',
            docs: [
              { id: 8, urlId: 'stable-doc-id', name: 'AlloSheet', isPinned: true },
              { id: 9, urlId: 'other-doc-id', name: 'Other workbook' },
            ],
          }]);
        }
        throw new Error(`Unexpected request: ${pathname}`);
      },
    });

    const [first, second] = await Promise.all([
      bridge.ensureManagedWorkbook(),
      bridge.ensureManagedWorkbook(),
    ]);
    expect(first).toEqual({
      docId: 'stable-doc-id',
      editorUrl: 'http://127.0.0.1:49152/doc/stable-doc-id',
    });
    expect(second).toEqual(first);
    expect(new URL(first.editorUrl).origin).toBe('http://127.0.0.1:49152');
    await expect(bridge.ensureManagedWorkbook()).resolves.toEqual(first);
    expect(calls.filter((call) => new URL(call.url).pathname === '/api/orgs/current/workspaces')).toHaveLength(1);
    expect(calls.filter((call) => call.options.method === 'POST')).toHaveLength(0);
    await expect(bridge.handleOperation({
      operation: 'ensureManagedWorkbook',
      docId: 'stable-doc-id',
      tableId: 'Table1',
    })).rejects.toMatchObject({ code: 'operation-not-allowed' });
  });

  it('invalidates the managed workbook cache when the private engine session rotates', async () => {
    let activeKey = TEST_ELECTRON_KEY;
    let rootCalls = 0;
    let workspaceCalls = 0;
    const bridge = createAlloSheetGristBridge({
      env: {},
      connectionProvider: () => ({
        baseUrl: 'http://127.0.0.1:49152',
        bootstrapSession: true,
        managed: true,
        electronKey: activeKey,
        sessionCookieName: TEST_SESSION_COOKIE,
      }),
      fetchImpl: async (url) => {
        const pathname = new URL(url).pathname;
        if (pathname === '/') {
          rootCalls += 1;
          return jsonResponse({}, 200, {
            'set-cookie': `${TEST_SESSION_COOKIE}=session-${rootCalls}; Path=/; HttpOnly`,
          });
        }
        if (pathname === '/api/orgs/current/workspaces') {
          workspaceCalls += 1;
          const docId = activeKey === TEST_ELECTRON_KEY ? 'first-doc' : 'second-doc';
          return jsonResponse([{
            id: 4,
            name: 'Home',
            docs: [{ id: docId, urlId: docId, name: 'AlloSheet', isPinned: true }],
          }]);
        }
        throw new Error(`Unexpected request: ${pathname}`);
      },
    });

    await expect(bridge.ensureManagedWorkbook()).resolves.toMatchObject({
      docId: 'first-doc',
    });
    activeKey = TEST_ELECTRON_KEY_ROTATED;
    await expect(bridge.ensureManagedWorkbook()).resolves.toMatchObject({
      docId: 'second-doc',
    });
    expect(rootCalls).toBe(2);
    expect(workspaceCalls).toBe(2);
  });

  it('serializes creation of the stable managed workbook and pins it', async () => {
    const calls = [];
    const bridge = createAlloSheetGristBridge({
      env: {},
      connectionProvider: () => ({
        baseUrl: 'http://127.0.0.1:49153',
        bootstrapSession: true,
        managed: true,
        electronKey: TEST_ELECTRON_KEY,
        sessionCookieName: TEST_SESSION_COOKIE,
      }),
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), options });
        const pathname = new URL(url).pathname;
        if (pathname === '/') {
          return jsonResponse({}, 200, {
            'set-cookie': `${TEST_SESSION_COOKIE}=private-session-value; Path=/; HttpOnly`,
          });
        }
        if (pathname === '/api/orgs/current/workspaces') {
          return jsonResponse([{ id: 4, name: 'Home', orgDomain: 'alloflow', docs: [] }]);
        }
        if (pathname === '/api/workspaces/4/docs') return jsonResponse('created-doc-id');
        throw new Error(`Unexpected request: ${pathname}`);
      },
    });

    const bindings = await Promise.all(Array.from(
      { length: 4 },
      () => bridge.ensureManagedWorkbook()
    ));
    expect(bindings).toEqual(Array.from({ length: 4 }, () => ({
      docId: 'created-doc-id',
      editorUrl: 'http://127.0.0.1:49153/doc/created-doc-id',
    })));
    const createCalls = calls.filter((call) => new URL(call.url).pathname === '/api/workspaces/4/docs');
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0].options.method).toBe('POST');
    expect(JSON.parse(createCalls[0].options.body)).toEqual({
      name: 'AlloSheet',
      isPinned: true,
    });
  });

  it('recovers a cross-process create race by relisting workspaces', async () => {
    let listCalls = 0;
    const bridge = createAlloSheetGristBridge({
      env: {},
      connectionProvider: () => ({
        baseUrl: 'http://127.0.0.1:49154',
        bootstrapSession: true,
        managed: true,
        electronKey: TEST_ELECTRON_KEY,
        sessionCookieName: TEST_SESSION_COOKIE,
      }),
      fetchImpl: async (url) => {
        const pathname = new URL(url).pathname;
        if (pathname === '/') {
          return jsonResponse({}, 200, {
            'set-cookie': `${TEST_SESSION_COOKIE}=private-session-value; Path=/; HttpOnly`,
          });
        }
        if (pathname === '/api/orgs/current/workspaces') {
          listCalls += 1;
          return jsonResponse([{
            id: 4,
            name: 'Home',
            docs: listCalls === 1
              ? []
              : [{ id: 'race-winner-id', name: 'AlloSheet', isPinned: true }],
          }]);
        }
        if (pathname === '/api/workspaces/4/docs') {
          return jsonResponse({ error: 'Document already exists.' }, 409);
        }
        throw new Error(`Unexpected request: ${pathname}`);
      },
    });

    await expect(bridge.ensureManagedWorkbook()).resolves.toEqual({
      docId: 'race-winner-id',
      editorUrl: 'http://127.0.0.1:49154/doc/race-winner-id',
    });
    expect(listCalls).toBe(2);
  });

  it('keeps automatic workbook creation unavailable to external Grist connections', async () => {
    const bridge = createAlloSheetGristBridge({
      env: {
        ALLOFLOW_GRIST_URL: 'http://127.0.0.1:8484',
        ALLOFLOW_GRIST_API_KEY: 'server-only-key',
      },
      fetchImpl: async () => jsonResponse([]),
    });

    await expect(bridge.ensureManagedWorkbook())
      .rejects.toMatchObject({ code: 'managed-workbook-unavailable' });
  });

  it('never permits managed session bootstrap against a remote Grist host', async () => {
    const bridge = createAlloSheetGristBridge({
      env: {},
      connectionProvider: () => ({
        baseUrl: 'https://grist.school.example',
        allowRemote: true,
        bootstrapSession: true,
        managed: true,
        electronKey: TEST_ELECTRON_KEY,
        sessionCookieName: TEST_SESSION_COOKIE,
      }),
      fetchImpl: async () => jsonResponse({}),
    });

    expect(bridge.getPublicConfig()).toMatchObject({ configured: false });
    await expect(bridge.handleOperation({ operation: 'status' }))
      .rejects.toMatchObject({ code: 'invalid-config' });
  });

  it('rejects the deprecated unauthenticated managed-engine mode', async () => {
    const bridge = createAlloSheetGristBridge({
      env: {},
      connectionProvider: () => ({
        baseUrl: 'http://127.0.0.1:49152',
        allowUnauthenticated: true,
        managed: true,
      }),
      fetchImpl: async () => jsonResponse({}),
    });

    expect(bridge.getPublicConfig()).toMatchObject({
      configured: false,
      managedEngine: true,
    });
    await expect(bridge.handleOperation({ operation: 'status' }))
      .rejects.toMatchObject({ code: 'invalid-config' });
  });

  it('routes only fixed table operations and caps record reads', async () => {
    const calls = [];
    const bridge = createAlloSheetGristBridge({
      env: {
        ALLOFLOW_GRIST_URL: 'http://127.0.0.1:8484',
        ALLOFLOW_GRIST_API_KEY: 'server-only-key',
      },
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), options });
        return jsonResponse({ tables: [{ id: 'Attendance' }], records: [] });
      },
    });

    await bridge.handleOperation({ operation: 'listTables', docId: 'doc one' });
    await bridge.handleOperation({
      operation: 'readRecords',
      docId: 'doc one',
      tableId: 'Attendance',
      limit: 9999,
    });

    expect(calls[0].url).toBe('http://127.0.0.1:8484/api/docs/doc%20one/tables');
    expect(calls[1].url).toBe('http://127.0.0.1:8484/api/docs/doc%20one/tables/Attendance/records?limit=200');
    expect(calls[0].options.headers.Authorization).toBe('Bearer server-only-key');
    await expect(bridge.handleOperation({
      operation: 'deleteRecords',
      docId: 'doc',
      tableId: 'Attendance',
    })).rejects.toMatchObject({ code: 'operation-not-allowed' });
  });

  it('validates reviewed update patches before forwarding them', async () => {
    const calls = [];
    const bridge = createAlloSheetGristBridge({
      env: {
        ALLOFLOW_GRIST_URL: 'http://127.0.0.1:8484',
        ALLOFLOW_GRIST_API_KEY: 'server-only-key',
      },
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), options });
        return jsonResponse({ records: [] });
      },
    });

    await bridge.handleOperation({
      operation: 'applyUpdates',
      docId: 'doc',
      tableId: 'Attendance',
      records: [{ id: 4, fields: { Status: 'Present', Verified: true } }],
    });
    expect(calls[0].options.method).toBe('PATCH');
    expect(JSON.parse(calls[0].options.body)).toEqual({
      records: [{ id: 4, fields: { Status: 'Present', Verified: true } }],
    });

    expect(() => validatePatchRecords([{ id: 0, fields: { Status: 'x' } }])).toThrow(/positive numeric/i);
    expect(() => validatePatchRecords([{ id: 1, fields: { Status: { nested: true } } }])).toThrow(/only text/i);
    const polluted = JSON.parse('[{"id":1,"fields":{"__proto__":"blocked"}}]');
    expect(() => validatePatchRecords(polluted)).toThrow(/field name/i);

    const tooManyChanges = Array.from({ length: 3 }, (_, recordIndex) => ({
      id: recordIndex + 1,
      fields: Object.fromEntries(Array.from({ length: 40 }, (_, fieldIndex) => [`Field_${recordIndex}_${fieldIndex}`, 'x'])),
    }));
    expect(() => validatePatchRecords(tooManyChanges)).toThrow(/100 cell changes/i);
  });
});
