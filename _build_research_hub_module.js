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
const EVIDENCE_GRAPH = path.join(ROOT, 'research_evidence_graph.js');
const OUTPUT = path.join(ROOT, 'research_hub_module.js');
const MIRROR = path.join(ROOT, 'prismflow-deploy', 'public', 'research_hub_module.js');
const GRAPH_MIRROR = path.join(ROOT, 'prismflow-deploy', 'public', 'research_evidence_graph.js');
const TMP_SOURCE = path.join(ROOT, '_tmp_research_hub_entry.jsx');
const TMP_COMPILED = TMP_SOURCE + '.compiled.js';

for (const requiredFile of [SOURCE, EVIDENCE_GRAPH]) {
  if (!fs.existsSync(requiredFile)) { console.error('Source not found:', requiredFile); process.exit(1); }
}

console.log('[ResearchHub] Compiling research_hub_source.jsx ...');
try {
  fs.writeFileSync(TMP_SOURCE, fs.readFileSync(EVIDENCE_GRAPH, 'utf8') + '\n' + fs.readFileSync(SOURCE, 'utf8'), 'utf8');
  execSync(`npx esbuild "${TMP_SOURCE}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${TMP_COMPILED}" --target=es2020`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('esbuild failed'); try { fs.unlinkSync(TMP_SOURCE); } catch (_) {} try { fs.unlinkSync(TMP_COMPILED); } catch (_) {} process.exit(1); }
try { fs.unlinkSync(TMP_SOURCE); } catch (_) {}

const compiled = fs.readFileSync(TMP_COMPILED, 'utf-8');
try { fs.unlinkSync(TMP_COMPILED); } catch (_) {}
// esbuild's ESM wrapper is unnecessary for a self-contained IIFE — keep the
// transpiled body but ensure no `export {}` line trails. The source already
// wraps itself in an IIFE so there's nothing else to add.
const cleaned = compiled
  .replace(/"[^"\n]*_tmp_research_hub_entry\.jsx"\(exports, module\)/, '"_tmp_research_hub_entry.jsx"(exports, module)')
  .replace(/\nexport default (require_[A-Za-z0-9_]+)\(\);?\s*$/, '\n$1();\n')
  .replace(/\nexport\s*\{\s*\}\s*;?\s*$/, '\n');
fs.writeFileSync(OUTPUT, cleaned, 'utf-8');
fs.writeFileSync(MIRROR, cleaned, 'utf-8');
fs.writeFileSync(GRAPH_MIRROR, fs.readFileSync(EVIDENCE_GRAPH, 'utf8'), 'utf8');
console.log(`[ResearchHub] Built ${OUTPUT} (${cleaned.split('\n').length} lines)`);
console.log(`[ResearchHub] Mirrored to ${MIRROR}`);
