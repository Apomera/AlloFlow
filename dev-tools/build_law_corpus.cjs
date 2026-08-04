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
    publisher: 'Maine Department of Education',
    // Verified live 2026-08-04 (HTTP 200). The SOS rules index and several
    // direct MUSER filenames 404 — Maine restructured that site — so we link
    // to the office page that carries the current document.
    sourceUrl: 'https://www.maine.gov/doe/learning/specialed',
    kind: 'manual',
    // Maine publishes MUSER as a document rather than through a structured
    // API. Until an ingestion path is confirmed, this entry is a POINTER:
    // the tool links out and says so plainly. It must never render invented
    // section text — `sections: []` is the honest state.
    note: 'Maine publishes MUSER as a document, not via a structured API. This entry links to the official source; section text is not yet ingested.'
  }
];

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
      status: status,
      currentAsOf: doc.kind === 'ecfr' ? upToDate : null,
      retrievedAt: retrievedAt,
      note: doc.note || null,
      sections: sections
    };
    if (status !== 'failed') {
      fs.writeFileSync(path.join(OUT_DIR, doc.slug + '.json'), JSON.stringify(payload), 'utf8');
      const bytes = fs.statSync(path.join(OUT_DIR, doc.slug + '.json')).size;
      manifest.documents.push({
        slug: doc.slug, jurisdiction: doc.jurisdiction, jurisdictionName: payload.jurisdictionName,
        display: doc.display, short: doc.short, citation: doc.citation, sourceUrl: doc.sourceUrl,
        cfrTitle: payload.cfrTitle, cfrPart: payload.cfrPart,
        status: status, currentAsOf: payload.currentAsOf, retrievedAt: retrievedAt,
        sectionCount: sections.length, bytes: bytes
      });
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('\nWrote ' + manifest.documents.length + ' document(s) to law_corpus/');
  for (const d of manifest.documents) {
    console.log('  ' + d.slug.padEnd(16) + String(d.sectionCount).padStart(4) + ' sections  ' + Math.round(d.bytes / 1024) + ' KB  [' + d.status + ']');
  }
})();
