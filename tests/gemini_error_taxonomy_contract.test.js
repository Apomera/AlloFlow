// Cross-module error-taxonomy CONTRACT (deep dive 2026-07-09, goldens follow-on).
//
// H2 existed because this contract lived in two files that drifted apart: gemini_api's
// _throwClassified REWRITES quota-class errors to the 'API_QUOTA_EXHAUSTED' sentinel, while
// doc_pipeline's _isThrottleErr still pattern-matched the raw '429'/'RESOURCE_EXHAUSTED' strings the
// sentinel had replaced — so 429 storms silently bypassed the breaker, defer-and-revisit, and the
// circle-back. This suite runs BOTH real halves (extracted from source) against one table of raw
// error shapes and asserts every row lands on the intended treatment. A change on either side that
// re-opens the gap fails a row here.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gem = readFileSync(resolve(process.cwd(), 'gemini_api_source.jsx'), 'utf8');
const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── Extract the REAL classifier + thrower from gemini_api ──
const clsStart = gem.indexOf('const _classifyGeminiError = (err) => {');
const clsEnd = gem.indexOf("return { kind: 'other', userMessage: msg || 'Unknown Gemini API error.', model: null };", clsStart);
const clsTail = gem.indexOf('\n    };', clsEnd) + 7; // the FUNCTION's close, not the return object's
// _isCanvasEnv is only consulted for user-facing WORDING inside the auth branch — kind is env-free.
const _classifyGeminiError = new Function('_isCanvasEnv', gem.slice(clsStart, clsTail) + '\nreturn _classifyGeminiError;')(false);

const twStart = gem.indexOf('const _throwClassified = (err) => {');
const twEnd = gem.indexOf('\n    };', twStart) + 7;
const mkThrower = new Function('_classifyGeminiError', '_showQuotaBanner', '_isCanvasEnv',
  gem.slice(twStart, twEnd) + '\nreturn _throwClassified;');

// ── Extract the REAL pipeline predicates ──
const btStart = dp.indexOf('var _isBurstQuotaErr = function (e) {');
const btEnd = dp.indexOf('// Per-attempt gated call with breaker-aware retry.', btStart);
const { _isBurstQuotaErr, _isThrottleErr } = new Function(dp.slice(btStart, btEnd) + '\nreturn { _isBurstQuotaErr, _isThrottleErr };')();

// ── Extract _geminiCall's REAL permanence decision (the classification → retry-path table) ──
// Anchor inside _geminiCall: the file also carries a DEAD legacy copy of this expression in the
// zero-call-site _withRetry fossil (verified 2026-07-09 — grep its name: definition only), which
// lacks the H2 burst-quota routing. Slicing THAT would test dead code.
const gcStart = dp.indexOf('var _geminiCall = function(fn, initialMs, retryMs, label, onTransportStart) {');
if (gcStart < 0) throw new Error('anchor missed _geminiCall — an indexOf(-1) fallthrough would slice the dead _withRetry fossil below');
const pmStart = dp.indexOf('var isPermanent = err && (err.isAuth', gcStart);
const pmEnd = dp.indexOf('if (isPermanent) {', pmStart);
const decide = new Function('err', '_isBurstQuotaErr',
  dp.slice(pmStart, pmEnd) + '\nreturn { isPermanent, canvasAuthRetry: _canvasAuthRetry, burstQuota: _burstQuota };');

// Run a raw error through the classifier + thrower (Canvas or not) and capture the thrown object —
// exactly what doc_pipeline's catch sees.
const thrown = (rawMessage, { canvas = false } = {}) => {
  const thrower = mkThrower(_classifyGeminiError, () => {}, canvas);
  try { thrower(new Error(rawMessage)); } catch (e) { return e; }
  throw new Error('thrower did not throw');
};

// ── The contract table ──────────────────────────────────────────────────────────────────────────
// For each raw manifestation: what the pipeline must conclude. `throttle` drives defer-and-revisit +
// circle-back attribution; `permanent` means _geminiCall skips retries; `retryPath` means the
// breaker+jittered-backoff treatment (canvasAuthRetry after the burst-quota routing).
const TABLE = [
  { name: '429 per-minute burst', raw: 'HTTP 429: rate limit exceeded, 15 requests per minute', kind: 'quota', throttle: true, permanent: false, retryPath: true },
  { name: '429 per-day quota', raw: 'HTTP 429: quota exceeded, daily limit reached', kind: 'quota', throttle: false, permanent: true, retryPath: false },
  { name: '429 ambiguous', raw: 'HTTP 429: Too Many Requests', kind: 'quota', throttle: true, permanent: false, retryPath: true },
  { name: '403 quota-worded', raw: 'HTTP 403: request rejected, quota check failed', kind: 'quota', throttle: true, permanent: false, retryPath: true },
  { name: 'Canvas 401 (proxy throttle)', raw: 'HTTP 401: UNAUTHENTICATED', canvas: true, kind: 'auth', throttle: true, permanent: false, retryPath: true },
  // Non-Canvas 401: permanent (a real key problem) — but note it still reads as "throttle" to the
  // defer layer via the API_AUTH_FAILED sentinel in the regex; the chunk gets ONE revisit after the
  // drain pause, which is harmless and predates H2. Documented, not accidental.
  { name: 'non-Canvas 401 (real key problem)', raw: 'HTTP 401: API key not valid', canvas: false, kind: 'auth', throttle: true, permanent: true, retryPath: false },
  { name: '404 model config', raw: 'HTTP 404: models/gemini-nope is not found for API version', kind: 'config', throttle: false, permanent: true, retryPath: false },
];

describe('gemini_api ↔ doc_pipeline error-taxonomy contract (the H2 gap, executable)', () => {
  for (const row of TABLE) {
    it(row.name + ' → kind=' + row.kind + ', throttle=' + row.throttle + ', permanent=' + row.permanent, () => {
      const cls = _classifyGeminiError(new Error(row.raw));
      expect(cls.kind, 'classifier kind').toBe(row.kind);
      const err = thrown(row.raw, { canvas: !!row.canvas });
      // The sentinel rewrite is the whole reason this contract exists — prove it happened
      // (raw text survives only in originalMessage) for the wrapped kinds:
      expect(err.originalMessage, 'originalMessage carries the raw text').toBe(row.raw);
      expect(err.message.startsWith('API_'), 'message is a sentinel').toBe(true);
      // Pipeline half 1: defer-and-revisit / circle-back attribution
      expect(_isThrottleErr(err), '_isThrottleErr').toBe(row.throttle);
      // Pipeline half 2: _geminiCall's retry-path decision
      const d = decide(err, _isBurstQuotaErr);
      expect(d.isPermanent, 'isPermanent').toBe(row.permanent);
      expect(d.canvasAuthRetry, 'breaker+backoff retry path').toBe(row.retryPath);
    });
  }

  it('transient (5xx / empty body) passes through UNWRAPPED and stays a retryable non-permanent', () => {
    const thrower = mkThrower(_classifyGeminiError, () => {}, false);
    const raw = new Error('HTTP 503: Service Unavailable');
    let caught = null;
    try { thrower(raw); } catch (e) { caught = e; }
    expect(caught).toBe(raw); // transient is NOT rewritten — the sentinel wrap is quota/auth/config only
    const d = decide(caught, _isBurstQuotaErr);
    expect(d.isPermanent).toBe(false);
  });

  it('empty-body / timeout manifestations count as throttles for the defer layer (the 2026-06-20 storm class)', () => {
    expect(_isThrottleErr(new Error('Empty response body'))).toBe(true);
    expect(_isThrottleErr(new Error('Timeout after 90s'))).toBe(true);
  });

  it('refusals never enter the retry/defer machinery', () => {
    const cls = _classifyGeminiError(new Error('Content Blocked: safety'));
    expect(cls.kind).toBe('refusal');
    expect(_isThrottleErr(new Error('Content Blocked: safety'))).toBe(false);
  });
});
