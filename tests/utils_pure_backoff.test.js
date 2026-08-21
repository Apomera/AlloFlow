// Unit tests for fetchWithExponentialBackoff's status handling in utils_pure_source.jsx.
// Regression guard for the 2026-06-08 fix: a 401 (bad/expired key) used to be lumped in with
// 429/503 and retried through the full exponential backoff (~31s of dead-wait per call) before
// failing — the "freezes then fails" symptom of a misconfigured key. 401 now fails FAST as an
// auth error (isFatal + isAuth), like 403. 429/503 stay retryable (not exercised here — their
// path sleeps through real backoff; the fast-fail statuses throw on the first response).
//
// Anti-drift: extracts the real arrow from source at runtime and runs it with a stubbed fetch.
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../utils_pure_source.jsx'), 'utf8');

function makeFetcher() {
  const anchor = 'const fetchWithExponentialBackoff = ';
  const at = SRC.indexOf(anchor);
  if (at < 0) throw new Error('fetchWithExponentialBackoff not found');
  const policyAt = SRC.indexOf('const PROVIDER_RETRY_AFTER_MAX_MS = ');
  if (policyAt < 0 || policyAt > at) throw new Error('provider retry policy not found');
  const braceStart = SRC.indexOf('{', SRC.indexOf('=>', at));
  let i = braceStart, d = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  const head = SRC.slice(at + anchor.length, SRC.indexOf('=>', at));
  // eslint-disable-next-line no-eval
  return new Function('fetch', 'warnLog', SRC.slice(policyAt, at)
    + '\nreturn (' + head + '=> ' + SRC.slice(braceStart, end + 1) + ');');
}
const build = makeFetcher();

// A fetch stub that always resolves the given response shape, counting calls.
function stubFetch(resp) {
  let calls = 0;
  const fn = async () => { calls++; return resp; };
  return { fn, calls: () => calls };
}

describe('fetchWithExponentialBackoff — fast-fail status handling', () => {
  it('401 fails fast: throws an auth error on the first response, no retry', async () => {
    const s = stubFetch({ ok: false, status: 401, statusText: 'Unauthorized' });
    const fetchWithExponentialBackoff = build(s.fn, () => {});
    let err;
    try { await fetchWithExponentialBackoff('https://api/x', {}, 5); } catch (e) { err = e; }
    expect(err).toBeTruthy();
    expect(err.isFatal).toBe(true);
    expect(err.isAuth).toBe(true);
    expect(String(err.message)).toMatch(/401|auth/i);
    expect(s.calls()).toBe(1); // critical: did NOT retry through backoff
  });

  it('403 still fails fast (forbidden), no retry', async () => {
    const s = stubFetch({ ok: false, status: 403, statusText: 'Forbidden' });
    const fetchWithExponentialBackoff = build(s.fn, () => {});
    let err;
    try { await fetchWithExponentialBackoff('https://api/x', {}, 5); } catch (e) { err = e; }
    expect(err.isFatal).toBe(true);
    expect(err.isAuth).toBeUndefined();
    expect(s.calls()).toBe(1);
  });

  it('a 500 is fatal and fails fast', async () => {
    const s = stubFetch({ ok: false, status: 500, statusText: 'Server Error' });
    const fetchWithExponentialBackoff = build(s.fn, () => {});
    let err;
    try { await fetchWithExponentialBackoff('https://api/x', {}, 5); } catch (e) { err = e; }
    expect(err.isFatal).toBe(true);
    expect(s.calls()).toBe(1);
  });

  it('a 200 OK returns the response without retrying', async () => {
    const ok = { ok: true, status: 200 };
    const s = stubFetch(ok);
    const fetchWithExponentialBackoff = build(s.fn, () => {});
    const resp = await fetchWithExponentialBackoff('https://api/x', {}, 5);
    expect(resp).toBe(ok);
    expect(s.calls()).toBe(1);
  });
});

// Per-request timeout (2026-06-16): a request the server accepts but never answers (no response,
// no error) used to hang the await forever — the retry cap only fires on a FAILED request, not a
// non-settling one. That silently wedged whole remediation sections ("stuck Fixing…", no toast).
// Each attempt is now bounded by an AbortController; a dead request rejects → retries → throws.
// A request that respects its signal (rejects with AbortError when aborted) models a real fetch.
function signalAwareFetch(onCall) {
  return (url, opts) => {
    if (typeof onCall === 'function') onCall();
    return new Promise((_, reject) => {
      const sig = opts && opts.signal;
      const fail = () => { const e = new Error('The operation was aborted'); e.name = 'AbortError'; reject(e); };
      if (sig) {
        if (sig.aborted) { fail(); return; }
        sig.addEventListener('abort', fail);
      }
      // otherwise never settles (a hung connection)
    });
  };
}

describe('fetchWithExponentialBackoff — per-request timeout (anti-hang)', () => {
  it('a request that never settles TIMES OUT and throws instead of hanging forever', async () => {
    const fetchWithExponentialBackoff = build(signalAwareFetch(), () => {});
    let err;
    // maxRetries=1 → no real backoff sleep; perRequestTimeoutMs=40 keeps it fast
    try { await fetchWithExponentialBackoff('https://api/x', {}, 1, 40); } catch (e) { err = e; }
    expect(err).toBeTruthy();
    expect(String(err.message)).toMatch(/timed out/i);
  });

  it('a caller abort (Stop) propagates immediately as AbortError and is NOT retried', async () => {
    let calls = 0;
    const fetchWithExponentialBackoff = build(signalAwareFetch(() => { calls++; }), () => {});
    const ac = new AbortController();
    ac.abort(); // the user pressed Stop before the request settled
    let err;
    try { await fetchWithExponentialBackoff('https://api/x', { signal: ac.signal }, 5, 5000); } catch (e) { err = e; }
    expect(err).toBeTruthy();
    expect(err.name).toBe('AbortError');
    expect(calls).toBe(1); // critical: a cancelled request is not re-issued 5× through backoff
  });

  it('a fast 200 still returns immediately with the timeout wired (no false timeout)', async () => {
    let calls = 0;
    const ok = { ok: true, status: 200 };
    const fetchWithExponentialBackoff = build(async () => { calls++; return ok; }, () => {});
    const resp = await fetchWithExponentialBackoff('https://api/x', {}, 5, 60000);
    expect(resp).toBe(ok);
    expect(calls).toBe(1);
  });

  it('reports the HTTP status of a failed inner attempt without changing fail-fast behavior', async () => {
    const events = [];
    const s = stubFetch({ ok: false, status: 401, statusText: 'Unauthorized' });
    const fetchWithExponentialBackoff = build(s.fn, () => {});
    let err;
    try {
      await fetchWithExponentialBackoff('https://api/x', {}, 5, 120000, {
        onInnerAttempt: (info) => events.push(['attempt', info.attempt]),
        onInnerResponse: (info) => events.push(['response', info.status]),
      });
    } catch (e) { err = e; }
    expect(err).toBeTruthy();
    expect(events).toEqual([['attempt', 1], ['response', 401]]);
  });

  it('anti-drift: the timeout param + AbortController plumbing are present in source', () => {
    expect(SRC).toContain('perRequestTimeoutMs = 120000');
    expect(SRC).toContain('new AbortController()');
    expect(SRC).toContain('Request aborted by caller'); // caller-abort propagates, no retry
  });
});

describe('fetchWithExponentialBackoff server-directed, abortable backoff', () => {
  it('uses delta-seconds Retry-After as the actual delay floor', async () => {
    vi.useFakeTimers();
    const onInnerBackoff = vi.fn();
    const responses = [
      { ok: false, status: 429, statusText: 'Too Many Requests', headers: { get: () => '2' } },
      { ok: true, status: 200, headers: { get: () => null } },
    ];
    const fetchImpl = vi.fn(async () => responses.shift());
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      const request = build(fetchImpl, () => {})('https://api.example.test/v1?key=SECRET', {}, 2, 5000, { onInnerBackoff });
      await vi.advanceTimersByTimeAsync(1999);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      await expect(request).resolves.toMatchObject({ ok: true });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(onInnerBackoff).toHaveBeenCalledWith(expect.objectContaining({ delayMs: 2000, retryAfterSec: 2 }));
    } finally {
      Math.random = originalRandom;
      vi.useRealTimers();
    }
  });

  it('honors an HTTP-date Retry-After and caps an excessive server delay', () => {
    const policyAt = SRC.indexOf('const PROVIDER_RETRY_AFTER_MAX_MS = ');
    const classifyAt = SRC.indexOf('const classifyProviderError = ', policyAt);
    const prefix = SRC.slice(policyAt, classifyAt);
    // eslint-disable-next-line no-new-func
    const parse = new Function(prefix + '\nreturn parseProviderRetryAfter;')();
    const now = Date.parse('2026-08-20T12:00:00.000Z');
    expect(parse('Thu, 20 Aug 2026 12:00:03 GMT', now)).toMatchObject({ delayMs: 3000, retryAfterSec: 3, exceedsRetryWindow: false });
    expect(parse('3600', now)).toMatchObject({ delayMs: 120000, retryAfterSec: 120, exceedsRetryWindow: true });
  });

  it('uses an HTTP-date Retry-After as the actual delay floor', async () => {
    vi.useFakeTimers();
    const now = Date.parse('2026-08-20T12:00:00.000Z');
    vi.setSystemTime(now);
    const responses = [
      { ok: false, status: 429, statusText: 'Too Many Requests', headers: { get: () => 'Thu, 20 Aug 2026 12:00:03 GMT' } },
      { ok: true, status: 200, headers: { get: () => null } },
    ];
    const fetchImpl = vi.fn(async () => responses.shift());
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      const request = build(fetchImpl, () => {})('https://api.example.test/v1', {}, 2, 5000);
      await vi.advanceTimersByTimeAsync(2999);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      await expect(request).resolves.toMatchObject({ ok: true });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    } finally {
      Math.random = originalRandom;
      vi.useRealTimers();
    }
  });

  it('aborts while waiting for Retry-After and never reissues the request', async () => {
    vi.useFakeTimers();
    const response = { ok: false, status: 429, statusText: 'Too Many Requests', headers: { get: () => '60' } };
    const fetchImpl = vi.fn(async () => response);
    const ctl = new AbortController();
    try {
      const request = build(fetchImpl, () => {})('https://api.example.test/v1', { signal: ctl.signal }, 2, 5000);
      await vi.advanceTimersByTimeAsync(0);
      ctl.abort();
      await expect(request).rejects.toMatchObject({ name: 'AbortError' });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
