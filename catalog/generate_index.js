#!/usr/bin/env node
/**
 * Regenerates catalog/index.json from BOTH of the catalog's sources:
 *
 *   catalog/approved/<slug>.json          community submissions a maintainer approved
 *   catalog/published_allopacks.json      flagship AlloPacks published from allopacks/
 *
 * Usage:
 *   node catalog/generate_index.js
 *
 * WHY TWO SOURCES. The original generator walked approved/ only. The live
 * illustrated Water Cycle pilot lives in allopacks/ and was pasted into
 * index.json by hand, so the README's approval workflow ("run generate_index
 * after approving") would have silently deleted it from the live catalog the
 * first time anyone approved a community submission. Raw main IS the live
 * catalog, so that would have shipped within minutes. Publish an AlloPack with
 * `node dev-tools/build_allopack_catalog_entries.cjs --apply`, which appends to
 * published_allopacks.json and regenerates; never edit index.json by hand.
 *
 * tests/catalog_index.test.js asserts that regenerating reproduces the
 * committed index and that every entry's path exists.
 */

const fs = require('fs');
const path = require('path');
const { entryFromPack } = require('./allopack_entry');

const ROOT = path.resolve(__dirname);
const REPO_ROOT = path.resolve(ROOT, '..');
const APPROVED_DIR = path.join(ROOT, 'approved');
const PUBLISHED_PATH = path.join(ROOT, 'published_allopacks.json');
const INDEX_PATH = path.join(ROOT, 'index.json');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`[skip] Could not parse ${path.basename(filePath)}: ${err.message}`);
    return null;
  }
}

function buildEntry(filename, payload) {
  const slug = filename.replace(/\.json$/, '');
  const meta = payload.metadata || {};
  return {
    slug,
    title: meta.title || slug,
    subject: meta.subject || 'Other',
    grade_level: meta.grade_level || '',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    credit: meta.credit || null,
    license: meta.license || 'CC-BY-SA-4.0',
    submitted_at: payload.submitted_at || null,
    path: `catalog/approved/${filename}`,
  };
}

function approvedEntries() {
  if (!fs.existsSync(APPROVED_DIR)) throw new Error(`approved/ directory not found at ${APPROVED_DIR}`);
  return fs
    .readdirSync(APPROVED_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const payload = readJsonSafe(path.join(APPROVED_DIR, name));
      return payload ? buildEntry(name, payload) : null;
    })
    .filter(Boolean);
}

function publishedAllopackEntries() {
  if (!fs.existsSync(PUBLISHED_PATH)) return [];
  const list = JSON.parse(fs.readFileSync(PUBLISHED_PATH, 'utf8'));
  if (!Array.isArray(list)) throw new Error('published_allopacks.json must be a JSON array');
  return list.map((published, i) => {
    if (!published || typeof published.path !== 'string') {
      throw new Error(`published_allopacks.json[${i}] needs a repo-relative "path"`);
    }
    if (!fs.existsSync(path.join(REPO_ROOT, published.path))) {
      // Fail loudly: a dangling entry would publish a 404 to every teacher.
      throw new Error(`published AlloPack is missing on disk: ${published.path} (restore the file or remove it from published_allopacks.json)`);
    }
    return entryFromPack(REPO_ROOT, published);
  });
}

function buildManifest() {
  const entries = [...approvedEntries(), ...publishedAllopackEntries()];
  const seenPath = new Set();
  const seenSlug = new Set();
  for (const e of entries) {
    if (seenPath.has(e.path)) throw new Error(`duplicate catalog path: ${e.path}`);
    if (seenSlug.has(e.slug)) throw new Error(`duplicate catalog slug: ${e.slug}`);
    seenPath.add(e.path);
    seenSlug.add(e.slug);
  }
  entries.sort((a, b) => a.title.localeCompare(b.title));
  return {
    schema_version: '1.0',
    generated_at: new Date().toISOString(),
    entries,
  };
}

function main() {
  const manifest = buildManifest();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  const packs = manifest.entries.filter((e) => !e.path.startsWith('catalog/approved/')).length;
  console.log(`Wrote ${INDEX_PATH} with ${manifest.entries.length} entries (${manifest.entries.length - packs} approved submissions, ${packs} published AlloPacks).`);
}

if (require.main === module) main();

module.exports = { buildManifest, approvedEntries, publishedAllopackEntries, INDEX_PATH, PUBLISHED_PATH, REPO_ROOT };
