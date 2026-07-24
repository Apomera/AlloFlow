#!/usr/bin/env node
'use strict';
// Split video_studio's ffmpeg-core.wasm (~32 MiB) into git-safe chunks.
//
// WHY: Cloudflare hard-fails ANY deploy containing a file over 25 MiB — this
// exact wasm froze alloflow-cdn.pages.dev for 3 days (2026-07-03→05) when it
// was accidentally committed. Keeping it out of git (scoped .gitignore) fixed
// the freeze but left two holes: a fresh clone lacks the file entirely, and
// the CDN surface (Gemini Canvas video studio popup) had NO wasm at all, so
// MP4 export could not work there. Chunks under the limit close both holes
// permanently: they live in git, deploy everywhere, and video_studio.html
// stitches them into a Blob at load time.
//
// Run again only if the vendored @ffmpeg/core version changes:
//   node dev-tools/split_ffmpeg_core.cjs
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const CORE_DIRS = [
  path.join(ROOT, 'video_studio', 'vendor', 'ffmpeg', 'core'),
  path.join(ROOT, 'desktop/web-app', 'public', 'video_studio', 'vendor', 'ffmpeg', 'core'),
];
const CHUNK_BYTES = 20 * 1024 * 1024; // 20 MiB — comfortable margin under Cloudflare's 25 MiB/file limit

const sourceWasm = CORE_DIRS.map((dir) => path.join(dir, 'ffmpeg-core.wasm')).find((p) => fs.existsSync(p));
if (!sourceWasm) {
  console.error('ffmpeg-core.wasm not found in either vendor dir. Restore it first:');
  console.error('  npm pack @ffmpeg/core@0.12.10 && extract package/dist/umd/ffmpeg-core.wasm');
  process.exit(1);
}
const whole = fs.readFileSync(sourceWasm);
const wholeSha = crypto.createHash('sha256').update(whole).digest('hex');
const parts = [];
for (let offset = 0; offset < whole.length; offset += CHUNK_BYTES) {
  parts.push(whole.subarray(offset, Math.min(offset + CHUNK_BYTES, whole.length)));
}
const manifest = JSON.stringify({
  file: 'ffmpeg-core.wasm',
  parts: parts.length,
  bytes: whole.length,
  sha256: wholeSha,
  chunkBytes: CHUNK_BYTES,
  note: 'Stitched into a Blob by video_studio.html resolveFfmpegWasmUrl(); chunks exist because Cloudflare rejects >25MiB files.',
}, null, 2) + '\n';

// Verify the split reassembles byte-perfectly BEFORE writing anything.
const reassembled = Buffer.concat(parts);
if (crypto.createHash('sha256').update(reassembled).digest('hex') !== wholeSha) {
  console.error('ABORT: reassembly hash mismatch — refusing to write parts.');
  process.exit(1);
}

for (const dir of CORE_DIRS) {
  fs.mkdirSync(dir, { recursive: true });
  parts.forEach((part, index) => fs.writeFileSync(path.join(dir, 'ffmpeg-core.wasm.part' + index), part));
  fs.writeFileSync(path.join(dir, 'ffmpeg-core.wasm.parts.json'), manifest);
  console.log('wrote ' + parts.length + ' parts + manifest → ' + path.relative(ROOT, dir));
}
console.log('whole file: ' + whole.length + ' bytes, sha256 ' + wholeSha.slice(0, 16) + '…');
console.log('largest part: ' + Math.max(...parts.map((p) => p.length)) + ' bytes (limit 26214400)');
