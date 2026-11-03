import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const source = fs.readFileSync(process.env.ALLO_SECURITY_BASELINE === '1' ? 'tmp/security-remediation-20261101/desktop/runtime.before.cjs' : 'desktop/runtime/alloflow-desktop-runtime.cjs', 'utf8');
function declaration(name) {
  const start = source.indexOf('function ' + name + '(');
  const next = source.indexOf('\n}', start) + 2;
  if (start < 0 || next < start) throw Error('Missing runtime function ' + name);
  return source.slice(start, next);
}
function harness() {
  const sessions = new Map([['CLASSA', {}], ['CLASSB', {}]]);
  const now = Date.now();
  const docs = new Map();
  for (const code of sessions.keys()) for (const kind of ['sessionResource', 'sessionResourcesManifest', 'sessionResourceChunk']) {
    docs.set(code + '_' + kind, { data: { parentId: code, parentKind: 'live', ownerUid: 'synthetic-teacher', kind, data: 'synthetic ' + code }, expiresAtMs: now + 60000 });
  }
  const context = vm.createContext({ crypto, Buffer, Date, URL, console, lanDocs: docs,
    managedLanShare: { tokenSecret: Buffer.alloc(32, 7) }, LAN_TOKEN_TTL_MS: 60000,
    LAN_PARTICIPANT_UID_PATTERN: /^lan-student-[a-f0-9]{16}$/,
    sanitizeLanSessionCode: value => String(value || '').replace(/[^A-Z0-9]/g, '').slice(0, 12),
    sanitizeLanDocKey: value => value, cloneJson: value => JSON.parse(JSON.stringify(value)),
    serializeLanSession: code => sessions.has(code) ? { id: code, data: sessions.get(code) } : null,
    isPlainObject: value => !!value && typeof value === 'object' && !Array.isArray(value),
    readConfig: () => ({}), getRequestOrigin: () => 'http://127.0.0.1',
    consumeLanRateLimit: () => true, LAN_READ_RATE_PER_MINUTE: 600,
    jsonResponse: (res, status, body) => Object.assign(res, { status, body }),
  });
  for (const name of ['encodeLanTokenPayload', 'signLanTokenInput', 'issueLanParticipantToken', 'readLanBearerToken', 'verifyLanParticipantToken', 'requireLanToken', 'compactLanDocs', 'serializeLanDoc']) vm.runInContext(declaration(name), context);
  vm.runInContext('async ' + declaration('handlePublicLanApi'), context);
  return { context, docs, sessions,
    token: code => context.issueLanParticipantToken(code).token,
    async get(key, token) {
      const res = {};
      await context.handlePublicLanApi({ method: 'GET', headers: token ? { authorization: 'Bearer ' + token } : {} }, res, new URL('http://127.0.0.1/api/lan-docs/' + key));
      return res;
    },
  };
}
describe('LAN asset authorization with signed synthetic classroom tokens', () => {
  it('allows the matching resource, manifest and chunk, but denies another class even with known IDs', async () => {
    const h = harness(), token = h.token('CLASSA');
    for (const kind of ['sessionResource', 'sessionResourcesManifest', 'sessionResourceChunk']) {
      expect((await h.get('CLASSA_' + kind, token)).status).toBe(200);
      const other = await h.get('CLASSB_' + kind, token);
      expect(other.status).toBe(404);
      expect(JSON.stringify(other.body)).not.toContain('synthetic CLASSB');
    }
  });
  it('rejects absent/invalid tokens and metadata, unknown parents, and expired entries', async () => {
    const h = harness(), token = h.token('CLASSA'), key = 'CLASSA_sessionResource';
    expect((await h.get(key)).status).toBe(401);
    expect((await h.get(key, token + 'x')).status).toBe(401);
    for (const data of [{}, { parentId: 'CLASSA' }, { parentId: 'CLASSA', parentKind: 'assignment' }, { parentId: 'CLASSA!', parentKind: 'live' }]) {
      h.docs.set('invalid', { data, expiresAtMs: Date.now() + 60000 });
      expect((await h.get('invalid', token)).status).toBe(404);
    }
    h.sessions.delete('CLASSA');
    expect((await h.get(key, token)).status).toBe(404);
    h.docs.get(key).expiresAtMs = Date.now() - 1;
    expect(h.context.serializeLanDoc(key)).toBeNull();
  });
  it('preserves private teacher reads including legacy unscoped documents', () => {
    const h = harness(); h.docs.set('legacy', { data: { data: 'teacher only' } });
    expect(h.context.serializeLanDoc('legacy').data.data).toBe('teacher only');
    expect(h.context.serializeLanDoc('CLASSB_sessionResource').data.parentId).toBe('CLASSB');
  });
});
