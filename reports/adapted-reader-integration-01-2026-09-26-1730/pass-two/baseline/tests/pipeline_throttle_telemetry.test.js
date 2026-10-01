// Remediation pipeline — throttle telemetry.
//
// The Gemini gate is adaptive (concurrency cap, auth + empty-body breakers,
// escalating cooldown, representative-recovery probes) but announces a storm
// ONCE, so the tuned constants (_GEMINI_STORM_TRIP, _GEMINI_COOLDOWN_MS, the 25s
// ceiling) rest on judgement rather than measurement. These records make a real
// run analysable after the fact.
//
// Two properties matter and are pinned here:
//   1. It logs DECISIONS, not calls. _alloflowPipelineWarnings caps at 500 and is
//      the only log a teacher can copy; per-call rows would evict the errors and
//      step context that make a run readable.
//   2. It carries no content. Every field is a number or an enum, so the log can
//      be pasted back for analysis without disclosing document or student text.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC = 'doc_pipeline_source.jsx';
let src;
let host;

beforeAll(() => {
  src = fs.readFileSync(SRC, 'utf8');
  host = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
});

describe('throttle telemetry — wiring', () => {
  it('records at every decision point, not per call', () => {
    // trips, recovery, and the post-cooldown outcome
    expect(src).toContain("_pipeThrottleEvent('auth_trip'");
    expect(src).toContain("_pipeThrottleEvent('transient_trip'");
    expect(src).toContain("_pipeThrottleEvent('recovered'");
    expect(src).toContain('_pipeThrottleScoreProbe("ok", null);');
    expect((src.match(/_pipeThrottleScoreProbe\("fail", owner\);/g) || []).length).toBe(2);
    expect(src).toContain('capBefore: _capBefore');
    expect(src).toContain('cleanPrefixEvents: _cleanPrefixEvents');
    expect(src).toContain("respBytes + ' bytes response)'");
    expect(src).not.toContain("Math.round(respLen / 1000) + 'KB response)'");
  });

  it('scores whether the first call after a cooldown recovered', () => {
    // the number that says if a cooldown length is buying recovery or just time
    expect(src).toContain('post_cooldown_');
    expect(src).toContain('_throttlePendingProbe = { cooldownMs: _cd };');
  });

  it('emits a rollup when a run that hit the gate finishes', () => {
    expect(src).toContain('_pipeLog("ThrottleSummary"');
    expect(src).toContain('options.forceThrottleSummary !== false');
    expect(src).toContain('var forcedSummary = null;');
  });

  it('bounds its own buffer so a long run cannot grow without limit', () => {
    expect(src).toContain('_THROTTLE_TRACE_MAX = 400');
    expect(src).toMatch(/_throttleTrace\.splice\(0, _throttleTrace\.length - _THROTTLE_TRACE_MAX\)/);
  });
});

describe('throttle telemetry — says when its own numbers are untrustworthy', () => {
  // Every duration in this log is timer-derived, and Chrome clamps timers to roughly
  // once a minute in a hidden tab. A run made with the tab minimised therefore records
  // cooldowns several times longer than the constants that produced them — and nothing
  // else in the log distinguishes that from the server throttling harder, which is the
  // exact wrong conclusion to draw when the log exists to tune those constants.
  let build;
  beforeAll(async () => {
    const { runInNewContext } = await import('node:vm');
    const start = src.indexOf('  var _pipeThrottleSummary = function(owner) {');
    const end = src.indexOf('\n  };', start) + 5;
    const fn = src.slice(start, end);
    build = (over) => {
      const logged = [];
      const sandbox = Object.assign({
        Math, Object, Date,
        _pipeLog: (tag, line, data) => logged.push({ tag, line, data }),
        _throttleTrace: [{ kind: 'auth_trip', inFlight: 3, cooldownMs: 12000 }],
        _throttleCooldownMsTotal: 12000,
        _geminiEffectiveMax: 3, _GEMINI_STORM_MIN: 1, _GEMINI_STORM_TRIP: 2,
        _GEMINI_TRANSIENT_TRIP: 3, _GEMINI_COOLDOWN_MS: 12000, _geminiStaggerMs: 0,
        _throttleRunStartedAt: Date.now() - 600000,
        _throttleHiddenDecisions: 0,
        _throttleHiddenTotalMs: () => 0,
      }, over || {});
      runInNewContext(fn + '\n_out = _pipeThrottleSummary(null);', sandbox);
      return { out: sandbox._out, logged };
    };
  });

  it('marks a run made with the tab visible as tuneable', () => {
    const r = build();
    expect(r.out.tuneable).toBe(1);
    expect(r.out.hiddenMs).toBe(0);
    expect(r.logged[0].line).not.toMatch(/TAB WAS HIDDEN/);
  });

  it('refuses to certify a run where the tab was hidden', () => {
    const r = build({ _throttleHiddenTotalMs: () => 300000, _throttleHiddenDecisions: 2 });
    expect(r.out.tuneable, 'a half-hidden run must not be presented as tuneable').toBe(0);
    expect(r.out.hiddenPctOfRun).toBeGreaterThan(40);
    expect(r.out.hiddenDecisions).toBe(2);
    expect(r.logged[0].line, 'the warning belongs in the human-readable line, not only a field')
      .toMatch(/TAB WAS HIDDEN/);
    expect(r.logged[0].line).toMatch(/do NOT tune the constants/);
  });

  it('does not certify a run where any decision was taken hidden, however brief', () => {
    // A short hide that happens to straddle a trip still contaminates that trip's timing.
    const r = build({ _throttleHiddenTotalMs: () => 1000, _throttleHiddenDecisions: 1 });
    expect(r.out.tuneable).toBe(0);
  });

  it('keeps the visible decision prefix tuneable when hidden timing begins later', () => {
    const started = Date.now() - 600000;
    const r = build({
      _throttleRunStartedAt: started,
      _throttleTrace: [
        { kind: 'auth_trip', hidden: 0, atMs: started + 100000, hiddenMs: 0, cooldownMs: 12000 },
        { kind: 'transient_trip', hidden: 0, atMs: started + 200000, hiddenMs: 0, cooldownMs: 12000 },
        { kind: 'post_cooldown_ok', hidden: 1, atMs: started + 210000, hiddenMs: 5000 },
      ],
      _throttleHiddenTotalMs: () => 300000,
      _throttleHiddenDecisions: 1,
    });
    expect(r.out.cleanPrefixEvents).toBe(2);
    expect(r.out.cleanPrefixTrips).toBe(2);
    expect(r.out.cleanPrefixTuneable).toBe(1);
    expect(r.out.tuneable).toBe(1);
    expect(r.logged[0].line).toContain('clean prefix 2/3');
  });
  it('reports hidden time as numbers only, carrying no content', () => {
    const r = build({ _throttleHiddenTotalMs: () => 5000, _throttleHiddenDecisions: 1 });
    for (const k of ['hiddenMs', 'hiddenDecisions', 'hiddenPctOfRun', 'tuneable']) {
      expect(typeof r.out[k], k + ' must be a number').toBe('number');
    }
  });
});

describe('diagnostic bundle — bounded and privacy-safe', () => {
  it('exports structured evidence without putting payload text in the snapshot seam', () => {
    expect(src).toContain('getDiagnosticSnapshot: _getDiagnosticSnapshot');
    expect(src).toContain('callLedger: []');
    expect(src).toContain('httpAttempts: []');
    expect(src).toContain('innerRetries: 0');
    expect(src).toContain('heartbeat: _diagnosticSafeClone');
    expect(src).toContain('var _DIAGNOSTIC_FORBIDDEN_KEY');
    const start = src.indexOf('var _getDiagnosticSnapshot = function');
    const end = src.indexOf('\n  };', start) + 5;
    const body = src.slice(start, end);
    for (const field of ['prompt:', 'text:', 'content:', 'response:', 'body:']) {
      expect(body, 'snapshot must not expose ' + field).not.toContain(field);
    }
  });

  it('threads a call correlation id into nested retry telemetry', () => {
    expect(src).toContain('onInnerAttempt');
    expect(src).toContain('onInnerResponse');
    expect(src).toContain('onInnerRetry');
    expect(src).toContain('onAuthRung');
    expect(src).toContain('diagnosticTelemetry');
  });
});

describe('throttle telemetry — records carry no content', () => {
  it('logs only numeric and enum fields', () => {
    const start = src.indexOf('var _pipeThrottleEvent = function');
    const end = src.indexOf('var _pipeThrottleScoreProbe', start);
    const body = src.slice(start, end);
    // the record is built from gate counters only
    for (const field of ['cap', 'inFlight', 'queued', 'authStreak', 'transientStreak', 'okStreak']) {
      expect(body, 'record should carry ' + field).toContain(field + ':');
    }
    // nothing that could carry document or student text
    const forbidden = ['prompt', 'text', 'content', 'response', 'body'];
    forbidden.forEach((word) => {
      expect(body.toLowerCase(), 'record must not carry a ' + word + ' field').not.toContain(word + ':');
    });
  });
});

describe('throttle telemetry — computes what the constants rest on', () => {
  let summary;

  beforeAll(async () => {
    // Execute the REAL summary builder against a synthetic trace, so the maths is
    // exercised rather than assumed. The gate state it reads is stubbed.
    const { runInNewContext } = await import('node:vm');
    const start = src.indexOf('  var _pipeThrottleSummary = function(owner) {');
    const end = src.indexOf('\n  };', start) + 5;
    expect(start, '_pipeThrottleSummary not found').toBeGreaterThan(-1);
    const fn = src.slice(start, end);

    const logged = [];
    const sandbox = {
      Math, Object, Date,
      _pipeLog: (tag, line, data) => logged.push({ tag, line, data }),
      _throttleTrace: [
        { kind: 'auth_trip', inFlight: 3, cooldownMs: 12000 },
        { kind: 'post_cooldown_fail' },
        { kind: 'auth_trip', inFlight: 2, cooldownMs: 24000 },
        { kind: 'post_cooldown_ok' },
        { kind: 'recovered' },
      ],
      _throttleCooldownMsTotal: 36000,
      _geminiEffectiveMax: 3,
      _GEMINI_STORM_MIN: 1,
      _GEMINI_STORM_TRIP: 2,
      _GEMINI_TRANSIENT_TRIP: 3,
      _GEMINI_COOLDOWN_MS: 12000,
      _geminiStaggerMs: 0,
      // Hidden-tab accounting, stubbed as a clean (fully visible) run. Chrome clamps
      // timers in a hidden tab, so the summary now reports whether its own durations
      // can be trusted; see the dedicated describe block below.
      _throttleRunStartedAt: Date.now() - 600000,
      _throttleHiddenDecisions: 0,
      _throttleHiddenTotalMs: () => 0,
    };
    runInNewContext(fn + '\n_out = _pipeThrottleSummary(null);', sandbox);
    summary = { out: sandbox._out, logged };
  });

  it('reports the in-flight concurrency at each trip (rate vs concurrency question)', () => {
    expect(summary.out.tripsAtInFlightAvg).toBe(2.5);
    expect(summary.out.tripsAtInFlightMax).toBe(3);
    expect(summary.out.effectiveMax).toBe(3);
  });

  it('reports whether cooldowns recovered on the first call after', () => {
    expect(summary.out.cooldownRecoveredFirstTry).toBe(1);
    expect(summary.out.cooldownStillFailing).toBe(1);
    expect(summary.out.cooldownLengthsUsed).toEqual({ 12000: 1, 24000: 1 });
  });

  it('reports the wall clock actually spent backing off', () => {
    expect(summary.out.cooldownMsTotal).toBe(36000);
    expect(summary.logged[0].tag).toBe('ThrottleSummary');
    expect(summary.logged[0].line).toContain('cooldown total 36s');
  });

  it('records the constants in force, so a log is self-describing', () => {
    expect(summary.out.authTrip).toBe(2);
    expect(summary.out.transientTrip).toBe(3);
    expect(summary.out.baseCooldownMs).toBe(12000);
  });
});

describe('retry-layer routing', () => {
  it('routes the document pipeline and recovery probe through one Gemini attempt', () => {
    expect(src).toContain('var _rawCallGemini = deps.callGeminiSingleAttempt || deps.callGemini;');
    expect(src).toContain('_rawCallGemini(_prompt, false, false, null, null, _sig)');
    expect(host).toContain('callGeminiSingleAttempt: _livePipelineCall');
    expect(host).toContain('callGeminiSingleAttempt = api.callGeminiSingleAttempt || api.callGemini;');
  });

  it('keeps retry budgets at least as large as the first cloud attempt', () => {
    expect(src).toContain('_localTextCall ? 420000 : ((_htpText && _htpText.textInitialMs) || 180000), _localTextCall ? 300000 : ((_htpText && _htpText.textRetryMs) || 180000)');
    expect(src).toContain("}, (_htpVision && _htpVision.visionInitialMs) || 120000, (_htpVision && _htpVision.visionRetryMs) || 120000, 'callGeminiVision'" );
    expect(src).toContain('textRetryMs: 180000');
    expect(src).toContain('visionRetryMs: 120000');
  });
});
