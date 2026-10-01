import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

describe('eligibility source maintenance check', () => {
  it('passes the deterministic source, freshness, coverage, and mirror checks', () => {
    expect(() => execFileSync(
      process.execPath,
      ['dev-tools/check_eligibility_sources.cjs', '--quiet'],
      { cwd: root, encoding: 'utf8' }
    )).not.toThrow();
  });

  it('keeps every official link on an approved HTTPS host', () => {
    const source = readFileSync(resolve(root, 'stem_lab/stem_tool_eligibility.js'), 'utf8');
    const block = source.slice(source.indexOf('var OFFICIAL_SOURCES = ['), source.indexOf('  ];', source.indexOf('var OFFICIAL_SOURCES = [')));
    const urls = [...block.matchAll(/href: '([^']+)'/g)].map((match) => new URL(match[1]));
    expect(urls.length).toBeGreaterThanOrEqual(10);
    expect(urls.every((url) => url.protocol === 'https:' && ['sites.ed.gov', 'www.ecfr.gov', 'www.ed.gov'].includes(url.hostname))).toBe(true);
  });
});

