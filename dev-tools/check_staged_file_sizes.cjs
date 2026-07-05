#!/usr/bin/env node
'use strict';
// Pre-commit gate: refuse to commit any file at or over Cloudflare's 25 MiB
// per-file deploy limit. deploy.sh Step 0.7 (check_cdn_deployable.cjs) already
// guards the deploy path, but sessions also push directly — a single oversized
// commit from any agent would silently re-freeze alloflow-cdn.pages.dev, which
// is exactly how the 3-day 2026-07-03 freeze started. Checks STAGED blob sizes
// (what would actually land in the commit), not working-tree sizes.
// Bypass for a genuinely intended big file (should never happen): --no-verify.
const { execFileSync } = require('child_process');
const LIMIT = 25 * 1024 * 1024;

const staged = execFileSync('git', ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACM'], { encoding: 'utf8' })
  .split('\0').filter(Boolean);
const offenders = [];
for (const file of staged) {
  try {
    const size = parseInt(execFileSync('git', ['cat-file', '-s', ':' + file], { encoding: 'utf8' }).trim(), 10);
    if (size >= LIMIT) offenders.push({ file, size });
  } catch (_) { /* deleted/renamed edge — nothing staged to measure */ }
}
if (offenders.length) {
  console.error('✗ Commit blocked: staged file(s) at/over 25 MiB would freeze the Cloudflare CDN deploy:');
  for (const { file, size } of offenders) {
    console.error('   ' + file + '  (' + (size / 1024 / 1024).toFixed(1) + ' MiB)');
  }
  console.error('  Large binaries stay OUT of git (see video_studio/vendor/ffmpeg/core/.gitignore),');
  console.error('  or split them under the limit like dev-tools/split_ffmpeg_core.cjs does.');
  process.exit(1);
}
