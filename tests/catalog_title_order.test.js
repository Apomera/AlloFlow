// Community Catalog · entries are listed in numeric-aware title order.
//
// The manifest was sorted with a plain localeCompare, so the 12 Crew Launch packs would have listed
// as Week 1, 10, 11, 12, 2, 3 ... The catalog UI keeps manifest order (it only lifts in-progress
// modules above the rest), so the generator's sort is what a teacher sees. Found 2026-09-22 while
// dry-running the Crew publish.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
// CATALOG_GEN_PATH points the suite at a copy of the generator for mutation runs.
const gen = req(process.env.CATALOG_GEN_PATH || '../catalog/generate_index.js');
const crewTitles = readdirSync(resolve(process.cwd(), 'allopacks'))
  .filter((f) => /^crew_.*\.allopack\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(resolve(process.cwd(), 'allopacks', f), 'utf8')).allopack.title);

describe('catalog title order', () => {
  it('compares numbers inside titles as numbers', () => {
    expect(gen.compareTitles('Crew Launch Week 2: Repair', 'Crew Launch Week 10: The Six-Week Check')).toBeLessThan(0);
    expect(gen.compareTitles('Grade 9 Algebra', 'Grade 10 Algebra')).toBeLessThan(0);
    expect(gen.compareTitles('Apples', 'Bananas')).toBeLessThan(0);
    expect(gen.compareTitles('Same', 'Same')).toBe(0);
  });

  it('lists the twelve Crew Launch weeks 1 to 12', () => {
    expect(crewTitles).toHaveLength(12);
    const weeks = crewTitles.slice().sort(gen.compareTitles).map((t) => Number(t.match(/Week (\d+)/)[1]));
    expect(weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('the manifest the generator builds is in that order', () => {
    const entries = gen.buildManifest().entries;
    expect(entries.length).toBeGreaterThan(10);
    const outOfOrder = entries.slice(1).filter((e, i) => gen.compareTitles(entries[i].title, e.title) > 0).map((e) => e.title);
    expect(outOfOrder).toEqual([]);
  });
});
