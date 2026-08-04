#!/usr/bin/env node
// build_tool_index.cjs — build the STEM tool CAPABILITY INDEX.
//
// WHY THIS EXISTS
//   Two consumers need to know what tools can DO, and neither could:
//
//   1. STEM Lab search indexed only the catalog TILE blurb, so features that
//      live inside a tool were unfindable ("periodic table" returned nothing
//      while a 118-element table shipped inside Molecule Builder).
//   2. The lesson-plan prompt (prompts_library) asks the model to recommend
//      STEM tools, but was handed only {id, name, subjects, tags} — names,
//      not capabilities — and 39% of `subjects` fell through to a generic
//      'STEM' because the map covered 5 of the 16 category values in use.
//
//   Worse, that registry is populated by registerTool, which only runs once
//   the STEM plugins load ON DEMAND. A teacher who never opened the STEM Lab
//   generated lesson plans against an EMPTY tool list and simply got no
//   recommendations, silently.
//
// THE CONTRACT
//   This index is deliberately SMALL and derived, never authored. One record
//   per tool, built from the tool's own registerTool config. Tool SOURCE never
//   enters it (a single tool file can exceed 2 MB); only its self-description
//   and a keyword distillation do. That bound is what makes it safe to put in
//   front of a model.
//
// USAGE
//   node dev-tools/build_tool_index.cjs           # write tool_index.json
//   node dev-tools/build_tool_index.cjs --check   # verify freshness, no write
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STEM_DIR = path.join(ROOT, 'stem_lab');
const CATALOG = path.join(STEM_DIR, 'stem_lab_module.js');
const OUT = path.join(ROOT, 'tool_index.json');
const MIRROR = path.join(ROOT, 'desktop/web-app/public/tool_index.json');
const CHECK_ONLY = process.argv.includes('--check');

// Caps keep the artifact bounded no matter how verbose a tool becomes.
const MAX_DESC = 320;      // chars of self-description per tool
const MAX_KEYWORDS = 26;   // distilled, rarity-ranked terms per tool
const MAX_TOPICS = 14;     // in-tool content headings per tool

// Content-label harvest. A tool's self-description covers what it is; the
// headings INSIDE it cover what it teaches — which is where the previously
// unfindable terms lived ("attachment", "manifestation determination",
// "work rights & disclosure" are card titles, not desc text). Tools label
// content with `title:` or `name:` depending on vintage, so take both.
// Still bounded and still never source: headings only, capped, deduped.
const TOPIC_RE = /\b(?:title|name):\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/g;
// Second source, and a big one: user-visible strings living as i18n FALLBACKS,
// e.g. __alloT('stem.parentingLab.m2_title', 'M2 — Attachment: the theory vs.
// the brand'). Module titles and section headers are routinely written this
// way, so a title:/name:-only harvest missed them — "attachment" was absent
// from the entire corpus until this was added.
const T_FALLBACK_RE = /\b(?:__alloT|t)\(\s*['"][\w.]+['"]\s*,\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/g;
const TOPIC_SKIP = /^(?:https?:|#|[\d\s.,:%$-]+$)|^(?:ok|yes|no|next|back|done|close|start|stop|save|reset|undo|cancel|submit|continue|new|edit|delete|add|remove)$/i;

// Words that carry no routing signal.
const STOP = new Set(('the a an and or of for with to in on at by from as is are be your you их this that these those '
  + 'their there here what when how why who which while into onto out up down over under more most less least '
  + 'can could will would should may might must do does did done using use used it its can also both each every '
  + 'other than then them they we our us not no yes if but so such via per about across after before again '
  + 'real really very just only even much many one two three four five new full best good great learn learns '
  + 'learning explore explores exploring build builds building make makes making see sees seeing get gets '
  + 'practice practices student students teacher teachers class classroom tool tools lab labs interactive').split(/\s+/));

function firstMatch(src, re, fallback) {
  const m = src.match(re);
  return m ? m[1] : fallback;
}

// Pull the registerTool config head for one tool without executing anything.
function extractTools(file, src) {
  const out = [];
  const re = /window\.StemLab\.registerTool\s*\(\s*['"]([A-Za-z0-9_$]+)['"]\s*,\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = m[1];
    // The config head is enough: icon/label/desc/color/category/questHooks all
    // precede render() by convention in every tool in this repo.
    const seg = src.slice(m.index, m.index + 6000);
    const label = firstMatch(seg, /\blabel:\s*['"]((?:\\.|[^'"\\])*)['"]/, id);
    const desc = firstMatch(seg, /\bdesc:\s*(['"])((?:\\.|(?!\1)[\s\S])*)\1/, null) === null
      ? firstMatch(seg, /\bdesc:\s*(['"])((?:\\.|(?!\1)[\s\S])*)\1/, '')
      : '';
    // The regex above needs the 2nd group; redo simply:
    const dm = seg.match(/\bdesc:\s*(['"])((?:\\.|(?!\1)[\s\S])*)\1/);
    const description = dm ? dm[2] : '';
    const category = firstMatch(seg, /\bcategory:\s*['"]([a-z]+)['"]/, '');
    // Quest-hook labels describe capabilities in plain language — cheap signal.
    const quests = [...seg.matchAll(/\blabel:\s*['"]((?:\\.|[^'"\\])*)['"]/g)]
      .map((q) => q[1]).slice(1, 5);
    out.push({ id, label, description, category, quests, file: path.basename(file) });
  }
  return out;
}

function decode(s) {
  return String(s || '')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function keywordsFrom(text) {
  const seen = new Set();
  const out = [];
  for (const w of String(text).toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || []) {
    if (STOP.has(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= MAX_KEYWORDS) break;
  }
  return out;
}

// The catalog carries the human-facing section a tool sits in, plus any
// hand-written search aliases. Both are useful routing signal.
function readCatalogContext() {
  const src = fs.readFileSync(CATALOG, 'utf8');
  const sections = {};   // toolId -> section label
  let current = '';
  const tileRe = /\{[^{}]*?\bid:\s*'([A-Za-z0-9_$]+)'[^{}]*?\}/g;
  // Walk the array in order, tracking the most recent category header.
  const arrStart = src.search(/^[ \t]*(?:var|let|const)\s+_allStemTools\s*=\s*\[/m);
  const region = arrStart >= 0 ? src.slice(arrStart) : src;
  // Window must exceed the longest tile desc, or long-desc tiles (the Law
  // Navigator, PaperTrail) never reach their `ready: true` and lose their
  // section. 400 was too small; descs here run past 600 chars.
  const rowRe = /id:\s*'([A-Za-z0-9_$]+)'[\s\S]{0,1500}?(?:category:\s*true|ready:\s*true)/g;
  let r;
  while ((r = rowRe.exec(region)) !== null) {
    const id = r[1];
    const isHeader = /category:\s*true/.test(r[0]);
    if (isHeader) {
      const lm = r[0].match(/label:\s*'((?:\\.|[^'\\])*)'/);
      current = lm ? decode(lm[1]).replace(/^[^\w]+/, '') : current;
    } else if (!id.startsWith('_cat_')) {
      sections[id] = current;
    }
  }
  const aliases = {};
  const aliasBlock = src.slice(src.indexOf('var _searchAliasMap = {'), src.indexOf('function _normalizeToolSearchText'));
  for (const a of aliasBlock.matchAll(/^\s+([A-Za-z][A-Za-z0-9_$]*):\s*'([^']*)'/gm)) aliases[a[1]] = a[2];
  return { sections, aliases };
}

const { sections, aliases } = readCatalogContext();

const records = [];
for (const f of fs.readdirSync(STEM_DIR)) {
  if (!/^stem_tool_.*\.js$/.test(f) || f.endsWith('.bak')) continue;
  const p = path.join(STEM_DIR, f);
  const src = fs.readFileSync(p, 'utf8');
  // Harvest content headings once per FILE, then attach to the tool(s) it
  // registers (nearly always one). Longest-first so specific headings like
  // "Attachment: the theory vs. the brand" win the cap over generic ones.
  const topicSeen = new Set();
  const fileTopics = [];
  for (const tm of [...src.matchAll(TOPIC_RE), ...src.matchAll(T_FALLBACK_RE)]) {
    const raw = decode(tm[2]);
    if (raw.length < 6 || raw.length > 70) continue;
    if (TOPIC_SKIP.test(raw)) continue;
    if (!/[A-Za-z]{3}/.test(raw)) continue;
    const key = raw.toLowerCase();
    if (topicSeen.has(key)) continue;
    topicSeen.add(key);
    fileTopics.push(raw);
  }
  // Keep SOURCE order (curriculum order) for the displayed sample, but feed
  // EVERY heading into keyword extraction below. Sorting longest-first was a
  // mistake: it spent the cap on verbose headings and dropped exactly the
  // distinctive ones ("Attachment: the theory vs. the brand" lost its slot).
  const topics = fileTopics.slice(0, MAX_TOPICS);
  const allHeadings = fileTopics.join(' ');
  for (const t of extractTools(p, src)) {
    t.topics = topics;
    t.allHeadings = allHeadings;
    const description = decode(t.description).slice(0, MAX_DESC);
    const label = decode(t.label);
    const section = sections[t.id] || '';
    const toolTopics = t.topics || [];
    records.push({
      id: t.id,
      label: label,
      section: section,
      // The tool's OWN description — the thing neither consumer could see.
      desc: description,
      // Headings from inside the tool: what it actually teaches.
      topics: toolTopics,
      // Filled in the rarity pass below (needs corpus-wide counts).
      keywords: [],
      _terms: [description, t.quests.map(decode).join(' '), aliases[t.id] || '', section, t.allHeadings || ''].join(' ')
    });
  }
}
// ── Rarity pass ──────────────────────────────────────────────────────────
// Keywords are bounded, so WHICH ones survive decides whether a search finds
// a tool. Taking the first N words gave every tool "practice, student, learn".
// Score each term by how RARE it is across the corpus: a term in one tool
// ("manifestation", "attachment", "titration") identifies it; a term in
// eighty tools does not. Bounded output, maximal discrimination.
const docFreq = Object.create(null);
for (const r of records) {
  for (const w of new Set(String(r._terms).toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [])) {
    docFreq[w] = (docFreq[w] || 0) + 1;
  }
}
const N = records.length;
for (const r of records) {
  const counts = Object.create(null);
  for (const w of String(r._terms).toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || []) {
    if (STOP.has(w)) continue;
    counts[w] = (counts[w] || 0) + 1;
  }
  r.keywords = Object.keys(counts)
    // Terms in more than a third of all tools carry no routing signal.
    .filter((w) => docFreq[w] <= Math.max(2, Math.floor(N / 3)))
    .map((w) => ({ w: w, score: (1 + Math.log(counts[w])) * Math.log(N / docFreq[w]) }))
    .sort((a, b) => b.score - a.score || a.w.localeCompare(b.w))
    .slice(0, MAX_KEYWORDS)
    .map((x) => x.w);
  delete r._terms;
}
records.sort((a, b) => a.id.localeCompare(b.id));

const payload = {
  version: 1,
  generated: new Date().toISOString().slice(0, 10),
  count: records.length,
  note: 'Derived from each tool\'s own registerTool config by dev-tools/build_tool_index.cjs. Never hand-edit; never add tool source.',
  tools: records
};
const json = JSON.stringify(payload);

if (CHECK_ONLY) {
  if (!fs.existsSync(OUT)) { console.error('tool_index.json missing — run without --check'); process.exit(1); }
  const cur = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const curIds = new Set(cur.tools.map((t) => t.id));
  const newIds = records.map((t) => t.id).filter((id) => !curIds.has(id));
  const goneIds = [...curIds].filter((id) => !records.some((t) => t.id === id));
  if (newIds.length || goneIds.length) {
    if (newIds.length) console.error('  tools missing from the index: ' + newIds.join(', '));
    if (goneIds.length) console.error('  stale entries in the index: ' + goneIds.join(', '));
    console.error('tool_index.json is stale — run: node dev-tools/build_tool_index.cjs');
    process.exit(1);
  }
  console.log('tool_index.json current: ' + cur.tools.length + ' tools.');
  process.exit(0);
}

fs.writeFileSync(OUT, json, 'utf8');
try { fs.writeFileSync(MIRROR, json, 'utf8'); } catch (_) {}
const withDesc = records.filter((t) => t.desc.length > 40).length;
console.log('tool_index.json: ' + records.length + ' tools, ' + Math.round(json.length / 1024) + ' KB');
console.log('  with a real self-description: ' + withDesc + '/' + records.length);
console.log('  avg keywords: ' + Math.round(records.reduce((n, t) => n + t.keywords.length, 0) / records.length));
console.log('  mirrored to desktop/web-app/public/tool_index.json');
