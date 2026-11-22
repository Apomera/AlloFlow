'use strict';

/**
 * Offline Chromium-backed tagged PDF renderer and PDF/UA-1 post-processor
 * for the AlloFlow MCP driver.
 *
 * Uses only Node built-ins (zlib) plus an already-launched Playwright Chromium
 * browser instance. Renders sanitized HTML in a JavaScript-disabled,
 * service-worker-blocked, deny-all network context via Chromium's native
 * HarfBuzz + ICU BiDi + Skia tagged PDF engine, then applies a classic
 * incremental PDF/UA-1 finalization update in memory.
 */

const zlib = require('zlib');

const MAX_HTML_BYTES = 8 * 1024 * 1024;

const PAINTING_OPS = new Set([
  'f', 'F', 'f*', 'B', 'B*', 'b', 'b*', 'S', 's',
  'Tj', 'TJ', '"', "'", 'Do', 'sh', 'EI',
]);

const NON_STANDARD_ROLES = Object.freeze({
  Em: 'Span',
  Strong: 'Span',
  Aside: 'Sect',
  Sub: 'Span',
  Title: 'H1',
  FENote: 'Note',
});

function isRtlLanguage(languageNameOrCode) {
  if (!languageNameOrCode) return false;
  const s = String(languageNameOrCode).trim().toLowerCase();
  if (!s) return false;
  const code = s.split(/[-_]/)[0];
  const rtlCodes = new Set(['ar', 'arc', 'he', 'iw', 'fa', 'prs', 'ur', 'ps', 'ku', 'ckb', 'sd', 'ug', 'yi', 'dv', 'syr', 'nqo']);
  if (rtlCodes.has(s) || rtlCodes.has(code)) return true;
  const rtlNames = new Set([
    'arabic', 'hebrew', 'persian', 'farsi', 'dari', 'urdu', 'kurdish', 'sorani',
    'pashto', 'pushto', 'yiddish', 'sindhi', 'uyghur', 'uighur', 'divehi', 'dhivehi',
    'maldivian', 'aramaic', 'syriac',
  ]);
  return s.split(/[^a-z]+/).some((tok) => tok && rtlNames.has(tok));
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const cp = parseInt(hex, 16);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) return '';
      return String.fromCodePoint(cp);
    })
    .replace(/&#(\d+);/g, (_m, dec) => {
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

function pdfTextString(value) {
  const buf = Buffer.from('\uFEFF' + String(value), 'utf16le');
  buf.swap16(); // utf16le -> utf16be
  return '<' + buf.toString('hex').toUpperCase() + '>';
}

function extractHtmlTitle(html) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html || ''));
  if (!match) return '';
  return decodeEntities(match[1]);
}

function extractHtmlLang(html) {
  const match = /<html\b[^>]*\blang\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(String(html || ''));
  const raw = match ? (match[1] || match[2] || match[3] || '') : '';
  const cleaned = raw.trim();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(cleaned) ? cleaned : '';
}

function extractAnchorTexts(html) {
  const map = new Map();
  const anchorPattern = /<a\s[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(String(html || ''))) !== null) {
    const rawHref = match[1] !== undefined ? match[1] : match[2];
    const href = decodeEntities(rawHref);
    const text = decodeEntities(match[3].replace(/<[^>]+>/g, ''));
    if (text && href && !map.has(href)) map.set(href, text);
  }
  return map;
}

/**
 * Detect whether HTML contains non-WinAnsi, CJK, RTL/BiDi, Indic, or other
 * scripts that pdf-lib's offline WinAnsi typeset path would drop or fail to shape.
 */
function detectNonLatinOrShapingScript(html, langHint) {
  const src = String(html || '');
  const htmlLang = extractHtmlLang(src);
  const effectiveLang = String(langHint || htmlLang || '').trim();
  const hasRtlAttr = /<(?:html|body|main)\b[^>]*\bdir\s*=\s*["']?\s*rtl\b/i.test(src);
  const rtlLang = isRtlLanguage(effectiveLang);

  // Strip style/script/comments and tags; keep visible text + img alt text.
  const altTexts = [];
  src.replace(/<img\b[^>]*\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (_m, a, b) => {
    altTexts.push(a !== undefined ? a : b);
    return _m;
  });
  const bodyOnly = src
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const visible = decodeEntities(bodyOnly + ' ' + altTexts.join(' '));
  const punctNormalized = visible
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');

  const ranges = {
    arabic: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g,
    hebrew: /[\u0590-\u05FF]/g,
    devanagari: /[\u0900-\u097F]/g,
    indic: /[\u0980-\u0DFF]/g,
    thai: /[\u0E00-\u0E7F]/g,
    lao: /[\u0E80-\u0EFF]/g,
    khmer: /[\u1780-\u17FF]/g,
    myanmar: /[\u1000-\u109F]/g,
    ethiopic: /[\u1200-\u137F]/g,
    latinplus: /[\u0370-\u03FF\u0400-\u04FF]/g,
    latinext: /[\u0100-\u024F\u1E00-\u1EFF]/g,
  };
  const kana = (punctNormalized.match(/[\u3040-\u30FF]/g) || []).length;
  const hangul = (punctNormalized.match(/[\uAC00-\uD7AF]/g) || []).length;
  const han = (punctNormalized.match(/[\u3400-\u9FFF\uF900-\uFAFF]/g) || []).length;
  const cjk = kana + hangul + han;

  let best = null;
  let bestCount = 0;
  for (const key of Object.keys(ranges)) {
    const count = (punctNormalized.match(ranges[key]) || []).length;
    if (count > bestCount) {
      bestCount = count;
      best = key;
    }
  }
  if (cjk > 0 && cjk >= bestCount) {
    best = kana > 0 ? 'japanese' : (hangul > 0 ? 'korean' : 'chinese');
    bestCount = cjk;
  }

  const nonWinAnsiCount = (punctNormalized.match(/[^\x20-\xFF\n\r\t]/g) || []).length;
  const isRtl = hasRtlAttr || rtlLang || best === 'arabic' || best === 'hebrew';
  const needsChromium = isRtl || best !== null || nonWinAnsiCount > 0;
  let reason = null;
  if (isRtl) reason = 'rtl-bidi-shaping';
  else if (best) reason = 'non-latin-script:' + best;
  else if (nonWinAnsiCount > 0) reason = 'non-winansi-characters';

  return { needsChromium, script: best, isRtl, nonWinAnsiCount, reason };
}

/**
 * Fail-closed HTML validation & normalization before feeding HTML to Chromium's
 * print-to-PDF engine. Rejects active HTML and non-data media while safely
 * stripping benign external font/stylesheet imports so AlloFlow's own
 * accessible HTML renders 100% offline.
 */
function prepareHtmlForChromiumPdf(rawHtml, opts) {
  const o = opts || {};
  if (typeof rawHtml !== 'string' || !rawHtml.trim()) {
    throw new Error('Chromium tagged PDF requires non-empty HTML input.');
  }
  if (Buffer.byteLength(rawHtml, 'utf8') > MAX_HTML_BYTES) {
    throw new Error('HTML input exceeds the 8 MiB limit.');
  }
  if (/<(?:script|iframe|object|embed|base)\b/i.test(rawHtml) || /\son[a-z]+\s*=/i.test(rawHtml)) {
    throw new Error('Active HTML content is not allowed.');
  }
  if (/<meta\b[^>]*\bhttp-equiv\s*=\s*["']?\s*refresh\b/i.test(rawHtml)) {
    throw new Error('Meta refresh navigation is not allowed.');
  }
  if (/\b(?:href|src|xlink:href|poster|srcset)\s*=\s*(?:"\s*(?:javascript:|vbscript:|data:\s*(?:text\/html|image\/svg\+xml))|'\s*(?:javascript:|vbscript:|data:\s*(?:text\/html|image\/svg\+xml))|(?:javascript:|vbscript:|data:\s*(?:text\/html|image\/svg\+xml)))/i.test(rawHtml)) {
    throw new Error('Active JavaScript or active data URLs are not allowed.');
  }

  // Strip benign external stylesheet links / @import rules (e.g. Google Fonts
  // embedded in AlloFlow's reader CSS) before validating remaining resources.
  let html = rawHtml
    .replace(/<link\b[^>]*\brel\s*=\s*["']?stylesheet["']?[^>]*\bhref\s*=\s*["']https?:\/\/[^"']+["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']+["'][^>]*\brel\s*=\s*["']?stylesheet["']?[^>]*>/gi, '')
    .replace(/<link\b[^>]*\brel\s*=\s*["']?(?:preconnect|dns-prefetch)["']?[^>]*>/gi, '')
    .replace(/@import\s+(?:url\(\s*)?["']?https?:\/\/[^"')\s;]+["']?\s*\)?[^;]*;?/gi, '');

  const resourceUrls = [];
  const tagPattern = /<(?:img|link|source|image|video|audio|track)\b([^>]*)>/gi;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(html)) !== null) {
    const attrs = tagMatch[1] || '';
    const attrPattern = /\b(src|href|xlink:href|poster|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
    let attrMatch;
    while ((attrMatch = attrPattern.exec(attrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const rawVal = (attrMatch[2] !== undefined ? attrMatch[2] : (attrMatch[3] !== undefined ? attrMatch[3] : attrMatch[4])) || '';
      if (attrName === 'srcset') {
        for (const candidate of rawVal.split(',')) {
          const firstTok = candidate.trim().split(/\s+/)[0];
          if (firstTok) resourceUrls.push(firstTok);
        }
      } else if (rawVal.trim()) {
        resourceUrls.push(rawVal.trim());
      }
    }
  }
  if (resourceUrls.some((url) => !/^data:/i.test(url) || /^data:\s*(?:text\/html|image\/svg\+xml)/i.test(url))) {
    throw new Error('External or file-backed resources are not allowed; embed images as data URLs.');
  }
  if (/@import\b/i.test(html) || /url\(\s*["']?(?!data:|#)/i.test(html) || /url\(\s*["']?data:\s*(?:text\/html|image\/svg\+xml)/i.test(html)) {
    throw new Error('External CSS resources are not allowed.');
  }

  const existingLang = extractHtmlLang(html);
  const requestedLang = typeof o.lang === 'string' && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(o.lang.trim())
    ? o.lang.trim()
    : '';
  const finalLang = existingLang || requestedLang || 'en';
  const existingTitle = extractHtmlTitle(html);
  const requestedTitle = typeof o.title === 'string' ? decodeEntities(o.title) : '';
  const finalTitle = (existingTitle && !/^Accessible Document\b/i.test(existingTitle))
    ? existingTitle
    : (requestedTitle || existingTitle || 'Accessible document');
  const wantRtl = isRtlLanguage(finalLang);

  // Wrap fragments or normalize <html>/<head>/<title> so Chromium always emits /Lang and /Title.
  if (!/<html\b/i.test(html)) {
    const dirAttr = wantRtl ? ' dir="rtl"' : '';
    html = `<!DOCTYPE html>\n<html lang="${xmlEscape(finalLang)}"${dirAttr}><head><meta charset="utf-8"><title>${xmlEscape(finalTitle)}</title></head><body>${html}</body></html>`;
  } else {
    html = html.replace(/<html\b([^>]*)>/i, (whole, attrs) => {
      let next = attrs || '';
      if (!/\blang\s*=/i.test(next)) next += ` lang="${xmlEscape(finalLang)}"`;
      if (wantRtl && !/\bdir\s*=/i.test(next)) next += ' dir="rtl"';
      return `<html${next}>`;
    });
    if (!/<title\b/i.test(html)) {
      if (/<head\b[^>]*>/i.test(html)) {
        html = html.replace(/<head\b([^>]*)>/i, (_m, attrs) => `<head${attrs}><title>${xmlEscape(finalTitle)}</title>`);
      } else {
        html = html.replace(/<html\b([^>]*)>/i, (_m, attrs) => `<html${attrs}><head><meta charset="utf-8"><title>${xmlEscape(finalTitle)}</title></head>`);
      }
    } else if ((!existingTitle || /^Accessible Document\b/i.test(existingTitle)) && requestedTitle) {
      html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, () => `<title>${xmlEscape(finalTitle)}</title>`);
    }
  }

  return {
    html,
    title: finalTitle,
    lang: finalLang,
    anchorTexts: extractAnchorTexts(html),
  };
}

function lastToken(line) {
  const parts = line.trim().split(/\s+/);
  return parts[parts.length - 1];
}

function wrapUntaggedPrefix(content) {
  let markIdx = -1;
  for (const token of ['BDC', 'BMC']) {
    const idx = content.indexOf(token);
    if (idx >= 0 && (markIdx < 0 || idx < markIdx)) markIdx = idx;
  }
  if (markIdx < 0) return null;
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

/**
 * ISO 14289-1:2014 clause 7.21.7 (testNumber 2): Unicode values in a ToUnicode
 * CMap must be > 0 and never U+FEFF or U+FFFE. Chromium's Skia PDF backend
 * emits `<GID> <0000>` in `beginbfchar` for shaped Indic (e.g. Devanagari)
 * conjunct/matra glyphs even when they are already wrapped in `/ActualText`.
 * Replacing forbidden destinations with `<200D>` (Zero Width Joiner) satisfies
 * both 7.21.7-1 and 7.21.7-2 while preserving `/ActualText` reading/copy fidelity.
 */
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

function buildXmpPacket(title, pdfuaPart) {
  const identification = pdfuaPart
    ? `\n   <pdfuaid:part>${pdfuaPart}</pdfuaid:part>`
    : '';
  const xml = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
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

function finalizeTaggedPdfBytes(originalBuffer, opts) {
  const o = opts || {};
  const original = Buffer.isBuffer(originalBuffer) ? originalBuffer : Buffer.from(originalBuffer);
  const title = o.title || 'Accessible document';
  const pdfuaPart = o.pdfuaPart === undefined ? 1 : o.pdfuaPart;
  const anchorTexts = o.anchorTexts || null;
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

  const structRef = /\/StructTreeRoot\s+(\d+)\s+0\s+R/.exec(catalogSource);
  const structNum = structRef ? Number(structRef[1]) : null;
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
      if (arrayKids[1].includes('<<')) continue;
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
          if (type === 'Lbl') labels.push(item.raw);
          else if (type === 'LBody') existingBodies.push(item.raw);
          else {
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
        `${bodyNum} 0 obj\n<</Type /StructElem\n/S /LBody\n/P ${num} 0 R${pgClause}\n`
          + `/K [${restTokens.map((item) => item.raw).join(' ')}]>>\nendobj\n`,
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
    const singleRef = /\/K\s+(\d+)\s+0\s+R\b/.exec(body);
    if (!singleRef) continue;
    const ref = Number(singleRef[1]);
    const type = structTypeOf(ref);
    if (type === 'Lbl' || type === 'LBody') continue;
    const bodyNum = nextObjectNumber++;
    setReplacement(bodyNum, Buffer.from(
      `${bodyNum} 0 obj\n<</Type /StructElem\n/S /LBody\n/P ${num} 0 R${pgClause}\n`
        + `/K ${ref} 0 R>>\nendobj\n`,
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

  return {
    bytes: Buffer.concat(pieces),
    summary: {
      wrappedContentStreams: wrappedStreams,
      cmapEntriesFixed,
      metadataAdded: true,
      linkContentsAdded,
      pdfuaIdentifierClaimed: Boolean(pdfuaPart),
    },
  };
}

function structuralMarkersFromBuffer(pdfBuffer) {
  const text = Buffer.from(pdfBuffer).toString('latin1');
  return {
    structTreeRoot: text.includes('/StructTreeRoot'),
    markInfo: text.includes('/MarkInfo'),
    marked: /\/Marked\s+true\b/.test(text),
    language: text.includes('/Lang'),
    title: text.includes('/Title'),
    xmpMetadata: /\/Type\s*\/Metadata\b/.test(text),
  };
}

async function renderHtmlToTaggedPdf(browser, html, opts) {
  const o = opts || {};
  if (!browser || typeof browser.newContext !== 'function') {
    throw new Error('Chromium browser instance is unavailable.');
  }
  const signal = o.signal || null;
  if (signal && signal.aborted) {
    throw signal.reason || new Error('Chromium tagged PDF render cancelled.');
  }
  const prepared = prepareHtmlForChromiumPdf(html, { title: o.title, lang: o.lang });
  const pdfuaPart = (o.pdfuaId === null || o.pdfuaId === 'none' || o.pdfuaId === false) ? null : 1;
  const timeout = Number.isFinite(Number(o.timeoutMs)) ? Math.max(5000, Number(o.timeoutMs)) : 30000;

  let context;
  let blockedNetworkRequests = 0;
  let rawPdf;
  let onAbort = null;
  let abortReject = null;
  const abortPromise = signal
    ? new Promise((_res, rej) => {
      abortReject = rej;
      onAbort = () => {
        if (context) {
          try { context.close().catch(() => {}); } catch (_) {}
        }
        rej(signal.reason || new Error('Chromium tagged PDF render cancelled.'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    })
    : null;

  const raceBounded = (workPromise, label) => {
    let timer = null;
    const timeoutPromise = new Promise((_res, rej) => {
      timer = setTimeout(() => {
        if (context) {
          try { context.close().catch(() => {}); } catch (_) {}
        }
        rej(new Error(`Chromium tagged PDF ${label} timed out after ${timeout}ms.`));
      }, timeout);
      if (timer.unref) timer.unref();
    });
    const racers = abortPromise ? [workPromise, timeoutPromise, abortPromise] : [workPromise, timeoutPromise];
    return Promise.race(racers).finally(() => {
      if (timer) clearTimeout(timer);
    });
  };

  let renderSettled = false;
  try {
    const contextPromise = browser.newContext({
      javaScriptEnabled: false,
      serviceWorkers: 'block',
    }).then((ctx) => {
      if (renderSettled) {
        try { ctx.close().catch(() => {}); } catch (_) {}
      }
      return ctx;
    });
    context = await raceBounded(
      contextPromise,
      'context creation',
    );
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
    const page = await raceBounded(context.newPage(), 'page creation');
    await raceBounded(page.setContent(prepared.html, { waitUntil: 'load', timeout }), 'setContent');
    await page.emulateMedia({ media: 'print', colorScheme: 'light', reducedMotion: 'reduce' });
    rawPdf = await raceBounded(
      page.pdf({
        format: 'Letter',
        printBackground: true,
        preferCSSPageSize: true,
        tagged: true,
        outline: true,
      }),
      'page.pdf',
    );
  } finally {
    renderSettled = true;
    if (signal && onAbort) {
      try { signal.removeEventListener('abort', onAbort); } catch (_) {}
    }
    void abortReject;
    if (context) {
      try { await context.close(); } catch (_) {}
    }
  }

  let markers = structuralMarkersFromBuffer(rawPdf);
  if (!markers.structTreeRoot || !markers.markInfo || !markers.marked) {
    throw new Error('Chromium returned PDF bytes without the required tagged-PDF structural markers.');
  }

  const finalized = finalizeTaggedPdfBytes(rawPdf, {
    title: prepared.title,
    pdfuaPart,
    anchorTexts: prepared.anchorTexts,
  });
  markers = structuralMarkersFromBuffer(finalized.bytes);

  return {
    bytes: finalized.bytes,
    b64: finalized.bytes.toString('base64'),
    title: prepared.title,
    lang: prepared.lang,
    structuralMarkers: markers,
    pdfUaFinalization: finalized.summary,
    blockedNetworkRequests,
    networkPolicy: 'deny',
  };
}

module.exports = {
  MAX_HTML_BYTES,
  NON_STANDARD_ROLES,
  isRtlLanguage,
  xmlEscape,
  decodeEntities,
  pdfTextString,
  extractHtmlTitle,
  extractHtmlLang,
  extractAnchorTexts,
  detectNonLatinOrShapingScript,
  prepareHtmlForChromiumPdf,
  wrapUntaggedPrefix,
  sanitizeToUnicodeCmapStream,
  buildXmpPacket,
  finalizeTaggedPdfBytes,
  structuralMarkersFromBuffer,
  renderHtmlToTaggedPdf,
};
