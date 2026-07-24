#!/usr/bin/env node
/**
 * add_gutenberg_page_images.js — put the original illustrations back into the
 * mirrored Gutenberg full texts.
 *
 * The full-text importer reads the PLAIN-TEXT edition, so every page ships
 * with img:null even when Gutenberg hosts an illustrated HTML edition of the
 * same book (pg<id>-images.html) — Peter Rabbit renders without a single
 * Potter drawing. This script fetches that HTML edition, walks its images in
 * document order, and aligns each one to the already-paginated text by
 * matching the words that FOLLOW the illustration in the HTML against the
 * book's pages (captions were stripped from the plain text, so the anchor is
 * taken after the whole figure block, not inside it). Matched images are
 * hotlinked (https://www.gutenberg.org/cache/epub/<id>/images/…, the same
 * host the catalog already hotlinks 1,068 covers from); nothing is vendored.
 *
 * Figure captions become page.imgCaption so the reader can show them and use
 * them as real alt text. Page text is NEVER touched (stats.words counts text
 * only, so book stats stay valid).
 *
 * Idempotent: books that already carry any page.img are skipped unless
 * --force. Run AFTER importers; the index carries no per-page fields, so no
 * index rebuild is needed — but the public mirror byte-parity test means the
 * changed book files must be copied to desktop/web-app/public/reading_library.
 *
 * --repaginate additionally re-splits an illustrated book's pages so the page
 * count follows the ART DENSITY of the original edition (the illustrator
 * paced those books — Peter Rabbit is 28 plates over 983 words, not 3
 * screens of 500 words). When the illustrated edition carries at least
 * REPAGINATE_MIN_IMAGES images and words-per-image lands below the standard
 * page, pages are rebuilt at clamp(bodyWords/imageCount, tier floor, tier
 * target) words via the importer's own splitIntoReadingPages (text is
 * reassembled from the existing pages — no network, no re-clean, word stats
 * identical). Books without art, or with sparse art, keep their pagination
 * byte-for-byte. NOTE: repagination renumbers pages, so saved reading
 * positions/bookmarks for that book drift; run it as a deliberate pass, and
 * rebuild the index afterwards (pageCount changes):
 *   node reading_library/mirror_books.js --fetch
 *
 * Usage:
 *   node reading_library/add_gutenberg_page_images.js --dry-run          # report only
 *   node reading_library/add_gutenberg_page_images.js --ids 14838,67098  # subset
 *   node reading_library/add_gutenberg_page_images.js                    # write all
 *   node reading_library/add_gutenberg_page_images.js --force            # redo books that have images
 *   node reading_library/add_gutenberg_page_images.js --force --repaginate  # art-density pages + images
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AlloFlow reading library illustration backfill';
const ANCHOR_WORDS = 12; // words of running text used to locate an image
const MIN_ANCHOR_WORDS = 5;
const CAPTION_MAX = 240;

// jsdom is a dev dependency of the deploy app, same trick import_bloom_books
// uses; the reading_library folder has no package.json of its own.
let JSDOM;
function loadJsdom() {
  const jsdomPath = path.join(ROOT, '..', 'desktop/web-app', 'node_modules', 'jsdom');
  ({ JSDOM } = require(jsdomPath));
}

const importer = require('./import_gutenberg_full_texts.js');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const force = argv.includes('--force');
const repaginate = argv.includes('--repaginate');
const REPAGINATE_MIN_IMAGES = 8; // below this, finer pages buy nothing
const idsArg = (() => {
  const i = argv.indexOf('--ids');
  if (i === -1) return null;
  return new Set(String(argv[i + 1] || '').split(',').map((s) => s.trim()).filter(Boolean));
})();

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function curl(url, extraArgs, attempt) {
  attempt = attempt || 1;
  try {
    return execFileSync('curl', [
      '-sSL', '--fail', '--max-time', '60',
      '-H', 'User-Agent: ' + UA,
    ].concat(extraArgs || [], [url]), { maxBuffer: 96 * 1024 * 1024 });
  } catch (err) {
    if (attempt < 3) return curl(url, extraArgs, attempt + 1);
    throw new Error('Could not fetch ' + url + ': ' + String(err.message || err).slice(0, 160));
  }
}

function headOk(url) {
  try {
    curl(url, ['-I', '-o', process.platform === 'win32' ? 'NUL' : '/dev/null']);
    return true;
  } catch (_) {
    return false;
  }
}

// Match words the way pages will be matched: case-, accent-insensitive-ish,
// punctuation-free. Latin extended + Cyrillic + Greek cover the catalog's
// full-text languages (en/es/fr/de/pt/…); anything else tokenizes to nothing
// and the image is simply dropped rather than misplaced.
function normTokens(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9Ѐ-ӿͰ-Ͽ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// Illustrations usually sit inside a figure-ish wrapper together with their
// caption. The text anchor must start AFTER that whole wrapper (captions are
// stripped from the plain-text pages, so caption words never match).
const FIGURE_CLASS = /(fig|caption|illus|plate|image)/i;
function figureContainer(img) {
  let container = img;
  let node = img.parentElement;
  while (node && node.tagName !== 'BODY') {
    const tag = node.tagName;
    if (tag === 'FIGURE' || ((tag === 'DIV' || tag === 'P' || tag === 'TABLE') && FIGURE_CLASS.test(node.className || ''))) {
      container = node;
    }
    node = node.parentElement;
  }
  return container;
}

function captionFor(img, container) {
  if (container === img) return '';
  const cap = container.querySelector('figcaption, [class*="caption" i]');
  let text = cap ? cap.textContent : '';
  if (!text) {
    // Some editions put the caption as the figure's only text.
    text = container.textContent || '';
  }
  text = String(text).replace(/\s+/g, ' ').trim().replace(/^Illustration:?\s*/i, '');
  if (text.length > CAPTION_MAX) text = text.slice(0, CAPTION_MAX - 1).trimEnd() + '…';
  return text;
}

// Skip front-matter dressing that would land on the source-note page anyway.
const DECORATIVE_SRC = /(cover|titlepage|colophon|frontispiece|bookplate|logo)/i;

// Walk the document once: collect the normalized token stream plus, for each
// element, its [start,end) token range, and every image with its position.
function analyzeHtml(html, baseUrl) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  // Gutenberg boilerplate sections would only produce false anchors.
  doc.querySelectorAll('#pg-header, #pg-footer, .pg-boilerplate, script, style').forEach((n) => n.remove());
  const tokens = [];
  const ranges = new Map(); // element -> [start, end)
  const images = [];
  (function walk(node) {
    if (node.nodeType === 3) { // text
      const toks = normTokens(node.nodeValue);
      for (const t of toks) tokens.push(t);
      return;
    }
    if (node.nodeType !== 1) return;
    const start = tokens.length;
    if (node.tagName === 'IMG') {
      images.push({ node, pos: start });
    }
    for (const child of node.childNodes) walk(child);
    ranges.set(node, [start, tokens.length]);
  })(doc.body);

  const out = [];
  for (const img of images) {
    const rawSrc = img.node.getAttribute('src') || '';
    if (!rawSrc) continue;
    let src;
    try { src = new URL(rawSrc, baseUrl).href; } catch (_) { continue; }
    if (!/^https:\/\/www\.gutenberg\.org\//.test(src)) continue;
    if (DECORATIVE_SRC.test(rawSrc)) continue;
    const container = figureContainer(img.node);
    const range = ranges.get(container) || [img.pos, img.pos];
    out.push({
      src,
      caption: captionFor(img.node, container),
      after: range[1],  // anchor forward from the end of the figure block
      before: range[0], // fallback anchor backward from the block start
    });
  }
  return { tokens, images: out };
}

function alignImages(book, analysis) {
  const pageStrings = book.pages.map((p) => ' ' + normTokens(p.text).join(' ') + ' ');
  const anchorAt = (start, len, dir) => {
    const toks = dir === 'after'
      ? analysis.tokens.slice(start, start + len)
      : analysis.tokens.slice(Math.max(0, start - len), start);
    return toks.length >= MIN_ANCHOR_WORDS ? ' ' + toks.join(' ') + ' ' : null;
  };
  const findPage = (anchor, from) => {
    if (!anchor) return -1;
    for (let i = from; i < pageStrings.length; i++) if (pageStrings[i].includes(anchor)) return i;
    for (let i = 0; i < from; i++) if (pageStrings[i].includes(anchor)) return i;
    return -1;
  };

  let cursor = 1; // never place art on page 1 (the source note)
  const placed = [];
  let unmatched = 0;
  let occupied = 0;
  for (const image of analysis.images) {
    let pageIdx = -1;
    for (const len of [ANCHOR_WORDS, 8, MIN_ANCHOR_WORDS]) {
      pageIdx = findPage(anchorAt(image.after, len, 'after'), cursor);
      if (pageIdx !== -1) break;
      pageIdx = findPage(anchorAt(image.before, len, 'before'), cursor);
      if (pageIdx !== -1) break;
    }
    if (pageIdx <= 0) { unmatched++; continue; }
    // One image per page (that is all the reader renders). Illustrated
    // editions often carry several per page of OUR pagination — spill to the
    // next page or two so picture-book pages fill wall-to-wall, but never
    // drift art far from the text it belongs to.
    let spill = 0;
    while (book.pages[pageIdx].img && spill < 2 && pageIdx + 1 < book.pages.length) { pageIdx++; spill++; }
    if (book.pages[pageIdx].img) { occupied++; continue; }
    placed.push({ pageIdx, src: image.src, caption: image.caption });
    book.pages[pageIdx].img = image.src;
    if (image.caption) book.pages[pageIdx].imgCaption = image.caption;
    cursor = Math.max(cursor, pageIdx);
  }
  return { placed, unmatched, occupied };
}

// Rebuild the book's pages at an art-density word target: one page per
// illustration, clamped to the length tier's floor (a 150-word page suits a
// children's novel; a 30-word page suits a true picture book). Text is
// reassembled from the existing pages (page 1, the source note, stays put);
// import joined paragraphs with \n\n, so the split is lossless and the whole
// operation is idempotent. Returns null when standard pages already fit the
// art (sparse illustrations) or the page count would not change.
function repaginateForArt(book, imageCount) {
  const bodyPages = book.pages.slice(1);
  const bodyWords = bodyPages.reduce((sum, p) => sum + importer.words(p.text), 0);
  const tier = importer.pageTargetsFor(bodyWords);
  const perImage = Math.round(bodyWords / imageCount);
  const target = Math.min(tier.target, Math.max(tier.floor, perImage));
  if (target >= tier.target) return null;
  const paragraphs = [];
  bodyPages.forEach((p) => String(p.text || '').split(/\n{2,}/).forEach((par) => {
    if (par.trim()) paragraphs.push(par);
  }));
  const targets = { target, max: Math.max(target + 20, Math.round(target * 1.5)) };
  const texts = [book.pages[0].text].concat(importer.splitIntoReadingPages(paragraphs, targets));
  if (texts.length === book.pages.length) return null;
  book.pages = texts.map((text, idx) => ({ n: idx + 1, img: null, text }));
  book.stats = { pages: book.pages.length, words: book.pages.reduce((s, p) => s + importer.words(p.text), 0) };
  return { target, pages: texts.length };
}

async function main() {
  loadJsdom();
  const targets = [];
  for (const file of fs.readdirSync(BOOKS_DIR)) {
    if (!file.endsWith('.json')) continue;
    const full = path.join(BOOKS_DIR, file);
    const book = readJson(full);
    if (book.contentType !== 'public-domain-full-text') continue;
    const match = /gutenberg\.org\/(?:ebooks|cache\/epub)\/(\d+)/.exec((book.source && book.source.url) || '');
    if (!match) continue;
    const id = match[1];
    if (idsArg && !idsArg.has(id)) continue;
    if (!force && book.pages.some((p) => p.img)) continue;
    targets.push({ id, file: full, book });
  }
  console.log('Full texts to check: ' + targets.length + (dryRun ? ' [DRY RUN]' : ''));

  let booksTouched = 0;
  let totalPlaced = 0;
  for (const target of targets) {
    const htmlUrl = 'https://www.gutenberg.org/cache/epub/' + target.id + '/pg' + target.id + '-images.html';
    let html;
    try {
      html = curl(htmlUrl).toString('utf8');
    } catch (err) {
      console.log('  #' + target.id + ' ' + target.book.title + ': no illustrated edition (' + String(err.message).slice(0, 60) + ')');
      continue;
    }
    let analysis;
    try {
      analysis = analyzeHtml(html, htmlUrl);
    } catch (err) {
      console.log('  #' + target.id + ' ' + target.book.title + ': HTML parse failed — ' + String(err.message).slice(0, 100));
      continue;
    }
    if (!analysis.images.length) {
      console.log('  #' + target.id + ' ' + target.book.title + ': 0 usable images');
      continue;
    }
    let repag = null;
    if (repaginate && analysis.images.length >= REPAGINATE_MIN_IMAGES) {
      repag = repaginateForArt(target.book, analysis.images.length);
    }
    if (force) {
      for (const page of target.book.pages) { page.img = null; delete page.imgCaption; }
    }
    const result = alignImages(target.book, analysis);
    if (!result.placed.length) {
      console.log('  #' + target.id + ' ' + target.book.title + ': ' + analysis.images.length + ' images, none aligned (' + result.unmatched + ' unmatched)');
      continue;
    }
    // All-or-nothing per book: if the first placed image does not actually
    // serve, do not ship any (the StoryWeaver-403 lesson — some hosted assets
    // 403 permanently even when the page that references them is fine).
    if (!headOk(result.placed[0].src)) {
      console.log('  #' + target.id + ' ' + target.book.title + ': image URLs do not serve — skipped');
      continue;
    }
    booksTouched++;
    totalPlaced += result.placed.length;
    const captioned = result.placed.filter((p) => p.caption).length;
    console.log('  #' + target.id + ' ' + target.book.title + ': placed ' + result.placed.length + '/' + analysis.images.length +
      ' (captions ' + captioned + ', unmatched ' + result.unmatched + ', page-occupied ' + result.occupied + ')' +
      (repag ? ' — repaginated to ' + repag.pages + ' pages @ ~' + repag.target + ' words' : ''));
    if (!dryRun) writeJson(target.file, target.book);
    await sleep(250);
  }
  console.log((dryRun ? '[DRY RUN] would touch ' : 'Wrote ') + booksTouched + ' books, ' + totalPlaced + ' page images total.');
  console.log('Remember: copy changed book files to desktop/web-app/public/reading_library/books/ (byte-parity test).');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
