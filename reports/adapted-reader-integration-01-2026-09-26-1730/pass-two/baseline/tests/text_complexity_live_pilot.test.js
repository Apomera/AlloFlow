import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const Context = require('../instructional_context_module.js');
const Pilot = require('../dev-tools/run_text_complexity_live_pilot.cjs');

const gradeFiveText = 'Water evaporates when sunlight warms a lake. The vapor rises, cools, and forms tiny droplets in clouds. Gravity eventually pulls the water back to Earth as rain or snow.';

describe('bounded live text-complexity pilot', () => {
  it('shares the production calibration contract without relabeling the educator target', () => {
    const guidance = Context.buildSourceCalibrationGuidance('Grade 5');
    const source = readFileSync('content_engine_source.jsx', 'utf8');

    expect(guidance).toContain('REQUESTED INSTRUCTIONAL TARGET: 5th Grade');
    expect(guidance).toContain('INTERNAL GENERATION CALIBRATION: 3rd Grade');
    expect(guidance).toContain('not the educator-facing grade label');
    expect(source).toContain('instructionalContextModule.buildSourceCalibrationGuidance(effGrade)');
  });

  it('is dry-run by default and enforces the hard call budget', async () => {
    const config = Pilot.parseArgs(['--grades', '2,5', '--repetitions', '2', '--max-calls', '4']);
    const generate = vi.fn(async () => gradeFiveText);
    const report = await Pilot.runPilot(config, { generate });

    expect(config.execute).toBe(false);
    expect(report).toMatchObject({ mode: 'dry-run', status: 'ready' });
    expect(report.callBudget).toEqual({
      logical: { planned: 4, maximum: 4, hardMaximum: 12 },
      httpAttempts: { maximum: 12, hardMaximum: 24 },
    });
    expect(report.samples.every((sample) => sample.status === 'planned')).toBe(true);
    expect(generate).not.toHaveBeenCalled();
    expect(() => Pilot.parseArgs(['--grades', '2,5,8,11,12', '--repetitions', '3'])).toThrow(/hard 12-call safety cap/i);
  });

  it('blocks cloud execution before transport when no credential exists', async () => {
    const report = await Pilot.runPilot({
      execute: true,
      backend: 'gemini',
      model: 'test-model',
      grades: ['5th Grade'],
      repetitions: 1,
      maxCalls: 1,
      paceMs: 0,
    }, { env: {} });

    expect(report).toMatchObject({
      mode: 'live',
      status: 'blocked',
      readiness: { ready: false, code: 'missing-credential' },
    });
    expect(report.summary.callsAttempted).toBe(0);
  });

  it('records measurements and fingerprints but never stores generated text', async () => {
    const secret = 'pilot-secret-that-must-not-leak';
    const report = await Pilot.runPilot({
      execute: true,
      backend: 'gemini',
      model: 'synthetic-model',
      grades: ['Grade 5'],
      repetitions: 1,
      maxCalls: 1,
      targetWords: 220,
      maxTokens: 400,
      paceMs: 0,
      timeoutMs: 5000,
      maxRetries: 2,
    }, {
      env: { GEMINI_API_KEY: secret },
      generate: vi.fn(async () => gradeFiveText),
      sleep: vi.fn(async () => {}),
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe('complete');
    expect(report.samples[0]).toMatchObject({
      status: 'succeeded',
      requestedGrade: '5th Grade',
      calibrationTarget: '3rd Grade',
      measuredGrade: 5.7,
      complexityStatus: 'within-target',
    });
    expect(report.samples[0].outputFingerprint).toMatch(/^txt-[0-9a-f]{8}-\d+$/);
    expect(report.summary.calibrationDecision).toBe('insufficient-sample');
    expect(serialized).not.toContain(gradeFiveText);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain('https://generativelanguage.googleapis.com');
  });

  it('uses Gemini\'s production header credential path and captures the served model', async () => {
    const originalFetch = globalThis.fetch;
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        modelVersion: 'gemini-served-test',
        candidates: [{ content: { parts: [{ text: gradeFiveText }] }, finishReason: 'STOP' }],
      }),
    }));
    globalThis.fetch = fetchImpl;
    try {
      const events = [];
      const generator = Pilot.createProviderGenerator({
        backend: 'gemini',
        model: 'gemini-requested-test',
        maxRetries: 1,
        timeoutMs: 1000,
        maxTokens: 400,
      }, events, { GEMINI_API_KEY: 'header-only-secret' }, { used: 0, maximum: 1 });
      const generated = await generator({ prompt: 'Synthetic prompt only.' });
      const [url, options] = fetchImpl.mock.calls[0];

      expect(url).not.toContain('header-only-secret');
      expect(url).not.toContain('?key=');
      expect(options.headers['x-goog-api-key']).toBe('header-only-secret');
      expect(JSON.parse(options.body).generationConfig.maxOutputTokens).toBe(400);
      expect(generated).toMatchObject({
        text: gradeFiveText,
        requestedModel: 'gemini-requested-test',
        servedModel: 'gemini-served-test',
      });
      expect(JSON.stringify(events)).not.toContain('header-only-secret');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('honors Retry-After and records sanitized rate-limit telemetry', async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: (name) => name.toLowerCase() === 'retry-after' ? '2' : null },
      })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => null } });
    const events = [];
    const instrumentedFetch = Pilot.createInstrumentedFetch({
      fetchImpl,
      events,
      sleep,
      random: () => 0,
      maxRetries: 2,
      timeoutMs: 1000,
    });

    const response = await instrumentedFetch('https://provider.invalid/path?key=secret', {
      headers: { Authorization: 'Bearer secret' },
    });

    expect(response.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(events).toContainEqual(expect.objectContaining({
      kind: 'retry', status: 429, delayMs: 2000, retryAfterSec: 2,
    }));
    expect(JSON.stringify(events)).not.toContain('provider.invalid');
    expect(JSON.stringify(events)).not.toContain('secret');
  });

  it('does not retry authentication failures', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      headers: { get: () => null },
    }));
    const sleep = vi.fn(async () => {});
    const instrumentedFetch = Pilot.createInstrumentedFetch({
      fetchImpl,
      sleep,
      maxRetries: 4,
      timeoutMs: 1000,
    });

    await expect(instrumentedFetch('https://provider.invalid')).rejects.toMatchObject({
      code: 'authentication',
      httpStatus: 401,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('enforces one shared raw HTTP-attempt ceiling across requests', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      headers: { get: () => null },
    }));
    const sleep = vi.fn(async () => {});
    const events = [];
    const attemptBudget = { used: 0, maximum: 2 };
    const instrumentedFetch = Pilot.createInstrumentedFetch({
      fetchImpl,
      sleep,
      events,
      attemptBudget,
      maxRetries: 4,
      timeoutMs: 1000,
      random: () => 0,
    });

    await expect(instrumentedFetch('https://provider.invalid')).rejects.toMatchObject({
      code: 'http-attempt-budget-exhausted',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(events.filter((event) => event.kind === 'attempt')).toHaveLength(2);
    expect(attemptBudget.used).toBe(2);
  });

  it('stops immediately when the caller aborts during a retry wait', async () => {
    const controller = new AbortController();
    let releaseSleep;
    const sleep = vi.fn(() => new Promise((resolve) => { releaseSleep = resolve; }));
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 429,
      headers: { get: () => '10' },
    }));
    const instrumentedFetch = Pilot.createInstrumentedFetch({
      fetchImpl,
      sleep,
      maxRetries: 3,
      timeoutMs: 1000,
    });

    const pending = instrumentedFetch('https://provider.invalid', { signal: controller.signal });
    await vi.waitFor(() => expect(sleep).toHaveBeenCalledTimes(1));
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: 'aborted' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    releaseSleep();
  });

  it('keeps calibration quality distinct from transport success', () => {
    const samples = Array.from({ length: 12 }, (_, index) => ({
      status: 'succeeded',
      measuredGrade: index < 5 ? 5.5 : 8,
      complexityStatus: index < 5 ? 'within-target' : 'above-target',
      distanceFromTargetRange: index < 5 ? 0 : 2,
      latencyMs: 10,
    }));
    const summary = Pilot.summarizeSamples(samples, [], 3);

    expect(summary.transportPassed).toBe(true);
    expect(summary.calibrationDecision).toBe('needs-calibration-adjustment');
    expect(summary.withinTargetRate).toBeCloseTo(5 / 12);
  });
});
