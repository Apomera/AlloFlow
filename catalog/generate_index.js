#!/usr/bin/env node
/**
 * Regenerates catalog/index.json from the contents of catalog/approved/.
 *
 * Usage:
 *   node catalog/generate_index.js
 *
 * Reads every *.json file in catalog/approved/, extracts its metadata, and
 * writes a sorted manifest to catalog/index.json. Run after approving
 * (moving a file from pending/ to approved/) or rejecting an entry.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const APPROVED_DIR = path.join(ROOT, 'approved');
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

function main() {
  if (!fs.existsSync(APPROVED_DIR)) {
    console.error(`approved/ directory not found at ${APPROVED_DIR}`);
    process.exit(1);
  }

  const entries = fs
    .readdirSync(APPROVED_DIR)
    .filter(name => name.endsWith('.json'))
    .map(name => {
      const payload = readJsonSafe(path.join(APPROVED_DIR, name));
      return payload ? buildEntry(name, payload) : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.title.localeCompare(b.title));

  const manifest = {
    schema_version: '1.0',
    generated_at: new Date().toISOString(),
    entries,
  };

  fs.writeFileSync(INDEX_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${INDEX_PATH} with ${entries.length} entries.`);
}

main();
