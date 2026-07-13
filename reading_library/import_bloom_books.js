#!/usr/bin/env node
/**
 * import_bloom_books.js — mirror openly-licensed picture books from Bloom
 * Library (bloomlibrary.org, SIL) into the AlloFlow Reading Library.
 *
 * Why Bloom: it is the only keyless source with books in the languages of
 * Portland ME's largest refugee/immigrant communities that StoryWeaver lacks —
 * Somali, Maay Maay, Lingala, Kirundi, Acholi, Nuer — plus Ukrainian, and a
 * deep Haitian Creole / Kinyarwanda pool to top up thin StoryWeaver shelves.
 *
 * Pipeline per language:
 *   1. list:    GET api.bloomlibrary.org/v1/books?lang=<code>   (keyless JSON)
 *   2. gate:    GET <baseUrl>meta.json — import ONLY cc-by / cc-by-sa / cc0.
 *               Bloom hosts all-rights-reserved and NC/ND content too; those
 *               are skipped and reported. License version is not recorded in
 *               Bloom metadata, so we display the unversioned license name and
 *               link the 4.0 (or CC0 1.0) deed.
 *   3. parse:   GET the book's .htm (Bloom Digital format). Text lives in
 *               div.bloom-page.numberedPage .bloom-editable[lang=<code>]
 *               (image-description editables excluded — they are alt text);
 *               images are relative <img src> inside .bloom-imageContainer,
 *               hotlinked from S3 exactly like StoryWeaver hotlinks GCS.
 *   4. write:   books/bloom-<instance8>-<title>.json (same allo-reading-book@1
 *               shape as StoryWeaver stories) + open_catalog.json entry.
 *
 * Levels come from Bloom's computedLevel tag (1-4, same band idea as
 * StoryWeaver levels). assign_levels.js ignores stories, so these stick.
 *
 * Usage:
 *   node reading_library/import_bloom_books.js --plan          # license census, no writes
 *   node reading_library/import_bloom_books.js --fetch         # import all planned languages
 *   node reading_library/import_bloom_books.js --fetch --langs so,ymm
 *   node reading_library/import_bloom_books.js --fetch --dry-run
 *
 * Requires jsdom from prismflow-deploy/node_modules (dev dependency of the
 * test harness; this is a build-side script, never shipped).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const OPEN_CATALOG_PATH = path.join(ROOT, 'open_catalog.json');
const API = 'https://api.bloomlibrary.org/v1/books';
const UA = 'AlloFlow reading library Bloom importer';

// Display names must match StoryWeaver's exactly where both sources have the
// language, so the browse language filter merges the shelves. `code` is what
// Bloom's API and HTML lang attributes use; `langCode` (optional) is what we
// store when StoryWeaver spells it differently (Filipino: tl vs fil).
const PLAN = [
  { code: 'so', name: 'Somali', cap: 20 },
  { code: 'ymm', name: 'Maay Maay', cap: 20 },
  { code: 'ln', name: 'Lingala', cap: 20 },
  { code: 'rn', name: 'Kirundi', cap: 20 },
  { code: 'ach', name: 'Acholi', cap: 20 },
  { code: 'nus', name: 'Nuer', cap: 20 },
  { code: 'uk', name: 'Ukrainian', cap: 20 },
  { code: 'ht', name: 'Haitian Creole', cap: 20 },
  { code: 'rw', name: 'Kinyarwanda', cap: 20 },
  // ---- 2026-07-13 wave 2: Portland-relevant + StoryWeaver-thin languages.
  { code: 'ti', name: 'Tigrinya', cap: 20 },
  { code: 'am', name: 'Amharic', cap: 20 },
  { code: 'prs', name: 'Dari', cap: 20 },
  { code: 'km', name: 'Khmer', cap: 20 },
  { code: 'my', name: 'Burmese', cap: 20 },
  { code: 'ne', name: 'Nepali', cap: 20 },
  { code: 'lo', name: 'Lao', cap: 20 },
  { code: 'vi', name: 'Vietnamese', cap: 12 },
  { code: 'mww', name: 'Hmong', cap: 20 },
  { code: 'sw', name: 'Kiswahili', cap: 20 },
  { code: 'ur', name: 'Urdu', cap: 12 },
  { code: 'tl', name: 'Filipino', cap: 12, langCode: 'fil' },
  { code: 'ar', name: 'Arabic', cap: 5 },
  { code: 'fa', name: 'Farsi', cap: 2 },
  { code: 'kmr', name: 'Kurdish', cap: 20 },
];

const RTL_CODES = new Set(['ar', 'fa', 'ur', 'prs', 'ps', 'he']);

const LICENSES = {
  'cc-by': { label: 'CC BY', url: 'https://creativecommons.org/licenses/by/4.0/' },
  'cc-by-sa': { label: 'CC BY-SA', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'cc0': { label: 'CC0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
};

// NC/ND books cannot be mirrored (we redistribute and reformat), but linking
// is always allowed — so they become link-out source cards, which is the
// difference between an empty shelf and a findable one for languages whose
// entire Bloom pool is NC-ND (Maay Maay, Acholi, Nuer).
const CARD_LICENSES = {
  'cc-by-nc': { label: 'CC BY-NC', url: 'https://creativecommons.org/licenses/by-nc/4.0/' },
  'cc-by-nc-sa': { label: 'CC BY-NC-SA', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
  'cc-by-nc-nd': { label: 'CC BY-NC-ND', url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/' },
};

const planOnly = process.argv.includes('--plan');
const doFetch = process.argv.includes('--fetch');
const dryRun = process.argv.includes('--dry-run');
const langsArg = valueAfter('--langs');
const langs = langsArg
  ? PLAN.filter((p) => langsArg.split(',').map((s) => s.trim()).includes(p.code))
  : PLAN;

function valueAfter(flag) {
  const idx = process.argv.indexOf(flag);
  return idx === -1 ? null : process.argv[idx + 1];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function curlText(url, attempt) {
  attempt = attempt || 1;
  try {
    return execFileSync('curl', [
      '-sSL', '--fail', '--max-time', '60',
      '-H', 'User-Agent: ' + UA,
      url,
    ], { maxBuffer: 96 * 1024 * 1024 }).toString('utf8');
  } catch (err) {
    if (attempt < 3) return curlText(url, attempt + 1);
    throw new Error('Could not fetch ' + url + ': ' + String(err.message || err).slice(0, 160));
  }
}

function getJson(url) {
  return JSON.parse(curlText(url));
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'untitled';
}

function words(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean).length;
}

// Bloom S3 keys encode spaces as '+'. The htm file is named after the last
// folder segment of baseUrl.
function bookFolderName(baseUrl) {
  const decoded = decodeURIComponent(String(baseUrl)).replace(/\+/g, ' ');
  const parts = decoded.replace(/\/+$/, '').split('/');
  return parts[parts.length - 1];
}

function htmUrl(baseUrl) {
  return baseUrl + encodeURIComponent(bookFolderName(baseUrl) + '.htm').replace(/%20/g, '+');
}

function titleFor(record, meta, code) {
  const hit = (record.titles || []).find((t) => t.lang === code && t.title);
  // Bloom titles can carry zero-width characters, embedded newlines, and
  // decorative space runs; normalize for display and slugs.
  return String((hit && hit.title) || (meta && meta.title) || 'Untitled')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Untitled';
}

// AlloFlow's pilot audience is public schools; religious instructional
// series (Bloom hosts e.g. the Bible-for-Children shelf) are excluded by
// default and REPORTED, so the choice is visible, not silent. Teachers can
// always reach them at bloomlibrary.org; --include-religious overrides.
const includeReligious = process.argv.includes('--include-religious');
function isReligiousInstructional(record) {
  if ((record.tags || []).some((t) => /bible|scripture|christian|quran|koran|islamic|religio/i.test(t))) return true;
  // Some religious titles carry no tags (a candy-cane "Jesus" story, "Yesu
  // atamboli likolo ya ebale", and "David e Golyat" all slipped through on
  // tags alone in the first run). Deliberately unambiguous tokens only —
  // generic words like "god" appear in folk tales and names. "Yesu" is Jesus
  // in the Bantu languages; Golyat/Goliath names the Bible story.
  const text = JSON.stringify(record.titles || []) + ' ' + String(record.summary || '');
  // psalm/passover/exodus and Tagalog "Panginoon" (the Lord) / Lao ພຣະເຈົ້າ
  // (God) caught a numbered Lao Bible-story series and a Filipino worship
  // book in wave 2. NOT included: bare names like Moses/Joseph — "Mussa na
  // Shamba Bora" is a secular farming story whose farmer is named Moses.
  return /jesus|\byesu\b|bible|biblia|scripture|gospel|golyat|goliath|psalm|passover|exodus|panginoon|ພຣະເຈົ້າ|ісус|біблі|христ|the creation in/i.test(text);
}

// Last line of defense: metadata can be silent while the story text itself
// is scripture (the Lao Creation book's summary is just "The Creation in
// Lao"). Checks the first pages of PARSED text for the unambiguous tokens.
function looksReligiousInText(pages) {
  const head = pages.slice(0, 3).map((p) => p.text || '').join(' ');
  return /\byesu\b|jesus|panginoon|ພຣະເຈົ້າ|እግዚአብሔር|біблі|ісус/i.test(head);
}

function computedLevel(record) {
  const tag = (record.tags || []).find((t) => /^computedLevel:\d/.test(t));
  if (!tag) return '2';
  const n = Number(tag.split(':')[1]);
  return String(Math.min(4, Math.max(1, n || 2)));
}

function topicSubjects(record) {
  return (record.tags || [])
    .filter((t) => /^topic:/.test(t))
    .map((t) => t.slice(6).trim())
    .filter(Boolean)
    .slice(0, 6);
}

// Bloom summaries often end with layout notes ("Bloom Reader layout",
// "Device Portrait Layout.") that are meaningless on a library card.
function cleanSummary(s) {
  return String(s || '').replace(/\s*(Bloom Reader layout|Device \w+( \w+)? Layout)\.?\s*$/i, '').trim();
}

function copyrightHolder(meta) {
  const m = /©\s*\d{4}\s*,?\s*(.+)$/.exec(String(meta.copyright || ''));
  return m ? m[1].trim() : '';
}

let JSDOM = null;
function loadJsdom() {
  if (JSDOM) return JSDOM;
  const jsdomPath = path.join(ROOT, '..', 'prismflow-deploy', 'node_modules', 'jsdom');
  ({ JSDOM } = require(jsdomPath));
  return JSDOM;
}

function extractPages(html, baseUrl, code) {
  loadJsdom();
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const out = [];
  // Cover image from the data div (xmatter pages are not numbered pages).
  const coverEl = doc.querySelector('#bloomDataDiv [data-book="coverImage"]');
  const coverSrc = coverEl && (coverEl.getAttribute('src') || coverEl.textContent.trim());
  const abs = (src) => baseUrl + String(src).replace(/%20/g, '+');
  const cover = coverSrc && !/placeHolder/i.test(coverSrc) ? abs(coverSrc) : null;

  for (const page of doc.querySelectorAll('div.bloom-page.numberedPage')) {
    const img = page.querySelector('.bloom-imageContainer img[src]');
    const imgSrc = img && img.getAttribute('src');
    const paras = [];
    for (const ed of page.querySelectorAll('.bloom-editable')) {
      if ((ed.getAttribute('lang') || '') !== code) continue;
      if (ed.closest('.bloom-imageDescription')) continue; // alt text, not story text
      const ps = ed.querySelectorAll('p');
      const chunks = ps.length ? Array.from(ps, (p) => p.textContent) : [ed.textContent];
      for (const chunk of chunks) {
        const t = String(chunk || '').replace(/\s+/g, ' ').trim();
        if (t) paras.push(t);
      }
    }
    const text = paras.join('\n');
    const image = imgSrc && !/placeHolder/i.test(imgSrc) ? abs(imgSrc) : null;
    if (!text && !image) continue; // video/widget/blank pages
    out.push({ img: image, text });
  }
  return { pages: out.map((p, i) => ({ n: i + 1, img: p.img, text: p.text })), cover };
}

function makeBook(record, meta, lang, parsed) {
  const title = titleFor(record, meta, lang.code);
  const lic = LICENSES[String(meta.license || '').toLowerCase()];
  const holder = copyrightHolder(meta);
  const author = String(meta.author || '').trim();
  const pages = parsed.pages;
  // Non-Latin titles slugify to 'untitled'; a multilingual record (one
  // instanceId, several language editions) would then collide with itself —
  // suffix the language so each edition gets its own slug.
  const titleSlug = slugify(title);
  return {
    schema: 'allo-reading-book@1',
    slug: 'bloom-' + String(record.instanceId || record.id).slice(0, 8).toLowerCase() + '-' +
      (titleSlug === 'untitled' ? 'untitled-' + (lang.langCode || lang.code) : titleSlug),
    title,
    description: cleanSummary(meta.summary || record.summary) ||
      ('A ' + lang.name + ' picture book from Bloom Library.'),
    language: lang.name,
    langCode: lang.langCode || lang.code,
    isRtl: !!meta.isRtl || RTL_CODES.has(lang.code),
    level: computedLevel(record),
    orientation: 'portrait',
    sourceId: 'bloom',
    contentType: 'story',
    subjects: topicSubjects(record),
    authors: author ? [author] : [holder || 'Bloom Library community'],
    illustrators: [],
    originalAuthors: [],
    publisher: String(meta.publisher || '').trim() || holder || 'Bloom Library',
    license: lic.label,
    licenseUrl: lic.url,
    source: {
      id: 'bloom',
      name: 'Bloom Library',
      url: 'https://bloomlibrary.org/book/' + record.id,
    },
    cover: parsed.cover || (pages[0] && pages[0].img) || null,
    audio: null,
    pages,
    stats: {
      pages: pages.length,
      words: pages.reduce((sum, p) => sum + words(p.text), 0),
    },
  };
}

function makeCard(record, meta, lang, cover) {
  const title = titleFor(record, meta, lang.code);
  const lic = CARD_LICENSES[String(meta.license || '').toLowerCase()];
  const holder = copyrightHolder(meta);
  const author = String(meta.author || '').trim();
  const summary = cleanSummary(meta.summary || record.summary);
  const pages = [
    {
      n: 1,
      img: null,
      text: 'Bloom Library catalog card for "' + title + '" (' + lang.name + ').' +
        (summary ? ' ' + summary : ''),
    },
    {
      n: 2,
      img: null,
      text: 'This reader entry is a source card, not a mirrored book — its license (' + lic.label +
        ') allows reading at the source but not redistribution here. Use Open original to read it free at Bloom Library.',
    },
    {
      n: 3,
      img: null,
      text: 'Teacher note: preview the full book at Bloom Library before assigning it to students.',
    },
  ];
  return {
    schema: 'allo-reading-book@1',
    slug: 'bloom-card-' + String(record.instanceId || record.id).slice(0, 8).toLowerCase() + '-' + slugify(title),
    title,
    description: summary || ('A ' + lang.name + ' picture book, readable free at Bloom Library.'),
    language: lang.name,
    langCode: lang.langCode || lang.code,
    isRtl: !!(meta && meta.isRtl) || RTL_CODES.has(lang.code),
    level: computedLevel(record),
    orientation: 'portrait',
    sourceId: 'bloom',
    contentType: 'open-access-source-card',
    subjects: topicSubjects(record),
    authors: author ? [author] : [holder || 'Bloom Library community'],
    illustrators: [],
    originalAuthors: [],
    publisher: String((meta && meta.publisher) || '').trim() || holder || 'Bloom Library',
    license: lic.label,
    licenseUrl: lic.url,
    source: {
      id: 'bloom',
      name: 'Bloom Library',
      url: 'https://bloomlibrary.org/book/' + record.id,
    },
    cover: cover || null,
    audio: null,
    pages,
    stats: { pages: pages.length, words: pages.reduce((sum, p) => sum + words(p.text), 0) },
  };
}

async function census(lang) {
  const data = getJson(API + '?lang=' + lang.code + '&limit=100');
  let records = (data.results || []).filter((r) =>
    r.draft === false && r.inCirculation !== false && r.harvestState === 'Done' && r.baseUrl);
  if (!includeReligious) {
    const excluded = records.filter(isReligiousInstructional);
    if (excluded.length) {
      console.log('   (excluding ' + excluded.length + ' religious-instructional book(s) for ' + lang.name +
        ' — public-school default; --include-religious overrides)');
    }
    records = records.filter((r) => !isReligiousInstructional(r));
  }
  // Templates and shell-making kits (IPA elicitation decks etc.) are Bloom
  // authoring tools, not readable books.
  records = records.filter((r) => !/template/i.test(String(r.summary || '')));
  const rows = [];
  for (const record of records) {
    try {
      const meta = getJson(record.baseUrl + 'meta.json');
      rows.push({ record, meta, license: String(meta.license || '').toLowerCase() });
    } catch (err) {
      rows.push({ record, meta: null, license: 'META_FETCH_FAILED' });
    }
    await sleep(150);
  }
  return rows;
}

async function main() {
  if (!planOnly && !doFetch) {
    console.log('Pass --plan (license census) or --fetch (import). See header comment.');
    process.exit(1);
  }
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  const catalog = JSON.parse(fs.readFileSync(OPEN_CATALOG_PATH, 'utf8'));
  catalog.items = catalog.items || [];
  const existing = new Set(catalog.items.map((item) => item.slug));
  // Bloom hosts duplicate uploads of the same book under different record
  // ids ("Bibin" appeared twice); dedupe by language+title across existing
  // and newly imported entries.
  const seenTitles = new Set();
  for (const item of catalog.items) {
    if (!item.slug.startsWith('bloom')) continue;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(ROOT, item.file), 'utf8'));
      seenTitles.add(d.langCode + '|' + String(d.title).toLowerCase());
    } catch (_) {}
  }
  let importedTotal = 0;

  for (const lang of langs) {
    const rows = await census(lang);
    const byLicense = {};
    rows.forEach((r) => { byLicense[r.license] = (byLicense[r.license] || 0) + 1; });
    const eligible = rows.filter((r) => LICENSES[r.license]);
    const cardable = rows.filter((r) => CARD_LICENSES[r.license]);
    console.log('== ' + lang.name + ' (' + lang.code + '): ' + rows.length + ' books; licenses ' +
      JSON.stringify(byLicense) + ' → mirror ' + eligible.length + ', cardable ' + cardable.length +
      (planOnly ? '' : ', cap ' + lang.cap));
    if (planOnly) {
      eligible.slice(0, lang.cap).forEach((r) =>
        console.log('   would import: ' + titleFor(r.record, r.meta, lang.code) + ' [' + r.license + '] L' + computedLevel(r.record)));
      cardable.slice(0, Math.max(0, lang.cap - Math.min(eligible.length, lang.cap))).forEach((r) =>
        console.log('   would card:   ' + titleFor(r.record, r.meta, lang.code) + ' [' + r.license + ']'));
      continue;
    }
    let count = 0;
    for (const row of eligible) {
      if (count >= lang.cap) break;
      try {
        const html = curlText(htmUrl(row.record.baseUrl));
        const parsed = extractPages(html, row.record.baseUrl, lang.code);
        const textPages = parsed.pages.filter((p) => p.text).length;
        if (!parsed.pages.length || textPages < 2) {
          console.log('   SKIP (no ' + lang.code + ' text): ' + titleFor(row.record, row.meta, lang.code));
          continue;
        }
        if (!includeReligious && looksReligiousInText(parsed.pages)) {
          console.log('   SKIP (religious story text): ' + titleFor(row.record, row.meta, lang.code));
          continue;
        }
        const book = makeBook(row.record, row.meta, lang, parsed);
        const file = 'books/' + book.slug + '.json';
        if (existing.has(book.slug)) {
          console.log('   already imported: ' + book.title);
          count++;
          continue;
        }
        const titleKey = lang.code + '|' + book.title.toLowerCase();
        if (seenTitles.has(titleKey)) {
          console.log('   SKIP duplicate upload: ' + book.title);
          continue;
        }
        seenTitles.add(titleKey);
        if (!dryRun) {
          fs.writeFileSync(path.join(ROOT, file), JSON.stringify(book, null, 2) + '\n');
          catalog.items.push({ slug: book.slug, file });
          existing.add(book.slug);
        }
        count++;
        importedTotal++;
        console.log('   ' + (dryRun ? 'WOULD IMPORT ' : 'IMPORTED ') + book.title + ' (' + book.stats.pages + 'p, ' +
          book.stats.words + 'w, L' + book.level + ', ' + book.license + ')');
        await sleep(300);
      } catch (err) {
        console.warn('   FAIL ' + row.record.id + ': ' + String(err.message).slice(0, 120));
      }
    }
    // Fill the remaining per-language cap with link-out cards for NC-licensed
    // books (mirrored books take priority; shelves with plenty of real books
    // get no card filler).
    let cards = 0;
    for (const row of cardable) {
      if (count + cards >= lang.cap) break;
      try {
        // One HTML fetch just for the cover image — discovery works far
        // better with a real cover than a placeholder tile.
        let cover = null;
        try {
          const html = curlText(htmUrl(row.record.baseUrl));
          cover = extractPages(html, row.record.baseUrl, lang.code).cover;
        } catch (_) {}
        const card = makeCard(row.record, row.meta, lang, cover);
        const file = 'books/' + card.slug + '.json';
        if (existing.has(card.slug)) { cards++; continue; }
        const cardTitleKey = lang.code + '|' + card.title.toLowerCase();
        if (seenTitles.has(cardTitleKey)) { continue; }
        seenTitles.add(cardTitleKey);
        if (!dryRun) {
          fs.writeFileSync(path.join(ROOT, file), JSON.stringify(card, null, 2) + '\n');
          catalog.items.push({ slug: card.slug, file });
          existing.add(card.slug);
        }
        cards++;
        importedTotal++;
        console.log('   ' + (dryRun ? 'WOULD CARD ' : 'CARDED ') + card.title + ' (' + card.license + ')');
        await sleep(300);
      } catch (err) {
        console.warn('   CARD FAIL ' + row.record.id + ': ' + String(err.message).slice(0, 120));
      }
    }
  }

  if (doFetch && !dryRun) {
    fs.writeFileSync(OPEN_CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
    console.log('\nImported ' + importedTotal + ' Bloom books. Now rebuild the index: node reading_library/mirror_books.js --fetch');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
