const fs = require('node:fs');
const file = 'dev-tools/rendered_document_fidelity.cjs';
let s = fs.readFileSync(file,'utf8');
const start = s.indexOf('  context = await browser.newContext');
const end = s.indexOf("    phase = 'navigation';", start);
if (start < 0 || end < 0) throw Error('Missing setup block');
s = s.slice(0,start) + s.slice(start,end).split('\n').map(line=>line.trim()? '  '+line:line).join('\n') + s.slice(end);
s = s.replace("item.status = 'unavailable'; item.artifactChanged = true;", "item.status = 'unavailable'; if (/changed-or-missing$/.test(reason)) item.artifactChanged = true;");
fs.writeFileSync(file,s);
