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
 *   POST /submit        accept a submission
 *   OPTIONS /submit     CORS preflight
 *   GET  /healthz       liveness probe
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === 'GET' && url.pathname === '/healthz') {
      return jsonResponse({ ok: true });
    }

    if (request.method !== 'POST' || url.pathname !== '/submit') {
      return jsonResponse({ ok: false, error: 'Use POST /submit' }, 405);
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
