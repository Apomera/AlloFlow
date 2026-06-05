#!/usr/bin/env node
// Static gate: the Arc City Gauntlet's `stages` list must reference ONLY real
// function-family levels — never a Transformations (goal:'match') level.
//
// Why: gauntletRank / familyStatus / the stage-clone render all assume the staged
// level has node/gate geometry and is a "used the family to light a node" level.
// A match level (which has a ghost + goal:'match' and no node objective) staged in
// the Gauntlet would mis-rank, double-count the family, and render a phantom node.
// Cheap to assert, easy to violate in a future edit — so we pin it in CI.

const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '..', 'stem_lab', 'stem_tool_arccity.js');
const src = fs.readFileSync(file, 'utf8');

// Load the pure core (the module bails out of its browser block under Node).
let core;
try { core = require(path.resolve(file)); } catch (e) {
  console.error('check_gauntlet_stages: could not require ' + file + ' — ' + e.message);
  process.exit(1);
}
const LEVELS = core.LEVELS || [];
const byId = {};
LEVELS.forEach(l => { byId[l.id] = l; });

const gauntlets = LEVELS.filter(l => l.family === 'gauntlet');
let problems = [];

gauntlets.forEach(g => {
  (g.stages || []).forEach(sid => {
    const st = byId[sid];
    if (!st) { problems.push(`  ✗ ${g.id} stages → "${sid}" is not a real level`); return; }
    if (st.goal === 'match') problems.push(`  ✗ ${g.id} stages → "${sid}" is a match/Transformations level (goal:'match') — not allowed`);
    if (st.family === 'gauntlet') problems.push(`  ✗ ${g.id} stages → "${sid}" is itself a gauntlet`);
  });
});

if (problems.length) {
  console.error('═══ ✗ check_gauntlet_stages FAILED ═══');
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('✓ check_gauntlet_stages: ' + gauntlets.length + ' gauntlet(s), all stages are real function-family levels (no match levels staged).');
process.exit(0);
