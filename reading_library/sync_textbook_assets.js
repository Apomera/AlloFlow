#!/usr/bin/env node
/**
 * Copy textbook-provider runtime assets into the checked-in public mirror and
 * the local ignored build mirror without touching unrelated reading content.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const REPO = path.join(ROOT, '..');
const DESTINATIONS = [
  path.join(REPO, 'desktop/web-app', 'public', 'reading_library'),
  path.join(REPO, 'desktop/web-app', 'build', 'reading_library')
];
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'index.json'), 'utf8'));
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, 'index_cards.json'), 'utf8'));
const providerFiles = index.books.concat(cards.books)
  .filter((entry) => entry.sourceId === 'openstax' || entry.sourceId === 'ck12')
  .map((entry) => entry.file);
const files = Array.from(new Set([
  'index.json',
  'index_cards.json',
  'open_catalog.json'
].concat(providerFiles)));

for (const destination of DESTINATIONS) {
  fs.mkdirSync(destination, { recursive: true });
  for (const relative of files) {
    const source = path.join(ROOT, relative);
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  console.log('Copied ' + files.length + ' reading runtime files to ' + path.relative(REPO, destination));
}

for (const destination of [
  path.join(REPO, 'desktop/web-app', 'public', 'reading_library_module.js'),
  path.join(REPO, 'desktop/web-app', 'build', 'reading_library_module.js')
]) {
  fs.copyFileSync(path.join(REPO, 'reading_library_module.js'), destination);
  console.log('Synchronized ' + path.relative(REPO, destination));
}
