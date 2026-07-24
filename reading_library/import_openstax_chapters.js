#!/usr/bin/env node
/**
 * Mirror a teacher-reviewed set of OpenStax chapters for AlloFlow's reader.
 * Every page must advertise the configured title, CC BY-NC-SA 4.0 license,
 * and OpenStax generative-AI permission notice.
 * Images, scripts, exercises, and OpenStax interface code are not copied.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const crypto = require('crypto');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const OPEN_CATALOG_PATH = path.join(ROOT, 'open_catalog.json');
const MANIFEST_PATH = path.join(ROOT, 'openstax_mirror_manifest.json');
const EXPECTED_LICENSE_RE = /creativecommons\.org\/licenses\/by-nc-sa\/4\.0\/?/i;
const EXPECTED_AI_NOTICE_START = 'may not be used in the training of large language models';
const EXPECTED_AI_NOTICE_END = 'generative AI offerings without OpenStax';
const USER_AGENT = 'AlloFlow OpenStax accessibility mirror (noncommercial educational use)';

function loadJsdom() {
  const candidates = [
    path.join(ROOT, '..', 'node_modules'),
    path.join(ROOT, '..', 'desktop/web-app', 'node_modules')
  ];
  return require(require.resolve('jsdom', { paths: candidates })).JSDOM;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function writeCatalog(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 1) + '\n');
}

function valueAfterArg(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

function selectManifestBooks(manifest, args) {
  const only = valueAfterArg(args || [], '--only');
  if (!only) return manifest.books || [];
  const requested = Array.from(new Set(String(only).split(',').map((value) => value.trim()).filter(Boolean)));
  if (!requested.length) throw new Error('--only requires at least one chapter slug');
  const selected = (manifest.books || []).filter((entry) => requested.includes(entry.slug));
  const found = new Set(selected.map((entry) => entry.slug));
  const missing = requested.filter((slug) => !found.has(slug));
  if (missing.length) throw new Error('Unknown OpenStax mirror slug(s): ' + missing.join(', '));
  return selected;
}

function catalogOutputPath(args) {
  const requested = valueAfterArg(args || [], '--catalog-output');
  if (!requested) return OPEN_CATALOG_PATH;
  const resolved = path.resolve(ROOT, requested);
  if (path.dirname(resolved) !== ROOT || path.extname(resolved).toLowerCase() !== '.json') {
    throw new Error('--catalog-output must be a JSON filename inside reading_library/');
  }
  return resolved;
}

function assertOfficialUrl(value) {
  const parsed = new URL(String(value || ''));
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'openstax.org') {
    throw new Error('Refusing non-OpenStax source URL: ' + value);
  }
  return parsed.href;
}

function fetchHtml(url) {
  return execFileSync('curl', [
    '-sSL', '--fail', '--max-time', '45',
    '-A', USER_AGENT,
    '-H', 'Accept: text/html,application/xhtml+xml',
    assertOfficialUrl(url)
  ], { encoding: 'utf8', maxBuffer: 24 * 1024 * 1024 });
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u00ad|\u200b|\u200c|\u200d/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function unique(values) {
  return values.filter((value, index, all) => value && all.indexOf(value) === index);
}

function pageAuthors(doc) {
  return unique(Array.from(doc.querySelectorAll('meta[name="citation_author"]'))
    .map((node) => cleanText(node.getAttribute('content'))));
}

function pageBookTitle(doc) {
  const meta = doc.querySelector('meta[name="citation_book_title"]');
  return cleanText(meta && meta.getAttribute('content'));
}

function pageHasExpectedLicense(doc) {
  return Array.from(doc.querySelectorAll('a[href]')).some((link) => {
    return EXPECTED_LICENSE_RE.test(String(link.getAttribute('href') || ''));
  });
}

function pageHasExpectedAiNotice(doc) {
  const text = cleanText(doc.body && doc.body.textContent);
  return text.includes(EXPECTED_AI_NOTICE_START) && text.includes(EXPECTED_AI_NOTICE_END);
}

function blockText(node) {
  if (!node) return '';
  const clone = node.cloneNode(true);
  clone.querySelectorAll('script,style,button,svg,math annotation,aside[role="note"]').forEach((child) => child.remove());
  return cleanText(clone.textContent);
}

function extractReadableText(doc) {
  const content = doc.querySelector('main [data-type="page"]') || doc.querySelector('main.page-content');
  if (!content) throw new Error('OpenStax content container was not found');
  const blocks = [];
  const seen = new Set();
  Array.from(content.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,figcaption,img[alt]')).forEach((node) => {
    const tag = node.tagName.toLowerCase();
    if (tag === 'p' && (node.closest('li') || node.closest('figcaption'))) return;
    let text = tag === 'img' ? cleanText(node.getAttribute('alt')) : blockText(node);
    if (!text || /^opens in new window$/i.test(text)) return;
    if (tag === 'img') text = 'Image description: ' + text;
    if (tag === 'li') text = '• ' + text;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    blocks.push(text);
  });
  const text = cleanText(blocks.join('\n\n'));
  if (text.split(/\s+/).filter(Boolean).length < 40) {
    throw new Error('Extracted section text is unexpectedly short');
  }
  return text;
}

function parseSection(html, sectionUrl, expectedBookTitle, JSDOM) {
  const doc = new JSDOM(html, { url: sectionUrl }).window.document;
  const actualBookTitle = pageBookTitle(doc);
  if (actualBookTitle !== expectedBookTitle) {
    throw new Error('Book title mismatch for ' + sectionUrl + ': expected "' + expectedBookTitle + '", received "' + actualBookTitle + '"');
  }
  if (!pageHasExpectedLicense(doc)) {
    throw new Error('Expected CC BY-NC-SA 4.0 license was not found on ' + sectionUrl);
  }
  if (!pageHasExpectedAiNotice(doc)) {
    throw new Error('Expected OpenStax generative-AI permission notice was not found on ' + sectionUrl);
  }
  const headingNode = doc.querySelector('main [data-type="document-title"], main h1, main h2');
  return {
    heading: cleanText(headingNode && headingNode.textContent) || expectedBookTitle,
    authors: pageAuthors(doc),
    text: extractReadableText(doc)
  };
}

function words(value) {
  return cleanText(value).split(/\s+/).filter(Boolean).length;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function makeBook(entry, manifest, JSDOM) {
  const pages = [];
  let authors = [];
  for (const sectionUrl of entry.sections || []) {
    const officialUrl = assertOfficialUrl(sectionUrl);
    process.stdout.write('Fetching ' + officialUrl + '\n');
    const parsed = parseSection(fetchHtml(officialUrl), officialUrl, entry.bookTitle, JSDOM);
    authors = unique(authors.concat(parsed.authors));
    pages.push({
      n: pages.length + 1,
      heading: parsed.heading,
      img: null,
      text: parsed.text,
      sourceUrl: officialUrl,
      sourceWordCount: words(parsed.text),
      sourceDigest: 'sha256:' + sha256(parsed.text)
    });
  }
  if (!pages.length) throw new Error('No sections configured for ' + entry.slug);
  const mirroredAt = new Date().toISOString();
  return {
    schema: 'allo-reading-book@1',
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    language: 'English',
    langCode: 'en',
    isRtl: false,
    level: String(entry.level || '6'),
    orientation: 'portrait',
    sourceId: 'openstax',
    contentType: 'open-textbook-chapter',
    subjects: entry.subjects || [],
    authors,
    illustrators: [],
    originalAuthors: [],
    publisher: 'OpenStax, Rice University',
    license: manifest.license,
    licenseUrl: manifest.licenseUrl,
    source: {
      id: 'openstax',
      name: 'OpenStax',
      url: assertOfficialUrl(entry.sourceUrl),
      attributionUrl: assertOfficialUrl(entry.bookUrl)
    },
    usagePolicy: {
      access: 'mirrored',
      mirror: true,
      adapt: true,
      ai: false,
      commercial: false,
      attributionRequired: true,
      shareAlike: true,
      auditedAt: mirroredAt.slice(0, 10),
      auditSource: manifest.licenseAuditSource,
      aiPermissionRequired: true,
      aiRestrictionSource: pages[0].sourceUrl,
      reason: manifest.aiNotice
    },
    mirror: {
      mirroredAt,
      importer: 'reading_library/import_openstax_chapters.js',
      sectionUrls: pages.map((page) => page.sourceUrl),
      contentDigest: 'sha256:' + sha256(pages.map((page) => page.sourceDigest).join('\n'))
    },
    cover: null,
    audio: null,
    pages,
    stats: {
      pages: pages.length,
      words: pages.reduce((total, page) => total + words(page.text), 0)
    }
  };
}

function main() {
  const args = process.argv.slice(2);
  const manifest = readJson(MANIFEST_PATH);
  if (manifest.schema !== 'allo-openstax-mirror-manifest@1') {
    throw new Error('Unsupported OpenStax mirror manifest schema');
  }
  if (!EXPECTED_LICENSE_RE.test(String(manifest.licenseUrl || ''))) {
    throw new Error('Manifest license is not the audited CC BY-NC-SA 4.0 license');
  }
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  const JSDOM = loadJsdom();
  const catalog = readJson(OPEN_CATALOG_PATH);
  catalog.items = catalog.items || [];
  const registered = new Set(catalog.items.map((item) => item.slug));
  const books = [];
  for (const entry of selectManifestBooks(manifest, args)) books.push(makeBook(entry, manifest, JSDOM));
  for (const book of books) {
    const file = 'books/' + book.slug + '.json';
    writeJson(path.join(ROOT, file), book);
    if (!registered.has(book.slug)) {
      catalog.items.push({ slug: book.slug, file });
      registered.add(book.slug);
    }
    console.log('Wrote ' + book.slug + ' (' + book.stats.pages + ' sections, ' + book.stats.words + ' words).');
  }
  const outputPath = catalogOutputPath(args);
  writeCatalog(outputPath, catalog);
  console.log('Wrote catalog registry ' + path.relative(ROOT, outputPath));
}

if (require.main === module) main();

module.exports = { assertOfficialUrl, catalogOutputPath, cleanText, extractReadableText, pageHasExpectedAiNotice, parseSection, selectManifestBooks, sha256 };
