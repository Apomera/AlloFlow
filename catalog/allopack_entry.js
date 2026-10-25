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

// "CODE (gloss); CODE (gloss)" -> [{ code, description }]. Glosses may contain ';'.
function parseStandards(value) {
  const text = Array.isArray(value) ? value.filter(v => typeof v === 'string').join('; ') : typeof value === 'string' ? value : '';
  const items = [];
  let depth = 0, current = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { items.push(current); current = ''; } else current += ch;
  }
  items.push(current);
  return items.map(item => item.trim()).filter(Boolean).slice(0, 40).map(item => {
    const m = item.match(/^([^()]+?)\s*\(([\s\S]*)\)$/);
    const code = (m ? m[1] : item).trim().slice(0, 120), description = m ? m[2].trim().slice(0, 400) : '';
    return description ? { code, description } : { code };
  });
}
// Display form: "CCSS.ELA-LITERACY.SL.6.1" -> "SL.6.1", "NGSS MS-LS1-1" -> "MS-LS1-1".
function shortStandardCode(code) {
  return String(code || '').replace(/^CCSS\.(?:ELA-LITERACY|MATH\.CONTENT)\./i, '').replace(/^(?:C3(?: Framework)?|NGSS)\s+/i, '').trim();
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

function publicSourceUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch (_) { return null; }
}

function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

// Older drafts used a review instruction in the license field. It is not a grant
// of reuse rights. Preserve explicitly supplied license terms; never invent one.
const REVIEW_LICENSE_PLACEHOLDERS = new Set(['teacher review required', 'educator review required', 'educator review pending']);
const UNSPECIFIED_LICENSE_PLACEHOLDERS = new Set(['', 'not specified', 'unspecified']);
function catalogLicense(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return REVIEW_LICENSE_PLACEHOLDERS.has(text.toLowerCase()) || UNSPECIFIED_LICENSE_PLACEHOLDERS.has(text.toLowerCase())
    ? 'Not specified' : text;
}
function reviewStatus(pack, rawLicense) {
  const status = pack.allopack?.reviewStatus;
  if (typeof status === 'string' && status.trim()) return status.trim().slice(0,500);
  return REVIEW_LICENSE_PLACEHOLDERS.has(String(rawLicense || '').trim().toLowerCase()) ? 'Educator review pending' : null;
}

// These describe this exact version, not a different edition or a catalog submission date.
function resourceDetails(pack) {
  const counts = new Map();
  for (const resource of pack.history.filter(Boolean)) {
    const type = typeof resource.type === 'string' ? resource.type : 'resource';
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  const meta = pack.allopack || {}, basis = meta.sourceBasis || {};
  const existingIds = new Set(pack.history.filter(Boolean).map(resource => resource.id).filter(id => typeof id === 'string' && id));
  const coreIds = meta.workflowRevision?.coreResourceIds;
  const coreCount = Array.isArray(coreIds) ? new Set(coreIds.filter(id => typeof id === 'string' && existingIds.has(id))).size : 0;
  const sourceLinks = [], seen = new Set();
  const candidates = [...(Array.isArray(basis.sources) ? basis.sources : [])];
  if (basis.articleUrl) candidates.unshift({url:basis.articleUrl, title:basis.articleTitle || 'Original blog post', author:basis.articleAuthor});
  for (const item of candidates) {
    const url = publicSourceUrl(item && item.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sourceLinks.push({url, title:String(item.title || 'Original source').slice(0,200), ...(item.author ? {author:String(item.author).slice(0,120)} : {})});
  }
  return {
    resource_count: pack.history.filter(Boolean).length,
    ...(coreCount > 0 ? {core_resource_count:coreCount} : {}),
    resource_types: [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => ({type, count})),
    source_links: sourceLinks,
    created_at: isoDate(meta.createdAt),
    updated_at: isoDate(meta.updatedAt),
    ...(typeof meta.audience === 'string' && meta.audience.trim() ? {audience:meta.audience.trim().slice(0,500)} : {}),
    ...(typeof meta.learningPurpose === 'string' && meta.learningPurpose.trim() ? {learning_purpose:meta.learningPurpose.trim().slice(0,500)} : {}),
  };
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
    license: pack.allopack.license || 'Not specified',
    submitted_at: pack.allopack.createdAt || null,
    path: rel,
  };
  const standards = parseStandards(pack.allopack.standards);
  if (standards.length) derived.standards = standards;
  for (const key of Object.keys(published)) {
    if (key === 'path') continue;
    if (published[key] !== undefined && published[key] !== null) derived[key] = published[key];
  }
  const rawLicense = derived.license;
  derived.license = catalogLicense(rawLicense);
  derived.review_status = reviewStatus(pack, rawLicense);
  derived.tags = reconcileCapabilityTags(pack, derived.tags);
  delete derived.core_resource_count;
  Object.assign(derived, resourceDetails(pack));
  // Share aliases are independent of catalog ids: old ?lesson= links stay valid.
  derived.share_slug = derived.share_slug || derived.slug.toLowerCase().replace(/_/g, '-');
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/.test(derived.share_slug)) throw new Error('Invalid share alias for ' + rel);
  return derived;
}

module.exports = { subjectFor, gradeFor, tagsFor, capabilityTags, reconcileCapabilityTags, parseStandards, shortStandardCode, readPack, entryFromPack, publicSourceUrl, isoDate, resourceDetails, catalogLicense, reviewStatus };
