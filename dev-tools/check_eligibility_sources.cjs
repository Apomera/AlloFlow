#!/usr/bin/env node
// Validate the Diagnosis, Evaluation & School Eligibility source trail.
//
// Default mode is deterministic: it checks URL shape/host policy, source
// coverage, review-date freshness, and source/mirror parity. Pass --online for
// an opt-in HEAD/GET probe when maintaining the federal links manually.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'stem_lab', 'stem_tool_eligibility.js');
const MIRROR = path.join(ROOT, 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_eligibility.js');
const MAX_AGE_DAYS = Number(process.env.ALLO_ELIGIBILITY_SOURCE_MAX_AGE_DAYS || 365);
const ONLINE = process.argv.includes('--online');
const QUIET = process.argv.includes('--quiet');

const ALLOWED_HOSTS = new Set(['sites.ed.gov', 'www.ecfr.gov', 'www.ed.gov']);

function fail(message) {
  console.error('  ✗ ' + message);
  process.exitCode = 1;
}

if (!fs.existsSync(SOURCE)) { fail('Missing source: ' + path.relative(ROOT, SOURCE)); process.exit(1); }
if (!fs.existsSync(MIRROR)) { fail('Missing mirror: ' + path.relative(ROOT, MIRROR)); process.exit(1); }

const source = fs.readFileSync(SOURCE, 'utf8');
const mirror = fs.readFileSync(MIRROR, 'utf8');
const failures = [];
const warnings = [];

if (source !== mirror) failures.push('desktop mirror differs from the canonical eligibility source');

function blockBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) return null;
  return source.slice(start, end);
}

const officialBlock = blockBetween('var OFFICIAL_SOURCES = [', '  ];');
const prepBlock = blockBetween('var PREP_SOURCE_URLS = [', '  ];');
if (!officialBlock) failures.push('OFFICIAL_SOURCES block is missing or malformed');
if (!prepBlock) failures.push('PREP_SOURCE_URLS block is missing or malformed');

const official = [];
if (officialBlock) {
  const re = /\{\s*label:\s*'([^']+)',\s*href:\s*'([^']+)'\s*\}/g;
  for (const match of officialBlock.matchAll(re)) official.push({ label: match[1], href: match[2] });
}
const prepUrls = prepBlock ? [...prepBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]) : [];

if (official.length < 10) failures.push('expected at least 10 official source entries; found ' + official.length);
const officialUrls = new Set();
for (const item of official) {
  if (!item.label.trim()) failures.push('an official source has an empty label');
  if (officialUrls.has(item.href)) failures.push('duplicate official URL: ' + item.href);
  officialUrls.add(item.href);
  let parsed;
  try { parsed = new URL(item.href); } catch (_) { failures.push('invalid official URL: ' + item.href); continue; }
  if (parsed.protocol !== 'https:') failures.push('official URL is not HTTPS: ' + item.href);
  if (!ALLOWED_HOSTS.has(parsed.hostname)) failures.push('official URL host is outside the allowlist: ' + parsed.hostname);
  if (parsed.username || parsed.password) failures.push('official URL contains credentials: ' + item.href);
}
for (const url of prepUrls) {
  if (!officialUrls.has(url)) failures.push('prep export URL is not present in OFFICIAL_SOURCES: ' + url);
}

const dateMatch = source.match(/var SOURCE_REVIEWED_DATE = '([^']+)'/);
const labelMatch = source.match(/var SOURCE_REVIEWED_LABEL = '([^']+)'/);
if (!dateMatch) failures.push('SOURCE_REVIEWED_DATE is missing');
if (!labelMatch) failures.push('SOURCE_REVIEWED_LABEL is missing');
let reviewedDate = null;
if (dateMatch) {
  const candidate = dateMatch[1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) failures.push('SOURCE_REVIEWED_DATE must use YYYY-MM-DD: ' + candidate);
  else {
    const parsed = new Date(candidate + 'T00:00:00Z');
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate) failures.push('SOURCE_REVIEWED_DATE is not a real calendar date: ' + candidate);
    else reviewedDate = parsed;
  }
}
if (dateMatch && labelMatch && !labelMatch[1].includes(dateMatch[1].slice(0, 4))) {
  failures.push('SOURCE_REVIEWED_LABEL does not include the review year');
}
if (reviewedDate && Number.isFinite(MAX_AGE_DAYS) && MAX_AGE_DAYS >= 0) {
  const ageDays = Math.floor((Date.now() - reviewedDate.getTime()) / 86400000);
  if (ageDays > MAX_AGE_DAYS) failures.push('source review is ' + ageDays + ' days old; refresh SOURCE_REVIEWED_DATE and recheck links');
  if (ageDays < -31) warnings.push('source review date is more than 31 days in the future; confirm the date is intentional');
}

async function onlineProbe() {
  if (!ONLINE) return;
  if (typeof fetch !== 'function') { failures.push('--online requires a runtime with fetch'); return; }
  for (const item of official) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      let response = await fetch(item.href, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
      if (response.status === 405 || response.status === 403) {
        response = await fetch(item.href, { method: 'GET', redirect: 'follow', signal: controller.signal, headers: { Range: 'bytes=0-0' } });
      }
      if (!response.ok) failures.push('online probe returned HTTP ' + response.status + ': ' + item.href);
    } catch (error) {
      failures.push('online probe failed for ' + item.href + ': ' + (error && error.message ? error.message : error));
    } finally {
      clearTimeout(timer);
    }
  }
}

(async () => {
  await onlineProbe();
  if (!QUIET || failures.length) {
    console.log('Eligibility source maintenance check');
    console.log('  Official links: ' + official.length);
    console.log('  Prep-export links: ' + prepUrls.length);
    console.log('  Review date: ' + (dateMatch ? dateMatch[1] : 'missing') + ' (max age ' + MAX_AGE_DAYS + ' days)');
    console.log('  Mirror parity: ' + (source === mirror ? 'ok' : 'drift')); 
  }
  for (const warning of warnings) console.warn('  ⚠ ' + warning);
  for (const failure of failures) console.error('  ✗ ' + failure);
  if (failures.length) {
    console.error('  ✗ Eligibility source check failed.');
    process.exitCode = 1;
  } else if (!QUIET) {
    console.log('  ✓ Eligibility source check passed.');
  }
})();

