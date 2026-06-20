/**
 * AlloFlow Catalog Submission Worker
 *
 * Accepts POSTs of a lesson submission (lesson_payload + metadata +
 * affirmations) from the in-canvas submit form, validates them, runs a
 * defense-in-depth PII rescan, and commits the result as a JSON file to
 * `catalog/pending/<slug>.json` in the AlloFlow repo via the GitHub API.
 *
 * Secrets (set via `wrangler secret put`):
 *   GITHUB_PAT  fine-grained token, scoped to the AlloFlow repo only,
 *               with Contents: Read and write
 *
 * Vars (in wrangler.toml):
 *   GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH
 *
 * Endpoints:
 *   POST /submit            accept a lesson submission (-> public GitHub pending/)
 *   POST /submitTranslation accept a translation correction (-> public GitHub pending/)
 *   POST /submitBug         accept a bug report (-> PRIVATE BUG_REPORTS KV)
 *   POST /submitPd          accept a PD module (-> PRIVATE PD_SUBMISSIONS KV)
 *   GET  /bugs              token-gated bug-report reader
 *   OPTIONS *               CORS preflight
 *   GET  /healthz           liveness probe
 */

const MAX_BODY_BYTES = 1_048_576; // 1 MB

// Same PII patterns the in-canvas form uses. Defense in depth, not a substitute
// for the manual review at approval time.
const PII_PATTERNS = [
  { type: 'email',                   re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { type: 'phone (US)',              re: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g },
  { type: 'SSN',                     re: /\d{3}-\d{2}-\d{4}/g },
  { type: 'social URL',              re: /(?:facebook\.com|instagram\.com|tiktok\.com|linkedin\.com)\/[A-Za-z0-9._-]+/gi },
  { type: 'street address',          re: /\d{1,5}\s+[A-Z][A-Za-z]+\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Court|Ct\.?)/gi },
  { type: 'titled name',             re: /(?:Mr|Mrs|Ms|Dr|Mx)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g },
  { type: 'diagnostic acronym',      re: /\b(?:ADHD|ASD|ODD|OCD|PTSD|TBI|SLD|EBD|OHI|IEP|504\sPlan)\b/g },
];

const ALLOWED_LICENSES = new Set(['CC-BY-SA-4.0', 'CC-BY-4.0', 'CC0']);
const ALLOWED_SUBJECTS = new Set([
  'Math', 'Science', 'ELA / Literacy', 'Social Studies',
  'SEL / Character', 'Art / Music', 'World Languages',
  'STEM (cross-disciplinary)', 'Other',
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...extraHeaders },
  });
}

function slugify(s) {
  return String(s || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'untitled';
}

function scanForPii(text) {
  const findings = [];
  for (const p of PII_PATTERNS) {
    const matches = text.match(p.re);
    if (matches && matches.length > 0) {
      findings.push({
        type: p.type,
        count: matches.length,
        samples: matches.slice(0, 3),
      });
    }
  }
  return findings;
}

function validateSubmission(payload) {
  if (!payload || typeof payload !== 'object') return 'Body must be a JSON object.';
  if (!payload.lesson_payload || typeof payload.lesson_payload !== 'object') return 'lesson_payload missing or not an object.';
  if (!payload.metadata || typeof payload.metadata !== 'object') return 'metadata missing or not an object.';
  if (!payload.affirmations || typeof payload.affirmations !== 'object') return 'affirmations missing or not an object.';

  const m = payload.metadata;
  if (!m.title || typeof m.title !== 'string' || m.title.trim().length === 0) return 'metadata.title required.';
  if (m.title.length > 200) return 'metadata.title too long (max 200 chars).';
  if (!m.subject || !ALLOWED_SUBJECTS.has(m.subject)) return 'metadata.subject required and must be a known subject.';
  if (!m.grade_level || typeof m.grade_level !== 'string' || m.grade_level.trim().length === 0) return 'metadata.grade_level required.';
  if (m.grade_level.length > 20) return 'metadata.grade_level too long (max 20 chars).';
  if (m.credit && (typeof m.credit !== 'string' || m.credit.length > 80)) return 'metadata.credit must be a string up to 80 chars.';
  if (m.license && !ALLOWED_LICENSES.has(m.license)) return 'metadata.license must be CC-BY-SA-4.0, CC-BY-4.0, or CC0.';
  if (m.tags && (!Array.isArray(m.tags) || m.tags.length > 20)) return 'metadata.tags must be an array of up to 20 strings.';

  const a = payload.affirmations;
  for (const key of ['author_or_authorized', 'no_pii', 'license_agreed', 'age_eligible']) {
    if (a[key] !== true) return `affirmation "${key}" must be true.`;
  }

  return null;
}

async function commitToGitHub(env, slug, content) {
  const owner = env.GITHUB_OWNER || 'Apomera';
  const repo = env.GITHUB_REPO || 'AlloFlow';
  const branch = env.GITHUB_BRANCH || 'main';
  const filename = `${Date.now()}-${slug}.json`;
  const filePath = `catalog/pending/${filename}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  // Cloudflare Workers ship btoa; encode the file content as base64.
  const encodedContent = btoa(unescape(encodeURIComponent(content)));

  const ghResp = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${env.GITHUB_PAT}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'AlloFlow-Catalog-Worker',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Catalog submission: ${slug}`,
      branch: branch,
      content: encodedContent,
    }),
  });

  if (!ghResp.ok) {
    const errBody = await ghResp.text();
    throw new Error(`GitHub commit failed (${ghResp.status}): ${errBody.slice(0, 500)}`);
  }

  return { filename, filePath };
}

// ── Translation corrections (parallel to lesson submission; same GitHub-commit model) ──
// Commits to translations/pending/<file>.json. The maintainer reviews + applies them to the
// lang packs via dev-tools/i18n/ingest_translation_feedback.cjs (--apply). The app never reads
// these back, so there's no public manifest — submit-only.

async function commitJsonToGitHub(env, filePath, content, message) {
  const owner = env.GITHUB_OWNER || 'Apomera';
  const repo = env.GITHUB_REPO || 'AlloFlow';
  const branch = env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const encodedContent = btoa(unescape(encodeURIComponent(content)));
  const ghResp = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${env.GITHUB_PAT}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'AlloFlow-Catalog-Worker',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, branch, content: encodedContent }),
  });
  if (!ghResp.ok) {
    const errBody = await ghResp.text();
    throw new Error(`GitHub commit failed (${ghResp.status}): ${errBody.slice(0, 500)}`);
  }
}

function validateTranslation(p) {
  if (!p || typeof p !== 'object') return 'Body must be a JSON object.';
  if (!p.language || typeof p.language !== 'string' || p.language.trim().length === 0) return 'language required.';
  if (p.language.length > 60) return 'language too long (max 60 chars).';
  if (!p.suggested || typeof p.suggested !== 'string' || p.suggested.trim().length === 0) return 'suggested translation required.';
  if (p.suggested.length > 4000) return 'suggested too long (max 4000 chars).';
  for (const f of ['key', 'current', 'english', 'note']) {
    if (p[f] != null && (typeof p[f] !== 'string' || p[f].length > 4000)) return `${f} must be a string up to 4000 chars.`;
  }
  return null;
}

async function handleTranslationSubmit(request, env) {
  if (!env.GITHUB_PAT) return jsonResponse({ ok: false, error: 'Server misconfigured: missing GITHUB_PAT secret.' }, 500);
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return jsonResponse({ ok: false, error: 'Content-Type must be application/json.' }, 415);
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return jsonResponse({ ok: false, error: `Body exceeds ${MAX_BODY_BYTES} bytes.` }, 413);
  let p;
  try { p = JSON.parse(rawBody); } catch (err) { return jsonResponse({ ok: false, error: 'Invalid JSON: ' + err.message }, 400); }
  const err = validateTranslation(p);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  const piiFindings = scanForPii([p.suggested, p.current, p.note].filter(Boolean).join('\n'));
  const record = {
    schema_version: '1.0',
    kind: 'translation_correction',
    submitted_at: new Date().toISOString(),
    language: p.language.trim(),
    key: (p.key || '').trim(),
    current: (p.current || '').trim(),
    suggested: p.suggested.trim(),
    english: (p.english || '').trim(),
    note: (p.note || '').trim(),
    pii_scan: { ran_server_side: true, findings: piiFindings },
    submitter: {
      ip_country: request.cf?.country || null,
      user_agent: (request.headers.get('User-Agent') || '').slice(0, 200),
    },
  };
  const base = slugify(p.language) + '-' + slugify(p.key || p.current).slice(0, 32);
  const filePath = `translations/pending/${Date.now()}-${base}.json`;
  try {
    await commitJsonToGitHub(env, filePath, JSON.stringify(record, null, 2) + '\n', `Translation correction: ${record.language} ${record.key || ''}`.trim());
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Could not commit to GitHub: ' + e.message }, 502);
  }
  return jsonResponse({ ok: true, language: record.language, key: record.key, pii_findings_count: piiFindings.length }, 201);
}

// ── Bug reports → Cloudflare KV (PRIVATE, not GitHub) ──
// Unlike lessons/translations, bug reports carry error logs + free text that can include
// student-identifiable data (FERPA). The AlloFlow repo is PUBLIC, so these must NOT go to GitHub.
// They're stored in the private BUG_REPORTS KV namespace instead. Defense-in-depth PII scan still
// runs so findings are flagged. Read them via GET /bugs (token-gated) or `wrangler kv key list`.
// Requires a KV binding `BUG_REPORTS` in wrangler.toml. Read route requires the ADMIN_TOKEN secret.

function validateBug(p) {
  if (!p || typeof p !== 'object') return 'Body must be a JSON object.';
  const what = typeof p.what === 'string' ? p.what : '';
  const steps = typeof p.steps === 'string' ? p.steps : '';
  if (!what.trim() && !steps.trim()) return 'Report needs a description (what/steps).';
  for (const [f, max] of [['type', 60], ['what', 16000], ['steps', 8000], ['browser', 500], ['url', 500]]) {
    if (p[f] != null && (typeof p[f] !== 'string' || p[f].length > max)) return `${f} must be a string up to ${max} chars.`;
  }
  return null;
}

// ── PD module submissions → Cloudflare KV (PRIVATE, not GitHub) ──
// PD modules are educator-authored and may reference student/classroom detail, so
// like bug reports they are staged in PRIVATE KV (PD_SUBMISSIONS), NOT committed to
// the public repo. Shallow validation only — the deep schema check lives in
// pd_core_module.js (client-side) and is repeated by the maintainer at review time.

function validatePd(p) {
  if (!p || typeof p !== 'object') return 'Body must be a JSON object.';
  const m = p.pd_module;
  if (!m || typeof m !== 'object') return 'pd_module missing or not an object.';
  if (m.kind !== 'pd_module') return 'pd_module.kind must be "pd_module".';
  if (!m.metadata || typeof m.metadata !== 'object' || !m.metadata.title || typeof m.metadata.title !== 'string' || !m.metadata.title.trim()) return 'pd_module.metadata.title required.';
  if (m.metadata.title.length > 200) return 'pd_module.metadata.title too long (max 200 chars).';
  if (!Array.isArray(m.sections) || m.sections.length === 0) return 'pd_module needs at least one section.';
  if (p.credit != null && (typeof p.credit !== 'string' || p.credit.length > 80)) return 'credit must be a string up to 80 chars.';
  if (!p.affirmations || typeof p.affirmations !== 'object') return 'affirmations missing or not an object.';
  for (const key of ['author_or_authorized', 'no_pii', 'license_agreed', 'age_eligible']) {
    if (p.affirmations[key] !== true) return `affirmation "${key}" must be true.`;
  }
  return null;
}

async function handlePdSubmit(request, env) {
  if (!env.PD_SUBMISSIONS) return jsonResponse({ ok: false, error: 'Server misconfigured: missing PD_SUBMISSIONS KV binding.' }, 500);
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return jsonResponse({ ok: false, error: 'Content-Type must be application/json.' }, 415);
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return jsonResponse({ ok: false, error: `Body exceeds ${MAX_BODY_BYTES} bytes.` }, 413);
  let p;
  try { p = JSON.parse(rawBody); } catch (err) { return jsonResponse({ ok: false, error: 'Invalid JSON: ' + err.message }, 400); }
  const err = validatePd(p);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  const piiFindings = scanForPii(JSON.stringify(p.pd_module));
  const submittedAt = new Date().toISOString();
  const title = p.pd_module.metadata.title.trim();
  const slug = slugify(title);
  const record = {
    schema_version: '1.0',
    kind: 'pd_submission',
    submitted_at: submittedAt,
    title: title,
    topic: (p.pd_module.metadata.topic || '').slice(0, 80),
    credit: (p.credit || p.pd_module.metadata.credit || '').slice(0, 80),
    license: (p.pd_module.metadata.license || 'CC-BY-SA-4.0'),
    affirmations: p.affirmations,
    pii_scan: { ran_server_side: true, findings: piiFindings },
    submitter: {
      ip_country: request.cf?.country || null,
      user_agent: (request.headers.get('User-Agent') || '').slice(0, 200),
    },
    pd_module: p.pd_module,
  };
  // Time-sortable key (13-digit epoch) + slug, mirroring the bug key scheme. No TTL.
  const id = `pd:${Date.now()}:${slug}:${(crypto.randomUUID && crypto.randomUUID().slice(0, 8)) || Math.floor(Math.random() * 1e9).toString(36)}`;
  try {
    await env.PD_SUBMISSIONS.put(id, JSON.stringify(record), {
      metadata: { submitted_at: submittedAt, title: title, pii: piiFindings.length > 0, country: record.submitter.ip_country },
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Could not store submission: ' + e.message }, 502);
  }
  return jsonResponse({ ok: true, id, slug, pii_findings_count: piiFindings.length }, 201);
}

async function handleBugSubmit(request, env) {
  if (!env.BUG_REPORTS) return jsonResponse({ ok: false, error: 'Server misconfigured: missing BUG_REPORTS KV binding.' }, 500);
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return jsonResponse({ ok: false, error: 'Content-Type must be application/json.' }, 415);
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return jsonResponse({ ok: false, error: `Body exceeds ${MAX_BODY_BYTES} bytes.` }, 413);
  let p;
  try { p = JSON.parse(rawBody); } catch (err) { return jsonResponse({ ok: false, error: 'Invalid JSON: ' + err.message }, 400); }
  const err = validateBug(p);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  const piiFindings = scanForPii([p.what, p.steps].filter(Boolean).join('\n'));
  const submittedAt = new Date().toISOString();
  const record = {
    schema_version: '1.0',
    kind: 'bug_report',
    submitted_at: submittedAt,
    type: (p.type || 'Bug Report').slice(0, 60),
    what: (p.what || '').slice(0, 16000),
    steps: (p.steps || '').slice(0, 8000),
    browser: (p.browser || '').slice(0, 500),
    url: (p.url || '').slice(0, 500),
    pii_scan: { ran_server_side: true, findings: piiFindings },
    submitter: {
      ip_country: request.cf?.country || null,
      user_agent: (request.headers.get('User-Agent') || '').slice(0, 200),
    },
  };
  // Key sorts by time (13-digit epoch). No TTL — reports persist until manually purged.
  const id = `bug:${Date.now()}:${(crypto.randomUUID && crypto.randomUUID().slice(0, 8)) || Math.floor(Math.random() * 1e9).toString(36)}`;
  try {
    await env.BUG_REPORTS.put(id, JSON.stringify(record), {
      metadata: { submitted_at: submittedAt, pii: piiFindings.length > 0, country: record.submitter.ip_country },
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Could not store report: ' + e.message }, 502);
  }
  return jsonResponse({ ok: true, id, pii_findings_count: piiFindings.length }, 201);
}

async function handleBugList(request, env, url) {
  if (!env.ADMIN_TOKEN) return jsonResponse({ ok: false, error: 'Admin read disabled: set the ADMIN_TOKEN secret to enable GET /bugs (or use `wrangler kv key list`).' }, 501);
  if (!env.BUG_REPORTS) return jsonResponse({ ok: false, error: 'Missing BUG_REPORTS KV binding.' }, 500);
  const token = url.searchParams.get('token') || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (token !== env.ADMIN_TOKEN) return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
  const listed = await env.BUG_REPORTS.list({ prefix: 'bug:', limit });
  const keys = listed.keys.map(k => k.name).sort().reverse().slice(0, limit); // newest first
  const reports = [];
  for (const k of keys) { const v = await env.BUG_REPORTS.get(k); if (v) { try { reports.push({ id: k, ...JSON.parse(v) }); } catch (_) {} } }
  return jsonResponse({ ok: true, count: reports.length, reports });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === 'GET' && url.pathname === '/healthz') {
      return jsonResponse({ ok: true });
    }

    if (request.method === 'POST' && url.pathname === '/submitTranslation') {
      return handleTranslationSubmit(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/submitBug') {
      return handleBugSubmit(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/submitPd') {
      return handlePdSubmit(request, env);
    }

    if (request.method === 'GET' && url.pathname === '/bugs') {
      return handleBugList(request, env, url);
    }

    if (request.method !== 'POST' || url.pathname !== '/submit') {
      return jsonResponse({ ok: false, error: 'Use POST /submit, /submitTranslation, /submitBug, or /submitPd' }, 405);
    }

    if (!env.GITHUB_PAT) {
      return jsonResponse({ ok: false, error: 'Server misconfigured: missing GITHUB_PAT secret.' }, 500);
    }

    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonResponse({ ok: false, error: 'Content-Type must be application/json.' }, 415);
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, error: `Body exceeds ${MAX_BODY_BYTES} bytes.` }, 413);
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      return jsonResponse({ ok: false, error: 'Invalid JSON: ' + err.message }, 400);
    }

    const validationError = validateSubmission(payload);
    if (validationError) {
      return jsonResponse({ ok: false, error: validationError }, 400);
    }

    const piiFindings = scanForPii(JSON.stringify(payload.lesson_payload));

    const submissionRecord = {
      schema_version: '1.0',
      submitted_at: new Date().toISOString(),
      metadata: {
        title: payload.metadata.title.trim(),
        subject: payload.metadata.subject,
        grade_level: payload.metadata.grade_level.trim(),
        tags: Array.isArray(payload.metadata.tags) ? payload.metadata.tags.filter(t => typeof t === 'string').slice(0, 20) : [],
        credit: payload.metadata.credit ? payload.metadata.credit.trim() : null,
        license: payload.metadata.license || 'CC-BY-SA-4.0',
      },
      affirmations: payload.affirmations,
      pii_scan: {
        ran_server_side: true,
        findings: piiFindings,
      },
      submitter: {
        ip_country: request.cf?.country || null,
        user_agent: (request.headers.get('User-Agent') || '').slice(0, 200),
      },
      lesson_payload: payload.lesson_payload,
    };

    const slug = slugify(payload.metadata.title);
    let commitInfo;
    try {
      commitInfo = await commitToGitHub(env, slug, JSON.stringify(submissionRecord, null, 2) + '\n');
    } catch (err) {
      return jsonResponse({ ok: false, error: 'Could not commit to GitHub: ' + err.message }, 502);
    }

    return jsonResponse(
      { ok: true, slug, filename: commitInfo.filename, pii_findings_count: piiFindings.length },
      201
    );
  },
};
