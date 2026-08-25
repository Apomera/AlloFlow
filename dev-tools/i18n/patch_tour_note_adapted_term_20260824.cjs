#!/usr/bin/env node
// Patch the one semantic tour delta that can be resolved from an existing reviewed
// label: "Leveled Reader" -> the pack's current tour.simplified_title ("Adapted Text").
// Only full note-taking translations with an explicit Pro Tip line are touched.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lang_src_lib.cjs');

const APPLY = process.argv.includes('--apply');
const MIRROR_DIR = path.join(L.ROOT, 'desktop', 'web-app', 'public', 'lang');
const STAMP = 'tour-note-adapted-20260824';
const NOTE_KEY = 'tour.note_taking_text';

function replaceFile(file, text) {
  const temporary = `${file}.tour-note-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    try {
      fs.renameSync(temporary, file);
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      fs.writeFileSync(file, text, 'utf8');
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const overrides = {
  // Malayalam carries the postposition inside the bold phrase; retain it while
  // changing the product term.
  malayalam: 'അനുരൂപ പാഠവുമായി',
};
const report = [];
const errors = [];

for (const slug of L.getLangSlugs()) {
  const stale = L.computeStaleness({ slugs: [slug] }).perPack[slug] || {};
  if (!stale[NOTE_KEY]) continue;
  const rootFile = path.join(L.LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(mirrorFile)) { errors.push(`${slug}: deploy mirror missing`); continue; }
  const rootRaw = fs.readFileSync(rootFile, 'utf8');
  const mirrorRaw = fs.readFileSync(mirrorFile, 'utf8');
  if (rootRaw !== mirrorRaw) { errors.push(`${slug}: root/deploy mirror drift`); continue; }
  const json = JSON.parse(rootRaw.replace(/^\uFEFF/, ''));
  const flat = L.flatten(json);
  const note = flat[NOTE_KEY];
  const title = overrides[slug] || flat['tour.simplified_title'];
  if (typeof note !== 'string' || typeof title !== 'string' || !title.trim()) {
    report.push({ slug, status: 'skip', reason: 'missing note/title string' });
    continue;
  }

  const lines = note.split('\n');
  const boldLines = lines
    .map((line, index) => ({ line, index, count: line.split('**').length - 1 }))
    .filter(item => item.count >= 2);
  // The final two bold lines are the Pro Tip and UDL connection in the full packs.
  if (boldLines.length < 2) {
    report.push({ slug, status: 'skip', reason: 'condensed note omits the changed Pro Tip term' });
    continue;
  }
  const proTip = boldLines[boldLines.length - 2];
  const matches = [...proTip.line.matchAll(/\*\*([^*]+)\*\*/g)];
  if (matches.length !== 1) {
    report.push({ slug, status: 'skip', reason: 'Pro Tip markdown shape is not unambiguous' });
    continue;
  }
  const match = matches[0];
  const replacement = `**${title}**`;
  const nextLine = proTip.line.slice(0, match.index) + replacement + proTip.line.slice(match.index + match[0].length);
  const nextNote = lines.map((line, index) => index === proTip.index ? nextLine : line).join('\n');
  const changed = L.norm(nextNote) !== L.norm(note);
  if (!changed) {
    report.push({ slug, status: 'already-current' });
    continue;
  }
  // Set only this leaf, preserving every other user translation verbatim.
  let cursor = json;
  const parts = NOTE_KEY.split('.');
  for (let i = 0; i < parts.length - 1; i += 1) cursor = cursor[parts[i]];
  cursor[parts[parts.length - 1]] = nextNote;
  const output = JSON.stringify(json, null, 2) + '\n';
  if (APPLY) {
    fs.copyFileSync(rootFile, `${rootFile}.bak.${STAMP}`);
    fs.copyFileSync(mirrorFile, `${mirrorFile}.bak.${STAMP}`);
    replaceFile(rootFile, output);
    replaceFile(mirrorFile, output);
    if (fs.readFileSync(rootFile, 'utf8') !== fs.readFileSync(mirrorFile, 'utf8')) {
      errors.push(`${slug}: root/deploy drift remained after write`);
      continue;
    }
  }
  report.push({ slug, status: APPLY ? 'written' : 'would-write', from: match[1], to: title });
}

if (errors.length) {
  console.error(`patch_tour_note_adapted_term: ${errors.length} problem(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const writes = report.filter(row => row.status === 'written' || row.status === 'would-write');
console.log(`patch_tour_note_adapted_term: ${writes.length} candidate(s); ` +
  `${report.filter(row => row.status === 'skip').length} condensed/ambiguous skip(s); ` +
  `${APPLY ? 'WRITTEN' : 'DRY RUN (pass --apply to write)'}`);
for (const row of writes) console.log(`  ${row.slug.padEnd(24)} ${JSON.stringify(row.from)} -> ${JSON.stringify(row.to)}`);
