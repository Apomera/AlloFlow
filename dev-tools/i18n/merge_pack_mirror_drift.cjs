#!/usr/bin/env node
'use strict';

// Three-way merge one root language pack and its deployed mirror against the
// last committed root pack. This resolves mirror drift only when one side is
// unchanged from the base; true concurrent conflicts stop the run.
//
// Usage:
//   node dev-tools/i18n/merge_pack_mirror_drift.cjs --lang=dari
//   node dev-tools/i18n/merge_pack_mirror_drift.cjs --lang=dari --apply

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const JSON_OUTPUT = process.argv.includes('--json');
const QUIET = process.argv.includes('--quiet');
const langArg = process.argv.find((arg) => arg.startsWith('--lang='));
const requestedSlug = langArg ? langArg.slice('--lang='.length).trim() : null;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function same(left, right) {
  return left === undefined && right === undefined
    ? true
    : JSON.stringify(left) === JSON.stringify(right);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeThreeWay(base, root, mirror, dottedPath, conflicts, counters) {
  if (isObject(base) || isObject(root) || isObject(mirror)) {
    const output = {};
    const keys = new Set([...Object.keys(base || {}), ...Object.keys(root || {}), ...Object.keys(mirror || {})]);
    for (const key of keys) {
      const pathName = dottedPath ? `${dottedPath}.${key}` : key;
      const value = mergeThreeWay(base && base[key], root && root[key], mirror && mirror[key], pathName, conflicts, counters);
      if (value !== undefined) output[key] = value;
    }
    return output;
  }
  if (same(root, mirror)) return clone(root);
  if (same(root, base)) {
    counters.mirrorOnly += 1;
    return clone(mirror);
  }
  if (same(mirror, base)) {
    counters.rootOnly += 1;
    return clone(root);
  }
  counters.conflicts += 1;
  if (conflicts.length < 80) conflicts.push({ path: dottedPath, base, root, mirror });
  return clone(root);
}

function replaceFile(file, text) {
  const temporary = `${file}.mirror-merge-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    let lastError = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        fs.renameSync(temporary, file);
        return;
      } catch (renameError) {
        if (!['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN'].includes(renameError.code)) throw renameError;
        lastError = renameError;
        try {
          fs.copyFileSync(temporary, file);
          return;
        } catch (copyError) {
          lastError = copyError;
          if (!['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN'].includes(copyError.code)) throw copyError;
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
        }
      }
    }
    throw lastError;
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function fail(message, code = 2) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors: [message] }, null, 2));
  else console.error(`merge_pack_mirror_drift: ${message}`);
  process.exit(code);
}

if (!requestedSlug) fail('--lang=... is required');
if (!Object.prototype.hasOwnProperty.call(LANGUAGE_CODES, requestedSlug)) fail(`unknown language slug: ${requestedSlug}`);

const rootFile = path.join(LANG_DIR, `${requestedSlug}.js`);
const mirrorFile = path.join(MIRROR_DIR, `${requestedSlug}.js`);
if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) fail(`${requestedSlug}: root or deployed pack is missing`);

let baseText;
let mirrorBaseText;
try {
  baseText = execFileSync('git', ['show', `HEAD:lang/${requestedSlug}.js`], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  mirrorBaseText = execFileSync('git', ['show', `HEAD:desktop/web-app/public/lang/${requestedSlug}.js`], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (error) {
  fail(`could not read committed base pack: ${error.message}`);
}
if (baseText !== mirrorBaseText) fail('committed root and deployed mirror bases differ; refusing an ambiguous merge');

const rootText = fs.readFileSync(rootFile, 'utf8');
const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
const base = JSON.parse(baseText.replace(/^\uFEFF/, ''));
const root = readJson(rootFile);
const mirror = readJson(mirrorFile);
const conflicts = [];
const counters = { rootOnly: 0, mirrorOnly: 0, conflicts: 0 };
const merged = mergeThreeWay(base, root, mirror, '', conflicts, counters);

const report = {
  apply: APPLY,
  slug: requestedSlug,
  driftBefore: rootText !== mirrorText,
  rootOnlyLeaves: counters.rootOnly,
  mirrorOnlyLeaves: counters.mirrorOnly,
  conflicts: counters.conflicts,
  conflictSample: conflicts,
  parityAfter: false,
};

if (conflicts.length || counters.conflicts) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ ...report, errors: ['true three-way conflicts require manual review'] }, null, 2));
  else {
    console.error(`merge_pack_mirror_drift: ${counters.conflicts} conflict(s); nothing written.`);
    conflicts.slice(0, 20).forEach((item) => console.error(`  - ${item.path}`));
  }
  process.exit(1);
}

const output = JSON.stringify(merged, null, 2) + '\n';
if (APPLY) {
  replaceFile(rootFile, output);
  replaceFile(mirrorFile, output);
  report.parityAfter = fs.readFileSync(rootFile, 'utf8') === fs.readFileSync(mirrorFile, 'utf8');
} else {
  report.parityAfter = true;
}

if (JSON_OUTPUT) console.log(JSON.stringify(report, null, 2));
else if (!QUIET) {
  console.log(`merge_pack_mirror_drift: ${requestedSlug}`);
  console.log(`  Root-only leaves preserved: ${counters.rootOnly}`);
  console.log(`  Mirror-only leaves preserved: ${counters.mirrorOnly}`);
  console.log(`  ${APPLY ? `Wrote both sides; parity=${report.parityAfter}.` : 'Dry run only; pass --apply to write.'}`);
} else {
  console.log(`merge_pack_mirror_drift: slug=${requestedSlug}; rootOnly=${counters.rootOnly}; mirrorOnly=${counters.mirrorOnly}; conflicts=0; written=${APPLY}`);
}
