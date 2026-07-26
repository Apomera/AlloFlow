#!/usr/bin/env node
/**
 * Import rights-aware discovery cards for additional reading providers.
 *
 * Open Textbook Library records use its CC0 JSON discovery feed. Featured
 * Wikibooks cards are pinned to exact revisions and contain no copied book
 * text. Providers with mixed or title-specific rights are represented by
 * AlloFlow-authored link-only cards.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const CATALOG_PATH = path.join(ROOT, 'open_catalog.json');
const OTL_CSV = 'https://open.umn.edu/opentextbooks/download.csv';
const OTL_AUDIT = 'https://open.umn.edu/opentextbooks/discovery';
const WIKIBOOKS_API = 'https://en.wikibooks.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category%3AFeatured_books&gcmtype=page&gcmlimit=50&prop=info|revisions&rvprop=ids|timestamp&format=json&formatversion=2';
const WIKIBOOKS_AUDIT = 'https://en.wikibooks.org/wiki/Wikibooks:Copyrights';
const USER_AGENT = 'AlloFlow reading catalog (noncommercial educational discovery)';

function fetchText(url) {
  return execFileSync('curl', [
    '-sSL', '--fail', '--max-time', '90',
    '-A', USER_AGENT,
    '-H', 'Accept: application/json,text/html;q=0.8',
    url,
  ], { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024 });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value, spaces = 2) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, spaces)}\n`);
}

function valueAfterArg(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

function catalogOutputPath(args) {
  const requested = valueAfterArg(args || [], '--catalog-output');
  if (!requested) return CATALOG_PATH;
  const resolved = path.resolve(ROOT, requested);
  if (path.dirname(resolved) !== ROOT || path.extname(resolved).toLowerCase() !== '.json') {
    throw new Error('--catalog-output must be a JSON filename inside reading_library/');
  }
  return resolved;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u00ad|\u200b|\u200c|\u200d/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlText(value) {
  const entities = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"',
  };
  return cleanText(String(value || '')
    .replace(/<\/?(?:p|div|li|ul|ol|br|h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (match, entity) => {
      if (entity[0] !== '#') return entities[entity.toLowerCase()] || match;
      const point = entity[1].toLowerCase() === 'x'
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : match;
    }));
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'untitled';
}

function words(value) {
  return cleanText(value).split(/\s+/).filter(Boolean).length;
}

function unique(values) {
  return values.filter((value, index, all) => value && all.indexOf(value) === index);
}

function linkOnlyPolicy(auditSource, reason, extra = {}) {
  return Object.assign({
    access: 'link-only',
    mirror: false,
    adapt: false,
    ai: false,
    commercial: false,
    attributionRequired: true,
    shareAlike: false,
    auditedAt: new Date().toISOString().slice(0, 10),
    auditSource,
    reason,
  }, extra);
}

function makeCard({
  slug,
  title,
  description,
  sourceId,
  sourceName,
  sourceUrl,
  contentType = 'textbook-source-card',
  subjects = [],
  authors = [],
  publisher = sourceName,
  license,
  licenseUrl,
  policy,
  pages,
  level = '6',
  extra = {},
}) {
  const normalizedPages = pages.map((text, index) => ({
    n: index + 1,
    img: null,
    text: cleanText(text),
  }));
  return Object.assign({
    schema: 'allo-reading-book@1',
    slug,
    title: cleanText(title),
    description: cleanText(description),
    language: 'English',
    langCode: 'en',
    isRtl: false,
    level: String(level),
    orientation: 'portrait',
    sourceId,
    contentType,
    subjects: unique(subjects.map(cleanText)),
    authors: unique(authors.map(cleanText)),
    illustrators: [],
    originalAuthors: [],
    publisher: cleanText(publisher),
    license,
    licenseUrl,
    source: { id: sourceId, name: sourceName, url: sourceUrl },
    usagePolicy: policy,
    cover: null,
    audio: null,
    pages: normalizedPages,
    stats: {
      pages: normalizedPages.length,
      words: normalizedPages.reduce((sum, page) => sum + words(page.text), 0),
    },
  }, extra);
}

function contributorNames(record) {
  return unique((record.contributors || []).map((entry) => {
    if (typeof entry === 'string') return cleanText(entry);
    return cleanText(
      entry.name ||
      [entry.first_name, entry.middle_name, entry.last_name].filter(Boolean).join(' '),
    );
  }));
}

function subjectNames(record) {
  return unique((record.subjects || []).map((entry) =>
    cleanText(typeof entry === 'string' ? entry : entry.name || entry.subject || entry.title)));
}

function publisherNames(record) {
  return unique((record.publishers || []).map((entry) =>
    cleanText(typeof entry === 'string' ? entry : entry.name || entry.title)));
}

function parseCsv(value) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('Open Textbook Library CSV ended inside a quoted field');
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function readOtlCsvRecords(value) {
  const rows = parseCsv(value);
  const headers = rows.shift();
  if (!headers || !headers.includes('Otl id') || !headers.includes('Library URL')) {
    throw new Error('Open Textbook Library CSV headers were unexpected');
  }
  return rows.filter((row) => row.some(Boolean)).map((row) => {
    if (row.length !== headers.length) {
      throw new Error(`Open Textbook Library CSV row had ${row.length} fields; expected ${headers.length}`);
    }
    const entry = Object.fromEntries(headers.map((header, index) => [header, row[index]]));
    return {
      id: entry['Otl id'],
      title: entry.Title,
      copyright_year: entry['Copyright year'],
      contributors: cleanText(entry.Contributors)
        ? entry.Contributors.split(/\s*;\s*/).filter(Boolean)
        : [],
      publishers: cleanText(entry.Publisher) ? [entry.Publisher] : [],
      description: entry.Description,
      license: entry.License,
      url: entry['Library URL'],
      subjects: [entry['Subject 1'], entry['Subject 2']].filter(Boolean),
      accessibility_features: [],
    };
  });
}

function makeOtlCards() {
  const records = readOtlCsvRecords(fetchText(OTL_CSV));
  if (records.length < 500) {
    throw new Error(`Open Textbook Library CSV was unexpectedly small: ${records.length}`);
  }
  const ids = new Set();
  return records.map((record) => {
    const id = Number(record.id);
    if (!Number.isInteger(id) || ids.has(id) || !/^https:\/\/open\.umn\.edu\//.test(record.url || '')) {
      throw new Error(`Invalid Open Textbook Library record: ${record.id}`);
    }
    ids.add(id);
    const title = cleanText(record.title);
    const description = htmlText(record.description) ||
      'An open textbook record from the Open Textbook Library.';
    const accessibility = unique((record.accessibility_features || []).map(cleanText))
      .filter((value) => value && value.toLowerCase() !== 'unknown');
    const linkedLicense = cleanText(record.license) || 'See title record';
    const subjects = subjectNames(record);
    const authors = contributorNames(record);
    const publishers = publisherNames(record);
    const policy = linkOnlyPolicy(
      OTL_AUDIT,
      'Only CC0 catalog metadata and an AlloFlow-authored summary are stored. The linked textbook remains subject to its title-level license.',
      { metadataLicense: 'CC0 1.0', linkedContentLicense: linkedLicense },
    );
    return makeCard({
      slug: `otl-${id}-${slugify(title)}`,
      title,
      description,
      sourceId: 'open-textbook-library',
      sourceName: 'Open Textbook Library',
      sourceUrl: record.url,
      subjects: subjects.length ? subjects : ['Open textbooks'],
      authors: authors.length ? authors : ['Open Textbook Library record'],
      publisher: publishers[0] || 'Open Textbook Library',
      license: `CC0 1.0 catalog metadata · linked title: ${linkedLicense}`,
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      policy,
      pages: [
        description,
        [
          `Linked title license: ${linkedLicense}.`,
          record.copyright_year ? `Copyright year: ${record.copyright_year}.` : '',
          record.rating ? `Open Textbook Library rating: ${record.rating}.` : '',
          record.textbook_reviews_count != null
            ? `Faculty reviews: ${record.textbook_reviews_count}.`
            : '',
        ].filter(Boolean).join(' '),
        accessibility.length
          ? `Reported accessibility features: ${accessibility.join(', ')}.`
          : 'Open the official record to review formats, accessibility details, and the complete title-level license before reuse.',
      ],
      extra: {
        linkedContentLicense: linkedLicense,
        language: 'Not specified',
        langCode: 'und',
        externalRecordId: String(id),
        accessibilityFeatures: accessibility,
        licenseAudit: {
          auditedAt: policy.auditedAt,
          source: OTL_AUDIT,
          note: 'Open Textbook Library records are CC0. Linked textbook content is not mirrored by this card.',
        },
      },
    });
  });
}

function makeWikibooksCards() {
  const payload = JSON.parse(fetchText(WIKIBOOKS_API));
  const records = payload.query && payload.query.pages;
  if (!Array.isArray(records) || records.length !== 50) {
    throw new Error(`Expected 50 featured Wikibooks records, found ${records?.length}`);
  }
  return records
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((record) => {
      const revision = record.revisions && record.revisions[0];
      if (!record.pageid || !record.lastrevid || !revision?.timestamp) {
        throw new Error(`Featured Wikibooks revision metadata missing for ${record.title}`);
      }
      const sourceUrl =
        `https://en.wikibooks.org/w/index.php?title=${encodeURIComponent(record.title)}` +
        `&oldid=${record.lastrevid}`;
      const description =
        `A featured Wikibooks textbook or manual, pinned to revision ${record.lastrevid} for stable discovery and attribution.`;
      const policy = linkOnlyPolicy(
        WIKIBOOKS_AUDIT,
        'This card stores revision metadata and an AlloFlow-authored description only. Book text and media are not mirrored.',
        { pinnedRevision: String(record.lastrevid) },
      );
      return makeCard({
        slug: `wikibooks-featured-${record.pageid}-${slugify(record.title)}`,
        title: record.title,
        description,
        sourceId: 'wikibooks',
        sourceName: 'Wikibooks',
        sourceUrl,
        subjects: ['Open textbooks', 'Reference', 'Wikibooks featured book'],
        authors: ['Wikibooks contributors'],
        publisher: 'Wikimedia Foundation',
        license: 'CC BY-SA 4.0 and GFDL · pinned link-only catalog card',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        policy,
        pages: [
          description,
          `Pinned source revision: ${record.lastrevid}, timestamped ${revision.timestamp}.`,
          'Open the official pinned revision to read the book and view its contributor history. Media may have separate licenses.',
        ],
        extra: {
          externalRecordId: String(record.pageid),
          pinnedRevision: String(record.lastrevid),
          licenseAudit: {
            auditedAt: policy.auditedAt,
            source: WIKIBOOKS_AUDIT,
            note: 'Wikibooks text is generally CC BY-SA 4.0/GFDL; media may use separate licenses.',
          },
        },
      });
    });
}

const FIXED_CARDS = [
  {
    slug: 'core-knowledge-language-arts-card',
    title: 'Core Knowledge Language Arts',
    description: 'Free Preschool–Grade 5 knowledge-building language arts curriculum and readers.',
    sourceId: 'core-knowledge',
    sourceName: 'Core Knowledge Foundation',
    sourceUrl: 'https://www.coreknowledge.org/download-free-curriculum/',
    subjects: ['Language arts', 'Literacy', 'Elementary school', 'Knowledge building'],
    authors: ['Core Knowledge Foundation'],
    license: 'CC BY-NC-SA 4.0 curriculum · link-only pending asset audit',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    audit: 'https://www.coreknowledge.org/terms-of-use/',
    reason: 'Core Knowledge curriculum is openly licensed, but some images and media are third-party assets requiring resource-level review.',
  },
  {
    slug: 'core-knowledge-history-geography-card',
    title: 'Core Knowledge History and Geography',
    description: 'Content-rich elementary and middle-grade history, geography, civics, and culture materials.',
    sourceId: 'core-knowledge',
    sourceName: 'Core Knowledge Foundation',
    sourceUrl: 'https://www.coreknowledge.org/download-free-curriculum/',
    subjects: ['History', 'Geography', 'Civics', 'Elementary school'],
    authors: ['Core Knowledge Foundation'],
    license: 'CC BY-NC-SA 4.0 curriculum · link-only pending asset audit',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    audit: 'https://www.coreknowledge.org/terms-of-use/',
    reason: 'Core Knowledge curriculum is openly licensed, but some images and media are third-party assets requiring resource-level review.',
  },
  {
    slug: 'core-knowledge-science-card',
    title: 'Core Knowledge Science',
    description: 'Free content-rich science curriculum spanning elementary and middle-school topics.',
    sourceId: 'core-knowledge',
    sourceName: 'Core Knowledge Foundation',
    sourceUrl: 'https://www.coreknowledge.org/download-free-curriculum/',
    subjects: ['Science', 'Elementary school', 'Middle school', 'STEM'],
    authors: ['Core Knowledge Foundation'],
    license: 'CC BY-NC-SA 4.0 curriculum · link-only pending asset audit',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    audit: 'https://www.coreknowledge.org/terms-of-use/',
    reason: 'Core Knowledge curriculum is openly licensed, but some images and media are third-party assets requiring resource-level review.',
  },
  {
    slug: 'core-knowledge-classics-card',
    title: 'Core Knowledge Classics and Literature',
    description: 'Adapted classics, tales, and literature resources designed for classroom reading.',
    sourceId: 'core-knowledge',
    sourceName: 'Core Knowledge Foundation',
    sourceUrl: 'https://www.coreknowledge.org/download-free-curriculum/',
    subjects: ['Literature', 'Classics', 'Reading', 'Elementary school'],
    authors: ['Core Knowledge Foundation'],
    license: 'CC BY-NC-SA 4.0 curriculum · link-only pending asset audit',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    audit: 'https://www.coreknowledge.org/terms-of-use/',
    reason: 'Core Knowledge curriculum is openly licensed, but some images and media are third-party assets requiring resource-level review.',
  },
  {
    slug: 'pressbooks-directory-card',
    title: 'Pressbooks Directory',
    description: 'Search thousands of accessible open textbooks, manuals, monographs, and course resources.',
    sourceId: 'pressbooks',
    sourceName: 'Pressbooks Directory',
    sourceUrl: 'https://pressbooks.directory/',
    subjects: ['Open textbooks', 'College', 'Career education', 'Reference'],
    authors: ['Pressbooks'],
    license: 'Directory discovery · linked title licenses vary',
    licenseUrl: 'https://guide.pressbooks.com/chapter/find-books-on-the-pressbooks-directory/',
    audit: 'https://guide.pressbooks.com/chapter/find-books-on-the-pressbooks-directory/',
    reason: 'Pressbooks titles span multiple licenses. This card links to the directory and does not copy title content.',
  },
  {
    slug: 'standard-ebooks-library-card',
    title: 'Standard Ebooks',
    description: 'Carefully proofread and semantically structured public-domain ebook editions.',
    sourceId: 'standard-ebooks',
    sourceName: 'Standard Ebooks',
    sourceUrl: 'https://standardebooks.org/ebooks',
    contentType: 'public-domain-source-card',
    subjects: ['Public domain', 'Literature', 'Classics', 'Accessible EPUB'],
    authors: ['Standard Ebooks contributors'],
    license: 'Public domain and CC0 · link-only catalog card',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    audit: 'https://standardebooks.org/',
    reason: 'Standard Ebooks editions are public-domain/CC0, but bulk catalog feeds require project access. This card links to the official library.',
  },
  {
    slug: 'book-dash-library-card',
    title: 'Book Dash Children’s Books',
    description: 'Openly licensed illustrated early readers available in multiple languages.',
    sourceId: 'book-dash',
    sourceName: 'Book Dash',
    sourceUrl: 'https://bookdash.org/books/',
    contentType: 'open-access-source-card',
    subjects: ['Early readers', 'Picture books', 'Multilingual', 'Children'],
    authors: ['Book Dash contributors'],
    license: 'CC BY 4.0 · link-only catalog card',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    audit: 'https://bookdash.org/books/',
    reason: 'The collection is CC BY 4.0. This initial card links to official books while a future importer preserves creator-level attribution.',
  },
  {
    slug: 'oapen-library-card',
    title: 'OAPEN Library',
    description: 'A quality-controlled library of peer-reviewed open-access scholarly books.',
    sourceId: 'oapen',
    sourceName: 'OAPEN Library',
    sourceUrl: 'https://library.oapen.org/',
    contentType: 'open-access-source-card',
    subjects: ['Scholarly books', 'Research', 'Open access', 'Multilingual'],
    authors: ['OAPEN Foundation'],
    license: 'CC0 catalog metadata · linked title licenses vary',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    audit: 'https://www.oapen.org/article/metadata',
    reason: 'OAPEN metadata is CC0, while book licenses vary by title. This card does not mirror book content.',
  },
  {
    slug: 'doab-directory-card',
    title: 'Directory of Open Access Books',
    description: 'Discovery service for peer-reviewed open-access books and publishers.',
    sourceId: 'doab',
    sourceName: 'Directory of Open Access Books',
    sourceUrl: 'https://www.doabooks.org/',
    contentType: 'open-access-source-card',
    subjects: ['Scholarly books', 'Peer review', 'Open access', 'Research'],
    authors: ['DOAB Foundation'],
    license: 'Directory discovery · linked title licenses vary',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    audit: 'https://www.doabooks.org/en/doab',
    reason: 'DOAB indexes open-access books with title-level licenses. This card does not copy book content.',
  },
  {
    slug: 'mit-open-courseware-card',
    title: 'MIT OpenCourseWare',
    description: 'Openly licensed notes, readings, assignments, and learning materials from MIT courses.',
    sourceId: 'mit-ocw',
    sourceName: 'MIT OpenCourseWare',
    sourceUrl: 'https://ocw.mit.edu/',
    contentType: 'open-access-source-card',
    subjects: ['College', 'Course materials', 'STEM', 'Humanities'],
    authors: ['Massachusetts Institute of Technology'],
    license: 'Mostly CC BY-NC-SA · link-only due third-party exceptions',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    audit: 'https://mitocw.zendesk.com/hc/en-us/articles/4414756181403-How-is-all-rights-reserved-content-different-from-the-rest-of-OCW-content',
    reason: 'MIT OCW includes marked third-party and all-rights-reserved materials. This card links out and copies no course content.',
  },
  {
    slug: 'ncbi-bookshelf-card',
    title: 'NCBI Bookshelf',
    description: 'Biomedical and life-science books, reports, guidelines, and reference works.',
    sourceId: 'ncbi-bookshelf',
    sourceName: 'NCBI Bookshelf',
    sourceUrl: 'https://www.ncbi.nlm.nih.gov/books/',
    contentType: 'open-access-source-card',
    subjects: ['Health', 'Medicine', 'Life science', 'Reference'],
    authors: ['National Library of Medicine'],
    license: 'Per-title rights · link-only catalog card',
    licenseUrl: 'https://www.ncbi.nlm.nih.gov/sites/books/NBK554842/',
    audit: 'https://www.ncbi.nlm.nih.gov/sites/books/NBK554842/',
    reason: 'NCBI Bookshelf rights vary by title and may include third-party figures. This card links out and copies no book content.',
  },
];

function makeFixedCards() {
  return FIXED_CARDS.map((entry) => {
    const policy = linkOnlyPolicy(entry.audit, entry.reason);
    return makeCard({
      slug: entry.slug,
      title: entry.title,
      description: entry.description,
      sourceId: entry.sourceId,
      sourceName: entry.sourceName,
      sourceUrl: entry.sourceUrl,
      contentType: entry.contentType,
      subjects: entry.subjects,
      authors: entry.authors,
      publisher: entry.sourceName,
      license: entry.license,
      licenseUrl: entry.licenseUrl,
      policy,
      pages: [
        entry.description,
        'Open the official source to browse and read available materials.',
        entry.reason,
      ],
      extra: {
        licenseAudit: {
          auditedAt: policy.auditedAt,
          source: entry.audit,
          note: entry.reason,
        },
      },
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const catalog = readJson(CATALOG_PATH);
  catalog.items = catalog.items || [];
  const bySlug = new Map(catalog.items.map((item) => [item.slug, item]));
  const cards = [...await makeOtlCards(), ...makeWikibooksCards(), ...makeFixedCards()];
  const cardSlugs = new Set();
  fs.mkdirSync(BOOKS_DIR, { recursive: true });

  for (const card of cards) {
    if (cardSlugs.has(card.slug)) throw new Error(`Duplicate extended-source slug: ${card.slug}`);
    cardSlugs.add(card.slug);
    const file = `books/${card.slug}.json`;
    writeJson(path.join(ROOT, file), card);
    const existing = bySlug.get(card.slug);
    if (existing && existing.file !== file) {
      throw new Error(`Catalog file mismatch for ${card.slug}`);
    }
    if (!existing) {
      const item = { slug: card.slug, file };
      catalog.items.push(item);
      bySlug.set(card.slug, item);
    }
  }

  const output = catalogOutputPath(args);
  writeJson(output, catalog, 1);
  const counts = cards.reduce((result, card) => {
    result[card.sourceId] = (result[card.sourceId] || 0) + 1;
    return result;
  }, {});
  console.log(JSON.stringify({
    cards: cards.length,
    catalogItems: catalog.items.length,
    counts,
    output: path.relative(ROOT, output),
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = {
  FIXED_CARDS,
  catalogOutputPath,
  cleanText,
  linkOnlyPolicy,
  makeCard,
  makeFixedCards,
  makeOtlCards,
  parseCsv,
  readOtlCsvRecords,
  makeWikibooksCards,
  slugify,
};
