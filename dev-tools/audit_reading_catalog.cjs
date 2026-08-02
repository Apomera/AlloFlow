#!/usr/bin/env node
/**
 * Catalog health and rights audit for the AlloFlow Reading Library.
 *
 * This is deliberately local and deterministic: it never fetches provider
 * URLs. It checks the generated indexes, every referenced local book file,
 * and each record's declared usage policy. Use --json for machine-readable
 * CI output or --report <path> to write a report without changing catalog
 * content.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const LIBRARY = path.join(ROOT, 'reading_library');
const DEFAULT_STALE_DAYS = 45;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function asBooks(value, label) {
  if (!value || !Array.isArray(value.books)) throw new Error(`${label} must contain a books array`);
  return value.books;
}

function issue(severity, code, message, context) {
  return Object.assign({ severity, code, message }, context || {});
}

function parseArgs(argv) {
  const args = { json: false, report: null, staleDays: DEFAULT_STALE_DAYS, allowWarnings: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--allow-warnings') args.allowWarnings = true;
    else if (arg === '--report') args.report = argv[++i];
    else if (arg === '--stale-days') args.staleDays = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!Number.isFinite(args.staleDays) || args.staleDays < 0) throw new Error('--stale-days must be a non-negative number');
  return args;
}

function help() {
  return [
    'Usage: node dev-tools/audit_reading_catalog.cjs [options]',
    '',
    'Checks both generated indexes, referenced local book files, attribution',
    'fields, usage-policy boundaries, and mirror/index consistency.',
    '',
    'Options:',
    '  --json                 Print the complete report as JSON',
    '  --report <path>        Write JSON report inside the workspace',
    '  --stale-days <days>    Warn when an index is older than this (default 45)',
    '  --allow-warnings       Exit 0 when only warnings are present',
  ].join('\n');
}

function safeRelativeFile(file) {
  if (typeof file !== 'string' || !file) return null;
  const absolute = path.resolve(LIBRARY, file);
  const relative = path.relative(LIBRARY, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return absolute;
}

function urlLooksUsable(value) {
  return typeof value === 'string' && /^https?:\/\/[^\s]+$/i.test(value);
}

function hasReadableText(book) {
  return Array.isArray(book.pages) && book.pages.some((page) => typeof page?.text === 'string' && page.text.trim().length > 0);
}

function isCard(book, entry) {
  return String(entry?.contentType || book?.contentType || '').includes('card') || book?.usagePolicy?.access === 'link-only' || book?.usagePolicy?.access === 'link-out';
}

function auditCatalog(options) {
  const index = readJson(path.join(LIBRARY, 'index.json'));
  const cards = readJson(path.join(LIBRARY, 'index_cards.json'));
  const sources = [
    { id: 'core', file: 'index.json', value: index, entries: asBooks(index, 'reading_library/index.json') },
    { id: 'cards', file: 'index_cards.json', value: cards, entries: asBooks(cards, 'reading_library/index_cards.json') },
  ];
  const problems = [];
  const counts = { indexes: sources.length, records: 0, localFiles: 0, mirrored: 0, linkOnly: 0, cards: 0, withAudio: 0, withCover: 0, providers: 0, licenses: 0 };
  const providers = new Map();
  const licenses = new Map();
  const slugs = new Map();
  const files = new Map();

  for (const source of sources) {
    counts.records += source.entries.length;
    if (typeof source.value.generatedAt !== 'string') problems.push(issue('error', 'index-generated-at-missing', `${source.file} is missing generatedAt`, { index: source.file }));
    else {
      const stamp = Date.parse(source.value.generatedAt);
      if (!Number.isFinite(stamp)) problems.push(issue('error', 'index-generated-at-invalid', `${source.file} has an invalid generatedAt`, { index: source.file }));
      else if ((Date.now() - stamp) / 86400000 > options.staleDays) problems.push(issue('warning', 'index-stale', `${source.file} is older than ${options.staleDays} days`, { index: source.file, generatedAt: source.value.generatedAt }));
    }
    for (const entry of source.entries) {
      const context = { index: source.file, slug: entry.slug, sourceId: entry.sourceId };
      if (typeof entry.slug !== 'string' || !entry.slug) problems.push(issue('error', 'slug-missing', 'record has no slug', context));
      else {
        const seen = slugs.get(entry.slug) || [];
        seen.push(source.file);
        slugs.set(entry.slug, seen);
      }
      for (const field of ['title', 'language', 'langCode', 'level', 'sourceId', 'contentType', 'license', 'licenseUrl', 'file']) {
        if (entry[field] === undefined || entry[field] === null || entry[field] === '') problems.push(issue('error', 'index-field-missing', `record is missing ${field}`, Object.assign({ field }, context)));
      }
      if (entry.sourceId) providers.set(entry.sourceId, (providers.get(entry.sourceId) || 0) + 1);
      if (entry.license) licenses.set(entry.license, (licenses.get(entry.license) || 0) + 1);
      const absolute = safeRelativeFile(entry.file);
      if (!absolute) {
        problems.push(issue('error', 'file-path-invalid', 'record file must stay inside reading_library', context));
        continue;
      }
      const fileSeen = files.get(entry.file) || [];
      fileSeen.push(source.file);
      files.set(entry.file, fileSeen);
      if (!fs.existsSync(absolute)) {
        problems.push(issue('error', 'book-file-missing', `referenced book file is missing: ${entry.file}`, context));
        continue;
      }
      counts.localFiles += 1;
      let book;
      try { book = readJson(absolute); } catch (error) {
        problems.push(issue('error', 'book-json-invalid', `book file is not valid JSON: ${entry.file}`, Object.assign({ detail: error.message }, context)));
        continue;
      }
      if (book.schema !== 'allo-reading-book@1') problems.push(issue('error', 'book-schema-invalid', `book file has unexpected schema: ${book.schema || '(missing)'}`, context));
      for (const [field, expected] of [['slug', entry.slug], ['sourceId', entry.sourceId], ['contentType', entry.contentType]]) {
        if (book[field] !== expected) problems.push(issue('error', 'index-book-drift', `${field} differs between index and book file`, Object.assign({ field, indexValue: expected, bookValue: book[field] }, context)));
      }
      if (!Array.isArray(book.pages) || book.pages.length === 0) problems.push(issue('error', 'pages-missing', 'book has no readable pages', context));
      const card = isCard(book, entry);
      if (card) counts.cards += 1;
      if (book.usagePolicy?.access === 'mirrored') counts.mirrored += 1;
      if (book.usagePolicy?.access === 'link-only' || book.usagePolicy?.access === 'link-out') counts.linkOnly += 1;
      if (book.audio) counts.withAudio += 1;
      if (book.cover) counts.withCover += 1;
      if (!urlLooksUsable(book.source?.url)) problems.push(issue('error', 'source-url-missing', 'book source URL is missing or not HTTPS/HTTP', context));
      if (!urlLooksUsable(book.licenseUrl)) problems.push(issue('error', 'license-url-missing', 'book license URL is missing or not HTTPS/HTTP', context));
      if (book.usagePolicy?.attributionRequired && !urlLooksUsable(book.source?.attributionUrl || book.source?.url)) problems.push(issue('error', 'attribution-url-missing', 'attribution-required book has no source attribution URL', context));
      // Permission flags describe what a provider license permits; they do not
      // mean that a link-only source card is locally mirrored. A real mirror
      // carries a structured mirror provenance object and must declare mirrored
      // access explicitly.
      if (book.mirror && typeof book.mirror === 'object' && book.usagePolicy?.access !== 'mirrored') problems.push(issue('error', 'mirror-access-mismatch', 'book has mirror provenance but is not marked mirrored', context));      if (book.usagePolicy?.access === 'mirrored' && !hasReadableText(book)) problems.push(issue('error', 'mirrored-text-missing', 'mirrored book has no local page text', context));
      if (book.usagePolicy?.access === 'mirrored' && !book.usagePolicy.attributionRequired) problems.push(issue('warning', 'mirrored-attribution-flag-missing', 'mirrored book does not declare attributionRequired', context));
      if (book.usagePolicy?.access === 'mirrored' && !book.mirror && !book.mirror?.contentDigest) problems.push(issue('warning', 'mirror-provenance-missing', 'mirrored book has no mirror provenance record', context));
      if (!card && !hasReadableText(book)) problems.push(issue('error', 'readable-text-missing', 'non-card book has no local page text', context));
    }
  }
  for (const [slug, indexes] of slugs) if (indexes.length > 1) problems.push(issue('error', 'duplicate-slug', `slug appears in multiple index records: ${indexes.join(', ')}`, { slug, indexes }));
  for (const [file, indexes] of files) if (indexes.length > 1) problems.push(issue('warning', 'duplicate-file-reference', `book file is referenced by multiple indexes: ${indexes.join(', ')}`, { file, indexes }));
  counts.providers = providers.size;
  counts.licenses = licenses.size;
  const bySeverity = { error: problems.filter((item) => item.severity === 'error').length, warning: problems.filter((item) => item.severity === 'warning').length };
  return {
    schema: 'allo-reading-catalog-health@1',
    generatedAt: new Date().toISOString(),
    staleDays: options.staleDays,
    status: bySeverity.error ? 'error' : (bySeverity.warning ? 'warning' : 'ok'),
    counts,
    providers: Object.fromEntries([...providers].sort((a, b) => a[0].localeCompare(b[0]))),
    licenses: Object.fromEntries([...licenses].sort((a, b) => a[0].localeCompare(b[0]))),
    problems,
    summary: bySeverity,
  };
}

function render(report) {
  const lines = [
    `Reading catalog health: ${report.status.toUpperCase()}`,
    `Records ${report.counts.records} · local files ${report.counts.localFiles} · mirrored ${report.counts.mirrored} · link-only/link-out ${report.counts.linkOnly}`,
    `Providers ${report.counts.providers} · licenses ${report.counts.licenses} · cards ${report.counts.cards} · audio ${report.counts.withAudio} · covers ${report.counts.withCover}`,
    `Problems: ${report.summary.error} error(s), ${report.summary.warning} warning(s)`,
  ];
  for (const problem of report.problems) lines.push(`  ${problem.severity.toUpperCase()} ${problem.code}: ${problem.message}${problem.slug ? ` [${problem.slug}]` : ''}`);
  return lines.join('\n');
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.help) { console.log(help()); return 0; }
  const report = auditCatalog(options);
  if (options.report) {
    const target = path.resolve(ROOT, options.report);
    const relative = path.relative(ROOT, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('--report must stay inside the workspace');
    fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n', 'utf8');
  }
  console.log(options.json ? JSON.stringify(report, null, 2) : render(report));
  return report.summary.error || (report.summary.warning && !options.allowWarnings) ? 1 : 0;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(`✗ audit_reading_catalog: ${error.message}`); process.exitCode = 1; }
}

module.exports = { auditCatalog, parseArgs, render };
