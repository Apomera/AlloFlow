#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'research_hub_educator_source.jsx');
const OUTPUT = path.join(ROOT, 'research_hub_educator_module.js');
const MIRROR = path.join(ROOT, 'desktop/web-app', 'public', 'research_hub_educator_module.js');

if (!fs.existsSync(SOURCE)) { console.error('Source not found:', SOURCE); process.exit(1); }

console.log('[ResearchHubEducator] Compiling ...');
try {
  execSync(`npx esbuild "${SOURCE}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${OUTPUT}" --target=es2020`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('esbuild failed'); process.exit(1); }

const compiled = fs.readFileSync(OUTPUT, 'utf-8');
const cleaned = compiled.replace(/\nexport\s*\{\s*\}\s*;?\s*$/, '\n');
fs.writeFileSync(OUTPUT, cleaned, 'utf-8');
fs.writeFileSync(MIRROR, cleaned, 'utf-8');
console.log(`[ResearchHubEducator] Built ${OUTPUT} (${cleaned.split('\n').length} lines)`);
console.log(`[ResearchHubEducator] Mirrored to ${MIRROR}`);
