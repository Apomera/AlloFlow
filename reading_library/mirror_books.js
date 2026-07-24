#!/usr/bin/env node
/**
 * StoryWeaver mirror for the AlloFlow Reading Library.
 *
 * Build-time script — never runs in the browser. Produces:
 *   reading_library/curation.json   (--plan)   candidate picks per language/level
 *   reading_library/books/<slug>.json (--fetch) normalized book files
 *   reading_library/index.json      (--fetch)  browse manifest
 *
 * All StoryWeaver content is CC BY 4.0 (https://storyweaver.org.in/terms_and_conditions).
 * We mirror TEXT + metadata + narration cue timings into the repo; images and
 * narration mp3s stay hotlinked to StoryWeaver's public GCS bucket (they render
 * cross-origin in <img>/<audio> without CORS). Every asset URL is recorded here
 * so a later School Box vendoring pass can download the full set for offline use.
 *
 * Usage:
 *   node reading_library/mirror_books.js --probe "<Language>"  # coverage check
 *   node reading_library/mirror_books.js --plan     # query API, write curation.json
 *   node reading_library/mirror_books.js --fetch    # fetch books in curation.json
 *   node reading_library/mirror_books.js --fetch --only <slug>
 *
 * Adding a language on request (any of StoryWeaver's ~300):
 *   1. --probe "<Language>" to confirm coverage + the exact facet name
 *      (Swahili = 'Kiswahili', Chinese = 'Chinese (Simplified)',
 *      Indonesian = 'Bahasa Indonesia').
 *   2. Add a line to reading_library/languages.json.
 *   3. --plan then --fetch (incremental; only new books hit the network).
 *   4. Mirror reading_library/ into desktop/web-app/public/reading_library/
 *      (tests/reading_library.test.js asserts the sync), commit, deploy.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const CURATION_PATH = path.join(ROOT, 'curation.json');
const INDEX_PATH = path.join(ROOT, 'index.json');
const CARD_INDEX_PATH = path.join(ROOT, 'index_cards.json');
// Content type split out of the core index and loaded lazily by the module.
const LAZY_CARD_TYPE = 'public-domain-catalog-card';
const OPEN_CATALOG_PATH = path.join(ROOT, 'open_catalog.json');
const CLI_ARGS = process.argv.slice(2);

const API = 'https://storyweaver.org.in/api/v1';
// StoryWeaver fronts with Cloudflare; a browser UA is required or every call 403s.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// (language, level) -> how many books to take, now data-driven so a language
// request is a one-line edit: reading_library/languages.json. Names must match
// StoryWeaver's facet exactly (see --probe). Somali/Ukrainian have zero SW
// coverage (verified 2026-07-06; Swahili DOES exist — as 'Kiswahili') —
// African Storybook is the future source for the African-language gaps.
const LANGUAGES_PATH = path.join(ROOT, 'languages.json');
const PLAN = JSON.parse(fs.readFileSync(LANGUAGES_PATH, 'utf8')).plan;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function valueAfterArg(flag) {
  const idx = CLI_ARGS.indexOf(flag);
  return idx === -1 ? null : CLI_ARGS[idx + 1];
}

// Slugs to never curate/fetch: the search API surfaces them but their read
// endpoint is broken server-side (permanent 500), so --plan would otherwise
// keep re-adding them and --fetch keep failing. Add to this set, don't fight it.
const SKIP_SLUGS = new Set([
  '679680-zamin-ma-tab-kard-taghirat-e-aqlimi', // Dari: read endpoint 500s
]);

// Cloudflare fingerprints node/undici TLS and 403s it even with browser headers,
// but plain curl passes — so all HTTP goes through curl.
const { execFileSync } = require('child_process');

function curlText(url) {
  return execFileSync(
    'curl',
    ['-s', '--fail', '--max-time', '30', '-H', 'User-Agent: ' + UA, '-H', 'Accept: application/json', url],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );
}

async function getJson(url, attempt) {
  attempt = attempt || 1;
  try {
    return JSON.parse(curlText(url));
  } catch (err) {
    if (attempt >= 3) throw new Error(String(err.message || err).slice(0, 120));
    await sleep(1500 * attempt);
    return getJson(url, attempt + 1);
  }
}

async function getText(url) {
  return curlText(url);
}

// --------------------------------------------------------------- probe mode

// Coverage check for a language request: total + per-level hit counts.
// A zero for a language you expected usually means the facet name differs
// (e.g. 'Kiswahili', 'Chinese (Simplified)', 'Bahasa Indonesia').
async function probe(language) {
  const hits = async (extra) => {
    const d = await getJson(
      API + '/books-search?page=1&per_page=1&languages%5B%5D=' + encodeURIComponent(language) + (extra || '')
    );
    return (d && d.metadata && d.metadata.hits) || 0;
  };
  const total = await hits('');
  console.log(language + ': ' + total + ' books' + (total ? '' : '  <-- check the exact StoryWeaver facet name'));
  if (!total) return;
  for (const level of [1, 2, 3, 4]) {
    await sleep(400);
    console.log('  L' + level + ': ' + (await hits('&levels%5B%5D=' + level)));
  }
}

// ---------------------------------------------------------------- plan mode

function scoreBook(b) {
  let s = 0;
  if (b.editorsPick) s += 4;
  if (b.recommended) s += 2;
  if (b.isAudio) s += 2;
  if (b.publisher && b.publisher.name) s += 1;
  if (b.description && b.description.length > 40) s += 1;
  if (b.created_by_children) s -= 6;
  return s;
}

// Rank the search hits by quality, take the best ones not already curated up
// to the per-level target, and push them onto `picks`. `already` is counted
// from `picks` (existing + this-run additions) so re-runs are idempotent and
// the audio pass sees narrated books the regular pass just added. audioOnly
// counts/keeps only narrated titles so the target is "narrated at this level".
function rankAndPush(langPlan, level, data, want, have, picks, audioOnly) {
  const already = picks.filter((p) =>
    p.language === langPlan.language && p.level === String(level) && (!audioOnly || p.isAudio)
  ).length;
  const ranked = (data.data || [])
    .filter((b) => b.slug && b.title && !have.has(b.slug) && !SKIP_SLUGS.has(b.slug) && (!audioOnly || b.isAudio))
    .sort((a, b) => scoreBook(b) - scoreBook(a))
    .slice(0, Math.max(0, Number(want) - already));
  for (const b of ranked) {
    have.add(b.slug);
    picks.push({
      slug: b.slug,
      title: b.title,
      language: langPlan.language,
      langCode: langPlan.code,
      level: String(b.level || level),
      description: b.description || '',
      authors: (b.authors || []).map((a) => a.name).filter(Boolean),
      illustrators: (b.illustrators || []).map((a) => a.name).filter(Boolean),
      originalAuthors: (b.original_authors || []).map((a) => a.name).filter(Boolean),
      publisher: (b.publisher && b.publisher.name) || null,
      isAudio: !!b.isAudio,
      cover: pickCover(b.coverImage),
    });
  }
  return ranked;
}

async function plan() {
  // Merge-not-replace: books already in curation.json stay in the library
  // forever (students may have them assigned in saved lessons); planning only
  // ADDS new picks. Prune deliberately by hand-editing curation.json.
  const existing = fs.existsSync(CURATION_PATH)
    ? JSON.parse(fs.readFileSync(CURATION_PATH, 'utf8')).picks || []
    : [];
  const have = new Set(existing.map((p) => p.slug));
  const picks = existing.slice();
  const baseUrl = (language, level, page, extra) =>
    API + '/books-search?page=' + page + '&per_page=24&sort=Relevance' +
    '&languages%5B%5D=' + encodeURIComponent(language) + '&levels%5B%5D=' + level + (extra || '');
  // Walk result pages for one (language, level) until the target is met or the
  // hits run out. Earlier this fetched only page 1 (top 24), so raising a
  // target beyond ~24-minus-already added nothing; pagination lets a single
  // --plan pull a large batch. MAX_PAGES caps a runaway (24*40 = 960 scanned).
  const MAX_PAGES = 40;
  const onlyLanguage = valueAfterArg('--plan-language') || valueAfterArg('--language');
  async function collectLevel(langPlan, level, want, audioOnly) {
    const extra = audioOnly ? '&story_type%5B%5D=audio' : '';
    for (let page = 1; page <= MAX_PAGES; page++) {
      const already = picks.filter((p) =>
        p.language === langPlan.language && p.level === String(level) && (!audioOnly || p.isAudio)
      ).length;
      if (already >= Number(want)) break;
      let data;
      try {
        data = await getJson(baseUrl(langPlan.language, level, page, extra));
      } catch (err) {
        console.warn('SKIP', audioOnly ? 'audio' : 'search', langPlan.language, 'L' + level, 'p' + page, err.message);
        break;
      }
      const ranked = rankAndPush(langPlan, level, data, want, have, picks, audioOnly);
      if (ranked.length) console.log((audioOnly ? '🔊 ' : '') + langPlan.language, 'L' + level, 'p' + page + ':', ranked.map((b) => b.title).join(' | '));
      const total = (data.metadata && data.metadata.hits) || 0;
      const got = (data.data && data.data.length) || 0;
      if (!got || page * 24 >= total) break; // no more result pages
      await sleep(600);
    }
  }
  for (const langPlan of PLAN) {
    if (onlyLanguage && langPlan.language !== onlyLanguage) continue;
    for (const [level, want] of Object.entries(langPlan.perLevel)) {
      await collectLevel(langPlan, level, want, false);
    }
    // Narration-first top-up. Languages with a deep StoryWeaver audio pool
    // (English/Hindi/Urdu/Arabic — most others have zero) get extra NARRATED
    // books: the word-by-word karaoke is the library's highest-value feature.
    // story_type=audio filters to titles that ship narration + VTT cues;
    // audioPerLevel is the TARGET narrated count per level.
    if (langPlan.audioPerLevel && !CLI_ARGS.includes('--skip-audio-topup')) {
      for (const [level, want] of Object.entries(langPlan.audioPerLevel)) {
        await collectLevel(langPlan, level, want, true);
      }
    }
  }
  fs.writeFileSync(CURATION_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), picks }, null, 2));
  console.log('\nWrote', picks.length, 'picks to', CURATION_PATH);
}

function pickCover(coverImage) {
  if (!coverImage || !Array.isArray(coverImage.sizes)) return null;
  const sizes = coverImage.sizes;
  // sizes run smallest->largest; index 2 (~300px) is right for cards.
  const card = sizes[Math.min(2, sizes.length - 1)];
  const large = sizes[Math.min(5, sizes.length - 1)];
  return { card: card && card.url, large: large && large.url };
}

// --------------------------------------------------------------- fetch mode

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[­​‌‍]/g, '');
}

function stripTags(html) {
  const text = decodeEntities(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  // A small number of upstream StoryWeaver pages contain a damaged fallback
  // transliteration line even though the primary-script line is intact. Never
  // ship Unicode replacement characters into the reader: drop only the
  // damaged line and preserve the valid story text around it.
  return text.split('\n').filter((line) => !line.includes('\uFFFD')).join('\n').trim();
}

// Pull the text content out of a StoryPage html blob. Two formats exist:
// classic pages have ONE "content" div with the text; "newStories" pages have
// an EMPTY content div plus one or more absolutely-positioned "content" text
// boxes later in the blob (class attr may span newlines). Content divs hold
// only <p>/<span>/<br>/<b>/<i> — no nested divs — so lazy-matching to the
// next </div> is safe. Falls back to whole-blob stripping if the shape changes.
function extractPage(html) {
  const img = /data-size6-src="([^"]+)"/.exec(html) || /data-size4-src="([^"]+)"/.exec(html);
  const contentRe = /<div class=['"][^'"]*\bcontent\b[^'"]*['"][^>]*>([\s\S]*?)<\/div>/g;
  const chunks = [];
  let cm;
  while ((cm = contentRe.exec(html))) {
    if (stripTags(cm[1])) chunks.push(cm[1]);
  }
  const contentHtml = chunks.length ? chunks.join('\n') : html.replace(/<img[\s\S]*?>/gi, '');
  const words = [];
  const cueRe = /<span data-cue="(\d+)">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = cueRe.exec(contentHtml))) {
    const w = stripTags(m[2]).replace(/\s+/g, ' ').trim();
    if (w) words.push([Number(m[1]), w]);
  }
  return {
    img: img ? img[1] : null,
    text: stripTags(contentHtml),
    words: words.length ? words : null,
  };
}

function parseVtt(vtt) {
  const cues = [];
  const blockRe = /(\d+)\s*\n(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/g;
  let m;
  while ((m = blockRe.exec(vtt))) {
    const start = +m[2] * 3600 + +m[3] * 60 + +m[4] + +m[5] / 1000;
    const end = +m[6] * 3600 + +m[7] * 60 + +m[8] + +m[9] / 1000;
    cues.push([Number(m[1]), Math.round(start * 1000) / 1000, Math.round(end * 1000) / 1000]);
  }
  // Real narration VTTs are occasionally a few ms out of order; the reader's
  // findActiveCue early-breaks on a start-sorted list, so sort here.
  cues.sort((a, b) => a[1] - b[1]);
  // Some otherwise valid StoryWeaver VTTs also contain an end timestamp that
  // precedes its start. Clamp those windows so karaoke highlighting and page
  // following never receive a negative-duration cue.
  cues.forEach((cue) => { cue[2] = Math.max(cue[1], cue[2]); });
  return cues;
}

async function fetchBook(pick) {
  const read = await getJson(API + '/stories/' + pick.slug + '/read');
  if (!read || !read.data) throw new Error('no read payload');
  const d = read.data;

  const pages = [];
  for (const p of d.pages || []) {
    if (p.pageType !== 'StoryPage') continue;
    const ex = extractPage(p.html || '');
    if (!ex.text && !ex.img) continue;
    pages.push({ n: pages.length + 1, img: ex.img, text: ex.text, words: ex.words });
  }
  if (!pages.length) throw new Error('no story pages');

  let audio = null;
  if (d.isAudio && d.audioPath) {
    // Keep the mp3 even if the VTT cue file is unavailable. StoryWeaver serves
    // the audio publicly but some stories' VTT objects 403 on their bucket
    // (permission not set) — this is NOT a transient error and won't retry
    // away. cues:null is a supported state: the reader plays the human
    // narration without word-by-word highlighting (better than silent TTS).
    audio = { src: d.audioPath, cues: null };
    if (d.vttFilePath) {
      try {
        audio.cues = parseVtt(await getText(d.vttFilePath));
      } catch (err) {
        console.warn('  no VTT cues for', pick.slug, '(audio still plays, no karaoke):', err.message);
      }
    }
  }

  const wordCount = pages.reduce((n, p) => n + (p.text ? p.text.split(/\s+/).filter(Boolean).length : 0), 0);

  return {
    schema: 'allo-reading-book@1',
    slug: pick.slug,
    title: pick.title,
    description: pick.description,
    language: d.language || pick.language,
    langCode: pick.langCode,
    isRtl: !!d.isLanguageRtl,
    level: String(d.level || pick.level),
    orientation: d.orientation || 'landscape',
    authors: (d.authors || []).map((a) => a.name).filter(Boolean).length
      ? (d.authors || []).map((a) => a.name).filter(Boolean)
      : pick.authors,
    illustrators: pick.illustrators,
    originalAuthors: pick.originalAuthors,
    publisher: pick.publisher,
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceId: 'storyweaver',
    contentType: 'story',
    source: {
      id: 'storyweaver',
      name: 'StoryWeaver, Pratham Books',
      url: 'https://storyweaver.org.in/en/stories/' + pick.slug,
    },
    cover: pick.cover,
    audio,
    pages,
    stats: { pages: pages.length, words: wordCount },
  };
}

function indexEntryFromBook(book, file) {
  return {
    slug: book.slug,
    title: book.title,
    description: book.description,
    language: book.language,
    langCode: book.langCode,
    isRtl: book.isRtl,
    level: book.level,
    sourceId: book.sourceId || (book.source && book.source.id) || 'storyweaver',
    contentType: book.contentType || 'story',
    subjects: book.subjects || [],
    license: book.license,
    licenseUrl: book.licenseUrl,
    source: book.source || null,
    // StoryWeaver covers are {card,large} objects; open-catalog covers
    // (Gutendex thumbnails) are plain URL strings. Accept both.
    cover: typeof book.cover === 'string' ? book.cover : (book.cover && book.cover.card) || null,
    authors: book.authors,
    illustrators: book.illustrators,
    publisher: book.publisher,
    hasAudio: !!book.audio,
    pageCount: book.stats.pages,
    wordCount: book.stats.words,
    file,
  };
}

function storyWeaverFileName(slug) {
  const clean = String(slug || 'storyweaver-book');
  if (clean.length <= 120) return clean + '.json';
  const id = /^(\d+)/.exec(clean);
  const fallback = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  return (id ? id[1] : fallback || 'storyweaver-book') + '-storyweaver.json';
}

function readOpenCatalogEntries() {
  if (!fs.existsSync(OPEN_CATALOG_PATH)) return [];
  const catalog = JSON.parse(fs.readFileSync(OPEN_CATALOG_PATH, 'utf8'));
  return (catalog.items || []).map((item) => {
    const file = item.file || ('books/' + item.slug + '.json');
    const bookPath = path.join(ROOT, file);
    if (!fs.existsSync(bookPath)) throw new Error('open catalog file missing: ' + file);
    const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));
    return indexEntryFromBook(book, file);
  });
}

async function fetchAll(onlySlug) {
  if (!fs.existsSync(CURATION_PATH)) {
    console.error('curation.json missing — run --plan first');
    process.exit(1);
  }
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  const { picks } = JSON.parse(fs.readFileSync(CURATION_PATH, 'utf8'));
  const indexBooks = [];
  const failures = [];
  const force = process.argv.includes('--force');
  for (const pick of picks) {
    if (onlySlug && pick.slug !== onlySlug) continue;
    if (SKIP_SLUGS.has(pick.slug)) continue;
    try {
      const fileName = storyWeaverFileName(pick.slug);
      const bookPath = path.join(BOOKS_DIR, fileName);
      let book;
      // Incremental by default: already-mirrored books index from disk with no
      // network fetch. --force (or --only <slug>) re-fetches.
      if (!force && !onlySlug && fs.existsSync(bookPath)) {
        book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));
      } else {
        book = await fetchBook(pick);
        await sleep(700);
      }
      fs.writeFileSync(bookPath, JSON.stringify(book));
      indexBooks.push(indexEntryFromBook(book, 'books/' + fileName));
      console.log('OK', book.language, 'L' + book.level, book.title, '(' + book.stats.pages + 'p,', book.stats.words + 'w' + (book.audio ? ', audio' : '') + ')');
    } catch (err) {
      failures.push({ slug: pick.slug, error: err.message });
      console.warn('FAIL', pick.slug, err.message);
      await sleep(700);
    }
  }
  if (onlySlug) return; // single-book refresh: don't rewrite the index

  const seen = new Set(indexBooks.map((b) => b.slug));
  for (const entry of readOpenCatalogEntries()) {
    if (seen.has(entry.slug)) continue;
    indexBooks.push(entry);
    seen.add(entry.slug);
    console.log('OK', entry.language, 'L' + entry.level, entry.title, '(open catalog)');
  }

  const langs = {};
  for (const b of indexBooks) {
    langs[b.language] = langs[b.language] || { name: b.language, code: b.langCode, count: 0 };
    langs[b.language].count++;
  }
  // Lazy-split: the 895 Project Gutenberg catalog-CARD stubs (link-out only,
  // no in-app text, all on the History shelf) are ~0.9 MB of a 3.6 MB index
  // that every reader parses on open. Ship them in a second file that the
  // module fetches only when a card-bearing view (History / All / search)
  // actually needs them; the default Stories/Science/Study shelves and the
  // language stats stay complete without it.
  const generatedAt = new Date().toISOString();
  const coreBooks = indexBooks.filter((b) => b.contentType !== LAZY_CARD_TYPE);
  const cardBooks = indexBooks.filter((b) => b.contentType === LAZY_CARD_TYPE);
  const index = {
    schema: 'allo-reading-library-index@1',
    generatedAt,
    attribution: {
      text: 'Open reading materials from StoryWeaver and curated public/open education sources. Item-level licenses are shown on each text.',
      url: 'https://storyweaver.org.in',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    languages: Object.values(langs).sort((a, b) => b.count - a.count),
    cardsFile: path.basename(CARD_INDEX_PATH),
    cardsCount: cardBooks.length,
    books: coreBooks,
  };
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 1));
  const cardIndex = {
    schema: 'allo-reading-library-index-cards@1',
    generatedAt, // MUST match index.json so the byte-parity/freshness test holds
    books: cardBooks,
  };
  fs.writeFileSync(CARD_INDEX_PATH, JSON.stringify(cardIndex, null, 1));
  console.log('\nWrote index.json:', coreBooks.length, 'core books,', Object.keys(langs).length, 'languages.');
  console.log('Wrote ' + path.basename(CARD_INDEX_PATH) + ':', cardBooks.length, 'lazy catalog cards.');
  if (failures.length) console.log('Failures:', JSON.stringify(failures, null, 2));
}

const args = CLI_ARGS;
if (args.includes('--probe')) probe(args[args.indexOf('--probe') + 1] || '');
else if (args.includes('--plan')) plan();
else if (args.includes('--fetch')) fetchAll(args[args.indexOf('--only') + 1] && args.includes('--only') ? args[args.indexOf('--only') + 1] : null);
else console.log('Usage: node reading_library/mirror_books.js --probe "<Language>" | --plan | --fetch [--only <slug>]');
