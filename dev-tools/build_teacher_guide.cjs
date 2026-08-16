#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const MarkdownIt = require('markdown-it');

const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.join(REPO_ROOT, 'docs', 'teacher-guide');
const TOOL_CATALOG_PATH = path.join(REPO_ROOT, 'tool-catalog-data.js');
const TOOL_FINDER_PATH = path.join(REPO_ROOT, 'tool-finder.js');
const MANIFEST_PATH = path.join(SOURCE_ROOT, 'guide.json');
const OUTPUT_ROOT = path.join(REPO_ROOT, 'guide');
const CONSOLIDATED_PATH = path.join(REPO_ROOT, 'AlloFlow Complete User Manual.md');
const GENERATOR_PATH = 'dev-tools/build_teacher_guide.cjs';
const MANIFEST_RELATIVE_PATH = 'docs/teacher-guide/guide.json';
const MAX_SEARCH_RESULTS = 25;
// Built from a code point so this file stays pure ASCII on disk. A literal
// middot here has already been flattened once by a non-UTF-8 write.
const MIDDOT = String.fromCharCode(0xb7);

function normalizeEol(value) {
  return String(value).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function withFinalNewline(value) {
  return normalizeEol(value).replace(/\s*$/, '') + '\n';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function posixPath(value) {
  return value.split(path.sep).join('/');
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function slugify(value) {
  const slug = String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

function createSlugger(prefix) {
  const counts = new Map();
  return function nextSlug(value) {
    const base = slugify(value);
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    const unique = count === 1 ? base : base + '-' + count;
    return prefix ? prefix + '--' + unique : unique;
  };
}

function decodeForSafety(value) {
  let decoded = String(value);
  for (let pass = 0; pass < 2; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch (_error) {
      break;
    }
  }
  return decoded;
}

function validateBasicUrl(raw, kind) {
  if (typeof raw !== 'string') return false;
  const value = raw.trim();
  if (!value || value !== raw || /[\u0000-\u001F\u007F]/.test(value)) return false;
  const decoded = decodeForSafety(value);
  if (/[\u0000-\u001F\u007F]/.test(decoded) || decoded.includes('\\')) return false;
  if (decoded.startsWith('//')) return false;

  const compact = decoded.replace(/\s+/g, '').toLowerCase();
  const schemeMatch = compact.match(/^([a-z][a-z0-9+.-]*):/);
  if (schemeMatch) {
    if (kind === 'image') return schemeMatch[1] === 'http' || schemeMatch[1] === 'https';
    return schemeMatch[1] === 'http' || schemeMatch[1] === 'https' || schemeMatch[1] === 'mailto';
  }

  const pathPart = decoded.split('#', 1)[0].split('?', 1)[0];
  const segments = pathPart.replace(/^\/+/, '').split('/');
  if (segments.some((segment) => segment === '..')) return false;
  if (kind === 'image' && decoded.startsWith('#')) return false;
  return true;
}

function inlineText(token) {
  if (!token) return '';
  if (Array.isArray(token.children)) {
    return token.children.map((child) => {
      if (child.type === 'softbreak' || child.type === 'hardbreak') return ' ';
      if (child.type === 'image') return child.content || '';
      if (Array.isArray(child.children)) return inlineText(child);
      return child.content || '';
    }).join('');
  }
  return token.content || '';
}

function normalizeText(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function createMarkdownEngine() {
  const md = new MarkdownIt({
    html: false,
    linkify: false,
    typographer: false,
    breaks: false,
  });

  md.renderer.rules.table_open = function tableOpen(tokens, index, options, environment, renderer) {
    return '<div class="table-scroll" role="region" aria-label="Scrollable table" tabindex="0">\n'
      + renderer.renderToken(tokens, index, options);
  };
  md.renderer.rules.table_close = function tableClose(tokens, index, options, environment, renderer) {
    return renderer.renderToken(tokens, index, options) + '</div>\n';
  };
  md.renderer.rules.th_open = function tableHeaderOpen(tokens, index, options, environment, renderer) {
    tokens[index].attrSet('scope', 'col');
    return renderer.renderToken(tokens, index, options);
  };

  return md;
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Teacher guide manifest must be a JSON object.');
  }
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported teacher guide manifest schemaVersion.');
  for (const field of ['title', 'description', 'version', 'lastVerified']) {
    if (typeof manifest[field] !== 'string' || !manifest[field].trim()) {
      throw new Error('Manifest field "' + field + '" must be a non-empty string.');
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.lastVerified)
      || Number.isNaN(Date.parse(manifest.lastVerified + 'T00:00:00Z'))) {
    throw new Error('Manifest lastVerified must be a valid YYYY-MM-DD date.');
  }
  if (!Array.isArray(manifest.chapters) || manifest.chapters.length === 0) {
    throw new Error('Manifest chapters must be a non-empty array.');
  }

  const sources = new Set();
  const slugs = new Set();
  manifest.chapters.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error('Chapter ' + (index + 1) + ' must be an object.');
    for (const field of ['source', 'slug', 'summary', 'audience', 'time']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        throw new Error('Chapter ' + (index + 1) + ' field "' + field + '" must be a non-empty string.');
      }
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) {
      throw new Error('Chapter slug "' + entry.slug + '" is not URL-safe.');
    }
    if (sources.has(entry.source)) throw new Error('Duplicate chapter source: ' + entry.source);
    if (slugs.has(entry.slug)) throw new Error('Duplicate chapter slug: ' + entry.slug);
    sources.add(entry.source);
    slugs.add(entry.slug);

    const sourcePath = path.resolve(SOURCE_ROOT, entry.source);
    if (!isInside(SOURCE_ROOT, sourcePath)) throw new Error('Chapter source escapes docs/teacher-guide: ' + entry.source);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new Error('Chapter source does not exist: ' + entry.source);
    }
  });

  if (manifest.paths !== undefined) {
    if (!Array.isArray(manifest.paths)) throw new Error('Manifest paths must be an array.');
    const knownSlugs = new Set(manifest.chapters.map((chapter) => chapter.slug));
    manifest.paths.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') throw new Error('Path ' + (index + 1) + ' must be an object.');
      for (const field of ['title', 'description']) {
        if (typeof entry[field] !== 'string' || !entry[field].trim()) {
          throw new Error('Path ' + (index + 1) + ' field "' + field + '" must be a non-empty string.');
        }
      }
      if (!Array.isArray(entry.chapterSlugs) || entry.chapterSlugs.length === 0) {
        throw new Error('Path ' + (index + 1) + ' chapterSlugs must be a non-empty array.');
      }
      const seen = new Set();
      entry.chapterSlugs.forEach((slug) => {
        if (typeof slug !== 'string' || !knownSlugs.has(slug)) {
          throw new Error('Path "' + entry.title + '" references unknown chapter slug: ' + slug);
        }
        if (seen.has(slug)) throw new Error('Path "' + entry.title + '" repeats chapter slug: ' + slug);
        seen.add(slug);
      });
    });
  }
}

function inspectChapter(md, entry, markdown) {
  const tokens = md.parse(markdown, {});
  const nextSlug = createSlugger('');
  const headings = [];
  let previousLevel = 0;
  let h1Count = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== 'heading_open') continue;
    const level = Number(token.tag.slice(1));
    const inline = tokens[index + 1];
    if (!inline || inline.type !== 'inline') throw new Error(entry.source + ': malformed heading token.');
    const title = normalizeText(inlineText(inline));
    if (!title) throw new Error(entry.source + ': headings must contain meaningful text.');
    if (previousLevel === 0 && level !== 1) throw new Error(entry.source + ': the first heading must be H1.');
    if (previousLevel > 0 && level > previousLevel + 1) {
      throw new Error(entry.source + ': heading level skips from H' + previousLevel + ' to H' + level + ' near "' + title + '".');
    }
    previousLevel = level;
    if (level === 1) h1Count += 1;
    headings.push({ level, title, id: nextSlug(title), tokenIndex: index });
  }

  if (h1Count !== 1) throw new Error(entry.source + ': expected exactly one H1, found ' + h1Count + '.');
  if (headings.some((heading) => heading.level > 5)) {
    throw new Error(entry.source + ': H6 is not supported because the offline guide adds one heading level.');
  }

  const sections = [];
  let activeSection = null;
  let headingCursor = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === 'heading_open') {
      const heading = headings[headingCursor];
      headingCursor += 1;
      activeSection = {
        level: heading.level,
        title: heading.title,
        id: heading.id,
        pieces: heading.level === 1 ? [entry.summary] : [],
      };
      sections.push(activeSection);
      index += 2;
      continue;
    }
    if (!activeSection) continue;
    if (token.type === 'inline' || token.type === 'fence' || token.type === 'code_block') {
      const text = normalizeText(inlineText(token));
      if (text) activeSection.pieces.push(text);
    }
  }

  return {
    sourcePath: path.resolve(SOURCE_ROOT, entry.source),
    sourceRelative: entry.source,
    slug: entry.slug,
    summary: entry.summary,
    audience: entry.audience,
    time: entry.time,
    markdown,
    title: headings[0].title,
    headings,
    headingIds: new Set(headings.map((heading) => heading.id)),
    sections: sections.map((section) => ({
      level: section.level,
      title: section.title,
      id: section.id,
      text: normalizeText(section.pieces.join(' ')),
    })),
  };
}

function splitUrl(value) {
  const hashIndex = value.indexOf('#');
  const beforeHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const fragment = hashIndex >= 0 ? value.slice(hashIndex + 1) : '';
  const queryIndex = beforeHash.indexOf('?');
  return {
    pathname: queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash,
    query: queryIndex >= 0 ? beforeHash.slice(queryIndex) : '',
    fragment,
    hasFragment: hashIndex >= 0,
  };
}

function decodeFragment(value, sourceLabel) {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    throw new Error(sourceLabel + ': link contains an invalid encoded fragment: #' + value);
  }
}

function checkFragment(chapter, fragment, sourceLabel) {
  const decoded = decodeFragment(fragment, sourceLabel);
  if (!decoded || !chapter.headingIds.has(decoded)) {
    throw new Error(sourceLabel + ': link points to missing heading #' + decoded + ' in ' + chapter.sourceRelative + '.');
  }
  return decoded;
}

function relativePublishedPath(targetPath) {
  return '../' + posixPath(path.relative(REPO_ROOT, targetPath));
}

function resolveLocalTarget(rawPath, currentChapter, sourceLabel) {
  const decoded = decodeForSafety(rawPath);
  if (decoded.startsWith('/')) return { rootRelative: decoded, absolutePath: null };
  const absolutePath = path.resolve(path.dirname(currentChapter.sourcePath), decoded || '.');
  if (!isInside(REPO_ROOT, absolutePath)) {
    throw new Error(sourceLabel + ': local link escapes the repository: ' + rawPath);
  }
  return { rootRelative: null, absolutePath };
}

function transformLink(raw, context) {
  const sourceLabel = context.chapter.sourceRelative;
  if (!validateBasicUrl(raw, 'link')) throw new Error(sourceLabel + ': unsafe link URL: ' + raw);
  const compact = decodeForSafety(raw).replace(/\s+/g, '').toLowerCase();
  if (/^(https?|mailto):/.test(compact)) return raw;

  const parts = splitUrl(raw);
  if (!parts.pathname) {
    if (!parts.hasFragment) return raw;
    const targetId = checkFragment(context.chapter, parts.fragment, sourceLabel);
    return context.offline ? '#' + context.chapter.slug + '--' + targetId : '#' + targetId;
  }

  const target = resolveLocalTarget(parts.pathname, context.chapter, sourceLabel);
  if (target.rootRelative) {
    return target.rootRelative + parts.query + (parts.hasFragment ? '#' + parts.fragment : '');
  }

  const targetChapter = context.chapterBySource.get(path.normalize(target.absolutePath));
  if (targetChapter) {
    if (parts.query) throw new Error(sourceLabel + ': chapter links cannot contain query strings: ' + raw);
    let targetId = '';
    if (parts.hasFragment) targetId = checkFragment(targetChapter, parts.fragment, sourceLabel);
    if (context.offline) {
      return '#' + targetChapter.slug + '--' + (targetId || targetChapter.headings[0].id);
    }
    return targetChapter.slug + '.html' + (targetId ? '#' + targetId : '');
  }

  if (!fs.existsSync(target.absolutePath)) {
    throw new Error(sourceLabel + ': local link target does not exist: ' + raw);
  }
  return relativePublishedPath(target.absolutePath) + parts.query + (parts.hasFragment ? '#' + parts.fragment : '');
}

function mimeTypeForImage(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  return types[extension] || '';
}

function validateImageAlt(alt, sourceLabel) {
  const value = normalizeText(alt);
  const lower = value.toLowerCase();
  if (!value || value.length < 3 || /^(image|photo|picture|screenshot|graphic|illustration)$/.test(lower)
      || /\.(gif|jpe?g|png|svg|webp)$/i.test(lower) || /\b(todo|tbd)\b/i.test(value)) {
    throw new Error(sourceLabel + ': every image needs meaningful alternative text.');
  }
}

function transformImage(raw, context) {
  const sourceLabel = context.chapter.sourceRelative;
  // Chapter sources may reference the shared docs/teacher-guide/assets tree with one safe parent step.
  // Keep generic URL validation strict; this narrow exception is resolved and bounded below.
  const decodedRaw = typeof raw === 'string' ? decodeForSafety(raw) : '';
  const pathSegments = decodedRaw.split('/');
  const isSharedChapterAsset = /^\.\.\/assets\/[^/]/.test(decodedRaw)
    && pathSegments.filter((segment) => segment === '..').length === 1
    && !pathSegments.slice(2).includes('..');
  if (!validateBasicUrl(raw, 'image') && !isSharedChapterAsset) throw new Error(sourceLabel + ': unsafe image URL: ' + raw);
  const compact = decodeForSafety(raw).replace(/\s+/g, '').toLowerCase();
  if (/^https?:/.test(compact)) {
    if (context.offline) throw new Error(sourceLabel + ': remote images are not allowed in the self-contained offline guide.');
    return raw;
  }

  const parts = splitUrl(raw);
  if (parts.query || parts.hasFragment) throw new Error(sourceLabel + ': local image URLs cannot contain query strings or fragments.');
  const target = resolveLocalTarget(parts.pathname, context.chapter, sourceLabel);
  if (target.rootRelative) throw new Error(sourceLabel + ': root-relative images cannot be embedded in the offline guide.');
  if (!fs.existsSync(target.absolutePath) || !fs.statSync(target.absolutePath).isFile()) {
    throw new Error(sourceLabel + ': local image does not exist: ' + raw);
  }
  if (context.offline) {
    const mimeType = mimeTypeForImage(target.absolutePath);
    if (!mimeType) throw new Error(sourceLabel + ': unsupported offline image type: ' + raw);
    return 'data:' + mimeType + ';base64,' + fs.readFileSync(target.absolutePath).toString('base64');
  }
  return relativePublishedPath(target.absolutePath);
}

function prepareRenderTokens(md, chapter, context) {
  const tokens = md.parse(chapter.markdown, {});
  const nextSlug = createSlugger(context.offline ? chapter.slug : '');
  let previousLevel = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === 'heading_open') {
      const inline = tokens[index + 1];
      const title = normalizeText(inlineText(inline));
      const id = nextSlug(title);
      const originalLevel = Number(token.tag.slice(1));
      const renderedLevel = context.offline ? originalLevel + 1 : originalLevel;
      token.tag = 'h' + renderedLevel;
      const close = tokens[index + 2];
      if (close && close.type === 'heading_close') close.tag = token.tag;
      token.attrSet('id', id);
      previousLevel = renderedLevel;
    }
    if (token.type !== 'inline' || !Array.isArray(token.children)) continue;
    for (const child of token.children) {
      if (child.type === 'link_open') {
        const hrefIndex = child.attrIndex('href');
        if (hrefIndex >= 0) child.attrs[hrefIndex][1] = transformLink(child.attrs[hrefIndex][1], context);
      }
      if (child.type === 'image') {
        validateImageAlt(child.content, chapter.sourceRelative);
        const srcIndex = child.attrIndex('src');
        if (srcIndex >= 0) child.attrs[srcIndex][1] = transformImage(child.attrs[srcIndex][1], context);
      }
    }
  }

  if (context.offline && previousLevel > 6) {
    throw new Error(chapter.sourceRelative + ': offline heading level exceeds H6.');
  }
  return tokens;
}

function renderChapter(md, chapter, context) {
  const tokens = prepareRenderTokens(md, chapter, context);
  if (context.offline) return { html: md.renderer.render(tokens, md.options, {}) };
  const firstHeadingClose = tokens.findIndex((token) => token.type === 'heading_close');
  return {
    leadHtml: md.renderer.render(tokens.slice(0, firstHeadingClose + 1), md.options, {}),
    bodyHtml: md.renderer.render(tokens.slice(firstHeadingClose + 1), md.options, {}),
  };
}

function chapterNavigation(chapters, activeSlug, offline) {
  const items = chapters.map((chapter) => {
    const href = offline
      ? '#' + chapter.slug + '--' + chapter.headings[0].id
      : chapter.slug + '.html';
    const current = chapter.slug === activeSlug ? ' aria-current="page"' : '';
    return '          <li><a href="' + escapeHtml(href) + '"' + current + '>'
      + escapeHtml(chapter.title) + '</a></li>';
  }).join('\n');
  return [
    '      <nav class="chapter-nav" aria-label="Teacher guide chapters">',
    '        <p class="chapter-nav__title">Teacher guide</p>',
    '        <ol>',
    items,
    '        </ol>',
    '      </nav>',
  ].join('\n');
}

function noScriptChapterList(chapters, offline) {
  const items = chapters.map((chapter) => {
    const href = offline
      ? '#' + chapter.slug + '--' + chapter.headings[0].id
      : chapter.slug + '.html';
    return '              <li><a href="' + escapeHtml(href) + '">' + escapeHtml(chapter.title) + '</a></li>';
  }).join('\n');
  return [
    '          <noscript>',
    '            <div class="search-no-script">',
    '              <p>Search needs JavaScript. Browse the complete chapter list instead:</p>',
    '              <ul>',
    items,
    '              </ul>',
    '            </div>',
    '          </noscript>',
  ].join('\n');
}

function searchPanel(chapters, offline) {
  const action = offline ? 'offline.html' : 'index.html';
  return [
    '      <section class="guide-search" aria-labelledby="guide-search-title" data-guide-search data-search-index="search-index.json">',
    '        <h2 id="guide-search-title">Search the guide</h2>',
    '        <form class="guide-search__form" role="search" action="' + action + '" method="get" data-guide-search-form>',
    '          <label for="guide-search-input">What do you need help with?</label>',
    '          <div class="guide-search__controls">',
    '            <input id="guide-search-input" name="q" type="search" autocomplete="off" spellcheck="true" placeholder="Try live session, glossary, privacy, or audio" data-guide-search-input>',
    '            <button type="submit">Search</button>',
    '          </div>',
    '        </form>',
    '        <p id="guide-search-status" class="guide-search__status" role="status" aria-live="polite" data-guide-search-status>Type one or more words to search every chapter.</p>',
    '        <div class="guide-search__results" data-guide-search-results></div>',
    noScriptChapterList(chapters, offline),
    '      </section>',
  ].join('\n');
}

function pathChooser(manifest, chapters, offline) {
  if (!Array.isArray(manifest.paths) || manifest.paths.length === 0) return '';
  const chaptersBySlug = new Map(chapters.map((chapter) => [chapter.slug, chapter]));
  const cards = manifest.paths.map((pathEntry) => {
    const links = pathEntry.chapterSlugs.map((slug) => {
      const chapter = chaptersBySlug.get(slug);
      const href = offline
        ? '#' + chapter.slug + '--' + chapter.headings[0].id
        : chapter.slug + '.html';
      return '            <li><a href="' + escapeHtml(href) + '">' + escapeHtml(chapter.title) + '</a></li>';
    }).join('\n');
    return [
      '          <article class="guide-path-card">',
      '            <h3>' + escapeHtml(pathEntry.title) + '</h3>',
      '            <p>' + escapeHtml(pathEntry.description) + '</p>',
      '            <p class="guide-path-card__label">Start here</p>',
      '            <ol class="guide-path-card__links">',
      links,
      '            </ol>',
      '          </article>',
    ].join('\n');
  }).join('\n');
  return [
    '      <section class="guide-paths" aria-labelledby="guide-paths-title">',
    '        <h2 id="guide-paths-title">Choose your starting point</h2>',
    '        <p class="guide-paths__lede">Use the path that matches what you need to do today. You can jump to any chapter from the full menu.</p>',
    '        <div class="guide-path-grid">',
    cards,
    '        </div>',
    '      </section>',
  ].join('\n');
}

function siteHeader(offline) {
  return [
    '  <header class="site-header">',
    '    <div class="site-header__inner">',
    '      <a class="brand" href="index.html" aria-label="AlloFlow Teacher Guide home">',
    '        <span class="brand__mark" aria-hidden="true">A</span>',
    '        <span>AlloFlow Teacher Guide</span>',
    '      </a>',
    '      <nav class="utility-nav" aria-label="Guide utilities">',
    '        <a href="../launch.html">Open AlloFlow</a>',
    offline ? '' : '        <a href="tool-reference.html">Guide tool reference</a>',
    '        <a href="../tools.html">Find a tool</a>',
    '        <a href="offline.html">Offline and print edition</a>',
    '      </nav>',
    '    </div>',
    '  </header>',
  ].join('\n');
}

function siteFooter(manifest) {
  return [
    '  <footer class="site-footer">',
    '    <p>Teacher guidance, not a substitute for district policy or professional judgment.</p>',
    '    <p>Guide version ' + escapeHtml(manifest.version) + ' &#183; Content verified <time datetime="'
      + escapeHtml(manifest.lastVerified) + '">' + escapeHtml(manifest.lastVerified) + '</time>.</p>',
    '  </footer>',
  ].join('\n');
}

function htmlDocument(options) {
  return withFinalNewline([
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <meta name="color-scheme" content="light dark">',
    '  <meta name="description" content="' + escapeHtml(options.description) + '">',
    '  <title>' + escapeHtml(options.title) + '</title>',
    options.inlineCss
      ? '  <style>\n' + options.inlineCss + '\n  </style>'
      : '  <link rel="stylesheet" href="guide.css">',
    '</head>',
    '<body>',
    '  <a class="skip-link" href="#main-content">Skip to main content</a>',
    siteHeader(Boolean(options.offline)),
    '  <div class="page-shell">',
    '    <aside class="sidebar">',
    chapterNavigation(options.chapters, options.activeSlug || '', Boolean(options.offline)),
    '    </aside>',
    options.main,
    '  </div>',
    siteFooter(options.manifest),
    options.embeddedSearchData || '',
    options.inlineScript
      ? '  <script>\n' + options.inlineScript + '\n  </script>'
      : '  <script src="guide-search.js" defer></script>',
    '</body>',
    '</html>',
  ].join('\n'));
}

function breadcrumbs(currentTitle) {
  return [
    '      <nav class="breadcrumbs" aria-label="Breadcrumb">',
    '        <ol>',
    '          <li><a href="index.html">Guide home</a></li>',
    '          <li aria-current="page">' + escapeHtml(currentTitle) + '</li>',
    '        </ol>',
    '      </nav>',
  ].join('\n');
}

function previousNextNavigation(chapters, chapterIndex) {
  const previous = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const next = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;
  const previousHtml = previous
    ? '<a class="chapter-pager__previous" href="' + previous.slug + '.html"><span>Previous</span>'
      + escapeHtml(previous.title) + '</a>'
    : '<span></span>';
  const nextHtml = next
    ? '<a class="chapter-pager__next" href="' + next.slug + '.html"><span>Next</span>'
      + escapeHtml(next.title) + '</a>'
    : '<a class="chapter-pager__next" href="index.html"><span>Next</span>Guide home</a>';
  return [
    '      <nav class="chapter-pager" aria-label="Previous and next chapters">',
    '        ' + previousHtml,
    '        ' + nextHtml,
    '      </nav>',
  ].join('\n');
}

function chapterCues(chapter, className, indent) {
  const base = indent || '        ';
  const child = base + '  ';
  const grandchild = child + '  ';
  return [
    base + '<dl class="' + className + '" aria-label="Chapter at a glance">',
    child + '<div>',
    grandchild + '<dt>Best for</dt>',
    grandchild + '<dd>' + escapeHtml(chapter.audience) + '</dd>',
    child + '</div>',
    child + '<div>',
    grandchild + '<dt>Typical use</dt>',
    grandchild + '<dd>' + escapeHtml(chapter.time) + '</dd>',
    child + '</div>',
    base + '</dl>',
  ].join('\n');
}
function sectionNavigation(chapter) {
  const headings = chapter.headings.filter((heading) => heading.level === 2);
  if (!headings.length) return '';
  const items = headings.map((heading) => (
    '            <li><a href="#' + escapeHtml(heading.id) + '">' + escapeHtml(heading.title) + '</a></li>'
  )).join('\n');
  return [
    '        <nav class="section-nav" aria-labelledby="section-nav-title">',
    '          <p id="section-nav-title" class="section-nav__title">On this page</p>',
    '          <ol>',
    items,
    '          </ol>',
    '        </nav>',
  ].join('\n');
}
function buildChapterPage(md, manifest, chapters, chapter, chapterIndex, chapterBySource) {
  const rendered = renderChapter(md, chapter, {
    offline: false,
    chapter,
    chapterBySource,
  });
  const main = [
    '    <main id="main-content" class="guide-main" tabindex="-1">',
    breadcrumbs(chapter.title),
    '      <article class="guide-article">',
    rendered.leadHtml.trimEnd(),
    '        <p class="chapter-summary">' + escapeHtml(chapter.summary) + '</p>',
    chapterCues(chapter, 'chapter-cues', '        '),
    '        <p class="chapter-meta">Chapter ' + (chapterIndex + 1) + ' of ' + chapters.length
      + ' ' + MIDDOT + ' Verified <time datetime="' + escapeHtml(manifest.lastVerified) + '">'
      + escapeHtml(manifest.lastVerified) + '</time></p>',
    sectionNavigation(chapter),
    searchPanel(chapters, false),
    rendered.bodyHtml.trimEnd(),
    '      </article>',
    previousNextNavigation(chapters, chapterIndex),
    '    </main>',
  ].join('\n');
  return htmlDocument({
    title: chapter.title + ' ' + MIDDOT + ' ' + manifest.title,
    description: chapter.summary,
    chapters,
    activeSlug: chapter.slug,
    manifest,
    main,
  });
}

function buildIndexPage(manifest, chapters) {
  const cards = chapters.map((chapter, index) => [
    '          <article class="chapter-card">',
    '            <p class="chapter-card__number">Chapter ' + (index + 1) + '</p>',
    '            <h3><a href="' + chapter.slug + '.html">' + escapeHtml(chapter.title) + '</a></h3>',
    '            <p>' + escapeHtml(chapter.summary) + '</p>',
    chapterCues(chapter, 'chapter-card__cues', '            '),
    '          </article>',
  ].join('\n')).join('\n');
  const main = [
    '    <main id="main-content" class="guide-main guide-home" tabindex="-1">',
    '      <section class="hero" aria-labelledby="guide-title">',
    '        <p class="eyebrow">Plan with purpose. Teach with options.</p>',
    '        <h1 id="guide-title">' + escapeHtml(manifest.title) + '</h1>',
    '        <p class="hero__lede">' + escapeHtml(manifest.description) + '</p>',
    '        <div class="hero__actions">',
    '          <a class="button button--primary" href="' + chapters[0].slug + '.html">Start with the first lesson</a>',
    '          <a class="button" href="offline.html">Open the offline and print edition</a>',
    '        </div>',
    '      </section>',
    searchPanel(chapters, false),
    pathChooser(manifest, chapters, false),
    '      <section class="chapter-browser" aria-labelledby="chapter-browser-title">',
    '        <h2 id="chapter-browser-title">Browse by task</h2>',
    '        <div class="chapter-grid">',
    cards,
    '        </div>',
    '      </section>',
    '    </main>',
  ].join('\n');
  return htmlDocument({
    title: manifest.title,
    description: manifest.description,
    chapters,
    manifest,
    main,
  });
}

function buildSearchRecords(chapters, offline) {
  const records = [];
  for (const chapter of chapters) {
    for (const section of chapter.sections) {
      records.push({
        id: chapter.slug + ':' + section.id,
        title: section.title,
        chapter: chapter.title,
        level: section.level,
        url: offline
          ? '#' + chapter.slug + '--' + section.id
          : chapter.slug + '.html#' + section.id,
        text: section.text,
      });
    }
  }
  return records;
}

function jsonForHtmlScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e');
}

function loadPublicToolCatalog() {
  const sandbox = {
    window: {
      setTimeout() {},
    },
    document: {
      readyState: 'complete',
      addEventListener() {},
      querySelectorAll() { return []; },
      createElement() {
        return {
          style: {},
          addEventListener() {},
          setAttribute() {},
          appendChild() {},
          remove() {},
        };
      },
      head: {
        appendChild() {},
      },
    },
    console: {
      log() {},
      warn() {},
      error() {},
    },
  };
  const runOptions = { filename: TOOL_CATALOG_PATH };
  vm.runInNewContext(fs.readFileSync(TOOL_CATALOG_PATH, 'utf8'), sandbox, runOptions);
  vm.runInNewContext(fs.readFileSync(TOOL_FINDER_PATH, 'utf8'), sandbox, {
    filename: TOOL_FINDER_PATH,
  });
  const tools = sandbox.window.ALLOFLOW_PUBLIC_TOOLS;
  if (!Array.isArray(tools) || !tools.length) {
    throw new Error('Public tool catalog did not expose any tools.');
  }

  const ids = new Set();
  return tools.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error('Public tool catalog entry ' + (index + 1) + ' is invalid.');
    for (const field of ['id', 'name', 'summary', 'category']) {
      if (typeof raw[field] !== 'string' || !raw[field].trim()) {
        throw new Error('Public tool catalog entry ' + (index + 1) + ' is missing "' + field + '".');
      }
    }
    if (ids.has(raw.id)) throw new Error('Public tool catalog has duplicate id: ' + raw.id);
    ids.add(raw.id);
    for (const field of ['audiences', 'subjects', 'grades', 'access', 'tags']) {
      if (raw[field] !== undefined && !Array.isArray(raw[field])) {
        throw new Error('Public tool catalog "' + raw.id + '" field "' + field + '" must be an array.');
      }
    }
    return {
      id: raw.id,
      name: raw.name,
      icon: typeof raw.icon === 'string' ? raw.icon : '',
      summary: raw.summary,
      category: raw.category,
      audiences: Array.isArray(raw.audiences) ? raw.audiences.map(String) : [],
      subjects: Array.isArray(raw.subjects) ? raw.subjects.map(String) : [],
      grades: Array.isArray(raw.grades) ? raw.grades.map(String) : [],
      source: typeof raw.source === 'string' ? raw.source : '',
      ai: typeof raw.ai === 'string' ? raw.ai : '',
      access: Array.isArray(raw.access) ? raw.access.map(String) : [],
      location: typeof raw.location === 'string' ? raw.location : '',
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
      featured: Boolean(raw.featured),
      detailHref: typeof raw.detailHref === 'string' ? raw.detailHref : '',
    };
  }).sort((first, second) => first.name.localeCompare(second.name));
}

function catalogLabel(labels, value, fallback) {
  return labels[value] || fallback;
}

function toolReferenceHref(tool) {
  if (tool.detailHref && validateBasicUrl(tool.detailHref, 'link')) return '../' + tool.detailHref;
  return '../tools.html';
}

function toolReferenceCard(tool) {
  const sourceLabel = catalogLabel({
    none: 'No source needed',
    optional: 'Source optional',
    raw: 'Bring text or a file',
    analyzed: 'Analyzed source needed',
  }, tool.source, 'Check source requirements');
  const aiLabel = catalogLabel({
    none: 'Works without AI',
    optional: 'AI optional',
    required: 'AI required',
  }, tool.ai, 'Check AI requirements');
  const accessLabel = tool.access.length
    ? tool.access.map((value) => catalogLabel({
      gemini: 'Gemini Canvas',
      desktop: 'Desktop',
      byok: 'Hosted / BYOK',
    }, value, value)).join(', ')
    : 'Check deployment';
  const search = [
    tool.id,
    tool.name,
    tool.summary,
    tool.category,
    tool.location,
    tool.audiences.join(' '),
    tool.subjects.join(' '),
    tool.grades.join(' '),
    tool.tags.join(' '),
    sourceLabel,
    aiLabel,
    accessLabel,
  ].join(' ');
  const chips = [sourceLabel, aiLabel].map((label) => (
    '<span class="tool-reference-chip">' + escapeHtml(label) + '</span>'
  )).join('');
  return [
    '          <article class="tool-reference-card" data-tool-card data-category="' + escapeHtml(tool.category) + '" data-search="' + escapeHtml(search.toLowerCase()) + '">',
    '            <div class="tool-reference-card__heading">',
    tool.icon ? '              <span class="tool-reference-card__icon" aria-hidden="true">' + escapeHtml(tool.icon) + '</span>' : '',
    '              <div>',
    '                <h2>' + escapeHtml(tool.name) + '</h2>',
    '                <p class="tool-reference-card__category">' + escapeHtml(tool.category) + '</p>',
    '              </div>',
    '            </div>',
    '            <p>' + escapeHtml(tool.summary) + '</p>',
    '            <div class="tool-reference-card__chips">' + chips + '</div>',
    '            <dl class="tool-reference-card__meta">',
    '              <div><dt>Find it in</dt><dd>' + escapeHtml(tool.location || 'Use Find a Tool') + '</dd></div>',
    '              <div><dt>For</dt><dd>' + escapeHtml(tool.audiences.join(', ') || 'Educators') + '</dd></div>',
    '              <div><dt>Access</dt><dd>' + escapeHtml(accessLabel) + '</dd></div>',
    '            </dl>',
    '            <p><a href="' + escapeHtml(toolReferenceHref(tool)) + '">Open the tool details</a></p>',
    '          </article>',
  ].join('\n');
}

function toolReferenceScript() {
  return [
    '(function () {',
    '  "use strict";',
    '  var root = document.querySelector("[data-tool-reference]");',
    '  if (!root) return;',
    '  var input = root.querySelector("[data-tool-reference-input]");',
    '  var category = root.querySelector("[data-tool-reference-category]");',
    '  var cards = Array.prototype.slice.call(root.querySelectorAll("[data-tool-card]"));',
    '  var status = root.querySelector("[data-tool-reference-status]");',
    '  function normalize(value) {',
    '    return String(value || "").toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();',
    '  }',
    '  function render() {',
    '    var words = normalize(input.value).split(/\\s+/).filter(Boolean);',
    '    var selected = category.value;',
    '    var visible = 0;',
    '    cards.forEach(function (card) {',
    '      var haystack = normalize(card.getAttribute("data-search"));',
    '      var matchesWords = words.every(function (word) { return haystack.indexOf(word) !== -1; });',
    '      var matchesCategory = !selected || card.getAttribute("data-category") === selected;',
    '      var show = matchesWords && matchesCategory;',
    '      card.hidden = !show;',
    '      if (show) visible += 1;',
    '    });',
    '    status.textContent = visible + (visible === 1 ? " tool shown." : " tools shown.") + (words.length || selected ? "" : " Use search or the category filter to narrow the catalog.");',
    '  }',
    '  input.addEventListener("input", render);',
    '  category.addEventListener("change", render);',
    '  render();',
    '}());',
  ].join('\n');
}

function buildToolReferencePage(manifest, chapters, tools, css) {
  const categories = Array.from(new Set(tools.map((tool) => tool.category))).sort((a, b) => a.localeCompare(b));
  const options = categories.map((category) => (
    '              <option value="' + escapeHtml(category) + '">' + escapeHtml(category) + '</option>'
  )).join('\n');
  const cards = tools.map(toolReferenceCard).join('\n');
  const main = [
    '    <main id="main-content" class="guide-main" tabindex="-1">',
    breadcrumbs('Tool reference'),
    '      <article class="guide-article tool-reference-page" data-tool-reference>',
    '        <p class="eyebrow">Generated public catalog</p>',
    '        <h1>AlloFlow tool reference</h1>',
    '        <p class="chapter-summary">Search the public tool catalog by classroom goal, subject, audience, access path, or tool name.</p>',
    '        <p class="chapter-meta">' + tools.length + ' catalog entries ' + MIDDOT + ' Generated from the public catalog and verified <time datetime="' + escapeHtml(manifest.lastVerified) + '">' + escapeHtml(manifest.lastVerified) + '</time></p>',
    '        <section class="tool-reference-controls" aria-labelledby="tool-reference-controls-title">',
    '          <h2 id="tool-reference-controls-title">Find a tool</h2>',
    '          <div class="tool-reference-controls__grid">',
    '            <div>',
    '              <label for="tool-reference-input">Search by need, subject, or tool</label>',
    '              <input id="tool-reference-input" type="search" autocomplete="off" placeholder="Try vocabulary, live lesson, AAC, STEM, or accessibility" data-tool-reference-input>',
    '            </div>',
    '            <div>',
    '              <label for="tool-reference-category">Filter by category</label>',
    '              <select id="tool-reference-category" data-tool-reference-category>',
    '                <option value="">All categories</option>',
    options,
    '              </select>',
    '            </div>',
    '          </div>',
    '          <p class="tool-reference-status" role="status" aria-live="polite" data-tool-reference-status></p>',
    '        </section>',
    '        <section aria-labelledby="tool-reference-results-title">',
    '          <h2 id="tool-reference-results-title">Catalog</h2>',
    '          <div class="tool-reference-grid">',
    cards,
    '          </div>',
    '          <noscript><p class="search-no-script">JavaScript is disabled, so all catalog entries are shown. Use your browser Find command to search this page.</p></noscript>',
    '        </section>',
    '      </article>',
    '    </main>',
  ].join('\n');
  return htmlDocument({
    title: 'Tool reference ' + MIDDOT + ' ' + manifest.title,
    description: 'Generated searchable reference for the public AlloFlow tool catalog.',
    chapters,
    manifest,
    main,
    inlineScript: toolReferenceScript(),
  });
}
function buildOfflinePage(md, manifest, chapters, chapterBySource, css, searchScript) {
  const articles = chapters.map((chapter, index) => {
    const rendered = renderChapter(md, chapter, {
      offline: true,
      chapter,
      chapterBySource,
    });
    return [
      '      <article class="guide-article offline-chapter" data-offline-chapter="' + escapeHtml(chapter.slug) + '">',
      '        <p class="chapter-meta">Chapter ' + (index + 1) + ' of ' + chapters.length + '</p>',
      rendered.html.trimEnd(),
      '      </article>',
    ].join('\n');
  }).join('\n');
  const main = [
    '    <main id="main-content" class="guide-main offline-main" tabindex="-1">',
    '      <section class="hero" aria-labelledby="offline-guide-title">',
    '        <p class="eyebrow">Self-contained edition</p>',
    '        <h1 id="offline-guide-title">' + escapeHtml(manifest.title) + ': offline and print edition</h1>',
    '        <p class="hero__lede">This single file contains every chapter, the search index, styles, and search behavior. Save it locally or print it to PDF.</p>',
    '      </section>',
    searchPanel(chapters, true),
    pathChooser(manifest, chapters, true),
    articles,
    '    </main>',
  ].join('\n');
  const embeddedRecords = buildSearchRecords(chapters, true);
  const embeddedData = '  <script type="application/json" id="guide-search-data">'
    + jsonForHtmlScript(embeddedRecords) + '</script>';
  return htmlDocument({
    title: manifest.title + ': offline and print edition',
    description: manifest.description,
    chapters,
    manifest,
    offline: true,
    main,
    inlineCss: css,
    embeddedSearchData: embeddedData,
    inlineScript: searchScript,
  });
}

function globalHeadingAnchors(chapters) {
  const nextSlug = createSlugger('');
  const map = new Map();
  for (const chapter of chapters) {
    for (const heading of chapter.headings) {
      map.set(path.normalize(chapter.sourcePath) + '#' + heading.id, nextSlug(heading.title));
    }
  }
  return map;
}

function rewriteConsolidatedLinks(markdown, chapter, chapterBySource, globalAnchors) {
  let inFence = false;
  return normalizeEol(markdown).split('\n').map((line) => {
    if (/^\s*(?:\x60{3}|~{3})/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;
    return line.replace(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (match, start, raw, end) => {
      const isImage = start.startsWith('!');
      const decodedRaw = decodeForSafety(raw);
      const pathSegments = decodedRaw.split('/');
      const isSharedChapterAsset = isImage
        && /^\.\.\/assets\/[^/]/.test(decodedRaw)
        && pathSegments.filter((segment) => segment === '..').length === 1
        && !pathSegments.slice(2).includes('..');
      if (!validateBasicUrl(raw, isImage ? 'image' : 'link') && !isSharedChapterAsset) return match;
      const compact = decodedRaw.replace(/\\s+/g, '').toLowerCase();
      if (/^(https?|mailto):/.test(compact) || raw.startsWith('/')) return match;
      const parts = splitUrl(raw);
      if (!parts.pathname) {
        if (!parts.hasFragment) return match;
        const localId = decodeFragment(parts.fragment, chapter.sourceRelative);
        const globalId = globalAnchors.get(path.normalize(chapter.sourcePath) + '#' + localId);
        return globalId ? start + '#' + globalId + end : match;
      }
      const absolute = path.resolve(path.dirname(chapter.sourcePath), decodeForSafety(parts.pathname));
      const targetChapter = chapterBySource.get(path.normalize(absolute));
      if (targetChapter) {
        const localId = parts.hasFragment
          ? decodeFragment(parts.fragment, chapter.sourceRelative)
          : targetChapter.headings[0].id;
        const globalId = globalAnchors.get(path.normalize(targetChapter.sourcePath) + '#' + localId);
        return globalId ? start + '#' + globalId + end : match;
      }
      if (isInside(REPO_ROOT, absolute)) {
        return start + posixPath(path.relative(REPO_ROOT, absolute)) + parts.query
          + (parts.hasFragment ? '#' + parts.fragment : '') + end;
      }
      return match;
    });
  }).join('\n');
}

function demoteHeadings(markdown) {
  let inFence = false;
  return normalizeEol(markdown).split('\n').map((line) => {
    if (/^\s*(?:\x60{3}|~{3})/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;
    return line.replace(/^(#{1,5})(\s+)/, (match, hashes, spacing) => '#' + hashes + spacing);
  }).join('\n');
}

function buildConsolidatedManual(manifest, chapters, chapterBySource) {
  const globalAnchors = globalHeadingAnchors(chapters);
  const contents = chapters.map((chapter, index) => {
    const anchor = globalAnchors.get(path.normalize(chapter.sourcePath) + '#' + chapter.headings[0].id);
    return (index + 1) + '. [' + chapter.title + '](#' + anchor + ') ' + MIDDOT + ' ' + chapter.summary;
  }).join('\n');
  const bodies = chapters.map((chapter) => {
    const rewritten = rewriteConsolidatedLinks(chapter.markdown, chapter, chapterBySource, globalAnchors);
    return demoteHeadings(rewritten).trim();
  }).join('\n\n---\n\n');
  return withFinalNewline([
    '<!-- Generated by ' + GENERATOR_PATH + '. Edit docs/teacher-guide/guide.json and docs/teacher-guide/chapters/*.md instead. -->',
    '',
    '# ' + manifest.title,
    '',
    '> ' + manifest.description,
    '>',
    '> Guide version **' + manifest.version + '** ' + MIDDOT + ' Content verified **' + manifest.lastVerified + '**',
    '',
    'This consolidated Markdown edition is generated for repository browsing, review, and export. The polished searchable edition is in [guide/](guide/index.html), and the canonical chapter sources are in [docs/teacher-guide/chapters/](docs/teacher-guide/chapters/).',
    '',
    '## Contents',
    '',
    contents,
    '',
    '---',
    '',
    bodies,
  ].join('\n'));
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...walkFiles(absolute));
    else if (entry.isFile()) found.push(absolute);
  }
  return found.sort();
}

function generatedManifestContent(manifest, outputs) {
  const records = Array.from(outputs.entries())
    .map(([absolutePath, content]) => ({
      path: posixPath(path.relative(REPO_ROOT, absolutePath)),
      sha256: sha256(content),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return withFinalNewline(JSON.stringify({
    schemaVersion: 1,
    generator: GENERATOR_PATH,
    sourceManifest: MANIFEST_RELATIVE_PATH,
    version: manifest.version,
    lastVerified: manifest.lastVerified,
    outputs: records,
  }, null, 2));
}

function collectExpectedOutputs() {
  const manifest = JSON.parse(normalizeEol(fs.readFileSync(MANIFEST_PATH, 'utf8')));
  validateManifest(manifest);
  const md = createMarkdownEngine();
  const chapters = manifest.chapters.map((entry) => {
    const markdown = normalizeEol(fs.readFileSync(path.resolve(SOURCE_ROOT, entry.source), 'utf8'));
    return inspectChapter(md, entry, markdown);
  });
  const chapterBySource = new Map(chapters.map((chapter) => [path.normalize(chapter.sourcePath), chapter]));
  const css = withFinalNewline(fs.readFileSync(path.join(SOURCE_ROOT, 'guide.css'), 'utf8'));
  const searchScript = withFinalNewline(fs.readFileSync(path.join(SOURCE_ROOT, 'guide-search.js'), 'utf8'));
  const tools = loadPublicToolCatalog();

  const outputs = new Map();
  outputs.set(path.join(OUTPUT_ROOT, 'index.html'), buildIndexPage(manifest, chapters));
  outputs.set(path.join(OUTPUT_ROOT, 'tool-reference.html'), buildToolReferencePage(manifest, chapters, tools, css));
  chapters.forEach((chapter, index) => {
    outputs.set(
      path.join(OUTPUT_ROOT, chapter.slug + '.html'),
      buildChapterPage(md, manifest, chapters, chapter, index, chapterBySource)
    );
  });
  outputs.set(
    path.join(OUTPUT_ROOT, 'search-index.json'),
    withFinalNewline(JSON.stringify(buildSearchRecords(chapters, false), null, 2))
  );
  outputs.set(path.join(OUTPUT_ROOT, 'guide.css'), css);
  outputs.set(path.join(OUTPUT_ROOT, 'guide-search.js'), searchScript);
  outputs.set(
    path.join(OUTPUT_ROOT, 'offline.html'),
    buildOfflinePage(md, manifest, chapters, chapterBySource, css, searchScript)
  );
  outputs.set(CONSOLIDATED_PATH, buildConsolidatedManual(manifest, chapters, chapterBySource));
  outputs.set(
    path.join(OUTPUT_ROOT, 'generated-manifest.json'),
    generatedManifestContent(manifest, outputs)
  );
  return { manifest, chapters, outputs };
}

function expectedGuideFiles(outputs) {
  return new Set(
    Array.from(outputs.keys())
      .filter((filePath) => isInside(OUTPUT_ROOT, filePath))
      .map((filePath) => path.normalize(filePath))
  );
}

function findDrift(outputs) {
  const problems = [];
  for (const [filePath, expected] of outputs) {
    if (!fs.existsSync(filePath)) {
      problems.push('missing ' + posixPath(path.relative(REPO_ROOT, filePath)));
      continue;
    }
    const actual = normalizeEol(fs.readFileSync(filePath, 'utf8'));
    if (actual !== expected) problems.push('changed ' + posixPath(path.relative(REPO_ROOT, filePath)));
  }
  const expected = expectedGuideFiles(outputs);
  for (const filePath of walkFiles(OUTPUT_ROOT)) {
    if (!expected.has(path.normalize(filePath))) {
      problems.push('unexpected ' + posixPath(path.relative(REPO_ROOT, filePath)));
    }
  }
  return problems;
}

function removePreviouslyManagedStaleFiles(outputs) {
  const previousPath = path.join(OUTPUT_ROOT, 'generated-manifest.json');
  if (!fs.existsSync(previousPath)) return;
  let previous;
  try {
    previous = JSON.parse(fs.readFileSync(previousPath, 'utf8'));
  } catch (_error) {
    return;
  }
  if (!previous || !Array.isArray(previous.outputs)) return;
  const expected = new Set(Array.from(outputs.keys()).map((filePath) => path.normalize(filePath)));
  for (const record of previous.outputs) {
    if (!record || typeof record.path !== 'string') continue;
    const absolute = path.resolve(REPO_ROOT, record.path);
    if (!isInside(OUTPUT_ROOT, absolute) || expected.has(path.normalize(absolute))) continue;
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) fs.unlinkSync(absolute);
  }
}

function writeOutputs(outputs) {
  removePreviouslyManagedStaleFiles(outputs);
  for (const [filePath, content] of outputs) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function build(options) {
  const result = collectExpectedOutputs();
  if (options && options.check) {
    const drift = findDrift(result.outputs);
    if (drift.length) {
      throw new Error('Teacher guide is out of date:\n- ' + drift.join('\n- ')
        + '\nRun: node ' + GENERATOR_PATH);
    }
    return {
      mode: 'check',
      fileCount: result.outputs.size,
      chapterCount: result.chapters.length,
    };
  }
  writeOutputs(result.outputs);
  const drift = findDrift(result.outputs);
  if (drift.length) {
    throw new Error('Teacher guide build left unexpected drift:\n- ' + drift.join('\n- '));
  }
  return {
    mode: 'build',
    fileCount: result.outputs.size,
    chapterCount: result.chapters.length,
  };
}

function usage() {
  return [
    'Build the AlloFlow Teacher Guide.',
    '',
    'Usage:',
    '  node ' + GENERATOR_PATH,
    '  node ' + GENERATOR_PATH + ' --check',
  ].join('\n');
}

function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(usage() + '\n');
    return;
  }
  const unknown = args.filter((arg) => arg !== '--check');
  if (unknown.length) throw new Error('Unknown argument: ' + unknown.join(', '));
  const result = build({ check: args.includes('--check') });
  const action = result.mode === 'check' ? 'verified' : 'built';
  process.stdout.write(
    'Teacher guide ' + action + ': ' + result.chapterCount + ' chapters, '
      + result.fileCount + ' generated files.\n'
  );
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (error) {
    process.stderr.write((error && error.stack ? error.stack : String(error)) + '\n');
    process.exitCode = 1;
  }
}

module.exports = {
  MAX_SEARCH_RESULTS,
  build,
  collectExpectedOutputs,
  createMarkdownEngine,
  createSlugger,
  escapeHtml,
  slugify,
  validateBasicUrl,
};
