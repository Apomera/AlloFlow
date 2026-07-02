#!/usr/bin/env node
/**
 * expected_announcements.cjs — derive the EXPECTED screen-reader announcement sequence
 * from a remediated AlloFlow HTML document.
 *
 * Scope note: this deliberately parses OUR OWN generated, well-formed remediation output
 * (the same HTML createTaggedPdf walks), not arbitrary web HTML — a tolerant tag-stream
 * scan is adequate here and keeps the harness dependency-free under plain node.
 *
 * The output is a document-ordered list of announcement expectations:
 *   { kind: 'heading'|'landmark'|'image'|'table'|'list'|'link', text, detail? }
 * Each expectation is something NVDA reliably SPEAKS during a say-all pass:
 *   - headings   → "heading level N, <text>"
 *   - landmarks  → "main landmark" / "navigation landmark" (entry announcement)
 *   - images     → "graphic, <alt>" (decorative alt="" must NOT be announced)
 *   - tables     → "table with X rows and Y columns" + caption
 *   - lists      → "list with N items"
 *   - links      → "link, <text>"
 * The differ (diff_transcript.cjs) then checks these appear IN ORDER in the actual
 * NVDA speech log. Pure + unit-tested (tests/nvda_harness.test.js).
 */
'use strict';

function _decode(s) {
  return String(s == null ? '' : s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch (_) { return ' '; } });
}
function _stripTags(s) { return _decode(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); }

function deriveExpected(html) {
  const src = String(html || '');
  const out = [];
  // Single ordered pass over announcement-relevant open tags. For container elements we
  // capture just enough of the inner content to build the expectation text.
  const re = /<(h[1-6]|main|nav|header|footer|aside|img|table|ul|ol|a)\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const tag = m[1].toLowerCase();
    const attrs = m[2] || '';
    const at = m.index;
    const attr = (name) => {
      const r = new RegExp(name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i').exec(attrs);
      return r ? _decode(r[2] != null ? r[2] : r[3]) : null;
    };
    const innerUntil = (closeTag, cap) => {
      const end = src.toLowerCase().indexOf('</' + closeTag, at);
      return end === -1 ? '' : src.slice(re.lastIndex, Math.min(end, re.lastIndex + (cap || 20000)));
    };
    if (/^h[1-6]$/.test(tag)) {
      const text = _stripTags(innerUntil(tag, 4000));
      if (text) out.push({ kind: 'heading', level: Number(tag[1]), text });
    } else if (tag === 'main' || tag === 'nav') {
      out.push({ kind: 'landmark', text: tag === 'main' ? 'main' : 'navigation' });
    } else if (tag === 'img') {
      const alt = attr('alt');
      if (alt === null) continue;             // missing alt: axe's finding, not an expectation
      if (alt.trim() === '') continue;        // decorative: expected to be SILENT (checked separately)
      const aria = attr('aria-hidden');
      if (aria === 'true') continue;
      out.push({ kind: 'image', text: alt.trim() });
    } else if (tag === 'table') {
      // role="presentation" layout tables must NOT be announced as data tables.
      if ((attr('role') || '').toLowerCase() === 'presentation') continue;
      const inner = innerUntil('table');
      const capM = /<caption[^>]*>([\s\S]*?)<\/caption>/i.exec(inner);
      const rows = (inner.match(/<tr\b/gi) || []).length;
      const exp = { kind: 'table', rows, text: capM ? _stripTags(capM[1]) : '' };
      if (rows > 0) out.push(exp);
    } else if (tag === 'ul' || tag === 'ol') {
      const inner = innerUntil(tag);
      const items = (inner.match(/<li\b/gi) || []).length;
      if (items > 0) out.push({ kind: 'list', items, text: '' });
    } else if (tag === 'a') {
      const href = attr('href');
      if (!href || href === '#') continue;
      const text = _stripTags(innerUntil('a', 2000));
      if (text) out.push({ kind: 'link', text });
    }
  }
  return out;
}

// Decorative images (alt="") — NVDA must stay silent about these; the differ reports any
// that leak into speech (e.g. a filename announced because a viewer ignored the empty alt).
function deriveMustNotAnnounce(html) {
  const src = String(html || '');
  const out = [];
  const re = /<img\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const attrs = m[1] || '';
    if (/alt\s*=\s*(""|'')/.test(attrs)) {
      const sm = /src\s*=\s*("([^"]{0,80})"|'([^']{0,80})')/i.exec(attrs);
      out.push({ kind: 'decorative-image', src: sm ? (sm[2] != null ? sm[2] : sm[3]) : '(unknown src)' });
    }
  }
  return out;
}

module.exports = { deriveExpected, deriveMustNotAnnounce };
