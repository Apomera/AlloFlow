#!/usr/bin/env node
/**
 * Safe Deliverable Mirror Helper (mirror_deliverables.cjs)
 *
 * Mirrors approved root browser deliverables into:
 *   - desktop/web-app/public/
 *   - desktop/web-app/build/
 *   - desktop/app-build/
 *
 * Refuses to mirror shell-owned or environment-specific files (especially root
 * index.html, sw.js, asset-manifest.json, package.json, .env, .firebaserc) so
 * root marketing/config files can never overwrite CRA React app shells.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const MIRROR_DIRS = [
  path.join('desktop', 'web-app', 'public'),
  path.join('desktop', 'web-app', 'build'),
  path.join('desktop', 'app-build'),
];

const BLOCKED_EXACT = new Set([
  'index.html',
  'sw.js',
  'asset-manifest.json',
  'package.json',
  'package-lock.json',
  '.firebaserc',
  'firebase.json',
  'firebase.live-sessions.json',
  'agents.md',
  'claude.md',
  'rules.md',
]);

const BLOCKED_BASENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
]);

function assertNoSymlinkSegments(rootDir, relPath, mustExist) {
  const resolvedRoot = path.resolve(rootDir);
  const rootStat = fs.lstatSync(resolvedRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error(`Unsafe mirror root directory: ${resolvedRoot}`);
  }
  const parts = relPath.split('/').filter(Boolean);
  let cur = resolvedRoot;
  for (const part of parts) {
    cur = path.join(cur, part);
    const st = fs.lstatSync(cur, { throwIfNoEntry: false });
    if (!st) {
      if (mustExist) throw new Error(`Source file does not exist or is not a regular file: ${relPath}`);
      return;
    }
    if (st.isSymbolicLink()) {
      throw new Error(`Refusing to follow symbolic link while mirroring: ${cur}`);
    }
  }
}

function normalizeRelPath(inputPath, rootDir = ROOT) {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    throw new Error('Empty path supplied to mirror_deliverables.');
  }
  const abs = path.resolve(rootDir, inputPath);
  const rel = path.relative(rootDir, abs).split(path.sep).join('/');
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Refusing to mirror path outside repo root: ${inputPath}`);
  }
  const lower = rel.toLowerCase();
  if (lower.startsWith('desktop/') || lower === 'desktop') {
    throw new Error(`Refusing to mirror a desktop/ path as source: ${rel}`);
  }
  if (lower.startsWith('app/') || lower === 'app' || lower.startsWith('claude token/') || lower === 'claude token') {
    throw new Error(`BLOCKED: "${rel}" must never be mirrored from root into desktop/.`);
  }
  const segments = rel.split('/');
  if (segments.some((seg) => seg.startsWith('.'))) {
    throw new Error(`BLOCKED: "${rel}" contains a hidden dotfile/dotdir segment and must not be mirrored.`);
  }
  const baseLower = path.basename(rel).toLowerCase();
  if (BLOCKED_EXACT.has(lower) || BLOCKED_BASENAMES.has(baseLower) || baseLower.startsWith('.env.')) {
    throw new Error(`BLOCKED: "${rel}" must never be mirrored from root into desktop/ (protects CRA app shell and environment config).`);
  }
  return { abs, rel };
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function mirrorDeliverables(paths, { rootDir = ROOT, dryRun = false } = {}) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('Provide one or more root-relative deliverable paths to mirror.');
  }
  const validated = paths.map((p) => {
    const entry = normalizeRelPath(p, rootDir);
    assertNoSymlinkSegments(rootDir, entry.rel, true);
    const stat = fs.lstatSync(entry.abs, { throwIfNoEntry: false });
    if (!stat || stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error(`Source file does not exist or is not a regular file: ${entry.rel}`);
    }
    return entry;
  });

  const results = [];
  for (const { abs, rel } of validated) {
    const srcBytes = fs.readFileSync(abs);
    const srcHash = sha256Buffer(srcBytes);
    for (const mirrorDir of MIRROR_DIRS) {
      const mirrorRel = mirrorDir.split(path.sep).join('/');
      const targetRoot = path.join(rootDir, mirrorDir);
      if (!fs.existsSync(targetRoot)) continue;
      assertNoSymlinkSegments(rootDir, mirrorRel, true);
      assertNoSymlinkSegments(targetRoot, rel, false);
      const dest = path.join(targetRoot, rel);
      if (!dryRun) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        assertNoSymlinkSegments(targetRoot, rel, false);
        const tmpDest = dest + '.mirror-' + process.pid + '-' + crypto.randomBytes(6).toString('hex');
        try {
          fs.writeFileSync(tmpDest, srcBytes, { flag: 'wx', flush: true });
          fs.renameSync(tmpDest, dest);
        } catch (err) {
          try { fs.unlinkSync(tmpDest); } catch (_) {}
          throw err;
        }
        const destHash = sha256File(dest);
        if (destHash !== srcHash) {
          throw new Error(`Parity mismatch after mirroring ${rel} to ${dest}`);
        }
      }
      results.push({ rel, dest, sha256: srcHash });
    }
  }
  return results;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const files = args.filter((a) => a !== '--dry-run');
  if (!files.length) {
    console.error('Usage: node dev-tools/mirror_deliverables.cjs [--dry-run] <rel-path> [...]');
    process.exit(2);
  }
  try {
    const copied = mirrorDeliverables(files, { rootDir: ROOT, dryRun });
    console.log(`${dryRun ? '[dry-run] Would mirror' : 'Mirrored'} ${files.length} deliverable(s) (${copied.length} destination copies, SHA-256 verified).`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = {
  mirrorDeliverables,
  normalizeRelPath,
  BLOCKED_EXACT,
  MIRROR_DIRS,
};
