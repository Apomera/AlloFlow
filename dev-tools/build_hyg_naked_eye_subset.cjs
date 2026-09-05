#!/usr/bin/env node
/*
 * build_hyg_naked_eye_subset.cjs
 *
 * Derives the compact naked-eye star catalog used by the Night Sky tool's
 * 3D Observatory from the HYG Database (v4.1, CC BY-SA 4.0).
 *
 *   node dev-tools/build_hyg_naked_eye_subset.cjs <path/to/hygdata_v41.csv>
 *
 * Output (written to both served copies of the tool):
 *   stem_lab/assets/astronomy/hyg-v41-naked-eye.json
 *   desktop/web-app/public/stem_lab/assets/astronomy/hyg-v41-naked-eye.json
 *
 * The derived file keeps HIP id, J2000 RA/Dec (degrees), visual magnitude,
 * B-V colour index, IAU constellation code, distance and 3D space velocity,
 * plus proper names, for every star brighter than the magnitude limit. It
 * records the source checksum so the derivation is reproducible, and it fails
 * loudly if any star referenced by the tool's 15 constellation recognition
 * patterns is missing, or if a known proper motion fails to reproduce.
 *
 * Space velocity is COMPUTED here from the catalog's primary measurements
 * (ra, dec, dist, pmra, pmdec, rv) rather than read from HYG's own vx/vy/vz
 * columns, which are printed with too few decimals for nearby stars. The
 * result is cross-checked against those columns to prove the frame convention
 * matches: equatorial J2000 cartesian, +X to the vernal equinox, +Z to the
 * north celestial pole. Velocities are stored as integers in nanoparsecs per
 * year to stay compact. Stars without a usable parallax (dist >= 10000 pc)
 * are stored with zero distance and velocity, read as "too far to drift".
 * Stars whose own vx/vy/vz contradict their pm columns are reported.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const MAG_LIMIT = 6.5;
const SOURCE_URL = 'https://github.com/astronexus/HYG-Database/blob/main/hyg/CURRENT/hygdata_v41.csv';
const LICENSE_URL = 'https://github.com/astronexus/HYG-Database/blob/main/hyg/CURRENT/LICENSE';
const OUTPUTS = [
  'stem_lab/assets/astronomy/hyg-v41-naked-eye.json',
  'desktop/web-app/public/stem_lab/assets/astronomy/hyg-v41-naked-eye.json'
];

const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) {
  console.error('usage: node dev-tools/build_hyg_naked_eye_subset.cjs <hygdata_v41.csv>');
  process.exit(2);
}

function parseCsvLine(line) {
  const out = [];
  let field = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(field); field = ''; }
    else field += ch;
  }
  out.push(field);
  return out;
}

const raw = fs.readFileSync(csvPath);
const sha256 = crypto.createHash('sha256').update(raw).digest('hex');
const lines = raw.toString('utf8').split(/\r?\n/);
const header = parseCsvLine(lines[0]);
const col = name => {
  const idx = header.indexOf(name);
  if (idx < 0) throw new Error('missing column ' + name);
  return idx;
};
const C = { id: col('id'), hip: col('hip'), proper: col('proper'), ra: col('ra'), dec: col('dec'), mag: col('mag'), ci: col('ci'), con: col('con'),
  dist: col('dist'), vx: col('vx'), vy: col('vy'), vz: col('vz'), pmra: col('pmra'), pmdec: col('pmdec'), rv: col('rv') };
const VEL_SCALE = 1e9;         // store parsecs/year as integer nanoparsecs/year
const FAR_PC = 10000;          // HYG uses 100000 pc for "no usable parallax"
const MAS_TO_RAD = Math.PI / (180 * 3600 * 1000);
const KMS_TO_PCYR = 1.0227121650537077e-6;
let farCount = 0, noRv = 0;
const frameDiffs = [];         // |computed - HYG| / |HYG| for rows with a usable HYG vector
const inconsistent = [];       // rows where HYG's own vector contradicts its pm columns

const conCodes = [];
const conIndex = new Map();
const stars = [];
const names = {};
for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue;
  const row = parseCsvLine(lines[i]);
  if (row[C.id] === '0') continue;                       // Sol
  const mag = Number(row[C.mag]);
  if (!Number.isFinite(mag) || mag > MAG_LIMIT) continue;
  const hip = row[C.hip] ? Number(row[C.hip]) : 0;
  const raDeg = Number(row[C.ra]) * 15;
  const decDeg = Number(row[C.dec]);
  const ciRaw = Number(row[C.ci]);
  const con = row[C.con] || '';
  if (con && !conIndex.has(con)) { conIndex.set(con, conCodes.length); conCodes.push(con); }
  const distRaw = Number(row[C.dist]);
  const usable = Number.isFinite(distRaw) && distRaw > 0 && distRaw < FAR_PC;
  if (!usable) farCount++;
  // Build the space velocity from the primary measurements, in the same
  // equatorial J2000 cartesian frame HYG uses for x/y/z.
  let vx = 0, vy = 0, vz = 0;
  if (usable) {
    const cd = Math.cos(decDeg * Math.PI / 180), sd = Math.sin(decDeg * Math.PI / 180);
    const cr = Math.cos(raDeg * Math.PI / 180), sr = Math.sin(raDeg * Math.PI / 180);
    const rHat = [cd * cr, cd * sr, sd];
    const eRa = [-sr, cr, 0];                 // direction of increasing RA (pmra already carries cos dec)
    const eDec = [-cr * sd, -sr * sd, cd];    // direction of increasing Dec
    const pmra = Number(row[C.pmra]) || 0, pmdec = Number(row[C.pmdec]) || 0;
    const rv = Number(row[C.rv]);
    if (!Number.isFinite(rv) || rv === 0) noRv++;
    const tRa = pmra * MAS_TO_RAD * distRaw;                       // pc/yr
    const tDec = pmdec * MAS_TO_RAD * distRaw;
    const tRad = (Number.isFinite(rv) ? rv : 0) * KMS_TO_PCYR;
    vx = tRa * eRa[0] + tDec * eDec[0] + tRad * rHat[0];
    vy = tRa * eRa[1] + tDec * eDec[1] + tRad * rHat[1];
    vz = tRa * eRa[2] + tDec * eDec[2] + tRad * rHat[2];
    // Prove the frame convention against HYG's own vector, and note rows where
    // that vector disagrees with the pm columns it was supposedly built from.
    const hx = Number(row[C.vx]), hy = Number(row[C.vy]), hz = Number(row[C.vz]);
    const mag3 = Math.hypot(hx, hy, hz);
    if (Number.isFinite(mag3) && mag3 > 1e-7) {
      const diff = Math.hypot(vx - hx, vy - hy, vz - hz) / mag3;
      frameDiffs.push(diff);
      if (diff > 0.05) inconsistent.push({ hip: hip || '?', name: row[C.proper] || '', mag: mag.toFixed(2), diff: diff });
    }
  }
  stars.push([
    hip,
    Number(raDeg.toFixed(3)),
    Number(decDeg.toFixed(3)),
    Number(mag.toFixed(2)),
    Number.isFinite(ciRaw) ? Number(ciRaw.toFixed(2)) : 0.6,
    con ? conIndex.get(con) : -1,
    usable ? Number(distRaw.toFixed(2)) : 0,
    usable && Number.isFinite(vx) ? Math.round(vx * VEL_SCALE) : 0,
    usable && Number.isFinite(vy) ? Math.round(vy * VEL_SCALE) : 0,
    usable && Number.isFinite(vz) ? Math.round(vz * VEL_SCALE) : 0
  ]);
  if (row[C.proper] && hip) names[String(hip)] = row[C.proper];
}
stars.sort((a, b) => a[3] - b[3]);

// Every HIP referenced by the tool's recognition patterns must resolve.
const source = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_astronomy.js'), 'utf8');
const start = source.indexOf('var CONSTELLATION_PATTERNS = {');
const end = source.indexOf('\n  };', start);
const block = source.slice(start, end);
const wanted = new Set();
for (const m of block.matchAll(/stars:\s*\[((?:\[[^\]]*\],?\s*)+)\]/g)) {
  for (const s of m[1].matchAll(/\[(\d+),/g)) wanted.add(Number(s[1]));
}
const have = new Set(stars.map(s => s[0]));
const missing = [...wanted].filter(hip => !have.has(hip));
if (!wanted.size || missing.length) {
  console.error('pattern stars missing from subset:', missing, 'wanted', wanted.size);
  process.exit(1);
}

const payload = {
  name: 'HYG v4.1 naked-eye subset',
  source: 'HYG Database v4.1 (hygdata_v41.csv) by David Nash / astronexus',
  sourceUrl: SOURCE_URL,
  sourceSha256: sha256,
  license: 'CC BY-SA 4.0',
  licenseUrl: LICENSE_URL,
  adaptation: 'Filtered to visual magnitude <= ' + MAG_LIMIT + ', excluding the Sun; kept HIP id, J2000 RA/Dec in degrees (3 dp), magnitude, B-V colour index, IAU constellation code, distance in parsecs and equatorial J2000 space velocity in nanoparsecs per year, plus proper names. Stars without a usable parallax carry zero distance and velocity. Generated by dev-tools/build_hyg_naked_eye_subset.cjs.',
  epoch: 'J2000',
  velocityScale: VEL_SCALE,
  velocityUnits: 'parsecs per year divided by velocityScale, equatorial J2000 cartesian (+X to the vernal equinox, +Z to the north celestial pole)',
  magnitudeLimit: MAG_LIMIT,
  count: stars.length,
  withMotion: stars.length - farCount,
  fields: ['hip', 'raDeg', 'decDeg', 'mag', 'ci', 'conIndex', 'distPc', 'vx', 'vy', 'vz'],
  constellationCodes: conCodes,
  names: names,
  stars: stars
};
// Compact rows, one star per line, so diffs stay reviewable.
const json = '{\n' + Object.keys(payload).map(key => {
  if (key === 'stars') return '  "stars": [\n' + stars.map(s => '    ' + JSON.stringify(s)).join(',\n') + '\n  ]';
  return '  ' + JSON.stringify(key) + ': ' + JSON.stringify(payload[key]);
}).join(',\n') + '\n}\n';

for (const rel of OUTPUTS) {
  const target = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  // OneDrive sometimes rejects in-place writes; write a sibling then rename.
  const tmp = target + '.tmp';
  fs.writeFileSync(tmp, json);
  fs.renameSync(tmp, target);
  console.log('wrote', rel, json.length, 'bytes');
}
console.log('stars:', stars.length, 'named:', Object.keys(names).length, 'constellations:', conCodes.length, 'pattern HIPs verified:', wanted.size);
console.log('with usable distance + motion:', stars.length - farCount, '| no parallax:', farCount, '| no radial velocity:', noRv);
frameDiffs.sort((a, b) => a - b);
const pct = p => frameDiffs[Math.floor(p * (frameDiffs.length - 1))];
console.log('frame check against HYG vx/vy/vz:', frameDiffs.length, 'stars | median', pct(0.5).toExponential(2), '| p99.9', pct(0.999).toExponential(2));
if (pct(0.999) > 0.01) { console.error('computed velocity frame disagrees with the catalog; refusing to ship'); process.exit(1); }
console.log('rows where the catalog\'s own vector contradicts its pm columns (ours follows pm):', inconsistent.length);
for (const bad of inconsistent) console.log('   HIP', bad.hip, bad.name, 'mag', bad.mag, '->', (bad.diff * 100).toFixed(0) + '% apart');
console.log('source sha256:', sha256);
