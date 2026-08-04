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

function executableReady(chromium) {
  try {
    const bundled = chromium.executablePath();
    if (bundled && fs.existsSync(bundled)) return { ready: true, executablePath: bundled };
  } catch (_) {}
  const configured = process.env.ALLOFLOW_CHROMIUM_PATH;
  if (configured && fs.existsSync(configured)) {
    return { ready: true, executablePath: path.resolve(configured) };
  }
  return {
    ready: false,
    reason: 'Playwright is present but no local Chromium executable was found.',
  };
}

function capabilities() {
  const loaded = loadPlaywright();
  if (!loaded) {
    return {
      available: false,
      reason: 'A local Playwright or Playwright Core package is required.',
      networkPolicy: 'deny',
    };
  }
  const executable = executableReady(loaded.api.chromium);
  if (!executable.ready) {
    return {
      available: false,
      reason: executable.reason,
      package: loaded.packageName,
      networkPolicy: 'deny',
    };
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
  if (fs.existsSync(resolvedPdf)) throw new Error('Refusing to overwrite an existing PDF.');
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
  return String(value)
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
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
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
  const anchorPattern = /<a\s[^>]*href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html)) !== null) {
    const text = decodeEntities(match[2].replace(/<[^>]+>/g, ''));
    if (text && !map.has(match[1])) map.set(match[1], text);
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
  const text = match[1]
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text || 'Accessible document';
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

  // Index every top-level object once.
  const objectSpans = new Map();
  const headerPattern = /(?:^|[\r\n])(\d+)\s+0\s+obj\b/g;
  let header;
  while ((header = headerPattern.exec(text)) !== null) {
    const num = Number(header[1]);
    const start = header.index + (/^[\r\n]/.test(header[0]) ? 1 : 0);
    const endIdx = text.indexOf('endobj', headerPattern.lastIndex);
    if (endIdx < 0) throw new Error(`Finalize found no endobj for object ${num}.`);
    objectSpans.set(num, { start, end: endIdx + 'endobj'.length });
    headerPattern.lastIndex = endIdx;
  }

  const catalogSpan = objectSpans.get(rootNum);
  if (!catalogSpan) throw new Error('Finalize could not locate the Catalog object.');
  const catalogSource = text.slice(catalogSpan.start, catalogSpan.end);
  if (/\/Metadata\b/.test(catalogSource)) {
    throw new Error('Finalize expects a Catalog without an existing Metadata entry.');
  }

  // Page objects -> content stream object numbers (direct ref or array).
  const contentNums = new Set();
  for (const [, span] of objectSpans) {
    const body = text.slice(span.start, span.end);
    if (!/\/Type\s*\/Page\b/.test(body) || /\/Type\s*\/Pages\b/.test(body)) continue;
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

  const replacements = []; // { num, body: Buffer }
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
    const raw = original.slice(span.start + dataStart, span.start + dataEnd);
    const inflated = zlib.inflateSync(raw).toString('latin1');
    const rewritten = wrapUntaggedPrefix(inflated);
    if (rewritten === null) continue;
    const deflated = zlib.deflateSync(Buffer.from(rewritten, 'latin1'));
    replacements.push({
      num,
      body: Buffer.concat([
        Buffer.from(`${num} 0 obj\n<</Filter /FlateDecode /Length ${deflated.length}>>\nstream\n`, 'latin1'),
        deflated,
        Buffer.from('\nendstream\nendobj\n', 'latin1'),
      ]),
    });
    wrappedStreams += 1;
  }

  /*
   * PDF/UA-1 7.18.1-2 / 7.18.5-2: every annotation needs an alternate
   * description in /Contents; Chromium writes Link annotations without one.
   * Add /Contents carrying the link's own visible anchor text (fallback: its
   * URI), as a UTF-16BE hex string so no escaping or encoding can corrupt it.
   */
  let linkContentsAdded = 0;
  for (const [num, span] of objectSpans) {
    const body = text.slice(span.start, span.end);
    if (!/\/Subtype\s*\/Link\b/.test(body) || /\/Contents\b/.test(body)) continue;
    const uri = /\/URI\s*\(((?:[^()\\]|\\.)*)\)/.exec(body);
    const uriText = uri ? uri[1].replace(/\\([()\\])/g, '$1') : '';
    const description = (anchorTexts && anchorTexts.get(uriText)) || uriText || 'Link';
    replacements.push({
      num,
      body: Buffer.from(
        body.replace(/\/Subtype\s*\/Link\b/, (m) => m + '\n/Contents ' + pdfTextString(description)) + '\n',
        'latin1',
      ),
    });
    linkContentsAdded += 1;
  }

  /*
   * PDF/UA-1 clause 7.1-5: every non-standard structure type must be mapped to
   * a standard one via the StructTreeRoot's /RoleMap. Chromium emits HTML
   * <em> and <strong> as literal /Em and /Strong types and writes no RoleMap,
   * so inline emphasis failed validation until this existed (corpus round 5).
   */
  const NON_STANDARD_ROLES = { Em: 'Span', Strong: 'Span' };
  const rolesPresent = Object.keys(NON_STANDARD_ROLES).filter(
    (role) => new RegExp(`/S\\s*/${role}\\b`).test(text),
  );
  if (rolesPresent.length) {
    const structRef = /\/StructTreeRoot\s+(\d+)\s+0\s+R/.exec(catalogSource);
    if (!structRef) throw new Error('Finalize found non-standard roles but no StructTreeRoot.');
    const structNum = Number(structRef[1]);
    const structSpan = objectSpans.get(structNum);
    if (!structSpan) throw new Error('Finalize could not locate the StructTreeRoot object.');
    const structSource = text.slice(structSpan.start, structSpan.end);
    if (!/\/RoleMap\b/.test(structSource)) {
      const roleMap = rolesPresent.map((role) => `/${role} /${NON_STANDARD_ROLES[role]}`).join(' ');
      replacements.push({
        num: structNum,
        body: Buffer.from(
          structSource.replace('/Type /StructTreeRoot', `/Type /StructTreeRoot\n/RoleMap <<${roleMap}>>`) + '\n',
          'latin1',
        ),
      });
    }
  }

  /*
   * PDF/UA-1 clause 7.2-20: an LI element may contain only Lbl and LBody.
   * Chromium never emits LBody at all - with plain text that is benign, but
   * any inline element inside <li> (from inline emphasis) becomes a direct
   * child of LI and fails validation, and no HTML wrapper avoids it. Insert
   * the missing LBody: move every non-Lbl child into a new LBody element and
   * re-parent it. Structure only - no content, MCIDs, or ParentTree entries
   * move, so the page content stream is untouched (corpus round 5).
   */
  let nextObjectNumber = size;
  const structTypeOf = (objNum) => {
    const span = objectSpans.get(objNum);
    if (!span) return null;
    const found = /\/S\s*\/(\w+)/.exec(text.slice(span.start, span.end));
    return found ? found[1] : null;
  };
  for (const [num, span] of objectSpans) {
    const body = text.slice(span.start, span.end);
    if (!/\/S\s*\/LI\b/.test(body)) continue;
    const kids = /\/K\s*\[([^\]]*)\]/.exec(body);
    if (!kids) continue;
    const refs = [...kids[1].matchAll(/(\d+)\s+0\s+R/g)].map((m) => Number(m[1]));
    const labels = refs.filter((ref) => structTypeOf(ref) === 'Lbl');
    const rest = refs.filter((ref) => {
      const type = structTypeOf(ref);
      return type !== 'Lbl' && type !== 'LBody';
    });
    if (!rest.length) continue;
    const bodyNum = nextObjectNumber++;
    replacements.push({
      num: bodyNum,
      body: Buffer.from(
        `${bodyNum} 0 obj\n<</Type /StructElem\n/S /LBody\n/P ${num} 0 R\n` +
          `/K [${rest.map((ref) => `${ref} 0 R`).join(' ')}]>>\nendobj\n`,
        'latin1',
      ),
    });
    const newKids = [...labels.map((ref) => `${ref} 0 R`), `${bodyNum} 0 R`].join(' ');
    replacements.push({
      num,
      body: Buffer.from(body.replace(/\/K\s*\[[^\]]*\]/, `/K [${newKids}]`) + '\n', 'latin1'),
    });
    for (const ref of rest) {
      const childSpan = objectSpans.get(ref);
      if (!childSpan) continue;
      const childBody = text.slice(childSpan.start, childSpan.end);
      replacements.push({
        num: ref,
        body: Buffer.from(childBody.replace(/\/P\s+\d+\s+0\s+R/, `/P ${bodyNum} 0 R`) + '\n', 'latin1'),
      });
    }
  }

  const metadataNum = nextObjectNumber++;
  const xmp = buildXmpPacket(title, pdfuaPart);
  replacements.push({
    num: metadataNum,
    body: Buffer.concat([
      Buffer.from(`${metadataNum} 0 obj\n<</Type /Metadata /Subtype /XML /Length ${xmp.length}>>\nstream\n`, 'latin1'),
      xmp,
      Buffer.from('\nendstream\nendobj\n', 'latin1'),
    ]),
  });
  replacements.push({
    num: rootNum,
    body: Buffer.from(
      catalogSource.replace('/Type /Catalog', `/Type /Catalog\n/Metadata ${metadataNum} 0 R`) + '\n',
      'latin1',
    ),
  });

  // Append the update: objects, then a classic xref with /Prev.
  const pieces = [original];
  let cursor = original.length;
  if (original[original.length - 1] !== 0x0a) {
    pieces.push(Buffer.from('\n', 'latin1'));
    cursor += 1;
  }
  const offsets = new Map();
  for (const replacement of replacements.sort((a, b) => a.num - b.num)) {
    offsets.set(replacement.num, cursor);
    pieces.push(replacement.body);
    cursor += replacement.body.length;
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
  const executable = executableReady(loaded.api.chromium);
  if (!executable.ready) throw new Error(executable.reason);

  let browser;
  let blockedNetworkRequests = 0;
  try {
    browser = await loaded.api.chromium.launch({
      headless: true,
      executablePath: executable.executablePath,
      args: [
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-domain-reliability',
        '--disable-features=AutofillServerCommunication,MediaRouter,OptimizationHints',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-first-run',
      ],
    });
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
    output(capabilities());
    return;
  }
  try {
    output(await render());
  } catch (error) {
    output({ ok: false, error: compactError(error), networkPolicy: 'deny' }, 2);
  }
}

main();
