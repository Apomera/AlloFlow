#!/usr/bin/env node
/*
 * check_cdn_live.cjs — is alloflow-cdn.pages.dev actually serving what we committed?
 *
 * WHY THIS EXISTS
 * deploy.sh Step 10 already warns "still propagating" when the CDN is behind, but
 * that message reads as benign and is indistinguishable from ordinary Cloudflare
 * lag. It has now twice masked a multi-day silent freeze in which nothing reached
 * users despite "✓ Deploy complete" (2026-07-03→05, and again 2026-07-25→26 when
 * the CDN sat 205 commits behind).
 *
 * This answers the three questions that actually matter, and needs NO Cloudflare
 * credentials — everything here is a public GET plus local git:
 *
 *   1. Is the CDN stale, and by exactly how much? (Not "seems old" — it md5s the
 *      served file, then walks git history md5ing each blob until one matches, so
 *      it can name the precise commit the CDN is pinned to and count the commits
 *      since.)
 *   2. Is there an UNPUSHED fix sitting locally? This is the one that bit us: the
 *      .npmrc and .assetsignore fixes for the 07-25 freeze both existed in the
 *      repo and had simply never been pushed, so Cloudflare had never seen them.
 *      Check this BEFORE diagnosing anything from scratch.
 *   3. Would the upload exceed Cloudflare's 20,000-file limit? Counted the way
 *      Cloudflare counts it — tracked files MINUS .assetsignore — not the raw repo
 *      total, which is ~3x larger and misleading.
 *
 * Usage:  node dev-tools/check_cdn_live.cjs [--quiet] [--deep]
 *         --deep  walk further back when identifying the pinned commit (slower)
 * Exit:   0 = fresh (or --quiet and only advisories), 1 = stale/over limit.
 */
'use strict';

const cp = require('child_process');
const fs = require('fs');

const QUIET = process.argv.includes('--quiet');
const DEEP = process.argv.includes('--deep');
const CDN = 'https://alloflow-cdn.pages.dev';
const ASSET_LIMIT = 20000;

// Files that prove content freshness. Root-level compiled modules + the student
// shell — the things a stale build actually withholds from users.
const PROBES = ['doc_pipeline_module.js', 'view_pdf_audit_module.js', 'app/index.html', 'app/sw.js'];

const log = (m) => { if (!QUIET) console.log(m); };
const md5 = (buf) => require('crypto').createHash('md5').update(buf).digest('hex');

function sh(cmd, opts) {
  return cp.execSync(cmd, Object.assign({ encoding: 'utf8', maxBuffer: 5e8, stdio: ['ignore', 'pipe', 'ignore'] }, opts || {}));
}

function fetchCdn(path) {
  try {
    // -sL: follow redirects; the bridge paths 308 and a bare curl reads empty.
    return sh('curl -sL --max-time 30 "' + CDN + '/' + path + '"', { encoding: 'buffer' });
  } catch (e) { return null; }
}

function headMd5(path) {
  try { return md5(sh('git show "HEAD:' + path + '"', { encoding: 'buffer' })); } catch (e) { return null; }
}

let failed = false;
const advisories = [];

// ── 1. Freshness ──────────────────────────────────────────────────────────
log('=== CDN freshness (' + CDN + ') ===');
const stale = [];
for (const p of PROBES) {
  const body = fetchCdn(p);
  if (!body || !body.length) { log('  ? ' + p + ' — no response'); advisories.push(p + ' unreachable'); continue; }
  const served = md5(body);
  // d41d8cd9… is the md5 of an empty body — a 404/redirect, not real content.
  if (served === 'd41d8cd98f00b204e9800998ecf8427e') { log('  ? ' + p + ' — empty response'); advisories.push(p + ' empty'); continue; }
  const local = headMd5(p);
  if (!local) { log('  - ' + p + ' — not in HEAD, skipped'); continue; }
  if (served === local) log('  ✓ ' + p + ' matches HEAD');
  else { log('  ✗ ' + p + ' is STALE'); stale.push({ path: p, served }); }
}

// ── 2. How far behind, precisely ──────────────────────────────────────────
if (stale.length) {
  failed = true;
  const probe = stale[0];
  log('\n=== how far behind? (md5-walking history for ' + probe.path + ') ===');
  let pinned = null;
  try {
    const shas = sh('git log --format=%H%x20%ad --date=short -' + (DEEP ? 400 : 80) + ' -- ' + probe.path)
      .split('\n').filter(Boolean);
    for (const line of shas) {
      const sha = line.slice(0, 40);
      let blob;
      try { blob = sh('git show "' + sha + ':' + probe.path + '"', { encoding: 'buffer' }); } catch (e) { continue; }
      if (md5(blob) === probe.served) { pinned = { sha, date: line.slice(41) }; break; }
    }
  } catch (e) { /* fall through */ }

  if (pinned) {
    let behind = '?';
    try { behind = sh('git rev-list --count ' + pinned.sha + '..HEAD').trim(); } catch (e) { /* ignore */ }
    log('  CDN is pinned to ' + pinned.sha.slice(0, 9) + ' (' + pinned.date + ')');
    log('  → ' + behind + ' commit(s) of work have NOT reached users.');
  } else {
    log('  Could not identify the pinned commit' + (DEEP ? '.' : ' — retry with --deep.'));
  }
}

// ── 3. Unpushed fixes — check this FIRST ──────────────────────────────────
log('\n=== unpushed work ===');
try {
  const ahead = sh('git rev-list --count @{u}..HEAD').trim();
  if (ahead === '0') log('  ✓ everything local is pushed to the upstream branch');
  else {
    log('  ⚠ ' + ahead + ' commit(s) are NOT pushed — Cloudflare cannot see them.');
    // Surface anything that looks like it was written to fix the CDN. Both fixes
    // for the 07-25 freeze were sitting here, unpushed, while we diagnosed.
    const suspects = sh('git log --format=%h%x20%s @{u}..HEAD').split('\n')
      .filter((l) => /cloudflare|cdn|npmrc|assetsignore|peer|wrangler|pages/i.test(l));
    if (suspects.length) {
      log('  ⚠ and some look CDN-related — push before diagnosing anything else:');
      suspects.slice(0, 10).forEach((l) => log('      ' + l));
    }
    failed = true;
  }
} catch (e) {
  advisories.push('no upstream configured, skipped unpushed check');
  log('  - no upstream branch configured, skipped');
}

// ── 4. Asset budget, counted the way Cloudflare counts it ─────────────────
log('\n=== Cloudflare asset budget ===');
try {
  let patterns = [];
  try {
    patterns = fs.readFileSync('.assetsignore', 'utf8').split('\n')
      .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  } catch (e) { advisories.push('.assetsignore missing'); }
  const tracked = sh('git ls-tree -r --name-only HEAD').split('\n').filter(Boolean);
  const excluded = (f) => patterns.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p || f.startsWith(p + '/')));
  const uploaded = tracked.filter((f) => !excluded(f)).length;
  const pct = Math.round((uploaded / ASSET_LIMIT) * 100);
  log('  tracked: ' + tracked.length + '  excluded by .assetsignore: ' + (tracked.length - uploaded));
  log('  would upload: ' + uploaded + ' / ' + ASSET_LIMIT + ' (' + pct + '%)');
  if (uploaded > ASSET_LIMIT) { log('  ✗ OVER the limit — the deploy will fail'); failed = true; }
  else if (pct >= 85) log('  ⚠ within 15% of the limit — trim .assetsignore soon');
  else log('  ✓ comfortable headroom');
} catch (e) { advisories.push('asset count failed: ' + e.message); }

// ── Verdict ───────────────────────────────────────────────────────────────
console.log('');
if (advisories.length) advisories.forEach((a) => console.log('  (advisory) ' + a));
if (failed) {
  console.log('✗ check_cdn_live: the CDN is NOT serving current work.');
  console.log('  Order of investigation:');
  console.log('   1. Push anything unpushed above — that alone has been the fix twice.');
  console.log('   2. Then re-run this after ~3 min.');
  console.log('   3. Still stale ⇒ the Cloudflare build is FAILING, not lagging.');
  console.log('      Read the build log:  npx wrangler pages deployment list --project-name alloflow-cdn');
  console.log('      (needs `npx wrangler login` once — a browser click, token stored in ~/.wrangler)');
  process.exit(1);
}
console.log('✓ check_cdn_live: CDN is serving current HEAD.');
