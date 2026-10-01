// Unit tests for _withRetry in doc_pipeline_source.jsx.
// Regression guard for the 2026-06-08 fix: _withRetry used to skip retry ONLY for RECITATION,
// so typed PERMANENT failures (bad/expired key, daily quota exhausted, misconfigured model —
// carrying .isAuth/.isQuota/.isConfig, message API_AUTH_FAILED/QUOTA_EXHAUSTED/MODEL_NOT_FOUND)
// fell through and triggered a whole second invocation + backoff window, doubling the dead-wait
// on every AI call. Now those short-circuit like RECITATION; only genuinely transient failures
// are retried once.
//
// Anti-drift: extracts the real _withTimeout + _withRetry block from source and runs it with a
// stubbed warnLog (no network, no real timers fire — the rejections resolve before the timeout).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');

function makeWithRetry() {
  const tStart = SRC.indexOf('var _withTimeout = function');
  const rStart = SRC.indexOf('var _withRetry = function', tStart);
  if (tStart < 0 || rStart < 0) throw new Error('_withTimeout/_withRetry not found');
  const braceStart = SRC.indexOf('{', SRC.indexOf('function', rStart));
  let i = braceStart, d = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  if (end < 0) throw new Error('unbalanced braces in _withRetry');
  const block = SRC.slice(tStart, end + 1); // both fn declarations + the comments between
  // eslint-disable-next-line no-eval
  return new Function('warnLog', block + '\n; return _withRetry;');
}
const buildWithRetry = makeWithRetry();
const withRetry = buildWithRetry(() => {});

// Returns an fn that rejects with `err` and counts its invocations.
function rejecter(err) {
  let calls = 0;
  return { fn: () => { calls++; return Promise.reject(err); }, calls: () => calls };
}
function err(message, props) { const e = new Error(message); Object.assign(e, props || {}); return e; }

describe('_withRetry — permanent vs transient failures', () => {
  it('skips retry on .isAuth (one invocation)', async () => {
    const r = rejecter(err('API_AUTH_FAILED', { isAuth: true }));
    await expect(withRetry(r.fn, 1000, 500, 'auth')).rejects.toThrow();
    expect(r.calls()).toBe(1);
  });

  it('skips retry on .isQuota (one invocation)', async () => {
    const r = rejecter(err('API_QUOTA_EXHAUSTED', { isQuota: true }));
    await expect(withRetry(r.fn, 1000, 500, 'quota')).rejects.toThrow();
    expect(r.calls()).toBe(1);
  });

  it('skips retry on .isConfig (one invocation)', async () => {
    const r = rejecter(err('API_MODEL_NOT_FOUND', { isConfig: true }));
    await expect(withRetry(r.fn, 1000, 500, 'config')).rejects.toThrow();
    expect(r.calls()).toBe(1);
  });

  it('skips retry when only the message signals a permanent failure (flags stripped by re-wrap)', async () => {
    const r = rejecter(err('something: API_QUOTA_EXHAUSTED somewhere'));
    await expect(withRetry(r.fn, 1000, 500, 'msg-only')).rejects.toThrow();
    expect(r.calls()).toBe(1);
  });

  it('still skips retry on RECITATION (pre-existing behavior preserved)', async () => {
    const r = rejecter(err('Blocked: RECITATION'));
    await expect(withRetry(r.fn, 1000, 500, 'recite')).rejects.toThrow();
    expect(r.calls()).toBe(1);
  });

  it('DOES retry once on a generic transient error (two invocations)', async () => {
    const r = rejecter(err('network blip'));
    await expect(withRetry(r.fn, 1000, 500, 'transient')).rejects.toThrow();
    expect(r.calls()).toBe(2);
  });
});
