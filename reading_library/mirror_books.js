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
 *   node reading_library/mirror_books.js --plan     # query API, write curation.json
 *   node reading_library/mirror_books.js --fetch    # fetch books in curation.json
 *   node reading_library/mirror_books.js --fetch --only <slug>
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const CURATION_PATH = path.join(ROOT, 'curation.json');
const INDEX_PATH = path.join(ROOT, 'index.json');

const API = 'https://storyweaver.org.in/api/v1';
// StoryWeaver fronts with Cloudflare; a browser UA is required or every call 403s.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// (language, level) -> how many books to take. Languages chosen for classroom
// fit (Portland ME newcomer languages + app UI languages with SW coverage).
// Somali/Swahili/Ukrainian have zero SW coverage (verified 2026-07-05) —
// African Storybook is the future source for those.
const PLAN = [
  { language: 'English', code: 'en', perLevel: { 1: 7, 2: 7, 3: 7, 4: 7 } },
  { language: 'Spanish', code: 'es', perLevel: { 1: 4, 2: 4, 3: 4, 4: 4 } },
  { language: 'French', code: 'fr', perLevel: { 1: 3, 2: 3, 3: 3, 4: 3 } },
  { language: 'Arabic', code: 'ar', perLevel: { 1: 3, 2: 3, 3: 2, 4: 2 } },
  { language: 'Hindi', code: 'hi', perLevel: { 1: 2, 2: 2, 3: 2, 4: 2 } },
  { language: 'Portuguese', code: 'pt', perLevel: { 1: 2, 2: 2, 3: 2, 4: 2 } },
  { language: 'Vietnamese', code: 'vi', perLevel: { 1: 2, 2: 2, 3: 2 } },
  { language: 'Russian', code: 'ru', perLevel: { 1: 2, 2: 2 } },
  { language: 'German', code: 'de', perLevel: { 1: 2, 2: 2 } },
  { language: 'Haitian Creole', code: 'ht', perLevel: { 1: 2, 2: 2, 3: 1 } },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function plan() {
  // Merge-not-replace: books already in curation.json stay in the library
  // forever (students may have them assigned in saved lessons); planning only
  // ADDS new picks. Prune deliberately by hand-editing curation.json.
  const existing = fs.existsSync(CURATION_PATH)
    ? JSON.parse(fs.readFileSync(CURATION_PATH, 'utf8')).picks || []
    : [];
  const have = new Set(existing.map((p) => p.slug));
  const picks = existing.slice();
  for (const langPlan of PLAN) {
    for (const [level, want] of Object.entries(langPlan.perLevel)) {
      const url =
        API +
        '/books-search?page=1&per_page=24&sort=Relevance' +
        '&languages%5B%5D=' + encodeURIComponent(langPlan.language) +
        '&levels%5B%5D=' + level;
      let data;
      try {
        data = await getJson(url);
      } catch (err) {
        console.warn('SKIP search', langPlan.language, 'L' + level, err.message);
        continue;
      }
      const already = existing.filter((p) => p.language === langPlan.language && p.level === String(level)).length;
      const ranked = (data.data || [])
        .filter((b) => b.slug && b.title && !have.has(b.slug))
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
      console.log(langPlan.language, 'L' + level + ':', ranked.map((b) => b.title).join(' | '));
      await sleep(600);
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
  return decodeEntities(
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
    audio = { src: d.audioPath, cues: null };
    if (d.vttFilePath) {
      try {
        audio.cues = parseVtt(await getText(d.vttFilePath));
      } catch (err) {
        console.warn('  vtt failed for', pick.slug, err.message);
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
    source: {
      name: 'StoryWeaver, Pratham Books',
      url: 'https://storyweaver.org.in/en/stories/' + pick.slug,
    },
    cover: pick.cover,
    audio,
    pages,
    stats: { pages: pages.length, words: wordCount },
  };
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
  for (const pick of picks) {
    if (onlySlug && pick.slug !== onlySlug) continue;
    try {
      const book = await fetchBook(pick);
      fs.writeFileSync(path.join(BOOKS_DIR, pick.slug + '.json'), JSON.stringify(book));
      indexBooks.push({
        slug: book.slug,
        title: book.title,
        description: book.description,
        language: book.language,
        langCode: book.langCode,
        isRtl: book.isRtl,
        level: book.level,
        cover: book.cover && book.cover.card,
        authors: book.authors,
        illustrators: book.illustrators,
        publisher: book.publisher,
        hasAudio: !!book.audio,
        pageCount: book.stats.pages,
        wordCount: book.stats.words,
        file: 'books/' + book.slug + '.json',
      });
      console.log('OK', book.language, 'L' + book.level, book.title, '(' + book.stats.pages + 'p,', book.stats.words + 'w' + (book.audio ? ', audio' : '') + ')');
    } catch (err) {
      failures.push({ slug: pick.slug, error: err.message });
      console.warn('FAIL', pick.slug, err.message);
    }
    await sleep(700);
  }
  if (onlySlug) return; // single-book refresh: don't rewrite the index

  const langs = {};
  for (const b of indexBooks) {
    langs[b.language] = langs[b.language] || { name: b.language, code: b.langCode, count: 0 };
    langs[b.language].count++;
  }
  const index = {
    schema: 'allo-reading-library-index@1',
    generatedAt: new Date().toISOString(),
    attribution: {
      text: 'Books from StoryWeaver, an open library by Pratham Books. Licensed CC BY 4.0.',
      url: 'https://storyweaver.org.in',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    languages: Object.values(langs).sort((a, b) => b.count - a.count),
    books: indexBooks,
  };
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 1));
  console.log('\nWrote index.json:', indexBooks.length, 'books,', Object.keys(langs).length, 'languages.');
  if (failures.length) console.log('Failures:', JSON.stringify(failures, null, 2));
}

const args = process.argv.slice(2);
if (args.includes('--plan')) plan();
else if (args.includes('--fetch')) fetchAll(args[args.indexOf('--only') + 1] && args.includes('--only') ? args[args.indexOf('--only') + 1] : null);
else console.log('Usage: node reading_library/mirror_books.js --plan | --fetch [--only <slug>]');
