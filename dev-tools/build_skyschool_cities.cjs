#!/usr/bin/env node
'use strict';

// Offline, deterministic OSM subset conversion. This script never downloads data.
// Input: a retained Overpass JSON response with `out ... geom` geometries.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE = path.join(ROOT, 'vendor/skyschool-cities/source/portland-osm.json');
const DEFAULT_OUTPUT = path.join(ROOT, 'vendor/skyschool-cities/portland.json');
const BBOX = [43.643, -70.285, 43.669, -70.245]; // south, west, north, east
const CENTER = { lat: 43.656, lon: -70.265 };
// Evaluate the same plain browser snippet without adding globals to this process.
const vm = require('node:vm');
const sharedContext = vm.createContext({});
new vm.Script(fs.readFileSync(path.join(__dirname, 'skyschool-city-converter.js'), 'utf8'),
  { filename: 'skyschool-city-converter.js' }).runInContext(sharedContext);
const shared = sharedContext.createFlightCityConverter({
  id: 'portland', name: 'Portland peninsula', lat: CENTER.lat, lon: CENTER.lon, bbox: BBOX,
});
const { convert, validateRing, stitchRings, parseMeters, buildingHeight, signedArea, pointInRing, LIMITS } = shared;
const convertFlightCityData = sharedContext.convertFlightCityData;

function main() {
  const args = process.argv.slice(2);
  let source = DEFAULT_SOURCE, output = DEFAULT_OUTPUT, check = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') check = true;
    else if (args[i] === '--source' && args[i + 1]) source = path.resolve(args[++i]);
    else if (args[i] === '--output' && args[i + 1]) output = path.resolve(args[++i]);
    else throw new Error('Usage: node dev-tools/build_skyschool_cities.cjs [--source FILE] [--output FILE] [--check]');
  }
  const bytes = fs.readFileSync(source);
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const sourceLabel = path.relative(ROOT, source).split(path.sep).join('/');
  const result = convert(JSON.parse(bytes.toString('utf8')), sha, sourceLabel);
  const serialized = JSON.stringify(result) + '\n';
  if (!result.buildings.length || !result.roads.length) throw new Error('Source produced no buildings or no roads; refusing an empty city pack.');
  if (check) {
    if (fs.readFileSync(output, 'utf8') !== serialized) throw new Error('City pack differs from deterministic source conversion. Rebuild it.');
  } else {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, serialized);
  }
  console.log(JSON.stringify({ status: check ? 'verified' : 'built', output: path.relative(ROOT, output), sourceSha256: sha,
    outputSha256: crypto.createHash('sha256').update(serialized).digest('hex'), bytes: Buffer.byteLength(serialized), counts: result.metadata.counts }, null, 2));
}

module.exports = { convert, validateRing, stitchRings, parseMeters, buildingHeight, signedArea, pointInRing, LIMITS, convertFlightCityData };
if (require.main === module) main();
