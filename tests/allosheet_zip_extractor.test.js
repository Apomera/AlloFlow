import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  resolveWindowsTarPath,
  validateArchiveListing,
} = require(resolve(process.cwd(), 'desktop', 'runtime', 'allosheet-zip-extractor.cjs'));

describe('AlloSheet pinned ZIP extractor', () => {
  it('resolves the Windows system tar without invoking a shell', () => {
    expect(resolveWindowsTarPath({ SystemRoot: 'C:\\Windows' }))
      .toBe('C:\\Windows\\System32\\tar.exe');
    expect(() => resolveWindowsTarPath({ SystemRoot: 'relative' })).toThrow(/system directory/i);
  });

  it('validates every listed archive entry through the manager resolver', () => {
    const resolveEntryPath = vi.fn((entry) => {
      if (entry.includes('..')) throw new Error('unsafe');
      return `C:\\stage\\${entry}`;
    });
    expect(validateArchiveListing(
      'Grist Desktop.exe\r\nresources/app.asar\r\nresources/locales/\r\n',
      { resolveEntryPath, maxEntries: 10 },
    )).toBe(3);
    expect(resolveEntryPath).toHaveBeenNthCalledWith(3, 'resources/locales');
    expect(() => validateArchiveListing('../escape.exe\n', {
      resolveEntryPath,
      maxEntries: 10,
    })).toThrow(/unsafe/i);
  });

  it('enforces a bounded, non-empty listing', () => {
    const resolver = vi.fn();
    expect(() => validateArchiveListing('', { resolveEntryPath: resolver, maxEntries: 2 }))
      .toThrow(/no entries/i);
    expect(() => validateArchiveListing('one\ntwo\nthree\n', {
      resolveEntryPath: resolver,
      maxEntries: 2,
    })).toThrow(/too many/i);
  });
});
