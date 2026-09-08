#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { summarizeCorpus } = require('./lib/pdf_calibration.cjs');
function main(argv) {
  let manifest = path.resolve(__dirname, '../tests/fixtures/pdf_calibration/manifest.json');
  let output = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--synthetic') manifest = path.resolve(__dirname, '../tests/fixtures/pdf_calibration/synthetic_cases.json');
    else if (['--manifest', '--output'].includes(argv[i]) && argv[i + 1]) {
      const key = argv[i++]; if (key === '--manifest') manifest = path.resolve(argv[i]); else output = path.resolve(argv[i]);
    } else throw new Error('Usage: evaluate_pdf_calibration.cjs [--synthetic | --manifest path] [--output path]');
  }
  const report = summarizeCorpus(JSON.parse(fs.readFileSync(manifest, 'utf8').replace(/^\uFEFF/, '')));
  const text = JSON.stringify(report, null, 2) + '\n';
  if (output) fs.writeFileSync(output, text); else process.stdout.write(text);
  return report;
}
if (require.main === module) { try { main(process.argv.slice(2)); } catch (error) { console.error('ERROR: ' + error.message); process.exitCode = 1; } }
module.exports = { main };
