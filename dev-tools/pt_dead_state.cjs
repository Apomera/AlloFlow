// Dead-state sweep for a STEM tool: which state keys are WRITTEN but never read?
//
// A written-but-never-read key is a control that looks live and does nothing.
// `_plateFocus` put a hover style and a focus ring on 102 plate cards that had
// no effect; `plate.vx` once made "convection moves the plates" a claim the
// model contradicted every frame.
//
// CALIBRATED, and the calibration is the point: run it against the committed
// file (which still contains `_plateFocus`) and it must report that key; run it
// against the fixed file and it must report nothing. A sweep that flags a dozen
// false positives is worse than none, because the next person stops reading it.
// Two patterns it MUST understand, both live in this file:
//   * computed-key writes -- `var u = {}; u['_fooSearch'] = v; upd(u);`
//   * nested state read through a local alias -- `upd({ ptMyth: {...} })` then
//     `var m = d.ptMyth; ... m.answered`
//
//   node dev-tools/pt_dead_state.cjs [file]
const fs = require('fs');
const FILE = process.argv[2] || 'stem_lab/stem_tool_platetectonics.js';
const src = fs.readFileSync(FILE, 'utf8');

// Comments describe the past; a key named only in a comment is not a use.
const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const writes = new Map();
const add = (map, k) => map.set(k, (map.get(k) || 0) + 1);

// Writes 1: object literals handed to a state setter. ANY setter whose name
// contains "upd" counts — `\bupd` alone missed `liveUpd({...})`, the channel the
// canvas uses for four keys, so a key written only there looked unwritten and
// its orphan status went unnoticed. `lastQuakeMag` sat written-and-never-read
// behind exactly that gap.
const WRITE_CALL = /(?:[A-Za-z_$][\w$]*[Uu]pd[A-Za-z_$]*|setIQ|setS|update|upd)\s*\(\s*\{([^{}]|\{[^{}]*\})*\}/g;
let m;
while ((m = WRITE_CALL.exec(code))) {
  const keyRe = /[{,]\s*([A-Za-z_$][\w$]*)\s*:/g;
  let k;
  while ((k = keyRe.exec(m[0]))) add(writes, k[1]);
}
// Writes 2: computed-key assignment onto a patch object.
const WRITE_BRACKET = /\[\s*['"]([A-Za-z_$][\w$]*)['"]\s*\]\s*=[^=]/g;
while ((m = WRITE_BRACKET.exec(code))) add(writes, m[1]);

// Reads: ANY property access of that name, on any object — a nested state field
// is reached through a local alias, so restricting the receiver to `d` invents
// orphans. `=` (but not `==`) means it is the write, not a read.
const reads = new Set();
const READ_DOT = /\.\s*([A-Za-z_$][\w$]*)\s*(?!=[^=])/g;
while ((m = READ_DOT.exec(code))) reads.add(m[1]);
const READ_BRACKET = /\[\s*['"]([A-Za-z_$][\w$]*)['"]\s*\]\s*(?!=[^=])/g;
while ((m = READ_BRACKET.exec(code))) reads.add(m[1]);

// React/DOM props that appear inside patches and are not tool state.
const NOT_STATE = new Set(['className', 'style', 'key', 'type', 'id', 'onClick', 'children']);

const dead = [];
writes.forEach((n, k) => { if (!NOT_STATE.has(k) && !reads.has(k)) dead.push([k, n]); });
dead.sort((a, b) => b[1] - a[1]);

console.log(FILE);
console.log('state keys written: ' + writes.size + ', property names read: ' + reads.size);
console.log('\n=== written but never read (' + dead.length + ') ===');
dead.forEach(([k, n]) => console.log('  ' + k + '  (written ' + n + 'x)'));
if (!dead.length) console.log('  (none)');
process.exitCode = dead.length ? 1 : 0;
