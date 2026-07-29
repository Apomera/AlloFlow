#!/usr/bin/env node
/*
 * check_collision_risk.cjs (2026-07-28) — "is it safe for me to touch this
 * right now?", for a repo where several agents/sessions share ONE working tree.
 *
 * WHY THIS EXISTS
 * This tree takes ~119 commits/day from concurrent sessions. Two failure modes
 * follow, and both are silent:
 *
 *   1. COLLISION — you edit a file another session is mid-edit on. Worst case
 *      is tests/__snapshots__: rebaselining a golden while someone else is
 *      halfway through changing the tool blesses their unfinished state as the
 *      new expected output.
 *   2. STALE WORK — you "fix" something that was already fixed hours ago.
 *      Observed 2026-07-28: a failing-test list four hours old already had one
 *      entry fixed by another session, with a comment explaining the same
 *      reasoning the second fixer was about to apply.
 *
 * A file is HOT if it is modified in the working tree (someone is in it now) or
 * was committed recently (someone was in it lately). Cold files are yours.
 *
 * Usage:
 *   node dev-tools/check_collision_risk.cjs <path> [<path>...]
 *   node dev-tools/check_collision_risk.cjs --hotspots        # busiest dirs
 *   node dev-tools/check_collision_risk.cjs --hours 6 <path>  # tighter window
 *
 * Exit 0 = all cold. Exit 1 = something is in flight. Exit 2 = touched
 * recently but not currently open (proceed, but re-read it first).
 *
 * KNOWN LIMIT — read this before trusting a red result.
 * An uncommitted change is just an uncommitted change; git records no author
 * for it. So this CANNOT tell your own edits from another session's, and will
 * report your own work-in-progress as "in flight". Check it BEFORE you start
 * on a file, not after. It also cannot see work that exists only in another
 * agent's context and has not hit disk yet — a cold result lowers the odds of
 * a collision, it does not prove there isn't one.
 */

const { execSync } = require('child_process');
const path = require('path');

const argv = process.argv.slice(2);
const hoursIdx = argv.indexOf('--hours');
const HOURS = hoursIdx >= 0 ? Number(argv[hoursIdx + 1]) || 24 : 24;
const HOTSPOTS = argv.includes('--hotspots');
const targets = argv.filter((a, i) =>
  !a.startsWith('--') && !(hoursIdx >= 0 && i === hoursIdx + 1));

const sh = (cmd) => {
  try { return execSync(cmd, { maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); }
  catch (_) { return ''; }
};

const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '');

const dirty = new Set(
  sh('git status --porcelain --untracked-files=no')
    .split(/\r?\n/).filter(Boolean).map((l) => norm(l.slice(3).trim()))
);
const recent = new Set(
  sh(`git log --since="${HOURS} hours ago" --name-only --format=`)
    .split(/\r?\n/).map((s) => norm(s.trim())).filter(Boolean)
);

if (HOTSPOTS) {
  const count = (set) => {
    const byDir = {};
    for (const f of set) {
      const d = path.posix.dirname(f);
      byDir[d] = (byDir[d] || 0) + 1;
    }
    return Object.entries(byDir).sort((a, b) => b[1] - a[1]).slice(0, 12);
  };
  console.log(`Files open in the tree right now: ${dirty.size}`);
  count(dirty).forEach(([d, n]) => console.log(`  ${String(n).padStart(4)}  ${d}`));
  console.log(`\nFiles committed in the last ${HOURS}h: ${recent.size}`);
  count(recent).forEach(([d, n]) => console.log(`  ${String(n).padStart(4)}  ${d}`));
  console.log('\nAvoid the top entries of the first list — those are open right now.');
  process.exit(0);
}

if (!targets.length) {
  console.error('Usage: node dev-tools/check_collision_risk.cjs <path>... | --hotspots [--hours N]');
  process.exit(2);
}

// A directory argument covers everything under it.
const classify = (target) => {
  const t = norm(target).replace(/\/$/, '');
  const under = (set) => [...set].filter((f) => f === t || f.startsWith(t + '/'));
  const open = under(dirty);
  const touched = under(recent).filter((f) => !open.includes(f));
  return { open, touched };
};

let worst = 0;
for (const target of targets) {
  const { open, touched } = classify(target);
  const status = open.length ? 'IN FLIGHT' : touched.length ? 'touched recently' : 'cold';
  worst = Math.max(worst, open.length ? 1 : touched.length ? 2 : 0);
  console.log(`${status.padEnd(18)} ${target}`);
  open.slice(0, 6).forEach((f) => console.log(`    open now      ${f}`));
  if (open.length > 6) console.log(`    …and ${open.length - 6} more open`);
  touched.slice(0, 4).forEach((f) => console.log(`    committed <${HOURS}h  ${f}`));
  if (touched.length > 4) console.log(`    …and ${touched.length - 4} more`);
}

console.log('');
if (worst === 1) {
  console.log('UNSAFE — another session has these open. Pick different work, or');
  console.log('coordinate before editing. Snapshots and generated artifacts are the');
  console.log('most dangerous: a rebaseline mid-edit blesses unfinished output.');
  process.exit(1);
}
if (worst === 2) {
  console.log('PROCEED WITH CARE — touched recently but nothing is open. Re-read the');
  console.log('file and re-confirm the problem still exists before fixing it.');
  process.exit(2);
}
console.log('SAFE — nothing here is open or recently touched.');
process.exit(0);
