// Cloudflare Worker /submitPd — endpoint test.
//
// Drives the real worker (catalog/cloudflare-worker/src/index.js) default fetch
// handler with a fake KV binding, proving PD submissions are validated and
// staged to PRIVATE KV (PD_SUBMISSIONS) — never the public GitHub /submit path.

import { describe, it, expect } from 'vitest';
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
