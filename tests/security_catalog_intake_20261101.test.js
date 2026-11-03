import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../catalog/cloudflare-worker/src/index.js';
import fs from 'node:fs';

const RETENTION = 30 * 24 * 60 * 60;
const lesson = { lesson_payload: { text: 'Synthetic lesson' }, metadata: { title: 'Synthetic', subject: 'Science', grade_level: '3' }, affirmations: { author_or_authorized: true, no_pii: true, license_agreed: true, age_eligible: true } };
const translation = { language: 'Greek', suggested: 'Synthetic correction', note: 'Synthetic only' };
const item = { packId: 'synthetic-pack', kind: 'other', suggested: 'Synthetic correction' };
const routes = ['/submit', '/submitTranslation', '/submitItemCorrection', '/submitBug', '/submitPd', '/submitPlugin'];
function kv() {
  const values = new Map();
  return { values, get: vi.fn(async key => values.get(key) ?? null), put: vi.fn(async (key, value) => values.set(key, value)) };
}
function environment(extra = {}) {
  return { SUBMIT_RATE: kv(), COMMUNITY_SUBMISSIONS: kv(), BUG_REPORTS: kv(), PD_SUBMISSIONS: kv(), PLUGIN_SUBMISSIONS: kv(), ...extra };
}
function request(route, body, headers = {}) {
  return new Request('https://worker.test' + route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.10', ...headers }, body: JSON.stringify(body) });
}
afterEach(() => vi.restoreAllMocks());

describe('private community intake', () => {
  it.each([['/submit', lesson, 'lesson_submission'], ['/submitTranslation', translation, 'translation_correction'], ['/submitItemCorrection', item, 'item_correction']])('stages %s privately with bounded retention and no upstream request', async (route, input, kind) => {
    const env = environment();
    const outbound = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network'));
    const response = await worker.fetch(request(route, input), env);
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.storage).toBe('private');
    expect(result.review_status).toBe('pending_review');
    const [key, serialized, options] = env.COMMUNITY_SUBMISSIONS.put.mock.calls[0];
    const record = JSON.parse(serialized);
    expect(key).toMatch(/^community:[a-z_]+:\d+:[a-f0-9-]{36}$/);
    expect(record.kind).toBe(kind);
    expect(record.review_status).toBe('pending_review');
    expect(options.expirationTtl).toBe(RETENTION);
    expect(Date.parse(record.expires_at) - Date.parse(record.submitted_at)).toBe(RETENTION * 1000);
    expect(outbound).not.toHaveBeenCalled();
  });
  it.each([['/v2/submit', lesson], ['/v2/submitTranslation', translation], ['/v2/submitItemCorrection', item]])('offers a versioned private-only route %s', async (route, input) => {
    const response = await worker.fetch(request(route, input), environment());
    expect(response.status).toBe(201);
    expect((await response.json()).storage).toBe('private');
  });
  it('refuses missing private storage even when an old GitHub token is configured', async () => {
    const outbound = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network'));
    const response = await worker.fetch(request('/submitTranslation', translation), environment({ COMMUNITY_SUBMISSIONS: undefined, GITHUB_PAT: 'synthetic-never-used' }));
    expect(response.status).toBe(503);
    expect(outbound).not.toHaveBeenCalled();
  });
  it('keeps flagged content and scan findings private, including metadata', async () => {
    const env = environment();
    const response = await worker.fetch(request('/submit', { ...lesson, metadata: { ...lesson.metadata, credit: 'synthetic@example.test' } }), env);
    expect(response.status).toBe(201);
    const record = JSON.parse(env.COMMUNITY_SUBMISSIONS.put.mock.calls[0][1]);
    expect(record.pii_scan.findings.some(f => f.type === 'email')).toBe(true);
    expect(record.pii_scan.findings.every(f => !('samples' in f))).toBe(true);
  });
  it('returns a generic private-storage failure and leaves retries possible', async () => {
    const env = environment();
    env.COMMUNITY_SUBMISSIONS.put.mockRejectedValueOnce(new Error('private backend detail'));
    const failed = await worker.fetch(request('/submitTranslation', translation), env);
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain('private backend detail');
    expect((await worker.fetch(request('/submitTranslation', translation), env)).status).toBe(201);
  });
});

describe('shared public-write protection', () => {
  it.each(routes)('fails closed without SUBMIT_RATE on %s', async route => {
    const env = environment({ SUBMIT_RATE: undefined });
    const response = await worker.fetch(request(route, {}), env);
    expect(response.status).toBe(503);
    for (const name of ['COMMUNITY_SUBMISSIONS', 'BUG_REPORTS', 'PD_SUBMISSIONS', 'PLUGIN_SUBMISSIONS']) expect(env[name].put).not.toHaveBeenCalled();
  });
  it.each(['get', 'put'])('fails closed on limiter %s failure', async operation => {
    const env = environment();
    env.SUBMIT_RATE[operation].mockRejectedValue(new Error('private backend detail'));
    const response = await worker.fetch(request('/submitTranslation', translation), env);
    expect(response.status).toBe(503);
    expect(env.COMMUNITY_SUBMISSIONS.put).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain('private backend detail');
  });
  it('shares the per-client budget across intake endpoints', async () => {
    const env = environment({ SUBMIT_RATE_PER_MINUTE: '1' });
    expect((await worker.fetch(request('/submitTranslation', translation), env)).status).toBe(201);
    expect((await worker.fetch(request('/submitItemCorrection', item), env)).status).toBe(429);
    expect(env.COMMUNITY_SUBMISSIONS.put).toHaveBeenCalledTimes(1);
  });
  it.each(routes)('requires configured Turnstile on %s', async route => {
    const env = environment({ TURNSTILE_SECRET: 'synthetic-challenge-secret' });
    const response = await worker.fetch(request(route, {}), env);
    expect(response.status).toBe(403);
    expect(env.COMMUNITY_SUBMISSIONS.put).not.toHaveBeenCalled();
  });
  it('verifies a header challenge and never persists the token', async () => {
    const env = environment({ TURNSTILE_SECRET: 'synthetic-challenge-secret' });
    const outbound = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ success: true }));
    const response = await worker.fetch(request('/submitTranslation', translation, { 'X-Turnstile-Token': 'synthetic-token' }), env);
    expect(response.status).toBe(201);
    expect(outbound).toHaveBeenCalledTimes(1);
    expect(String(outbound.mock.calls[0][0])).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(env.COMMUNITY_SUBMISSIONS.put.mock.calls[0][1]).not.toContain('synthetic-token');
  });
  it.each(['rejected', 'unavailable'])('rejects a configured challenge that is %s before a write', async outcome => {
    const env = environment({ TURNSTILE_SECRET: 'synthetic-challenge-secret' });
    const outbound = vi.spyOn(globalThis, 'fetch');
    if (outcome === 'rejected') outbound.mockResolvedValue(Response.json({ success: false }));
    else outbound.mockRejectedValue(new Error('Synthetic verifier outage'));
    const response = await worker.fetch(request('/submitTranslation', { ...translation, turnstile_token: 'synthetic-token' }), env);
    expect(response.status).toBe(403);
    expect(env.COMMUNITY_SUBMISSIONS.put).not.toHaveBeenCalled();
  });
  it('removes a verified body challenge from the staged correction', async () => {
    const env = environment({ TURNSTILE_SECRET: 'synthetic-challenge-secret' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ success: true }));
    const response = await worker.fetch(request('/submitTranslation', { ...translation, turnstile_token: 'synthetic-body-token' }), env);
    expect(response.status).toBe(201);
    expect(env.COMMUNITY_SUBMISSIONS.put.mock.calls[0][1]).not.toContain('synthetic-body-token');
  });
  it('requires the same limiter before optional self-paced credential signing', async () => {
    const env = environment({ SUBMIT_RATE: undefined, PD_ALLOW_SELF_PACED_ISSUANCE: 'true' });
    const response = await worker.fetch(request('/issuePd', { record: {} }), env);
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('Submission protection is unavailable');
  });
  it('rejects replayed accepted submissions without another private write', async () => {
    const env = environment();
    expect((await worker.fetch(request('/submitTranslation', translation), env)).status).toBe(201);
    expect((await worker.fetch(request('/submitTranslation', translation), env)).status).toBe(409);
    expect(env.COMMUNITY_SUBMISSIONS.put).toHaveBeenCalledTimes(1);
  });
  it('bounds a body before JSON parsing or storage', async () => {
    const env = environment();
    const response = await worker.fetch(request('/submitTranslation', { language: 'Greek', suggested: 'x'.repeat(1_048_577) }), env);
    expect(response.status).toBe(413);
    expect(env.COMMUNITY_SUBMISSIONS.put).not.toHaveBeenCalled();
  });
});

describe('private intake client contract', () => {
  it.each(['catalog_module.js', 'translation_feedback_module.js', 'item_correction_module.js'])('%s requires the versioned private intake endpoint', path => {
    const source = fs.readFileSync(path, 'utf8');
    expect(source).toContain('workers.dev/v2/submit');
    expect(source).toContain('30 days');
  });
  it.each(['translation_feedback_module.js', 'item_correction_module.js'])('%s does not silently switch destinations on failure', path => {
    const source = fs.readFileSync(path, 'utf8');
    expect(source).not.toContain('else fallbackToForm()');
    expect(source).not.toContain('.catch(function () { fallbackToForm(); })');
    expect(source).toContain('Your draft stays here');
  });
});
