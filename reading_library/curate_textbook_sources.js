#!/usr/bin/env node
/**
 * Apply the audited textbook-provider policy and add CK-12 link-only cards.
 *
 * Run after import_open_source_cards.js. OpenStax cards are normalized to the
 * current CC BY-NC-SA 4.0 terms. CK-12 cards contain AlloFlow-authored
 * summaries and official discovery links only; no CK-12 curriculum text is
 * copied or sent to AI.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const OPEN_CATALOG_PATH = path.join(ROOT, 'open_catalog.json');

const OPENSTAX_LICENSE = 'CC BY-NC-SA 4.0';
const OPENSTAX_LICENSE_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';
const OPENSTAX_AUDIT_URL = 'https://help.openstax.org/s/article/Licensing-information-of-OpenStax-textbooks';
const OPENSTAX_AI_NOTICE = "This book may not be used in the training of large language models or otherwise be ingested into large language models or generative AI offerings without OpenStax's permission.";
const CK12_TERMS_URL = 'https://help.ck12.org/hc/en-us/articles/51042851054235-CK-12-Terms-of-Use';
const CK12_FLEXBOOKS_URL = 'https://www.ck12.org/flexbooks';

const OPENSTAX_POLICY = {
  access: 'link-out',
  mirror: true,
  adapt: true,
  ai: false,
  commercial: false,
  attributionRequired: true,
  shareAlike: true,
  auditedAt: '2026-07-23',
  auditSource: OPENSTAX_AUDIT_URL,
  aiPermissionRequired: true,
  reason: OPENSTAX_AI_NOTICE
};

const CK12_POLICY = {
  access: 'link-only',
  mirror: false,
  adapt: false,
  ai: false,
  commercial: false,
  attributionRequired: true,
  shareAlike: false,
  auditedAt: '2026-07-23',
  auditSource: CK12_TERMS_URL,
  reason: 'CK-12 currently restricts content aggregation and AI/ML use without permission.'
};

const CK12_ENTRIES = [
  {
    slug: 'ck12-biology-flexbooks-card',
    title: 'CK-12 Biology FlexBooks',
    description: 'A link-only discovery card for CK-12 biology textbooks and study resources.',
    subjects: ['Biology', 'Life science', 'Cells', 'Genetics'],
    overview: 'CK-12 offers customizable biology FlexBooks covering cells, genetics, evolution, ecology, microorganisms, plants, animals, and human biology.',
    classroomUse: 'Open CK-12 FlexBooks and search for Biology. Use the official CK-12 reader and assignment tools for the curriculum content.'
  },
  {
    slug: 'ck12-chemistry-flexbooks-card',
    title: 'CK-12 Chemistry FlexBooks',
    description: 'A link-only discovery card for CK-12 chemistry textbooks and study resources.',
    subjects: ['Chemistry', 'Matter', 'Chemical reactions', 'Stoichiometry'],
    overview: 'CK-12 chemistry materials span scientific measurement, matter, atomic structure, periodic trends, bonding, reactions, stoichiometry, thermodynamics, and organic chemistry.',
    classroomUse: 'Open CK-12 FlexBooks and search for Chemistry. Select the course and reading level that match the class.'
  },
  {
    slug: 'ck12-physics-flexbooks-card',
    title: 'CK-12 Physics FlexBooks',
    description: 'A link-only discovery card for CK-12 physics textbooks and study resources.',
    subjects: ['Physics', 'Motion', 'Forces', 'Energy'],
    overview: 'CK-12 physics collections support study of motion, forces, energy, waves, electricity, magnetism, optics, and modern physics.',
    classroomUse: 'Open CK-12 FlexBooks and search for Physics or People’s Physics. Use CK-12 simulations and practices from the official lesson pages.'
  },
  {
    slug: 'ck12-earth-science-flexbooks-card',
    title: 'CK-12 Earth Science FlexBooks',
    description: 'A link-only discovery card for CK-12 Earth science textbooks and study resources.',
    subjects: ['Earth science', 'Geology', 'Weather', 'Climate'],
    overview: 'CK-12 Earth science resources address rocks and minerals, plate tectonics, Earth history, water, weather, climate, astronomy, and human environmental impacts.',
    classroomUse: 'Open CK-12 FlexBooks and search for Earth Science, then choose a middle-school or high-school collection.'
  },
  {
    slug: 'ck12-life-science-flexbooks-card',
    title: 'CK-12 Life Science FlexBooks',
    description: 'A link-only discovery card for CK-12 middle-school life science resources.',
    subjects: ['Life science', 'Ecology', 'Organisms', 'Middle school'],
    overview: 'CK-12 life science materials provide middle-school pathways through cells, heredity, evolution, ecology, microorganisms, plants, animals, and body systems.',
    classroomUse: 'Open CK-12 FlexBooks and search for Life Science to find a course-aligned collection.'
  },
  {
    slug: 'ck12-algebra-1-flexbooks-card',
    title: 'CK-12 Algebra I FlexBooks',
    description: 'A link-only discovery card for CK-12 Algebra I textbooks and study resources.',
    subjects: ['Mathematics', 'Algebra', 'Equations', 'Functions'],
    overview: 'CK-12 Algebra I materials cover real numbers, equations, inequalities, functions, lines, systems, exponents, polynomials, quadratics, and data.',
    classroomUse: 'Open CK-12 FlexBooks and search for Algebra I. Students can use the official examples, interactives, and adaptive practice.'
  },
  {
    slug: 'ck12-geometry-flexbooks-card',
    title: 'CK-12 Geometry FlexBooks',
    description: 'A link-only discovery card for CK-12 geometry textbooks and study resources.',
    subjects: ['Mathematics', 'Geometry', 'Proof', 'Measurement'],
    overview: 'CK-12 geometry materials cover reasoning and proof, congruence, similarity, polygons, circles, area, volume, coordinate geometry, and transformations.',
    classroomUse: 'Open CK-12 FlexBooks and search for Geometry, then select the course version that matches local standards.'
  },
  {
    slug: 'ck12-probability-statistics-flexbooks-card',
    title: 'CK-12 Probability and Statistics FlexBooks',
    description: 'A link-only discovery card for CK-12 probability and statistics resources.',
    subjects: ['Mathematics', 'Statistics', 'Probability', 'Data literacy'],
    overview: 'CK-12 offers introductory and advanced resources for data displays, descriptive statistics, probability, random variables, sampling, inference, and regression.',
    classroomUse: 'Open CK-12 FlexBooks and search for Probability and Statistics. Choose basic or advanced material based on the course.'
  }
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function writeCatalog(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 1) + '\n');
}

function countWords(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function makeCk12Card(entry) {
  const rights = 'Link only: CK-12 curriculum text is not mirrored or sent to AlloFlow AI features. Open the official CK-12 site to read, customize, or assign the material.';
  const pages = [
    { n: 1, img: null, text: entry.overview },
    { n: 2, img: null, text: entry.classroomUse },
    { n: 3, img: null, text: rights }
  ];
  return {
    schema: 'allo-reading-book@1',
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    language: 'English',
    langCode: 'en',
    isRtl: false,
    level: '6',
    orientation: 'portrait',
    sourceId: 'ck12',
    contentType: 'textbook-source-card',
    subjects: entry.subjects,
    authors: ['CK-12 Foundation'],
    illustrators: [],
    originalAuthors: [],
    publisher: 'CK-12 Foundation',
    license: 'CK-12 Curriculum Materials License · link-only catalog use',
    licenseUrl: CK12_TERMS_URL,
    source: { id: 'ck12', name: 'CK-12', url: CK12_FLEXBOOKS_URL },
    usagePolicy: CK12_POLICY,
    cover: null,
    audio: null,
    pages,
    stats: {
      pages: pages.length,
      words: pages.reduce((total, page) => total + countWords(page.text), 0)
    }
  };
}

function auditOpenStaxCards(catalog) {
  let updated = 0;
  for (const item of catalog.items || []) {
    if (!/^openstax-/.test(String(item.slug || ''))) continue;
    const file = item.file || ('books/' + item.slug + '.json');
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;
    const book = readJson(fullPath);
    if (!/card/.test(String(book.contentType || ''))) continue;
    book.license = OPENSTAX_LICENSE;
    book.licenseUrl = OPENSTAX_LICENSE_URL;
    book.source = book.source || { id: 'openstax', name: 'OpenStax', url: '#' };
    if (book.source.url && book.source.url !== '#') {
      book.source.attributionUrl = book.source.url.replace(/\/pages\/[^?#]+(?:[?#].*)?$/, '/pages/1-introduction');
    }
    book.usagePolicy = Object.assign({}, OPENSTAX_POLICY, { aiRestrictionSource: book.source.url });
    book.licenseAudit = {
      auditedAt: OPENSTAX_POLICY.auditedAt,
      source: OPENSTAX_AUDIT_URL,
      note: 'OpenStax attribution, noncommercial, and share-alike requirements apply to adaptations. Generative-AI ingestion requires OpenStax permission.'
    };
    writeJson(fullPath, book);
    updated++;
  }
  return updated;
}

function main() {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  const catalog = readJson(OPEN_CATALOG_PATH);
  catalog.items = catalog.items || [];
  const registered = new Set(catalog.items.map((item) => item.slug));
  const audited = auditOpenStaxCards(catalog);
  let added = 0;

  for (const entry of CK12_ENTRIES) {
    const book = makeCk12Card(entry);
    const file = 'books/' + book.slug + '.json';
    writeJson(path.join(ROOT, file), book);
    if (!registered.has(book.slug)) {
      catalog.items.push({ slug: book.slug, file });
      registered.add(book.slug);
      added++;
    }
  }

  writeCatalog(OPEN_CATALOG_PATH, catalog);
  console.log('Audited ' + audited + ' OpenStax source cards.');
  console.log('Wrote ' + CK12_ENTRIES.length + ' CK-12 link-only cards (' + added + ' newly registered).');
}

if (require.main === module) main();

module.exports = { CK12_ENTRIES, CK12_POLICY, OPENSTAX_POLICY, makeCk12Card };
