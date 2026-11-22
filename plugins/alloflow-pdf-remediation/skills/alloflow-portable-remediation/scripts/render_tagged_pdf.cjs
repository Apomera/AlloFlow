#!/usr/bin/env node
'use strict';

/*
 * Optional tagged-PDF tier for the portable skill.
 *
 * This helper loads a locally available Playwright installation, renders the
 * already-sanitized semantic HTML with Chromium's tagged-PDF option, and blocks
 * every page network request. It never downloads a browser or dependency.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MAX_HTML_BYTES = 8 * 1024 * 1024;
const MAX_MATHML_FRAGMENTS = 128;
const MAX_MATHML_FRAGMENT_BYTES = 128 * 1024;
const MAX_MATHML_TOTAL_BYTES = 2 * 1024 * 1024;
const MATHML_XMLNS = 'http://www.w3.org/1998/Math/MathML';
const MATHML_SENTINEL_PREFIX = '__ALLOFLOW_MATHML_AF_';

function output(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
  process.exitCode = code;
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function compactError(error) {
  return String(error && (error.message || error) || 'Unknown error')
    .replace(/\s+/g, ' ')
    .slice(0, 500);
}

function loadPlaywright() {
  for (const name of ['playwright', 'playwright-core']) {
    try {
      const candidate = require(name);
      if (candidate && candidate.chromium) return { api: candidate, packageName: name };
    } catch (_) {}
  }
  return null;
}

function browserLaunchOptions(timeout = 30000) {
  // Playwright selects its matching headless shell when executablePath is
  // omitted. chromium.executablePath() names the separate headed build.
  const options = {
    headless: true,
    timeout,
    args: [
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-domain-reliability',
      '--disable-features=AutofillServerCommunication,MediaRouter,OptimizationHints',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-first-run',
      '--webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--force-webrtc-ip-handling-policy',
    ],
  };
  const configured = process.env.ALLOFLOW_CHROMIUM_PATH;
  if (configured) {
    if (!fs.existsSync(configured) || !fs.statSync(configured).isFile()) {
      throw new Error('ALLOFLOW_CHROMIUM_PATH does not identify a local Chromium executable.');
    }
    options.executablePath = path.resolve(configured);
  }
  return options;
}

async function capabilities() {
  const loaded = loadPlaywright();
  if (!loaded) {
    return {
      available: false,
      reason: 'A local Playwright or Playwright Core package is required.',
      networkPolicy: 'deny',
    };
  }
  let browser;
  try {
    // A package or headed executable on disk does not establish that the local
    // headless browser can start. This probe never installs or downloads it.
    browser = await loaded.api.chromium.launch(browserLaunchOptions(10000));
  } catch (error) {
    return {
      available: false,
      reason: compactError(error),
      package: loaded.packageName,
      networkPolicy: 'deny',
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  return {
    available: true,
    package: loaded.packageName,
    renderer: 'Chromium tagged PDF',
    networkPolicy: 'deny',
  };
}

function validateInputs(htmlPath, pdfPath) {
  if (!htmlPath || !pdfPath) throw new Error('Use --html INPUT and --pdf OUTPUT.');
  const resolvedHtml = path.resolve(htmlPath);
  const resolvedPdf = path.resolve(pdfPath);
  if (resolvedHtml === resolvedPdf) throw new Error('HTML input and PDF output must be different files.');
  if (!fs.existsSync(resolvedHtml) || !fs.statSync(resolvedHtml).isFile()) {
    throw new Error('HTML input does not exist.');
  }
  if (fs.statSync(resolvedHtml).size > MAX_HTML_BYTES) {
    throw new Error('HTML input exceeds the 8 MiB limit.');
  }
  try {
    const existingStat = fs.lstatSync(resolvedPdf);
    if (existingStat.isSymbolicLink()) {
      throw new Error('Refusing to write PDF output through a symbolic link.');
    }
    throw new Error('Refusing to overwrite an existing PDF.');
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
  }
  const parent = path.dirname(resolvedPdf);
  if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
    throw new Error('PDF output directory does not exist.');
  }
  const html = fs.readFileSync(resolvedHtml, 'utf8');
  if (/<(?:script|iframe|object|embed|base)\b/i.test(html) || /\son[a-z]+\s*=/i.test(html)) {
    throw new Error('Active HTML content is not allowed.');
  }
  if (/<meta\b[^>]*\bhttp-equiv\s*=\s*["']?\s*refresh\b/i.test(html)) {
    throw new Error('Meta refresh navigation is not allowed.');
  }
  const resourceUrls = [];
  html.replace(/<(?:img|link|source)\b[^>]*\b(?:src|href)\s*=\s*["']([^"']+)["']/gi, (_, url) => {
    resourceUrls.push(url);
    return _;
  });
  if (resourceUrls.some((url) => !String(url).startsWith('data:'))) {
    throw new Error('External or file-backed resources are not allowed; embed images as data URLs.');
  }
  if (/@import\b/i.test(html) || /url\(\s*["']?(?!data:)/i.test(html)) {
    throw new Error('External CSS resources are not allowed.');
  }
  return { htmlPath: resolvedHtml, pdfPath: resolvedPdf, html };
}

/*
 * PDF/UA finalization.
 *
 * Chromium's tagged output fails veraPDF UA-1 on two rules:
 *  - 7.1-3: the printBackground fill it emits at the top of every page content
 *    stream is painted before any marked-content operator, so it is neither
 *    tagged nor marked as an Artifact.
 *  - 7.1-8: the Catalog has no XMP metadata stream.
 *
 * Both are repaired here with a classic incremental update appended to the
 * file Chromium wrote: replacement content-stream objects with the untagged
 * leading paint wrapped in /Artifact BMC ... EMC, a new XMP metadata stream,
 * and an updated Catalog referencing it. Chromium emits a single-revision file
 * with a classic xref table and no object streams, which is what makes the
 * append safe; finalize verifies those assumptions and throws rather than
 * guessing when they do not hold.
 */

const PAINTING_OPS = new Set([
  'f', 'F', 'f*', 'B', 'B*', 'b', 'b*', 'S', 's',
  'Tj', 'TJ', '"', "'", 'Do', 'sh', 'EI',
]);

function lastToken(line) {
  const parts = line.trim().split(/\s+/);
  return parts[parts.length - 1];
}

/*
 * Wrap untagged painting in the prefix of a page content stream (everything
 * before the first BDC/BMC) in /Artifact BMC ... EMC. Only balanced q...Q
 * groups and lone depth-0 painting operators are wrapped, so marked-content
 * brackets never interleave with a q/Q pair that closes inside the tagged
 * region. Returns null when nothing needed wrapping.
 */
function wrapUntaggedPrefix(content) {
  let markIdx = -1;
  for (const token of ['BDC', 'BMC']) {
    const idx = content.indexOf(token);
    if (idx >= 0 && (markIdx < 0 || idx < markIdx)) markIdx = idx;
  }
  if (markIdx < 0) return null; // no marked content at all; not ours to repair
  const lineStart = content.lastIndexOf('\n', markIdx) + 1;
  const prefix = content.slice(0, lineStart);
  const rest = content.slice(lineStart);

  const lines = prefix.split('\n');
  const out = [];
  let depth = 0;
  let groupStart = -1;
  let groupPaints = false;
  let changed = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'q') {
      if (depth === 0) {
        groupStart = out.length;
        groupPaints = false;
      }
      depth += 1;
      out.push(line);
      continue;
    }
    if (trimmed === 'Q') {
      depth -= 1;
      out.push(line);
      if (depth === 0 && groupStart >= 0) {
        if (groupPaints) {
          out.splice(groupStart, 0, '/Artifact BMC');
          out.push('EMC');
          changed = true;
        }
        groupStart = -1;
      }
      continue;
    }
    out.push(line);
    if (trimmed && PAINTING_OPS.has(lastToken(trimmed))) {
      if (depth > 0) {
        groupPaints = true;
      } else {
        out.splice(out.length - 1, 0, '/Artifact BMC');
        out.push('EMC');
        changed = true;
      }
    }
  }
  if (!changed) return null;
  return out.join('\n') + rest;
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildXmpPacket(title, pdfuaPart) {
  const identification = pdfuaPart
    ? `\n   <pdfuaid:part>${pdfuaPart}</pdfuaid:part>`
    : '';
  const xml = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">
   <dc:title>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${xmlEscape(title)}</rdf:li>
    </rdf:Alt>
   </dc:title>${identification}
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
  return Buffer.from(xml, 'utf8');
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => {
      const cp = parseInt(hex, 16);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) return '';
      return String.fromCodePoint(cp);
    })
    .replace(/&#(\d+);/g, (m, dec) => {
      const cp = parseInt(dec, 10);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) return '';
      return String.fromCodePoint(cp);
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/*
 * href -> visible anchor text, for Link-annotation alternate descriptions.
 * PDF/UA-1 (veraPDF 7.18.1-2 / 7.18.5-2) requires an annotation to carry an
 * alternate description in /Contents; Chromium writes none. The most useful
 * description is the link's own visible text; the URI is the fallback.
 */
function extractAnchorTexts(html) {
  const map = new Map();
  const anchorPattern = /<a\s[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html)) !== null) {
    const rawHref = match[1] !== undefined ? match[1] : match[2];
    const href = decodeEntities(rawHref);
    const text = decodeEntities(match[3].replace(/<[^>]+>/g, ''));
    if (text && href && !map.has(href)) map.set(href, text);
  }
  return map;
}

/* PDF text string as UTF-16BE hex with BOM: immune to escaping and encoding. */
function pdfTextString(value) {
  const buf = Buffer.from('﻿' + String(value), 'utf16le');
  buf.swap16(); // utf16le -> utf16be
  return '<' + buf.toString('hex').toUpperCase() + '>';
}

function extractHtmlTitle(html) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match) return 'Accessible document';
  return decodeEntities(match[1]) || 'Accessible document';
}

function findHtmlTagClose(src, startIdx) {
  let quote = null;
  for (let i = startIdx; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return -1;
}

function scanTopLevelMathElements(html) {
  const src = String(html || '');
  const results = [];
  let i = 0;
  const len = src.length;

  while (i < len) {
    const lt = src.indexOf('<', i);
    if (lt < 0) break;

    if (src.startsWith('<!--', lt)) {
      const endComment = src.indexOf('-->', lt + 4);
      i = endComment < 0 ? len : endComment + 3;
      continue;
    }

    const skipBlock = /^<(script|style)(?=[\s>/])/i.exec(src.slice(lt, lt + 16));
    if (skipBlock) {
      const tagClose = findHtmlTagClose(src, lt + 1 + skipBlock[1].length);
      if (tagClose < 0) break;
      const closeRe = new RegExp(`</${skipBlock[1]}\\s*>`, 'ig');
      closeRe.lastIndex = tagClose + 1;
      const cm = closeRe.exec(src);
      i = cm ? closeRe.lastIndex : len;
      continue;
    }

    if (/^<math(?=[\s>/])/i.test(src.slice(lt, lt + 7))) {
      const openEnd = findHtmlTagClose(src, lt + 5);
      if (openEnd < 0) break;
      const isSelfClosing = /\/\s*$/.test(src.slice(lt + 5, openEnd));
      if (isSelfClosing) {
        i = openEnd + 1;
        continue;
      }

      let depth = 1;
      let cursor = openEnd + 1;
      let closeEnd = -1;
      while (cursor < len && depth > 0) {
        const nextLt = src.indexOf('<', cursor);
        if (nextLt < 0) break;
        if (src.startsWith('<!--', nextLt)) {
          const ec = src.indexOf('-->', nextLt + 4);
          cursor = ec < 0 ? len : ec + 3;
          continue;
        }
        if (/^<\/math\s*>/i.test(src.slice(nextLt, nextLt + 16))) {
          const gt = src.indexOf('>', nextLt + 6);
          if (gt < 0) break;
          depth -= 1;
          cursor = gt + 1;
          if (depth === 0) {
            closeEnd = cursor;
            break;
          }
          continue;
        }
        if (/^<math(?=[\s>/])/i.test(src.slice(nextLt, nextLt + 7))) {
          const gt = findHtmlTagClose(src, nextLt + 5);
          if (gt < 0) break;
          if (!/\/\s*$/.test(src.slice(nextLt + 5, gt))) depth += 1;
          cursor = gt + 1;
          continue;
        }
        cursor = nextLt + 1;
      }

      if (closeEnd > openEnd) {
        results.push({
          start: lt,
          openTagEnd: openEnd + 1,
          end: closeEnd,
          raw: src.slice(lt, closeEnd),
        });
        i = closeEnd;
        continue;
      }
      i = openEnd + 1;
      continue;
    }

    i = lt + 1;
  }

  return results;
}

function sanitizeMathMlFragment(rawFragment) {
  if (typeof rawFragment !== 'string') return null;
  let xml = rawFragment.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (!xml) return null;
  if (!/^<math(?=[\s>])/i.test(xml) || !/<\/math\s*>$/i.test(xml)) return null;

  const openEnd = findHtmlTagClose(xml, 5);
  if (openEnd < 0) return null;
  const closeMatch = /<\/math\s*>$/i.exec(xml);
  if (!closeMatch || closeMatch.index <= openEnd) return null;
  const inner = xml.slice(openEnd + 1, closeMatch.index);
  if (!inner.trim()) return null;

  if (/<(?:script|iframe|object|embed|applet|base|meta|link|form)\b/i.test(xml)) return null;
  if (/<!(?:DOCTYPE|ENTITY)\b/i.test(xml)) return null;
  if (/<\?[\s\S]*?\?>/.test(xml)) return null;

  let pos = 0;
  while (pos < xml.length) {
    const lt = xml.indexOf('<', pos);
    if (lt < 0) break;
    if (xml.startsWith('<!--', lt)) {
      const ec = xml.indexOf('-->', lt + 4);
      pos = ec < 0 ? xml.length : ec + 3;
      continue;
    }
    const gt = findHtmlTagClose(xml, lt + 1);
    if (gt < 0) return null;
    const tagContent = xml.slice(lt + 1, gt);
    if (!tagContent.startsWith('/')) {
      const nameEnd = tagContent.search(/[\s/]/);
      const tagAttrs = nameEnd >= 0 ? tagContent.slice(nameEnd) : '';
      if (tagAttrs) {
        if (/(?:^|[\s/])on[a-z]+\s*=/i.test(tagAttrs)) return null;
        if (/(?:javascript|vbscript)\s*:/i.test(tagAttrs)) return null;
        if (/data\s*:\s*(?:text\/html|image\/svg\+xml)/i.test(tagAttrs)) return null;
      }
    }
    pos = gt + 1;
  }

  let rootAttrs = xml.slice(5, openEnd);
  if (/\bxmlns\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i.test(rootAttrs)) {
    rootAttrs = rootAttrs.replace(/\bxmlns\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, `xmlns="${MATHML_XMLNS}"`);
  } else {
    rootAttrs = ` xmlns="${MATHML_XMLNS}"` + rootAttrs;
  }
  xml = `<math${rootAttrs}>${inner}</math>`;

  if (Buffer.byteLength(xml, 'utf8') > MAX_MATHML_FRAGMENT_BYTES) return null;
  return xml;
}

function extractMathMlFragmentsFromHtml(html) {
  const spans = scanTopLevelMathElements(html);
  const fragments = [];
  let totalBytes = 0;
  for (const span of spans) {
    if (fragments.length >= MAX_MATHML_FRAGMENTS) break;
    const cleaned = sanitizeMathMlFragment(span.raw);
    if (!cleaned) continue;
    const byteLen = Buffer.byteLength(cleaned, 'utf8');
    if (totalBytes + byteLen > MAX_MATHML_TOTAL_BYTES) break;
    fragments.push(cleaned);
    totalBytes += byteLen;
  }
  return fragments;
}

function extractMathMlAltText(mathXml, index) {
  const openEnd = findHtmlTagClose(String(mathXml || ''), 5);
  const attrs = openEnd > 5 ? String(mathXml).slice(5, openEnd) : '';
  const ariaMatch = /\baria-label\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
  const altMatch = /\balttext\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
  const rawLabel = ariaMatch
    ? (ariaMatch[1] !== undefined ? ariaMatch[1] : ariaMatch[2])
    : (altMatch ? (altMatch[1] !== undefined ? altMatch[1] : altMatch[2]) : '');
  const decodedLabel = decodeEntities(rawLabel);
  if (decodedLabel) return decodedLabel.slice(0, 240);
  const textContent = decodeEntities(
    String(mathXml || '')
      .replace(/<annotation(?:-xml)?\b[^>]*>[\s\S]*?<\/annotation(?:-xml)?>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
  if (textContent) return textContent.slice(0, 240);
  return `Formula ${index + 1}`;
}

function instrumentMathMlForChromiumPdf(html) {
  const src = String(html || '');
  const spans = scanTopLevelMathElements(src);
  if (!spans.length) return { html: src, fragments: [] };

  const fragments = [];
  const edits = [];
  let totalBytes = 0;
  for (const span of spans) {
    if (fragments.length >= MAX_MATHML_FRAGMENTS) break;
    const cleaned = sanitizeMathMlFragment(span.raw);
    if (!cleaned) continue;
    const byteLen = Buffer.byteLength(cleaned, 'utf8');
    if (totalBytes + byteLen > MAX_MATHML_TOTAL_BYTES) break;
    const idx = fragments.length;
    fragments.push(cleaned);
    totalBytes += byteLen;

    const altText = extractMathMlAltText(cleaned, idx);
    const openTag = src.slice(span.start, span.openTagEnd);
    let attrs = openTag.slice(5, -1);
    attrs = attrs
      .replace(/\s+\brole\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s+\baria-label\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    const sentinel = `${MATHML_SENTINEL_PREFIX}${idx}__|${altText}`;
    const replacementOpen = `<math${attrs} role="img" aria-label="${xmlEscape(sentinel)}">`;
    edits.push({ start: span.start, end: span.openTagEnd, text: replacementOpen });
  }

  if (!edits.length) return { html: src, fragments: [] };
  let out = '';
  let last = 0;
  for (const edit of edits) {
    out += src.slice(last, edit.start) + edit.text;
    last = edit.end;
  }
  out += src.slice(last);
  return { html: out, fragments };
}

function decodePdfLiteralString(rawInner) {
  let out = '';
  for (let i = 0; i < rawInner.length; i += 1) {
    const ch = rawInner[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    if (i + 1 >= rawInner.length) break;
    const next = rawInner[++i];
    if (next === 'n') out += '\n';
    else if (next === 'r') out += '\r';
    else if (next === 't') out += '\t';
    else if (next === 'b') out += '\b';
    else if (next === 'f') out += '\f';
    else if (next === '\r') {
      if (rawInner[i + 1] === '\n') i += 1;
    } else if (next === '\n') {
      // line continuation
    } else if (/[0-7]/.test(next)) {
      let oct = next;
      if (i + 1 < rawInner.length && /[0-7]/.test(rawInner[i + 1])) oct += rawInner[++i];
      if (i + 1 < rawInner.length && /[0-7]/.test(rawInner[i + 1])) oct += rawInner[++i];
      out += String.fromCharCode(parseInt(oct, 8) & 0xff);
    } else {
      out += next;
    }
  }
  return out;
}

function decodePdfHexString(hexInner) {
  const clean = String(hexInner || '').replace(/\s+/g, '');
  const padded = clean.length % 2 === 1 ? clean + '0' : clean;
  const buf = Buffer.from(padded, 'hex');
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const payload = Buffer.from(buf.subarray(2));
    if (payload.length % 2 === 1) return payload.toString('latin1');
    payload.swap16();
    return payload.toString('utf16le');
  }
  return buf.toString('latin1');
}

function findPdfStringValueAfter(body, keyRegex) {
  const km = keyRegex.exec(body);
  if (!km) return null;
  let pos = km.index + km[0].length;
  while (pos < body.length && /\s/.test(body[pos])) pos += 1;
  if (pos >= body.length) return null;

  if (body[pos] === '<' && body[pos + 1] !== '<') {
    const close = body.indexOf('>', pos + 1);
    if (close < 0) return null;
    return {
      keyStart: km.index,
      start: pos,
      end: close + 1,
      decoded: decodePdfHexString(body.slice(pos + 1, close)),
    };
  }
  if (body[pos] === '(') {
    let depth = 1;
    let i = pos + 1;
    while (i < body.length && depth > 0) {
      if (body[i] === '\\') {
        i += 2;
        continue;
      }
      if (body[i] === '(') depth += 1;
      else if (body[i] === ')') depth -= 1;
      i += 1;
    }
    if (depth !== 0) return null;
    return {
      keyStart: km.index,
      start: pos,
      end: i,
      decoded: decodePdfLiteralString(body.slice(pos + 1, i - 1)),
    };
  }
  return null;
}

function attachAfRefToDictBody(dictBody, refStr) {
  if (/\/AF\s*\[/.test(dictBody)) {
    return dictBody.replace(/\/AF\s*\[([^\]]*)\]/, (_m, inner) => {
      const trimmed = inner.trim();
      return trimmed ? `/AF [${trimmed} ${refStr}]` : `/AF [${refStr}]`;
    });
  }
  if (/\/Type\s*\/StructElem\b/.test(dictBody)) {
    return dictBody.replace(/\/Type\s*\/StructElem\b/, (m) => `${m}\n/AF [${refStr}]`);
  }
  return dictBody.replace(/<<\s*/, (m) => `${m}/AF [${refStr}]\n`);
}

function sanitizeToUnicodeCmapStream(cmapText) {
  if (typeof cmapText !== 'string' || !cmapText.includes('begincmap')) {
    return { text: cmapText, fixedCount: 0 };
  }
  let fixedCount = 0;
  let updated = cmapText.replace(/(\d+)\s+beginbfchar([\s\S]*?)endbfchar/g, (_whole, countStr, block) => {
    const replaced = block.replace(/<([0-9a-fA-F]+)>(\s+)<([0-9a-fA-F]+)>/g, (m, src, ws, dst) => {
      if (/^(?:0000|feff|fffe)$/i.test(dst)) {
        fixedCount += 1;
        return `<${src}>${ws}<200D>`;
      }
      return m;
    });
    return `${countStr} beginbfchar${replaced}endbfchar`;
  });
  updated = updated.replace(/(\d+)\s+beginbfrange([\s\S]*?)endbfrange/g, (_whole, countStr, block) => {
    const replaced = block.replace(
      /(<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*)(?:\[([^\]]*)\]|<([0-9a-fA-F]+)>)/g,
      (m, prefix, lowHex, highHex, arrBody, scalarHex) => {
        if (arrBody !== undefined) {
          let arrChanged = false;
          const nextArr = arrBody.replace(/<([0-9a-fA-F]+)>/g, (am, hex) => {
            if (/^(?:0000|feff|fffe)$/i.test(hex)) {
              fixedCount += 1;
              arrChanged = true;
              return '<200D>';
            }
            return am;
          });
          return arrChanged ? `${prefix}[${nextArr}]` : m;
        }
        const low = parseInt(lowHex, 16);
        const high = parseInt(highHex, 16);
        const span = Number.isFinite(low) && Number.isFinite(high) && high >= low ? (high - low + 1) : 1;
        const startCp = scalarHex.length === 4 ? parseInt(scalarHex, 16) : NaN;
        const crossesForbidden = Number.isFinite(startCp) && (
          startCp === 0
          || (startCp <= 0xFEFF && startCp + span - 1 >= 0xFEFF)
          || (startCp <= 0xFFFE && startCp + span - 1 >= 0xFFFE)
        );
        if (!/^(?:0000|feff|fffe)$/i.test(scalarHex) && !crossesForbidden) return m;
        if (span > 1 && span <= 256 && Number.isFinite(startCp)) {
          const items = [];
          for (let i = 0; i < span; i += 1) {
            const cp = startCp + i;
            if (cp === 0 || cp === 0xFEFF || cp === 0xFFFE) {
              fixedCount += 1;
              items.push('<200D>');
            } else {
              items.push('<' + cp.toString(16).toUpperCase().padStart(4, '0') + '>');
            }
          }
          return `${prefix}[${items.join(' ')}]`;
        }
        fixedCount += 1;
        return `${prefix}<200D>`;
      },
    );
    return `${countStr} beginbfrange${replaced}endbfrange`;
  });
  return { text: updated, fixedCount };
}

function finalizeTaggedPdf(pdfPath, title, pdfuaPart, anchorTexts, opts) {
  const o = opts || {};
  const original = fs.readFileSync(pdfPath);
  const text = original.toString('latin1');

  if (/\/Type\s*\/(?:XRef|ObjStm)\b/.test(text)) {
    throw new Error('Finalize expects a classic xref table without object streams.');
  }
  const startxrefIdx = text.lastIndexOf('startxref');
  if (startxrefIdx < 0) throw new Error('Finalize could not find startxref.');
  const prevStartMatch = /\d+/.exec(text.slice(startxrefIdx + 'startxref'.length));
  if (!prevStartMatch) throw new Error('Finalize could not read the xref offset.');
  const prevStart = Number(prevStartMatch[0]);

  const trailerIdx = text.lastIndexOf('trailer');
  if (trailerIdx < 0) throw new Error('Finalize could not find the trailer.');
  const trailerText = text.slice(trailerIdx, startxrefIdx);
  const sizeMatch = /\/Size\s+(\d+)/.exec(trailerText);
  const rootMatch = /\/Root\s+(\d+)\s+0\s+R/.exec(trailerText);
  if (!sizeMatch || !rootMatch) throw new Error('Finalize could not parse the trailer.');
  const infoMatch = /\/Info\s+(\d+)\s+0\s+R/.exec(trailerText);
  const size = Number(sizeMatch[1]);
  const rootNum = Number(rootMatch[1]);

  // Index every top-level object once (stream-aware so binary payloads containing "endobj" never truncate spans).
  const objectSpans = new Map();
  const headerPattern = /(?:^|[\r\n])(\d+)\s+0\s+obj(?:\s|(?=[<\[(/%]))/g;
  let header;
  while ((header = headerPattern.exec(text)) !== null) {
    const num = Number(header[1]);
    const start = header.index + (/^[\r\n]/.test(header[0]) ? 1 : 0);
    const searchFrom = headerPattern.lastIndex;
    const nextEndobj = text.indexOf('endobj', searchFrom);
    if (nextEndobj < 0) throw new Error(`Finalize found no endobj for object ${num}.`);
    const dictSlice = text.slice(searchFrom, nextEndobj);
    const streamMatch = /(?:^|[\r\n\s>])stream\r?\n/.exec(dictSlice);
    let endIdx = nextEndobj;
    if (streamMatch) {
      const streamDataStart = searchFrom + streamMatch.index + streamMatch[0].length;
      const dictPrefix = dictSlice.slice(0, streamMatch.index);
      const lenMatch = /\/Length\s+(\d+)\b(?!\s+\d+\s+R)/.exec(dictPrefix);
      const minEndstreamPos = lenMatch ? (streamDataStart + Number(lenMatch[1])) : streamDataStart;
      let endstreamIdx = text.indexOf('endstream', minEndstreamPos);
      if (endstreamIdx < 0) endstreamIdx = text.indexOf('endstream', streamDataStart);
      if (endstreamIdx >= 0) {
        const afterStreamEndobj = text.indexOf('endobj', endstreamIdx + 'endstream'.length);
        if (afterStreamEndobj >= 0) endIdx = afterStreamEndobj;
      }
    }
    objectSpans.set(num, { start, end: endIdx + 'endobj'.length });
    headerPattern.lastIndex = endIdx + 'endobj'.length;
  }

  const replacementMap = new Map();
  const setReplacement = (num, bodyBuf) => {
    replacementMap.set(num, Buffer.isBuffer(bodyBuf) ? bodyBuf : Buffer.from(String(bodyBuf), 'latin1'));
  };
  const getObjectText = (num) => {
    if (replacementMap.has(num)) return replacementMap.get(num).toString('latin1');
    const span = objectSpans.get(num);
    return span ? text.slice(span.start, span.end) : '';
  };

  const catalogSpan = objectSpans.get(rootNum);
  if (!catalogSpan) throw new Error('Finalize could not locate the Catalog object.');
  const catalogSource = text.slice(catalogSpan.start, catalogSpan.end);
  if (/\/Metadata\b/.test(catalogSource)) {
    throw new Error('Finalize expects a Catalog without an existing Metadata entry.');
  }

  // Page objects -> content stream object numbers (direct ref or array) + ToUnicode CMaps + StructParents keys.
  const contentNums = new Set();
  const toUnicodeNums = new Set();
  const pageStructParents = new Map();
  for (const [objNum, span] of objectSpans) {
    const body = text.slice(span.start, span.end);
    const tuRef = /\/ToUnicode\s+(\d+)\s+0\s+R\b/.exec(body);
    if (tuRef) toUnicodeNums.add(Number(tuRef[1]));
    if (!/\/Type\s*\/Page\b/.test(body) || /\/Type\s*\/Pages\b/.test(body)) continue;
    const spMatch = /\/StructParents\s+(\d+)\b/.exec(body);
    if (spMatch) pageStructParents.set(objNum, Number(spMatch[1]));
    const direct = /\/Contents\s+(\d+)\s+0\s+R/.exec(body);
    if (direct) {
      contentNums.add(Number(direct[1]));
      continue;
    }
    const array = /\/Contents\s*\[([^\]]*)\]/.exec(body);
    if (array) {
      for (const ref of array[1].matchAll(/(\d+)\s+0\s+R/g)) contentNums.add(Number(ref[1]));
    }
  }
  if (!contentNums.size) throw new Error('Finalize found no page content streams.');

  let wrappedStreams = 0;
  for (const num of contentNums) {
    const span = objectSpans.get(num);
    if (!span) throw new Error(`Finalize could not locate content stream object ${num}.`);
    const body = text.slice(span.start, span.end);
    if (!/\/Filter\s*\/FlateDecode\b/.test(body)) continue;
    const streamIdx = body.indexOf('stream');
    if (streamIdx < 0) continue;
    let dataStart = streamIdx + 'stream'.length;
    if (body[dataStart] === '\r') dataStart += 1;
    if (body[dataStart] === '\n') dataStart += 1;
    const dataEnd = body.lastIndexOf('endstream');
    if (dataEnd < 0) continue;
    const raw = original.subarray(span.start + dataStart, span.start + dataEnd);
    const inflated = zlib.inflateSync(raw, { maxOutputLength: 64 * 1024 * 1024 }).toString('latin1');
    const rewritten = wrapUntaggedPrefix(inflated);
    if (rewritten === null) continue;
    const deflated = zlib.deflateSync(Buffer.from(rewritten, 'latin1'));
    setReplacement(num, Buffer.concat([
      Buffer.from(`${num} 0 obj\n<</Filter /FlateDecode /Length ${deflated.length}>>\nstream\n`, 'latin1'),
      deflated,
      Buffer.from('\nendstream\nendobj\n', 'latin1'),
    ]));
    wrappedStreams += 1;
  }

  /*
   * PDF/UA-1 clause 7.21.7 (testNumber 2): Unicode values in ToUnicode CMaps
   * must be > 0 and never U+FEFF or U+FFFE. Chromium Skia PDF writes `<GID> <0000>`
   * for shaped Indic (e.g. Devanagari) glyphs that are already wrapped in /ActualText.
   * Replace forbidden destinations with <200D> (Zero Width Joiner) so both
   * 7.21.7-1 and 7.21.7-2 pass without altering /ActualText reading order.
   */
  let cmapEntriesFixed = 0;
  for (const num of toUnicodeNums) {
    const span = objectSpans.get(num);
    if (!span) continue;
    const body = text.slice(span.start, span.end);
    const streamIdx = body.indexOf('stream');
    if (streamIdx < 0) continue;
    let dataStart = streamIdx + 'stream'.length;
    if (body[dataStart] === '\r') dataStart += 1;
    if (body[dataStart] === '\n') dataStart += 1;
    const dataEnd = body.lastIndexOf('endstream');
    if (dataEnd < 0) continue;
    const isFlate = /\/Filter\s*\/FlateDecode\b/.test(body);
    let cmapStr;
    try {
      const raw = original.subarray(span.start + dataStart, span.start + dataEnd);
      cmapStr = isFlate ? zlib.inflateSync(raw, { maxOutputLength: 16 * 1024 * 1024 }).toString('latin1') : raw.toString('latin1');
    } catch (_) {
      continue;
    }
    const sanitized = sanitizeToUnicodeCmapStream(cmapStr);
    if (sanitized.fixedCount === 0) continue;
    cmapEntriesFixed += sanitized.fixedCount;
    const outStream = isFlate
      ? zlib.deflateSync(Buffer.from(sanitized.text, 'latin1'))
      : Buffer.from(sanitized.text, 'latin1');
    const dictHeader = isFlate
      ? `<</Filter /FlateDecode /Length ${outStream.length}>>`
      : `<</Length ${outStream.length}>>`;
    setReplacement(num, Buffer.concat([
      Buffer.from(`${num} 0 obj\n${dictHeader}\nstream\n`, 'latin1'),
      outStream,
      Buffer.from('\nendstream\nendobj\n', 'latin1'),
    ]));
  }

  /*
   * PDF/UA-1 7.18.1-2 / 7.18.5-2: every annotation needs an alternate
   * description in /Contents; Chromium writes Link annotations without one.
   * Add /Contents carrying the link's own visible anchor text (fallback: its
   * URI), as a UTF-16BE hex string so no escaping or encoding can corrupt it.
   */
  let linkContentsAdded = 0;
  for (const [num] of objectSpans) {
    const body = getObjectText(num);
    if (!/\/Subtype\s*\/Link\b/.test(body) || /\/Contents\b/.test(body)) continue;
    let actionText = body;
    const actionRef = /\/A\s+(\d+)\s+0\s+R\b/.exec(body);
    if (actionRef) {
      const aBody = getObjectText(Number(actionRef[1]));
      if (aBody) actionText += '\n' + aBody;
    }
    const uri = /\/URI\s*\(((?:[^()\\]|\\.)*)\)/.exec(actionText);
    const uriText = uri ? uri[1].replace(/\\([()\\])/g, '$1') : '';
    let description = (anchorTexts && uriText && anchorTexts.get(uriText)) || uriText;
    if (!description) {
      const destMatch = /\/(?:Dest|D)\s*(?:\(((?:[^()\\]|\\.)*)\)|\/([^\s/\[\]<>()]+))/.exec(actionText);
      const destName = destMatch
        ? (destMatch[1] !== undefined ? destMatch[1].replace(/\\([()\\])/g, '$1') : destMatch[2])
        : '';
      if (destName) {
        const cleanDest = destName.replace(/^#/, '');
        let decodedDest = cleanDest;
        try { decodedDest = decodeURIComponent(cleanDest); } catch (_) {}
        description = (anchorTexts && (anchorTexts.get('#' + cleanDest) || anchorTexts.get('#' + decodedDest)))
          || ('Jump to ' + decodedDest);
      }
    }
    description = description || 'Link';
    setReplacement(num, Buffer.from(
      body.replace(/\/Subtype\s*\/Link\b/, (m) => m + '\n/Contents ' + pdfTextString(description)) + '\n',
      'latin1',
    ));
    linkContentsAdded += 1;
  }

  /*
   * PDF/UA-1 clause 7.1-5: every non-standard structure type must be mapped to
   * a standard one via the StructTreeRoot's /RoleMap. Merge into an existing
   * /RoleMap when present so Chromium partial maps do not leave roles unmapped.
   */
  const structRef = /\/StructTreeRoot\s+(\d+)\s+0\s+R/.exec(catalogSource);
  const structNum = structRef ? Number(structRef[1]) : null;
  const NON_STANDARD_ROLES = { Em: 'Span', Strong: 'Span', Aside: 'Sect', Sub: 'Span', Title: 'H1', FENote: 'Note' };
  const rolesPresent = Object.keys(NON_STANDARD_ROLES).filter(
    (role) => new RegExp(`/S\\s*/${role}\\b`).test(text),
  );
  if (rolesPresent.length) {
    if (structNum === null) throw new Error('Finalize found non-standard roles but no StructTreeRoot.');
    const structSource = getObjectText(structNum);
    if (!structSource) throw new Error('Finalize could not locate the StructTreeRoot object.');
    const inlineRoleMap = /\/RoleMap\s*<<([\s\S]*?)>>/.exec(structSource);
    const indirectRoleMap = !inlineRoleMap ? /\/RoleMap\s+(\d+)\s+0\s+R\b/.exec(structSource) : null;
    if (inlineRoleMap) {
      const missing = rolesPresent.filter((role) => !new RegExp(`/${role}\\b`).test(inlineRoleMap[1]));
      if (missing.length) {
        const extra = missing.map((role) => `/${role} /${NON_STANDARD_ROLES[role]}`).join(' ');
        setReplacement(structNum, Buffer.from(
          structSource.replace(/\/RoleMap\s*<<([\s\S]*?)>>/, (_, inner) => `/RoleMap <<${inner.trim()} ${extra}>>`) + '\n',
          'latin1',
        ));
      }
    } else if (indirectRoleMap) {
      const rmNum = Number(indirectRoleMap[1]);
      const rmSource = getObjectText(rmNum);
      if (rmSource) {
        const missing = rolesPresent.filter((role) => !new RegExp(`/${role}\\b`).test(rmSource));
        if (missing.length) {
          const extra = missing.map((role) => `/${role} /${NON_STANDARD_ROLES[role]}`).join(' ');
          setReplacement(rmNum, Buffer.from(
            rmSource.replace(/>>\s*endobj/, ` ${extra}>>\nendobj`) + '\n',
            'latin1',
          ));
        }
      }
    } else {
      const roleMap = rolesPresent.map((role) => `/${role} /${NON_STANDARD_ROLES[role]}`).join(' ');
      setReplacement(structNum, Buffer.from(
        structSource.replace('/Type /StructTreeRoot', `/Type /StructTreeRoot\n/RoleMap <<${roleMap}>>`) + '\n',
        'latin1',
      ));
    }
  }

  /*
   * PDF/UA-1 clause 7.2-20: an LI element may contain only Lbl and LBody.
   * Insert the missing LBody, re-parent child StructElems, and synchronize
   * /ParentTree entries for any direct integer MCIDs moved into LBody.
   */
  let nextObjectNumber = size;
  const structTypeOf = (objNum) => {
    const src = getObjectText(objNum);
    if (!src) return null;
    const found = /\/S\s*\/(\w+)/.exec(src);
    return found ? found[1] : null;
  };
  const movedMcids = [];
  for (const [num] of objectSpans) {
    const body = getObjectText(num);
    if (!/\/S\s*\/LI\b/.test(body)) continue;
    const pgMatch = /\/Pg\s+(\d+)\s+0\s+R/.exec(body);
    const pgNum = pgMatch ? Number(pgMatch[1]) : null;
    const pgClause = pgMatch ? `\n/Pg ${pgMatch[1]} 0 R` : '';
    const arrayKids = /\/K\s*\[([^\]]*)\]/.exec(body);
    if (arrayKids) {
      // Bail safely if /K [...] contains inline dictionaries (e.g. /Type /MCR) so we never shred
      // their inner object references or page pointers.
      if (arrayKids[1].includes('<<')) continue;
      // Tokenize /K [...] preserving BOTH indirect refs (`N 0 R`) and direct integer MCIDs
      // in their exact document order so mixed `/K [10 0 R 0 12 0 R]` never drops MCIDs.
      const tokens = [];
      const tokenRe = /(\d+)\s+0\s+R|\b(\d+)\b/g;
      let tok;
      while ((tok = tokenRe.exec(arrayKids[1])) !== null) {
        if (tok[1] !== undefined) {
          tokens.push({ kind: 'ref', ref: Number(tok[1]), raw: `${tok[1]} 0 R` });
        } else {
          tokens.push({ kind: 'mcid', mcid: Number(tok[2]), raw: tok[2] });
        }
      }
      const labels = [];
      const existingBodies = [];
      const restTokens = [];
      let hasNonLblRef = false;
      for (const item of tokens) {
        if (item.kind === 'ref') {
          const type = structTypeOf(item.ref);
          if (type === 'Lbl') {
            labels.push(item.raw);
          } else if (type === 'LBody') {
            existingBodies.push(item.raw);
          } else {
            hasNonLblRef = true;
            restTokens.push(item);
          }
        } else {
          restTokens.push(item);
        }
      }
      const needsWrap = hasNonLblRef || (labels.length > 0 && existingBodies.length === 0 && restTokens.length > 0);
      if (!needsWrap || !restTokens.length) continue;
      const bodyNum = nextObjectNumber++;
      setReplacement(bodyNum, Buffer.from(
        `${bodyNum} 0 obj\n<</Type /StructElem\n/S /LBody\n/P ${num} 0 R${pgClause}\n` +
          `/K [${restTokens.map((item) => item.raw).join(' ')}]>>\nendobj\n`,
        'latin1',
      ));
      const newKids = [...labels, ...existingBodies, `${bodyNum} 0 R`].join(' ');
      setReplacement(num, Buffer.from(body.replace(/\/K\s*\[[^\]]*\]/, `/K [${newKids}]`) + '\n', 'latin1'));
      const mcidSet = new Set();
      for (const item of restTokens) {
        if (item.kind === 'mcid') {
          mcidSet.add(item.mcid);
          continue;
        }
        const childBody = getObjectText(item.ref);
        if (!childBody) continue;
        setReplacement(item.ref, Buffer.from(childBody.replace(/\/P\s+\d+\s+0\s+R/, `/P ${bodyNum} 0 R`) + '\n', 'latin1'));
      }
      if (mcidSet.size && pgNum !== null) {
        movedMcids.push({ pgNum, liNum: num, bodyNum, mcids: mcidSet });
      }
      continue;
    }
    // Single indirect-ref /K 15 0 R (non-array): wrap non-Lbl/non-LBody child in /LBody.
    const singleRef = /\/K\s+(\d+)\s+0\s+R\b/.exec(body);
    if (!singleRef) continue;
    const ref = Number(singleRef[1]);
    const type = structTypeOf(ref);
    if (type === 'Lbl' || type === 'LBody') continue;
    const bodyNum = nextObjectNumber++;
    setReplacement(bodyNum, Buffer.from(
      `${bodyNum} 0 obj\n<</Type /StructElem\n/S /LBody\n/P ${num} 0 R${pgClause}\n` +
        `/K ${ref} 0 R>>\nendobj\n`,
      'latin1',
    ));
    setReplacement(num, Buffer.from(body.replace(/\/K\s+\d+\s+0\s+R\b/, `/K ${bodyNum} 0 R`) + '\n', 'latin1'));
    const childBody = getObjectText(ref);
    if (childBody) {
      setReplacement(ref, Buffer.from(childBody.replace(/\/P\s+\d+\s+0\s+R/, `/P ${bodyNum} 0 R`) + '\n', 'latin1'));
    }
  }

  // Keep /ParentTree synchronized with direct integer MCIDs moved from /LI into synthesized /LBody (ISO 32000-1 §14.7.4.4).
  if (movedMcids.length && structNum !== null) {
    const movesByStructParents = new Map();
    for (const move of movedMcids) {
      const spKey = pageStructParents.get(move.pgNum);
      if (spKey === undefined) continue;
      if (!movesByStructParents.has(spKey)) movesByStructParents.set(spKey, []);
      movesByStructParents.get(spKey).push(move);
    }
    if (movesByStructParents.size) {
      const patchMcidArrayText = (arrText, moves) => {
        const entries = [];
        const entryRe = /(\d+\s+0\s+R|\bnull\b)/g;
        let em;
        while ((em = entryRe.exec(arrText)) !== null) entries.push(em[1]);
        let changed = false;
        for (const move of moves) {
          const fromRef = `${move.liNum} 0 R`;
          const toRef = `${move.bodyNum} 0 R`;
          for (const mcid of move.mcids) {
            if (mcid >= 0 && mcid < entries.length && entries[mcid] === fromRef) {
              entries[mcid] = toRef;
              changed = true;
            }
          }
        }
        return changed ? entries.join(' ') : null;
      };
      const structSource = getObjectText(structNum);
      const ptRef = /\/ParentTree\s+(\d+)\s+0\s+R\b/.exec(structSource);
      const queue = ptRef ? [Number(ptRef[1])] : [];
      const visited = new Set();
      while (queue.length) {
        const nodeNum = queue.shift();
        if (visited.has(nodeNum)) continue;
        visited.add(nodeNum);
        let nodeText = getObjectText(nodeNum);
        if (!nodeText) continue;
        const kidsM = /\/Kids\s*\[([^\]]*)\]/.exec(nodeText);
        if (kidsM) {
          for (const km of kidsM[1].matchAll(/(\d+)\s+0\s+R/g)) queue.push(Number(km[1]));
        }
        const numsIdx = nodeText.search(/\/Nums\s*\[/);
        if (numsIdx < 0) continue;
        const openBracket = nodeText.indexOf('[', numsIdx);
        if (openBracket < 0) continue;
        let depth = 0;
        let closeBracket = -1;
        for (let ci = openBracket; ci < nodeText.length; ci += 1) {
          if (nodeText[ci] === '[') depth += 1;
          else if (nodeText[ci] === ']') {
            depth -= 1;
            if (depth === 0) { closeBracket = ci; break; }
          }
        }
        if (closeBracket < 0) continue;
        const numsInner = nodeText.slice(openBracket + 1, closeBracket);
        const pairRe = /(\d+)\s+(?:(\d+)\s+0\s+R|\[([^\]]*)\])/g;
        let nodeChanged = false;
        const updatedNumsInner = numsInner.replace(pairRe, (full, keyStr, refStr, inlineArr) => {
          const spKey = Number(keyStr);
          const moves = movesByStructParents.get(spKey);
          if (!moves) return full;
          if (refStr !== undefined) {
            const arrNum = Number(refStr);
            const arrObjText = getObjectText(arrNum);
            const arrMatch = /\[([^\]]*)\]/.exec(arrObjText);
            if (arrMatch) {
              const patched = patchMcidArrayText(arrMatch[1], moves);
              if (patched !== null) {
                setReplacement(arrNum, Buffer.from(arrObjText.replace(/\[[^\]]*\]/, `[${patched}]`) + '\n', 'latin1'));
              }
            }
            return full;
          }
          if (inlineArr !== undefined) {
            const patched = patchMcidArrayText(inlineArr, moves);
            if (patched !== null) {
              nodeChanged = true;
              return `${keyStr} [${patched}]`;
            }
          }
          return full;
        });
        if (nodeChanged) {
          nodeText = nodeText.slice(0, openBracket + 1) + updatedNumsInner + nodeText.slice(closeBracket);
          setReplacement(nodeNum, Buffer.from(nodeText + '\n', 'latin1'));
        }
      }
    }
  }

  /*
   * PDF/UA-1 clause 7.3-1: every /Figure StructElem must carry /Alt or /ActualText.
   * For standard HTML <figure><img alt="..."><figcaption>...</figcaption></figure>,
   * Chromium emits an inner /Figure WITH /Alt wrapped inside an outer /Figure
   * WITHOUT /Alt. Re-tag only such wrapper /Figure elements as /Div (leaving real
   * alt-less figures untouched so missing alt text is never silently masked).
   */
  let figureWrappersNormalized = 0;
  for (const [num] of objectSpans) {
    const body = getObjectText(num);
    if (!/\/S\s*\/Figure\b/.test(body) || /\/(?:Alt|ActualText)\b/.test(body)) continue;
    const childRefs = [];
    const arrayKids = /\/K\s*\[([^\]]*)\]/.exec(body);
    if (arrayKids) {
      if (arrayKids[1].includes('<<')) continue;
      for (const m of arrayKids[1].matchAll(/(\d+)\s+0\s+R/g)) childRefs.push(Number(m[1]));
    } else {
      const singleRef = /\/K\s+(\d+)\s+0\s+R\b/.exec(body);
      if (singleRef) childRefs.push(Number(singleRef[1]));
    }
    if (!childRefs.length) continue;
    const hasChildFigureWithAlt = childRefs.some((refNum) => {
      const childBody = getObjectText(refNum);
      return Boolean(childBody && /\/S\s*\/Figure\b/.test(childBody) && /\/Alt\b/.test(childBody));
    });
    if (!hasChildFigureWithAlt) continue;
    setReplacement(num, Buffer.from(body.replace(/\/S\s*\/Figure\b/, '/S /Div') + '\n', 'latin1'));
    figureWrappersNormalized += 1;
  }

  /*
   * PDF/UA-2 MathML Associated Files (/AF) pass (verified 106/106 compliant on veraPDF PDF/UA-1):
   * Embeds each sanitized Presentation/Content MathML fragment as an /EmbeddedFile
   * (/Subtype /application#2Fmathml+xml) with a /Filespec (/F, /UF, /Desc, /AFRelationship /Supplement, /EF),
   * links /AF [filespecRef] onto the corresponding /S /Formula StructElem (upgrading Chromium's
   * sentinel-tagged <math> elements cleanly to /S /Formula with restored /Alt text, or matching
   * existing /Formula, math /Figure / /Div, or /Document fallbacks), and registers all filespecs
   * in Catalog /Names /EmbeddedFiles (lexicographically sorted per ISO 32000-1 §7.9.6).
   */
  const wantMathMlAf = o.attachMathMlAf !== false;
  const validMathFragments = [];
  if (wantMathMlAf && Array.isArray(o.mathMlFragments) && o.mathMlFragments.length) {
    let totalMathBytes = 0;
    for (const rawFrag of o.mathMlFragments) {
      if (validMathFragments.length >= MAX_MATHML_FRAGMENTS) break;
      const cleaned = sanitizeMathMlFragment(rawFrag);
      if (!cleaned) continue;
      const fragBytes = Buffer.byteLength(cleaned, 'utf8');
      if (totalMathBytes + fragBytes > MAX_MATHML_TOTAL_BYTES) break;
      validMathFragments.push(cleaned);
      totalMathBytes += fragBytes;
    }
  }

  const sentinelTargets = new Map();
  for (const [num] of objectSpans) {
    const body = getObjectText(num);
    if (!/\/Type\s*\/StructElem\b/.test(body) || !/\/Alt\b/.test(body)) continue;
    const altVal = findPdfStringValueAfter(body, /\/Alt\b/);
    if (!altVal || !altVal.decoded.startsWith(MATHML_SENTINEL_PREFIX)) continue;
    const rest = altVal.decoded.slice(MATHML_SENTINEL_PREFIX.length);
    const sep = rest.indexOf('__|');
    if (sep < 0) continue;
    const idx = Number(rest.slice(0, sep));
    const cleanAlt = rest.slice(sep + 3);
    if (Number.isInteger(idx) && idx >= 0 && idx < validMathFragments.length && !sentinelTargets.has(idx)) {
      sentinelTargets.set(idx, { num, cleanAlt });
    } else {
      const restored = body.slice(0, altVal.start) + pdfTextString(cleanAlt || 'Formula') + body.slice(altVal.end);
      setReplacement(num, Buffer.from(restored + '\n', 'latin1'));
    }
  }

  let mathMlAfAttached = 0;
  const attachedMathSpecs = [];
  const catalogAfRefs = [];
  if (validMathFragments.length) {
    for (let idx = 0; idx < validMathFragments.length; idx += 1) {
      const mathXml = validMathFragments[idx];
      const mathBuf = Buffer.from(mathXml, 'utf8');
      const filename = `formula-${idx + 1}.mml`;
      const desc = `MathML representation of formula ${idx + 1}`;
      const efNum = nextObjectNumber++;
      setReplacement(efNum, Buffer.concat([
        Buffer.from(
          `${efNum} 0 obj\n<</Type /EmbeddedFile /Subtype /application#2Fmathml+xml /Length ${mathBuf.length} /Params <</Size ${mathBuf.length}>>>>\nstream\n`,
          'latin1',
        ),
        mathBuf,
        Buffer.from('\nendstream\nendobj\n', 'latin1'),
      ]));
      const fsNum = nextObjectNumber++;
      setReplacement(fsNum, Buffer.from(
        `${fsNum} 0 obj\n<</Type /Filespec /F (${filename}) /UF (${filename}) /Desc (${desc}) /AFRelationship /Supplement /EF <</F ${efNum} 0 R /UF ${efNum} 0 R>>>>\nendobj\n`,
        'latin1',
      ));
      attachedMathSpecs.push({ idx, filename, efNum, fsNum, mathXml, linkedStructNum: null });
    }

    const usedStructNums = new Set();

    // Pass 1: Bind sentinel-tagged Chromium <math> elements -> /S /Formula + clean /Alt + /AF.
    for (const spec of attachedMathSpecs) {
      const target = sentinelTargets.get(spec.idx);
      if (!target) continue;
      let body = getObjectText(target.num);
      const altVal = findPdfStringValueAfter(body, /\/Alt\b/);
      const finalAlt = target.cleanAlt || extractMathMlAltText(spec.mathXml, spec.idx);
      if (altVal) {
        body = body.slice(0, altVal.start) + pdfTextString(finalAlt) + body.slice(altVal.end);
      } else {
        body = body.replace(/\/Type\s*\/StructElem\b/, (m) => `${m}\n/Alt ${pdfTextString(finalAlt)}`);
      }
      body = body.replace(/\/S\s*\/\w+/, '/S /Formula');
      body = attachAfRefToDictBody(body, `${spec.fsNum} 0 R`);
      setReplacement(target.num, Buffer.from(body + '\n', 'latin1'));
      spec.linkedStructNum = target.num;
      usedStructNums.add(target.num);
    }

    // Pass 2: Bind remaining specs to existing /S /Formula StructElems in document order.
    const existingFormulaNums = [];
    for (const [num] of objectSpans) {
      if (usedStructNums.has(num)) continue;
      const body = getObjectText(num);
      if (/\/Type\s*\/StructElem\b/.test(body) && /\/S\s*\/Formula\b/.test(body)) {
        existingFormulaNums.push(num);
      }
    }
    let formulaCursor = 0;
    for (const spec of attachedMathSpecs) {
      if (spec.linkedStructNum !== null) continue;
      if (formulaCursor >= existingFormulaNums.length) break;
      const targetNum = existingFormulaNums[formulaCursor++];
      let body = getObjectText(targetNum);
      if (!/\/(?:Alt|ActualText)\b/.test(body)) {
        const fallbackAlt = extractMathMlAltText(spec.mathXml, spec.idx);
        body = body.replace(/\/S\s*\/Formula\b/, (m) => `${m}\n/Alt ${pdfTextString(fallbackAlt)}`);
      }
      body = attachAfRefToDictBody(body, `${spec.fsNum} 0 R`);
      setReplacement(targetNum, Buffer.from(body + '\n', 'latin1'));
      spec.linkedStructNum = targetNum;
      usedStructNums.add(targetNum);
    }

    // Pass 3: Fallback for un-instrumented PDFs — math-labeled /Figure or /Div, then /Document + Catalog /AF.
    const unlinkedAfterFormula = attachedMathSpecs.filter((s) => s.linkedStructNum === null);
    if (unlinkedAfterFormula.length) {
      const mathFallbackNums = [];
      let documentStructNum = null;
      for (const [num] of objectSpans) {
        if (usedStructNums.has(num)) continue;
        const body = getObjectText(num);
        if (!/\/Type\s*\/StructElem\b/.test(body)) continue;
        if (documentStructNum === null && /\/S\s*\/Document\b/.test(body)) {
          documentStructNum = num;
        }
        if (/\/S\s*\/(?:Figure|Div)\b/.test(body)) {
          const altVal = findPdfStringValueAfter(body, /\/Alt\b/);
          const tVal = findPdfStringValueAfter(body, /\/T\b/);
          const label = ((altVal && altVal.decoded) || '') + ' ' + ((tVal && tVal.decoded) || '');
          if (/\b(?:math|formula|equation)\b/i.test(label)) {
            mathFallbackNums.push(num);
          }
        }
      }
      let fbCursor = 0;
      for (const spec of unlinkedAfterFormula) {
        if (fbCursor < mathFallbackNums.length) {
          const targetNum = mathFallbackNums[fbCursor++];
          const body = attachAfRefToDictBody(getObjectText(targetNum), `${spec.fsNum} 0 R`);
          setReplacement(targetNum, Buffer.from(body + '\n', 'latin1'));
          spec.linkedStructNum = targetNum;
          usedStructNums.add(targetNum);
        } else {
          if (documentStructNum !== null) {
            const docBody = attachAfRefToDictBody(getObjectText(documentStructNum), `${spec.fsNum} 0 R`);
            setReplacement(documentStructNum, Buffer.from(docBody + '\n', 'latin1'));
            spec.linkedStructNum = documentStructNum;
          }
          catalogAfRefs.push(`${spec.fsNum} 0 R`);
        }
      }
    }

    mathMlAfAttached = attachedMathSpecs.length;
  }

  const metadataNum = nextObjectNumber++;
  const xmp = buildXmpPacket(title, pdfuaPart);
  setReplacement(metadataNum, Buffer.concat([
    Buffer.from(`${metadataNum} 0 obj\n<</Type /Metadata /Subtype /XML /Length ${xmp.length}>>\nstream\n`, 'latin1'),
    xmp,
    Buffer.from('\nendstream\nendobj\n', 'latin1'),
  ]));
  let updatedCatalog = getObjectText(rootNum).replace('/Type /Catalog', `/Type /Catalog\n/Metadata ${metadataNum} 0 R`);
  if (!/\/ViewerPreferences\b/.test(updatedCatalog)) {
    updatedCatalog = updatedCatalog.replace('/Type /Catalog', '/Type /Catalog\n/ViewerPreferences <</DisplayDocTitle true>>');
  }
  if (attachedMathSpecs.length) {
    const sortedSpecs = [...attachedMathSpecs].sort((a, b) => (a.filename < b.filename ? -1 : (a.filename > b.filename ? 1 : 0)));
    const efTreeNum = nextObjectNumber++;
    const namesEntries = sortedSpecs.map((s) => `(${s.filename}) ${s.fsNum} 0 R`).join(' ');
    setReplacement(efTreeNum, Buffer.from(
      `${efTreeNum} 0 obj\n<</Names [${namesEntries}]>>\nendobj\n`,
      'latin1',
    ));
    const indirectNames = /\/Names\s+(\d+)\s+0\s+R\b/.exec(updatedCatalog);
    const inlineNames = !indirectNames ? /\/Names\s*<<([\s\S]*?)>>/.exec(updatedCatalog) : null;
    if (indirectNames) {
      const namesNum = Number(indirectNames[1]);
      const namesSrc = getObjectText(namesNum);
      if (namesSrc) {
        const nextNamesSrc = /\/EmbeddedFiles\b/.test(namesSrc)
          ? namesSrc.replace(/\/EmbeddedFiles\s+(?:\d+\s+0\s+R|<<[\s\S]*?>>)/, `/EmbeddedFiles ${efTreeNum} 0 R`)
          : namesSrc.replace(/>>\s*endobj/, ` /EmbeddedFiles ${efTreeNum} 0 R>>\nendobj`);
        setReplacement(namesNum, Buffer.from(nextNamesSrc + '\n', 'latin1'));
      }
    } else if (inlineNames) {
      updatedCatalog = updatedCatalog.replace(
        /\/Names\s*<<([\s\S]*?)>>/,
        (_m, inner) => (/\/EmbeddedFiles\b/.test(inner)
          ? `/Names <<${inner.replace(/\/EmbeddedFiles\s+(?:\d+\s+0\s+R|<<[\s\S]*?>>)/, `/EmbeddedFiles ${efTreeNum} 0 R`)}>>`
          : `/Names <<${inner.trim()} /EmbeddedFiles ${efTreeNum} 0 R>>`),
      );
    } else {
      updatedCatalog = updatedCatalog.replace('/Type /Catalog', `/Type /Catalog\n/Names <</EmbeddedFiles ${efTreeNum} 0 R>>`);
    }
    if (catalogAfRefs.length) {
      updatedCatalog = attachAfRefToDictBody(updatedCatalog, catalogAfRefs.join(' '));
    }
  }
  setReplacement(rootNum, Buffer.from(updatedCatalog + '\n', 'latin1'));

  // Append the update: deduplicated objects, then a classic xref with /Prev.
  const pieces = [original];
  let cursor = original.length;
  if (original[original.length - 1] !== 0x0a) {
    pieces.push(Buffer.from('\n', 'latin1'));
    cursor += 1;
  }
  const offsets = new Map();
  for (const [num, body] of [...replacementMap.entries()].sort((a, b) => a[0] - b[0])) {
    offsets.set(num, cursor);
    pieces.push(body);
    cursor += body.length;
  }

  const numbers = [...offsets.keys()].sort((a, b) => a - b);
  let xref = 'xref\n';
  let run = [numbers[0]];
  const flushRun = () => {
    xref += `${run[0]} ${run.length}\n`;
    for (const num of run) {
      xref += `${String(offsets.get(num)).padStart(10, '0')} 00000 n\r\n`;
    }
  };
  for (let i = 1; i < numbers.length; i += 1) {
    if (numbers[i] === run[run.length - 1] + 1) run.push(numbers[i]);
    else { flushRun(); run = [numbers[i]]; }
  }
  flushRun();

  const newSize = Math.max(size, nextObjectNumber);
  let trailer = `trailer\n<</Size ${newSize}\n/Root ${rootNum} 0 R\n`;
  if (infoMatch) trailer += `/Info ${Number(infoMatch[1])} 0 R\n`;
  trailer += `/Prev ${prevStart}>>\nstartxref\n${cursor}\n%%EOF\n`;
  pieces.push(Buffer.from(xref + trailer, 'latin1'));

  fs.writeFileSync(pdfPath, Buffer.concat(pieces));
  return {
    wrappedContentStreams: wrappedStreams,
    cmapEntriesFixed,
    metadataAdded: true,
    linkContentsAdded,
    figureWrappersNormalized,
    mathMlAfAttached,
    pdfuaIdentifierClaimed: Boolean(pdfuaPart),
  };
}

function structuralMarkers(pdfPath) {
  const bytes = fs.readFileSync(pdfPath);
  const text = bytes.toString('latin1');
  return {
    structTreeRoot: text.includes('/StructTreeRoot'),
    markInfo: text.includes('/MarkInfo'),
    marked: /\/Marked\s+true\b/.test(text),
    language: text.includes('/Lang'),
    title: text.includes('/Title'),
    xmpMetadata: /\/Type\s*\/Metadata\b/.test(text),
  };
}

async function render() {
  const input = validateInputs(arg('--html'), arg('--pdf'));
  const pdfuaIdArg = arg('--pdfua-id') || 'none';
  if (!['1', 'none'].includes(pdfuaIdArg)) {
    throw new Error('--pdfua-id must be "1" or "none".');
  }
  const pdfuaPart = pdfuaIdArg === '1' ? 1 : null;
  const disableFinalize = process.env.ALLOFLOW_PORTABLE_DISABLE_UA_FINALIZE === '1';
  const attachMathMlAf = !disableFinalize && !process.argv.includes('--no-mathml-af');
  const mathInstrumented = attachMathMlAf
    ? instrumentMathMlForChromiumPdf(input.html)
    : { html: input.html, fragments: [] };
  const loaded = loadPlaywright();
  if (!loaded) throw new Error('A local Playwright or Playwright Core package is required.');

  let browser;
  let blockedNetworkRequests = 0;
  try {
    browser = await loaded.api.chromium.launch(browserLaunchOptions());
    const context = await browser.newContext({
      javaScriptEnabled: false,
      serviceWorkers: 'block',
    });
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();
      if (url === 'about:blank' || (url.startsWith('data:') && request.resourceType() !== 'document')) {
        await route.continue();
      } else {
        blockedNetworkRequests += 1;
        await route.abort('blockedbyclient');
      }
    });
    const page = await context.newPage();
    await page.setContent(mathInstrumented.html, { waitUntil: 'load', timeout: 30_000 });
    await page.emulateMedia({ media: 'print', colorScheme: 'light', reducedMotion: 'reduce' });
    await page.pdf({
      path: input.pdfPath,
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
      outline: true,
    });
    await context.close();
  } catch (error) {
    try {
      if (fs.existsSync(input.pdfPath)) fs.rmSync(input.pdfPath, { force: true });
    } catch (_) {}
    throw error;
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }

  let markers = structuralMarkers(input.pdfPath);
  if (!markers.structTreeRoot || !markers.markInfo || !markers.marked) {
    try { fs.rmSync(input.pdfPath, { force: true }); } catch (_) {}
    throw new Error('Chromium returned PDF bytes without the required tagged-PDF structural markers.');
  }

  let finalize;
  if (disableFinalize) {
    // Test/debug escape hatch: ship Chromium's raw output, which is known to
    // fail PDF/UA-1 (untagged background paint, no XMP metadata).
    finalize = {
      skipped: true,
      reason: 'Disabled by ALLOFLOW_PORTABLE_DISABLE_UA_FINALIZE.',
      pdfuaIdentifierClaimed: false,
    };
  } else {
    try {
      finalize = finalizeTaggedPdf(
        input.pdfPath,
        extractHtmlTitle(input.html),
        pdfuaPart,
        extractAnchorTexts(input.html),
        { mathMlFragments: mathInstrumented.fragments, attachMathMlAf },
      );
      markers = structuralMarkers(input.pdfPath);
    } catch (error) {
      // The un-finalized PDF is still a valid tagged PDF; keep it and disclose.
      finalize = { skipped: true, reason: compactError(error), pdfuaIdentifierClaimed: false };
    }
  }

  return {
    ok: true,
    bytes: fs.statSync(input.pdfPath).size,
    structuralMarkers: markers,
    pdfUaFinalization: finalize,
    blockedNetworkRequests,
    networkPolicy: 'deny',
  };
}

async function main() {
  if (process.argv.includes('--capabilities')) {
    output(await capabilities());
    return;
  }
  try {
    output(await render());
  } catch (error) {
    output({ ok: false, error: compactError(error), networkPolicy: 'deny' }, 2);
  }
}

module.exports = {
  MAX_MATHML_FRAGMENTS,
  MAX_MATHML_FRAGMENT_BYTES,
  MAX_MATHML_TOTAL_BYTES,
  MATHML_XMLNS,
  wrapUntaggedPrefix,
  xmlEscape,
  buildXmpPacket,
  decodeEntities,
  extractAnchorTexts,
  pdfTextString,
  extractHtmlTitle,
  sanitizeMathMlFragment,
  extractMathMlFragmentsFromHtml,
  instrumentMathMlForChromiumPdf,
  sanitizeToUnicodeCmapStream,
  finalizeTaggedPdf,
  structuralMarkers,
};

if (require.main === module) {
  main();
}
