// Embed the audited, pinned MIT library in the standalone Art Studio module.
// No runtime network request or global `spectral` object is needed.
const fs = require('node:fs');
const crypto = require('node:crypto');
const vendor = fs.readFileSync('dev-tools/vendor/spectral-3.0.0.js', 'utf8').replace(/\r\n/g, '\n').trimEnd();
const sha = crypto.createHash('sha256').update(vendor).digest('hex');
const begin = '  // BEGIN ART STUDIO SPECTRAL VENDOR';
const end = '  // END ART STUDIO SPECTRAL VENDOR';
const block = begin + '\n' +
  '  // Spectral.js 3.0.0, commit bb2b05c9d1e65ae824d47e3b1cc17ea32c8ee68f\n' +
  '  // https://github.com/rvanwijnen/spectral.js — original source SHA-256: ' + sha + '\n' +
  '  var artStudioSpectral = (function () {\n    var exports = {}, module = {exports: exports};\n' + vendor + '\n    return exports;\n  })();\n' + end;
const file = 'stem_lab/stem_tool_artstudio.js', served = 'desktop/web-app/public/stem_lab/stem_tool_artstudio.js';
let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf(begin), finish = source.indexOf(end);
if ((start < 0) !== (finish < 0) || (start >= 0 && finish < start)) throw new Error('Incomplete Spectral embed markers; source left unchanged');
if (process.argv.includes('--check')) {
  if (start < 0 || source.slice(start, finish + end.length) !== block) throw new Error('Spectral vendor embed differs from the pinned source');
  if (fs.readFileSync(served, 'utf8') !== fs.readFileSync(file, 'utf8')) throw new Error('Art Studio public mirror differs');
  console.log('Pinned spectral source, embedded license, and public mirror match.');
} else {
  source = start >= 0 ? source.slice(0, start) + block + source.slice(finish + end.length)
    : source.replace("  'use strict';", "  'use strict';\n" + block);
  fs.writeFileSync(file, source.replace(/\n/g, '\r\n'));
  fs.copyFileSync(file, served);
}
