#!/usr/bin/env node
/**
 * Mirror the five selected Open RN second-edition textbooks from their current
 * NCBI Bookshelf editions. One AlloFlow book is created per source chapter,
 * with one reader page per numbered top-level section. Figures and interface
 * material are deliberately excluded because individual figures can carry
 * separate licenses.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const CATALOG_PATH = path.join(ROOT, 'open_catalog.json');
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';
const AUDIT_URL = 'https://www.cvtc.edu/grants/open-rn';
const USER_AGENT = 'AlloFlow Open RN accessibility mirror';
const TEXTBOOKS = [
  {
    slug: 'nursing-fundamentals-2e',
    root: 'https://www.ncbi.nlm.nih.gov/books/NBK610815/',
    subjects: ['Nursing', 'Nursing fundamentals', 'Clinical practice', 'Open textbooks']
  },
  {
    slug: 'nursing-skills-2e',
    root: 'https://www.ncbi.nlm.nih.gov/books/NBK596735/',
    subjects: ['Nursing', 'Clinical skills', 'Patient care', 'Open textbooks']
  },
  {
    slug: 'nursing-pharmacology-2e',
    root: 'https://www.ncbi.nlm.nih.gov/books/NBK595000/',
    subjects: ['Nursing', 'Pharmacology', 'Medication safety', 'Open textbooks']
  },
  {
    slug: 'mental-health-community-concepts-2e',
    root: 'https://www.ncbi.nlm.nih.gov/books/NBK616982/',
    subjects: ['Nursing', 'Mental health', 'Community health', 'Open textbooks']
  },
  {
    slug: 'nursing-management-professional-concepts-2e',
    root: 'https://www.ncbi.nlm.nih.gov/books/NBK610445/',
    subjects: ['Nursing', 'Management', 'Professional practice', 'Open textbooks']
  }
];

function loadJsdom() {
  return require(require.resolve('jsdom', {
    paths: [path.join(ROOT, '..', 'desktop/web-app', 'node_modules')]
  })).JSDOM;
}

function clean(value) {
  return String(value || '')
    .replace(/\u00ad|\u200b|\u200c|\u200d/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function words(value) {
  return clean(value).split(/\s+/).filter(Boolean).length;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
}

function catalogOutputPath() {
  const requested = valueAfter('--catalog-output');
  if (!requested) return CATALOG_PATH;
  const resolved = path.resolve(ROOT, requested);
  if (path.dirname(resolved) !== ROOT || path.extname(resolved).toLowerCase() !== '.json') {
    throw new Error('--catalog-output must be a JSON filename inside reading_library/');
  }
  return resolved;
}

function assertNcbiUrl(value) {
  const parsed = new URL(String(value || ''));
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'www.ncbi.nlm.nih.gov' || !/^\/books\//.test(parsed.pathname)) {
    throw new Error('Refusing non-NCBI Bookshelf URL: ' + value);
  }
  return parsed.href;
}

function fetchHtml(url) {
  return execFileSync('curl.exe', [
    '-sSL', '--fail', '--max-time', '60',
    '--retry', '5', '--retry-delay', '1', '--retry-all-errors',
    '-A', USER_AGENT,
    '-H', 'Accept: text/html,application/xhtml+xml',
    assertNcbiUrl(url)
  ], { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024 });
}

function metaValues(doc, name) {
  return Array.from(doc.querySelectorAll('meta[name="' + name + '"]'))
    .map((node) => clean(node.getAttribute('content'))).filter(Boolean);
}

function rootInfo(html, rootUrl, JSDOM) {
  const doc = new JSDOM(html, { url: rootUrl }).window.document;
  const title = clean(doc.querySelector('meta[name="citation_title"]')?.content ||
    doc.querySelector('.main-content h1')?.textContent);
  const seen = new Set();
  const chapters = [];
  for (const anchor of doc.querySelectorAll('.toc a[href]')) {
    const raw = anchor.getAttribute('href');
    const url = new URL(raw, rootUrl);
    url.hash = '';
    url.search = '';
    if (url.hostname !== 'www.ncbi.nlm.nih.gov' || !/^\/books\/n\/[^/]+\/[^/]+\/$/.test(url.pathname)) continue;
    const label = clean(anchor.textContent);
    if (!/^(PART\s+[IVXLCDM\d]+[.\s]|Chapter\s+\d+[.\s])/i.test(label)) continue;
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    chapters.push({ label, url: url.href });
  }
  if (!title || !chapters.length) throw new Error('Could not identify Open RN title/chapters at ' + rootUrl);
  return { title, chapters };
}

function hasExpectedLicense(doc) {
  const bodyText = clean(doc.body?.textContent);
  const hasLinkedLicense = Array.from(doc.querySelectorAll('a[href]')).some((anchor) =>
    /creativecommons\.org\/licenses\/by\/4\.0\/?/i.test(String(anchor.getAttribute('href') || ''))
  );
  const hasExactFooter = /licensed under a Creative Commons Attribution 4\.0 International License/i.test(bodyText);
  return (hasLinkedLicense || hasExactFooter) && /Open Resources for Nursing|Open RN/i.test(bodyText);
}

function blockText(node) {
  const clone = node.cloneNode(true);
  clone.querySelectorAll([
    'script', 'style', 'nav', 'button', 'svg', 'img', 'picture', 'video', 'audio',
    '.figure', '.media', '.bk_fig', '.figcaption', '.navigation', '.skip-link',
    '.supplementary-material', '.copyright'
  ].join(',')).forEach((child) => child.remove());
  const blocks = [];
  for (const child of clone.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,th,td')) {
    if (child.matches('p') && child.closest('li')) continue;
    if ((child.matches('li,th,td')) && child.querySelector('li,th,td')) continue;
    let text = clean(child.textContent);
    if (!text) continue;
    if (child.matches('li')) text = '• ' + text;
    blocks.push(text);
  }
  return clean(blocks.join('\n\n'));
}

function parseChapter(html, url, expectedTitle, JSDOM) {
  const doc = new JSDOM(html, { url }).window.document;
  if (!hasExpectedLicense(doc)) {
    throw new Error('Expected Open RN CC BY 4.0 markers were not found on ' + url);
  }
  const inbook = metaValues(doc, 'citation_inbook_title')[0] || '';
  if (!clean(inbook).toLowerCase().includes(clean(expectedTitle).replace(/\s*\[Internet\].*$/i, '').toLowerCase().split(',')[0])) {
    throw new Error('Open RN title mismatch on ' + url + ': ' + inbook);
  }
  const title = metaValues(doc, 'citation_title')[0] ||
    clean(doc.querySelector('.main-content h1')?.textContent) || 'Open RN chapter';
  const fullTextUrl = metaValues(doc, 'citation_fulltext_html_url')[0] || url.replace(/\?report=printable.*$/, '');
  const body = doc.querySelector('.main-content .body-content') || doc.querySelector('.main-content');
  if (!body) throw new Error('Open RN content container was not found on ' + url);
  const idPrefix = new URL(url).pathname.split('/').filter(Boolean).pop();
  let sectionNodes = Array.from(body.querySelectorAll('[id]')).filter((node) => {
    const escaped = idPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('^' + escaped + '\\.s\\d+$', 'i').test(node.id);
  });
  if (!sectionNodes.length) {
    sectionNodes = Array.from(body.children).filter((node) => /^DIV$/.test(node.tagName));
  }
  const pages = [];
  for (const node of sectionNodes) {
    const text = blockText(node);
    if (words(text) < 40) continue;
    const headingNode = Array.from(node.children).find((child) => /^H[1-4]$/.test(child.tagName));
    const heading = clean(headingNode?.textContent) || title;
    const sourceUrl = fullTextUrl + (node.id ? '#' + encodeURIComponent(node.id) : '');
    pages.push({
      n: pages.length + 1,
      heading,
      img: null,
      text,
      sourceUrl,
      sourceWordCount: words(text),
      sourceDigest: 'sha256:' + sha256(text)
    });
  }
  if (!pages.length) {
    const text = blockText(body);
    if (words(text) < 80) throw new Error('Extracted Open RN text is unexpectedly short on ' + url);
    pages.push({
      n: 1,
      heading: title,
      img: null,
      text,
      sourceUrl: fullTextUrl,
      sourceWordCount: words(text),
      sourceDigest: 'sha256:' + sha256(text)
    });
  }
  return {
    title,
    fullTextUrl,
    authors: metaValues(doc, 'citation_author'),
    publisher: metaValues(doc, 'citation_publisher')[0] || 'Chippewa Valley Technical College',
    pages
  };
}

function chapterNumber(label, fallback) {
  const match = String(label).match(/^(?:PART|Chapter)\s+([IVXLCDM]+|\d+)/i);
  return match ? match[1].toLowerCase() : String(fallback);
}

function makeBook(config, bookTitle, chapter, ordinal, parsed) {
  const mirroredAt = new Date().toISOString();
  const key = chapterNumber(chapter.label, ordinal);
  const slug = 'open-rn-' + config.slug + '-chapter-' + key;
  return {
    schema: 'allo-reading-book@1',
    slug,
    title: 'Open RN ' + bookTitle.replace(/\s*\[Internet\].*$/i, '') + ' · ' + chapter.label.replace(/^PART\s+/i, 'Chapter '),
    description: 'An accessibility-ready, text-only mirror of ' + parsed.title + ' from the CC BY 4.0 Open RN textbook ' + bookTitle + '. Figures are omitted because individual figure licenses can differ.',
    language: 'English',
    langCode: 'en',
    isRtl: false,
    level: '6',
    orientation: 'portrait',
    sourceId: 'open-rn',
    contentType: 'open-textbook-chapter',
    subjects: config.subjects,
    authors: parsed.authors,
    illustrators: [],
    originalAuthors: [],
    publisher: parsed.publisher,
    license: 'CC BY 4.0',
    licenseUrl: LICENSE_URL,
    source: {
      id: 'open-rn',
      name: 'Open RN',
      url: parsed.fullTextUrl,
      attributionUrl: config.root,
      host: 'NCBI Bookshelf'
    },
    usagePolicy: {
      access: 'mirrored',
      mirror: true,
      adapt: true,
      ai: true,
      commercial: true,
      attributionRequired: true,
      shareAlike: false,
      auditedAt: mirroredAt.slice(0, 10),
      auditSource: AUDIT_URL,
      reason: 'Open RN materials are CC BY 4.0. This text-only mirror excludes figures that may carry separate credits or licenses.'
    },
    mirror: {
      mirroredAt,
      importer: 'reading_library/import_open_rn_books.js',
      sectionUrls: parsed.pages.map((page) => page.sourceUrl),
      contentDigest: 'sha256:' + sha256(parsed.pages.map((page) => page.sourceDigest).join('\n'))
    },
    medicalNotice: 'Educational material only. Follow current clinical policy, instructor guidance, and professional standards for patient-care decisions.',
    cover: null,
    audio: null,
    pages: parsed.pages,
    stats: {
      pages: parsed.pages.length,
      words: parsed.pages.reduce((total, page) => total + page.sourceWordCount, 0)
    }
  };
}

function selectedConfigs() {
  const only = valueAfter('--only');
  if (!only) return TEXTBOOKS;
  const wanted = new Set(only.split(',').map((value) => value.trim()).filter(Boolean));
  const selected = TEXTBOOKS.filter((config) => wanted.has(config.slug));
  const missing = Array.from(wanted).filter((slug) => !selected.some((config) => config.slug === slug));
  if (missing.length) throw new Error('Unknown Open RN textbook slug(s): ' + missing.join(', '));
  return selected;
}

function main() {
  if (!process.argv.includes('--fetch')) {
    throw new Error('Use --fetch to confirm a live import from the official NCBI editions.');
  }
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  const JSDOM = loadJsdom();
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  catalog.items = (catalog.items || []).filter((item) => !/^open-rn-/.test(item.slug));
  const registered = new Set(catalog.items.map((item) => item.slug));
  const books = [];
  for (const config of selectedConfigs()) {
    const info = rootInfo(fetchHtml(config.root), config.root, JSDOM);
    process.stdout.write(info.title + ': ' + info.chapters.length + ' chapters\n');
    for (let index = 0; index < info.chapters.length; index++) {
      const chapter = info.chapters[index];
      const printable = chapter.url + '?report=printable';
      process.stdout.write('Fetching ' + printable + '\n');
      const parsed = parseChapter(fetchHtml(printable), printable, info.title, JSDOM);
      books.push(makeBook(config, info.title, chapter, index + 1, parsed));
    }
  }
  for (const book of books) {
    const file = 'books/' + book.slug + '.json';
    fs.writeFileSync(path.join(ROOT, file), JSON.stringify(book, null, 2) + '\n');
    if (!registered.has(book.slug)) {
      catalog.items.push({ slug: book.slug, file });
      registered.add(book.slug);
    }
  }
  fs.writeFileSync(catalogOutputPath(), JSON.stringify(catalog, null, 1) + '\n');
  console.log('Wrote ' + books.length + ' Open RN chapter mirrors.');
}

if (require.main === module) main();

module.exports = {
  assertNcbiUrl,
  blockText,
  catalogOutputPath,
  hasExpectedLicense,
  parseChapter,
  rootInfo,
  selectedConfigs,
  sha256
};
