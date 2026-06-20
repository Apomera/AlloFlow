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
  return { store, async put(k, v, opts) { store[k] = { v, opts }; } };
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
