/**
 * AlloFlow Reading Library — Project Gutenberg import Worker (Cloudflare).
 * =========================================================================
 * A tiny, keyless, stateless proxy that turns a Project Gutenberg book id into
 * an AlloFlow reading-book JSON the browser can store and read immediately.
 *
 * Why this exists: the browser can SEARCH Gutenberg (Gutendex sends CORS
 * headers) but cannot FETCH the book text (gutenberg.org sends none), so a
 * one-click "Add now" needs a server hop. This Worker does that hop — it
 * fetches the text server-side, strips the Gutenberg boilerplate, paginates,
 * and returns book JSON with permissive CORS. It stores nothing; the client
 * keeps imported books per-device (IndexedDB). It ports the cleaning logic
 * from reading_library/import_gutenberg_full_texts.js so a Worker import and a
 * maintainer import produce the same shape.
 *
 * Deploy:
 *   1. `npm i -g wrangler` (or use the Cloudflare dashboard).
 *   2. Save this as the Worker's entry module; `wrangler deploy`.
 *   3. Point the reader at it: set GUTENBERG_IMPORT_ENDPOINT in
 *      reading_library_module.js (or window.__alloReadingImportEndpoint) to the
 *      Worker URL, e.g. "https://alloflow-import.<you>.workers.dev".
 *   Optionally restrict ALLOW_ORIGIN below to your own domains.
 *
 * Request:  GET  <worker>/?id=<gutenbergId>
 * Response: 200  { book: {allo-reading-book@1...} }   |   4xx/5xx { error }
 */

const GUTENDEX = 'https://gutendex.com/books/';
const PG_LICENSE = 'https://www.gutenberg.org/policy/license.html';
const TARGET_WORDS_PER_PAGE = 520;
const MAX_WORDS_PER_PAGE = 760;
const ALLOW_ORIGIN = '*'; // tighten to your domain(s) in production if desired

const GUTENBERG_LANG_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', ru: 'Russian', la: 'Latin', el: 'Greek',
  fi: 'Finnish', sv: 'Swedish', da: 'Danish', no: 'Norwegian', pl: 'Polish',
  hu: 'Hungarian', cs: 'Czech', ca: 'Catalan', eo: 'Esperanto', zh: 'Chinese',
  ja: 'Japanese', ar: 'Arabic', he: 'Hebrew', hi: 'Hindi', tl: 'Tagalog',
  cy: 'Welsh', ga: 'Irish', is: 'Icelandic', ro: 'Romanian', bg: 'Bulgarian',
};
const RTL_LANG_CODES = new Set(['ar', 'he', 'fa', 'ur', 'yi']);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
  };
}
function json(body, status) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: corsHeaders() });
}

function compact(s) {
  return String(s || '')
    .replace(/\s*:\s*\$[a-z]\s*/gi, ': ')
    .replace(/\s+\$[a-z]\s*/gi, ' ')
    .replace(/\s+([:;,.])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
function slugify(s) {
  return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 64) || 'untitled';
}
function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }

function choosePlainTextSource(formats, id) {
  const entries = Object.entries(formats || {}).filter(([mime, url]) =>
    /^text\/plain/i.test(mime) && /\.txt($|\?)/i.test(String(url || '')) &&
    !/\.zip($|\?)/i.test(String(url || '')) && !/readme\.txt($|\?)/i.test(String(url || '')));
  const preferred = entries.find(([mime]) => /utf-8/i.test(mime)) ||
    entries.find(([, url]) => /\/files\/\d+\/\d+-0\.txt/i.test(url)) ||
    entries.find(([, url]) => /pg\d+\.txt/i.test(url)) || entries[0];
  return preferred ? { mime: preferred[0], url: preferred[1] }
    : { mime: 'text/plain; charset=utf-8', url: 'https://www.gutenberg.org/cache/epub/' + id + '/pg' + id + '.txt' };
}

async function fetchPlainText(source) {
  const mime = String(source.mime || '').toLowerCase();
  const url = String(source.url || '');
  const res = await fetch(url, { headers: { 'User-Agent': 'AlloFlow reading library import worker' } });
  if (!res.ok) throw new Error('text HTTP ' + res.status);
  const buf = await res.arrayBuffer();
  const charset = /(?:iso-8859-1|latin-1|windows-1252)/i.test(mime) || /-8\.txt(?:$|\?)/i.test(url)
    ? 'windows-1252' : 'utf-8';
  return new TextDecoder(charset).decode(buf);
}

function stripGutenbergBoilerplate(raw) {
  let text = String(raw || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const start = [/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i,
    /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG E-TEXT[\s\S]*?\*\*\*/i];
  for (const p of start) { const m = p.exec(text); if (m) { text = text.slice(m.index + m[0].length); break; } }
  const end = [/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*$/i,
    /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG E-TEXT[\s\S]*$/i,
    /End of (?:the )?Project Gutenberg[\s\S]*$/i];
  for (const p of end) text = text.replace(p, '');
  return text.replace(/\t/g, ' ').replace(/[  ]+$/gm, '').replace(/\n{4,}/g, '\n\n\n').trim();
}
function looksLikeVerseOrTable(lines) {
  if (lines.length < 3) return false;
  const short = lines.filter((l) => l.length <= 58).length;
  const tabular = lines.filter((l) => /\s{3,}|\|/.test(l)).length;
  return short / lines.length > 0.72 || tabular / lines.length > 0.45;
}
function normalizeParagraphs(text) {
  return String(text || '').split(/\n\s*\n+/).map((block) => {
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return '';
    if (looksLikeVerseOrTable(lines)) return lines.join('\n');
    return lines.join(' ').replace(/\s+/g, ' ').trim();
  }).filter((p) => p && !/^(_|\*|-){3,}$/.test(p));
}
function splitLongParagraph(paragraph) {
  if (words(paragraph) <= MAX_WORDS_PER_PAGE) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g);
  if (!sentences || sentences.length < 2) {
    const tokens = paragraph.split(/\s+/); const chunks = [];
    for (let i = 0; i < tokens.length; i += TARGET_WORDS_PER_PAGE) chunks.push(tokens.slice(i, i + TARGET_WORDS_PER_PAGE).join(' '));
    return chunks;
  }
  const chunks = []; let cur = []; let curW = 0;
  for (const s of sentences.map(compact).filter(Boolean)) {
    const w = words(s);
    if (cur.length && curW + w > TARGET_WORDS_PER_PAGE) { chunks.push(cur.join(' ')); cur = []; curW = 0; }
    cur.push(s); curW += w;
  }
  if (cur.length) chunks.push(cur.join(' '));
  return chunks;
}
function splitIntoReadingPages(paragraphs) {
  const pieces = [];
  paragraphs.forEach((p) => splitLongParagraph(p).forEach((part) => pieces.push(part)));
  const pages = []; let cur = []; let curW = 0;
  for (const piece of pieces) {
    const w = words(piece);
    if (cur.length && curW + w > TARGET_WORDS_PER_PAGE) { pages.push(cur.join('\n\n')); cur = []; curW = 0; }
    cur.push(piece); curW += w;
    if (curW >= MAX_WORDS_PER_PAGE) { pages.push(cur.join('\n\n')); cur = []; curW = 0; }
  }
  if (cur.length) pages.push(cur.join('\n\n'));
  return pages;
}

function bookLanguage(metadata) {
  const code = (Array.isArray(metadata.languages) && metadata.languages[0]) || 'en';
  return { langCode: code, language: GUTENBERG_LANG_NAMES[code] || code.toUpperCase(), isRtl: RTL_LANG_CODES.has(code) };
}

async function buildBook(id) {
  const metaRes = await fetch(GUTENDEX + id, { headers: { 'User-Agent': 'AlloFlow import worker' } });
  if (!metaRes.ok) throw new Error('Gutendex HTTP ' + metaRes.status);
  const metadata = await metaRes.json();
  if (!metadata || !metadata.id) throw new Error('No such Gutenberg book.');
  if (metadata.copyright !== false) throw new Error('That book is not in the public domain.');
  const textSource = choosePlainTextSource(metadata.formats, id);
  const body = stripGutenbergBoilerplate(await fetchPlainText(textSource));
  const paragraphs = normalizeParagraphs(body);
  if (words(paragraphs.join(' ')) < 300) throw new Error('No readable in-app text for that book (audio/scan only).');
  const langInfo = bookLanguage(metadata);
  const title = compact(metadata.title);
  const authors = (metadata.authors || []).map((a) => compact(a && a.name)).filter(Boolean);
  const note = [
    'Source note: this public-domain text is available inside AlloFlow for classroom reading.',
    'Use Open original for Project Gutenberg formats and the full Project Gutenberg license.',
    'Teacher note: historical texts can preserve dated language, assumptions, and viewpoints. Preview before assigning.',
  ].join(' ');
  const pages = [note].concat(splitIntoReadingPages(paragraphs)).map((text, idx) => ({ n: idx + 1, img: null, text }));
  return {
    schema: 'allo-reading-book@1',
    slug: 'gutenberg-ebook-' + metadata.id + '-' + slugify(title),
    title,
    description: 'A full in-app Project Gutenberg public-domain text, imported on request.',
    language: langInfo.language,
    langCode: langInfo.langCode,
    isRtl: langInfo.isRtl,
    level: '6',
    orientation: 'portrait',
    sourceId: 'gutenberg',
    contentType: 'public-domain-full-text',
    subjects: (metadata.subjects || []).map(compact).filter(Boolean).slice(0, 8),
    authors: authors.length ? authors : ['Project Gutenberg'],
    illustrators: [],
    originalAuthors: [],
    publisher: 'Project Gutenberg',
    license: 'Public Domain in the U.S. / Project Gutenberg License',
    licenseUrl: PG_LICENSE,
    source: { id: 'gutenberg', name: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/' + metadata.id, textUrl: textSource.url },
    cover: null,
    audio: null,
    pages,
    stats: { pages: pages.length, words: pages.reduce((sum, p) => sum + words(p.text), 0) },
  };
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
    if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
    try {
      const url = new URL(request.url);
      const id = Number(url.searchParams.get('id'));
      if (!Number.isInteger(id) || id <= 0) return json({ error: 'Pass a Project Gutenberg id, e.g. ?id=1342.' }, 400);
      const book = await buildBook(id);
      return json({ book });
    } catch (err) {
      return json({ error: String((err && err.message) || err).slice(0, 200) }, 502);
    }
  },
};
