#!/usr/bin/env node
/**
 * add_open_catalog_covers.js — give the institutional open-catalog cards
 * (NASA / NOAA / USGS / Library of Congress / Wikisource / Frontiers /
 * OpenStax) real cover images. They are the only entries left with the
 * generic 📖 placeholder — 124 cards as of 2026-07-16 — and they sit on the
 * most-browsed study shelves.
 *
 * Sources, both keyless:
 *   - NASA cards: images-api.nasa.gov search (all NASA media is public
 *     domain apart from insignia; searches return mission/subject photos).
 *   - Everything else: Wikimedia Commons search, RESTRICTED to images whose
 *     extmetadata license is Public Domain / CC0. That keeps hotlinked
 *     covers attribution-free (gov-work photos of hurricanes, coral reefs,
 *     Hine child-labor photographs, etc. are all PD uploads on Commons).
 *
 * Covers are hotlinked URL strings, same shape as Gutendex covers.
 * Idempotent: cards that already have a cover are skipped. Run BEFORE
 * mirror_books.js --fetch (covers live in the index) and ALWAYS review the
 * --dry-run pairing list first — text search can pick a thematically wrong
 * image, and a human eyeball is the only guard.
 *
 * Usage:
 *   node reading_library/add_open_catalog_covers.js --dry-run
 *   node reading_library/add_open_catalog_covers.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const UA = 'AlloFlow reading library cover backfill (education, contact via repo)';
const dryRun = process.argv.includes('--dry-run');

const SOURCES = new Set(['nasa', 'noaa', 'usgs', 'loc', 'wikisource', 'frontiers', 'openstax']);
// PD-only license allowlist for Commons picks (attribution-free hotlinks).
const PD_LICENSE = /^(public domain|pd|cc0)/i;

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function sleepSync(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) { /* Commons 429s under burst retries; back off hard */ }
}

function getJson(url, attempt) {
  attempt = attempt || 1;
  try {
    return JSON.parse(execFileSync('curl', [
      '-sSL', '--fail', '--max-time', '40',
      '-H', 'User-Agent: ' + UA, '-H', 'Accept: application/json', url,
    ], { maxBuffer: 32 * 1024 * 1024 }).toString('utf8'));
  } catch (err) {
    if (attempt < 4) { sleepSync(3000 * attempt); return getJson(url, attempt + 1); }
    return null;
  }
}

// NASA insignia/identity marks are the one part of NASA media with usage
// restrictions — never pick them. Also skip event photography (briefings,
// ceremonies, officials at podiums): a card about black holes should show a
// black hole, not a press conference.
const NASA_SKIP = /(identity|logo|insignia|emblem|patch|full.color.mark|briefing|conference|news|officials|ceremony|award|administrator|portrait|training)/i;

// Hand-curated search queries where the card title itself finds nothing
// usable (textbook edition names, abstract topics) or finds the wrong thing.
// Curation-over-automation: every entry here came from eyeballing a dry run.
const QUERY_OVERRIDES = {
  'Library of Congress Conservation Movement Primary Sources': 'Ansel Adams national park',
  'Library of Congress Immigration Challenges Primary Sources': 'Ellis Island immigrants',
  'Library of Congress: Irish Immigration and Relocation': 'Irish emigrants ship',
  'Library of Congress Primary Source Sets': 'Library of Congress reading room',
  'NASA Climate Change Science': 'Earth Blue Marble',
  'NASA Learning Resources': 'astronaut spacewalk',
  'NASA Sun Science': 'solar flare Solar Dynamics Observatory',
  'NASA TESS Exoplanet Mission': 'TESS spacecraft',
  'NASA Solar System Exploration': 'solar system montage',
  'NASA Moon Science': 'lunar surface Apollo',
  'NASA International Space Station': 'International Space Station Earth orbit',
  'NOAA Education Resource Collections': 'NOAA research ship',
  'NOAA Climate Change Impacts': 'glacier retreat',
  'NOAA Marine Life': 'humpback whale breaching',
  'NOAA National Weather Service Education': 'weather balloon launch',
  'NOAA Ocean Acidification': 'coral bleaching',
  'NOAA Satellites': 'GOES weather satellite',
  'NOAA Severe Weather': 'supercell thunderstorm',
  'USGS Coastal Change Hazards': 'coastal erosion',
  'USGS Earthquake Hazards Program': 'seismogram',
  'USGS Ecosystems Science': 'wetland heron',
  'USGS Mineral Resources': 'quartz mineral crystals',
  'USGS Streamflow and the Water Cycle': 'river gauging station',
  'The Science of Earthquakes': 'San Andreas Fault aerial',
  'Civil Disobedience': 'Henry David Thoreau',
  'Federalist No. 10': 'Federalist Papers',
  'Declaration of Sentiments (Excerpt)': 'Elizabeth Cady Stanton',
  'What to the Slave Is the Fourth of July? (Excerpt)': 'Frederick Douglass',
  'Bacteria: The Unexpected Fans of Greenhouse Gases': 'bacteria electron microscope',
  'The Hidden Global Impacts of Things We Buy': 'container ship cargo',
  'Ocean Acidification, a Silent Threat to Life on Earth': 'sea urchin tide pool',
  'Can We Produce Rice Without Harming Our Planet?': 'rice paddy terraces',
  'An Invisible Fight in the Soil: Tiny Plastic vs. Soil Microbes!': 'soil hands farming',
  'OpenStax Algebra and Trigonometry 2e': 'mathematics equations blackboard',
  'OpenStax American Government 3e': 'White House north lawn',
  'OpenStax Anatomy and Physiology 2e': 'human skeleton anatomy',
  'OpenStax Business Ethics': 'business handshake',
  'OpenStax Calculus Volume 1': 'calculus blackboard',
  'OpenStax Calculus Volume 2': 'calculus blackboard',
  'OpenStax Calculus Volume 3': 'vector field plot',
  'OpenStax Chemistry 2e': 'chemistry laboratory glassware',
  'OpenStax College Success': 'university lecture hall',
  'OpenStax Contemporary Mathematics': 'Fibonacci spiral',
  'OpenStax Introduction to Philosophy': 'The Thinker Rodin',
  'OpenStax Introduction to Political Science': 'ballot box voting',
  'OpenStax Introduction to Sociology 3e': 'city crowd street',
  'OpenStax Introductory Statistics': 'normal distribution curve',
  'OpenStax Microbiology': 'bacteria petri dish',
  'OpenStax Organic Chemistry': 'molecular model chemistry',
  'OpenStax Precalculus 2e': 'function graph mathematics',
  'OpenStax Principles of Economics 3e': 'stock exchange trading floor',
  'OpenStax Psychology 2e': 'human brain illustration',
  'OpenStax U.S. History': 'Washington Crossing the Delaware',
  'OpenStax World History Volume 1': 'Ptolemy world map',
  'OpenStax World History Volume 2': 'Crystal Palace Great Exhibition',
  'OpenStax Writing Guide': 'fountain pen writing',
  'Library of Congress: Dust Bowl Migration': 'dust storm Texas 1935',
  'Library of Congress Women Suffrage Primary Sources': 'suffrage parade New York',
  'An Invisible Fight in the Soil: Tiny Plastic vs. Soil Microbes!': 'earthworm soil',
  'NOAA Marine Debris': 'beach plastic debris',
  'USGS Climate Adaptation Science Centers': 'permafrost Alaska',
  'USGS Ecosystems Science': 'Everglades aerial',
  'USGS Energy and Minerals': 'open pit mine aerial',
  'USGS Landslide Hazards': 'landslide road',
  'USGS Mineral Resources': 'amethyst geode',
  'USGS Natural Hazards': 'volcano eruption aerial',
  'USGS Streamflow and the Water Cycle': 'mountain stream',
  'USGS Water Data for the Nation': 'stream gauge river',
  'Mayflower Compact': 'Mayflower Harbor painting',
};
// A mostly-non-Latin Commons title is a strong signal the search landed on a
// different-language infographic rather than a topical photograph.
function looksWrongScript(title) {
  const letters = String(title).replace(/[^\p{L}]/gu, '');
  if (!letters) return false;
  const nonLatin = letters.replace(/[\p{Script=Latin}]/gu, '');
  return nonLatin.length > letters.length / 3;
}

// "NASA Climate Kids: Water Cycle" -> "Water Cycle"; "NOAA Tornadoes" -> "Tornadoes".
function topicOf(title, sourceId) {
  if (QUERY_OVERRIDES[title]) return QUERY_OVERRIDES[title];
  return String(title)
    .replace(/^(NASA|NOAA|USGS|OpenStax)\s+/i, '')
    .replace(/^Library of Congress:?\s*/i, '')
    .replace(/^(Climate Kids|Space Place):\s*/i, '')
    .replace(/\s+Primary Sources?\s*$/i, '')
    // \s+ keeps "Mineral Resources" intact ("…Re" + "sources" was a real bug).
    .replace(/\s+(Sources|Learning Resources|Resource Collections)\s*$/i, '')
    .replace(/\s*\(Excerpt\)\s*$/i, '')
    .replace(/\s+(2e|3e|Volume \d+)\s*$/i, '')
    .trim() || String(title);
}

function nasaCover(topic) {
  const data = getJson('https://images-api.nasa.gov/search?media_type=image&q=' + encodeURIComponent(topic));
  const items = (data && data.collection && data.collection.items) || [];
  for (const item of items.slice(0, 8)) {
    const title = (item.data && item.data[0] && item.data[0].title) || '';
    if (NASA_SKIP.test(title)) continue;
    const link = (item.links || []).find((l) => /image/.test(l.render || '') || /\.(jpg|png)$/i.test(l.href || ''));
    if (link && /^https:\/\//.test(link.href)) {
      return { url: link.href, label: title };
    }
  }
  return null;
}

function commonsCover(topic) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    '&gsrsearch=' + encodeURIComponent(topic) + '&gsrnamespace=6&gsrlimit=20' +
    '&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime&iiurlwidth=640';
  const data = getJson(api);
  const pages = (data && data.query && data.query.pages) || {};
  const ranked = Object.values(pages).sort((a, b) => (a.index || 99) - (b.index || 99));
  for (const page of ranked) {
    const info = page.imageinfo && page.imageinfo[0];
    if (!info || !/^image\/(jpeg|png)/.test(info.mime || '')) continue;
    const name = String(page.title || '').replace(/^File:/, '');
    if (looksWrongScript(name)) continue;
    const meta = info.extmetadata || {};
    const license = (meta.LicenseShortName && meta.LicenseShortName.value) || '';
    if (!PD_LICENSE.test(license)) continue;
    const url = info.thumburl || info.url;
    if (/^https:\/\//.test(url)) return { url, label: name + ' [' + license + ']' };
  }
  return null;
}

async function main() {
  const wanted = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'books'))) {
    if (!f.endsWith('.json')) continue;
    const file = path.join(ROOT, 'books', f);
    const book = readJson(file);
    const sourceId = book.sourceId || (book.source && book.source.id);
    if (!SOURCES.has(sourceId) || book.cover) continue;
    wanted.push({ file, book, sourceId });
  }
  console.log('open-catalog cards missing a cover: ' + wanted.length + (dryRun ? ' [DRY RUN]' : ''));

  let written = 0;
  for (const entry of wanted) {
    const topic = topicOf(entry.book.title, entry.sourceId);
    const pick = entry.sourceId === 'nasa' ? nasaCover(topic) : commonsCover(topic);
    if (!pick) {
      console.log('  - ' + entry.book.title + ' (no PD image found for "' + topic + '")');
      await sleep(900);
      continue;
    }
    console.log('  ✔ ' + entry.book.title + '\n      <- ' + pick.label.slice(0, 90) + '\n      ' + pick.url.slice(0, 110));
    if (!dryRun) {
      entry.book.cover = pick.url;
      writeJson(entry.file, entry.book);
    }
    written++;
    await sleep(900);
  }
  console.log((dryRun ? '[DRY RUN] would write ' : 'Wrote ') + written + ' covers of ' + wanted.length + '.');
  console.log('Now rebuild the index: node reading_library/mirror_books.js --fetch');
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
