#!/usr/bin/env node
'use strict';

const fs = require('fs');

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(label + ': expected one anchor, found ' + count);
  return source.replace(before, after);
}

const manifestFile = 'reading_library/openstax_mirror_manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const additions = [
  {
    slug: 'openstax-biology-2e-chapter-2',
    title: 'OpenStax Biology 2e · Chapter 2: The Chemical Foundation of Life',
    bookTitle: 'Biology 2e',
    description: 'An accessibility-ready mirror of OpenStax Biology 2e Chapter 2.',
    subjects: ['Biology', 'Chemistry of life', 'Atoms and molecules', 'Water and carbon'],
    level: '6',
    sourceUrl: 'https://openstax.org/books/biology-2e/pages/2-introduction',
    sections: [
      'https://openstax.org/books/biology-2e/pages/2-introduction',
      'https://openstax.org/books/biology-2e/pages/2-1-atoms-isotopes-ions-and-molecules-the-building-blocks',
      'https://openstax.org/books/biology-2e/pages/2-2-water',
      'https://openstax.org/books/biology-2e/pages/2-3-carbon'
    ]
  },
  {
    slug: 'openstax-astronomy-2e-chapter-2',
    title: 'OpenStax Astronomy 2e · Chapter 2: Observing the Sky',
    bookTitle: 'Astronomy 2e',
    description: 'An accessibility-ready mirror of OpenStax Astronomy 2e Chapter 2.',
    subjects: ['Astronomy', 'Observing the sky', 'Ancient astronomy', 'Scientific revolution'],
    level: '6',
    sourceUrl: 'https://openstax.org/books/astronomy-2e/pages/2-thinking-ahead',
    sections: [
      'https://openstax.org/books/astronomy-2e/pages/2-thinking-ahead',
      'https://openstax.org/books/astronomy-2e/pages/2-1-the-sky-above',
      'https://openstax.org/books/astronomy-2e/pages/2-2-ancient-astronomy',
      'https://openstax.org/books/astronomy-2e/pages/2-3-astrology-and-astronomy',
      'https://openstax.org/books/astronomy-2e/pages/2-4-the-birth-of-modern-astronomy'
    ]
  },
  {
    slug: 'openstax-us-history-chapter-2',
    title: 'OpenStax U.S. History · Chapter 2: Early Globalization',
    bookTitle: 'U.S. History',
    description: 'An accessibility-ready mirror of OpenStax U.S. History Chapter 2.',
    subjects: ['U.S. history', 'Atlantic world', 'Colonization', 'Columbian Exchange'],
    level: '6',
    sourceUrl: 'https://openstax.org/books/us-history/pages/2-introduction',
    sections: [
      'https://openstax.org/books/us-history/pages/2-introduction',
      'https://openstax.org/books/us-history/pages/2-1-portuguese-exploration-and-spanish-conquest',
      'https://openstax.org/books/us-history/pages/2-2-religious-upheavals-in-the-developing-atlantic-world',
      'https://openstax.org/books/us-history/pages/2-3-challenges-to-spains-supremacy',
      'https://openstax.org/books/us-history/pages/2-4-new-worlds-in-the-americas-labor-commerce-and-the-columbian-exchange'
    ]
  }
];
const known = new Set((manifest.books || []).map((book) => book.slug));
for (const entry of additions) {
  if (!known.has(entry.slug)) manifest.books.push(entry);
}
writeJson(manifestFile, manifest);
console.log(manifestFile + ' contains ' + manifest.books.length + ' mirrored chapters');

const importerFile = 'reading_library/import_openstax_chapters.js';
let importer = fs.readFileSync(importerFile, 'utf8');
importer = replaceOnce(
  importer,
  "const { execFileSync } = require('child_process');",
  "const { execFileSync } = require('child_process');\nconst crypto = require('crypto');",
  'importer crypto'
);
importer = replaceOnce(
  importer,
  "function words(value) {\n  return cleanText(value).split(/\\s+/).filter(Boolean).length;\n}\n",
  "function words(value) {\n  return cleanText(value).split(/\\s+/).filter(Boolean).length;\n}\n\n" +
  "function sha256(value) {\n" +
  "  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');\n" +
  "}\n",
  'importer digest helper'
);
importer = replaceOnce(
  importer,
  "      text: parsed.text,\n      sourceUrl: officialUrl\n",
  "      text: parsed.text,\n" +
  "      sourceUrl: officialUrl,\n" +
  "      sourceWordCount: words(parsed.text),\n" +
  "      sourceDigest: 'sha256:' + sha256(parsed.text)\n",
  'page integrity metadata'
);
importer = replaceOnce(
  importer,
  "      sectionUrls: pages.map((page) => page.sourceUrl)\n",
  "      sectionUrls: pages.map((page) => page.sourceUrl),\n" +
  "      contentDigest: 'sha256:' + sha256(pages.map((page) => page.sourceDigest).join('\\n'))\n",
  'book integrity metadata'
);
importer = importer.replace(
  "module.exports = { assertOfficialUrl, cleanText, extractReadableText, parseSection };",
  "module.exports = { assertOfficialUrl, cleanText, extractReadableText, parseSection, sha256 };"
);
fs.writeFileSync(importerFile, importer);
console.log(importerFile + ' records normalized-content integrity');

const moduleFiles = [
  'reading_library_module.js',
  'prismflow-deploy/public/reading_library_module.js',
  'prismflow-deploy/build/reading_library_module.js'
];
for (const moduleFile of moduleFiles) {
  let source = fs.readFileSync(moduleFile, 'utf8');
  source = replaceOnce(
    source,
    "    var bookSourceHref = bookSourceUrl && bookSourceUrl !== '#' ? bookSourceUrl : '';\n    var usagePolicy = bookUsagePolicy(book);",
    "    var pageSourceUrl = (page && page.sourceUrl) || bookSourceUrl;\n" +
    "    var pageSourceHref = pageSourceUrl && pageSourceUrl !== '#' ? pageSourceUrl : '';\n" +
    "    var usagePolicy = bookUsagePolicy(book);",
    moduleFile + ' current section URL'
  );
  source = replaceOnce(
    source,
    "        bookSourceHref ? e('a', {",
    "        pageSourceHref ? e('a', {",
    moduleFile + ' source link condition'
  );
  source = replaceOnce(
    source,
    "          href: bookSourceHref,",
    "          href: pageSourceHref,",
    moduleFile + ' source link href'
  );
  source = source.replace(
    "title: tr('readinglib_open_original_hint', 'Open the official source page for this text'),",
    "title: tr('readinglib_open_original_hint', 'Open the official source page for this section'),"
  );
  source = replaceOnce(
    source,
    "          e('a', { href: bookSourceUrl, target: '_blank', rel: 'noopener noreferrer', className: 'underline hover:text-indigo-700' },\n            bookSourceName),",
    "          e('a', { href: pageSourceUrl, target: '_blank', rel: 'noopener noreferrer', className: 'underline hover:text-indigo-700' },\n            bookSourceName),",
    moduleFile + ' footer source link'
  );
  fs.writeFileSync(moduleFile, source);
  console.log(moduleFile + ' follows the current mirrored section');
}

const testFile = 'tests/reading_textbook_sources.test.js';
let test = fs.readFileSync(testFile, 'utf8');
test = test.replace(
  "it('publishes three readable, license-audited OpenStax chapter mirrors'",
  "it('publishes six readable, license-audited OpenStax chapter mirrors'"
);
test = test.replace('expect(chapters).toHaveLength(3);', 'expect(chapters).toHaveLength(6);');
test = test.replace(
  "expect(entry.file).toMatch(/^books\\/openstax-.+-chapter-1\\.json$/);",
  "expect(entry.file).toMatch(/^books\\/openstax-.+-chapter-[12]\\.json$/);"
);
test = test.replace(
  "typeof page.text === 'string' &&\n        page.text.length > 100",
  "typeof page.text === 'string' &&\n" +
  "        page.text.length > 100 &&\n" +
  "        page.sourceWordCount > 40 &&\n" +
  "        /^sha256:[a-f0-9]{64}$/.test(page.sourceDigest)"
);
test = test.replace(
  "expect(book.pages.length).toBeGreaterThanOrEqual(3);",
  "expect(book.pages.length).toBeGreaterThanOrEqual(3);\n" +
  "      expect(book.mirror.contentDigest).toMatch(/^sha256:[a-f0-9]{64}$/);"
);
fs.writeFileSync(testFile, test);
console.log(testFile + ' covers both chapter waves and integrity metadata');
