#!/usr/bin/env node
'use strict';
// Prints Community Catalog manifest entries for every pack in allopacks/ that is not yet in
// catalog/index.json. Read-only by default: it never writes the manifest, because raw main IS
// the live catalog (catalog_module.js MANIFEST_URL) and any push publishes immediately.
//
//   node dev-tools/build_allopack_catalog_entries.cjs           # print missing entries as JSON
//   node dev-tools/build_allopack_catalog_entries.cjs --apply   # append them to catalog/index.json
//
// The --apply path is deliberate friction: run it only when the packs have passed the seed
// plan's manual smoke checks (docs/COMMUNITY_CATALOG_SEED_PLAN.md, checks 2-7) and the user
// has decided to publish. Text-only packs get the credit "AI-authored, educator review pending".
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'catalog/index.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const have = new Set(manifest.entries.map((e) => e.path));
const files = fs.readdirSync(path.join(root, 'allopacks')).filter((f) => f.endsWith('.allopack.json')).sort();

function subjectFor(pack, slug) {
  const s = (pack.allopack.standards || '').toUpperCase();
  if (s.includes('NGSS')) return 'Science';
  if (s.includes('MATH')) return 'Math';
  if (s.includes('C3 ') || s.includes('RH.')) return 'Social Studies';
  if (s.includes('ELA')) return 'English Language Arts';
  return slug.includes('math') ? 'Math' : 'General';
}
function gradeFor(pack) {
  const m = String(pack.allopack.gradeLevel).match(/\d+/g);
  if (!m) return String(pack.allopack.gradeLevel);
  const a = m.map(Number);
  return a.length > 1 ? Math.min(...a) + '-' + Math.max(...a) : String(a[0]);
}
function tagsFor(pack, slug) {
  const words = slug.replace(/_grade\d+$/, '').split('_');
  const tags = [words.join('-')];
  const types = new Set(pack.history.map((r) => r.type));
  if (types.has('memory-aid')) tags.push('memory-aid');
  if (types.has('applied-challenge')) tags.push('applied-challenge');
  const s = (pack.allopack.standards || '').toUpperCase();
  if (s.includes('NGSS')) tags.push('ngss');
  if (s.includes('CCSS')) tags.push('ccss');
  if (s.includes('C3 ')) tags.push('c3');
  tags.push('text-only');
  return tags;
}
const entries = [];
for (const f of files) {
  const rel = 'allopacks/' + f;
  if (have.has(rel)) continue;
  const pack = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8').replace(/^﻿/, ''));
  const slug = f.replace('.allopack.json', '');
  entries.push({
    slug,
    title: pack.allopack.title,
    subject: subjectFor(pack, slug),
    grade_level: gradeFor(pack),
    tags: tagsFor(pack, slug),
    credit: 'AlloFlow flagship; AI-authored, educator review pending',
    license: pack.allopack.license || 'CC-BY-4.0',
    submitted_at: new Date().toISOString(),
    path: rel,
  });
}
if (process.argv.includes('--apply')) {
  manifest.entries.push(...entries);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('appended', entries.length, 'entries to catalog/index.json (NOT committed, NOT pushed)');
} else {
  console.log(JSON.stringify(entries, null, 2));
  console.error('\n' + entries.length + ' packs are not in the catalog. Nothing written; pass --apply to append.');
}
