#!/usr/bin/env node
// build_law_corpus.cjs — ingest AUTHORITATIVE education-law text into the
// Law Navigator corpus.
//
// WHY THIS EXISTS
//   The Law Navigator shows parents and teachers what a regulation ACTUALLY
//   says. Hallucinated law is worse than no tool, so no regulation text is
//   ever authored by hand or by a model: it is fetched from the publisher,
//   stored verbatim, and stamped with the retrieval date and source URL.
//   The tool renders only what lands in these corpus files.
//
// SOURCES
//   Federal — eCFR public API (ecfr.gov), the official electronic CFR:
//     34 CFR 300  IDEA Part B (special education)
//     34 CFR 104  Section 504 (nondiscrimination on the basis of handicap)
//   State — per-jurisdiction fetchers; Maine MUSER (Ch. 101) below.
//
// USAGE
//   node dev-tools/build_law_corpus.cjs            # ingest all configured
//   node dev-tools/build_law_corpus.cjs --federal  # federal only
//   node dev-tools/build_law_corpus.cjs --check    # report staleness, no writes
//
// OUTPUT
//   law_corpus/manifest.json         (mirrors the lang/manifest.json pattern)
//   law_corpus/<slug>.json           one document per file
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'law_corpus');
const args = process.argv.slice(2);
const FEDERAL_ONLY = args.includes('--federal');
const CHECK_ONLY = args.includes('--check');

// ── Document registry. Adding a state = adding an entry here. ──────────────
const DOCS = [
  {
    slug: 'idea-part-b',
    jurisdiction: 'federal',
    display: 'IDEA Part B — Assistance to States for the Education of Children with Disabilities',
    short: 'IDEA Part B',
    citation: '34 CFR Part 300',
    publisher: 'U.S. Government Publishing Office / eCFR',
    sourceUrl: 'https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300',
    kind: 'ecfr', title: 34, part: 300
  },
  {
    slug: 'section-504',
    jurisdiction: 'federal',
    display: 'Section 504 — Nondiscrimination on the Basis of Handicap in Federally Assisted Programs',
    short: 'Section 504',
    citation: '34 CFR Part 104',
    publisher: 'U.S. Government Publishing Office / eCFR',
    sourceUrl: 'https://www.ecfr.gov/current/title-34/subtitle-B/chapter-I/part-104',
    kind: 'ecfr', title: 34, part: 104
  },
  {
    slug: 'me-muser',
    jurisdiction: 'ME',
    jurisdictionName: 'Maine',
    display: 'MUSER — Maine Unified Special Education Regulation (Chapter 101)',
    short: 'MUSER Ch. 101',
    citation: '05-071 C.M.R. ch. 101',
    publisher: 'Maine Secretary of State / Department of Education',
    // The official rule as filed with the Secretary of State, reached by
    // FOLLOWING links from the live DOE rules index (every guessed filename
    // 404'd — Maine restructured that site). The DOE also publishes a
    // consolidated PDF; the SOS .docx is the authoritative filing and is
    // cleaner to extract, so it is the ingestion source.
    sourceUrl: 'https://www.maine.gov/sos/rulemaking/agency-rules/department-education-and-state-board-education-rules',
    docUrl: 'https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/071c101-2026-129-AMD-EMR.docx',
    kind: 'docx',
    // MUSER interleaves Maine's own requirements with the federal text it
    // adopts, and marks the difference TYPOGRAPHICALLY: italics = State
    // requirement, plain Times Roman = federal statute/regulation. The
    // extractor preserves that distinction per paragraph, which is exactly
    // what "what does Maine add on top of IDEA?" needs.
    note: 'MUSER marks its own State requirements in italics and adopted federal text in plain type; that distinction is preserved per paragraph as stateRule flags.'
  }
];

// The repo lives inside OneDrive, whose sync client intermittently holds a
// handle on a file being rewritten — observed as `UNKNOWN: unknown error` on
// open-for-write, which does NOT clear on its own. Write to a sibling temp
// file and rename over the target, retrying briefly. Renames win against the
// scanner far more often than in-place rewrites do.
function writeFileResilient(target, data) {
  const tmp = target + '.tmp' + process.pid;
  let lastErr = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      fs.writeFileSync(tmp, data, 'utf8');
      fs.renameSync(tmp, target);
      return;
    } catch (e) {
      lastErr = e;
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
      // Brief synchronous backoff; this script is a one-shot build step.
      const until = Date.now() + 250 * (attempt + 1);
      while (Date.now() < until) { /* spin */ }
    }
  }
  throw new Error('could not write ' + path.basename(target) + ' after retries: ' + (lastErr && lastErr.message));
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'AlloFlow-law-corpus/1.0 (education tool)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); return resolve(fetchText(res.headers.location));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode + ' for ' + url)); }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('timeout: ' + url)); });
  });
}

// ── Minimal XML helpers. We extract TEXT ONLY, never rewrite it. ───────────
function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, '')
    // Numeric entities, BOTH hex and decimal. eCFR uses hex heavily
    // (&#xA7; = §, &#x2014; = em dash); a decimal-only decoder leaves
    // raw "&#xA7;" visible in headings.
    .replace(/&#x([0-9a-f]+);/gi, (_, hx) => String.fromCodePoint(parseInt(hx, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&mdash;/gi, '—').replace(/&ndash;/gi, '–')
    .replace(/&nbsp;/gi, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')   // last: avoid double-decoding &amp;#xA7;
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// eCFR full XML: sections are <DIV8 N="300.530" TYPE="SECTION"> with a <HEAD>
// and a series of <P> paragraphs.
function parseEcfrSections(xml) {
  const out = [];
  const re = /<DIV8[^>]*\bN="([^"]+)"[^>]*\bTYPE="SECTION"[^>]*>([\s\S]*?)<\/DIV8>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const num = m[1];
    const body = m[2];
    const headM = body.match(/<HEAD>([\s\S]*?)<\/HEAD>/);
    const heading = headM ? stripTags(headM[1]) : '';
    const paras = [];
    const pRe = /<P[^>]*>([\s\S]*?)<\/P>/g;
    let p;
    while ((p = pRe.exec(body)) !== null) {
      const t = stripTags(p[1]);
      if (t) paras.push(t);
    }
    if (!paras.length) continue;
    out.push({ number: num, heading: heading, paragraphs: paras });
  }
  return out;
}

// ── .docx ingestion (Maine MUSER and any future state filed as Word) ───────
// A .docx is a ZIP; the text lives in word/document.xml as <w:p> paragraphs of
// <w:t> runs. We extract runs verbatim and record whether the paragraph
// carried italics, because MUSER uses italics to mean "State requirement".
function fetchBuffer(url, depth) {
  depth = depth || 0;
  return new Promise((resolve, reject) => {
    if (depth > 4) return reject(new Error('too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'AlloFlow-law-corpus/1.0 (education tool)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); return resolve(fetchBuffer(new URL(res.headers.location, url).href, depth + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode + ' for ' + url)); }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function docxParagraphs(xml) {
  const out = [];
  const pRe = /<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g;
  let m;
  while ((m = pRe.exec(xml)) !== null) {
    const block = m[0];
    const text = [...block.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)].map((r) => r[1]).join('')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ').trim();
    if (!text) continue;
    out.push({ text, italic: /<w:i\s*\/>|<w:i /.test(block) });
  }
  return out;
}

// MUSER body sections are ROMAN-NUMERAL, ALL-CAPS headings. Table-of-contents
// entries look identical except they end in a page number, and subsections
// like "I.Education in the Unorganized Territories" are mixed case — both are
// excluded so the split lands only on real section boundaries.
const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100 };
function romanToInt(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]], next = ROMAN[s[i + 1]];
    n += (next && v < next) ? -v : v;
  }
  return n;
}

// Two false-heading traps, and the discriminator each needs:
//   1. Table-of-contents lines look exactly like headings but end in a page
//      number -> `strict` (used only to LOCATE the body; real headings can
//      legitimately end in digits, e.g. "V. ... CHILFREN 3 - 22", the
//      source's own typo, preserved).
//   2. Subsections reuse roman numerals mid-chapter ("I.Education in the
//      Unorganized Territories" sits inside section IV), and body text quotes
//      other numerals in passing -> a heading must be the STRICT SUCCESSOR of
//      the section in progress (XV is followed only by XVI).
//      Two weaker rules were tried and rejected: an all-caps test wrongly
//      dropped section XVI, whose real title is mixed case ("XVI.DISPUTE
//      RESOLUTION PROCEDURES: (Mediations, Complaints And Hearings)"), and
//      merely-ascending let one stray high numeral in the prose poison the
//      chain, collapsing 19 sections to 7.
function isMuserHeading(text, strict, expectNext) {
  const m = text.match(/^([IVXL]+)\s*\.\s*(.+)$/);
  if (!m) return null;
  const title = m[2].trim();
  if (strict && /\d\s*$/.test(title)) return null;
  if (title.length < 4) return null;
  const value = romanToInt(m[1]);
  if (expectNext !== undefined && value !== expectNext) return null;
  return { numeral: m[1], title: title, value: value };
}

async function ingestDocx(doc) {
  process.stdout.write('  fetching ' + doc.citation + ' (.docx) ... ');
  const buf = await fetchBuffer(doc.docUrl);
  let JSZip;
  try { JSZip = require(path.join(ROOT, 'node_modules', 'jszip')); }
  catch (e) { throw new Error('jszip not available: ' + e.message); }
  const zip = await JSZip.loadAsync(buf);
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('no word/document.xml in archive');
  const paras = docxParagraphs(await entry.async('string'));
  console.log(Math.round(buf.length / 1024) + ' KB, ' + paras.length + ' paragraphs');

  // Body begins at section I. Starting at the first heading of ANY numeral
  // catches table-of-contents lines whose titles wrapped past their page
  // number (observed: VII, X and XVI arrived as empty pseudo-sections before
  // the real body). The TOC renders its first entry as "1." while the body
  // uses the roman "I.", so anchoring on numeral === 'I' lands on the body.
  let start = -1;
  for (let i = 0; i < paras.length; i++) {
    const head = isMuserHeading(paras[i].text, true);
    if (head && head.numeral === 'I') { start = i; break; }
  }
  if (start === -1) throw new Error('no section-I heading found — refusing to write');

  const sections = [];
  let cur = null;
  let lastValue = 0;
  for (let i = start; i < paras.length; i++) {
    const head = isMuserHeading(paras[i].text, false, lastValue + 1);
    if (head) {
      lastValue = head.value;
      if (cur && cur.paragraphs.length) sections.push(cur);
      cur = { number: head.numeral, heading: head.numeral + '. ' + head.title, paragraphs: [], stateRule: [] };
      continue;
    }
    if (!cur) continue;
    cur.paragraphs.push(paras[i].text);
    cur.stateRule.push(!!paras[i].italic);
  }
  if (cur && cur.paragraphs.length) sections.push(cur);
  if (!sections.length) throw new Error('no sections parsed — refusing to write an empty corpus');
  return sections;
}

async function ingestEcfr(doc, upToDate) {
  const url = 'https://www.ecfr.gov/api/versioner/v1/full/' + upToDate + '/title-' + doc.title + '.xml?part=' + doc.part;
  process.stdout.write('  fetching ' + doc.citation + ' ... ');
  const xml = await fetchText(url);
  const sections = parseEcfrSections(xml);
  console.log(sections.length + ' sections, ' + Math.round(xml.length / 1024) + ' KB');
  if (!sections.length) throw new Error('no sections parsed for ' + doc.slug + ' — refusing to write an empty corpus');
  return sections;
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const retrievedAt = new Date().toISOString().slice(0, 10);

  if (CHECK_ONLY) {
    const mp = path.join(OUT_DIR, 'manifest.json');
    if (!fs.existsSync(mp)) { console.error('no manifest — run without --check first'); process.exit(1); }
    const man = JSON.parse(fs.readFileSync(mp, 'utf8'));
    const today = new Date(retrievedAt);
    let stale = 0;
    for (const d of man.documents) {
      const days = Math.round((today - new Date(d.retrievedAt)) / 86400000);
      const flag = days > 180 ? ' ** STALE (>180d) **' : '';
      if (days > 180) stale++;
      console.log('  ' + d.slug.padEnd(16) + d.retrievedAt + '  ' + String(days).padStart(4) + 'd old' + flag);
    }
    console.log(stale ? '\n' + stale + ' document(s) need re-ingestion.' : '\nAll documents current.');
    process.exit(stale ? 1 : 0);
  }

  console.log('Law corpus ingestion — ' + retrievedAt);
  let titleMeta = null;
  try {
    const titles = JSON.parse(await fetchText('https://www.ecfr.gov/api/versioner/v1/titles.json'));
    titleMeta = (titles.titles || []).find((t) => t.number === 34);
  } catch (e) { console.error('  ! could not read eCFR title metadata: ' + e.message); }
  const upToDate = (titleMeta && titleMeta.up_to_date_as_of) || retrievedAt;
  if (titleMeta) console.log('  eCFR title 34 current as of ' + upToDate + ' (last amended ' + titleMeta.latest_amended_on + ')');

  const manifest = { version: 1, generated: new Date().toISOString(), documents: [] };
  for (const doc of DOCS) {
    if (FEDERAL_ONLY && doc.jurisdiction !== 'federal') continue;
    let sections = [];
    let status = 'ingested';
    if (doc.kind === 'ecfr') {
      try { sections = await ingestEcfr(doc, upToDate); }
      catch (e) { console.error('  ! ' + doc.slug + ': ' + e.message); status = 'failed'; }
    } else if (doc.kind === 'docx') {
      try { sections = await ingestDocx(doc); }
      catch (e) {
        // A failed state ingestion degrades to a POINTER — it must never
        // leave behind partial or invented text.
        console.error('  ! ' + doc.slug + ': ' + e.message + ' — degrading to pointer');
        sections = []; status = 'pointer';
      }
    } else {
      console.log('  ' + doc.slug + ': pointer entry (no structured source) — links out, no text rendered');
      status = 'pointer';
    }
    const payload = {
      slug: doc.slug, jurisdiction: doc.jurisdiction, jurisdictionName: doc.jurisdictionName || 'United States',
      display: doc.display, short: doc.short, citation: doc.citation,
      publisher: doc.publisher, sourceUrl: doc.sourceUrl,
      // Carried so the tool can re-fetch THIS document's sections live from
      // eCFR (title 34, part N). Absent for non-eCFR sources, which disables
      // live mode for them rather than guessing an endpoint.
      cfrTitle: doc.kind === 'ecfr' ? doc.title : null,
      cfrPart: doc.kind === 'ecfr' ? String(doc.part) : null,
      docUrl: doc.docUrl || null,
      status: status,
      // eCFR reports its own currency; a filed document carries its effective
      // date in the text, so we do not invent one here.
      currentAsOf: doc.kind === 'ecfr' ? upToDate : null,
      retrievedAt: retrievedAt,
      note: doc.note || null,
      sections: sections
    };
    if (status !== 'failed') {
      writeFileResilient(path.join(OUT_DIR, doc.slug + '.json'), JSON.stringify(payload));
      const bytes = fs.statSync(path.join(OUT_DIR, doc.slug + '.json')).size;
      manifest.documents.push({
        slug: doc.slug, jurisdiction: doc.jurisdiction, jurisdictionName: payload.jurisdictionName,
        display: doc.display, short: doc.short, citation: doc.citation, sourceUrl: doc.sourceUrl,
        cfrTitle: payload.cfrTitle, cfrPart: payload.cfrPart, docUrl: payload.docUrl,
        status: status, currentAsOf: payload.currentAsOf, retrievedAt: retrievedAt,
        sectionCount: sections.length, bytes: bytes
      });
    }
  }
  writeFileResilient(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log('\nWrote ' + manifest.documents.length + ' document(s) to law_corpus/');
  for (const d of manifest.documents) {
    console.log('  ' + d.slug.padEnd(16) + String(d.sectionCount).padStart(4) + ' sections  ' + Math.round(d.bytes / 1024) + ' KB  [' + d.status + ']');
  }
})();
