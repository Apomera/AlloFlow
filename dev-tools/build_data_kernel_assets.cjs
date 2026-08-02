#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const packageDist = path.join(ROOT, 'node_modules', '@duckdb', 'duckdb-wasm', 'dist');
const sourceEntry = path.join(packageDist, 'duckdb-browser.mjs');
const assetsDir = path.join(ROOT, 'duckdb-assets');
const publicAssetsDir = path.join(ROOT, 'desktop', 'web-app', 'public', 'duckdb-assets');
const files = [
  ['duckdb-browser-mvp.worker.js', 'duckdb-browser-mvp.worker.js']
];
const WASM_SOURCE = 'duckdb-mvp.wasm';
const WASM_MANIFEST = WASM_SOURCE + '.manifest.json';
const WASM_CHUNK_BYTES = 16 * 1024 * 1024;
const CLOUDFLARE_FILE_LIMIT = 25 * 1024 * 1024;

function copy(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function removeStaleChunks(targetDir) {
  if (!fs.existsSync(targetDir)) return;
  for (const name of fs.readdirSync(targetDir)) {
    if (name.startsWith(WASM_SOURCE + '.part')) fs.unlinkSync(path.join(targetDir, name));
  }
}

function writeChunkedWasm(source, targetDir) {
  const bytes = fs.readFileSync(source);
  fs.mkdirSync(targetDir, { recursive: true });
  removeStaleChunks(targetDir);
  const parts = [];
  for (let offset = 0, index = 0; offset < bytes.length; offset += WASM_CHUNK_BYTES, index += 1) {
    const chunk = bytes.subarray(offset, Math.min(offset + WASM_CHUNK_BYTES, bytes.length));
    const file = WASM_SOURCE + '.part' + String(index).padStart(2, '0');
    if (chunk.length >= CLOUDFLARE_FILE_LIMIT) throw new Error('DuckDB chunk exceeds Cloudflare file limit: ' + file);
    fs.writeFileSync(path.join(targetDir, file), chunk);
    parts.push({ file, bytes: chunk.length, sha256: sha256(chunk) });
  }
  const manifest = {
    format: 'alloflow-chunked-wasm-v1',
    source: WASM_SOURCE,
    bytes: bytes.length,
    sha256: sha256(bytes),
    parts
  };
  fs.writeFileSync(path.join(targetDir, WASM_MANIFEST), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

function verifyChunkedWasm(targetDir) {
  const manifestPath = path.join(targetDir, WASM_MANIFEST);
  if (!fs.existsSync(manifestPath)) throw new Error('Missing DuckDB WASM manifest: ' + manifestPath);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.format !== 'alloflow-chunked-wasm-v1' || !Array.isArray(manifest.parts) || !manifest.parts.length) {
    throw new Error('Invalid DuckDB WASM manifest: ' + manifestPath);
  }
  const chunks = manifest.parts.map((part) => {
    const partPath = path.join(targetDir, part.file);
    if (!fs.existsSync(partPath)) throw new Error('Missing DuckDB WASM chunk: ' + partPath);
    const bytes = fs.readFileSync(partPath);
    if (bytes.length !== part.bytes || sha256(bytes) !== part.sha256) throw new Error('DuckDB WASM chunk integrity mismatch: ' + part.file);
    if (bytes.length >= CLOUDFLARE_FILE_LIMIT) throw new Error('DuckDB WASM chunk exceeds Cloudflare file limit: ' + part.file);
    return bytes;
  });
  const combined = Buffer.concat(chunks);
  if (combined.length !== manifest.bytes || sha256(combined) !== manifest.sha256) throw new Error('DuckDB WASM reconstruction mismatch: ' + targetDir);
  return manifest;
}

async function main() {
  const check = process.argv.includes('--check');
  if (!fs.existsSync(sourceEntry)) throw new Error('Install @duckdb/duckdb-wasm before building the local runtime.');
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(publicAssetsDir, { recursive: true });
  const bundlePath = path.join(assetsDir, 'duckdb-browser.mjs');
  if (!check) {
    await build({
      entryPoints: [sourceEntry],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      minify: true,
      outfile: bundlePath,
      logLevel: 'warning'
    });
    for (const [source, target] of files) copy(path.join(packageDist, source), path.join(assetsDir, target));
    const sourceManifest = writeChunkedWasm(path.join(packageDist, WASM_SOURCE), assetsDir);
    for (const file of ['README.md', 'duckdb-browser.mjs', ...files.map((pair) => pair[1])]) {
      copy(path.join(assetsDir, file), path.join(publicAssetsDir, file));
    }
    const publicManifest = writeChunkedWasm(path.join(packageDist, WASM_SOURCE), publicAssetsDir);
    if (JSON.stringify(sourceManifest) !== JSON.stringify(publicManifest)) throw new Error('DuckDB WASM mirror manifest drift after build.');
  }
  const required = ['README.md', 'duckdb-browser.mjs', ...files.map((pair) => pair[1])];
  for (const file of required) {
    const source = path.join(assetsDir, file);
    const mirrored = path.join(publicAssetsDir, file);
    if (!fs.existsSync(source) || fs.statSync(source).size < 100) throw new Error('Missing or empty DuckDB asset: ' + source);
    if (!fs.existsSync(mirrored) || !fs.readFileSync(source).equals(fs.readFileSync(mirrored))) throw new Error('DuckDB asset mirror drift: ' + file);
  }
  const sourceManifest = verifyChunkedWasm(assetsDir);
  const publicManifest = verifyChunkedWasm(publicAssetsDir);
  if (JSON.stringify(sourceManifest) !== JSON.stringify(publicManifest)) throw new Error('DuckDB WASM mirror manifest drift.');
  console.log('[data-kernel] ' + (check ? 'verified' : 'built') + ' ' + required.concat([WASM_MANIFEST, sourceManifest.parts.length + ' WASM chunks']).join(', '));
}

main().catch((error) => { console.error('[data-kernel] ' + (error && error.stack || error)); process.exit(1); });