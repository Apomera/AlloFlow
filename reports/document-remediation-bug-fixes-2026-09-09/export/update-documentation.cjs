'use strict';
const fs = require('node:fs');
const file = 'docs/document-export-at-acceptance.md';
let source = fs.readFileSync(file, 'utf8');
const replace = (before, after) => {
  if (!source.includes(before)) throw Error('Missing documentation target');
  source = source.replace(before, after);
};
replace('| Tables | Expected cell values/positions and header roles in HTML/PDF |', '| Tables | Expected cell values/positions and header roles in HTML/PDF; exposed HTML table and required header identities |');
replace('UTF-8 BOMs, canonical Unicode equivalents, inert JSON/plain-text script blocks, embedded data images, and local SVG references remain supported. Reading anchors and extracted PDF text preserve compatibility distinctions such as superscript and subscript characters.', 'UTF-8 BOMs, canonical Unicode equivalents, inert data blocks (including JSON, XML, and plain text), embedded data images, and local SVG references remain supported. Executable JavaScript, modules, import maps, and speculation rules leave static coverage unavailable. Table cell expectations use the same NFC normalization as observed HTML/PDF cells; normalization preserves compatibility distinctions such as superscript and subscript characters.');
replace('Resources that were never requested, such as a preload-none video or unresolved relative stylesheet, remain explicit dependencies.', 'HTML bytes are served once at an isolated inspection origin, so relative CSS requests become observable; all dependency requests remain blocked. Parsed inline and stylesheet declarations also retain resources that were never requested, including hidden backgrounds, inactive media rules, unused fonts, and image-set URLs. Preload-none videos and unresolved relative stylesheets remain explicit dependencies. Table checks require the actual selected table and its required column/row headers to have exposed roles, so hidden or presentational markup cannot pass merely because its DOM tags and cell values match.');
fs.writeFileSync(file, source);
