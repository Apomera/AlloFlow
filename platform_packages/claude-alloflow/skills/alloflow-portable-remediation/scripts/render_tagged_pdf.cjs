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

function finalizeTaggedPdf(pdfPath, title, pdfuaPart, anchorTexts) {
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
    await page.setContent(input.html, { waitUntil: 'load', timeout: 30_000 });
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
  if (process.env.ALLOFLOW_PORTABLE_DISABLE_UA_FINALIZE === '1') {
    // Test/debug escape hatch: ship Chromium's raw output, which is known to
    // fail PDF/UA-1 (untagged background paint, no XMP metadata).
    finalize = {
      skipped: true,
      reason: 'Disabled by ALLOFLOW_PORTABLE_DISABLE_UA_FINALIZE.',
      pdfuaIdentifierClaimed: false,
    };
  } else {
    try {
      finalize = finalizeTaggedPdf(input.pdfPath, extractHtmlTitle(input.html), pdfuaPart, extractAnchorTexts(input.html));
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
  wrapUntaggedPrefix,
  xmlEscape,
  buildXmpPacket,
  decodeEntities,
  extractAnchorTexts,
  pdfTextString,
  extractHtmlTitle,
  sanitizeToUnicodeCmapStream,
  finalizeTaggedPdf,
  structuralMarkers,
};

if (require.main === module) {
  main();
}
