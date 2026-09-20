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
  // CASEL-aligned packs (SEL, Crew, HOWL) are SEL / Character even when they also cite ELA or C3.
  if (s.includes('CASEL')) return 'SEL / Character';
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

// These tags describe actual resources; curated topical tags cannot override them.
const CAPABILITY_TAGS = new Set(['memory-aid', 'applied-challenge', 'illustrated', 'text-only']);
function isImageReference(value) {
  return typeof value === 'string' && /^(?:data:image\/|https?:\/\/|blob:)|\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value.trim());
}
function hasResourceImages(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasResourceImages);
  return Object.entries(value).some(([key, child]) =>
    (['image', 'imageUrl', 'iconUrl'].includes(key) && isImageReference(child)) ||
    (child && typeof child === 'object' && hasResourceImages(child)));
}
function capabilityTags(pack) {
  const history = Array.isArray(pack.history) ? pack.history : [];
  const types = new Set(history.filter(Boolean).map(r => r.type));
  const tags = [];
  if (types.has('memory-aid')) tags.push('memory-aid');
  if (types.has('applied-challenge')) tags.push('applied-challenge');
  tags.push(hasResourceImages(history) ? 'illustrated' : 'text-only');
  return tags;
}
function reconcileCapabilityTags(pack, tags) {
  const actual = capabilityTags(pack), valid = new Set(actual), seen = new Set(), result = [];
  for (const value of Array.isArray(tags) ? tags : []) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const tag = value.trim(), canonical = tag.toLowerCase();
    if (CAPABILITY_TAGS.has(canonical) && !valid.has(canonical)) continue;
    if (!seen.has(canonical)) { result.push(CAPABILITY_TAGS.has(canonical) ? canonical : tag); seen.add(canonical); }
  }
  for (const tag of actual) if (!seen.has(tag)) { result.push(tag); seen.add(tag); }
  return result;
}
function tagsFor(pack, slug) {
  const words = slug.replace(/_grade\d+(_\d+)?$/, '').split('_');
  const tags = [words.join('-')];
  const s = String((pack.allopack && pack.allopack.standards) || '').toUpperCase();
  if (s.includes('CASEL')) tags.push('sel');
  if (s.includes('HOWL')) tags.push('howl');
  if (s.includes('CREW')) tags.push('crew');
  if (s.includes('NGSS')) tags.push('ngss');
  if (s.includes('CCSS')) tags.push('ccss');
  if (s.includes('C3 ')) tags.push('c3');
  return reconcileCapabilityTags(pack, tags);
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
// and topical tags survive regeneration. Resource capability tags always follow pack contents.
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
  derived.tags = reconcileCapabilityTags(pack, derived.tags);
  return derived;
}

module.exports = { subjectFor, gradeFor, tagsFor, capabilityTags, reconcileCapabilityTags, readPack, entryFromPack };
