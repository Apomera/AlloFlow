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
 *   POST /submit             accept a lesson submission (-> public GitHub pending/)
 *   POST /submitTranslation  accept a translation correction (-> public GitHub pending/)
 *   POST /submitItemCorrection accept a practice-item correction (-> public GitHub pending/)
 *   POST /submitBug          accept a bug report (-> PRIVATE BUG_REPORTS KV)
 *   POST /submitPd          accept a PD module (-> PRIVATE PD_SUBMISSIONS KV)
 *   POST /submitPlugin      accept a Tool Forge plugin (-> PRIVATE PLUGIN_SUBMISSIONS KV)
 *   GET  /bugs              token-gated bug-report reader
 *   GET  /pdSubmissions     token-gated PD-submission reader
 *   GET  /pluginSubmissions token-gated plugin-submission reader (?source=1 to include code)
 *   POST /issuePd           issue an Ed25519-signed PD completion attestation (opt-in)
 *   GET  /pdIssuerKey       the issuer's Ed25519 public key (for client-side verify)
 *   POST /verifyPd          verify a PD credential against the issuer key
 *   OPTIONS *               CORS preflight
 *   GET  /healthz           liveness probe
 */

const MAX_BODY_BYTES = 1_048_576; // 1 MB
// Guard on actual UTF-8 byte length (String.length is UTF-16 code units, so a
// multibyte body could otherwise slip past the size cap). byteLen >= str.length,
// so the cheap length check is a sound early-reject.
function bodyTooLarge(rawBody) {
  if (rawBody.length > MAX_BODY_BYTES) return true;
  return new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES;
}

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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

// Constant-time string compare for admin tokens (avoids a length/prefix timing oracle).
function timingSafeEq(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Hash both values before comparing issuer authorization tokens. This keeps the
// comparison loop fixed-width and avoids exposing a useful length/prefix oracle.
// (The Worker runtime does not expose Node's crypto.timingSafeEqual.)
async function timingSafeTokenEq(a, b) {
  const enc = new TextEncoder();
  const [ah, bh] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(String(a || ''))),
    crypto.subtle.digest('SHA-256', enc.encode(String(b || ''))),
  ]);
  const av = new Uint8Array(ah); const bv = new Uint8Array(bh);
  let diff = 0;
  for (let i = 0; i < av.length; i++) diff |= av[i] ^ bv[i];
  return diff === 0;
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
  if (bodyTooLarge(rawBody)) return jsonResponse({ ok: false, error: `Body exceeds ${MAX_BODY_BYTES} bytes.` }, 413);
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

// ── Practice-item corrections (parallel to translation corrections; same GitHub-commit model) ──
// Commits to item_corrections/pending/<file>.json. The maintainer reviews + applies accepted fixes
// to the pack source via dev-tools/i18n/ingest_item_corrections.cjs (--apply). Submit-only; the app
// never reads these back. This is the community-review channel for the Test Prep packs, whose
// independent expert validation is deliberately still in progress.

const ITEM_CORRECTION_KINDS = ['wrong-answer', 'ambiguous', 'weak-distractor', 'outdated', 'not-exam-item', 'typo', 'other'];

function validateItemCorrection(p) {
  if (!p || typeof p !== 'object') return 'Body must be a JSON object.';
  if (!p.packId || typeof p.packId !== 'string' || p.packId.trim().length === 0) return 'packId required.';
  if (p.packId.length > 120) return 'packId too long (max 120 chars).';
  if (!p.suggested || typeof p.suggested !== 'string' || p.suggested.trim().length === 0) return 'suggested fix required.';
  if (p.suggested.length > 4000) return 'suggested too long (max 4000 chars).';
  if (!p.kind || typeof p.kind !== 'string') return 'kind required.';
  // kind arrives as "id (Human label)"; validate the leading id against the allowlist.
  const kindId = p.kind.trim().split(' ')[0];
  if (!ITEM_CORRECTION_KINDS.includes(kindId)) return 'kind must be one of: ' + ITEM_CORRECTION_KINDS.join(', ');
  for (const f of ['packTitle', 'itemId', 'domain', 'reviewTier', 'prompt', 'currentAnswer', 'note']) {
    if (p[f] != null && (typeof p[f] !== 'string' || p[f].length > 4000)) return `${f} must be a string up to 4000 chars.`;
  }
  return null;
}

async function handleItemCorrectionSubmit(request, env) {
  if (!env.GITHUB_PAT) return jsonResponse({ ok: false, error: 'Server misconfigured: missing GITHUB_PAT secret.' }, 500);
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return jsonResponse({ ok: false, error: 'Content-Type must be application/json.' }, 415);
  const rawBody = await request.text();
  if (bodyTooLarge(rawBody)) return jsonResponse({ ok: false, error: `Body exceeds ${MAX_BODY_BYTES} bytes.` }, 413);
  let p;
  try { p = JSON.parse(rawBody); } catch (err) { return jsonResponse({ ok: false, error: 'Invalid JSON: ' + err.message }, 400); }
  const err = validateItemCorrection(p);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  const piiFindings = scanForPii([p.suggested, p.note, p.prompt].filter(Boolean).join('\n'));
  const record = {
    schema_version: '1.0',
    kind: 'item_correction',
    submitted_at: new Date().toISOString(),
    pack_id: p.packId.trim(),
    pack_title: (p.packTitle || '').trim(),
    item_id: (p.itemId || '').trim(),
    domain: (p.domain || '').trim(),
    review_tier: (p.reviewTier || '').trim(),
    problem_kind: p.kind.trim(),
    prompt: (p.prompt || '').trim(),
    current_answer: (p.currentAnswer || '').trim(),
    suggested: p.suggested.trim(),
    note: (p.note || '').trim(),
    pii_scan: { ran_server_side: true, findings: piiFindings },
    submitter: {
      ip_country: request.cf?.country || null,
      user_agent: (request.headers.get('User-Agent') || '').slice(0, 200),
    },
  };
  const base = slugify(p.packId) + '-' + slugify(p.itemId || p.kind).slice(0, 32);
  const filePath = `item_corrections/pending/${Date.now()}-${base}.json`;
  try {
    await commitJsonToGitHub(env, filePath, JSON.stringify(record, null, 2) + '\n', `Item correction: ${record.pack_id} ${record.item_id || ''}`.trim());
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Could not commit to GitHub: ' + e.message }, 502);
  }
  return jsonResponse({ ok: true, pack_id: record.pack_id, item_id: record.item_id, pii_findings_count: piiFindings.length }, 201);
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
// the public repo. The server is a trust boundary: it performs its own complete
// pd-1.0 validation and never relies on the browser's PdCore validator.
const PD_SCHEMA_VERSION = 'pd-1.0';
const PD_ACTIVITY_TYPES = new Set(['read', 'quiz', 'reflect', 'video', 'checklist', 'sim']);
const PD_MODULE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PD_ACTIVITY_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PD_AUTHORING_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PD_SUBMISSION_KEYS = ['pd_module', 'credit', 'affirmations'];
const PD_MODULE_KEYS = ['schema_version', 'kind', 'metadata', 'assessmentPolicy', 'sections'];
const PD_METADATA_KEYS = ['id', 'version', 'language', 'title', 'topic', 'summary', 'estMinutes', 'audience', 'license', 'credit', 'ai_generated'];
const PD_SECTION_KEYS = ['title', 'activities'];
const PD_ACTIVITY_KEYS = ['id', 'type', 'title', 'content', 'gate', 'assessmentPolicy'];
const PD_POLICY_KEYS = ['paste'];
const PD_PASTE_KEYS = ['mode', 'accessibleAlternative', 'accommodationContact'];
const PD_GATE_KEYS = ['kind', 'threshold'];
const PD_CONTENT_KEYS = {
  read: ['body', 'keyPoints', 'links'], quiz: ['questions'], reflect: ['prompt'],
  video: ['url', 'body', 'captions', 'captionsUrl', 'transcript', 'transcriptUrl', 'accessibleAlternative'],
  checklist: ['items'], sim: ['scenario', 'rubric'],
};
const PD_QUESTION_KEYS = ['prompt', 'options', 'correctIndex', 'explanation'];
const PD_LINK_KEYS = ['label', 'url'];
const PD_AFFIRMATION_KEYS = ['author_or_authorized', 'no_pii', 'license_agreed', 'age_eligible'];
const PD_VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$/;
const PD_LANGUAGE_RE = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;

function hasOnlyPdKeys(value, allowed) {
  return isObject(value) && Object.keys(value).every((key) => allowed.includes(key));
}
function pdUnknownFields(value, allowed, code, path) {
  return hasOnlyPdKeys(value, allowed) ? null : pdValidationError(422, code, path, 'Object contains fields outside the pd-1.0 contract.');
}

function pdValidationError(status, code, path, message) {
  return { status, code, path, message };
}
function isObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function isNonBlank(v, max) { return typeof v === 'string' && !!v.trim() && v.length <= max; }
function validPdUrl(v) {
  if (!isNonBlank(v, 2048) || v !== v.trim() || /[\u0000-\u001F\u007F\\\s]/.test(v)) return false;
  if (/^https?:\/\/[^/?#]+(?:[/?#].*)?$/i.test(v)) return true;
  if (/^(?:\/(?!\/)|\.\.?\/|[?#])/.test(v)) return true;
  return /^[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=@%/?#-]*$/.test(v);
}
function validatePdAssessmentPolicy(policy, path) {
  const bad = (code, suffix, message) => pdValidationError(422, code, path + suffix, message);
  if (policy === undefined) return null;
  if (!isObject(policy)) return bad('invalid_assessment_policy', '', 'assessmentPolicy must be an object.');
  const policyFields = pdUnknownFields(policy, PD_POLICY_KEYS, 'unknown_assessment_policy_fields', path);
  if (policyFields) return policyFields;
  if (policy.paste === undefined) return null;
  if (!isObject(policy.paste)) return bad('invalid_paste_policy', '.paste', 'assessmentPolicy.paste must be an object.');
  const pasteFields = pdUnknownFields(policy.paste, PD_PASTE_KEYS, 'unknown_paste_policy_fields', path + '.paste');
  if (pasteFields) return pasteFields;
  if (!['allowed', 'monitored', 'restricted'].includes(policy.paste.mode)) return bad('invalid_paste_mode', '.paste.mode', 'Paste mode must be allowed, monitored, or restricted.');
  if (policy.paste.mode === 'restricted' &&
      !isNonBlank(policy.paste.accessibleAlternative, 4000) &&
      !isNonBlank(policy.paste.accommodationContact, 1000)) {
    return bad('paste_alternative_required', '.paste', 'Restricted paste mode requires an accessibleAlternative or accommodationContact.');
  }
  return null;
}

function validatePdModuleServer(m) {
  const bad = (code, path, message) => pdValidationError(422, code, path, message);
  if (!isObject(m)) return bad('pd_module_required', 'pd_module', 'pd_module must be an object.');
  const moduleFields = pdUnknownFields(m, PD_MODULE_KEYS, 'unknown_module_fields', 'pd_module');
  if (moduleFields) return moduleFields;
  if (m.schema_version !== PD_SCHEMA_VERSION) return bad('unsupported_schema_version', 'pd_module.schema_version', `Only schema_version "${PD_SCHEMA_VERSION}" is supported.`);
  if (m.kind !== 'pd_module') return bad('invalid_module_kind', 'pd_module.kind', 'pd_module.kind must be "pd_module".');
  if (!isObject(m.metadata)) return bad('metadata_required', 'pd_module.metadata', 'pd_module.metadata must be an object.');
  const metadataFields = pdUnknownFields(m.metadata, PD_METADATA_KEYS, 'unknown_metadata_fields', 'pd_module.metadata');
  if (metadataFields) return metadataFields;
  if (!isNonBlank(m.metadata.version, 64)) return bad('metadata_version_required', 'pd_module.metadata.version', 'A stable module version is required.');
  if (!PD_VERSION_RE.test(m.metadata.version)) return bad('invalid_metadata_version', 'pd_module.metadata.version', 'Module version does not satisfy the pd-1.0 contract.');
  if (!isNonBlank(m.metadata.language, 35)) return bad('metadata_language_required', 'pd_module.metadata.language', 'A primary module language is required.');
  if (!PD_LANGUAGE_RE.test(m.metadata.language)) return bad('invalid_metadata_language', 'pd_module.metadata.language', 'Module language does not satisfy the pd-1.0 contract.');
  if (m.metadata.ai_generated !== undefined && typeof m.metadata.ai_generated !== 'boolean') return bad('invalid_metadata_ai_flag', 'pd_module.metadata.ai_generated', 'AI-assistance metadata must be boolean.');
  if (!isNonBlank(m.metadata.id, 128) || !PD_AUTHORING_ID_RE.test(m.metadata.id)) {
    return bad('invalid_module_id', 'pd_module.metadata.id', 'metadata.id must be a stable identifier up to 128 chars.');
  }
  if (!isNonBlank(m.metadata.title, 200)) return bad('invalid_module_title', 'pd_module.metadata.title', 'metadata.title must be a non-empty string up to 200 chars.');
  const modulePolicyError = validatePdAssessmentPolicy(m.assessmentPolicy, 'pd_module.assessmentPolicy');
  if (modulePolicyError) return modulePolicyError;
  for (const [field, max] of [['topic', 80], ['summary', 4000], ['credit', 80], ['license', 80], ['audience', 80]]) {
    if (m.metadata[field] != null && typeof m.metadata[field] !== 'string') return bad('invalid_metadata_field', `pd_module.metadata.${field}`, `metadata.${field} must be a string.`);
    if (typeof m.metadata[field] === 'string' && m.metadata[field].length > max) return bad('metadata_field_too_long', `pd_module.metadata.${field}`, `metadata.${field} exceeds ${max} chars.`);
  }
  if (m.metadata.estMinutes != null && (!Number.isFinite(m.metadata.estMinutes) || m.metadata.estMinutes <= 0 || m.metadata.estMinutes > 10080)) {
    return bad('invalid_estimated_minutes', 'pd_module.metadata.estMinutes', 'metadata.estMinutes must be a number in (0, 10080].');
  }
  if (!Array.isArray(m.sections) || m.sections.length === 0) return bad('sections_required', 'pd_module.sections', 'A PD module needs at least one section.');
  if (m.sections.length > 100) return bad('too_many_sections', 'pd_module.sections', 'A PD module may contain at most 100 sections.');

  const ids = new Set();
  let activityCount = 0;
  for (let si = 0; si < m.sections.length; si++) {
    const sec = m.sections[si]; const sp = `pd_module.sections[${si}]`;
    if (!isObject(sec)) return bad('invalid_section', sp, `Section ${si + 1} must be an object.`);
    const sectionFields = pdUnknownFields(sec, PD_SECTION_KEYS, 'unknown_section_fields', sp);
    if (sectionFields) return sectionFields;
    if (!isNonBlank(sec.title, 200)) return bad('invalid_section_title', `${sp}.title`, `Section ${si + 1} needs a non-empty title up to 200 chars.`);
    if (!Array.isArray(sec.activities) || sec.activities.length === 0) return bad('activities_required', `${sp}.activities`, `Section ${si + 1} needs at least one activity.`);
    if (sec.activities.length > 100) return bad('too_many_activities', `${sp}.activities`, `Section ${si + 1} may contain at most 100 activities.`);

    for (let ai = 0; ai < sec.activities.length; ai++) {
      activityCount++;
      if (activityCount > 500) return bad('too_many_activities', 'pd_module.sections', 'A PD module may contain at most 500 activities.');
      const act = sec.activities[ai]; const ap = `${sp}.activities[${ai}]`;
      if (!isObject(act)) return bad('invalid_activity', ap, 'Every activity must be an object.');
      const activityFields = pdUnknownFields(act, PD_ACTIVITY_KEYS, 'unknown_activity_fields', ap);
      if (activityFields) return activityFields;
      if (!isNonBlank(act.id, 128) || !PD_AUTHORING_ID_RE.test(act.id)) return bad('invalid_activity_id', `${ap}.id`, 'Activity id must be a stable identifier up to 128 chars.');
      if (ids.has(act.id)) return bad('duplicate_activity_id', `${ap}.id`, `Duplicate activity id "${act.id}".`);
      ids.add(act.id);
      if (!PD_ACTIVITY_TYPES.has(act.type)) return bad('unsupported_activity_type', `${ap}.type`, `Unsupported activity type "${String(act.type)}".`);
      if (!isNonBlank(act.title, 200)) return bad('invalid_activity_title', `${ap}.title`, `Activity ${act.id} needs a non-empty title up to 200 chars.`);
      if (!isObject(act.content)) return bad('activity_content_required', `${ap}.content`, `Activity ${act.id} needs a content object.`);
      const activityPolicyError = validatePdAssessmentPolicy(act.assessmentPolicy, `${ap}.assessmentPolicy`);
      if (activityPolicyError) return activityPolicyError;

      const c = act.content;
      const contentFields = pdUnknownFields(c, PD_CONTENT_KEYS[act.type] || [], 'unknown_content_fields', `${ap}.content`);
      if (contentFields) return contentFields;
      if (act.type === 'read') {
        if (!isNonBlank(c.body, 100000)) return bad('read_body_required', `${ap}.content.body`, `Read activity ${act.id} needs a non-empty body.`);
        if (c.keyPoints !== undefined) {
          if (!Array.isArray(c.keyPoints) || c.keyPoints.length > 100 || c.keyPoints.some((item) => !isNonBlank(item, 4000))) {
            return bad('invalid_read_key_points', `${ap}.content.keyPoints`, 'Read keyPoints must be an array of non-empty strings.');
          }
        }
        if (c.links !== undefined) {
          if (!Array.isArray(c.links) || c.links.length > 100) return bad('invalid_read_links', `${ap}.content.links`, 'Read links must be an array.');
          for (let li = 0; li < c.links.length; li++) {
            const link = c.links[li];
            if (!isObject(link)) return bad('invalid_read_link', `${ap}.content.links[${li}]`, 'Every read link must be an object.');
            const linkFields = pdUnknownFields(link, PD_LINK_KEYS, 'unknown_link_fields', `${ap}.content.links[${li}]`);
            if (linkFields) return linkFields;
            if (!isNonBlank(link.label, 4000) || !validPdUrl(link.url)) return bad('invalid_read_link', `${ap}.content.links[${li}]`, 'Every read link needs a label and safe URL.');
          }
        }
      }
      if (act.type === 'reflect' && !isNonBlank(c.prompt, 10000)) return bad('reflect_prompt_required', `${ap}.content.prompt`, `Reflect activity ${act.id} needs a non-empty prompt.`);
      if (act.type === 'video') {
        if (!validPdUrl(c.url)) return bad('invalid_video_url', `${ap}.content.url`, `Video activity ${act.id} needs a safe content.url.`);
        if (c.transcriptUrl !== undefined && !validPdUrl(c.transcriptUrl)) return bad('invalid_transcript_url', `${ap}.content.transcriptUrl`, 'Video transcriptUrl must be safe.');
        if (c.captionsUrl !== undefined && !validPdUrl(c.captionsUrl)) return bad('invalid_captions_url', `${ap}.content.captionsUrl`, 'Video captionsUrl must be safe.');
      }
      if (act.type === 'sim') {
        if (!isNonBlank(c.scenario, 20000)) return bad('sim_scenario_required', `${ap}.content.scenario`, `Sim activity ${act.id} needs a non-empty scenario.`);
        if (!isNonBlank(c.rubric, 20000)) return bad('invalid_sim_rubric', `${ap}.content.rubric`, `Sim activity ${act.id} needs a non-empty rubric up to 20000 chars.`);
      }
      if (act.type === 'checklist') {
        if (!Array.isArray(c.items) || c.items.length === 0 || c.items.length > 100) return bad('invalid_checklist_items', `${ap}.content.items`, `Checklist activity ${act.id} needs 1-100 items.`);
        for (let ii = 0; ii < c.items.length; ii++) if (!isNonBlank(c.items[ii], 2000)) return bad('invalid_checklist_item', `${ap}.content.items[${ii}]`, 'Every checklist item must be a non-empty string up to 2000 chars.');
      }
      if (act.type === 'quiz') {
        if (!Array.isArray(c.questions) || c.questions.length === 0 || c.questions.length > 100) return bad('invalid_quiz_questions', `${ap}.content.questions`, `Quiz ${act.id} needs 1-100 questions.`);
        for (let qi = 0; qi < c.questions.length; qi++) {
          const q = c.questions[qi]; const qp = `${ap}.content.questions[${qi}]`;
          if (!isObject(q)) return bad('invalid_quiz_question', qp, `Quiz ${act.id} question ${qi + 1} must be an object.`);
          const questionFields = pdUnknownFields(q, PD_QUESTION_KEYS, 'unknown_question_fields', qp);
          if (questionFields) return questionFields;
          if (!isNonBlank(q.prompt, 10000)) return bad('quiz_prompt_required', `${qp}.prompt`, `Quiz ${act.id} question ${qi + 1} needs a prompt.`);
          if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 20) return bad('invalid_quiz_options', `${qp}.options`, `Quiz ${act.id} question ${qi + 1} needs 2-20 options.`);
          for (let oi = 0; oi < q.options.length; oi++) if (!isNonBlank(q.options[oi], 4000)) return bad('invalid_quiz_option', `${qp}.options[${oi}]`, 'Every quiz option must be a non-empty string up to 4000 chars.');
          if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) return bad('invalid_answer_key', `${qp}.correctIndex`, `Quiz ${act.id} question ${qi + 1} needs a valid integer correctIndex.`);
          if (q.explanation != null && !isNonBlank(q.explanation, 10000)) return bad('invalid_quiz_explanation', `${qp}.explanation`, 'Quiz explanations must be non-empty strings when supplied.');
        }
      }

      const gate = act.gate == null ? { kind: 'none' } : act.gate;
      if (!isObject(gate)) return bad('invalid_gate_kind', `${ap}.gate`, 'Activity gate must be an object.');
      const gateFields = pdUnknownFields(gate, PD_GATE_KEYS, 'unknown_gate_fields', `${ap}.gate`);
      if (gateFields) return gateFields;
      if (gate.kind !== 'none' && gate.kind !== 'score') return bad('invalid_gate_kind', `${ap}.gate.kind`, `Activity ${act.id} gate.kind must be "none" or "score".`);
      if (gate.kind === 'score') {
        if (act.type !== 'quiz') return bad('invalid_score_gate_type', `${ap}.gate`, `Activity ${act.id} may use a score gate only when its type is quiz.`);
        if (!Number.isFinite(gate.threshold) || gate.threshold <= 0 || gate.threshold > 1) return bad('invalid_score_threshold', `${ap}.gate.threshold`, `Activity ${act.id} score threshold must be in (0,1].`);
      }
    }
  }
  return null;
}

function validatePdAccessibilityReadinessServer(m) {
  const bad = (code, path, message) => pdValidationError(422, code, path, message);
  const metadata = (m && m.metadata) || {};
  if (!isNonBlank(metadata.language, 35)) return bad('metadata_language_required', 'pd_module.metadata.language', 'Declare the primary module language.');
  for (let si = 0; si < m.sections.length; si++) {
    const activities = m.sections[si].activities || [];
    for (let ai = 0; ai < activities.length; ai++) {
      const act = activities[ai];
      if (!act || act.type !== 'video') continue;
      const c = act.content || {};
      const path = `pd_module.sections[${si}].activities[${ai}].content`;
      const captions = c.captions === true || (isNonBlank(c.captionsUrl, 2048) && validPdUrl(c.captionsUrl));
      const transcript = isNonBlank(c.transcript, 100000) || (isNonBlank(c.transcriptUrl, 2048) && validPdUrl(c.transcriptUrl));
      const alternative = isNonBlank(c.accessibleAlternative, 100000);
      if (!captions) return bad('video_captions_required', path, 'Provide captions for prerecorded video.');
      if (!transcript && !alternative) return bad('video_alternative_required', path, 'Provide a transcript or documented accessible alternative.');
    }
  }
  return null;
}

function validatePd(p) {
  if (!isObject(p)) return pdValidationError(400, 'invalid_body', '', 'Body must be a JSON object.');
  const submissionFields = pdUnknownFields(p, PD_SUBMISSION_KEYS, 'unknown_submission_fields', '');
  if (submissionFields) return submissionFields;
  const moduleError = validatePdModuleServer(p.pd_module);
  if (moduleError) return moduleError;
  const accessibilityError = validatePdAccessibilityReadinessServer(p.pd_module);
  if (accessibilityError) return accessibilityError;
  if (p.credit != null && (typeof p.credit !== 'string' || p.credit.length > 80)) return pdValidationError(422, 'invalid_credit', 'credit', 'credit must be a string up to 80 chars.');
  if (!isObject(p.affirmations)) return pdValidationError(422, 'affirmations_required', 'affirmations', 'affirmations must be an object.');
  const affirmationFields = pdUnknownFields(p.affirmations, PD_AFFIRMATION_KEYS, 'unknown_affirmation_fields', 'affirmations');
  if (affirmationFields) return affirmationFields;
  for (const key of PD_AFFIRMATION_KEYS) {
    if (p.affirmations[key] !== true) return pdValidationError(422, 'affirmation_required', `affirmations.${key}`, `affirmation "${key}" must be true.`);
  }
  return null;
}
async function handlePdSubmit(request, env) {
  if (!env.PD_SUBMISSIONS) return jsonResponse({ ok: false, error: 'Server misconfigured: missing PD_SUBMISSIONS KV binding.' }, 500);
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return jsonResponse({ ok: false, error: 'Content-Type must be application/json.' }, 415);
  const rawBody = await request.text();
  if (bodyTooLarge(rawBody)) return jsonResponse({ ok: false, error: `Body exceeds ${MAX_BODY_BYTES} bytes.` }, 413);
  let p;
  try { p = JSON.parse(rawBody); } catch (err) { return jsonResponse({ ok: false, error: 'Invalid JSON: ' + err.message }, 400); }
  const err = validatePd(p);
  if (err) return jsonResponse({ ok: false, error: err.message, code: err.code, path: err.path }, err.status);

  const moduleContentDigest = 'sha256:' + await pdSha256Hex(pdCanonicalize(p.pd_module));
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
    module_content_digest: moduleContentDigest,
    affirmations: p.affirmations,
    pii_scan: { ran_server_side: true, findings: piiFindings },
    structure_check: { ok: true, issues: [], validator: 'worker-pd-1.0' },
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
      metadata: { submitted_at: submittedAt, title: title, module_content_digest: moduleContentDigest, pii: piiFindings.length > 0, country: record.submitter.ip_country },
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Could not store submission: ' + e.message }, 502);
  }
  return jsonResponse({ ok: true, id, slug, module_content_digest: moduleContentDigest, pii_findings_count: piiFindings.length }, 201);
}

async function handleBugSubmit(request, env) {
  if (!env.BUG_REPORTS) return jsonResponse({ ok: false, error: 'Server misconfigured: missing BUG_REPORTS KV binding.' }, 500);
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return jsonResponse({ ok: false, error: 'Content-Type must be application/json.' }, 415);
  const rawBody = await request.text();
  if (bodyTooLarge(rawBody)) return jsonResponse({ ok: false, error: `Body exceeds ${MAX_BODY_BYTES} bytes.` }, 413);
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

async function handlePdList(request, env, url) {
  if (!env.ADMIN_TOKEN) return jsonResponse({ ok: false, error: 'Admin read disabled: set the ADMIN_TOKEN secret to enable GET /pdSubmissions (or use `wrangler kv key list`).' }, 501);
  if (!env.PD_SUBMISSIONS) return jsonResponse({ ok: false, error: 'Missing PD_SUBMISSIONS KV binding.' }, 500);
  const token = url.searchParams.get('token') || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (token !== env.ADMIN_TOKEN) return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
  const listed = await env.PD_SUBMISSIONS.list({ prefix: 'pd:', limit });
  const keys = listed.keys.map(k => k.name).sort().reverse().slice(0, limit); // newest first
  const submissions = [];
  for (const k of keys) { const v = await env.PD_SUBMISSIONS.get(k); if (v) { try { submissions.push({ id: k, ...JSON.parse(v) }); } catch (_) {} } }
  return jsonResponse({ ok: true, count: submissions.length, submissions });
}

// ── Tool Forge plugin submissions → Cloudflare KV (PRIVATE, not GitHub) ──
// A plugin submission is one self-registering stem_tool_<id>.js / sel_tool_<id>.js
// file plus metadata + the client's validator report. Like PD modules and bug
// reports, it is staged in PRIVATE KV (PLUGIN_SUBMISSIONS), NEVER auto-committed to
// the public repo and NEVER run server-side — the maintainer reviews the source +
// the validator report + a sandboxed preview, then manually drops the file into
// PLUGIN_FILES and deploys (the human gate). Executable submissions especially must
// never bypass that gate. Shallow validation + a light structural sanity check +
// defense-in-depth PII scan only; the gate of record is Tier-2 CI (check_stem_render,
// check_tool_contract, check_free_vars, golden) re-run on the submitted file.
const PLUGIN_LICENSES = new Set(['CC-BY-SA-4.0', 'CC-BY-4.0', 'CC0', 'MIT', 'Apache-2.0']);

function validatePlugin(p) {
  if (!p || typeof p !== 'object') return 'Body must be a JSON object.';
  const pl = p.plugin;
  if (!pl || typeof pl !== 'object') return 'plugin missing or not an object.';
  if (!pl.id || typeof pl.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(pl.id)) return 'plugin.id required (letters/digits/underscore, starts with a letter).';
  if (pl.id.length > 40) return 'plugin.id too long (max 40 chars).';
  if (!pl.label || typeof pl.label !== 'string' || !pl.label.trim()) return 'plugin.label required.';
  if (pl.label.length > 80) return 'plugin.label too long (max 80 chars).';
  if (pl.desc != null && (typeof pl.desc !== 'string' || pl.desc.length > 1000)) return 'plugin.desc must be a string up to 1000 chars.';
  if (pl.target !== 'stem' && pl.target !== 'sel') return 'plugin.target must be "stem" or "sel".';
  if (!pl.source || typeof pl.source !== 'string' || !pl.source.trim()) return 'plugin.source (the .js file text) required.';
  if (pl.source.length > 500000) return 'plugin.source too long (max 500000 chars).';
  for (const f of ['category', 'color', 'icon']) {
    if (pl[f] != null && (typeof pl[f] !== 'string' || pl[f].length > 60)) return `plugin.${f} must be a string up to 60 chars.`;
  }
  const m = p.metadata || {};
  if (m.author != null && (typeof m.author !== 'string' || m.author.length > 80)) return 'metadata.author must be a string up to 80 chars.';
  if (m.license != null && !PLUGIN_LICENSES.has(m.license)) return 'metadata.license must be one of: ' + [...PLUGIN_LICENSES].join(', ') + '.';
  if (!p.affirmations || typeof p.affirmations !== 'object') return 'affirmations missing or not an object.';
  for (const key of ['author_or_authorized', 'no_pii', 'license_agreed', 'age_eligible', 'passes_validation', 'accuracy_attested']) {
    if (p.affirmations[key] !== true) return `affirmation "${key}" must be true.`;
  }
  return null;
}

// Light, non-blocking server-side sanity check on the source (the real gate is Tier-2
// CI). Confirms the file actually looks like a conforming plugin and flags obvious
// red flags for the reviewer; it does NOT execute the code.
function pluginStructureIssues(pl) {
  const issues = [];
  const src = typeof pl.source === 'string' ? pl.source : '';
  if (!/registerTool\s*\(/.test(src)) issues.push('source does not call registerTool()');
  if (pl.id && src.indexOf(pl.id) === -1) issues.push('declared id "' + pl.id + '" not found in source');
  if (pl.target === 'sel') { if (!/window\.SelHub/.test(src)) issues.push('target is "sel" but source does not reference window.SelHub'); }
  else if (!/window\.StemLab/.test(src)) issues.push('target is "stem" but source does not reference window.StemLab');
  if (/\beval\s*\(/.test(src)) issues.push('source uses eval()');
  if (/(^|[^.\w])Function\s*\(/.test(src)) issues.push('source uses the Function constructor'); // catches `new Function(` AND bare `Function(`
  if (/document\.write\s*\(/.test(src)) issues.push('source uses document.write()');
  return issues;
}

async function handlePluginSubmit(request, env) {
  if (!env.PLUGIN_SUBMISSIONS) return jsonResponse({ ok: false, error: 'Server misconfigured: missing PLUGIN_SUBMISSIONS KV binding.' }, 500);
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return jsonResponse({ ok: false, error: 'Content-Type must be application/json.' }, 415);
  const rawBody = await request.text();
  if (bodyTooLarge(rawBody)) return jsonResponse({ ok: false, error: `Body exceeds ${MAX_BODY_BYTES} bytes.` }, 413);
  let p;
  try { p = JSON.parse(rawBody); } catch (err) { return jsonResponse({ ok: false, error: 'Invalid JSON: ' + err.message }, 400); }
  const err = validatePlugin(p);
  if (err) return jsonResponse({ ok: false, error: err }, 400);

  const pl = p.plugin;
  const m = p.metadata || {};
  // Defense-in-depth PII scan over metadata + source. Source is code, so expect few
  // (and possibly false) hits — these are flagged for the reviewer, never auto-reject.
  const piiFindings = scanForPii([m.author || '', JSON.stringify(m), pl.source].join('\n'));
  const structIssues = pluginStructureIssues(pl);
  const submittedAt = new Date().toISOString();
  const slug = slugify(pl.id);
  const record = {
    schema_version: 'plugin-1.0',
    kind: 'plugin_submission',
    submitted_at: submittedAt,
    metadata: {
      id: pl.id,
      label: pl.label.trim(),
      desc: (pl.desc || '').slice(0, 1000),
      category: (pl.category || '').slice(0, 60),
      color: (pl.color || '').slice(0, 60),
      icon: (pl.icon || '').slice(0, 60),
      target: pl.target,
      author: (m.author || '').slice(0, 80),
      license: m.license || 'CC-BY-SA-4.0',
      subject: (m.subject || '').slice(0, 60),
      grade_band: (m.grade_band || '').slice(0, 20),
    },
    affirmations: p.affirmations,
    validator_report: (p.validator_report && typeof p.validator_report === 'object') ? p.validator_report : null,
    pii_scan: { ran_server_side: true, findings: piiFindings },
    structure_check: { ok: structIssues.length === 0, issues: structIssues.slice(0, 50), validator: 'worker-plugin-1.0' },
    submitter: {
      ip_country: request.cf?.country || null,
      user_agent: (request.headers.get('User-Agent') || '').slice(0, 200),
    },
    source: pl.source,
  };
  const id = `plugin:${Date.now()}:${slug}:${(crypto.randomUUID && crypto.randomUUID().slice(0, 8)) || Math.floor(Math.random() * 1e9).toString(36)}`;
  try {
    await env.PLUGIN_SUBMISSIONS.put(id, JSON.stringify(record), {
      metadata: { submitted_at: submittedAt, id: pl.id, label: record.metadata.label, target: pl.target, pii: piiFindings.length > 0, country: record.submitter.ip_country },
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Could not store submission: ' + e.message }, 502);
  }
  return jsonResponse({ ok: true, id, slug, pii_findings_count: piiFindings.length, structure_ok: structIssues.length === 0 }, 201);
}

async function handlePluginList(request, env, url) {
  if (!env.ADMIN_TOKEN) return jsonResponse({ ok: false, error: 'Admin read disabled: set the ADMIN_TOKEN secret to enable GET /pluginSubmissions (or use `wrangler kv key list`).' }, 501);
  if (!env.PLUGIN_SUBMISSIONS) return jsonResponse({ ok: false, error: 'Missing PLUGIN_SUBMISSIONS KV binding.' }, 500);
  const token = url.searchParams.get('token') || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!timingSafeEq(token, env.ADMIN_TOKEN)) return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
  const includeSource = url.searchParams.get('source') === '1'; // omit the (large) source unless explicitly requested
  const listed = await env.PLUGIN_SUBMISSIONS.list({ prefix: 'plugin:', limit });
  const keys = listed.keys.map(k => k.name).sort().reverse().slice(0, limit); // newest first
  const submissions = [];
  for (const k of keys) {
    const v = await env.PLUGIN_SUBMISSIONS.get(k);
    if (v) { try { const rec = JSON.parse(v); if (!includeSource) delete rec.source; submissions.push({ id: k, ...rec }); } catch (_) {} }
  }
  return jsonResponse({ ok: true, count: submissions.length, submissions });
}

// PD completion credentials. Secure-by-default reviewed issuance requires BOTH
// PD_ISSUER_PRIVATE_KEY and the PD_ISSUER_AUTH_TOKEN secret. The caller holding
// that token is the trusted review service; the endpoint validates and signs a
// complete, version-bound decision/evidence contract. Legacy learner-controlled
// self-paced attestations are disabled unless PD_ALLOW_SELF_PACED_ISSUANCE=true.
const PD_REVIEWED_DECISION_SCHEMA = 'pd-reviewed-decision-1.0';
const PD_EVIDENCE_SCHEMA = 'pd-evidence-1.0';
const PD_ACCESSIBILITY_SCHEMA = 'pd-accessibility-verification-1.0';
const PD_REVIEWED_CREDENTIAL_SCHEMA = 'pd-reviewed-credential-1.0';
const PD_ISSUANCE_LEDGER_SCHEMA = 'pd-issuance-ledger-1.0';
const PD_DIGEST_RE = /^sha256:[a-f0-9]{64}$/i;
const PD_CONTRACT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PD_MAX_ACCESSIBILITY_VALIDITY_MS = 366 * 24 * 60 * 60 * 1000;
const PD_LOCALE_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const PD_GOVERNANCE_SCOPES = new Set(['credential-review', 'learner-response', 'ai-analysis', 'integrity-monitoring']);
const PD_FUTURE_SKEW_MS = 5 * 60 * 1000;

function pdCanonicalize(v) {
  if (v === null) return 'null';
  const t = typeof v;
  if (t === 'number') { if (!isFinite(v)) throw new Error('non-finite number'); return JSON.stringify(v); }
  if (t === 'boolean') return v ? 'true' : 'false';
  if (t === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map((x) => pdCanonicalize(x === undefined ? null : x)).join(',') + ']';
  if (t === 'object') {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined && typeof v[k] !== 'function').sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + pdCanonicalize(v[k])).join(',') + '}';
  }
  throw new Error('cannot canonicalize ' + t);
}
function b64ToBuf(b64) { const bin = atob(String(b64 || '').replace(/\s+/g, '')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function bufToB64(buf) { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
async function pdSha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function isContractId(v) { return typeof v === 'string' && PD_CONTRACT_ID_RE.test(v); }
function isIsoDate(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && !Number.isNaN(Date.parse(v)); }
function hasExactKeys(value, keys) {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort(); const expected = keys.slice().sort();
  return actual.length === expected.length && actual.every((key, i) => key === expected[i]);
}
function isHttpsUrl(value) {
  if (!isNonBlank(value, 2000)) return false;
  try { return new URL(value).protocol === 'https:'; }
  catch (_) { return false; }
}
function uniqueContractIds(values, max = 20) {
  return Array.isArray(values) && values.length > 0 && values.length <= max && values.every(isContractId) && new Set(values).size === values.length;
}
function issueContractError(code, path, message, status = 422) { return { code, path, message, status }; }
function sameStringSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const aa = [...a].sort(); const bb = [...b].sort();
  return aa.every((v, i) => v === bb[i]);
}

function validateReviewedDecisionBase(d, nowMs = Date.now()) {
  const bad = (code, path, message) => issueContractError(code, path, message);
  if (!isObject(d)) return bad('reviewed_decision_required', 'decision', 'decision must be an object.');
  if (d.schema_version !== PD_REVIEWED_DECISION_SCHEMA) return bad('unsupported_decision_schema', 'decision.schema_version', `Only ${PD_REVIEWED_DECISION_SCHEMA} is supported.`);
  if (!isContractId(d.decision_id)) return bad('invalid_decision_id', 'decision.decision_id', 'decision_id must be a stable identifier up to 128 chars.');
  if (d.status !== 'approved') return bad('decision_not_approved', 'decision.status', 'Only an approved reviewed decision is credential-eligible.');
  if (!isIsoDate(d.decided_at)) return bad('invalid_decision_date', 'decision.decided_at', 'decided_at must be an RFC 3339 timestamp.');

  const decidedAt = Date.parse(d.decided_at);
  if (decidedAt > nowMs + PD_FUTURE_SKEW_MS) return bad('decision_date_in_future', 'decision.decided_at', 'decided_at cannot be more than five minutes in the future.');
  if (!isObject(d.reviewer)) return bad('reviewer_required', 'decision.reviewer', 'reviewer provenance is required.');
  if (!isContractId(d.reviewer.id)) return bad('invalid_reviewer_id', 'decision.reviewer.id', 'reviewer.id must be a stable identifier.');
  if (!isNonBlank(d.reviewer.name, 200)) return bad('invalid_reviewer_name', 'decision.reviewer.name', 'reviewer.name is required.');
  if (!isNonBlank(d.reviewer.authority, 200)) return bad('reviewer_authority_required', 'decision.reviewer.authority', 'reviewer.authority is required.');
  if (!isObject(d.provenance) || !isNonBlank(d.provenance.system, 200) || !isContractId(d.provenance.review_record_id)) return bad('decision_provenance_required', 'decision.provenance', 'provenance.system and provenance.review_record_id are required.');
  if (!isObject(d.learner) || !isContractId(d.learner.id)) return bad('learner_required', 'decision.learner.id', 'A stable learner.id is required.');

  const m = d.module;
  if (!isObject(m)) return bad('module_binding_required', 'decision.module', 'An immutable module binding is required.');
  if (!isNonBlank(m.id, 128) || !PD_AUTHORING_ID_RE.test(m.id)) return bad('invalid_module_id', 'decision.module.id', 'module.id must use the main PD authoring identifier contract.');
  if (!isContractId(m.version)) return bad('invalid_module_version', 'decision.module.version', 'module.version must be a stable identifier.');
  if (!PD_DIGEST_RE.test(String(m.content_digest || ''))) return bad('invalid_content_digest', 'decision.module.content_digest', 'module.content_digest must be sha256:<64 hex chars>.');
  if (!isNonBlank(m.title, 200)) return bad('invalid_module_title', 'decision.module.title', 'module.title is required.');
  if (!Array.isArray(m.required_activity_ids) || m.required_activity_ids.length === 0 || m.required_activity_ids.length > 500) return bad('activity_requirements_required', 'decision.module.required_activity_ids', 'module.required_activity_ids must contain 1-500 activity IDs.');
  const requiredIds = new Set();
  for (let i = 0; i < m.required_activity_ids.length; i++) {
    const id = m.required_activity_ids[i];
    if (!isNonBlank(id, 128) || !PD_AUTHORING_ID_RE.test(id)) return bad('invalid_required_activity_id', `decision.module.required_activity_ids[${i}]`, 'Every required activity ID must use the main PD authoring identifier contract.');
    if (requiredIds.has(id)) return bad('duplicate_required_activity_id', `decision.module.required_activity_ids[${i}]`, `Duplicate required activity id "${id}".`);
    requiredIds.add(id);
  }

  const e = d.evidence;
  if (!isObject(e) || e.schema_version !== PD_EVIDENCE_SCHEMA) return bad('unsupported_evidence_schema', 'decision.evidence.schema_version', `Evidence must use ${PD_EVIDENCE_SCHEMA}.`);
  if (!isContractId(e.evidence_id)) return bad('invalid_evidence_id', 'decision.evidence.evidence_id', 'evidence_id must be a stable identifier.');
  if (!PD_DIGEST_RE.test(String(e.evidence_digest || ''))) return bad('invalid_evidence_digest', 'decision.evidence.evidence_digest', 'evidence_digest must be sha256:<64 hex chars>.');
  if (!isIsoDate(e.collected_at)) return bad('invalid_evidence_date', 'decision.evidence.collected_at', 'evidence.collected_at must be an RFC 3339 timestamp.');
  if (e.module_id !== m.id || e.module_version !== m.version || e.content_digest !== m.content_digest) return bad('evidence_module_mismatch', 'decision.evidence', 'Evidence must bind to the same module id, version, and content digest.');
  if (Date.parse(e.collected_at) > decidedAt) return bad('evidence_after_decision', 'decision.evidence.collected_at', 'Evidence must be collected on or before the approval decision.');
  if (!Array.isArray(e.activity_results) || e.activity_results.length !== m.required_activity_ids.length) return bad('incomplete_activity_evidence', 'decision.evidence.activity_results', 'Evidence must include exactly one result for every required activity.');
  const resultIds = [];
  for (let i = 0; i < e.activity_results.length; i++) {
    const ar = e.activity_results[i]; const path = `decision.evidence.activity_results[${i}]`;
    if (!isObject(ar) || !isNonBlank(ar.activity_id, 128) || !PD_AUTHORING_ID_RE.test(ar.activity_id)) return bad('invalid_activity_result', path, 'Every activity result needs a stable authoring-compatible activity_id.');
    if (ar.satisfied !== true) return bad('activity_requirement_not_satisfied', `${path}.satisfied`, `Activity requirement "${ar.activity_id}" is not satisfied.`);
    if (!Array.isArray(ar.evidence_refs) || ar.evidence_refs.length === 0 || ar.evidence_refs.length > 20 || ar.evidence_refs.some((ref) => !isContractId(ref)) || new Set(ar.evidence_refs).size !== ar.evidence_refs.length) return bad('activity_evidence_refs_required', `${path}.evidence_refs`, 'Every activity result needs 1-20 unique stable evidence_refs.');
    resultIds.push(ar.activity_id);
  }
  if (new Set(resultIds).size !== resultIds.length || !sameStringSet(resultIds, m.required_activity_ids)) return bad('activity_evidence_mismatch', 'decision.evidence.activity_results', 'Activity evidence IDs must exactly match module.required_activity_ids.');

  const a = d.accessibility_verification;
  if (!isObject(a) || a.schema_version !== PD_ACCESSIBILITY_SCHEMA) return bad('accessibility_verification_required', 'decision.accessibility_verification.schema_version', `Accessibility verification must use ${PD_ACCESSIBILITY_SCHEMA}.`);
  if (a.module_id !== m.id || a.module_version !== m.version || a.content_digest !== m.content_digest) return bad('accessibility_module_mismatch', 'decision.accessibility_verification', 'Accessibility verification must bind to the same module id, version, and content digest.');
  if (a.standard !== 'WCAG 2.2' || a.level !== 'AA') return bad('unsupported_accessibility_target', 'decision.accessibility_verification', 'Credential issuance requires a WCAG 2.2 AA verification target.');
  if (a.status !== 'verified') return bad('accessibility_not_credential_eligible', 'decision.accessibility_verification.status', 'Only accessibility status "verified" is credential-eligible.');
  if (!isIsoDate(a.verified_at)) return bad('invalid_accessibility_date', 'decision.accessibility_verification.verified_at', 'verified_at must be an RFC 3339 timestamp.');
  if (!isObject(a.automated) || a.automated.completed !== true || a.automated.blocking_issues !== 0 || !Array.isArray(a.automated.tools) || a.automated.tools.length === 0) return bad('automated_accessibility_checks_incomplete', 'decision.accessibility_verification.automated', 'Automated checks must be complete, name a tool, and report zero blocking issues.');
  if (!isObject(a.manual_review) || a.manual_review.completed !== true || a.manual_review.result !== 'pass' || !isContractId(a.manual_review.reviewer_id) || !isContractId(a.manual_review.checklist_version) || !isIsoDate(a.manual_review.reviewed_at)) return bad('manual_accessibility_review_incomplete', 'decision.accessibility_verification.manual_review', 'A passing, dated manual accessibility review with reviewer/checklist provenance is required; automated-only results cannot establish conformance.');
  const verifiedAt = Date.parse(a.verified_at); const manuallyReviewedAt = Date.parse(a.manual_review.reviewed_at);
  if (manuallyReviewedAt > verifiedAt) return bad('manual_review_after_verification', 'decision.accessibility_verification.manual_review.reviewed_at', 'The manual review must occur on or before accessibility verification.');
  if (verifiedAt > decidedAt) return bad('accessibility_after_decision', 'decision.accessibility_verification.verified_at', 'Accessibility verification must occur on or before the approval decision.');
  return null;
}

function validateReviewedDecision(d, nowMs = Date.now()) {
  const bad = (code, path, message) => issueContractError(code, path, message);
  const base = validateReviewedDecisionBase(d, nowMs);
  if (base) return base;
  if (Date.parse(d.decided_at) > nowMs) return bad('decision_date_in_future', 'decision.decided_at', 'A credential cannot be issued before the approval decision occurs.');

  if (!hasExactKeys(d, ['schema_version', 'decision_id', 'status', 'decided_at', 'reviewer', 'provenance', 'learner', 'module', 'evidence', 'accessibility_verification'])) return bad('invalid_decision_shape', 'decision', 'Reviewed decision keys must exactly match pd-reviewed-decision-1.0.');
  if (!hasExactKeys(d.reviewer, ['id', 'name', 'authority'])) return bad('invalid_reviewer_shape', 'decision.reviewer', 'reviewer keys must be exact.');
  if (!hasExactKeys(d.provenance, ['system', 'review_record_id'])) return bad('invalid_provenance_shape', 'decision.provenance', 'provenance keys must be exact.');
  if (!hasExactKeys(d.learner, ['id'])) return bad('invalid_learner_shape', 'decision.learner', 'Reviewed decisions carry only the stable learner ID; learner names are not accepted.');
  if (!hasExactKeys(d.module, ['id', 'version', 'content_digest', 'title', 'topic', 'required_activity_ids'])) return bad('invalid_module_shape', 'decision.module', 'module keys must be exact.');
  if (d.module.topic !== null && !isNonBlank(d.module.topic, 200)) return bad('invalid_module_topic', 'decision.module.topic', 'topic must be a non-empty string or null.');

  const e = d.evidence;
  if (!hasExactKeys(e, ['schema_version', 'evidence_id', 'evidence_digest', 'collected_at', 'learner_id', 'module_id', 'module_version', 'content_digest', 'evidence_store', 'governance', 'activity_results'])) return bad('invalid_evidence_shape', 'decision.evidence', 'evidence keys must exactly match pd-evidence-1.0.');
  if (e.learner_id !== d.learner.id) return bad('evidence_learner_mismatch', 'decision.evidence.learner_id', 'Evidence must bind to the same learner ID.');
  if (!hasExactKeys(e.evidence_store, ['system', 'record_id', 'record_digest'])
    || !isNonBlank(e.evidence_store.system, 200) || !isContractId(e.evidence_store.record_id)
    || !PD_DIGEST_RE.test(String(e.evidence_store.record_digest || ''))
    || String(e.evidence_store.record_digest).toLowerCase() === String(e.evidence_digest).toLowerCase()) {
    return bad('invalid_evidence_store', 'decision.evidence.evidence_store', 'Evidence-store system, stable record ID, and record digest are required.');
  }

  const g = e.governance;
  if (!hasExactKeys(g, ['record_id', 'notice_version', 'notice_digest', 'notice_locale', 'granted_at', 'scopes', 'retention_policy_id', 'legal_basis_record_id'])) return bad('invalid_governance_shape', 'decision.evidence.governance', 'Governance keys must be exact.');
  if (!isContractId(g.record_id)) return bad('invalid_governance_record_id', 'decision.evidence.governance.record_id', 'A stable governance record ID is required.');
  if (!isContractId(g.notice_version) || !PD_DIGEST_RE.test(String(g.notice_digest || '')) || !PD_LOCALE_RE.test(String(g.notice_locale || ''))) return bad('invalid_governance_notice', 'decision.evidence.governance', 'Notice version, digest, and locale are required.');
  if (!isIsoDate(g.granted_at)) return bad('invalid_governance_date', 'decision.evidence.governance.granted_at', 'granted_at must be an RFC 3339 timestamp.');
  if (Date.parse(g.granted_at) > Date.parse(e.collected_at)) return bad('governance_after_evidence', 'decision.evidence.governance.granted_at', 'Governance must be granted before evidence collection.');
  if (!uniqueContractIds(g.scopes, 20) || !g.scopes.includes('credential-review') || g.scopes.some((scope) => !PD_GOVERNANCE_SCOPES.has(scope))) return bad('invalid_governance_scopes', 'decision.evidence.governance.scopes', 'Governance scopes must be unique, allowed, and include credential-review.');
  if (!isContractId(g.retention_policy_id) || !isContractId(g.legal_basis_record_id)) return bad('invalid_governance_policy', 'decision.evidence.governance', 'Retention-policy and legal-basis record IDs are required.');
  for (let i = 0; i < e.activity_results.length; i++) {
    if (!hasExactKeys(e.activity_results[i], ['activity_id', 'satisfied', 'evidence_refs'])) return bad('invalid_activity_result_shape', `decision.evidence.activity_results[${i}]`, 'Activity result keys must be exact.');
  }

  const a = d.accessibility_verification;
  if (!hasExactKeys(a, ['schema_version', 'module_id', 'module_version', 'content_digest', 'rendered_surface', 'environments', 'standard', 'level', 'status', 'verified_at', 'valid_through', 'reverify_on_change', 'status_url', 'automated', 'manual_review'])) return bad('invalid_accessibility_shape', 'decision.accessibility_verification', 'Accessibility verification keys must be exact.');
  const surface = a.rendered_surface;
  if (!hasExactKeys(surface, ['runtime_build_digest', 'renderer_digest', 'styles_digest', 'state_inventory_digest', 'component_library_version', 'process_scope', 'state_scope'])
    || !PD_DIGEST_RE.test(String(surface.runtime_build_digest || ''))
    || !PD_DIGEST_RE.test(String(surface.renderer_digest || ''))
    || !PD_DIGEST_RE.test(String(surface.styles_digest || ''))
    || !PD_DIGEST_RE.test(String(surface.state_inventory_digest || ''))
    || !isContractId(surface.component_library_version)
    || surface.process_scope !== 'full-process' || surface.state_scope !== 'all-states') {
    return bad('invalid_rendered_surface_binding', 'decision.accessibility_verification.rendered_surface', 'Rendered runtime, renderer, styles, state inventory, component library, and full-scope bindings are required.');
  }
  if (!Array.isArray(a.environments) || a.environments.length === 0 || a.environments.length > 20) return bad('accessibility_environments_required', 'decision.accessibility_verification.environments', '1-20 browser/assistive-technology environments are required.');
  const environmentKeys = [];
  for (let i = 0; i < a.environments.length; i++) {
    const environment = a.environments[i];
    if (!hasExactKeys(environment, ['browser', 'browser_version', 'platform', 'platform_version', 'assistive_technology', 'assistive_technology_version'])
      || Object.values(environment).some((value) => !isNonBlank(value, 100))) return bad('invalid_accessibility_environment', `decision.accessibility_verification.environments[${i}]`, 'Every environment must name browser, platform, and assistive-technology versions.');
    environmentKeys.push(pdCanonicalize(environment));
  }
  if (new Set(environmentKeys).size !== environmentKeys.length) return bad('duplicate_accessibility_environment', 'decision.accessibility_verification.environments', 'Accessibility environments must be unique.');

  if (!hasExactKeys(a.automated, ['completed', 'tools', 'blocking_issues', 'report_digest'])
    || !PD_DIGEST_RE.test(String(a.automated.report_digest || '')) || !Array.isArray(a.automated.tools)
    || a.automated.tools.length === 0 || a.automated.tools.length > 20) return bad('invalid_automated_accessibility_report', 'decision.accessibility_verification.automated', 'A versioned automated report digest and tools are required.');
  const toolKeys = [];
  for (let i = 0; i < a.automated.tools.length; i++) {
    const tool = a.automated.tools[i];
    if (!hasExactKeys(tool, ['name', 'version']) || !isNonBlank(tool.name, 100) || !isNonBlank(tool.version, 100)) return bad('invalid_automated_tool', `decision.accessibility_verification.automated.tools[${i}]`, 'Every automated tool needs a name and version.');
    toolKeys.push(tool.name + '\n' + tool.version);
  }
  if (new Set(toolKeys).size !== toolKeys.length) return bad('duplicate_automated_tool', 'decision.accessibility_verification.automated.tools', 'Automated tool/version pairs must be unique.');

  if (!hasExactKeys(a.manual_review, ['completed', 'result', 'reviewer_id', 'checklist_version', 'checklist_digest', 'report_digest', 'reviewed_at'])
    || !PD_DIGEST_RE.test(String(a.manual_review.checklist_digest || ''))
    || !PD_DIGEST_RE.test(String(a.manual_review.report_digest || ''))) return bad('invalid_manual_accessibility_report', 'decision.accessibility_verification.manual_review', 'Manual checklist and report digests are required.');
  if (!hasExactKeys(a.reverify_on_change, ['runtime_build', 'module_content'])
    || a.reverify_on_change.runtime_build !== true || a.reverify_on_change.module_content !== true) return bad('accessibility_reverification_required', 'decision.accessibility_verification.reverify_on_change', 'Runtime-build and module-content changes must require reverification.');
  if (!isHttpsUrl(a.status_url)) return bad('invalid_accessibility_status_url', 'decision.accessibility_verification.status_url', 'An authoritative HTTPS verification-status reference is required and may enforce access control.');
  if (!isIsoDate(a.valid_through)) return bad('invalid_accessibility_valid_through', 'decision.accessibility_verification.valid_through', 'valid_through must be an RFC 3339 timestamp.');
  const verifiedAt = Date.parse(a.verified_at); const validThrough = Date.parse(a.valid_through);
  if (validThrough <= verifiedAt || validThrough - verifiedAt > PD_MAX_ACCESSIBILITY_VALIDITY_MS) return bad('invalid_accessibility_validity_window', 'decision.accessibility_verification.valid_through', 'Accessibility validity must end after verification and within 366 days.');
  if (validThrough < nowMs) return bad('accessibility_verification_expired', 'decision.accessibility_verification.valid_through', 'Accessibility verification must be current at issuance.');
  return null;
}

function pdBuildReviewedCredentialPayload(d, issuerName, issuerId, issuerKeyId, credentialId, decisionDigest, nowISO) {
  const a = d.accessibility_verification; const surface = a.rendered_surface;
  return {
    schema_version: PD_REVIEWED_CREDENTIAL_SCHEMA,
    type: 'PdReviewedCompletionCredential', credential_profile: 'reviewed-evidence',
    issuer: { id: issuerId, name: issuerName || 'AlloFlow PD', keyId: issuerKeyId }, issuanceDate: nowISO,
    id: credentialId,
    credentialSubject: {
      id: d.learner.id,
      moduleId: d.module.id, moduleVersion: d.module.version, contentDigest: d.module.content_digest,
      moduleTitle: d.module.title, topic: d.module.topic, complete: true, completedAt: d.decided_at,
      achievement: { name: d.module.title, activitiesPassed: d.module.required_activity_ids.length, activitiesTotal: d.module.required_activity_ids.length },
    },
    review: {
      decisionId: d.decision_id, decisionDigest, status: d.status, decidedAt: d.decided_at,
      reviewer: { id: d.reviewer.id, name: d.reviewer.name, authority: d.reviewer.authority },
      provenance: { system: d.provenance.system, reviewRecordId: d.provenance.review_record_id },
    },
    evidence: {
      id: d.evidence.evidence_id, digest: d.evidence.evidence_digest, collectedAt: d.evidence.collected_at,
      learnerId: d.evidence.learner_id,
      store: {
        system: d.evidence.evidence_store.system,
        recordId: d.evidence.evidence_store.record_id,
        recordDigest: d.evidence.evidence_store.record_digest,
      },
      requirementsSatisfied: d.evidence.activity_results.length, requirementsTotal: d.module.required_activity_ids.length,
      activityIds: d.module.required_activity_ids.slice(),
    },
    governance: {
      recordId: d.evidence.governance.record_id,
      noticeVersion: d.evidence.governance.notice_version,
      noticeDigest: d.evidence.governance.notice_digest,
      noticeLocale: d.evidence.governance.notice_locale,
      grantedAt: d.evidence.governance.granted_at,
      scopes: d.evidence.governance.scopes.slice(),
      retentionPolicyId: d.evidence.governance.retention_policy_id,
      legalBasisRecordId: d.evidence.governance.legal_basis_record_id,
    },
    accessibilityVerification: {
      moduleId: a.module_id, moduleVersion: a.module_version, contentDigest: a.content_digest,
      standard: a.standard, level: a.level, status: a.status, verifiedAt: a.verified_at,
      validThrough: a.valid_through, statusUrl: a.status_url,
      renderedSurface: {
        runtimeBuildDigest: surface.runtime_build_digest,
        rendererDigest: surface.renderer_digest,
        stylesDigest: surface.styles_digest,
        stateInventoryDigest: surface.state_inventory_digest,
        componentLibraryVersion: surface.component_library_version,
        processScope: surface.process_scope, stateScope: surface.state_scope,
      },
      environments: a.environments.map((environment) => ({
        browser: environment.browser, browserVersion: environment.browser_version,
        platform: environment.platform, platformVersion: environment.platform_version,
        assistiveTechnology: environment.assistive_technology,
        assistiveTechnologyVersion: environment.assistive_technology_version,
      })),
      automated: {
        completed: true, blockingIssues: 0, reportDigest: a.automated.report_digest,
        tools: a.automated.tools.map((tool) => ({ name: tool.name, version: tool.version })),
      },
      manualReview: {
        completed: true, result: 'pass', reviewerId: a.manual_review.reviewer_id,
        checklistVersion: a.manual_review.checklist_version,
        checklistDigest: a.manual_review.checklist_digest,
        reportDigest: a.manual_review.report_digest, reviewedAt: a.manual_review.reviewed_at,
      },
      reverifyOnChange: { runtimeBuild: true, moduleContent: true },
      note: 'Verification is bound to the exact rendered runtime, module, states, reports, environments, and validity window. It is not a perpetual guarantee of WCAG conformance.',
    },
    attestation_note: 'Issuer-signed reviewed completion binding the approved decision, governed evidence, exact rendered accessibility scope, and immutable module version/content digest.',
  };
}
function aValue(d, field) { return d.accessibility_verification[field]; }

function validateLegacySelfPacedRecord(record) {
  if (!isObject(record)) return issueContractError('record_required', 'record', 'record (a self-paced completion record) is required.', 400);
  if (record.complete !== true) return issueContractError('record_incomplete', 'record.complete', 'Only a completed record can be issued.', 422);
  if (!isNonBlank(record.moduleId, 100) || !PD_MODULE_ID_RE.test(record.moduleId)) return issueContractError('invalid_module_id', 'record.moduleId', 'record.moduleId must be a stable lowercase slug.', 422);
  if (!isContractId(record.moduleVersion)) return issueContractError('invalid_module_version', 'record.moduleVersion', 'Self-paced attestation requires a stable moduleVersion.', 422);
  if (!PD_DIGEST_RE.test(String(record.contentDigest || ''))) return issueContractError('invalid_content_digest', 'record.contentDigest', 'Self-paced attestation requires an exact sha256 contentDigest.', 422);
  if (!Array.isArray(record.perActivity) || record.perActivity.length === 0 || record.perActivity.some((activity) => !isObject(activity) || activity.passed !== true)) return issueContractError('activity_requirements_not_satisfied', 'record.perActivity', 'Every self-paced activity must be present and passed.', 422);
  return null;
}
function pdBuildSelfPacedCredentialPayload(record, issuerName, issuerId, issuerKeyId, nowISO) {
  const per = record.perActivity;
  return {
    schema_version: 'pd-credential-1.0', type: 'PdSelfPacedCompletionAttestation', credential_profile: 'self-paced-non-institutional',
    issuer: { id: issuerId || 'urn:alloflow:pd:self-paced', name: issuerName || 'AlloFlow PD Self-Paced', keyId: issuerKeyId }, issuanceDate: nowISO,
    credentialSubject: {
      name: (record.learner && record.learner.name) || null, moduleId: record.moduleId,
      moduleVersion: record.moduleVersion, contentDigest: record.contentDigest,
      moduleTitle: record.moduleTitle || null, topic: record.topic || null, complete: true, completedAt: record.completedAt || null,
      achievement: { name: record.moduleTitle || record.moduleId, moduleVersion: record.moduleVersion, contentDigest: record.contentDigest, activitiesPassed: per.filter((activity) => activity.passed).length, activitiesTotal: per.length },
    },
    assurance: { reviewed: false, institutional: false, level: 'self-paced' },
    attestation_note: 'Issuer-signed self-paced record only. It is learner-controlled, NOT institutionally reviewed, proctored, accredited, or contact-hour-bearing, and must not be represented as an institutional credential.',
  };
}
async function signPdPayload(payload, privateKeyB64) {
  const key = await crypto.subtle.importKey('pkcs8', b64ToBuf(privateKeyB64), { name: 'Ed25519' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'Ed25519' }, key, new TextEncoder().encode(pdCanonicalize(payload)));
  return bufToB64(sig);
}
async function verifyPdPayloadSignature(payload, signature, publicKeyB64) {
  const key = await crypto.subtle.importKey('spki', b64ToBuf(publicKeyB64), { name: 'Ed25519' }, false, ['verify']);
  return crypto.subtle.verify({ name: 'Ed25519' }, key, b64ToBuf(signature), new TextEncoder().encode(pdCanonicalize(payload)));
}
function pdReviewedKeyConfig(env) {
  const currentKeyId = env.PD_ISSUER_KEY_ID || 'alloflow-pd-1';
  if (!isContractId(currentKeyId) || !isNonBlank(env.PD_ISSUER_PUBLIC_KEY, 10000)) return { ok: false, error: 'Reviewed public-key configuration is incomplete.' };
  const keys = new Map([[currentKeyId, env.PD_ISSUER_PUBLIC_KEY]]);
  if (env.PD_ISSUER_PUBLIC_KEYS_JSON != null && String(env.PD_ISSUER_PUBLIC_KEYS_JSON).trim() !== '') {
    let historical;
    try { historical = JSON.parse(String(env.PD_ISSUER_PUBLIC_KEYS_JSON)); }
    catch (_) { return { ok: false, error: 'PD_ISSUER_PUBLIC_KEYS_JSON is invalid JSON.' }; }
    if (!Array.isArray(historical) || historical.length > 9) return { ok: false, error: 'PD_ISSUER_PUBLIC_KEYS_JSON must contain at most nine historical keys.' };
    for (let i = 0; i < historical.length; i++) {
      const entry = historical[i];
      if (!hasExactKeys(entry, ['key_id', 'public_key_spki_b64']) || !isContractId(entry.key_id) || !isNonBlank(entry.public_key_spki_b64, 10000) || keys.has(entry.key_id)) {
        return { ok: false, error: 'Reviewed public-key IDs must be unique, stable, and bounded.' };
      }
      keys.set(entry.key_id, entry.public_key_spki_b64);
    }
  }
  return { ok: true, currentKeyId, keys };
}

async function validateReviewedCredential(cred, env, nowMs = Date.now(), suppliedKeyConfig) {
  const invalid = (error) => ({ ok: false, error });
  if (!hasExactKeys(cred, ['schema_version', 'payload', 'signature', 'alg', 'key_id', 'public_key_spki_b64'])) return invalid('Credential wrapper keys are invalid.');
  if (cred.schema_version !== PD_REVIEWED_CREDENTIAL_SCHEMA || cred.alg !== 'Ed25519') return invalid('Credential wrapper schema or algorithm is invalid.');
  if (!isNonBlank(cred.signature, 1000)) return invalid('Credential signature is invalid.');
  const p = cred.payload;
  if (!hasExactKeys(p, ['schema_version', 'type', 'credential_profile', 'issuer', 'issuanceDate', 'id', 'credentialSubject', 'review', 'evidence', 'governance', 'accessibilityVerification', 'attestation_note'])) return invalid('Reviewed credential payload keys are invalid.');
  if (p.schema_version !== PD_REVIEWED_CREDENTIAL_SCHEMA || p.type !== 'PdReviewedCompletionCredential' || p.credential_profile !== 'reviewed-evidence') return invalid('Reviewed credential schema, type, or profile is invalid.');

  const keyConfig = suppliedKeyConfig || pdReviewedKeyConfig(env);
  if (!keyConfig.ok) return invalid(keyConfig.error);
  if (!hasExactKeys(p.issuer, ['id', 'name', 'keyId']) || p.issuer.id !== env.PD_ISSUER_ID || !isNonBlank(p.issuer.name, 200)
    || p.issuer.keyId !== cred.key_id || !keyConfig.keys.has(cred.key_id)) return invalid('Issuer identity or key binding is invalid.');
  const publicKey = keyConfig.keys.get(cred.key_id);
  if (cred.public_key_spki_b64 !== publicKey) return invalid('Credential public-key metadata does not match the trusted key.');

  if (!hasExactKeys(p.review, ['decisionId', 'decisionDigest', 'status', 'decidedAt', 'reviewer', 'provenance'])
    || !isContractId(p.review.decisionId) || !PD_DIGEST_RE.test(String(p.review.decisionDigest || ''))
    || p.review.status !== 'approved' || !isIsoDate(p.review.decidedAt)
    || !hasExactKeys(p.review.reviewer, ['id', 'name', 'authority']) || !isContractId(p.review.reviewer.id)
    || !isNonBlank(p.review.reviewer.name, 200) || !isNonBlank(p.review.reviewer.authority, 200)
    || !hasExactKeys(p.review.provenance, ['system', 'reviewRecordId']) || !isNonBlank(p.review.provenance.system, 200)
    || !isContractId(p.review.provenance.reviewRecordId)) return invalid('Reviewed decision binding is invalid.');

  const identityHash = await pdSha256Hex(env.PD_ISSUER_ID + '\n' + p.review.decisionId);
  if (p.id !== 'urn:alloflow:pd:credential:sha256:' + identityHash) return invalid('Credential ID is not deterministic for this issuer and decision.');

  const s = p.credentialSubject;
  if (!hasExactKeys(s, ['id', 'moduleId', 'moduleVersion', 'contentDigest', 'moduleTitle', 'topic', 'complete', 'completedAt', 'achievement'])
    || !isContractId(s.id) || !isNonBlank(s.moduleId, 128) || !PD_AUTHORING_ID_RE.test(s.moduleId) || !isContractId(s.moduleVersion)
    || !PD_DIGEST_RE.test(String(s.contentDigest || '')) || !isNonBlank(s.moduleTitle, 200)
    || (s.topic !== null && !isNonBlank(s.topic, 200)) || s.complete !== true || s.completedAt !== p.review.decidedAt
    || !hasExactKeys(s.achievement, ['name', 'activitiesPassed', 'activitiesTotal']) || s.achievement.name !== s.moduleTitle) return invalid('Credential subject or module binding is invalid.');

  const evidence = p.evidence;
  if (!hasExactKeys(evidence, ['id', 'digest', 'collectedAt', 'learnerId', 'store', 'requirementsSatisfied', 'requirementsTotal', 'activityIds'])
    || !isContractId(evidence.id) || !PD_DIGEST_RE.test(String(evidence.digest || '')) || !isIsoDate(evidence.collectedAt)
    || evidence.learnerId !== s.id || !hasExactKeys(evidence.store, ['system', 'recordId', 'recordDigest'])
    || !isNonBlank(evidence.store.system, 200) || !isContractId(evidence.store.recordId)
    || !PD_DIGEST_RE.test(String(evidence.store.recordDigest || '')) || String(evidence.store.recordDigest).toLowerCase() === String(evidence.digest).toLowerCase() || !uniqueContractIds(evidence.activityIds, 500)
    || !Number.isInteger(evidence.requirementsSatisfied) || !Number.isInteger(evidence.requirementsTotal)
    || evidence.requirementsSatisfied !== evidence.requirementsTotal || evidence.requirementsTotal !== evidence.activityIds.length
    || s.achievement.activitiesPassed !== evidence.requirementsSatisfied || s.achievement.activitiesTotal !== evidence.requirementsTotal) return invalid('Signed evidence binding is invalid.');

  const governance = p.governance;
  if (!hasExactKeys(governance, ['recordId', 'noticeVersion', 'noticeDigest', 'noticeLocale', 'grantedAt', 'scopes', 'retentionPolicyId', 'legalBasisRecordId'])
    || !isContractId(governance.recordId) || !isContractId(governance.noticeVersion)
    || !PD_DIGEST_RE.test(String(governance.noticeDigest || '')) || !PD_LOCALE_RE.test(String(governance.noticeLocale || ''))
    || !isIsoDate(governance.grantedAt) || !uniqueContractIds(governance.scopes, 20) || !governance.scopes.includes('credential-review') || governance.scopes.some((scope) => !PD_GOVERNANCE_SCOPES.has(scope))
    || !isContractId(governance.retentionPolicyId) || !isContractId(governance.legalBasisRecordId)) return invalid('Signed governance binding is invalid.');

  const a = p.accessibilityVerification;
  if (!hasExactKeys(a, ['moduleId', 'moduleVersion', 'contentDigest', 'standard', 'level', 'status', 'verifiedAt', 'validThrough', 'statusUrl', 'renderedSurface', 'environments', 'automated', 'manualReview', 'reverifyOnChange', 'note'])
    || a.moduleId !== s.moduleId || a.moduleVersion !== s.moduleVersion || a.contentDigest !== s.contentDigest
    || a.standard !== 'WCAG 2.2' || a.level !== 'AA' || a.status !== 'verified'
    || !isIsoDate(a.verifiedAt) || !isIsoDate(a.validThrough) || !isHttpsUrl(a.statusUrl) || !isNonBlank(a.note, 1000)) return invalid('Signed accessibility binding is invalid.');
  const surface = a.renderedSurface;
  if (!hasExactKeys(surface, ['runtimeBuildDigest', 'rendererDigest', 'stylesDigest', 'stateInventoryDigest', 'componentLibraryVersion', 'processScope', 'stateScope'])
    || !PD_DIGEST_RE.test(String(surface.runtimeBuildDigest || '')) || !PD_DIGEST_RE.test(String(surface.rendererDigest || ''))
    || !PD_DIGEST_RE.test(String(surface.stylesDigest || '')) || !PD_DIGEST_RE.test(String(surface.stateInventoryDigest || ''))
    || !isContractId(surface.componentLibraryVersion) || surface.processScope !== 'full-process' || surface.stateScope !== 'all-states') return invalid('Signed rendered-surface binding is invalid.');

  if (!Array.isArray(a.environments) || a.environments.length === 0 || a.environments.length > 20) return invalid('Signed accessibility environments are invalid.');
  const environments = [];
  for (let i = 0; i < a.environments.length; i++) {
    const environment = a.environments[i];
    if (!hasExactKeys(environment, ['browser', 'browserVersion', 'platform', 'platformVersion', 'assistiveTechnology', 'assistiveTechnologyVersion'])
      || Object.values(environment).some((value) => !isNonBlank(value, 100))) return invalid('Signed accessibility environment is invalid.');
    environments.push(pdCanonicalize(environment));
  }
  if (new Set(environments).size !== environments.length) return invalid('Signed accessibility environments are duplicated.');

  if (!hasExactKeys(a.automated, ['completed', 'blockingIssues', 'reportDigest', 'tools']) || a.automated.completed !== true
    || a.automated.blockingIssues !== 0 || !PD_DIGEST_RE.test(String(a.automated.reportDigest || ''))
    || !Array.isArray(a.automated.tools) || a.automated.tools.length === 0 || a.automated.tools.length > 20) return invalid('Signed automated accessibility report is invalid.');
  const tools = [];
  for (let i = 0; i < a.automated.tools.length; i++) {
    const tool = a.automated.tools[i];
    if (!hasExactKeys(tool, ['name', 'version']) || !isNonBlank(tool.name, 100) || !isNonBlank(tool.version, 100)) return invalid('Signed automated tool is invalid.');
    tools.push(tool.name + '\n' + tool.version);
  }
  if (new Set(tools).size !== tools.length) return invalid('Signed automated tools are duplicated.');

  const manual = a.manualReview;
  if (!hasExactKeys(manual, ['completed', 'result', 'reviewerId', 'checklistVersion', 'checklistDigest', 'reportDigest', 'reviewedAt'])
    || manual.completed !== true || manual.result !== 'pass' || !isContractId(manual.reviewerId)
    || !isContractId(manual.checklistVersion) || !PD_DIGEST_RE.test(String(manual.checklistDigest || ''))
    || !PD_DIGEST_RE.test(String(manual.reportDigest || '')) || !isIsoDate(manual.reviewedAt)) return invalid('Signed manual accessibility report is invalid.');
  if (!hasExactKeys(a.reverifyOnChange, ['runtimeBuild', 'moduleContent']) || a.reverifyOnChange.runtimeBuild !== true || a.reverifyOnChange.moduleContent !== true) return invalid('Signed accessibility reverification policy is invalid.');

  if (!isIsoDate(p.issuanceDate) || Date.parse(p.review.decidedAt) > Date.parse(p.issuanceDate)
    || Date.parse(p.issuanceDate) > nowMs + PD_FUTURE_SKEW_MS
    || Date.parse(evidence.collectedAt) > Date.parse(p.review.decidedAt)
    || Date.parse(governance.grantedAt) > Date.parse(evidence.collectedAt)
    || Date.parse(manual.reviewedAt) > Date.parse(a.verifiedAt)
    || Date.parse(a.verifiedAt) > Date.parse(p.review.decidedAt)) return invalid('Credential chronology is invalid.');
  const verifiedAt = Date.parse(a.verifiedAt); const validThrough = Date.parse(a.validThrough);
  if (validThrough <= verifiedAt || validThrough - verifiedAt > PD_MAX_ACCESSIBILITY_VALIDITY_MS
    || validThrough < Date.parse(p.issuanceDate)) return invalid('Credential accessibility verification window is invalid for its issuance date.');
  if (!isNonBlank(p.attestation_note, 1000)) return invalid('Credential attestation note is invalid.');
  return { ok: true, keyId: cred.key_id, publicKey, accessibilityCurrent: nowMs <= validThrough };
}


async function pdReviewedIssuanceBinding(issuerId, decision) {
  const identityHash = await pdSha256Hex(issuerId + '\n' + decision.decision_id);
  return {
    decisionDigest: 'sha256:' + await pdSha256Hex(pdCanonicalize(decision)),
    ledgerKey: 'reviewed/' + identityHash + '.json',
    credentialId: 'urn:alloflow:pd:credential:sha256:' + identityHash,
  };
}

async function pdReadIssuanceLedger(bucket, key) {
  let object, raw;
  try {
    object = await bucket.get(key);
    if (!object) return { state: 'missing' };
    if (typeof object.text !== 'function') return { state: 'corrupt' };
    raw = await object.text();
  } catch (_) { return { state: 'unavailable' }; }
  try { return { state: 'found', record: JSON.parse(raw) }; }
  catch (_) { return { state: 'corrupt' }; }
}

function pdIssuanceLedgerFailure(state) {
  if (state === 'unavailable') return jsonResponse({ ok: false, error: 'Reviewed issuance ledger is unavailable.', code: 'issuance_ledger_unavailable' }, 503);
  return jsonResponse({ ok: false, error: 'Reviewed issuance ledger record is corrupt.', code: 'issuance_ledger_corrupt' }, 500);
}

async function pdIssuanceLedgerRecordValid(record, expected, env, keyConfig) {
  if (!isObject(record) || record.schema_version !== PD_ISSUANCE_LEDGER_SCHEMA
    || record.issuer_id !== expected.issuerId || record.decision_id !== expected.decisionId
    || !PD_DIGEST_RE.test(String(record.decision_digest || ''))
    || record.credential_id !== expected.credentialId || !isIsoDate(record.issued_at)
    || !isObject(record.credential) || !isObject(record.credential.payload)
    || record.credential.schema_version !== record.credential.payload.schema_version
    || record.credential.payload.id !== expected.credentialId
    || !isObject(record.credential.payload.issuer)
    || record.credential.payload.issuer.id !== expected.issuerId
    || record.credential.payload.issuanceDate !== record.issued_at
    || !isObject(record.credential.payload.review)
    || record.credential.payload.review.decisionId !== expected.decisionId
    || record.credential.payload.review.decisionDigest !== record.decision_digest
    || !isNonBlank(record.credential.signature, 1000)) return false;
  let validation;
  try { validation = await validateReviewedCredential(record.credential, env, Date.now(), keyConfig); }
  catch (_) { return false; }
  if (!validation.ok) return false;
  try { return await verifyPdPayloadSignature(record.credential.payload, record.credential.signature, validation.publicKey); }
  catch (_) { return false; }
}

async function pdExistingIssuanceResponse(read, expected, decisionDigest, env, keyConfig) {
  if (read.state === 'missing') return null;
  if (read.state !== 'found') return pdIssuanceLedgerFailure(read.state);
  if (!(await pdIssuanceLedgerRecordValid(read.record, expected, env, keyConfig))) return pdIssuanceLedgerFailure('corrupt');
  if (read.record.decision_digest !== decisionDigest) {
    return jsonResponse({ ok: false, error: 'decision_id was already used for a different reviewed decision.', code: 'decision_id_conflict' }, 409);
  }
  return jsonResponse({ ok: true, idempotent_replay: true, credential: read.record.credential }, 200);
}

async function handlePdIssue(request, env) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return jsonResponse({ ok: false, error: 'Content-Type must be application/json.' }, 415);
  const rawBody = await request.text();
  if (bodyTooLarge(rawBody)) return jsonResponse({ ok: false, error: `Body exceeds ${MAX_BODY_BYTES} bytes.` }, 413);
  let p;
  try { p = JSON.parse(rawBody); } catch (err) { return jsonResponse({ ok: false, error: 'Invalid JSON: ' + err.message }, 400); }

  let payload, signingPrivateKey, signingPublicKey, keyId, reviewedIssuance = null;
  if (isObject(p) && p.decision != null) {
    if (!env.PD_ISSUER_AUTH_TOKEN) return jsonResponse({ ok: false, error: 'Reviewed credential issuance is disabled: configure PD_ISSUER_AUTH_TOKEN.' }, 501);
    if (!env.PD_ISSUER_PRIVATE_KEY || !env.PD_ISSUER_PUBLIC_KEY) return jsonResponse({ ok: false, error: 'Reviewed credential issuance requires both issuer signing keys.' }, 501);
    if (!isNonBlank(env.PD_ISSUER_ID, 500)) return jsonResponse({ ok: false, error: 'Reviewed credential issuance requires PD_ISSUER_ID.' }, 501);
    if (!env.PD_ISSUANCE_LEDGER || typeof env.PD_ISSUANCE_LEDGER.get !== 'function' || typeof env.PD_ISSUANCE_LEDGER.put !== 'function') {
      return jsonResponse({ ok: false, error: 'Reviewed credential issuance requires the private PD_ISSUANCE_LEDGER R2 binding.', code: 'issuance_ledger_required' }, 501);
    }
    const match = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
    if (!match || !(await timingSafeTokenEq(match[1], env.PD_ISSUER_AUTH_TOKEN))) return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
    const keyConfig = pdReviewedKeyConfig(env);
    if (!keyConfig.ok) return jsonResponse({ ok: false, error: keyConfig.error, code: 'reviewed_key_configuration_invalid' }, 501);
    const err = validateReviewedDecision(p.decision);
    if (err) return jsonResponse({ ok: false, error: err.message, code: err.code, path: err.path }, err.status);

    keyId = keyConfig.currentKeyId;
    let binding;
    try { binding = await pdReviewedIssuanceBinding(env.PD_ISSUER_ID, p.decision); }
    catch (_) { return jsonResponse({ ok: false, error: 'Could not derive the reviewed issuance binding.', code: 'issuance_binding_failed' }, 500); }
    const expected = {
      issuerId: env.PD_ISSUER_ID, decisionId: p.decision.decision_id,
      credentialId: binding.credentialId,
    };
    const existing = await pdReadIssuanceLedger(env.PD_ISSUANCE_LEDGER, binding.ledgerKey);
    const existingResponse = await pdExistingIssuanceResponse(existing, expected, binding.decisionDigest, env, keyConfig);
    if (existingResponse) return existingResponse;

    payload = pdBuildReviewedCredentialPayload(
      p.decision, env.PD_ISSUER_NAME || 'AlloFlow PD', env.PD_ISSUER_ID,
      keyId, binding.credentialId, binding.decisionDigest, new Date().toISOString()
    );
    signingPrivateKey = env.PD_ISSUER_PRIVATE_KEY;
    signingPublicKey = env.PD_ISSUER_PUBLIC_KEY;
    reviewedIssuance = { binding, expected, keyConfig };
  } else if (isObject(p) && p.record != null) {
    if (String(env.PD_ALLOW_SELF_PACED_ISSUANCE || '').toLowerCase() !== 'true') return jsonResponse({ ok: false, error: 'Legacy self-paced issuance is disabled.', code: 'legacy_self_paced_disabled' }, 403);
    if (!env.PD_SELF_PACED_PRIVATE_KEY || !env.PD_SELF_PACED_PUBLIC_KEY) return jsonResponse({ ok: false, error: 'Self-paced signing requires separate PD_SELF_PACED_PRIVATE_KEY and PD_SELF_PACED_PUBLIC_KEY values.' }, 501);
    const err = validateLegacySelfPacedRecord(p.record);
    if (err) return jsonResponse({ ok: false, error: err.message, code: err.code, path: err.path }, err.status);
    keyId = env.PD_SELF_PACED_KEY_ID || 'alloflow-pd-self-paced-1';
    payload = pdBuildSelfPacedCredentialPayload(p.record, env.PD_SELF_PACED_ISSUER_NAME, env.PD_SELF_PACED_ISSUER_ID, keyId, new Date().toISOString());
    signingPrivateKey = env.PD_SELF_PACED_PRIVATE_KEY;
    signingPublicKey = env.PD_SELF_PACED_PUBLIC_KEY;
  } else return jsonResponse({ ok: false, error: 'decision (reviewed issuance) is required.', code: 'reviewed_decision_required' }, 400);

  let signature, keyPairValid;
  try {
    signature = await signPdPayload(payload, signingPrivateKey);
    keyPairValid = await verifyPdPayloadSignature(payload, signature, signingPublicKey);
  }
  catch (_) { return jsonResponse({ ok: false, error: 'Signing failed.' }, 500); }
  if (!keyPairValid) return jsonResponse({ ok: false, error: 'Issuer signing/public key configuration mismatch.' }, 500);
  const credential = {
    schema_version: payload.schema_version, payload, signature, alg: 'Ed25519',
    key_id: keyId, public_key_spki_b64: signingPublicKey,
  };
  if (!reviewedIssuance) return jsonResponse({ ok: true, credential }, 201);
  let issuedValidation;
  try { issuedValidation = await validateReviewedCredential(credential, env, Date.now(), reviewedIssuance.keyConfig); }
  catch (_) { issuedValidation = { ok: false }; }
  if (!issuedValidation.ok) {
    return jsonResponse({ ok: false, error: 'The generated credential failed the reviewed credential contract.', code: 'issued_credential_invalid' }, 500);
  }

  const ledgerRecord = {
    schema_version: PD_ISSUANCE_LEDGER_SCHEMA,
    issuer_id: reviewedIssuance.expected.issuerId,
    decision_id: reviewedIssuance.expected.decisionId,
    decision_digest: reviewedIssuance.binding.decisionDigest,
    credential_id: reviewedIssuance.expected.credentialId,
    issued_at: payload.issuanceDate,
    credential,
  };
  let stored;
  try {
    stored = await env.PD_ISSUANCE_LEDGER.put(
      reviewedIssuance.binding.ledgerKey,
      JSON.stringify(ledgerRecord),
      { onlyIf: { etagDoesNotMatch: '*' } }
    );
  } catch (_) { return pdIssuanceLedgerFailure('unavailable'); }

  if (!stored) {
    const winner = await pdReadIssuanceLedger(env.PD_ISSUANCE_LEDGER, reviewedIssuance.binding.ledgerKey);
    const winnerResponse = await pdExistingIssuanceResponse(
      winner, reviewedIssuance.expected, reviewedIssuance.binding.decisionDigest, env, reviewedIssuance.keyConfig
    );
    return winnerResponse || pdIssuanceLedgerFailure('unavailable');
  }
  return jsonResponse({ ok: true, idempotent_replay: false, credential }, 201);
}
function handlePdIssuerKey(env) {
  if (!env.PD_ISSUER_PUBLIC_KEY) return jsonResponse({ ok: false, error: 'No issuer public key configured.' }, 501);
  return jsonResponse({ ok: true, alg: 'Ed25519', key_id: env.PD_ISSUER_KEY_ID || 'alloflow-pd-1', public_key_spki_b64: env.PD_ISSUER_PUBLIC_KEY });
}

async function handlePdVerify(request, env) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return jsonResponse({ ok: false, error: 'Content-Type must be application/json.' }, 415);
  const rawBody = await request.text();
  if (bodyTooLarge(rawBody)) return jsonResponse({ ok: false, error: `Body exceeds ${MAX_BODY_BYTES} bytes.` }, 413);
  let cred;
  const noAssurance = { reviewed: false, institutional: false };
  const invalid = (profile, reason, status = 200, error) => jsonResponse({
    ok: status < 400, valid: false, credential_profile: profile || null, assurance: noAssurance,
    ...(reason ? { reason } : {}), ...(error ? { error } : {}),
  }, status);
  try { const p = JSON.parse(rawBody); cred = (p && p.credential) || p; }
  catch (err) { return invalid(null, 'invalid_json', 400, 'Invalid JSON: ' + err.message); }
  if (!isObject(cred) || !isObject(cred.payload) || !isNonBlank(cred.signature, 1000)) {
    return invalid(null, 'malformed_credential', 400, 'credential {payload, signature} required.');
  }

  const profile = cred.payload.credential_profile;
  if (profile === 'reviewed-evidence') {
    const keyConfig = pdReviewedKeyConfig(env);
    if (!keyConfig.ok) return invalid(profile, 'trusted_key_configuration_invalid', 501, keyConfig.error);
    let validation;
    try { validation = await validateReviewedCredential(cred, env, Date.now(), keyConfig); }
    catch (_) { validation = { ok: false }; }
    if (!validation.ok) return invalid(profile, 'credential_contract_invalid');
    let valid = false;
    try { valid = await verifyPdPayloadSignature(cred.payload, cred.signature, validation.publicKey); }
    catch (_) { return invalid(profile, 'signature_verification_error'); }
    if (!valid) return invalid(profile, 'invalid_signature');
    return jsonResponse({
      ok: true, valid: true, credential_profile: profile,
      assurance: { reviewed: true, institutional: true },
      accessibility_current: validation.accessibilityCurrent,
    });
  }

  if (profile !== 'self-paced-non-institutional') return invalid(profile, 'unsupported_credential_profile', 400, 'Unsupported credential profile.');
  const trustedPublicKey = env.PD_SELF_PACED_PUBLIC_KEY;
  const expectedKeyId = env.PD_SELF_PACED_KEY_ID || 'alloflow-pd-self-paced-1';
  if (!trustedPublicKey) return invalid(profile, 'trusted_key_not_configured', 501, 'No trusted public key is configured for this credential profile.');
  const signedKeyId = isObject(cred.payload.issuer) ? cred.payload.issuer.keyId : null;
  if (cred.alg !== 'Ed25519' || cred.schema_version !== cred.payload.schema_version
    || cred.key_id !== expectedKeyId || signedKeyId !== expectedKeyId || cred.key_id !== signedKeyId
    || cred.public_key_spki_b64 !== trustedPublicKey) return invalid(profile, 'credential_contract_invalid');
  let valid = false;
  try {
    valid = await verifyPdPayloadSignature(cred.payload, cred.signature, trustedPublicKey);
  } catch (_) {
    return invalid(profile, 'signature_verification_error');
  }
  return jsonResponse({ ok: true, valid, credential_profile: profile, assurance: noAssurance });
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

    if (request.method === 'POST' && url.pathname === '/submitItemCorrection') {
      return handleItemCorrectionSubmit(request, env);
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

    if (request.method === 'GET' && url.pathname === '/pdSubmissions') {
      return handlePdList(request, env, url);
    }

    if (request.method === 'POST' && url.pathname === '/submitPlugin') {
      return handlePluginSubmit(request, env);
    }

    if (request.method === 'GET' && url.pathname === '/pluginSubmissions') {
      return handlePluginList(request, env, url);
    }

    if (request.method === 'POST' && url.pathname === '/issuePd') {
      return handlePdIssue(request, env);
    }

    if (request.method === 'GET' && url.pathname === '/pdIssuerKey') {
      return handlePdIssuerKey(env);
    }

    if (request.method === 'POST' && url.pathname === '/verifyPd') {
      return handlePdVerify(request, env);
    }

    if (request.method !== 'POST' || url.pathname !== '/submit') {
      return jsonResponse({ ok: false, error: 'Use POST /submit, /submitTranslation, /submitItemCorrection, /submitBug, /submitPd, /submitPlugin, or /issuePd' }, 405);
    }

    if (!env.GITHUB_PAT) {
      return jsonResponse({ ok: false, error: 'Server misconfigured: missing GITHUB_PAT secret.' }, 500);
    }

    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonResponse({ ok: false, error: 'Content-Type must be application/json.' }, 415);
    }

    const rawBody = await request.text();
    if (bodyTooLarge(rawBody)) {
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
