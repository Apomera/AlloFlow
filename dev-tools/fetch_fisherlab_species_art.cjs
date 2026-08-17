#!/usr/bin/env node
/**
 * Vendor public-domain species artwork for FisherLab.
 *
 * WHY A SCRIPT AND NOT A ONE-OFF DOWNLOAD
 * Licence provenance has to be reproducible. This records, per image, where it
 * came from, who made it and under what terms, and it RE-VERIFIES the licence
 * against the live Commons metadata every time it runs. If a file is ever
 * re-licensed upstream, the next run fails loudly instead of silently shipping
 * something we no longer have the right to use.
 *
 * WHY THE FILE LIST IS PINNED BY HAND
 * Search ranking cannot be trusted for this. Searching Commons for "redfish"
 * returns a US Navy submarine and a lake in Idaho. Every entry below was
 * shortlisted by licence and then chosen by eye; the script's job is to fetch
 * exactly those and prove they are still clean.
 *
 * WHAT COUNTS AS CLEAN
 * Public domain and CC0 only. CC-BY and CC-BY-SA are deliberately excluded —
 * they carry ongoing obligations, and share-alike can propagate into the work
 * it is embedded in. A species with no clean candidate gets NO image and falls
 * back to the drawn SVG key in the tool, which is a perfectly good outcome.
 *
 * Usage:
 *   node dev-tools/fetch_fisherlab_species_art.cjs          # fetch + write manifest
 *   node dev-tools/fetch_fisherlab_species_art.cjs --check   # offline; verify tree matches manifest
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'stem_lab', 'assets', 'fisherlab', 'species');
const MANIFEST = path.join(ROOT, 'stem_lab', 'assets', 'fisherlab', 'asset-manifest.json');
const ATTRIB = path.join(ROOT, 'stem_lab', 'assets', 'fisherlab', 'ATTRIBUTION.md');
const UA = 'AlloFlow-FisherLab/1.0 (educational use; public-domain species art)';
const THUMB_W = 900;   // plenty for a card; keeps each file well under 200 KB

// Only these licence strings are accepted. Anything else aborts that entry.
const CLEAN_LICENCE = /^(public domain|cc0|no restrictions)/i;

// species id -> Commons File: title. Curated; see header.
const PINNED = {
  cod: 'Gadus morhua Gervais.jpg',
  haddock: 'Melanogrammus aeglefinus.jpg',
  pollock: 'Pollachius virens.jpg',
  striper: 'Striped bass morone saxatilis fish.jpg',
  alewife: 'Alosa pseudoharengus (NY).jpg',
  lobster: 'Homarus americanus (YPM IZ 098773).jpeg',
  hake: 'FMIB 50904 Squirrel or White Hake.jpeg',
  monkfish: 'Lophius americanus.jpg',
  'flounder-winter': 'FMIB 50881 Flatfish, or Winter Flounder.jpeg',
  'flounder-yellowtail': 'FMIB 33701 Limanda Ferruginea (Storer).jpeg',
  tautog: 'FMIB 32589 Tautoga Onitis.jpeg',
  cunner: 'FMIB 34026 Ctenolabrus Adspersus Walbaum.jpeg',
  shad: 'The Shad (Clupea Sapidissima).jpg',
  bluefish: 'Pomatomus saltatrix.jpg',
  cusk: 'Brosme brosme.jpg',
  wolffish: 'Anarhichas lupus.jpg',
  spinydogfish: 'Squalus acanthias (Pieni).jpg',
  eel: 'American Eel.jpg',
  sturgeon: 'Acipenser oxyrhynchus.jpg',
  'salmon-atlantic': 'Salmo salar.jpg',
  'herring-atlantic': 'Clupea harengus Gervais.jpg',
  smelt: 'Osmerus mordax.jpg',
};

// Deliberately absent, and why. Recorded so the gap reads as a decision.
const NO_IMAGE = {
  mackerel: 'No public-domain or CC0 image on Commons — every candidate is CC-BY or CC-BY-SA.',
  redfish: 'Commons has no usable Sebastes fasciatus image; a search on the common name returns a submarine and a lake.',
  'pollock-young': 'Same species as pollock; the entry is about juvenile size and where they hold, not appearance.',
};

const strip = (v) => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Commons rate-limits anonymous traffic aggressively and answers 429 in bursts.
 * Back off and retry rather than recording a species as unavailable when the
 * only thing that happened is that we asked too fast — a spurious failure here
 * would end up written into ATTRIBUTION.md as "no clean image exists", which is
 * a false statement about the licence landscape.
 */
async function withRetry(label, fn) {
  const waits = [4000, 12000, 30000, 60000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = /HTTP (429|50\d)/.test(err.message);
      if (!retryable || attempt >= waits.length) throw err;
      process.stdout.write('  … ' + label + ' rate-limited, waiting ' + (waits[attempt] / 1000) + 's\n');
      await sleep(waits[attempt]);
    }
  }
}

async function commons(params) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error('Commons API HTTP ' + r.status);
  return r.json();
}

async function fetchOne(id, title) {
  const d = await withRetry(id, () => commons({
    action: 'query', format: 'json', formatversion: '2',
    titles: 'File:' + title, prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime', iiurlwidth: String(THUMB_W),
  }));
  const page = d?.query?.pages?.[0];
  if (!page || page.missing) throw new Error('no such file on Commons: ' + title);
  const ii = page.imageinfo?.[0];
  if (!ii) throw new Error('no imageinfo: ' + title);
  const em = ii.extmetadata || {};
  const licence = strip(em.LicenseShortName?.value);
  if (!CLEAN_LICENCE.test(licence)) {
    throw new Error('REFUSED — licence is "' + licence + '", not public domain or CC0');
  }
  const src = ii.thumburl || ii.url;
  const buf = await withRetry(id + ' (image)', async () => {
    const img = await fetch(src, { headers: { 'user-agent': UA } });
    if (!img.ok) throw new Error('image HTTP ' + img.status);
    return Buffer.from(await img.arrayBuffer());
  });
  const ext = (ii.thumbmime || ii.mime || '').includes('png') ? '.png' : '.jpg';
  const file = id + ext;
  fs.writeFileSync(path.join(OUT_DIR, file), buf);
  return {
    id,
    file,
    bytes: buf.length,
    width: ii.thumbwidth || ii.width,
    height: ii.thumbheight || ii.height,
    licence,
    licenceUrl: strip(em.LicenseUrl?.value) || null,
    artist: strip(em.Artist?.value) || 'Unknown',
    credit: strip(em.Credit?.value) || null,
    source: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(title.replace(/ /g, '_')),
    sourceTitle: title,
    verified: new Date().toISOString().slice(0, 10),
  };
}

function writeAttribution(entries, skipped) {
  const lines = [
    '# FisherLab species artwork — sources and licences',
    '',
    'Every image here is **public domain or CC0**. Nothing under CC-BY or CC-BY-SA is',
    'included: those carry ongoing obligations, and share-alike can propagate into the',
    'work it is embedded in.',
    '',
    'Licences were verified against live Wikimedia Commons metadata at fetch time by',
    '`dev-tools/fetch_fisherlab_species_art.cjs`. Re-running that script re-checks every',
    'entry and fails if anything has been re-licensed upstream.',
    '',
    'Attribution is not legally required for public-domain works. It is recorded anyway,',
    'because naming the illustrator is the decent thing to do and because it lets anyone',
    'audit the provenance without re-running the fetch.',
    '',
    '| Species | File | Artist / source | Licence | Commons page | Verified |',
    '|---|---|---|---|---|---|',
  ];
  entries.forEach((e) => {
    lines.push('| `' + e.id + '` | `' + e.file + '` | ' + e.artist.replace(/\|/g, '/')
      + ' | ' + e.licence + ' | [' + e.sourceTitle.replace(/\|/g, '/') + '](' + e.source + ') | ' + e.verified + ' |');
  });
  lines.push('', '## Species with no vendored image', '',
    'These fall back to the drawn SVG key in the tool, which is a good outcome rather',
    'than a gap — a schematic drawn to show the diagnostic feature often teaches',
    'identification better than a photograph of one individual at one angle.', '');
  Object.entries(skipped).forEach(([id, why]) => lines.push('- **`' + id + '`** — ' + why));
  lines.push('');
  fs.writeFileSync(ATTRIB, lines.join('\n'));
}

async function main() {
  const check = process.argv.includes('--check');
  if (check) {
    if (!fs.existsSync(MANIFEST)) { console.error('✗ no manifest at ' + MANIFEST); process.exit(1); }
    const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    let bad = 0;
    man.images.forEach((e) => {
      const p = path.join(OUT_DIR, e.file);
      if (!fs.existsSync(p)) { console.error('✗ missing file: ' + e.file); bad++; return; }
      const sz = fs.statSync(p).size;
      if (sz !== e.bytes) { console.error('✗ size drift: ' + e.file + ' is ' + sz + ', manifest says ' + e.bytes); bad++; }
      if (!CLEAN_LICENCE.test(e.licence)) { console.error('✗ non-clean licence recorded: ' + e.file + ' = ' + e.licence); bad++; }
    });
    console.log(bad ? '✗ ' + bad + ' problem(s)' : '✓ ' + man.images.length + ' images, all present and all public domain / CC0');
    process.exit(bad ? 1 : 0);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const entries = [];
  const failures = [];
  for (const [id, title] of Object.entries(PINNED)) {
    try {
      const e = await fetchOne(id, title);
      entries.push(e);
      console.log('✓ ' + id.padEnd(20) + (e.bytes / 1024).toFixed(0).padStart(4) + ' KB  ' + e.licence + '  — ' + e.artist.slice(0, 40));
    } catch (err) {
      failures.push({ id, title, why: err.message });
      console.error('✗ ' + id.padEnd(20) + err.message);
    }
    await sleep(2500);   // be polite to Commons
  }
  fs.writeFileSync(MANIFEST, JSON.stringify({
    generator: 'dev-tools/fetch_fisherlab_species_art.cjs',
    generated: new Date().toISOString().slice(0, 10),
    policy: 'Public domain and CC0 only. CC-BY and CC-BY-SA are refused at fetch time.',
    thumbWidth: THUMB_W,
    images: entries,
    noImage: NO_IMAGE,
  }, null, 2) + '\n');
  writeAttribution(entries, NO_IMAGE);
  const kb = entries.reduce((a, e) => a + e.bytes, 0) / 1024;
  console.log('\n' + entries.length + ' images, ' + kb.toFixed(0) + ' KB total, ' + failures.length + ' failure(s)');
  if (failures.length) { failures.forEach((f) => console.error('  ' + f.id + ': ' + f.why)); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
