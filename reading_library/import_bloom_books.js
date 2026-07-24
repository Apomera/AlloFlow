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
 * Requires jsdom from desktop/web-app/node_modules (dev dependency of the
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
  // Raised caps (2026-07-13): Portland's Cambodian community + the deepest
  // talking-book pools — narrated books get priority within every cap.
  { code: 'km', name: 'Khmer', cap: 48 },
  { code: 'my', name: 'Burmese', cap: 40 },
  { code: 'ne', name: 'Nepali', cap: 44 },
  { code: 'lo', name: 'Lao', cap: 30 },
  { code: 'vi', name: 'Vietnamese', cap: 24 },
  { code: 'mww', name: 'Hmong', cap: 20 },
  { code: 'sw', name: 'Kiswahili', cap: 32 },
  { code: 'ur', name: 'Urdu', cap: 12 },
  { code: 'tl', name: 'Filipino', cap: 12, langCode: 'fil' },
  { code: 'ar', name: 'Arabic', cap: 5 },
  { code: 'fa', name: 'Farsi', cap: 2 },
  { code: 'kmr', name: 'Kurdish', cap: 20 },
  // ---- 2026-07-16 wave 3: the big world-language pools skipped in wave 2
  // (census then: French 1502, Spanish 1856, Portuguese 855, Thai 361).
  // Display names match StoryWeaver's so the browse shelves merge; these give
  // dual-language families a deep home-language picture-book shelf.
  { code: 'fr', name: 'French', cap: 30 },
  { code: 'es', name: 'Spanish', cap: 30 },
  { code: 'pt', name: 'Portuguese', cap: 25 },
  { code: 'th', name: 'Thai', cap: 25 },
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
  // Wave-3 languages (fr/es/pt/th) add their scripts' unambiguous tokens:
  // French/Spanish/Portuguese Jesus/Bible/gospel spellings, Thai พระเยซู
  // (Jesus) / พระคัมภีร์ (Bible) / เธสะโลนิกา (Thessalonians — a Thai
  // "1 Thessalonians book study" surfaced in the wave-3 census), and Bible
  // book-study names that show up as numbered series.
  // Thai อธิษฐาน (to pray, religiously) and the monotheism phrase พระเจ้าองค์เดียว
  // ("one God") caught two Thai devotional cards in wave 3 that carry none of
  // the Jesus/Bible tokens. พระเจ้า is NOT matched alone — it also means
  // king/lord in secular Thai (พระเจ้าแผ่นดิน = the sovereign). The Romance
  // "faith in God" / "God-fearing" PHRASES catch French/Spanish/Portuguese
  // devotional fiction ("garde sa foi en Dieu") — bare dieu/dios/deus is left
  // out (mon Dieu!, adiós, folk tales all use it non-devotionally).
  return /jesus|jésus|jesús|\byesu\b|bible|biblia|bíblia|scripture|gospel|évangile|evangelio|evangelho|golyat|goliath|psalm|passover|exodus|panginoon|ພຣະເຈົ້າ|ісус|біблі|христ|พระเยซู|พระคัมภีร์|เธสะโลนิกา|อธิษฐาน|พระเจ้าองค์เดียว|thessalon|corinthian|deuteronom|the creation in|foi en dieu|craign\w* dieu|fe en dios|temeroso de dios|fé em deus|temente a deus/i.test(text);
}

// Last line of defense: metadata can be silent while the story text itself
// is scripture (the Lao Creation book's summary is just "The Creation in
// Lao"). Checks the first pages of PARSED text for the unambiguous tokens.
function looksReligiousInText(pages) {
  const head = pages.slice(0, 3).map((p) => p.text || '').join(' ');
  return /\byesu\b|jesus|jésus|jesús|panginoon|ພຣະເຈົ້າ|እግዚአብሔር|біблі|ісус|พระเยซู|พระคัมภีร์/i.test(head);
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
  const jsdomPath = path.join(ROOT, '..', 'desktop/web-app', 'node_modules', 'jsdom');
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
    const clips = [];
    for (const ed of page.querySelectorAll('.bloom-editable')) {
      if ((ed.getAttribute('lang') || '') !== code) continue;
      if (ed.closest('.bloom-imageDescription')) continue; // alt text, not story text
      const ps = ed.querySelectorAll('p');
      const chunks = ps.length ? Array.from(ps, (p) => p.textContent) : [ed.textContent];
      for (const chunk of chunks) {
        const t = String(chunk || '').replace(/\s+/g, ' ').trim();
        if (t) paras.push(t);
      }
      // Talking-book narration: recorded clips live at audio/<element-id>.mp3.
      // TextBox mode puts audio-sentence + data-duration on the editable
      // itself; Sentence mode on spans inside it. DOM order = reading order.
      const audioEls = ed.classList.contains('audio-sentence') && ed.getAttribute('data-duration')
        ? [ed]
        : Array.from(ed.querySelectorAll('span.audio-sentence[id]'));
      for (const el of audioEls) {
        const id = el.getAttribute('id');
        const dur = Number(el.getAttribute('data-duration')) || 0;
        if (id) clips.push({ src: baseUrl + 'audio%2f' + id + '.mp3', dur });
      }
    }
    const text = paras.join('\n');
    const image = imgSrc && !/placeHolder/i.test(imgSrc) ? abs(imgSrc) : null;
    if (!text && !image) continue; // video/widget/blank pages
    out.push({ img: image, text, clips });
  }
  return {
    pages: out.map((p, i) => {
      const entry = { n: i + 1, img: p.img, text: p.text };
      if (p.clips.length) entry.audio = p.clips;
      return entry;
    }),
    cover,
  };
}

// One HEAD request against the first clip decides whether the book's audio
// actually exists on S3 (the StoryWeaver lesson: metadata can promise media
// that 403s). All-or-nothing per book.
function verifyFirstClip(pages) {
  const withAudio = pages.find((p) => p.audio && p.audio.length);
  if (!withAudio) return false;
  try {
    execFileSync('curl', ['-sSI', '--fail', '--max-time', '20', withAudio.audio[0].src], { stdio: 'pipe' });
    return true;
  } catch (err) {
    return false;
  }
}

function stripPageAudio(pages) {
  for (const p of pages) delete p.audio;
}

function makeBook(record, meta, lang, parsed) {
  const title = titleFor(record, meta, lang.code);
  const lic = LICENSES[String(meta.license || '').toLowerCase()];
  const holder = copyrightHolder(meta);
  const author = String(meta.author || '').trim();
  const pages = parsed.pages;
  // Talking books: keep the per-page clips only when the audio is verified
  // to exist; book.audio.mode='perPage' is what the reader's clip queue keys
  // on (hasAudio in the index follows from the truthy audio object).
  let audio = null;
  if (pages.some((p) => p.audio && p.audio.length)) {
    if (verifyFirstClip(pages)) audio = { mode: 'perPage' };
    else stripPageAudio(pages);
  }
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
    audio,
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
    // Narrated books (Bloom's talkingBook feature) win cap slots first —
    // real recorded voices in languages that usually have no TTS are worth
    // more than any un-narrated book. Stable sort keeps API order within
    // each group.
    const hasTalking = (r) => (r.record.features || []).some((f) => /talkingBook/i.test(f));
    const eligible = rows.filter((r) => LICENSES[r.license])
      .sort((a, b) => (hasTalking(b) ? 1 : 0) - (hasTalking(a) ? 1 : 0));
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
        // Books imported before the language-suffix slug fix live on disk as
        // '…-untitled' (no suffix); recognize them so upgrades reach them
        // instead of bouncing off the duplicate-title guard.
        const legacySlug = book.slug.replace(/-untitled-[a-z]{2,4}$/, '-untitled');
        if (legacySlug !== book.slug && existing.has(legacySlug) && !existing.has(book.slug)) {
          book.slug = legacySlug;
        }
        const file = 'books/' + book.slug + '.json';
        if (existing.has(book.slug)) {
          // Upgrade-in-place: a book imported before talking-book support
          // gets its narration on re-run (fresh makeBook output replaces the
          // file — same slug, deterministic content).
          const diskPath = path.join(ROOT, file);
          let disk = null;
          try { disk = JSON.parse(fs.readFileSync(diskPath, 'utf8')); } catch (_) {}
          if (disk && !disk.audio && book.audio) {
            if (!dryRun) fs.writeFileSync(diskPath, JSON.stringify(book, null, 2) + '\n');
            console.log('   AUDIO ADDED: ' + book.title + ' (' + book.pages.filter((p) => p.audio).length + ' narrated pages)');
          } else {
            console.log('   already imported: ' + book.title);
          }
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
