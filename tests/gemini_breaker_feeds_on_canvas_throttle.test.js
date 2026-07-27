// @vitest-environment jsdom
// Field regression 2026-07-27 — the Canvas throttle breaker stopped tripping.
//
// A real 8-page run spent 5,000+ seconds making 60+ calls that each burned ~120s and failed with
// API_AUTH_FAILED, and the log contained NOT ONE [GeminiGate] line: the cap never dropped from 3,
// no cooldown was ever set, `storming` stayed false, so wait-not-stop returned instantly and every
// pass, catch-up drain and re-audit re-fanned straight back into a proxy that was refusing.
//
// Cause: extracting the outcome classifier (audit finding M15) dropped one line from the original —
// `if (isPermanent && _canvasAuthRetry) isPermanent = false;`. A Canvas throttle carries BOTH
// `message: 'API_AUTH_FAILED'` and `canvasTransientAuth: true`, so without that de-escalation it
// classified as permanent and returned before feeding the breaker. And because the classifier is
// once-only, the retry path's later call was a no-op — the note was lost entirely.
//
// The M15 pins were all STRUCTURAL ("there is one classifier", "the slot waits for it"). None
// asserted what the classifier DECIDES, which is why they stayed green through this. This one
// drives a real throttled call through the real gate and reads the real breaker state.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadAlloModule } from './setup.js';

function makePipeline(callGemini) {
  const noop = () => {};
  return window.AlloModules.createDocPipeline({
    callGemini, callGeminiVision: callGemini, callImagen: async () => null,
    addToast: noop, t: (k) => k, isRtlLang: () => false,
    updateExportPreview: noop, getDefaultTitle: () => 'D', state: {},
  });
}

// Exactly the shape gemini_api's _throwClassified produces for a Canvas 401/403.
function canvasThrottleError() {
  const e = new Error('API_AUTH_FAILED');
  e.canvasTransientAuth = true;
  return e;
}

beforeEach(() => { loadAlloModule('doc_pipeline_module.js'); });

describe('the breaker is fed by a Canvas throttle', () => {
  it('a Canvas 401/403 storm trips it — cap drops and a cooldown is set', async () => {
    const p = makePipeline(async () => { throw canvasThrottleError(); });
    const before = p.geminiThrottleInfo();
    expect(before.authStreak).toBe(0);
    expect(before.storming).toBe(false);

    // _GEMINI_STORM_TRIP is 2 consecutive canvas-auth failures. Two is enough, and stopping
    // there keeps the test off the cooldown the trip itself installs.
    for (let i = 0; i < 2; i++) {
      try { await p.auditOutputAccessibility('<main><h1>x</h1><p>y</p></main>'); } catch (_) {}
    }

    const after = p.geminiThrottleInfo();
    expect(after.authStreak, 'the breaker never saw the throttle — this is the 2026-07-27 regression').toBeGreaterThan(0);
    expect(after.storming, 'storming must be true so wait-not-stop actually paces the run').toBe(true);
    expect(after.capped, 'concurrency must drop, or every later pass re-fans into the throttle').toBe(true);
    expect(after.cooldownRemainingMs).toBeGreaterThan(0);
  }, 60000);

  it('a genuinely PERMANENT auth error still does not feed the breaker', async () => {
    // The de-escalation must be keyed on canvasTransientAuth, not on the message — a real dead key
    // should not trip a rate-limit breaker and make the run look recoverable.
    const p = makePipeline(async () => { const e = new Error('API_AUTH_FAILED'); e.isAuth = true; throw e; });
    for (let i = 0; i < 2; i++) {
      try { await p.auditOutputAccessibility('<main><h1>x</h1><p>y</p></main>'); } catch (_) {}
    }
    expect(p.geminiThrottleInfo().authStreak).toBe(0);
  }, 60000);
});
