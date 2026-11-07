// t('stem.x.y') with no English returns the raw key whenever the strings have not loaded: a first visit before the
// deferred fetch finishes, a school filter blocking it, or offline. Students saw "stem.galaxy.barred_spiral" as a label.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const BARE = /\b(?:t|__alloT|__t|_t|tr)\(\s*'stem\.[A-Za-z0-9_.]+'\s*\)/g;
const tools = fs.readdirSync('stem_lab').filter((n) => /^stem_tool_.*\.js$/.test(n));

describe('STEM tools always give English with a translation key', () => {
  it('found the tools', () => { expect(tools.length).toBeGreaterThan(100); });
  it.each(tools)('%s', (name) => {
    const hits = fs.readFileSync(`stem_lab/${name}`, 'utf8').match(BARE) || [];
    expect(hits.slice(0, 5)).toEqual([]);
  });
});
