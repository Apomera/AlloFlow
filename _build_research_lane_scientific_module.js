#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'research_lane_scientific_source.jsx');
const OUTPUT = path.join(ROOT, 'research_lane_scientific_module.js');
const MIRROR = path.join(ROOT, 'desktop/web-app', 'public', 'research_lane_scientific_module.js');

if (!fs.existsSync(SOURCE)) { console.error('Source not found:', SOURCE); process.exit(1); }

console.log('[ResearchLaneScientific] Compiling ...');
try {
  execSync(`npx esbuild "${SOURCE}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${OUTPUT}" --target=es2020`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('esbuild failed'); process.exit(1); }

const compiled = fs.readFileSync(OUTPUT, 'utf-8');
const cleaned = compiled.replace(/\nexport\s*\{\s*\}\s*;?\s*$/, '\n');
fs.writeFileSync(OUTPUT, cleaned, 'utf-8');
fs.writeFileSync(MIRROR, cleaned, 'utf-8');
console.log(`[ResearchLaneScientific] Built ${OUTPUT} (${cleaned.split('\n').length} lines)`);
console.log(`[ResearchLaneScientific] Mirrored to ${MIRROR}`);
