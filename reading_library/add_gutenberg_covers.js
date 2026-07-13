#!/usr/bin/env node
/**
 * add_gutenberg_covers.js — fill in cover thumbnails for Gutenberg entries
 * (catalog cards and full texts) that have none, using Gutendex's generated
 * cover URLs (formats["image/jpeg"]). The Reading Library browse grid shows a
 * generic 📖 placeholder without them; StoryWeaver books have always had real
 * covers, so the open catalog looked bare by comparison.
 *
 * Idempotent: books that already have a cover are skipped, so this can be
 * re-run after any importer round. Covers are stored as plain URL strings
 * (StoryWeaver covers are {card,large} objects; mirror_books.js accepts both).
 *
 * Run AFTER importers, BEFORE mirror_books.js --fetch (which rebuilds the
 * index from the book files on disk).
 *
 * Usage:
 *   node reading_library/add_gutenberg_covers.js            # write covers
 *   node reading_library/add_gutenberg_covers.js --dry-run  # report only
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const OPEN_CATALOG_PATH = path.join(ROOT, 'open_catalog.json');
const GUTENDEX = 'https://gutendex.com/books/';
const UA = 'AlloFlow reading library cover backfill';
const BATCH = 32; // Gutendex page size; one ?ids= call per batch.
const dryRun = process.argv.includes('--dry-run');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(url, attempt) {
  attempt = attempt || 1;
  try {
    return JSON.parse(execFileSync('curl', [
      '-sSL', '--fail', '--max-time', '45',
      '-H', 'User-Agent: ' + UA,
      '-H', 'Accept: application/json',
      url,
    ], { maxBuffer: 32 * 1024 * 1024 }).toString('utf8'));
  } catch (err) {
    if (attempt < 3) return getJson(url, attempt + 1);
    throw new Error('Could not fetch ' + url + ': ' + String(err.message || err).slice(0, 160));
  }
}

async function main() {
  const catalog = readJson(OPEN_CATALOG_PATH);
  const wanted = []; // { id, file, book }
  for (const item of catalog.items || []) {
    const match = /^gutenberg-ebook-(\d+)-/.exec(item.slug || '');
    if (!match) continue;
    const file = path.join(ROOT, item.file || ('books/' + item.slug + '.json'));
    if (!fs.existsSync(file)) continue;
    const book = readJson(file);
    if (book.cover) continue;
    wanted.push({ id: Number(match[1]), file, book });
  }
  console.log('Gutenberg entries missing a cover: ' + wanted.length);

  let written = 0;
  let noCover = 0;
  for (let i = 0; i < wanted.length; i += BATCH) {
    const batch = wanted.slice(i, i + BATCH);
    const byId = new Map(batch.map((w) => [w.id, w]));
    const data = getJson(GUTENDEX + '?ids=' + batch.map((w) => w.id).join(','));
    for (const record of data.results || []) {
      const entry = byId.get(record.id);
      if (!entry) continue;
      const cover = (record.formats && (record.formats['image/jpeg'] || record.formats['image/png'])) || null;
      if (!cover) { noCover++; continue; }
      entry.book.cover = cover;
      if (!dryRun) writeJson(entry.file, entry.book);
      written++;
    }
    console.log('  batch ' + (Math.floor(i / BATCH) + 1) + '/' + Math.ceil(wanted.length / BATCH) + ' — covers so far: ' + written);
    await sleep(300);
  }
  console.log((dryRun ? '[DRY RUN] would write ' : 'Wrote ') + written + ' covers; ' + noCover + ' records had none; ' +
    (wanted.length - written - noCover) + ' ids missing from Gutendex.');
  console.log('Now rebuild the index: node reading_library/mirror_books.js --fetch');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
