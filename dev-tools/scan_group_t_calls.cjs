// Detect GROUP-LEVEL t() calls — a key that resolves to an OBJECT/group (not a leaf string).
// Rendering such a value crashes the app with "Objects are not valid as a React child". A call is
// only SAFE if it passes { returnObjects: true } (the caller then reads sub-keys). This catches the
// class of bug behind the pdf_audit.fidelity crash (a leaf key that collided with a section group).
//   node dev-tools/scan_group_t_calls.cjs
const fs = require('fs');
const REPO = process.cwd();
const LANG = REPO + '/lang/spanish_latin_america.js'; // any full pack works — structure is shared
const lang = JSON.parse(fs.readFileSync(LANG, 'utf8'));
const groups = new Set();
(function walk(o, pre) {
  for (const k of Object.keys(o)) {
    const p = pre ? pre + '.' + k : k;
    if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) { groups.add(p); walk(o[k], p); }
  }
})(lang, '');

const files = fs.readdirSync(REPO).filter((f) => /_module\.js$/.test(f));
files.push('AlloFlowANTI.txt');
// match t('key' ... and capture whether { returnObjects: true } follows on the same call
const callRe = /\bt\(\s*['"`]([A-Za-z0-9_.]+)['"`]([^)]*)\)/g;
const flagged = [];
for (const f of files) {
  let s; try { s = fs.readFileSync(REPO + '/' + f, 'utf8'); } catch (_) { continue; }
  let m;
  while ((m = callRe.exec(s))) {
    const key = m[1], rest = m[2] || '';
    if (groups.has(key) && !/returnObjects\s*:\s*true/.test(rest)) flagged.push(f + '  ->  t("' + key + '")');
  }
}
console.log('Group key-paths: ' + groups.size + ' | scanned ' + files.length + ' shipped files');
if (flagged.length) { console.log('\n[FAIL] group-level t() calls without {returnObjects:true} (render an object -> crash):'); [...new Set(flagged)].forEach((x) => console.log('  ' + x)); process.exit(1); }
console.log('\n[OK] no unsafe group-level t() calls');
