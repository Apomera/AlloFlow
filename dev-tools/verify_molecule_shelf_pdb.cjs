// Verify every Molecule Shelf structure against the live RCSB Protein Data Bank.
//
// Run manually (needs network):  node dev-tools/verify_molecule_shelf_pdb.cjs
//
// Deliberately NOT a vitest suite: the test suite must stay offline and
// deterministic. This is the authoring-time check — run it whenever the
// catalogue gains an entry, so a mistyped or withdrawn PDB code is caught
// before students meet an empty viewer. tests/molecule_shelf_catalog.test.js
// holds the offline invariants (shape, uniqueness, prompt quality).
const fs = require('fs');

const SRC = 'molecule_shelf/molecule_shelf.html';
const src = fs.readFileSync(SRC, 'utf8');
const start = src.indexOf('var STRUCTURES = [');
const end = src.indexOf('\n  ];', start);
if (start < 0 || end < 0) throw new Error('STRUCTURES literal not found in ' + SRC);
const literal = src.slice(start + 'var STRUCTURES = '.length, end + 4).replace(/;\s*$/, '');
const structures = new Function('return ' + literal)();

async function title(pdb) {
  const res = await fetch('https://data.rcsb.org/rest/v1/core/entry/' + pdb, { redirect: 'follow' });
  if (!res.ok) return { ok: false, detail: 'HTTP ' + res.status };
  const json = await res.json();
  return { ok: true, detail: (json.struct && json.struct.title) || '(entry has no title)' };
}

(async () => {
  let failures = 0;
  for (const s of structures) {
    let out;
    try { out = await title(s.pdb); } catch (e) { out = { ok: false, detail: 'request failed: ' + e.message }; }
    if (!out.ok) failures++;
    console.log((out.ok ? 'OK   ' : 'FAIL ') + s.pdb.padEnd(6) + s.name.padEnd(28) + out.detail.slice(0, 80));
  }
  console.log('\n' + structures.length + ' structures checked, ' + failures + ' unresolvable.');
  if (failures) process.exitCode = 1;
})();
