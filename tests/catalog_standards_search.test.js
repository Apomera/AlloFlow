import { beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// Standards travel pack -> catalog index -> in-app search and library page, and
// community submitters can now record standards and choose a non-commercial license.
const require = createRequire(import.meta.url);
const { parseStandards, shortStandardCode } = require('../catalog/allopack_entry');
const win = { React: {}, AlloModules: {} };
new Function('window', fs.readFileSync('catalog_module.js', 'utf8'))(win);
const catalog = win.AlloModules.CommunityCatalog;
const matches = catalog._catalogEntryMatches;
const entryWith = (...codes) => ({ title: 'A lesson', tags: [], standards: codes.map(code => ({ code })) });

describe('parseStandards', () => {
  it('splits on top-level semicolons only and keeps the gloss', () => {
    expect(parseStandards('CASEL Relationship Skills (communicating effectively; seeking help); NGSS MS-LS1-1 (cells)')).toEqual([
      { code: 'CASEL Relationship Skills', description: 'communicating effectively; seeking help' },
      { code: 'NGSS MS-LS1-1', description: 'cells' },
    ]);
  });
  it('accepts bare codes, arrays and junk', () => {
    expect(parseStandards('CCSS.ELA-LITERACY.SL.6.1')).toEqual([{ code: 'CCSS.ELA-LITERACY.SL.6.1' }]);
    expect(parseStandards(['RI.6.8 (trace an argument)', 42])).toEqual([{ code: 'RI.6.8', description: 'trace an argument' }]);
    expect(parseStandards(null)).toEqual([]);
    expect(parseStandards(' ; ')).toEqual([]);
  });
  it('shortens common prefixes for display', () => {
    expect(shortStandardCode('CCSS.ELA-LITERACY.SL.6.1.A')).toBe('SL.6.1.A');
    expect(shortStandardCode('CCSS.MATH.CONTENT.6.RP.A.1')).toBe('6.RP.A.1');
    expect(shortStandardCode('C3 Framework D2.Civ.1.K-2')).toBe('D2.Civ.1.K-2');
    expect(shortStandardCode('NGSS MS-LS1-1')).toBe('MS-LS1-1');
  });
});

describe('catalog search by standard', () => {
  it('matches a code and its sub-standards, case-insensitively', () => {
    expect(matches(entryWith('CCSS.ELA-LITERACY.SL.6.1.A'), { search: 'SL.6.1' })).toBe(true);
    expect(matches(entryWith('CCSS.ELA-LITERACY.SL.6.1'), { search: 'sl.6.1' })).toBe(true);
    expect(matches(entryWith('NGSS MS-LS1-1'), { search: 'MS-LS1-1' })).toBe(true);
    expect(matches(entryWith('CCSS.MATH.CONTENT.6.RP.A.1'), { search: '6.RP.A.1' })).toBe(true);
  });
  it('never matches a longer number or stitched-together fragments', () => {
    expect(matches(entryWith('CCSS.ELA-LITERACY.SL.6.10'), { search: 'SL.6.1' })).toBe(false);
    expect(matches(entryWith('CCSS.ELA-LITERACY.SL.6.4', 'CCSS.ELA-LITERACY.RI.6.1'), { search: 'SL.6.1' })).toBe(false);
    expect(matches(entryWith('CCSS.ELA-LITERACY.SL.6.1'), { search: 'SL.7.1' })).toBe(false);
  });
  it('still finds framework words and leaves ordinary searches alone', () => {
    expect(matches(entryWith('NGSS MS-LS1-1'), { search: 'ngss' })).toBe(true);
    expect(matches({ title: 'Grade 3-5 maps', tags: [] }, { search: '3-5' })).toBe(true);
    expect(matches({ title: 'No standards', tags: [], standards: 'not an array' }, { search: 'SL.6.1' })).toBe(false);
  });
  it('keeps other filters in force', () => {
    expect(matches({ ...entryWith('CCSS.ELA-LITERACY.SL.6.1'), subject: 'Math' }, { search: 'SL.6.1', subject: 'Science' })).toBe(false);
  });
  it('summarises up to four short codes with the full list on hover', () => {
    const s = catalog._catalogStandardsSummary(entryWith('CCSS.ELA-LITERACY.SL.6.1', 'CCSS.ELA-LITERACY.SL.6.1.A', 'CCSS.ELA-LITERACY.SL.6.1.B', 'CCSS.ELA-LITERACY.SL.6.1.C', 'CCSS.ELA-LITERACY.SL.6.1.D'));
    expect(s.text).toBe('SL.6.1, SL.6.1.A, SL.6.1.B, SL.6.1.C +1');
    expect(s.title.split('\n')).toHaveLength(5);
    expect(catalog._catalogStandardsSummary({ title: 'none' })).toBeNull();
  });
});

describe('the real catalog index', () => {
  const entries = JSON.parse(fs.readFileSync('catalog/index.json', 'utf8')).entries;
  it('carries parsed standards for every pack whose file lists them', () => {
    for (const entry of entries) {
      const pack = JSON.parse(fs.readFileSync(entry.path, 'utf8').replace(/^﻿/, ''));
      expect(entry.standards || [], entry.path).toEqual(parseStandards(pack.allopack.standards));
    }
  });
  it('finds the three Novak-informed packs by SL.6.1 and keeps them under review until Katie agrees', () => {
    const novak = entries.filter(e => /\/(?:academic_discourse_reading_space|academic_discourse_more_practice|reading_decisions)_grade6\.allopack\.json$/.test(e.path));
    expect(novak).toHaveLength(3);
    for (const e of novak) {
      expect(matches(e, { search: 'SL.6.1' }), e.path).toBe(true);
      expect(e.license, e.path).toBe('Not specified');
      expect(e.review_status, e.path).toMatch(/review pending/i);
    }
  });
  it('makes codes searchable on the public library page', () => {
    const library = fs.readFileSync('library.html', 'utf8');
    expect(library).toMatch(/data-pack-search="[^"]*CCSS\.ELA-LITERACY\.SL\.6\.1[^"]*"/);
    expect(library).toContain('<p class="pack-standards"><strong>Standards:</strong>');
  });
});

describe('community submissions', () => {
  let worker;
  beforeAll(async () => {
    worker = (await import(pathToFileURL(path.resolve('catalog/cloudflare-worker/src/index.js')).href)).default;
  });
  const submit = metadata => worker.fetch(new Request('https://worker.test/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lesson_payload: { mode: 'teacher', history: [] },
      metadata: { title: 'Test lesson', subject: 'Science', grade_level: '6', ...metadata },
      affirmations: { author_or_authorized: true, no_pii: true, license_agreed: true, age_eligible: true },
    }),
  }), { GITHUB_PAT: 'test-token-not-used' }, { waitUntil() {} });
  const errorOf = async response => (await response.json()).error || '';

  it('accepts both non-commercial licenses and rejects unknown ones', async () => {
    for (const license of ['CC-BY-NC-SA-4.0', 'CC-BY-NC-4.0']) {
      // A bad standards value is checked AFTER the license, so this error proves the license passed.
      expect(await errorOf(await submit({ license, standards: 42 }))).toMatch(/metadata\.standards/);
    }
    expect(await errorOf(await submit({ license: 'CC-BY-ND-4.0' }))).toMatch(/metadata\.license/);
  });
  it('limits standards to text of 2000 characters', async () => {
    expect(await errorOf(await submit({ license: 'CC-BY-4.0', standards: 'x'.repeat(2001) }))).toMatch(/metadata\.standards/);
    vi.restoreAllMocks();
  });
  it('offers the same licenses in the submission form', () => {
    const src = fs.readFileSync('catalog_module.js', 'utf8');
    for (const license of ['CC-BY-NC-SA-4.0', 'CC-BY-NC-4.0']) expect(src).toContain(`value: '${license}'`);
    expect(src).toContain("standards: meta.standards.trim() || null");
  });
});
