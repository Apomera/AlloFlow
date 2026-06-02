#!/usr/bin/env node
/**
 * Builder for research_hub_module.js — mirrors the OnboardingCoach builder
 * pattern. The source.jsx wraps itself in an IIFE so this script only needs
 * to compile JSX → React.createElement and pass through the result.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'research_hub_source.jsx');
const OUTPUT = path.join(ROOT, 'research_hub_module.js');
const MIRROR = path.join(ROOT, 'prismflow-deploy', 'public', 'research_hub_module.js');

if (!fs.existsSync(SOURCE)) { console.error('Source not found:', SOURCE); process.exit(1); }

console.log('[ResearchHub] Compiling research_hub_source.jsx ...');
try {
  execSync(`npx esbuild "${SOURCE}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${OUTPUT}" --target=es2020`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('esbuild failed'); process.exit(1); }

const compiled = fs.readFileSync(OUTPUT, 'utf-8');
// esbuild's ESM wrapper is unnecessary for a self-contained IIFE — keep the
// transpiled body but ensure no `export {}` line trails. The source already
// wraps itself in an IIFE so there's nothing else to add.
const cleaned = compiled.replace(/\nexport\s*\{\s*\}\s*;?\s*$/, '\n');
fs.writeFileSync(OUTPUT, cleaned, 'utf-8');
fs.writeFileSync(MIRROR, cleaned, 'utf-8');
console.log(`[ResearchHub] Built ${OUTPUT} (${cleaned.split('\n').length} lines)`);
console.log(`[ResearchHub] Mirrored to ${MIRROR}`);
