// District reporting boundary. No public CORS and no browser-held service secrets.
// The authenticated district gateway owns staff eligibility, CSRF protection, and
// per-user submission auditing. Separate administrator credentials identify readers.
const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const isId = value => typeof value === 'string' && ID.test(value);
const REPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CATEGORIES = new Set(['reading', 'audio', 'navigation', 'export', 'other']);
const ROLES = new Set(['submit', 'read', 'delete']);
const MAX_BYTES = 24576;
const MAX_RETENTION = 30 * 86400;
function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store, private',
    'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
  } });
}
const refuse = (status, error) => response({ ok: false, error }, status);
const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v, keys) => object(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const seconds = (v, max) => Number.isInteger(v) && v >= 60 && v <= max;
function config(env) {
  try {
    const p = JSON.parse(env.BUG_REPORTS_POLICY || 'null');
    if (!exact(p, ['districtId', 'policyId', 'destinationName', 'noticeUrl', 'approvedUntil', 'retentionSeconds', 'auditRetentionSeconds'])) return null;
    const notice = new URL(p.noticeUrl);
    if (!isId(p.districtId) || !isId(p.policyId) ||
        typeof p.destinationName !== 'string' || !p.destinationName.trim() || p.destinationName.length > 120 ||
        notice.protocol !== 'https:' || notice.username || notice.password || notice.hash ||
        typeof p.approvedUntil !== 'string' || !Number.isFinite(Date.parse(p.approvedUntil)) ||
        !seconds(p.retentionSeconds, MAX_RETENTION) || !seconds(p.auditRetentionSeconds, 365 * 86400) ||
        !env.BUG_REPORTS || !env.BUG_REPORT_AUDIT) return null;
    const principals = JSON.parse(env.BUG_REPORTS_PRINCIPALS || 'null');
    if (!Array.isArray(principals) || !principals.length || principals.length > 50) return null;
    const ids = new Set(), hashes = new Set();
    for (const principal of principals) {
      if (!exact(principal, ['id', 'tokenSha256', 'roles']) || !isId(principal.id) ||
          typeof principal.tokenSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(principal.tokenSha256) ||
          ids.has(principal.id) || hashes.has(principal.tokenSha256) ||
          !Array.isArray(principal.roles) || !principal.roles.length ||
          principal.roles.some(role => !ROLES.has(role))) return null;
      ids.add(principal.id); hashes.add(principal.tokenSha256);
    }
    return { policy: p, principals };
  } catch (_) { return null; }
}
async function authenticate(request, principals, role) {
  const auth = request.headers.get('Authorization') || '';
  if (!/^Bearer [A-Za-z0-9_-]{43,128}$/.test(auth)) return null;
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(auth.slice(7))));
  let match = null;
  for (const p of principals) {
    let difference = 0;
    for (let i = 0; i < hash.length; i++) difference |= hash[i] ^ parseInt(p.tokenSha256.slice(i * 2, i * 2 + 2), 16);
    if (difference === 0) match = p;
  }
  return match && match.roles.includes(role) ? match : null;
}
async function readBody(request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return { error: refuse(415, 'json-required') };
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return { error: refuse(413, 'report-too-large') };
  const reader = request.body?.getReader();
  if (!reader) return { error: refuse(400, 'invalid-report') };
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) { await reader.cancel(); return { error: refuse(413, 'report-too-large') }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const part of chunks) { bytes.set(part, offset); offset += part.byteLength; }
    return { data: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
  } catch (_) { return { error: refuse(400, 'invalid-report') }; }
  finally { reader.releaseLock(); }
}
function validReport(p, policy) {
  return exact(p, ['schema_version', 'district_id', 'policy_id', 'retention_seconds', 'reviewed', 'category', 'summary', 'steps']) &&
    p.schema_version === '2.0' && p.district_id === policy.districtId && p.policy_id === policy.policyId &&
    p.retention_seconds === policy.retentionSeconds && p.reviewed === true && CATEGORIES.has(p.category) &&
    typeof p.summary === 'string' && !!p.summary.trim() && p.summary.length <= 2000 &&
    typeof p.steps === 'string' && p.steps.length <= 4000;
}
// Defense in depth only; this is not a de-identification claim. No matched text
// is logged, returned, or persisted. Human review and the district agreement remain necessary.
function sensitiveText(p) {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{3}-\d{2}-\d{4}\b|(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}|\b(?:Mr|Mrs|Ms|Dr|Mx)\.?\s+[A-Z][a-z]+|\b(?:ADHD|ASD|IEP|504\sPlan)\b|https?:\/\/|(?:api[_ -]?key|password|bearer|token)\s*[:= ]\s*\S+/i.test(p.summary + '\n' + p.steps);
}
const prefix = p => 'bug:v2:' + p.districtId + ':';
const reportKey = (p, id) => prefix(p) + id;
async function audit(env, policy, principal, action, stage, id = null) {
  const at = new Date().toISOString();
  await env.BUG_REPORT_AUDIT.put('bug-audit:' + policy.districtId + ':' + crypto.randomUUID(), JSON.stringify({
    district_id: policy.districtId, policy_id: policy.policyId, principal_id: principal.id,
    action, stage, report_id: id, at,
  }), { expirationTtl: policy.auditRetentionSeconds });
}
async function load(env, policy, id) {
  if (await env.BUG_REPORTS.get('bug-deleted:' + policy.districtId + ':' + id)) return null;
  const raw = await env.BUG_REPORTS.get(reportKey(policy, id));
  if (!raw) return null;
  const r = JSON.parse(raw);
  const created = Date.parse(r.created_at), expires = Date.parse(r.expires_at);
  if (r.schema_version !== '2.0' || r.district_id !== policy.districtId || r.id !== id ||
      !Number.isFinite(created) || !Number.isFinite(expires) ||
      Math.min(expires, created + policy.retentionSeconds * 1000) <= Date.now()) return null;
  // Explicit projection avoids accidentally exposing future fields or legacy logs.
  return { id, district_id: r.district_id, policy_id: r.policy_id, created_at: r.created_at,
    expires_at: new Date(Math.min(expires, created + policy.retentionSeconds * 1000)).toISOString(),
    category: r.category, summary: r.summary, steps: r.steps };
}
export async function handleBugReports(request, env, url = new URL(request.url)) {
  // A dedicated gateway is the browser boundary; public catalog CORS never applies.
  if (request.method === 'OPTIONS') return refuse(403, 'district-gateway-required');
  if (url.searchParams.has('token')) return refuse(401, 'header-authorization-required');
  const cfg = config(env);
  if (!cfg) return refuse(503, 'reporting-not-configured');
  const p = cfg.policy;
  const submitting = url.pathname === '/submitBug' || url.pathname === '/bug-report-policy';
  const id = url.pathname.startsWith('/bugs/') ? url.pathname.slice(6) : null;
  const role = submitting ? 'submit' : request.method === 'DELETE' ? 'delete' : 'read';
  const principal = await authenticate(request, cfg.principals, role);
  if (!principal) return refuse(401, 'unauthorized');
  const active = env.BUG_REPORTS_ENABLED === 'true' && Date.parse(p.approvedUntil) > Date.now();
  if (submitting && !active) return refuse(403, 'reporting-disabled');
  try {
    if (url.pathname === '/bug-report-policy' && request.method === 'GET') {
      return response({ ok: true, districtId: p.districtId, policyId: p.policyId,
        destinationName: p.destinationName, noticeUrl: p.noticeUrl,
        approvedUntil: p.approvedUntil, retentionSeconds: p.retentionSeconds });
    }
    if (url.pathname === '/submitBug' && request.method === 'POST') {
      const body = await readBody(request);
      if (body.error) return body.error;
      if (!validReport(body.data, p)) return refuse(409, 'report-or-policy-mismatch');
      if (sensitiveText(body.data)) return refuse(422, 'remove-sensitive-details');
      const reportId = crypto.randomUUID();
      const created = Date.now();
      const record = { schema_version: '2.0', id: reportId, district_id: p.districtId,
        policy_id: p.policyId, submitted_by: principal.id,
        created_at: new Date(created).toISOString(), expires_at: new Date(created + p.retentionSeconds * 1000).toISOString(),
        category: body.data.category, summary: body.data.summary.trim(), steps: body.data.steps.trim() };
      await audit(env, p, principal, 'submit', 'authorized', reportId);
      await env.BUG_REPORTS.put(reportKey(p, reportId), JSON.stringify(record), { expirationTtl: p.retentionSeconds });
      await audit(env, p, principal, 'submit', 'completed', reportId);
      return response({ ok: true, id: reportId, expires_at: record.expires_at }, 201);
    }
    if (id !== null && !REPORT_ID.test(id)) return refuse(400, 'invalid-report-id');
    if (url.pathname === '/bugs' && request.method === 'GET') {
      const cursor = url.searchParams.get('cursor') || undefined;
      if (cursor && cursor.length > 1024) return refuse(400, 'invalid-cursor');
      await audit(env, p, principal, 'list', 'authorized');
      const listed = await env.BUG_REPORTS.list({ prefix: prefix(p), limit: 50, ...(cursor ? { cursor } : {}) });
      const reports = [];
      for (const key of listed.keys) {
        const reportId = key.name.slice(prefix(p).length);
        if (!key.name.startsWith(prefix(p)) || !REPORT_ID.test(reportId)) continue;
        const report = await load(env, p, reportId);
        if (report) reports.push({ id: report.id, created_at: report.created_at, expires_at: report.expires_at, category: report.category });
      }
      await audit(env, p, principal, 'list', 'completed');
      return response({ ok: true, reports, cursor: listed.list_complete ? null : listed.cursor || null });
    }
    if (id && request.method === 'GET') {
      await audit(env, p, principal, 'read', 'authorized', id);
      const report = await load(env, p, id);
      if (!report) return refuse(404, 'report-not-found');
      await audit(env, p, principal, 'read', 'completed', id);
      return response({ ok: true, report });
    }
    if (id && request.method === 'DELETE') {
      await audit(env, p, principal, 'delete', 'authorized', id);
      // KV is eventually consistent. The tombstone suppresses cached records once
      // propagated; 202 acknowledges the request, not instantaneous global erasure.
      await env.BUG_REPORTS.put('bug-deleted:' + p.districtId + ':' + id, '1', { expirationTtl: MAX_RETENTION + 86400 });
      await env.BUG_REPORTS.delete(reportKey(p, id));
      await audit(env, p, principal, 'delete', 'completed', id);
      return response({ ok: true, id, status: 'deletion-requested' }, 202);
    }
    return refuse(405, 'method-not-allowed');
  } catch (_) {
    // Never include exception messages, report contents, or credentials in responses/logs.
    return refuse(503, 'reporting-unavailable');
  }
}
