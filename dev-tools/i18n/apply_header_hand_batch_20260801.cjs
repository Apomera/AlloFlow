#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const DEPLOY_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const payloadFile = process.argv[2];
if (!payloadFile) throw new Error('Usage: node apply_header_hand_batch_20260801.cjs <payload.cjs>');
const translations = require(path.resolve(payloadFile));

function saveAtomic(file, value) {
  const tmp = file + '.codex-tmp';
  const raw = JSON.stringify(value, null, 2) + String.fromCharCode(10);
  fs.writeFileSync(tmp, raw, 'utf8');
  try {
    fs.renameSync(tmp, file);
  } catch (error) {
    fs.copyFileSync(tmp, file);
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
}

let added = 0;
let preserved = 0;
let changed = 0;
for (const [slug, values] of Object.entries(translations)) {
  const canonicalFile = path.join(LANG_DIR, `${slug}.js`);
  const deployedFile = path.join(DEPLOY_DIR, `${slug}.js`);
  if (!fs.existsSync(canonicalFile) || !fs.existsSync(deployedFile)) throw new Error(`Missing mirror for ${slug}`);
  const canonical = JSON.parse(fs.readFileSync(canonicalFile, 'utf8'));
  canonical.header ??= {};
  let packAdded = 0;
  for (const [key, value] of Object.entries(values)) {
    if (!(key in canonical.header)) {
      canonical.header[key] = value;
      packAdded++;
    } else {
      preserved++;
    }
  }
  if (packAdded > 0) {
    saveAtomic(canonicalFile, canonical);
    const deployed = JSON.parse(fs.readFileSync(deployedFile, 'utf8'));
    deployed.header = canonical.header;
    saveAtomic(deployedFile, deployed);
    changed++;
  }
  added += packAdded;
  console.log(`${slug}: +${packAdded}, preserved ${Object.keys(values).length - packAdded}`);
}
console.log(`Applied ${added} header value(s) across ${changed} pack(s); preserved ${preserved} existing value(s).`);
