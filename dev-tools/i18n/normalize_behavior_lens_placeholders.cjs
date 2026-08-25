#!/usr/bin/env node
'use strict';

// Normalize the placeholder contract for the Behavior Lens toast catalog.
// These strings historically used literal N/${n} tokens while the runtime
// translation function replaces {name}-style parameters. This utility keeps
// every existing translation word-for-word and changes only those tokens.
//
// Usage:
//   node dev-tools/i18n/normalize_behavior_lens_placeholders.cjs
//   node dev-tools/i18n/normalize_behavior_lens_placeholders.cjs --apply
//   node dev-tools/i18n/normalize_behavior_lens_placeholders.cjs --slug=kannada --apply

const fs = require('node:fs');
const path = require('node:path');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const slugArg = process.argv.find((arg) => arg.startsWith('--slug='));
const onlySlug = slugArg ? slugArg.slice('--slug='.length).trim() : null;

const PLACEHOLDER_NAMES = {
  added_n_entries_to_abc_data: ['n'],
  loaded_n_workspaces_for_comparison: ['n'],
  mastered_n_n_consecutive_sessions_at_criterion: ['name', 'n'],
  merged_n_abc_entries_and_n_observations: ['abc', 'observations'],
  n_home_entries_pushed_to_abc_data: ['n'],
  parsed_n_abc_entries_from_transcript: ['n'],
  populated_from_n_abc_entries: ['n'],
  quick_fill_n_items_loaded: ['n'],
  session_saved_ns_n_total_responses: ['duration', 'responses'],
  switched_to_n_no_data_loaded: ['name'],
  workspace_loaded_n_entries_n_notes: ['entries', 'notes'],
};
// N is only a legacy token when it is not part of a translated word such as
// CANG, DOMINADO, or Notizs. Ns is the duration token used by one old string.
const TOKEN_RE = /[$][{][^}]+[}]|(?<![A-Za-z])Ns(?![A-Za-z])|(?<![A-Za-z])N(?![A-Za-z])/g;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function getDeep(value, pathString) {
  return pathString.split('.').reduce((cursor, part) => cursor == null ? undefined : cursor[part], value);
}

function setDeep(value, pathString, next) {
  const parts = pathString.split('.');
  let cursor = value;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = next;
}

function normalizeValue(value, names, label) {
  const tokens = String(value).match(TOKEN_RE) || [];
  if (!tokens.length) return { value, changed: false };
  if (tokens.length !== names.length) {
    throw new Error(`${label}: found ${tokens.length} legacy token(s), expected ${names.length}`);
  }
  let index = 0;
  const next = String(value).replace(TOKEN_RE, (token) => {
    const name = names[index];
    index += 1;
    return token === 'Ns' ? `{${name}}s` : `{${name}}`;
  });
  return { value: next, changed: next !== value };
}

function replaceFile(file, text) {
  const temporary = `${file}.i18n-placeholder-${process.pid}.tmp`;
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

const slugs = Object.keys(LANGUAGE_CODES).filter((slug) => !onlySlug || slug === onlySlug);
if (onlySlug && !LANGUAGE_CODES[onlySlug]) {
  console.error(`normalize_behavior_lens_placeholders: unknown slug ${onlySlug}`);
  process.exit(2);
}

const errors = [];
let changedValues = 0;
let changedPacks = 0;
for (const slug of slugs) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: root or mirror file is missing`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  if (rootText !== mirrorText) {
    errors.push(`${slug}: root/mirror drift; refusing to normalize this pack`);
    continue;
  }
  let pack;
  try { pack = JSON.parse(rootText.replace(/^\uFEFF/, '')); }
  catch (error) {
    errors.push(`${slug}: invalid JSON (${error.message})`);
    continue;
  }
  let packChanged = false;
  for (const [key, names] of Object.entries(PLACEHOLDER_NAMES)) {
    const pathString = `behavior_lens.toast.${key}`;
    const current = getDeep(pack, pathString);
    if (typeof current !== 'string') {
      errors.push(`${slug}: missing ${pathString}`);
      continue;
    }
    try {
      const normalized = normalizeValue(current, names, `${slug}:${pathString}`);
      if (normalized.changed) {
        setDeep(pack, pathString, normalized.value);
        changedValues += 1;
        packChanged = true;
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (packChanged) {
    changedPacks += 1;
    if (APPLY) {
      const output = JSON.stringify(pack, null, 2) + '\n';
      replaceFile(rootFile, output);
      replaceFile(mirrorFile, output);
      // A mechanical rewrite is not complete until both copies parse and are
      // byte-identical again.
      try {
        JSON.parse(fs.readFileSync(rootFile, 'utf8'));
        JSON.parse(fs.readFileSync(mirrorFile, 'utf8'));
        if (fs.readFileSync(rootFile, 'utf8') !== fs.readFileSync(mirrorFile, 'utf8')) {
          errors.push(`${slug}: root/mirror drift after write`);
        }
      } catch (error) {
        errors.push(`${slug}: post-write validation failed (${error.message})`);
      }
    }
  }
}

if (errors.length) {
  console.error(`normalize_behavior_lens_placeholders: ${errors.length} problem(s); ${APPLY ? 'partial writes may exist, inspect mirror status' : 'nothing written'}.`);
  for (const error of errors.slice(0, 80)) console.error(`  - ${error}`);
  if (errors.length > 80) console.error(`  ...and ${errors.length - 80} more`);
  process.exit(1);
}

console.log(`normalize_behavior_lens_placeholders: ${changedValues} value(s) in ${changedPacks} pack(s) ${APPLY ? 'written' : 'would be written'}.`);
