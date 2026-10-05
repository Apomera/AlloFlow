const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = process.cwd();
const folder = path.join(root, 'reports/micro-lab-portfolio-2026-10-01/drafts');
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_microbiology.js'), 'utf8');
const fragment = fs.readFileSync(path.join(folder, 'portfolio-core-fragment.js'), 'utf8').trimEnd();
const edits = [
  { old: "    function catalog() {\n      function mt(key, fallback) { return __alloMBT('stem.microbiology.mystery_' + key, fallback); }",
    new: "    function catalog(translate) {\n      function mt(key, fallback) { return typeof translate === 'function' ? translate(key, fallback) : __alloMBT('stem.microbiology.mystery_' + key, fallback); }" },
  { old: '    return { summarize: summarize, nextActions: nextActions };\n  })();\n  window.__MicrobiologyCore.work = MicroWork;',
    new: fragment + '\n    return { summarize: summarize, nextActions: nextActions, portfolio: portfolio };\n  })();\n  window.__MicrobiologyCore.work = MicroWork;' }
];
let preview = source;
for (const edit of edits) {
  if (source.includes('\r\n')) { edit.old = edit.old.replace(/\n/g, '\r\n'); edit.new = edit.new.replace(/\r?\n/g, '\r\n'); }
  if (preview.split(edit.old).length !== 2) throw new Error('Non-unique or missing edit anchor');
  preview = preview.replace(edit.old, edit.new);
}
new vm.Script(preview, { filename: 'microbiology-portfolio-preview.js' });
fs.writeFileSync(path.join(folder, 'portfolio-source-edits.json'), JSON.stringify(edits, null, 2) + '\n');
console.log('2 exact edits; integrated source syntax valid.');
