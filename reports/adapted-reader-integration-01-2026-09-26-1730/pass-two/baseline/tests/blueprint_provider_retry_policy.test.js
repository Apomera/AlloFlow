import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let PhaseO;

const makePolicyModule = () => {
  const source = readFileSync(resolve(process.cwd(), 'utils_pure_source.jsx'), 'utf8');
  const start = source.indexOf('const PROVIDER_RETRY_AFTER_MAX_MS = ');
  const end = source.indexOf('const fetchWithExponentialBackoff = ', start);
  // eslint-disable-next-line no-new-func
  return new Function(source.slice(start, end)
    + '\nreturn { classifyProviderError, getProviderErrorSafeFields };')();
};

beforeAll(() => {
  loadAlloModule('generation_matrix_module.js');
  window.AlloModules.UtilsPure = Object.assign({}, window.AlloModules.UtilsPure, makePolicyModule());
  const source = readFileSync(resolve(process.cwd(), 'phase_o_misc_handlers_source.jsx'), 'utf8');
  // Run the canonical source directly so this slice does not require rebuilding
  // release mirrors in the middle of a concurrent multi-agent change.
  // eslint-disable-next-line no-new-func
  new Function(source)();
  PhaseO = window.AlloModules.PhaseOHandlers;
});

const PLAN = { resourcePlan: [{ tool: 'analysis', uiId: 'row-analysis', directive: 'analyze' }] };

const minuteLimit = (message = 'API_QUOTA_EXHAUSTED') => Object.assign(new Error(message), {
  isQuota: true,
  httpStatus: 429,
  retryAfterSec: 0,
  classification: { kind: 'quota', perMinute: true, perDay: false },
});

describe('Blueprint provider retry policy', () => {
  it('retries one explicit per-minute failure and records two attempts on recovery', async () => {
    const steps = [];
    const generate = vi.fn()
      .mockRejectedValueOnce(minuteLimit())
      .mockResolvedValueOnce({ id: 'analysis-ok', type: 'analysis', data: {} });
    const result = await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: generate,
      historyOverride: [],
      onStep: step => steps.push(step),
      warnLog: () => {},
    });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(1);
    const landed = steps.find(step => step.status === 'landed');
    expect(landed.variantResults[0]).toMatchObject({ status: 'landed', attempts: 2 });
  });

  it.each([
    ['daily quota', Object.assign(new Error('RESOURCE_EXHAUSTED: requests per day'), { isQuota: true, httpStatus: 429, classification: { kind: 'quota', perDay: true } })],
    ['authentication', Object.assign(new Error('API_AUTH_FAILED'), { isAuth: true, httpStatus: 401 })],
    ['configuration', Object.assign(new Error('API_MODEL_NOT_FOUND'), { isConfig: true, httpStatus: 404 })],
  ])('fails fast for %s without issuing an outer retry', async (_label, error) => {
    const generate = vi.fn(async () => { throw error; });
    await expect(PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: generate, historyOverride: [], warnLog: () => {},
    })).rejects.toBe(error);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('stores privacy-safe provider fields when a per-minute retry is exhausted', async () => {
    const secret = 'SENTINEL_STUDENT_AND_KEY';
    const steps = [];
    const generate = vi.fn(async () => { throw minuteLimit('rate limit for Bearer ' + secret); });
    await expect(PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: generate,
      historyOverride: [],
      onStep: step => steps.push(step),
      warnLog: () => {},
    })).rejects.toThrow();
    expect(generate).toHaveBeenCalledTimes(2);
    const failed = steps.find(step => step.status === 'failed');
    const fields = failed.variantResults[0].providerError;
    expect(fields).toMatchObject({
      schemaVersion: 1,
      kind: 'rate-limit',
      category: 'transient',
      retryable: true,
      quotaScope: 'minute',
      httpStatus: 429,
      retryAfterMs: 0,
    });
    expect(JSON.stringify(fields)).not.toContain(secret);
    expect(fields).not.toHaveProperty('message');
    expect(fields).not.toHaveProperty('url');
  });
});
