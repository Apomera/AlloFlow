import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(resolve(process.cwd(), 'utils_pure_source.jsx'), 'utf8');

const policyStart = SOURCE.indexOf('const PROVIDER_RETRY_AFTER_MAX_MS = ');
const fetchStart = SOURCE.indexOf('const fetchWithExponentialBackoff = ', policyStart);
if (policyStart < 0 || fetchStart < 0) throw new Error('Provider error policy source not found');

// Execute only the pure policy declarations, not storage/network registration.
// eslint-disable-next-line no-new-func
const policy = new Function(SOURCE.slice(policyStart, fetchStart)
  + '\nreturn { parseProviderRetryAfter, classifyProviderError, getProviderErrorSafeFields };')();

const FULL_PACK_SOURCE = readFileSync(resolve(process.cwd(), 'generation_helpers_source.jsx'), 'utf8');
const fullPackPolicyStart = FULL_PACK_SOURCE.indexOf('const _fullPackFailurePolicy = ');
const fullPackPolicyEnd = FULL_PACK_SOURCE.indexOf('const _waitForFullPackDelay = ', fullPackPolicyStart);
// eslint-disable-next-line no-new-func
const fullPackFailurePolicy = new Function('window', FULL_PACK_SOURCE.slice(fullPackPolicyStart, fullPackPolicyEnd)
  + '\nreturn _fullPackFailurePolicy;')({ AlloModules: { UtilsPure: policy } });

describe('shared provider error policy', () => {
  it('retries an explicit per-minute limit using bounded Retry-After evidence', () => {
    const error = new Error('API_QUOTA_EXHAUSTED');
    error.httpStatus = 429;
    error.retryAfterSec = 17;
    error.isQuota = true;
    error.classification = { kind: 'quota', perMinute: true, perDay: false };
    expect(policy.classifyProviderError(error)).toMatchObject({
      kind: 'rate-limit', category: 'transient', quotaScope: 'minute',
      retryable: true, delayMs: 17000, retryAfterMs: 17000,
    });
  });

  it.each([
    ['daily quota', Object.assign(new Error('RESOURCE_EXHAUSTED: requests per day'), { isQuota: true, classification: { kind: 'quota', perDay: true } }), 'quota-daily'],
    ['authentication', Object.assign(new Error('API_AUTH_FAILED'), { isAuth: true, httpStatus: 401 }), 'auth'],
    ['configuration', Object.assign(new Error('API_MODEL_NOT_FOUND'), { isConfig: true, httpStatus: 404 }), 'configuration'],
  ])('fails fast for %s', (_label, error, expectedKind) => {
    expect(policy.classifyProviderError(error)).toMatchObject({ kind: expectedKind, retryable: false, delayMs: 0 });
  });

  it('fails fast for unscoped quota after the bounded transport attempts', () => {
    const error = Object.assign(new Error('API_QUOTA_EXHAUSTED'), { isQuota: true, httpStatus: 429 });
    expect(policy.classifyProviderError(error)).toMatchObject({
      kind: 'quota-unknown', quotaScope: 'unknown', retryable: false,
    });
  });

  it('returns privacy-safe fields without messages, URLs, keys, or arbitrary codes', () => {
    const secret = 'SENTINEL_PRIVATE_KEY_123';
    const error = Object.assign(new Error('Bearer ' + secret + ' failed at https://host/private/student-name'), {
      code: secret,
      httpStatus: 503,
      retryAfterSec: 2,
    });
    const safe = policy.getProviderErrorSafeFields(error);
    const serialized = JSON.stringify(safe);
    expect(safe).toEqual({
      schemaVersion: 1,
      kind: 'service-unavailable',
      category: 'transient',
      retryable: true,
      quotaScope: 'none',
      httpStatus: 503,
      retryAfterMs: 2000,
    });
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain('student-name');
    expect(Object.keys(safe)).not.toContain('message');
    expect(Object.keys(safe)).not.toContain('url');
    expect(Object.keys(safe)).not.toContain('code');
  });

  it('drives Full Pack retry decisions from the typed error, not a collapsed message', () => {
    const minute = Object.assign(new Error('API_QUOTA_EXHAUSTED'), {
      isQuota: true, httpStatus: 429, retryAfterSec: 4,
      classification: { kind: 'quota', perMinute: true },
    });
    const daily = Object.assign(new Error('API_QUOTA_EXHAUSTED'), {
      isQuota: true, httpStatus: 429,
      classification: { kind: 'quota', perDay: true },
    });
    expect(fullPackFailurePolicy(minute)).toMatchObject({
      kind: 'rate-limit', retryable: true, delayMs: 4000, quotaScope: 'minute',
    });
    expect(fullPackFailurePolicy(daily)).toMatchObject({
      kind: 'quota-daily', retryable: false, delayMs: 0, quotaScope: 'daily',
    });
    expect(FULL_PACK_SOURCE).toContain('_fullPackFailurePolicy(finalError)');
    expect(FULL_PACK_SOURCE).toContain('providerError: failurePolicy.providerError');
  });
});
