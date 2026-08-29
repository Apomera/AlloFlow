#!/usr/bin/env node
'use strict';

// The Research Suite / Return to Start commands were added after the command
// packs were last reconciled. Reuse already-reviewed local action vocabulary
// instead of inventing a second translation:
//   - each pack's localized Open AlloStudio / AlloStudio opened templates
//   - each pack's localized Back and Start labels
// Research Suite and AlloFlow remain product/surface names by house convention.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const PUBLIC_LANG_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const CATALOG_DIR = path.join(__dirname, 'cmd_translations');

const ENGLISH = {
  open: 'Open Research Suite',
  done: 'Research Suite opened.',
  hint: 'Open study design, consent, fidelity, and research export tools',
  returnLabel: 'Return to Start',
  returnDone: 'Returned to Start.',
  returnHint: 'Return to the AlloFlow launch choices without reloading',
};

function requiredString(value, slug, key) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(slug + ': missing reviewed source value ' + key);
  }
  return value.trim();
}

function assertTranslated(slug, key, value, english) {
  if (!value || value.trim() === english) {
    throw new Error(slug + ': derived ' + key + ' is still identical to English');
  }
}

function replaceFile(file, text) {
  const temporary = file + '.research-start-' + process.pid + '.tmp';
  const transientCodes = new Set(['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN']);
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.writeFileSync(temporary, text, 'utf8');
      try {
        fs.renameSync(temporary, file);
      } catch (error) {
        if (!transientCodes.has(error.code)) throw error;
        fs.copyFileSync(temporary, file);
      }
      return;
    } catch (error) {
      lastError = error;
      if (!transientCodes.has(error.code) || attempt === 7) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
    } finally {
      if (fs.existsSync(temporary)) {
        try { fs.unlinkSync(temporary); } catch (error) { lastError = error; }
      }
    }
  }
  throw lastError;
}

function derive(pack, slug) {
  const cmd = pack.cmd || {};
  const common = pack.common || {};
  const openTemplate = requiredString(cmd.open_allo_studio, slug, 'cmd.open_allo_studio');
  const doneTemplate = requiredString(cmd.open_allo_studio_done, slug, 'cmd.open_allo_studio_done');
  if (!openTemplate.includes('AlloStudio') || !doneTemplate.includes('AlloStudio')) {
    throw new Error(slug + ': AlloStudio template no longer contains its stable surface token');
  }

  const open = openTemplate.replaceAll('AlloStudio', 'Research Suite');
  const done = doneTemplate.replaceAll('AlloStudio', 'Research Suite');
  const back = requiredString(common.back, slug, 'common.back');
  const start = requiredString(common.start, slug, 'common.start');
  const values = {
    open,
    done,
    // A concise localized command label is safer than an untranslated or
    // machine-invented long description for the hint.
    hint: open,
    returnLabel: back + ' — ' + start,
    returnDone: back + ' — ' + start,
    returnHint: back + ' — AlloFlow ' + start,
  };

  for (const [key, value] of Object.entries(values)) {
    assertTranslated(slug, key, value, ENGLISH[key]);
  }
  return values;
}

function applyToPack(pack, values) {
  pack.cmd = pack.cmd || {};
  pack.cmd.open_research_suite = values.open;
  pack.cmd.open_research_suite_done = values.done;
  pack.cmd.open_research_suite_hint = values.hint;
  pack.cmd.return_to_start = values.returnLabel;
  pack.cmd.return_to_start_done = values.returnDone;
  pack.cmd.return_to_start_hint = values.returnHint;
}

const slugs = fs.readdirSync(LANG_DIR)
  .filter((name) => name.endsWith('.js'))
  .map((name) => name.slice(0, -3))
  .sort();

let updated = 0;
for (const slug of slugs) {
  const rootPath = path.join(LANG_DIR, slug + '.js');
  const publicPath = path.join(PUBLIC_LANG_DIR, slug + '.js');
  const catalogPath = path.join(CATALOG_DIR, slug + '.json');
  const pack = JSON.parse(fs.readFileSync(rootPath, 'utf8').replace(/^﻿/, ''));
  const values = derive(pack, slug);
  applyToPack(pack, values);
  const serialized = JSON.stringify(pack, null, 2) + String.fromCharCode(10);
  replaceFile(rootPath, serialized);
  replaceFile(publicPath, serialized);

  if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    catalog['cmd.open_research_suite'] = values.open;
    catalog['cmd.open_research_suite_done'] = values.done;
    catalog['cmd.open_research_suite_hint'] = values.hint;
    catalog['cmd.return_to_start'] = values.returnLabel;
    catalog['cmd.return_to_start_done'] = values.returnDone;
    catalog['cmd.return_to_start_hint'] = values.returnHint;
    const sorted = Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b)));
    replaceFile(catalogPath, JSON.stringify(sorted, null, 2) + String.fromCharCode(10));
  }
  updated++;
}

console.log('Applied reviewed-template Research Suite / Start commands to ' + updated + ' language packs and mirrors.');
