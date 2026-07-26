#!/usr/bin/env node
/**
 * Copy African Storybook runtime data into AlloFlow's checked-in deployment
 * mirrors without rewriting or deleting unrelated reading-library assets.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const REPO = path.join(ROOT, '..');
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'index.json'), 'utf8'));
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, 'index_cards.json'), 'utf8'));
const files = Array.from(new Set([
  'index.json',
  'index_cards.json',
  'open_catalog.json',
].concat(
  index.books.concat(cards.books)
    .filter((entry) => entry.sourceId === 'african-storybook')
    .map((entry) => entry.file)
)));
const destinations = [
  path.join(REPO, 'desktop', 'web-app', 'public', 'reading_library'),
  path.join(REPO, 'desktop', 'web-app', 'build', 'reading_library'),
  path.join(REPO, 'prismflow-deploy', 'public', 'reading_library'),
];

for (const destination of destinations) {
  fs.mkdirSync(destination, { recursive: true });
  for (const relative of files) {
    const source = path.join(ROOT, relative);
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  process.stdout.write('Copied ' + files.length + ' African Storybook runtime files to ' +
    path.relative(REPO, destination) + '\n');
}
