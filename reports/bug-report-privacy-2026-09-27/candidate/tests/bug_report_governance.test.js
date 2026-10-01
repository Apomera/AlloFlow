// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import worker from '../catalog/cloudflare-worker/src/index.js';
const gateway = 'g'.repeat(43), reader = 'r'.repeat(43), deleter = 'd'.repeat(43);
async function hash(token) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('');
}
function kv() {
  const values = new Map(), writes = [];
  return { values, writes,
    put: vi.fn(async (key, value, options) => { writes.push({ key, value, options }); values.set(key, value); }),
    get: vi.fn(async key => values.get(key) || null),
    delete: vi.fn(async key => { values.delete(key); }),
    list: vi.fn(async ({ prefix }) => ({ keys: [...values.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name })), list_complete: true })),
  };
}
async function fixture(overrides = {}) {
  const policy = { districtId: 'district-a', policyId: 'approved-v1', destinationName: 'District support',
    noticeUrl: 'https://district.example/support/privacy', approvedUntil: new Date(Date.now() + 86400000).toISOString(),
    retentionSeconds: 86400, auditRetentionSeconds: 604800 };
  const env = { BUG_REPORTS_ENABLED: 'true', BUG_REPORTS_POLICY: JSON.stringify(policy),
    BUG_REPORTS_PRINCIPALS: JSON.stringify([
      { id: 'district-gateway', tokenSha256: await hash(gateway), roles: ['submit'] },
      { id: 'operator-a', tokenSha256: await hash(reader), roles: ['read'] },
      { id: 'operator-b', tokenSha256: await hash(deleter), roles: ['delete'] },
    ]), BUG_REPORTS: kv(), BUG_REPORT_AUDIT: kv(), ...overrides };
  const payload = { schema_version: '2.0', district_id: policy.districtId, policy_id: policy.policyId,
    retention_seconds: policy.retentionSeconds, reviewed: true, category: 'audio',
    summary: 'Read aloud stops after the first paragraph.', steps: 'Open a sample reading and press play.' };
  const request = (path, { token = gateway, method = 'GET', body, headers = {} } = {}) =>
    worker.fetch(new Request('https://worker.example' + path, { method,
      headers: { Authorization: 'Bearer ' + token, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }), env);
  const submit = body => request('/submitBug', { method: 'POST', body: body || payload });
  return { env, policy, payload, request, submit };
}
describe('district reporting boundary', () => {
  it('rejects old clients and admin URLs when governance is not configured', async () => {
    const env = { BUG_REPORTS: kv(), ADMIN_TOKEN: 'legacy' };
    for (const [path, method] of [['/submitBug', 'POST'], ['/bugs', 'GET'], ['/bug-report-policy', 'GET']]) {
      const r = await worker.fetch(new Request('https://worker.example' + path, { method }), env);
      expect(r.status).toBe(503);
      expect(r.headers.get('Access-Control-Allow-Origin')).toBeNull();
    }
    expect((await worker.fetch(new Request('https://worker.example/bugs?token=legacy'), env)).status).toBe(401);
    expect(env.BUG_REPORTS.put).not.toHaveBeenCalled();
  });
  it('keeps the public catalog CORS but denies reporting preflights', async () => {
    const f = await fixture();
    expect((await f.request('/submitTranslation', { method: 'OPTIONS' })).status).toBe(204);
    const r = await f.request('/submitBug', { method: 'OPTIONS' });
    expect(r.status).toBe(403);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
  it.each(['BUG_REPORTS_POLICY', 'BUG_REPORTS_PRINCIPALS', 'BUG_REPORTS', 'BUG_REPORT_AUDIT'])('fails closed without %s', async key => {
    const f = await fixture({ [key]: undefined });
    expect((await f.submit()).status).toBe(503);
  });
  it.each([0, 30, 2592001, '86400'])('rejects invalid retention %s', async retentionSeconds => {
    const f = await fixture();
    f.env.BUG_REPORTS_POLICY = JSON.stringify({ ...f.policy, retentionSeconds });
    expect((await f.submit()).status).toBe(503);
  });
  it('rejects malformed identifiers and duplicate principal credentials', async () => {
    const f = await fixture();
    f.env.BUG_REPORTS_POLICY = JSON.stringify({ ...f.policy, districtId: 123 });
    expect((await f.submit()).status).toBe(503);
    f.env.BUG_REPORTS_POLICY = JSON.stringify(f.policy);
    const principals = JSON.parse(f.env.BUG_REPORTS_PRINCIPALS);
    principals[1].tokenSha256 = principals[0].tokenSha256;
    f.env.BUG_REPORTS_PRINCIPALS = JSON.stringify(principals);
    expect((await f.submit()).status).toBe(503);
  });
  it('requires an authenticated submitter and returns only the current policy', async () => {
    const f = await fixture();
    expect((await f.request('/bug-report-policy', { token: reader })).status).toBe(401);
    expect((await f.request('/bug-report-policy', { token: 'x'.repeat(43) })).status).toBe(401);
    const r = await f.request('/bug-report-policy');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, ...Object.fromEntries(Object.entries(f.policy).filter(([k]) => k !== 'auditRetentionSeconds')) });
    expect(r.headers.get('Cache-Control')).toContain('no-store');
  });
  it('stops collection when disabled or approval expires while allowing authorized deletion', async () => {
    const f = await fixture();
    const { id } = await (await f.submit()).json();
    f.env.BUG_REPORTS_ENABLED = 'false';
    expect((await f.submit()).status).toBe(403);
    expect((await f.request('/bugs/' + id, { token: deleter, method: 'DELETE' })).status).toBe(202);
    f.env.BUG_REPORTS_ENABLED = 'true';
    f.env.BUG_REPORTS_POLICY = JSON.stringify({ ...f.policy, approvedUntil: '2020-01-01T00:00:00.000Z' });
    expect((await f.submit()).status).toBe(403);
  });
  it.each([
    { what: 'legacy raw log' }, { url: 'https://school.example/student/name' },
    { district_id: 'district-b' }, { policy_id: 'stale-v0' }, { retention_seconds: 172800 },
    { reviewed: false }, { category: 'student-name' }, { summary: '' },
  ])('rejects stale, cross-district, unreviewed or unexpected fields: %j', async change => {
    const f = await fixture();
    expect((await f.submit({ ...f.payload, ...change })).status).toBe(409);
    expect(f.env.BUG_REPORTS.put).not.toHaveBeenCalled();
    expect(f.env.BUG_REPORT_AUDIT.put).not.toHaveBeenCalled();
  });
  it.each(['Email pupil@example.test', 'SSN 123-45-6789', 'Visit https://example.test/student', 'token=private'])('rejects detectable sensitive text without persisting samples: %s', async summary => {
    const f = await fixture();
    const r = await f.submit({ ...f.payload, summary });
    expect(r.status).toBe(422);
    expect(await r.text()).not.toContain(summary);
    expect(f.env.BUG_REPORTS.put).not.toHaveBeenCalled();
    expect(f.env.BUG_REPORT_AUDIT.put).not.toHaveBeenCalled();
  });
  it('bounds streamed bodies even without Content-Length', async () => {
    const f = await fixture();
    const r = await f.request('/submitBug', { method: 'POST', body: { ...f.payload, summary: '🙂'.repeat(7000) } });
    expect(r.status).toBe(413);
    expect(f.env.BUG_REPORTS.put).not.toHaveBeenCalled();
  });
  it('stores the allowlisted report with expiry and content-free per-principal audit events', async () => {
    const f = await fixture();
    const r = await f.submit();
    expect(r.status).toBe(201);
    const receipt = await r.json();
    const write = f.env.BUG_REPORTS.writes[0];
    expect(write.key).toBe('bug:v2:district-a:' + receipt.id);
    expect(write.options.expirationTtl).toBe(86400);
    const record = JSON.parse(write.value);
    expect(record.summary).toBe(f.payload.summary);
    expect(record.submitted_by).toBe('district-gateway');
    expect(record).not.toHaveProperty('url');
    expect(record).not.toHaveProperty('pii_scan');
    expect(Date.parse(record.expires_at) - Date.parse(record.created_at)).toBe(86400000);
    const events = f.env.BUG_REPORT_AUDIT.writes.map(w => JSON.parse(w.value));
    expect(events.map(e => e.stage)).toEqual(['authorized', 'completed']);
    expect(events.every(e => e.principal_id === 'district-gateway')).toBe(true);
    expect(JSON.stringify(events)).not.toContain(f.payload.summary);
    expect(JSON.stringify(events)).not.toContain(gateway);
    expect(f.env.BUG_REPORT_AUDIT.writes.every(w => w.options.expirationTtl === 604800)).toBe(true);
  });
  it('separates submit/read/delete roles and never lets legacy ADMIN_TOKEN authorize', async () => {
    const f = await fixture({ ADMIN_TOKEN: gateway });
    const { id } = await (await f.submit()).json();
    expect((await f.request('/bugs', { token: gateway })).status).toBe(401);
    expect((await f.request('/bugs/' + id, { token: reader, method: 'DELETE' })).status).toBe(401);
    expect((await f.request('/submitBug', { token: reader, method: 'POST', body: f.payload })).status).toBe(401);
    expect((await f.request('/bugs?token=' + reader, { token: reader })).status).toBe(401);
    expect((await f.request('/bugs/' + id, { token: reader })).status).toBe(200);
    const last = JSON.parse(f.env.BUG_REPORT_AUDIT.writes.at(-1).value);
    expect(last).toMatchObject({ principal_id: 'operator-a', action: 'read', stage: 'completed', report_id: id });
  });
  it('lists metadata only, excludes legacy/cross-district keys and supports cursor pagination', async () => {
    const f = await fixture();
    const { id } = await (await f.submit()).json();
    f.env.BUG_REPORTS.values.set('bug:legacy', '{"what":"old student text"}');
    f.env.BUG_REPORTS.values.set('bug:v2:district-b:' + id, f.env.BUG_REPORTS.writes[0].value);
    const r = await f.request('/bugs', { token: reader });
    const body = await r.json();
    expect(body.reports).toHaveLength(1);
    expect(body.reports[0]).not.toHaveProperty('summary');
    expect(body.cursor).toBeNull();
    f.env.BUG_REPORTS.list.mockResolvedValueOnce({ keys: [], list_complete: false, cursor: 'next-page' });
    expect((await (await f.request('/bugs?cursor=first-page', { token: reader })).json()).cursor).toBe('next-page');
    expect(f.env.BUG_REPORTS.list).toHaveBeenLastCalledWith({ prefix: 'bug:v2:district-a:', limit: 50, cursor: 'first-page' });
  });
  it('revokes a reader immediately on the next request without deleting reports', async () => {
    const f = await fixture();
    const { id } = await (await f.submit()).json();
    expect((await f.request('/bugs/' + id, { token: reader })).status).toBe(200);
    f.env.BUG_REPORTS_PRINCIPALS = JSON.stringify(JSON.parse(f.env.BUG_REPORTS_PRINCIPALS).filter(p => p.id !== 'operator-a'));
    expect((await f.request('/bugs/' + id, { token: reader })).status).toBe(401);
    expect(f.env.BUG_REPORTS.values.has('bug:v2:district-a:' + id)).toBe(true);
  });
  it('rejects a policy changed after review and never extends existing report expiry', async () => {
    const f = await fixture();
    const { id, expires_at } = await (await f.submit()).json();
    f.env.BUG_REPORTS_POLICY = JSON.stringify({ ...f.policy, policyId: 'approved-v2', retentionSeconds: 172800 });
    expect((await f.submit()).status).toBe(409);
    const result = await (await f.request('/bugs/' + id, { token: reader })).json();
    expect(result.report.expires_at).toBe(expires_at);
    expect(f.env.BUG_REPORTS.put).toHaveBeenCalledTimes(1);
  });
  it('filters expired records and respects a shortened policy even before KV expiry', async () => {
    const f = await fixture();
    const { id } = await (await f.submit()).json();
    const key = 'bug:v2:district-a:' + id;
    const record = JSON.parse(f.env.BUG_REPORTS.values.get(key));
    f.env.BUG_REPORTS.values.set(key, JSON.stringify({ ...record, created_at: new Date(Date.now() - 120000).toISOString() }));
    f.env.BUG_REPORTS_POLICY = JSON.stringify({ ...f.policy, retentionSeconds: 60 });
    expect((await f.request('/bugs/' + id, { token: reader })).status).toBe(404);
    expect((await (await f.request('/bugs', { token: reader })).json()).reports).toEqual([]);
  });
  it('blocks disclosure and mutation when mandatory auditing fails', async () => {
    const f = await fixture();
    const { id } = await (await f.submit()).json();
    f.env.BUG_REPORT_AUDIT.put.mockRejectedValue(new Error('sensitive internal error'));
    for (const [path, method, token] of [['/bugs/' + id, 'GET', reader], ['/bugs/' + id, 'DELETE', deleter], ['/submitBug', 'POST', gateway]]) {
      const r = await f.request(path, { method, token, ...(method === 'POST' ? { body: f.payload } : {}) });
      expect(r.status).toBe(503);
      expect(await r.text()).not.toContain('sensitive');
    }
    expect(f.env.BUG_REPORTS.delete).not.toHaveBeenCalled();
    expect(f.env.BUG_REPORTS.put).toHaveBeenCalledTimes(1);
  });
  it('returns generic storage errors and reports deletion as accepted, with a tombstone', async () => {
    const f = await fixture();
    const { id } = await (await f.submit()).json();
    const deleted = await f.request('/bugs/' + id, { method: 'DELETE', token: deleter });
    expect(deleted.status).toBe(202);
    expect(f.env.BUG_REPORTS.values.has('bug:v2:district-a:' + id)).toBe(false);
    expect(f.env.BUG_REPORTS.values.has('bug-deleted:district-a:' + id)).toBe(true);
    expect((await f.request('/bugs/' + id, { token: reader })).status).toBe(404);
    f.env.BUG_REPORTS.put.mockRejectedValue(new Error('student name in storage exception'));
    const r = await f.submit();
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain('student name');
  });
});
