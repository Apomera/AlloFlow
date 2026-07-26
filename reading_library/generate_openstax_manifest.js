#!/usr/bin/env node
/**
 * Extend the reviewed OpenStax chapter manifest from the table of contents
 * embedded in each official OpenStax book page. Composite review/exercise
 * pages are excluded; introductions and numbered instructional sections are
 * retained.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const MANIFEST = path.join(ROOT, 'openstax_mirror_manifest.json');
const USER_AGENT = 'AlloFlow OpenStax manifest generator';
const TITLES = [
  {
    slug: 'chemistry-2e',
    title: 'Chemistry 2e',
    subjects: ['Chemistry', 'Physical science', 'Laboratory science', 'Open textbooks']
  },
  {
    slug: 'college-physics-2e',
    title: 'College Physics 2e',
    startPage: '1-introduction-to-science-and-the-realm-of-physics-physical-quantities-and-units',
    subjects: ['Physics', 'Mechanics', 'Energy', 'Open textbooks']
  },
  {
    slug: 'psychology-2e',
    title: 'Psychology 2e',
    subjects: ['Psychology', 'Behavioral science', 'Human development', 'Open textbooks']
  },
  {
    slug: 'anatomy-and-physiology-2e',
    title: 'Anatomy and Physiology 2e',
    subjects: ['Anatomy', 'Physiology', 'Human biology', 'Open textbooks']
  },
  {
    slug: 'algebra-and-trigonometry-2e',
    title: 'Algebra and Trigonometry 2e',
    startPage: '1-introduction-to-prerequisites',
    subjects: ['Algebra', 'Trigonometry', 'College mathematics', 'Open textbooks']
  }
];

function loadJsdom() {
  return require(require.resolve('jsdom', {
    paths: [path.join(ROOT, '..', 'desktop/web-app', 'node_modules')]
  })).JSDOM;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function fetchHtml(url) {
  return execFileSync('curl.exe', [
    '-sSL', '--fail', '--max-time', '60',
    '-A', USER_AGENT,
    '-H', 'Accept: text/html,application/xhtml+xml',
    url
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function stateFromDocument(doc) {
  const script = Array.from(doc.querySelectorAll('script')).find((node) =>
    /^\s*window\.__PRELOADED_STATE__\s*=/.test(node.textContent || '')
  );
  if (!script) throw new Error('OpenStax preloaded state was not found');
  const text = script.textContent;
  const json = text.slice(text.indexOf('=') + 1).trim().replace(/;\s*$/, '');
  return JSON.parse(json);
}

function textFromHtml(html, JSDOM) {
  return clean(new JSDOM('<body>' + String(html || '') + '</body>').window.document.body.textContent);
}

function chapterNodes(value, output, seen) {
  if (!value || typeof value !== 'object') return;
  if (value.toc_type === 'chapter' && Array.isArray(value.contents)) {
    const key = value.contents.map((item) => item && item.slug).filter(Boolean).join('|');
    if (key && !seen.has(key)) {
      seen.add(key);
      output.push(value);
    }
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') chapterNodes(child, output, seen);
  }
}

function entriesFor(config, JSDOM) {
  const bookUrl = 'https://openstax.org/books/' + config.slug + '/pages/' + (config.startPage || '1-introduction');
  const doc = new JSDOM(fetchHtml(bookUrl), { url: bookUrl }).window.document;
  const actualTitle = clean(doc.querySelector('meta[name="citation_book_title"]')?.content);
  if (actualTitle !== config.title) {
    throw new Error('OpenStax title mismatch for ' + config.slug + ': ' + actualTitle);
  }
  const state = stateFromDocument(doc);
  const chapters = [];
  chapterNodes(state.book || state, chapters, new Set());
  const entries = [];
  for (const chapter of chapters) {
    const sections = chapter.contents.filter((item) =>
      item && item.slug && (item.toc_target_type === 'intro' || item.toc_target_type === 'numbered-section')
    );
    if (!sections.length) continue;
    const chapterNumberMatch = sections[0].slug.match(/^(\d+)-/);
    if (!chapterNumberMatch) continue;
    const chapterNumber = Number(chapterNumberMatch[1]);
    const chapterTitle = textFromHtml(chapter.title, JSDOM)
      .replace(new RegExp('^' + chapterNumber + '\\s*'), '').trim();
    const urls = sections.map((item) =>
      'https://openstax.org/books/' + config.slug + '/pages/' + item.slug
    );
    entries.push({
      slug: 'openstax-' + config.slug + '-chapter-' + chapterNumber,
      title: 'OpenStax ' + config.title + ' · Chapter ' + chapterNumber + ': ' + chapterTitle,
      bookTitle: config.title,
      description: 'An accessibility-ready mirror of OpenStax ' + config.title + ' Chapter ' + chapterNumber + '.',
      subjects: config.subjects,
      level: '6',
      sourceUrl: urls[0],
      sections: urls,
      bookUrl
    });
  }
  entries.sort((a, b) => Number(a.slug.match(/(\d+)$/)[1]) - Number(b.slug.match(/(\d+)$/)[1]));
  if (!entries.length) throw new Error('No OpenStax chapters found for ' + config.slug);
  return entries;
}

function outputPath() {
  const index = process.argv.indexOf('--output');
  if (index === -1) return MANIFEST;
  const resolved = path.resolve(ROOT, process.argv[index + 1]);
  if (path.dirname(resolved) !== ROOT || path.extname(resolved).toLowerCase() !== '.json') {
    throw new Error('--output must be a JSON filename inside reading_library/');
  }
  return resolved;
}

function main() {
  const JSDOM = loadJsdom();
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const prefixes = TITLES.map((config) => 'openstax-' + config.slug + '-chapter-');
  manifest.books = (manifest.books || []).filter((entry) =>
    !prefixes.some((prefix) => entry.slug.startsWith(prefix))
  );
  for (const config of TITLES) {
    const entries = entriesFor(config, JSDOM);
    manifest.books.push(...entries);
    console.log(config.title + ': ' + entries.length + ' chapters');
  }
  fs.writeFileSync(outputPath(), JSON.stringify(manifest, null, 2) + '\n');
  console.log('Wrote ' + manifest.books.length + ' total OpenStax chapter definitions.');
}

if (require.main === module) main();

module.exports = { chapterNodes, entriesFor, outputPath, stateFromDocument, textFromHtml };
