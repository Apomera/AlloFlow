const fs = require('node:fs'), assert = require('node:assert/strict');
const file = 'stem_lab/stem_tool_geometryworld.js', raw = fs.readFileSync(file, 'utf8');
let source = raw.replace(/\r\n/g, '\n');
const start = source.indexOf('      ".gw-feedback-stack{');
assert(start > 0);
const end = source.indexOf('\n', start);
const css = '@media(min-width:801px) and (min-height:521px) and (max-height:620px){#geoworld-fs-workspace .gw-feedback-stack{top:112px;bottom:auto}}';
source = source.slice(0, end) + '\n      ' + JSON.stringify(css) + ',' + source.slice(end);
new Function(source);
const data = Buffer.from(raw.includes('\r\n') ? source.replace(/\n/g, '\r\n') : source), fd = fs.openSync(file, 'r+');
try { fs.writeSync(fd, data); fs.ftruncateSync(fd, data.length); } finally { fs.closeSync(fd); }
console.log('Moved stacked feedback above the aiming area in shorter desktop windows.');
