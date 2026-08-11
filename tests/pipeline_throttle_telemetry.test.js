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

beforeAll(() => { src = fs.readFileSync(SRC, 'utf8'); });

describe('throttle telemetry — wiring', () => {
  it('records at every decision point, not per call', () => {
    // trips, recovery, and the post-cooldown outcome
    expect(src).toContain("_pipeThrottleEvent('auth_trip'");
    expect(src).toContain("_pipeThrottleEvent('transient_trip'");
    expect(src).toContain("_pipeThrottleEvent('recovered'");
    expect(src).toContain('_pipeThrottleScoreProbe("ok", null);');
    expect((src.match(/_pipeThrottleScoreProbe\("fail", owner\);/g) || []).length).toBe(2);
  });

  it('scores whether the first call after a cooldown recovered', () => {
    // the number that says if a cooldown length is buying recovery or just time
    expect(src).toContain('post_cooldown_');
    expect(src).toContain('_throttlePendingProbe = { cooldownMs: _cd };');
  });

  it('emits a rollup when a run that hit the gate finishes', () => {
    expect(src).toContain('_pipeLog("ThrottleSummary"');
    expect(src).toContain('if (_throttleTrace.length) _pipeThrottleSummary(null);');
  });

  it('bounds its own buffer so a long run cannot grow without limit', () => {
    expect(src).toContain('_THROTTLE_TRACE_MAX = 400');
    expect(src).toMatch(/_throttleTrace\.splice\(0, _throttleTrace\.length - _THROTTLE_TRACE_MAX\)/);
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
