#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { extractAppStyles } = require('./app_styles_extraction.cjs');
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'scratch', 'external-styles-experiment');
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
function build({ check = false } = {}) {
  const source = fs.readFileSync(path.join(ROOT, 'app_styles_source.jsx'), 'utf8');
  const { module, assets } = extractAppStyles(source);
  const original = require('../_build_app_styles_module.js').buildAppStylesModule(source);
  const outputs = [{ file: 'app_styles_module.js', content: module }, ...assets];
  const manifest = {
    experimental: true, sourceSha256: digest(source),
    inlineModuleBytes: Buffer.byteLength(original), externalModuleBytes: Buffer.byteLength(module),
    inlineModuleGzipBytes: zlib.gzipSync(original).length,
    assets: outputs.map(({ file, content }) => ({ file, bytes: Buffer.byteLength(content), gzipBytes: zlib.gzipSync(content).length, sha256: digest(content) })),
    rolloutConstraint: 'External CSS adds an asynchronous request outside the boot registry. Validate readiness and missing-asset recovery before production adoption.',
  };
  outputs.push({ file: 'manifest.json', content: JSON.stringify(manifest, null, 2) + '\n' });
  outputs.push({ file: 'README.txt', content: 'EXPERIMENT ONLY: not included in normal builds or the compact release overlay.\nPublish every manifest-listed asset together only in an isolated test deployment.\nThe CSS link remains at the original style position; typography and motion overrides stay inline.\nContent hashes refer to the exact cooked CSS bytes; existing assets are never deleted.\nA real script URL is required (CDN, local hosted path, or desktop file URL).\nA missing/slow CSS file can leave theme overrides unavailable; boot readiness does not currently wait for it.\nRun node dev-tools/benchmark_app_styles.cjs for local Chromium behavior and timing evidence.\n' });
  for (const { file, content } of outputs) {
    const dest = path.join(OUTPUT, file);
    if (check) { if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== content) throw Error('Stale experiment artifact: ' + file); }
    else { fs.mkdirSync(OUTPUT, { recursive: true }); if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== content) fs.writeFileSync(dest, content); }
  }
  return manifest;
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw Error('Usage: node dev-tools/build_external_styles_experiment.cjs [--check]');
  console.log(JSON.stringify(build({ check: args.includes('--check') }), null, 2));
}
module.exports = { build };
