#!/usr/bin/env node
/**
 * Import Project Gutenberg catalog cards into the open reading catalog.
 *
 * This creates metadata-only reader cards, not full-text mirrors. Each card
 * links to the official Project Gutenberg ebook page and records the PG
 * license page. Gutendex is used only as a JSON metadata index.
 *
 * Usage:
 *   node reading_library/import_gutenberg_cards.js --target 500
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const OPEN_CATALOG_PATH = path.join(ROOT, 'open_catalog.json');
const GUTENDEX = 'https://gutendex.com/books/';
const PG_LICENSE = 'https://www.gutenberg.org/policy/license.html';

const targetIdx = process.argv.indexOf('--target');
const TARGET = targetIdx !== -1 ? Number(process.argv[targetIdx + 1]) : 500;
const dryRun = process.argv.includes('--dry-run');

const TOPICS = [
  'non-fiction',
  'history',
  'science',
  'biography',
  'travel',
  'nature',
  'education',
  'philosophy',
  'politics',
  'economics',
  'mathematics',
  'astronomy',
  'geology',
  'medicine',
  'technology',
  'essays',
  'united states',
  'world war',
  'civil war',
  'social sciences',
];

const BANNED = [
  'erotic',
  'pornography',
  'sexual',
  'sex instruction',
  'aphrodisiac',
  'incest',
  'sadism',
  'masochism',
  'rape',
  'horror',
  'ghost stories',
  'detective',
  'murder',
  'true crime',
  'racist',
];

const FICTION_MARKERS = [
  'fiction',
  'drama',
  'plays',
  'poetry',
  'love stories',
  'science fiction',
  'short stories',
  'ghost stories',
  'detective and mystery',
  'adventure stories',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'untitled';
}

function compact(s) {
  return String(s || '')
    .replace(/\s*:\s*\$[a-z]\s*/gi, ': ')
    .replace(/\s+\$[a-z]\s*/gi, ' ')
    .replace(/\s+([:;,.])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean).length;
}

function authorName(person) {
  return compact(person && person.name) || 'Project Gutenberg';
}

function sentenceList(items, max) {
  const clean = (items || []).map(compact).filter(Boolean);
  return clean.slice(0, max).join('; ');
}

function hasAny(text, needles) {
  const hay = String(text || '').toLowerCase();
  return needles.some((needle) => hay.includes(needle));
}

function looksUsefulForOlderStudents(book) {
  if (!book || book.copyright !== false) return false;
  if (!Array.isArray(book.languages) || !book.languages.includes('en')) return false;
  if (!book.formats || !Object.keys(book.formats).some((k) => /^text\/html/.test(k) || /^text\/plain/.test(k))) return false;
  const title = compact(book.title);
  if (!title || title.length < 4) return false;
  const metadata = [title].concat(book.subjects || [], book.bookshelves || []).join(' ');
  if (hasAny(metadata, BANNED)) return false;
  if (/^(index|catalogue|catalog|notes and queries)/i.test(title)) return false;
  if (/project gutenberg/i.test(title) && /catalog|index|newsletter/i.test(title)) return false;

  const hasNonfictionSignal = hasAny(metadata, [
    'non-fiction',
    'history',
    'science',
    'biography',
    'travel',
    'description and travel',
    'education',
    'philosophy',
    'political science',
    'economics',
    'mathematics',
    'astronomy',
    'geology',
    'medicine',
    'technology',
    'social sciences',
    'essays',
    'natural history',
    'nature',
    'civil war',
    'world war',
    'united states',
  ]);

  if (hasNonfictionSignal) return true;
  return !hasAny(metadata, FICTION_MARKERS);
}

function makeCard(book) {
  const title = compact(book.title);
  const authors = (book.authors || []).map(authorName).filter(Boolean);
  const byline = authors.length ? ' by ' + authors.join(', ') : '';
  const subjects = (book.subjects && book.subjects.length ? book.subjects : book.bookshelves || [])
    .map(compact)
    .filter(Boolean)
    .slice(0, 6);
  const subjectLine = subjects.length ? sentenceList(subjects, 4) : 'public-domain reading';
  const slug = 'gutenberg-ebook-' + book.id + '-' + slugify(title);
  const pages = [
    {
      n: 1,
      img: null,
      text: 'Project Gutenberg catalog record for "' + title + '"' + byline + '. Metadata tags include: ' + subjectLine + '.',
    },
    {
      n: 2,
      img: null,
      text: 'This reader entry is a source card, not a full-text mirror. Use the official Project Gutenberg link for HTML, EPUB, Kindle, or plain-text reading options.',
    },
    {
      n: 3,
      img: null,
      text: 'Teacher note: public-domain texts can preserve historical language, assumptions, and viewpoints. Preview the full ebook before assigning it to students.',
    },
  ];
  return {
    schema: 'allo-reading-book@1',
    slug,
    title,
    description: 'A Project Gutenberg public-domain catalog card for older-student reading and research.',
    language: 'English',
    langCode: 'en',
    isRtl: false,
    level: '6',
    orientation: 'portrait',
    sourceId: 'gutenberg',
    contentType: 'public-domain-catalog-card',
    subjects: subjects.length ? subjects : ['Project Gutenberg', 'Public domain'],
    authors: authors.length ? authors : ['Project Gutenberg'],
    illustrators: [],
    originalAuthors: [],
    publisher: 'Project Gutenberg',
    license: 'Public Domain in the U.S. / Project Gutenberg License',
    licenseUrl: PG_LICENSE,
    source: {
      id: 'gutenberg',
      name: 'Project Gutenberg',
      url: 'https://www.gutenberg.org/ebooks/' + book.id,
    },
    cover: null,
    audio: null,
    pages,
    stats: {
      pages: pages.length,
      words: pages.reduce((sum, page) => sum + words(page.text), 0),
    },
  };
}

async function getJson(url, attempt) {
  attempt = attempt || 1;
  try {
    const raw = execFileSync('curl', [
      '-s',
      '--fail',
      '--max-time',
      '30',
      '-H',
      'Accept: application/json',
      '-H',
      'User-Agent: AlloFlow reading library metadata importer',
      url,
    ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return JSON.parse(raw);
  } catch (err) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return getJson(url, attempt + 1);
    }
    throw new Error('Could not fetch ' + url + ': ' + String(err.message || err).slice(0, 160));
  }
}

function urlFor(topic, page) {
  const url = new URL(GUTENDEX);
  url.searchParams.set('languages', 'en');
  url.searchParams.set('copyright', 'false');
  url.searchParams.set('mime_type', 'text/html');
  url.searchParams.set('sort', 'popular');
  if (topic) url.searchParams.set('topic', topic);
  if (page > 1) url.searchParams.set('page', String(page));
  return url.toString();
}

async function collectBooks(existingIds, need) {
  const picked = [];
  const seen = new Set(existingIds);
  const passes = TOPICS.concat(['']);
  for (const topic of passes) {
    let consecutiveFailures = 0;
    for (let page = 1; page <= 40 && picked.length < need; page++) {
      let data;
      try {
        data = await getJson(urlFor(topic, page));
        consecutiveFailures = 0;
      } catch (err) {
        consecutiveFailures += 1;
        console.warn('WARN skipping Gutendex page for topic "' + (topic || 'general') + '" page ' + page + ': ' + err.message);
        if (consecutiveFailures >= 2) break;
        continue;
      }
      const results = data.results || [];
      if (!results.length) break;
      for (const book of results) {
        if (picked.length >= need) break;
        if (seen.has(book.id)) continue;
        if (!looksUsefulForOlderStudents(book)) continue;
        seen.add(book.id);
        picked.push(book);
        if (picked.length % 25 === 0 || picked.length === need) {
          console.log('Selected ' + picked.length + '/' + need + ' Gutenberg records...');
        }
      }
      if (!data.next) break;
      await sleep(125);
    }
    if (picked.length >= need) break;
  }
  return picked;
}

async function main() {
  if (!Number.isFinite(TARGET) || TARGET < 1) throw new Error('Invalid --target');
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  const catalog = readJson(OPEN_CATALOG_PATH);
  const items = catalog.items || [];
  if (items.length >= TARGET) {
    console.log('Open catalog already has ' + items.length + ' items; target is ' + TARGET + '.');
    return;
  }

  const existingIds = new Set();
  const existingSlugs = new Set(items.map((item) => item.slug));
  for (const item of items) {
    const m = /^gutenberg-ebook-(\d+)-/.exec(item.slug || '');
    if (m) existingIds.add(Number(m[1]));
  }

  const need = TARGET - items.length;
  console.log('Need ' + need + ' Project Gutenberg cards to reach ' + TARGET + ' open catalog entries.');
  const books = await collectBooks(existingIds, need);
  if (books.length < need) {
    throw new Error('Only found ' + books.length + ' usable records; need ' + need + '.');
  }

  const newItems = [];
  for (const book of books) {
    const card = makeCard(book);
    if (existingSlugs.has(card.slug)) continue;
    const file = 'books/' + card.slug + '.json';
    if (!dryRun) writeJson(path.join(ROOT, file), card);
    existingSlugs.add(card.slug);
    newItems.push({ slug: card.slug, file });
  }

  if (!dryRun) {
    catalog.items = items.concat(newItems).slice(0, TARGET);
    writeJson(OPEN_CATALOG_PATH, catalog);
  }
  console.log((dryRun ? 'Would add ' : 'Added ') + newItems.length + ' Project Gutenberg cards.');
  console.log('Open catalog target: ' + TARGET + '.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
