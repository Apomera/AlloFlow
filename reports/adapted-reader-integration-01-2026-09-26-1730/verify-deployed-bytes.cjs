'use strict';
// Explicit post-deployment GET verification. Reads a frozen manifest; never writes
// files, executes fetched JavaScript, changes Git, opens the app, or deploys.
const fs = require('node:fs'), crypto = require('node:crypto');
const [origin, manifestFile, ...requested] = process.argv.slice(2);
if (!origin || !manifestFile || !requested.length) throw Error('Usage: node verify-deployed-bytes.cjs HTTPS_ORIGIN FROZEN_MANIFEST FILE [FILE ...]');
const base = new URL(origin);
if (base.protocol !== 'https:') throw Error('Use the actual HTTPS asset origin');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
(async () => {
  let failed = false;
  for (const file of requested) {
    if (file.startsWith('/') || file.includes('..') || file.includes('\\')) throw Error('Invalid relative artifact path');
    const expected = manifest.files?.[file]?.sha256;
    if (!/^[a-f0-9]{64}$/.test(expected || '')) throw Error('No frozen SHA-256 for ' + file);
    const url = new URL(file, base.href.endsWith('/') ? base : new URL(base.href + '/'));
    url.searchParams.set('v', expected.slice(0, 8));
    try {
      const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
      const bytes = Buffer.from(await response.arrayBuffer());
      const actual = crypto.createHash('sha256').update(bytes).digest('hex');
      const matches = response.ok && expected === actual;
      failed ||= !matches;
      console.log(JSON.stringify({ file, requestedUrl: url.href, finalUrl: response.url, status: response.status, bytes: bytes.length, expected, actual, matches, etag: response.headers.get('etag'), age: response.headers.get('age'), checkedAt: new Date().toISOString() }));
    } catch (error) {
      failed = true;
      console.log(JSON.stringify({ file, error: error.message, matches: false }));
    }
  }
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
