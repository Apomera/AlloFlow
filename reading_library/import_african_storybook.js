#!/usr/bin/env node
/**
 * Mirror a focused set of ASb-approved African Storybook editions.
 *
 * The official reader exposes:
 *   - lists/booklist.approved.php: the checked/approved edition catalog
 *   - newviewer/index.php: page text, illustration URLs, credits, and license
 *
 * Every selected edition is audited independently. Unknown licenses and any
 * NoDerivatives license fail closed. CC BY-NC editions are mirrored because
 * AlloFlow is noncommercial, but their records explicitly disable commercial
 * reuse. Source-hosted illustrations remain paired with locally stored text.
 *
 * Usage:
 *   node reading_library/import_african_storybook.js --plan
 *   node reading_library/import_african_storybook.js --fetch
 *   node reading_library/import_african_storybook.js --fetch --langs so,ti
 *   node reading_library/import_african_storybook.js --fetch --limit 12
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const CACHE_DIR = path.join(ROOT, '.cache', 'african-storybook');
const OPEN_CATALOG_PATH = path.join(ROOT, 'open_catalog.json');
const CATALOG_URL = 'https://www.africanstorybook.org/lists/booklist.approved.php';
const TERMS_URL = 'https://www.africanstorybook.org/terms.html';
const SOURCE_ROOT = 'https://www.africanstorybook.org/';
const AUDIT_DATE = new Date().toISOString().slice(0, 10);

const LANGUAGE_PLAN = [
  { siteId: '1095', name: 'Somali', langCode: 'so' },
  { siteId: '7434', name: 'Tigrinya', langCode: 'ti' },
  { siteId: '16556', name: 'Kirundi', langCode: 'rn' },
  { siteId: '16544', name: 'Lingala', langCode: 'ln' },
  { siteId: '1139', name: 'Lesotho Sesotho', langCode: 'sot' },
  { siteId: '16702', name: 'Wolof', langCode: 'wo' },
];

const args = process.argv.slice(2);
const planOnly = args.includes('--plan');
const doFetch = args.includes('--fetch');
const refresh = args.includes('--refresh');
const dryRun = args.includes('--dry-run');

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

const requestedLimit = Math.max(0, Number(valueAfter('--limit') || 0));
const concurrency = Math.max(1, Math.min(4, Number(valueAfter('--concurrency') || 3)));
const requestedLanguages = new Set(
  String(valueAfter('--langs') || LANGUAGE_PLAN.map((item) => item.langCode).join(','))
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256(value) {
  return 'sha256:' + crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function words(value) {
  return String(value || '').trim().split(/\s+/u).filter(Boolean).length;
}

function normalizeSpace(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/gu, ' ').trim();
}

function slugify(value) {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'untitled';
}

function decodeJsString(value) {
  const escapes = {
    "'": "'",
    '"': '"',
    '\\': '\\',
    '/': '/',
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
  };
  return String(value || '')
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\(['"\\/bfnrt])/g, (_, key) => escapes[key]);
}

const entityDom = new JSDOM('<!doctype html><body><div id="value"></div></body>');
const entityHolder = entityDom.window.document.getElementById('value');
function decodeHtml(value) {
  entityHolder.innerHTML = String(value || '');
  return normalizeSpace(entityHolder.textContent);
}

function parseApprovedCatalog(html) {
  const records = [];
  const linePattern = /parent\.bookItemsAppr\.push\(\{([\s\S]*?)\}\);/g;
  let lineMatch;
  while ((lineMatch = linePattern.exec(String(html)))) {
    const record = {};
    const fieldPattern = /(\w+):(?:"((?:\\.|[^"\\])*)"|(true|false))/g;
    let fieldMatch;
    while ((fieldMatch = fieldPattern.exec(lineMatch[1]))) {
      const key = fieldMatch[1];
      record[key] = fieldMatch[3] == null
        ? decodeHtml(decodeJsString(fieldMatch[2]))
        : fieldMatch[3] === 'true';
    }
    if (record.id && record.title && record.lang && record.booktype &&
        String(record.approved) === '1' && record.app === true) {
      records.push(record);
    }
  }
  if (records.length < 1000) {
    throw new Error('Approved catalog returned too few parseable records: ' + records.length);
  }
  return records;
}

function sourceUrl(record) {
  return SOURCE_ROOT + 'newviewer/index.php?bt=' + encodeURIComponent(record.booktype) +
    '&dual=false&id=' + encodeURIComponent(record.id);
}

function absoluteUrl(value, baseUrl) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).href;
  } catch (_) {
    return null;
  }
}

function cachePathFor(url) {
  return path.join(CACHE_DIR, sha256(url).slice(7) + '.html');
}

async function fetchText(url, attempt) {
  attempt = attempt || 1;
  const cachePath = cachePathFor(url);
  if (!refresh && fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, 'utf8');
  }
  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'AlloFlow-OER-Importer/1.0 (noncommercial accessibility mirror)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(45000),
    });
  } catch (error) {
    if (attempt < 4) {
      await sleep(750 * attempt);
      return fetchText(url, attempt + 1);
    }
    throw error;
  }
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    await sleep(1250 * attempt);
    return fetchText(url, attempt + 1);
  }
  if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
  const text = await response.text();
  if (text.length < 100) throw new Error('Unexpectedly short response for ' + url);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath, text);
  return text;
}

async function mapLimit(items, limit, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

function linesFromBreaks(element) {
  if (!element) return [];
  const holder = element.cloneNode(true);
  for (const br of holder.querySelectorAll('br')) br.replaceWith('\n');
  return holder.textContent
    .split(/\n+/)
    .map(normalizeSpace)
    .filter(Boolean);
}

function parseCredits(document) {
  const credits = [];
  for (const line of linesFromBreaks(document.querySelector('.bookcover_author'))) {
    const match = /^(.+?)\s*-\s*(.+)$/.exec(line);
    if (!match) continue;
    const role = normalizeSpace(match[1]);
    const name = normalizeSpace(match[2]);
    if (role && name) credits.push({ name, role });
  }
  return credits;
}

function parseLicense(document) {
  const copyrightElement = document.querySelector('.backcover_copyright');
  const text = normalizeSpace(copyrightElement && copyrightElement.textContent);
  const match = /Creative Commons:\s*(.+?)(?=\s+Source\b|\s+Original source\b|$)/i.exec(text);
  if (!match) return { eligible: false, reason: 'Missing title-level Creative Commons statement' };
  const raw = normalizeSpace(match[1]);
  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  const versionMatch = /(\d+(?:\.\d+)?)/.exec(raw);
  const version = versionMatch ? versionMatch[1] : null;
  if (!version) return { eligible: false, raw, reason: 'Creative Commons version is not explicit' };

  const nonCommercial = compact.includes('noncommercial');
  const shareAlike = compact.includes('sharealike');
  const noDerivatives = compact.includes('noderiv');
  const attribution = compact.includes('attribution');
  if (!attribution) return { eligible: false, raw, reason: 'License is not an Attribution license' };
  if (noDerivatives) {
    return { eligible: false, raw, noDerivatives: true, reason: 'NoDerivatives editions are not reformatted' };
  }

  const code = 'by' + (nonCommercial ? '-nc' : '') + (shareAlike ? '-sa' : '');
  return {
    eligible: true,
    raw,
    version,
    code,
    label: 'CC ' + code.toUpperCase() + ' ' + version,
    url: 'https://creativecommons.org/licenses/' + code + '/' + version + '/',
    nonCommercial,
    shareAlike,
    noDerivatives: false,
  };
}

function coverImage(document, baseUrl) {
  const cover = document.querySelector('#cover-image');
  const background = cover && cover.getAttribute('style');
  const match = /background-image\s*:\s*url\((['"]?)(.*?)\1\)/i.exec(background || '');
  if (match) return absoluteUrl(match[2], baseUrl);
  const image = document.querySelector('.cover-wrapper image[src], .cover-wrapper img[src]');
  return image ? absoluteUrl(image.getAttribute('src'), baseUrl) : null;
}

function pageImage(page, baseUrl) {
  const images = Array.from(page.querySelectorAll('image[src], img[src]'));
  const image = images.find((item) => !/logo|approved|check/i.test(item.getAttribute('src') || ''));
  return image ? absoluteUrl(image.getAttribute('src'), baseUrl) : null;
}

function pageText(page) {
  const wrapper = page.querySelector('.page-wrapper');
  if (!wrapper) return '';
  const paragraphs = Array.from(wrapper.querySelectorAll('p'))
    .map((item) => normalizeSpace(item.textContent))
    .filter(Boolean);
  if (paragraphs.length) return paragraphs.join('\n');
  const textElement = wrapper.querySelector('.asbText, .single-text, .text-bottom, .text-top');
  return normalizeSpace(textElement && textElement.textContent);
}

function copyrightDetails(document) {
  const text = normalizeSpace(document.querySelector('.backcover_copyright')?.textContent);
  const match = /©\s*(.+?)\s+(\d{4})(?=\s+Creative Commons:|$)/i.exec(text);
  return match
    ? { holder: normalizeSpace(match[1]), year: Number(match[2]) }
    : { holder: 'African Storybook contributors', year: null };
}

function originalSource(document, baseUrl) {
  const copyrightElement = document.querySelector('.backcover_copyright');
  if (!copyrightElement) return null;
  const links = Array.from(copyrightElement.querySelectorAll('a[href]'));
  const original = links.find((link) => /original/i.test(link.parentElement?.textContent || '')) || links.at(-1);
  if (original) return absoluteUrl(original.getAttribute('href'), baseUrl);
  const text = normalizeSpace(copyrightElement.textContent);
  const match = /Original source\s+(https?:\/\/\S+)/i.exec(text);
  return match ? match[1] : null;
}

function firstCredit(credits, rolePattern) {
  const credit = credits.find((item) => rolePattern.test(item.role));
  return credit ? credit.name : '';
}

function parseViewer(html, record, language) {
  const url = sourceUrl(record);
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const license = parseLicense(document);
  const credits = parseCredits(document);
  const title = normalizeSpace(
    document.querySelector('.backcover_title')?.textContent ||
    document.querySelector('.cover-title')?.textContent ||
    record.title
  );
  const declaredLanguage = normalizeSpace(
    firstCredit(credits, /^Language$/i) || document.querySelector('#lang')?.textContent
  );
  const declaredLevel = normalizeSpace(firstCredit(credits, /^Level$/i));
  const pages = [];
  for (const page of document.querySelectorAll('.flipbook > .page, #container .page')) {
    const pageNumber = normalizeSpace(page.querySelector('.page-number')?.textContent);
    if (!/^\d+$/.test(pageNumber)) continue;
    const text = pageText(page);
    const img = pageImage(page, url);
    if (!text && !img) continue;
    pages.push({
      n: Number(pageNumber),
      img,
      text,
      sourceUrl: url + '#page=' + pageNumber,
      sourceDigest: sha256(text),
    });
  }
  const uniquePages = Array.from(new Map(pages.map((page) => [page.n, page])).values())
    .sort((a, b) => a.n - b.n)
    .map((page, index) => ({ ...page, n: index + 1 }));
  const imageIdentity = uniquePages.map((page) => {
    const match = /\/illustrations\/pages\/([^/?#]+)/.exec(page.img || '');
    return match ? match[1] : '';
  }).filter(Boolean).join('|');
  const copyright = copyrightDetails(document);
  return {
    title,
    declaredLanguage,
    declaredLevel,
    credits,
    license,
    pages: uniquePages,
    cover: coverImage(document, url) || uniquePages.find((page) => page.img)?.img || null,
    copyright,
    originalSource: originalSource(document, url),
    workKey: imageIdentity ? 'asb-images-' + sha256(imageIdentity).slice(7, 23) : 'asb-edition-' + record.id,
    language,
  };
}

function levelFor(record, parsed) {
  const numeric = String(record.level || '');
  if (/^[1-5]$/.test(numeric)) return numeric;
  const label = parsed.declaredLevel.toLowerCase();
  if (label.includes('first words')) return '1';
  if (label.includes('first sentences')) return '2';
  if (label.includes('first paragraphs')) return '3';
  if (label.includes('longer paragraphs')) return '4';
  return '5';
}

function normalizedFingerprint(langCode, title, pages) {
  const sample = pages.map((page) => page.text).join(' ').toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 320);
  const cleanTitle = normalizeSpace(title).toLowerCase();
  return langCode + '|' + cleanTitle + '|' + sample;
}

function makeBook(record, parsed, language) {
  const author = firstCredit(parsed.credits, /^Author/i);
  const illustrator = firstCredit(parsed.credits, /^Illustration/i);
  const translators = parsed.credits.filter((item) => /^Translation/i.test(item.role)).map((item) => item.name);
  const assurance = parsed.credits.filter((item) => /^Assur/i.test(item.role)).map((item) => item.name);
  const contributors = parsed.credits.filter((item) => !/^(Language|Level)$/i.test(item.role));
  const license = parsed.license;
  const contentDigest = sha256(parsed.pages.map((page) => page.sourceDigest).join('\n'));
  const titleSlug = slugify(parsed.title);
  const slug = 'african-storybook-' + record.id + '-' +
    (titleSlug === 'untitled' ? 'untitled-' + language.langCode : titleSlug);
  const attribution = contributors.map((item) => item.name + ' (' + item.role + ')').join('; ');
  return {
    schema: 'allo-reading-book@1',
    slug,
    title: parsed.title,
    description: record.summary || ('An ASb-approved ' + language.name + ' story from African Storybook.'),
    language: language.name,
    langCode: language.langCode,
    isRtl: false,
    level: levelFor(record, parsed),
    readingLevelLabel: parsed.declaredLevel || null,
    orientation: 'landscape',
    sourceId: 'african-storybook',
    contentType: 'story',
    subjects: ['Children’s literature', 'Early literacy'],
    authors: author ? [author] : [record.author || parsed.copyright.holder],
    illustrators: illustrator ? [illustrator] : [],
    translators,
    assurance,
    contributors,
    originalAuthors: [],
    publisher: parsed.copyright.holder || 'African Storybook',
    copyrightYear: parsed.copyright.year,
    license: license.label,
    licenseUrl: license.url,
    attribution,
    source: {
      id: 'african-storybook',
      name: 'African Storybook',
      url: sourceUrl(record),
      attributionUrl: sourceUrl(record),
      catalogUrl: CATALOG_URL,
      originalSourceUrl: parsed.originalSource,
      editionId: String(record.id),
      bookType: String(record.booktype),
      approved: true,
    },
    usagePolicy: {
      access: 'mirrored',
      mirror: true,
      adapt: true,
      ai: true,
      commercial: !license.nonCommercial,
      attributionRequired: true,
      shareAlike: license.shareAlike,
      auditedAt: AUDIT_DATE,
      auditSource: TERMS_URL,
      reason: 'The title-level back cover permits copying and adaptation with attribution.' +
        (license.nonCommercial ? ' This edition is restricted to noncommercial use.' : ''),
    },
    rightsNotice: 'Keep the complete creator attribution and exact ' + license.label +
      ' license with copies or adaptations of this edition.',
    accessibility: {
      structuredPageText: true,
      pageImagesPaired: true,
      languageDeclared: true,
      accessibilityTransformationAllowed: true,
    },
    workKey: parsed.workKey,
    cover: parsed.cover,
    audio: null,
    pages: parsed.pages,
    stats: {
      pages: parsed.pages.length,
      words: parsed.pages.reduce((total, page) => total + words(page.text), 0),
    },
    mirror: {
      importedAt: AUDIT_DATE,
      illustrationMode: 'source-hosted',
      contentDigest,
    },
  };
}

function existingStoryFingerprints(catalog) {
  const fingerprints = new Set();
  for (const item of catalog.items || []) {
    try {
      const book = JSON.parse(fs.readFileSync(path.join(ROOT, item.file), 'utf8'));
      if (book.contentType !== 'story' || book.sourceId === 'african-storybook') continue;
      fingerprints.add(normalizedFingerprint(book.langCode, book.title, book.pages || []));
    } catch (_) {
      // The catalog integrity tests report missing or malformed files.
    }
  }
  return fingerprints;
}

function languageNamePattern(language) {
  if (language.langCode === 'ti') return 'Tigrinya|Tigrigna';
  if (language.langCode === 'sot') return 'Sesotho';
  return language.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function auditRecord(row, index, total) {
  const html = await fetchText(sourceUrl(row.record));
  const parsed = parseViewer(html, row.record, row.language);
  await sleep(125);
  if ((index + 1) % 20 === 0 || index + 1 === total) {
    process.stdout.write('Audited ' + (index + 1) + '/' + total + ' African Storybook editions\n');
  }
  if (!parsed.license.eligible) {
    return { ...row, parsed, skipped: parsed.license.reason };
  }
  if (!parsed.pages.length || !parsed.pages.some((page) => page.text)) {
    return { ...row, parsed, skipped: 'No structured story text was found' };
  }
  if (parsed.declaredLanguage &&
      !new RegExp(languageNamePattern(row.language), 'i').test(parsed.declaredLanguage)) {
    return {
      ...row,
      parsed,
      skipped: 'Viewer language "' + parsed.declaredLanguage + '" does not match ' + row.language.name,
    };
  }
  return { ...row, parsed, book: makeBook(row.record, parsed, row.language) };
}

async function main() {
  if (!planOnly && !doFetch) {
    throw new Error('Use --plan for a live license census or --fetch to import.');
  }
  const languages = LANGUAGE_PLAN.filter((item) =>
    requestedLanguages.has(item.langCode) || requestedLanguages.has(item.siteId)
  );
  if (!languages.length) throw new Error('No requested language matched the African Storybook plan.');

  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  const catalogHtml = await fetchText(CATALOG_URL);
  const allRecords = parseApprovedCatalog(catalogHtml);
  let selected = [];
  for (const language of languages) {
    const rows = allRecords
      .filter((record) => record.lang === language.siteId)
      .map((record) => ({ record, language }));
    process.stdout.write(language.name + ': ' + rows.length + ' ASb-approved editions\n');
    selected.push(...rows);
  }
  if (requestedLimit) selected = selected.slice(0, requestedLimit);
  const audited = await mapLimit(selected, concurrency, (row, index) =>
    auditRecord(row, index, selected.length)
  );

  const licenses = {};
  const skipped = [];
  for (const row of audited) {
    const label = row.parsed.license.label || row.parsed.license.raw || 'unknown';
    licenses[label] = (licenses[label] || 0) + 1;
    if (row.skipped) skipped.push({ id: row.record.id, title: row.record.title, reason: row.skipped });
  }
  process.stdout.write('License census: ' + JSON.stringify(licenses) + '\n');
  if (skipped.length) {
    process.stdout.write('Skipped ' + skipped.length + ' editions:\n');
    for (const item of skipped) {
      process.stdout.write('  ' + item.id + ' ' + item.title + ': ' + item.reason + '\n');
    }
  }
  if (planOnly) {
    process.stdout.write('Eligible for mirror: ' + audited.filter((row) => row.book).length + '\n');
    return;
  }

  const catalog = JSON.parse(fs.readFileSync(OPEN_CATALOG_PATH, 'utf8'));
  catalog.items = catalog.items || [];
  const existingSlugs = new Set(catalog.items.map((item) => item.slug));
  const existingFingerprints = existingStoryFingerprints(catalog);
  const newFingerprints = new Set();
  let imported = 0;
  let updated = 0;
  let duplicates = 0;

  for (const row of audited) {
    if (!row.book) continue;
    const book = row.book;
    const fingerprint = normalizedFingerprint(book.langCode, book.title, book.pages);
    if (!existingSlugs.has(book.slug) &&
        (existingFingerprints.has(fingerprint) || newFingerprints.has(fingerprint))) {
      duplicates++;
      process.stdout.write('SKIP duplicate: ' + book.language + ' — ' + book.title + '\n');
      continue;
    }
    newFingerprints.add(fingerprint);
    const file = 'books/' + book.slug + '.json';
    if (!dryRun) {
      fs.writeFileSync(path.join(ROOT, file), JSON.stringify(book, null, 2) + '\n');
      if (!existingSlugs.has(book.slug)) {
        catalog.items.push({ slug: book.slug, file });
        existingSlugs.add(book.slug);
        imported++;
      } else {
        updated++;
      }
    } else {
      imported++;
    }
    process.stdout.write((dryRun ? 'WOULD IMPORT ' : 'IMPORTED ') + book.language + ' — ' +
      book.title + ' (' + book.stats.pages + 'p, ' + book.stats.words + 'w, ' + book.license + ')\n');
  }

  if (!dryRun) fs.writeFileSync(OPEN_CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
  process.stdout.write('\nAfrican Storybook result: ' + imported + ' new, ' + updated +
    ' updated, ' + duplicates + ' duplicate mirrors skipped, ' + skipped.length + ' rights/content skips.\n');
  if (!dryRun) {
    process.stdout.write('Rebuild the catalog with: node reading_library/mirror_books.js --fetch\n');
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}

module.exports = {
  LANGUAGE_PLAN,
  decodeHtml,
  decodeJsString,
  languageNamePattern,
  makeBook,
  normalizedFingerprint,
  parseApprovedCatalog,
  parseCredits,
  parseLicense,
  parseViewer,
  slugify,
  sourceUrl,
};
