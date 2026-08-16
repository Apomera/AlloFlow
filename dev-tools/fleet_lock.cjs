#!/usr/bin/env node
/**
 * fleet_lock.cjs — advisory file lock for the 10-agent fleet.
 *
 * Why this exists:
 *   Ten agents share ONE working tree. The Edit tool rewrites a whole file.
 *   If two agents edit AlloFlowANTI.txt (55k lines) or ui_strings.js (70k
 *   lines) at the same moment, the second write silently discards the first
 *   agent's change. No error, no conflict marker — the work just vanishes.
 *
 *   Git cannot help here: nothing is committed yet, so there is nothing to
 *   3-way merge. The only defence is to serialise writes to the hot files.
 *
 * Locks live OUTSIDE the repo (C:\tmp\alloflow-fleet-locks) so they never
 * touch git status, never get swept into a concurrent session's commit, and
 * never need a .gitignore entry.
 *
 * Atomicity comes from mkdir(), which is atomic on NTFS and POSIX alike:
 * exactly one caller can create a given directory, everyone else gets EEXIST.
 *
 * Usage:
 *   node dev-tools/fleet_lock.cjs acquire AlloFlowANTI.txt --lane=L4
 *   node dev-tools/fleet_lock.cjs acquire ui_strings.js --lane=L4 --wait
 *   node dev-tools/fleet_lock.cjs release AlloFlowANTI.txt --lane=L4
 *   node dev-tools/fleet_lock.cjs status
 *   node dev-tools/fleet_lock.cjs release-all --lane=L4
 *
 * Exit codes: 0 = acquired / released / free, 1 = busy, 2 = usage error.
 */
const fs = require('fs');
const path = require('path');

const LOCK_ROOT = process.env.ALLOFLOW_FLEET_LOCK_DIR || 'C:\\tmp\\alloflow-fleet-locks';
const STALE_MS = 45 * 60 * 1000;   // a lock older than this is presumed abandoned
const WAIT_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_MS = 5000;

const args = process.argv.slice(2);
const cmd = args[0];
const positional = args.slice(1).filter((a) => !a.startsWith('--'));
const getFlag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const lane = getFlag('lane');
const slug = (f) => f.replace(/[\\/:]/g, '__');

function ensureRoot() {
  fs.mkdirSync(LOCK_ROOT, { recursive: true });
}

function lockDir(file) {
  return path.join(LOCK_ROOT, slug(file));
}

function readMeta(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  } catch {
    return null;
  }
}

function ageMs(meta) {
  if (!meta || !meta.acquiredAt) return Infinity;
  return Date.now() - new Date(meta.acquiredAt).getTime();
}

function tryAcquire(file) {
  const dir = lockDir(file);
  try {
    fs.mkdirSync(dir);
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    const meta = readMeta(dir);
    // Reclaim a lock whose holder died or wandered off.
    if (ageMs(meta) > STALE_MS) {
      console.warn(`[fleet-lock] reclaiming STALE lock on ${file} (held by ${meta && meta.lane}, ` +
        `${Math.round(ageMs(meta) / 60000)} min old)`);
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
      return tryAcquire(file);
    }
    return { ok: false, meta };
  }
  fs.writeFileSync(
    path.join(dir, 'meta.json'),
    JSON.stringify({ file, lane: lane || 'unknown', pid: process.pid, acquiredAt: new Date().toISOString() }, null, 2)
  );
  return { ok: true };
}

function release(file) {
  const dir = lockDir(file);
  const meta = readMeta(dir);
  if (!fs.existsSync(dir)) {
    console.log(`[fleet-lock] ${file} was not locked`);
    return 0;
  }
  if (lane && meta && meta.lane !== lane) {
    console.error(`[fleet-lock] REFUSING: ${file} is held by ${meta.lane}, not ${lane}`);
    return 1;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`[fleet-lock] released ${file}`);
  return 0;
}

async function main() {
  if (!cmd || cmd === 'help' || hasFlag('help')) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''));
    process.exit(2);
  }
  ensureRoot();

  if (cmd === 'status') {
    const entries = fs.existsSync(LOCK_ROOT) ? fs.readdirSync(LOCK_ROOT) : [];
    if (!entries.length) {
      console.log('[fleet-lock] no locks held');
      return 0;
    }
    for (const e of entries) {
      const meta = readMeta(path.join(LOCK_ROOT, e));
      const mins = Math.round(ageMs(meta) / 60000);
      console.log(`[fleet-lock] ${meta ? meta.file : e} — held by ${meta ? meta.lane : '?'} for ${mins} min` +
        (ageMs(meta) > STALE_MS ? '  (STALE, reclaimable)' : ''));
    }
    return 0;
  }

  if (cmd === 'release-all') {
    if (!lane) { console.error('[fleet-lock] release-all requires --lane='); return 2; }
    let n = 0;
    for (const e of fs.readdirSync(LOCK_ROOT)) {
      const meta = readMeta(path.join(LOCK_ROOT, e));
      if (meta && meta.lane === lane) { fs.rmSync(path.join(LOCK_ROOT, e), { recursive: true, force: true }); n++; }
    }
    console.log(`[fleet-lock] released ${n} lock(s) held by ${lane}`);
    return 0;
  }

  const file = positional[0];
  if (!file) { console.error('[fleet-lock] missing <file>'); return 2; }
  if (!lane) { console.error('[fleet-lock] missing --lane=<L1..L10>'); return 2; }

  if (cmd === 'release') return release(file);

  if (cmd === 'acquire') {
    const deadline = Date.now() + WAIT_TIMEOUT_MS;
    for (;;) {
      const res = tryAcquire(file);
      if (res.ok) {
        console.log(`[fleet-lock] ACQUIRED ${file} for ${lane}`);
        return 0;
      }
      const holder = res.meta ? `${res.meta.lane} (${Math.round(ageMs(res.meta) / 60000)} min)` : 'unknown';
      if (!hasFlag('wait')) {
        console.error(`[fleet-lock] BUSY: ${file} is held by ${holder}. Do other work and retry, or pass --wait.`);
        return 1;
      }
      if (Date.now() > deadline) {
        console.error(`[fleet-lock] TIMEOUT waiting for ${file} (held by ${holder})`);
        return 1;
      }
      console.log(`[fleet-lock] waiting for ${file} (held by ${holder})...`);
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }

  console.error(`[fleet-lock] unknown command: ${cmd}`);
  return 2;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error('[fleet-lock] error:', err.message);
  process.exit(2);
});
