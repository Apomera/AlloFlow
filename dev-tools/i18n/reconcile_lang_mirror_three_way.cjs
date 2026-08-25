#!/usr/bin/env node
'use strict';

// Reconcile a language pack and its deploy mirror without discarding edits on
// either side. A leaf is copied across only when the other side is unchanged
// from HEAD; edits made differently on both sides are reported as conflicts.
//
// Usage:
//   node dev-tools/i18n/reconcile_lang_mirror_three_way.cjs --slug=dari
//   node dev-tools/i18n/reconcile_lang_mirror_three_way.cjs --slug=dari --apply

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const slugArg = process.argv.find((arg) => arg.startsWith('--slug='));
const slugs = slugArg
  ? [slugArg.slice('--slug='.length).trim()]
  : Object.keys(LANGUAGE_CODES);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function readHeadJson(ref) {
  return JSON.parse(execFileSync('git', ['show', ref], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  }));
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function merge(base, root, mirror, pathString, state) {
  const allObjects = [base, root, mirror].every((value) => (
    value && typeof value === 'object' && !Array.isArray(value)
  ));
  if (allObjects) {
    const merged = {};
    const keys = new Set([...Object.keys(root), ...Object.keys(mirror), ...Object.keys(base)]);
    for (const key of keys) {
      merged[key] = merge(
        base[key],
        root[key],
        mirror[key],
        pathString ? `${pathString}.${key}` : key,
        state,
      );
    }
    return merged;
  }

  if (same(root, mirror)) return root;
  if (same(root, base)) {
    state.oneMirror += 1;
    return mirror;
  }
  if (same(mirror, base)) {
    state.oneRoot += 1;
    return root;
  }
  state.conflicts.push(pathString);
  return root;
}

function replaceFile(file, text) {
  const temporary = `${file}.i18n-three-way-${process.pid}.tmp`;
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

const errors = [];
let totalRootOnly = 0;
let totalMirrorOnly = 0;
for (const slug of slugs) {
  if (!LANGUAGE_CODES[slug]) {
    errors.push(`${slug}: unknown language pack`);
    continue;
  }
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: root or mirror file is missing`);
    continue;
  }
  let root;
  let mirror;
  let baseRoot;
  let baseMirror;
  try {
    root = readJson(rootFile);
    mirror = readJson(mirrorFile);
    baseRoot = readHeadJson(`HEAD:lang/${slug}.js`);
    baseMirror = readHeadJson(`HEAD:desktop/web-app/public/lang/${slug}.js`);
  } catch (error) {
    errors.push(`${slug}: could not read JSON/HEAD (${error.message})`);
    continue;
  }
  const state = { oneRoot: 0, oneMirror: 0, conflicts: [] };
  const merged = merge(baseRoot, root, mirror, '', state);
  totalRootOnly += state.oneRoot;
  totalMirrorOnly += state.oneMirror;
  if (state.conflicts.length) {
    errors.push(`${slug}: ${state.conflicts.length} conflicting leaf edit(s), first: ${state.conflicts.slice(0, 5).join(', ')}`);
    continue;
  }
  const output = JSON.stringify(merged, null, 2) + '\n';
  const changed = fs.readFileSync(rootFile, 'utf8') !== output || fs.readFileSync(mirrorFile, 'utf8') !== output;
  if (changed && APPLY) {
    replaceFile(rootFile, output);
    replaceFile(mirrorFile, output);
    if (fs.readFileSync(rootFile, 'utf8') !== fs.readFileSync(mirrorFile, 'utf8')) {
      errors.push(`${slug}: root/mirror drift remained after write`);
    }
  }
  console.log(`${slug}: root-only=${state.oneRoot}; mirror-only=${state.oneMirror}; ${changed ? (APPLY ? 'merged' : 'would merge') : 'already synchronized'}`);
}

if (errors.length) {
  console.error(`reconcile_lang_mirror_three_way: ${errors.length} problem(s); ${APPLY ? 'partial writes may exist' : 'nothing written'}.`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`reconcile_lang_mirror_three_way: root-only=${totalRootOnly}; mirror-only=${totalMirrorOnly}; ${APPLY ? 'writes complete' : 'dry run'}.`);
