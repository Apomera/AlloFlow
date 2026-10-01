import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const LIB = path.join(ROOT, 'reading_library');
const index = JSON.parse(fs.readFileSync(path.join(LIB, 'index.json'), 'utf8'));
const cards = JSON.parse(fs.readFileSync(path.join(LIB, 'index_cards.json'), 'utf8'));
const openRn = index.books.filter((entry) => entry.sourceId === 'open-rn');
const bookDash = cards.books.filter((entry) => entry.sourceId === 'book-dash' && /^book-dash-\d+-/.test(entry.slug));

function readBook(entry) {
  return JSON.parse(fs.readFileSync(path.join(LIB, entry.file), 'utf8'));
}

function digest(value) {
  return 'sha256:' + crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

describe('Open RN accessible mirrors', () => {
  it('publishes chapters from all five selected second-edition textbooks', () => {
    const families = [
      'nursing-fundamentals-2e',
      'nursing-skills-2e',
      'nursing-pharmacology-2e',
      'mental-health-community-concepts-2e',
      'nursing-management-professional-concepts-2e'
    ];
    expect(openRn.length).toBeGreaterThanOrEqual(50);
    for (const family of families) {
      expect(openRn.some((entry) => entry.slug.startsWith('open-rn-' + family + '-chapter-'))).toBe(true);
    }
  });

  it('keeps CC BY attribution, canonical sources, text digests, and the clinical notice', () => {
    for (const entry of openRn) {
      expect(entry.contentType).toBe('open-textbook-chapter');
      expect(entry.license).toBe('CC BY 4.0');
      const book = readBook(entry);
      expect(book.source.attributionUrl).toMatch(/^https:\/\/www\.ncbi\.nlm\.nih\.gov\/books\/NBK\d+\/$/);
      expect(book.source.url).toMatch(/^https:\/\/www\.ncbi\.nlm\.nih\.gov\/books\/NBK\d+\/$/);
      expect(book.usagePolicy).toMatchObject({
        access: 'mirrored',
        mirror: true,
        adapt: true,
        ai: true,
        commercial: true,
        attributionRequired: true,
        shareAlike: false
      });
      expect(book.usagePolicy.auditSource).toBe('https://www.cvtc.edu/grants/open-rn');
      expect(book.medicalNotice).toMatch(/Educational material only/i);
      expect(book.pages.length).toBeGreaterThan(0);
      expect(book.stats.words).toBeGreaterThan(200);
      expect(book.pages.every((page) =>
        page.img === null &&
        page.sourceWordCount > 40 &&
        page.sourceDigest === digest(page.text) &&
        /^https:\/\/www\.ncbi\.nlm\.nih\.gov\/books\/NBK\d+\//.test(page.sourceUrl)
      )).toBe(true);
      expect(book.mirror.contentDigest).toBe(digest(book.pages.map((page) => page.sourceDigest).join('\n')));
    }
  });
});

describe('Book Dash full public catalog', () => {
  it('publishes every current edition as a lazy, attributed discovery record', () => {
    expect(bookDash.length).toBeGreaterThanOrEqual(1000);
    for (const entry of bookDash) {
      expect(entry.contentType).toBe('open-access-source-card');
      expect(entry.license).toBe('CC BY 4.0');
      const book = readBook(entry);
      expect(book.language).toBeTruthy();
      expect(book.cover?.card).toMatch(/^https:\/\/bookdash\.org\//);
      expect(book.contributors.length).toBeGreaterThan(0);
      expect(book.source.url).toMatch(/^https:\/\/bookdash\.org\/books\//);
      expect(book.source.sourceFilesUrl).toMatch(/^https:\/\/bookdash\.org\/book-source-files\/\?book=/);
      expect(book.usagePolicy).toMatchObject({
        access: 'link-only',
        mirror: false,
        adapt: true,
        ai: true,
        commercial: true,
        attributionRequired: true
      });
      expect(book.pages).toHaveLength(3);
      expect(book.pages[1].text).toMatch(/Creator attribution:/);
      expect(book.pages[2].text).toMatch(/discovery record, not a flattened copy/i);
    }
  });
});
