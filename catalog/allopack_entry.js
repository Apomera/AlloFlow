'use strict';
// ONE derivation of a Community Catalog manifest entry from an AlloPack file.
//
// Used by catalog/generate_index.js (which writes index.json) and by
// dev-tools/build_allopack_catalog_entries.cjs (which publishes packs). These
// rules used to live only in the dev-tool, so the index generator could not
// reproduce an AlloPack entry at all and silently dropped every one on
// regeneration. Two copies would drift again; keep them here.
const fs = require('fs');
const path = require('path');

function subjectFor(pack, slug) {
  const s = String((pack.allopack && pack.allopack.standards) || '').toUpperCase();
  if (s.includes('NGSS')) return 'Science';
  if (s.includes('MATH')) return 'Math';
  if (s.includes('C3 ') || s.includes('RH.')) return 'Social Studies';
  if (s.includes('ELA')) return 'English Language Arts';
  return slug.includes('math') ? 'Math' : 'General';
}

function gradeFor(pack) {
  const raw = String((pack.allopack && pack.allopack.gradeLevel) || '');
  const m = raw.match(/\d+/g);
  if (!m) return raw;
  const a = m.map(Number);
  return a.length > 1 ? Math.min(...a) + '-' + Math.max(...a) : String(a[0]);
}

function tagsFor(pack, slug) {
  const words = slug.replace(/_grade\d+$/, '').split('_');
  const tags = [words.join('-')];
  const types = new Set((pack.history || []).map((r) => r.type));
  if (types.has('memory-aid')) tags.push('memory-aid');
  if (types.has('applied-challenge')) tags.push('applied-challenge');
  const s = String((pack.allopack && pack.allopack.standards) || '').toUpperCase();
  if (s.includes('NGSS')) tags.push('ngss');
  if (s.includes('CCSS')) tags.push('ccss');
  if (s.includes('C3 ')) tags.push('c3');
  tags.push('text-only');
  return tags;
}

// Packs may carry a UTF-8 BOM (Windows editors); JSON.parse rejects it.
function readPack(repoRoot, rel) {
  const text = fs.readFileSync(path.join(repoRoot, rel), 'utf8').replace(/^﻿/, '');
  const pack = JSON.parse(text);
  if (!pack || typeof pack !== 'object' || !pack.allopack || !Array.isArray(pack.history)) {
    throw new Error(rel + ' is not an AlloPack (expected an "allopack" block and a "history" array)');
  }
  return pack;
}

// `published` is one record from catalog/published_allopacks.json: `{ path }` at minimum.
// Any other field on it OVERRIDES the derived value, so a hand-curated slug, title, credit
// or tag list survives regeneration byte-for-byte.
function entryFromPack(repoRoot, published) {
  const rel = published.path;
  const pack = readPack(repoRoot, rel);
  const slug = path.basename(rel).replace(/\.allopack\.json$/, '');
  const derived = {
    slug,
    title: pack.allopack.title,
    subject: subjectFor(pack, slug),
    grade_level: gradeFor(pack),
    tags: tagsFor(pack, slug),
    credit: 'AlloFlow flagship; AI-authored, educator review pending',
    license: pack.allopack.license || 'CC-BY-4.0',
    submitted_at: pack.allopack.createdAt || null,
    path: rel,
  };
  for (const key of Object.keys(published)) {
    if (key === 'path') continue;
    if (published[key] !== undefined && published[key] !== null) derived[key] = published[key];
  }
  return derived;
}

module.exports = { subjectFor, gradeFor, tagsFor, readPack, entryFromPack };
