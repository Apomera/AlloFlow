// Cloudflare Worker /submitPlugin — endpoint test.
//
// Drives the real worker (catalog/cloudflare-worker/src/index.js) default fetch
// handler with a fake KV binding, proving Tool Forge plugin submissions are
// validated and staged to PRIVATE KV (PLUGIN_SUBMISSIONS) — never the public
// GitHub /submit path, never executed server-side. Mirrors pd_worker.test.js.

import { describe, it, expect } from 'vitest';
import worker from '../catalog/cloudflare-worker/src/index.js';

function postPlugin(body, env) {
  const req = new Request('https://worker.test/submitPlugin', {
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

const CONFORMING_SRC = "(function(){ 'use strict'; if(!window.StemLab||!window.StemLab.registerTool) return;\n" +
  "  window.StemLab.registerTool('forgeTest', { icon:'\\uD83E\\uDDEA', label:'Forge Test', desc:'d', color:'emerald', category:'math',\n" +
  "    render:function(ctx){ return ctx.React.createElement('div', null, 'hi'); } }); })();";

function validPayload() {
  return {
    plugin: {
      id: 'forgeTest',
      label: 'Forge Test',
      desc: 'A conforming test plugin.',
      target: 'stem',
      category: 'math',
      color: 'emerald',
      icon: '🧪',
      source: CONFORMING_SRC,
    },
    metadata: { author: 'Aaron', license: 'MIT', subject: 'Math', grade_band: 'g68' },
    validator_report: { tier1: { ok: true, warnings: 0 } },
    affirmations: { author_or_authorized: true, no_pii: true, license_agreed: true, age_eligible: true, passes_validation: true, accuracy_attested: true },
  };
}

describe('worker /submitPlugin', () => {
  it('stores a valid submission in private KV (with source) and returns 201', async () => {
    const env = { PLUGIN_SUBMISSIONS: fakeKv() };
    const res = await postPlugin(validPayload(), env);
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.slug).toBe('forgetest');
    expect(j.structure_ok).toBe(true);

    const keys = Object.keys(env.PLUGIN_SUBMISSIONS.store);
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith('plugin:')).toBe(true);
    const rec = JSON.parse(env.PLUGIN_SUBMISSIONS.store[keys[0]].v);
    expect(rec.schema_version).toBe('plugin-1.0');
    expect(rec.kind).toBe('plugin_submission');
    expect(rec.metadata.id).toBe('forgeTest');
    expect(rec.metadata.target).toBe('stem');
    expect(rec.source).toBe(CONFORMING_SRC); // the file text is preserved for review
    expect(rec.validator_report.tier1.ok).toBe(true);
  });

  it('fails closed (500) when the KV binding is missing — never silent data loss', async () => {
    const res = await postPlugin(validPayload(), {}); // no PLUGIN_SUBMISSIONS, no GITHUB_PAT
    expect(res.status).toBe(500);
    const j = await res.json();
    expect(j.ok).toBe(false);
    expect(j.error).toMatch(/PLUGIN_SUBMISSIONS/);
  });

  it('does not require GITHUB_PAT — plugins never touch the public repo', async () => {
    const env = { PLUGIN_SUBMISSIONS: fakeKv() };
    expect((await postPlugin(validPayload(), env)).status).toBe(201);
  });

  it('rejects an unchecked plugin-specific affirmation (400)', async () => {
    const env = { PLUGIN_SUBMISSIONS: fakeKv() };
    const p = validPayload(); p.affirmations.passes_validation = false;
    const res = await postPlugin(p, env);
    expect(res.status).toBe(400);
    expect(Object.keys(env.PLUGIN_SUBMISSIONS.store)).toHaveLength(0);
  });

  it('rejects a malformed id (400)', async () => {
    const env = { PLUGIN_SUBMISSIONS: fakeKv() };
    const p = validPayload(); p.plugin.id = '9-bad-id';
    expect((await postPlugin(p, env)).status).toBe(400);
  });

  it('rejects a bad target (400)', async () => {
    const env = { PLUGIN_SUBMISSIONS: fakeKv() };
    const p = validPayload(); p.plugin.target = 'whatever';
    expect((await postPlugin(p, env)).status).toBe(400);
  });

  it('rejects a missing source (400)', async () => {
    const env = { PLUGIN_SUBMISSIONS: fakeKv() };
    const p = validPayload(); delete p.plugin.source;
    expect((await postPlugin(p, env)).status).toBe(400);
  });

  it('rejects an oversized source via the length guard (400)', async () => {
    const env = { PLUGIN_SUBMISSIONS: fakeKv() };
    const p = validPayload(); p.plugin.source = 'x'.repeat(500001);
    expect((await postPlugin(p, env)).status).toBe(400);
  });
});

describe('worker /submitPlugin structural sanity (non-blocking)', () => {
  it('flags (but does not reject) red flags: wrong hub + eval', async () => {
    const env = { PLUGIN_SUBMISSIONS: fakeKv() };
    const p = validPayload();
    p.plugin.target = 'sel'; // but source references window.StemLab, and adds eval
    p.plugin.source = CONFORMING_SRC + "\n;eval('1+1');";
    const res = await postPlugin(p, env);
    expect(res.status).toBe(201); // shallow validator accepts; structure_check annotates
    expect((await res.json()).structure_ok).toBe(false);
    const rec = JSON.parse(env.PLUGIN_SUBMISSIONS.store[Object.keys(env.PLUGIN_SUBMISSIONS.store)[0]].v);
    const issues = rec.structure_check.issues.join(' ');
    expect(issues).toMatch(/SelHub/);
    expect(issues).toMatch(/eval/);
  });

  it('flags a source that never calls registerTool', async () => {
    const env = { PLUGIN_SUBMISSIONS: fakeKv() };
    const p = validPayload();
    p.plugin.source = "(function(){ var x = window.StemLab; /* forgeTest never registers */ })();";
    const res = await postPlugin(p, env);
    expect(res.status).toBe(201);
    const rec = JSON.parse(env.PLUGIN_SUBMISSIONS.store[Object.keys(env.PLUGIN_SUBMISSIONS.store)[0]].v);
    expect(rec.structure_check.issues.join(' ')).toMatch(/registerTool/);
  });
});

describe('worker GET /pluginSubmissions (token-gated reader)', () => {
  function getList(env, token, withSource) {
    const u = 'https://worker.test/pluginSubmissions' + (token ? ('?token=' + encodeURIComponent(token)) : '') + (withSource ? '&source=1' : '');
    return worker.fetch(new Request(u, { method: 'GET' }), env);
  }

  it('is disabled (501) without ADMIN_TOKEN configured', async () => {
    expect((await getList({ PLUGIN_SUBMISSIONS: fakeKv() })).status).toBe(501);
  });

  it('rejects a wrong token (401)', async () => {
    expect((await getList({ PLUGIN_SUBMISSIONS: fakeKv(), ADMIN_TOKEN: 'secret' }, 'nope')).status).toBe(401);
  });

  it('lists submissions with the correct token, omitting source by default', async () => {
    const env = { PLUGIN_SUBMISSIONS: fakeKv(), ADMIN_TOKEN: 'secret' };
    await postPlugin(validPayload(), env);
    const res = await getList(env, 'secret');
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.count).toBe(1);
    expect(j.submissions[0].kind).toBe('plugin_submission');
    expect(j.submissions[0].source).toBeUndefined(); // omitted unless ?source=1
  });

  it('includes the source with ?source=1', async () => {
    const env = { PLUGIN_SUBMISSIONS: fakeKv(), ADMIN_TOKEN: 'secret' };
    await postPlugin(validPayload(), env);
    const j = await (await getList(env, 'secret', true)).json();
    expect(j.submissions[0].source).toBe(CONFORMING_SRC);
  });
});
