import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = resolve(process.cwd());
const LIB = path.join(ROOT, 'reading_library');
const index = JSON.parse(fs.readFileSync(path.join(LIB, 'index.json'), 'utf8'));
const cardIndex = JSON.parse(fs.readFileSync(path.join(LIB, 'index_cards.json'), 'utf8'));
const entries = index.books.concat(cardIndex.books);
const importer = require(path.join(LIB, 'import_extended_catalog_sources.js'));

const PROVIDERS = new Set([
  'open-textbook-library',
  'wikibooks',
  'core-knowledge',
  'pressbooks',
  'standard-ebooks',
  'book-dash',
  'oapen',
  'doab',
  'mit-ocw',
  'ncbi-bookshelf',
]);
const extended = entries.filter((entry) => PROVIDERS.has(entry.sourceId));

function readBook(entry) {
  return JSON.parse(fs.readFileSync(path.join(LIB, entry.file), 'utf8'));
}

describe('extended reading source catalog', () => {
  it('publishes the complete OTL metadata snapshot and curated discovery sources', () => {
    const counts = Object.fromEntries([...PROVIDERS].map((provider) => [
      provider,
      extended.filter((entry) => entry.sourceId === provider).length,
    ]));
    expect(counts['open-textbook-library']).toBeGreaterThanOrEqual(1000);
    expect(counts.wikibooks).toBe(50);
    expect(counts['core-knowledge']).toBe(4);
    for (const provider of [
      'pressbooks',
      'standard-ebooks',
      'oapen',
      'doab',
      'mit-ocw',
      'ncbi-bookshelf',
    ]) {
      expect(counts[provider]).toBe(1);
    }
    expect(counts['book-dash']).toBeGreaterThanOrEqual(1001);
  });

  it('keeps the original discovery hubs link-only and outside mirroring and AI workflows', () => {
    const discoveryHubs = extended.filter((entry) => !/^book-dash-\d+-/.test(entry.slug));
    expect(discoveryHubs.length).toBeGreaterThanOrEqual(1061);
    for (const entry of discoveryHubs) {
      const book = readBook(entry);
      expect(book.usagePolicy).toMatchObject({
        access: 'link-only',
        mirror: false,
        adapt: false,
        ai: false,
        commercial: false,
      });
      expect(book.pages).toHaveLength(3);
      expect(book.pages.every((page) => page.img === null)).toBe(true);
      expect(book.source.url).toMatch(/^https:\/\//);
      expect(book.licenseAudit.source).toMatch(/^https:\/\//);
    }
  });

  it('records OTL CC0 metadata separately from each linked title license', () => {
    const otl = extended.filter((entry) => entry.sourceId === 'open-textbook-library');
    for (const entry of otl) {
      const book = readBook(entry);
      expect(book.externalRecordId).toMatch(/^\d+$/);
      expect(book.source.url).toMatch(/^https:\/\/open\.umn\.edu\/opentextbooks\/textbooks\//);
      expect(book.usagePolicy.metadataLicense).toBe('CC0 1.0');
      expect(book.usagePolicy.linkedContentLicense).toBeTruthy();
      expect(book.language).toBe('Not specified');
      expect(book.langCode).toBe('und');
    }
  });

  it('pins every featured Wikibooks card to an exact attributed revision', () => {
    const wikibooks = extended.filter((entry) => entry.sourceId === 'wikibooks');
    expect(wikibooks).toHaveLength(50);
    for (const entry of wikibooks) {
      const book = readBook(entry);
      expect(book.pinnedRevision).toMatch(/^\d+$/);
      expect(book.source.url).toMatch(/[?&]oldid=\d+$/);
      expect(book.usagePolicy.pinnedRevision).toBe(book.pinnedRevision);
      expect(book.license).toMatch(/CC BY-SA 4\.0/);
    }
  });

  it('parses quoted OTL CSV records and confines alternate catalog outputs', () => {
    expect(importer.parseCsv('A,B\n1,"two, ""quoted"" words"\n')).toEqual([
      ['A', 'B'],
      ['1', 'two, "quoted" words'],
    ]);
    expect(importer.catalogOutputPath(['--catalog-output', 'catalog-test.json']))
      .toBe(path.join(LIB, 'catalog-test.json'));
    expect(() => importer.catalogOutputPath(['--catalog-output', '../outside.json'])).toThrow();
  });
});
