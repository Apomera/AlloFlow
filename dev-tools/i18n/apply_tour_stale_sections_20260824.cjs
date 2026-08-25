#!/usr/bin/env node
// Apply hand-authored translations for the two sections added to the tour copy.
// Existing translated prose is preserved: actions sections are appended and the
// brainstorm sections are inserted after the translated opening paragraph.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lang_src_lib.cjs');

const argv = process.argv.slice(2);
const PAYLOAD = argv.find(arg => !arg.startsWith('--'));
const APPLY = argv.includes('--apply');
const STAMP = 'tour-sections-20260824';
const MIRROR_DIR = path.join(L.ROOT, 'desktop', 'web-app', 'public', 'lang');

if (!PAYLOAD || !fs.existsSync(PAYLOAD)) {
  console.error('Usage: apply_tour_stale_sections_20260824.cjs <payload.json> [--apply]');
  process.exit(2);
}

const payload = PAYLOAD.endsWith('.cjs')
  ? require(path.resolve(PAYLOAD))
  : JSON.parse(fs.readFileSync(PAYLOAD, 'utf8'));
const known = new Set(L.getLangSlugs());
const errors = [];
const report = [];
const source = L.loadSourceStrings();
const ACTIONS = 'tour.actions_text';
const BRAINSTORM = 'tour.brainstorm_text';

function placeholders(value) {
  return [...String(value).matchAll(/\$\{[^}]*\}|\{[^}\s]+\}|<\/?[a-zA-Z][^>]*>/g)]
    .map(match => match[0]).sort().join('\u0001');
}

function replaceFile(file, text) {
  const temporary = `${file}.tour-sections-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    try {
      fs.renameSync(temporary, file);
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN'].includes(error.code)) throw error;
      fs.writeFileSync(file, text, 'utf8');
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

for (const [slug, entry] of Object.entries(payload)) {
  if (slug.startsWith('_')) continue;
  if (!known.has(slug)) { errors.push(`${slug}: unknown language pack`); continue; }
  if (!entry || typeof entry.actionsSuffix !== 'string' || typeof entry.brainstormInsert !== 'string') {
    errors.push(`${slug}: payload must contain actionsSuffix and brainstormInsert strings`); continue;
  }
  const stale = L.computeStaleness({ slugs: [slug] }).perPack[slug] || {};
  if (!stale[ACTIONS] && !stale[BRAINSTORM]) {
    report.push({ slug, status: 'already-current' });
    continue;
  }

  const rootFile = path.join(L.LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(mirrorFile)) { errors.push(`${slug}: deploy mirror missing`); continue; }
  const rootRaw = fs.readFileSync(rootFile, 'utf8');
  const mirrorRaw = fs.readFileSync(mirrorFile, 'utf8');
  if (rootRaw !== mirrorRaw) { errors.push(`${slug}: root/deploy mirror drift`); continue; }
  let json;
  try { json = JSON.parse(rootRaw.replace(/^\uFEFF/, '')); } catch (error) {
    errors.push(`${slug}: invalid root JSON (${error.message})`); continue;
  }
  const flat = L.flatten(json);
  const next = {};
  let changed = 0;

  if (stale[ACTIONS]) {
    const current = flat[ACTIONS];
    const headingCount = String(current).match(/### /g) || [];
    const bulletCount = String(current).match(/• /g) || [];
    const addedHeadings = entry.actionsSuffix.match(/### /g) || [];
    const addedBullets = entry.actionsSuffix.match(/• /g) || [];
    if (typeof current !== 'string' || headingCount.length !== 7 || bulletCount.length < 17 ||
        addedHeadings.length !== 2 || addedBullets.length !== 8 ||
        placeholders(source[ACTIONS]) !== placeholders(current + '\n\n' + entry.actionsSuffix)) {
      errors.push(`${slug} / ${ACTIONS}: unexpected structure or placeholder mismatch`);
    } else {
      next[ACTIONS] = `${current}\n\n${entry.actionsSuffix}`;
      changed += 1;
    }
  }

  if (stale[BRAINSTORM]) {
    const current = flat[BRAINSTORM];
    const headingCount = String(current).match(/### /g) || [];
    const bulletCount = String(current).match(/• /g) || [];
    const addedHeadings = entry.brainstormInsert.match(/### /g) || [];
    const addedBullets = entry.brainstormInsert.match(/• /g) || [];
    const firstBreak = typeof current === 'string' ? current.indexOf('\n') : -1;
    if (typeof current !== 'string' || headingCount.length !== 5 || bulletCount.length < 12 ||
        addedHeadings.length !== 2 || addedBullets.length !== 7 || firstBreak < 0 ||
        placeholders(source[BRAINSTORM]) !== placeholders(current.slice(0, firstBreak + 1) + entry.brainstormInsert + '\n' + current.slice(firstBreak + 1))) {
      errors.push(`${slug} / ${BRAINSTORM}: unexpected structure or placeholder mismatch`);
    } else {
      next[BRAINSTORM] = current.slice(0, firstBreak + 1) + entry.brainstormInsert + '\n' + current.slice(firstBreak + 1);
      changed += 1;
    }
  }

  if (!changed || errors.some(error => error.startsWith(`${slug} /`))) continue;
  const outputJson = JSON.parse(JSON.stringify(json));
  for (const [key, value] of Object.entries(next)) {
    const parts = key.split('.');
    let cursor = outputJson;
    for (let i = 0; i < parts.length - 1; i += 1) cursor = cursor[parts[i]];
    cursor[parts[parts.length - 1]] = value;
  }
  const output = JSON.stringify(outputJson, null, 2) + '\n';
  if (APPLY) {
    try {
      fs.copyFileSync(rootFile, `${rootFile}.bak.${STAMP}`);
      fs.copyFileSync(mirrorFile, `${mirrorFile}.bak.${STAMP}`);
      replaceFile(rootFile, output);
      replaceFile(mirrorFile, output);
      if (fs.readFileSync(rootFile, 'utf8') !== fs.readFileSync(mirrorFile, 'utf8')) {
        errors.push(`${slug}: root/deploy drift remained after write`);
        continue;
      }
    } catch (error) {
      errors.push(`${slug}: write failed (${error.code || error.message})`);
      continue;
    }
  }
  report.push({ slug, status: APPLY ? 'written' : 'would-write', keys: Object.keys(next) });
}

if (errors.length) {
  console.error(`apply_tour_stale_sections: ${errors.length} problem(s).`);
  for (const error of errors.slice(0, 60)) console.error(`  - ${error}`);
  if (errors.length > 60) console.error(`  ...and ${errors.length - 60} more`);
  process.exit(1);
}

console.log(`apply_tour_stale_sections: ${report.filter(row => row.status === 'written' || row.status === 'would-write').length} pack(s) ` +
  `${APPLY ? 'WRITTEN' : 'DRY RUN (pass --apply to write)'}.`);
for (const row of report) console.log(`  ${row.slug.padEnd(24)} ${row.status}${row.keys ? `: ${row.keys.join(', ')}` : ''}`);
