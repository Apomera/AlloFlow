// Cloudflare Worker /submitPd — endpoint test.
//
// Drives the real worker (catalog/cloudflare-worker/src/index.js) default fetch
// handler with a fake KV binding, proving PD submissions are validated and
// staged to PRIVATE KV (PD_SUBMISSIONS) — never the public GitHub /submit path.

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import worker from '../catalog/cloudflare-worker/src/index.js';

function postPd(body, env) {
  const req = new Request('https://worker.test/submitPd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  });
  return worker.fetch(req, env);
}

function fakeKv() {
  const store = {};
  return {
    store,
    async put(k, v, opts) { store[k] = { v, opts }; },
    async get(k) { return store[k] ? store[k].v : null; },
    async list(o) {
      o = o || {};
      const names = Object.keys(store).filter((k) => !o.prefix || k.indexOf(o.prefix) === 0);
      return { keys: names.map((n) => ({ name: n })) };
    },
  };
}

function validPayload() {
  return {
    pd_module: {
      schema_version: 'pd-1.0',
      kind: 'pd_module',
      metadata: { id: 'x', title: 'Test PD', topic: 'UDL' },
      sections: [{ title: 'S', activities: [{ id: 'a', type: 'read', title: 'Read', content: { body: 'hi' } }] }],
    },
    credit: 'Test Author',
    affirmations: { author_or_authorized: true, no_pii: true, license_agreed: true, age_eligible: true },
  };
}

describe('worker /submitPd', () => {
  it('stores a valid submission in private KV and returns 201', async () => {
    const env = { PD_SUBMISSIONS: fakeKv() };
    const res = await postPd(validPayload(), env);
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.slug).toBe('test-pd');

    const keys = Object.keys(env.PD_SUBMISSIONS.store);
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith('pd:')).toBe(true);
    const rec = JSON.parse(env.PD_SUBMISSIONS.store[keys[0]].v);
    expect(rec.kind).toBe('pd_submission');
    expect(rec.pd_module.kind).toBe('pd_module');
    expect(rec.title).toBe('Test PD');
  });

  it('fails closed (500) when the KV binding is missing — never silent data loss', async () => {
    const res = await postPd(validPayload(), {}); // no PD_SUBMISSIONS, no GITHUB_PAT
    expect(res.status).toBe(500);
    const j = await res.json();
    expect(j.ok).toBe(false);
    expect(j.error).toMatch(/PD_SUBMISSIONS/);
  });

  it('rejects an unchecked affirmation (400)', async () => {
    const env = { PD_SUBMISSIONS: fakeKv() };
    const p = validPayload(); p.affirmations.no_pii = false;
    const res = await postPd(p, env);
    expect(res.status).toBe(400);
    expect(Object.keys(env.PD_SUBMISSIONS.store)).toHaveLength(0);
  });

  it('rejects a non-pd_module body (400)', async () => {
    const env = { PD_SUBMISSIONS: fakeKv() };
    const p = validPayload(); p.pd_module.kind = 'lesson';
    const res = await postPd(p, env);
    expect(res.status).toBe(400);
  });

  it('rejects a module with no sections (400)', async () => {
    const env = { PD_SUBMISSIONS: fakeKv() };
    const p = validPayload(); p.pd_module.sections = [];
    const res = await postPd(p, env);
    expect(res.status).toBe(400);
  });

  it('does not require GITHUB_PAT — PD never touches the public repo', async () => {
    // A correct private-only path: no GitHub secret present, yet a valid PD submit succeeds.
    const env = { PD_SUBMISSIONS: fakeKv() };
    const res = await postPd(validPayload(), env);
    expect(res.status).toBe(201);
  });
});

describe('worker GET /pdSubmissions (token-gated reader)', () => {
  function getList(env, token) {
    const u = 'https://worker.test/pdSubmissions' + (token ? ('?token=' + encodeURIComponent(token)) : '');
    return worker.fetch(new Request(u, { method: 'GET' }), env);
  }

  it('is disabled (501) without ADMIN_TOKEN configured', async () => {
    const res = await getList({ PD_SUBMISSIONS: fakeKv() });
    expect(res.status).toBe(501);
  });

  it('rejects a wrong token (401)', async () => {
    const res = await getList({ PD_SUBMISSIONS: fakeKv(), ADMIN_TOKEN: 'secret' }, 'nope');
    expect(res.status).toBe(401);
  });

  it('lists submissions with the correct token', async () => {
    const env = { PD_SUBMISSIONS: fakeKv(), ADMIN_TOKEN: 'secret' };
    await postPd(validPayload(), env); // stage one
    const res = await getList(env, 'secret');
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.count).toBe(1);
    expect(j.submissions[0].kind).toBe('pd_submission');
  });
});

describe('worker /submitPd structural summary (non-blocking)', () => {
  it('records structure_check.ok=true for a clean module', async () => {
    const env = { PD_SUBMISSIONS: fakeKv() };
    await postPd(validPayload(), env);
    const key = Object.keys(env.PD_SUBMISSIONS.store)[0];
    const rec = JSON.parse(env.PD_SUBMISSIONS.store[key].v);
    expect(rec.structure_check.ok).toBe(true);
    expect(rec.structure_check.issues).toEqual([]);
  });

  it('flags (but does not reject) a quiz without an answer key', async () => {
    const env = { PD_SUBMISSIONS: fakeKv() };
    const p = validPayload();
    p.pd_module.sections.push({ title: 'Q', activities: [{ id: 'q1', type: 'quiz', title: 'Q', content: { questions: [{ prompt: 'p', options: ['a', 'b'] }] } }] });
    const res = await postPd(p, env);
    expect(res.status).toBe(201); // shallow validator still accepts; structure_check annotates
    const key = Object.keys(env.PD_SUBMISSIONS.store)[0];
    const rec = JSON.parse(env.PD_SUBMISSIONS.store[key].v);
    expect(rec.structure_check.ok).toBe(false);
    expect(rec.structure_check.issues.join(' ')).toMatch(/correctIndex/);
  });
});

describe('worker Tier-2 credentials (/issuePd, /verifyPd, /pdIssuerKey)', () => {
  let KEYS;
  beforeAll(async () => {
    const kp = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    KEYS = {
      privB64: Buffer.from(await globalThis.crypto.subtle.exportKey('pkcs8', kp.privateKey)).toString('base64'),
      pubB64: Buffer.from(await globalThis.crypto.subtle.exportKey('spki', kp.publicKey)).toString('base64'),
    };
  });
  const issuerEnv = () => ({ PD_ISSUER_PRIVATE_KEY: KEYS.privB64, PD_ISSUER_PUBLIC_KEY: KEYS.pubB64, PD_ISSUER_NAME: 'Test PD', PD_ISSUER_KEY_ID: 'k1' });
  const validRecord = () => ({ schema_version: 'pd-completion-1.0', complete: true, moduleId: 'm', moduleTitle: 'M', topic: 'T', completedAt: '2026-06-20', learner: { name: 'Pat' }, perActivity: [{ passed: true }, { passed: true }] });
  const post = (path, body, env) => worker.fetch(new Request('https://w.test' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env);

  it('issuePd is disabled (501) when no signing key is configured', async () => {
    expect((await post('/issuePd', { record: validRecord() }, {})).status).toBe(501);
  });

  it('issues a signed credential that verifies, and tampering breaks it', async () => {
    const env = issuerEnv();
    const res = await post('/issuePd', { record: validRecord() }, env);
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.credential.alg).toBe('Ed25519');
    expect(j.credential.payload.type).toBe('PdCompletionAttestation');
    expect(j.credential.payload.attestation_note).toMatch(/NOT proctored, accredited/i);

    const v1 = await (await post('/verifyPd', { credential: j.credential }, env)).json();
    expect(v1.valid).toBe(true);

    const tampered = JSON.parse(JSON.stringify(j.credential));
    tampered.payload.credentialSubject.moduleTitle = 'HACKED';
    const v2 = await (await post('/verifyPd', { credential: tampered }, env)).json();
    expect(v2.valid).toBe(false);
  });

  it('refuses to issue for an incomplete record (400)', async () => {
    const rec = validRecord(); rec.complete = false;
    expect((await post('/issuePd', { record: rec }, issuerEnv())).status).toBe(400);
  });

  it('exposes the issuer public key', async () => {
    const res = await worker.fetch(new Request('https://w.test/pdIssuerKey', { method: 'GET' }), issuerEnv());
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.public_key_spki_b64).toBe(KEYS.pubB64);
  });

  it('a worker-signed credential verifies CLIENT-side via pd_core.canonicalize + WebCrypto', async () => {
    const j = await (await post('/issuePd', { record: validRecord() }, issuerEnv())).json();
    // Load pd_core's canonicalize the same way the browser client would use it.
    const src = fs.readFileSync('pd_core_module.js', 'utf8');
    const win = {}; new Function('window', 'module', src)(win, { exports: {} }); // eslint-disable-line no-new-func
    const PDc = win.AlloModules.PdCore;
    const pub = await globalThis.crypto.subtle.importKey('spki', Buffer.from(KEYS.pubB64, 'base64'), { name: 'Ed25519' }, false, ['verify']);
    const ok = await globalThis.crypto.subtle.verify({ name: 'Ed25519' }, pub, Buffer.from(j.credential.signature, 'base64'), new TextEncoder().encode(PDc.canonicalize(j.credential.payload)));
    expect(ok).toBe(true); // proves worker-sign + pd_core-canonicalize + WebCrypto-verify all agree
  });
});

describe('worker Tier-2 trust boundary', () => {
  let KEYS;
  beforeAll(async () => {
    const kp = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    KEYS = { privB64: Buffer.from(await globalThis.crypto.subtle.exportKey('pkcs8', kp.privateKey)).toString('base64'), pubB64: Buffer.from(await globalThis.crypto.subtle.exportKey('spki', kp.publicKey)).toString('base64') };
  });
  const env = () => ({ PD_ISSUER_PRIVATE_KEY: KEYS.privB64, PD_ISSUER_PUBLIC_KEY: KEYS.pubB64 });
  const rec = (t) => ({ complete: true, moduleId: 'm', moduleTitle: t || 'M', perActivity: [{ passed: true }] });
  const post = (path, body, e) => worker.fetch(new Request('https://w.test' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), e);

  it('a signature swapped from a different payload does not verify (no forgery)', async () => {
    const e1 = env();
    const A = (await (await post('/issuePd', { record: rec('A') }, e1)).json()).credential;
    const B = (await (await post('/issuePd', { record: rec('B') }, e1)).json()).credential;
    A.signature = B.signature;
    expect((await (await post('/verifyPd', { credential: A }, e1)).json()).valid).toBe(false);
  });

  it('the embedded public_key_spki_b64 is IGNORED — verification uses the server-trusted key', async () => {
    const e1 = env();
    const A = (await (await post('/issuePd', { record: rec('A') }, e1)).json()).credential;
    A.public_key_spki_b64 = 'AAAA'; // attacker swaps the embedded key
    expect((await (await post('/verifyPd', { credential: A }, e1)).json()).valid).toBe(true);
  });

  it('a credential does not verify against a DIFFERENT issuer key', async () => {
    const A = (await (await post('/issuePd', { record: rec('A') }, env())).json()).credential;
    const kp2 = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const e2 = { PD_ISSUER_PUBLIC_KEY: Buffer.from(await globalThis.crypto.subtle.exportKey('spki', kp2.publicKey)).toString('base64') };
    expect((await (await post('/verifyPd', { credential: A }, e2)).json()).valid).toBe(false);
  });

  it('rejects an oversized body via the byte-length guard', async () => {
    const big = { record: { complete: true, moduleId: 'm', note: 'x'.repeat(1_100_000) } };
    expect((await post('/issuePd', big, env())).status).toBe(413);
  });
});
