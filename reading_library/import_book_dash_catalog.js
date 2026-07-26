#!/usr/bin/env node
/**
 * Import every published Book Dash language edition as an attributed catalog
 * record. The complete illustrated books remain on Book Dash: flattening their
 * PDFs into OCR would discard page design and image context. Each record links
 * to the official book page and source-file browser instead.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const CATALOG_PATH = path.join(ROOT, 'open_catalog.json');
const API = 'https://bookdash.org/wp-json/wp/v2/books';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';
const RIGHTS_URL = 'https://bookdash.org/about/what-we-do/our-books/';
const USER_AGENT = 'AlloFlow Book Dash catalog importer (accessibility discovery)';
const CONCURRENCY = 4;
const AUDIT_CACHE_DIR = path.join(ROOT, '.book_dash_audit_cache');
const HTTPS_AGENT = new https.Agent({ keepAlive: true, maxSockets: CONCURRENCY });

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
}

function outputPath() {
  const requested = valueAfter('--catalog-output');
  if (!requested) return CATALOG_PATH;
  const resolved = path.resolve(ROOT, requested);
  if (path.dirname(resolved) !== ROOT || path.extname(resolved).toLowerCase() !== '.json') {
    throw new Error('--catalog-output must be a JSON filename inside reading_library/');
  }
  return resolved;
}

function clean(value) {
  return String(value || '')
    .replace(/\u00ad|\u200b|\u200c|\u200d/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&#([0-9]+);/g, (_, value) => String.fromCodePoint(parseInt(value, 10)))
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return clean(value).toLowerCase()
    .replace(/&/g, ' and ')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || 'edition';
}

function fetchTextOnce(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;
    const request = client.get(parsed, {
      agent: parsed.protocol === 'https:' ? HTTPS_AGENT : undefined,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json,text/html;q=0.9,*/*;q=0.2'
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirects >= 5) return reject(new Error('Too many redirects for ' + url));
        return fetchTextOnce(new URL(response.headers.location, parsed).href, redirects + 1).then(resolve, reject);
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        return reject(new Error('HTTP ' + response.statusCode + ' for ' + url));
      }
      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > 32 * 1024 * 1024) request.destroy(new Error('Response too large for ' + url));
        else chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    request.setTimeout(60000, () => request.destroy(new Error('Timeout for ' + url)));
    request.on('error', reject);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, attempt) {
  attempt = attempt || 1;
  try {
    return await fetchTextOnce(url, 0);
  } catch (error) {
    if (attempt >= 8) throw error;
    await delay(1500 * attempt);
    return fetchText(url, attempt + 1);
  }
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

async function mapLimit(items, limit, fn) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

async function listRecords() {
  const cap = Number(valueAfter('--limit') || Number.POSITIVE_INFINITY);
  const firstUrl = API + '?per_page=100&page=1&_embed=1';
  const first = await fetchJson(firstUrl);
  const records = first.slice();
  if (records.length >= cap || first.length < 100) return records.slice(0, cap);
  // Continue until WordPress returns a short final page. This remains correct
  // as the public collection grows without relying on a hard-coded total.
  for (let page = 2; page <= 100; page++) {
    const batch = await fetchJson(API + '?per_page=100&page=' + page + '&_embed=1');
    records.push(...batch);
    process.stdout.write('Listed ' + records.length + ' Book Dash editions\n');
    if (records.length >= cap || batch.length < 100) break;
  }
  return records.slice(0, cap);
}

function taxonomyTerms(record, taxonomy) {
  const groups = (record._embedded && record._embedded['wp:term']) || [];
  return groups.flat().filter((term) => term && term.taxonomy === taxonomy);
}

function coverFor(record) {
  const media = record._embedded && record._embedded['wp:featuredmedia'];
  const item = media && media[0] && !media[0].code ? media[0] : null;
  const yoastImages = record.yoast_head_json && record.yoast_head_json.og_image;
  const yoastUrl = yoastImages && yoastImages[0] && yoastImages[0].url;
  if (!item) return yoastUrl ? { card: yoastUrl, large: yoastUrl } : null;
  const sizes = item.media_details && item.media_details.sizes;
  const card = sizes && (sizes.medium && sizes.medium.source_url || sizes.thumbnail && sizes.thumbnail.source_url) || item.source_url || yoastUrl;
  const large = sizes && (sizes.bd_medium && sizes.bd_medium.source_url || sizes.large && sizes.large.source_url) || item.source_url || yoastUrl;
  return card ? { card, large: large || card } : null;
}

function creatorCredits(html) {
  const text = clean(html);
  const credits = [];
  const re = /([A-ZÀ-ÖØ-öø-ÿ][^()<>]{1,100}?)\s*\((Writer|Illustrator|Designer|Editor)\)/gi;
  let match;
  while ((match = re.exec(text))) {
    const name = clean(match[1]).split(/Created by/i).pop().trim();
    const role = match[2][0].toUpperCase() + match[2].slice(1).toLowerCase();
    if (name && !credits.some((credit) => credit.name === name && credit.role === role)) {
      credits.push({ name, role });
    }
  }
  return credits;
}

function sourceFilesUrl(html, pageUrl) {
  const match = String(html).match(/href=["']([^"']*book-source-files\/\?book=[^"'&]+)["']/i);
  return match ? new URL(match[1], pageUrl).href : 'https://bookdash.org/book-source-files/';
}

function makeRecord(record, auditInput) {
  const pageUrl = new URL(record.link).href;
  const audit = typeof auditInput === 'string'
    ? {
        credits: creatorCredits(auditInput),
        sourceFilesUrl: sourceFilesUrl(auditInput, pageUrl)
      }
    : auditInput;
  const title = clean(record.title && record.title.rendered) || 'Untitled Book Dash edition';
  const description = clean(record.content && record.content.rendered) ||
    clean(record.excerpt && record.excerpt.rendered) ||
    'An openly licensed children’s book from Book Dash.';
  const languages = taxonomyTerms(record, 'languages');
  const language = languages[0] ? clean(languages[0].name) : 'Multilingual';
  const langCode = languages[0] ? clean(languages[0].slug).split('-')[0] : 'und';
  const subjects = taxonomyTerms(record, 'bd_themes').map((term) => clean(term.name)).filter(Boolean);
  const credits = audit.credits || [];
  const writers = credits.filter((credit) => credit.role === 'Writer').map((credit) => credit.name);
  const illustrators = credits.filter((credit) => credit.role === 'Illustrator').map((credit) => credit.name);
  const sourceFiles = audit.sourceFilesUrl;
  const creditText = credits.length
    ? credits.map((credit) => credit.name + ' (' + credit.role + ')').join('; ')
    : 'Creator credits are shown on the official Book Dash page.';
  const pages = [
    { n: 1, img: null, text: description },
    {
      n: 2,
      img: null,
      text: 'Creator attribution: ' + creditText + '\n\nLanguage: ' + language +
        '. License: Creative Commons Attribution 4.0 International (CC BY 4.0).'
    },
    {
      n: 3,
      img: null,
      text: 'This is a discovery record, not a flattened copy of the illustrated book. Use Open original to read or watch the complete edition at Book Dash. Book Dash also provides the editable source files for reuse and accessible adaptations at ' + sourceFiles
    }
  ];
  return {
    schema: 'allo-reading-book@1',
    slug: 'book-dash-' + record.id + '-' + slugify(title),
    title,
    description,
    language,
    langCode: langCode || 'und',
    isRtl: /^(ar|fa|he|ur)$/.test(langCode),
    level: '1',
    orientation: 'landscape',
    sourceId: 'book-dash',
    contentType: 'open-access-source-card',
    subjects,
    authors: writers.length ? writers : ['Book Dash contributors'],
    illustrators,
    contributors: credits,
    publisher: 'Book Dash',
    license: 'CC BY 4.0',
    licenseUrl: LICENSE_URL,
    source: {
      id: 'book-dash',
      name: 'Book Dash',
      url: pageUrl,
      attributionUrl: pageUrl,
      sourceFilesUrl: sourceFiles
    },
    usagePolicy: {
      access: 'link-only',
      mirror: false,
      adapt: true,
      ai: true,
      commercial: true,
      attributionRequired: true,
      shareAlike: false,
      auditedAt: new Date().toISOString().slice(0, 10),
      auditSource: RIGHTS_URL,
      reason: 'The complete illustrated edition and editable source files remain at Book Dash; this local entry preserves discovery and creator attribution.'
    },
    cover: coverFor(record),
    audio: null,
    pages,
    stats: {
      pages: pages.length,
      words: pages.reduce((total, page) => total + page.text.split(/\s+/).filter(Boolean).length, 0)
    }
  };
}

function normalizedBookUrl(value) {
  const url = new URL(value, 'https://bookdash.org/');
  url.hash = '';
  url.search = '';
  return url.href.replace(/\/$/, '');
}

function relatedBookUrls(html, pageUrl) {
  const urls = [normalizedBookUrl(pageUrl)];
  const re = /href=[\"']((?:https:\/\/bookdash\.org)?\/books\/[^/\"'?#]+\/?)[\"']/gi;
  let match;
  while ((match = re.exec(String(html)))) {
    const url = normalizedBookUrl(new URL(match[1], pageUrl).href);
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

async function buildWorkAuditMap() {
  const indexHtml = await fetchText('https://bookdash.org/book-source-files/');
  const keys = [];
  const re = /[?&]book=([^&\"']+)/gi;
  let match;
  while ((match = re.exec(indexHtml))) {
    const key = decodeURIComponent(match[1]).trim();
    if (key && !keys.includes(key)) keys.push(key);
  }
  if (keys.length < 100) throw new Error('Book Dash source index returned too few work keys: ' + keys.length);
  fs.mkdirSync(AUDIT_CACHE_DIR, { recursive: true });
  const audits = await mapLimit(keys, CONCURRENCY, async (key, index) => {
    const pageUrl = 'https://bookdash.org/books/' + encodeURIComponent(key) + '/';
    const cachePath = path.join(AUDIT_CACHE_DIR, key.replace(/[^a-z0-9_-]+/gi, '_') + '.json');
    let audit;
    if (fs.existsSync(cachePath)) {
      audit = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } else {
      const html = await fetchText(pageUrl);
      audit = {
        pageUrl,
        related: relatedBookUrls(html, pageUrl),
        credits: creatorCredits(html),
        sourceFilesUrl: sourceFilesUrl(html, pageUrl)
      };
      if (!audit.credits.length || !/\?book=/.test(audit.sourceFilesUrl)) {
        throw new Error('Required work-level attribution markers missing from ' + pageUrl);
      }
      fs.writeFileSync(cachePath, JSON.stringify(audit, null, 2) + '\n');
    }
    if (!audit.credits.length || !/\?book=/.test(audit.sourceFilesUrl)) {
      throw new Error('Invalid cached work audit for ' + pageUrl);
    }
    if ((index + 1) % 25 === 0 || index + 1 === keys.length) {
      process.stdout.write('Audited ' + (index + 1) + '/' + keys.length + ' Book Dash works\n');
    }
    return audit;
  });
  const byEditionUrl = new Map();
  for (const audit of audits) {
    for (const url of audit.related) byEditionUrl.set(url, audit);
  }
  return byEditionUrl;
}

async function main() {
  if (!process.argv.includes('--fetch')) {
    throw new Error('Use --fetch to confirm a live import from the official Book Dash API.');
  }
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  const records = await listRecords();
  const requestedLimit = Number(valueAfter('--limit') || records.length);
  const selected = records.slice(0, Math.max(0, requestedLimit));
  const workAudits = await buildWorkAuditMap();
  let fallbackCount = 0;
  const books = await mapLimit(selected, CONCURRENCY, async (record, index) => {
    let audit = workAudits.get(normalizedBookUrl(record.link));
    if (!audit) {
      fallbackCount++;
      const html = await fetchText(record.link);
      audit = {
        pageUrl: record.link,
        related: [normalizedBookUrl(record.link)],
        credits: creatorCredits(html),
        sourceFilesUrl: sourceFilesUrl(html, record.link)
      };
    }
    if (!audit.credits.length || !/\?book=/.test(audit.sourceFilesUrl)) {
      throw new Error('Required source-file or creator attribution markers missing for ' + record.link);
    }
    if ((index + 1) % 100 === 0 || index + 1 === selected.length) {
      process.stdout.write('Mapped ' + (index + 1) + '/' + selected.length + ' Book Dash editions\n');
    }
    return makeRecord(record, audit);
  });
  if (fallbackCount) process.stdout.write('Fetched ' + fallbackCount + ' edition pages not listed by a work page\n');
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  catalog.items = (catalog.items || []).filter((item) => !/^book-dash-\d+-/.test(item.slug));
  const registered = new Set(catalog.items.map((item) => item.slug));
  for (const book of books) {
    const file = 'books/' + book.slug + '.json';
    fs.writeFileSync(path.join(ROOT, file), JSON.stringify(book, null, 2) + '\n');
    if (!registered.has(book.slug)) {
      catalog.items.push({ slug: book.slug, file });
      registered.add(book.slug);
    }
  }
  fs.writeFileSync(outputPath(), JSON.stringify(catalog, null, 1) + '\n');
  console.log('Wrote ' + books.length + ' attributed Book Dash catalog records.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}

module.exports = { buildWorkAuditMap, clean, creatorCredits, makeRecord, normalizedBookUrl, outputPath, relatedBookUrls, sourceFilesUrl, taxonomyTerms };
