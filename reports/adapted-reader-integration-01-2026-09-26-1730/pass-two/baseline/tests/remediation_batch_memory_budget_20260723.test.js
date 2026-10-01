import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'view_educator_hub_modal_source.jsx'), 'utf8');
const start = source.indexOf('function _educatorBatchMemoryBudget()');
const end = source.indexOf('function EducatorHubModal', start);
if (start < 0 || end <= start) throw new Error('Could not extract educator batch memory policy');
const body = source.slice(start, end);
const budgetFor = (navigatorValue) => new Function(
  'navigator',
  `${body}\nreturn _educatorBatchMemoryBudget();`,
)(navigatorValue);

const mb = 1024 * 1024;

describe('device-adaptive remediation batch memory budget', () => {
  it('uses a conservative fallback when device memory is unavailable', () => {
    expect(budgetFor(undefined)).toEqual({ perFileBytes: 64 * mb, totalBytes: 96 * mb });
  });

  it('protects low-memory classroom devices', () => {
    expect(budgetFor({ deviceMemory: 1 })).toEqual({ perFileBytes: 48 * mb, totalBytes: 48 * mb });
    expect(budgetFor({ deviceMemory: 2 })).toEqual({ perFileBytes: 48 * mb, totalBytes: 48 * mb });
  });

  it('caps high-memory devices instead of restoring the unsafe 300 MB queue', () => {
    expect(budgetFor({ deviceMemory: 4 })).toEqual({ perFileBytes: 64 * mb, totalBytes: 96 * mb });
    expect(budgetFor({ deviceMemory: 8 })).toEqual({ perFileBytes: 64 * mb, totalBytes: 128 * mb });
    expect(budgetFor({ deviceMemory: 32 })).toEqual({ perFileBytes: 64 * mb, totalBytes: 128 * mb });
  });
});
