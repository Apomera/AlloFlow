#!/usr/bin/env node
'use strict';
// Publishes AlloPacks to the Community Catalog.
//
//   node dev-tools/build_allopack_catalog_entries.cjs           # print the entries that WOULD be added
//   node dev-tools/build_allopack_catalog_entries.cjs --apply   # publish: append to published_allopacks.json
//                                                               #          and regenerate catalog/index.json
//
// Read-only by default: raw main IS the live catalog (catalog_module.js MANIFEST_URL), so any
// push publishes immediately. --apply is deliberate friction — run it only when the packs have
// passed the seed plan's manual smoke checks (docs/COMMUNITY_CATALOG_SEED_PLAN.md, checks 2-7)
// and the user has decided to publish.
//
// This used to append straight into index.json, which the index generator then could not
// reproduce (it only knew about catalog/approved/), so the next regeneration deleted every
// AlloPack entry. Publishing now goes through catalog/published_allopacks.json — the source
// the generator reads — and the entry rules live in one place, catalog/allopack_entry.js.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { entryFromPack, readPack } = require(path.join(root, 'catalog', 'allopack_entry.js'));
const gen = require(path.join(root, 'catalog', 'generate_index.js'));

const published = fs.existsSync(gen.PUBLISHED_PATH) ? JSON.parse(fs.readFileSync(gen.PUBLISHED_PATH, 'utf8')) : [];
const have = new Set(published.map((p) => p.path));
const files = fs.readdirSync(path.join(root, 'allopacks')).filter((f) => f.endsWith('.allopack.json')).sort();

const additions = [];
for (const f of files) {
  const rel = 'allopacks/' + f;
  if (have.has(rel)) continue;
  const pack = readPack(root, rel);
  // A stable timestamp: the pack's own authoring date, never "now", so regenerating the
  // index later produces the same bytes.
  additions.push({ path: rel, submitted_at: pack.allopack.createdAt || new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z' });
}

const preview = additions.map((p) => entryFromPack(root, p));

if (process.argv.includes('--apply')) {
  fs.writeFileSync(gen.PUBLISHED_PATH, JSON.stringify([...published, ...additions], null, 2) + '\n');
  const manifest = gen.buildManifest();
  fs.writeFileSync(gen.INDEX_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log('published', additions.length, 'pack(s): appended to catalog/published_allopacks.json and regenerated catalog/index.json (' + manifest.entries.length + ' entries; NOT committed, NOT pushed)');
} else {
  console.log(JSON.stringify(preview, null, 2));
  console.error('\n' + additions.length + ' pack(s) are not in the catalog. Nothing written; pass --apply to publish.');
}
