#!/usr/bin/env node
/**
 * ensure-python.js — Make sure a relocatable Python runtime is present so it
 * can be bundled into the app (extraResources → Resources/python-runtime).
 *
 * Piper TTS needs Python 3. Rather than require users to install it, we ship a
 * standalone CPython (python-build-standalone). This script downloads + extracts
 * it into ../python-runtime if it isn't already there, so it isn't committed to
 * git but is always available at package time.
 *
 * Runs automatically before `dist:mac` / `dist:win`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { execSync } = require('child_process');

const RUNTIME_DIR = path.join(__dirname, '..', '..', 'python-runtime');

// python-build-standalone release (relocatable CPython, install_only).
const PBS_TAG = '20260610';
const PBS_VER = '3.12.13';
const ASSETS = {
  'darwin-arm64': `cpython-${PBS_VER}+${PBS_TAG}-aarch64-apple-darwin-install_only.tar.gz`,
  'darwin-x64':   `cpython-${PBS_VER}+${PBS_TAG}-x86_64-apple-darwin-install_only.tar.gz`,
  'win32-x64':    `cpython-${PBS_VER}+${PBS_TAG}-x86_64-pc-windows-msvc-install_only.tar.gz`,
  'linux-x64':    `cpython-${PBS_VER}+${PBS_TAG}-x86_64-unknown-linux-gnu-install_only.tar.gz`,
};
const BASE = `https://github.com/astral-sh/python-build-standalone/releases/download/${PBS_TAG}/`;

function pythonBinExists() {
  const bin = process.platform === 'win32'
    ? path.join(RUNTIME_DIR, 'python.exe')
    : path.join(RUNTIME_DIR, 'bin', 'python3');
  return fs.existsSync(bin);
}

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'AlloFlow-build' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(download(res.headers.location, dest, redirects + 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  if (pythonBinExists()) {
    console.log('[ensure-python] python-runtime already present — skipping download');
    return;
  }

  const key = `${process.platform}-${process.arch}`;
  const asset = ASSETS[key];
  if (!asset) {
    console.warn(`[ensure-python] No python-build-standalone asset for ${key}; skipping (Piper will fall back to system Python).`);
    return;
  }

  const tmp = path.join(os.tmpdir(), `alloflow-python-${Date.now()}.tar.gz`);
  console.log(`[ensure-python] Downloading ${asset}...`);
  await download(BASE + asset, tmp);

  console.log('[ensure-python] Extracting...');
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  // The archive contains a top-level "python/" dir; strip it into RUNTIME_DIR.
  execSync(`tar -xzf "${tmp}" -C "${RUNTIME_DIR}" --strip-components=1`, { stdio: 'pipe' });
  try { fs.unlinkSync(tmp); } catch {}

  if (!pythonBinExists()) throw new Error('Extraction completed but python binary is missing');
  console.log(`[ensure-python] python-runtime ready (${PBS_VER}) at ${RUNTIME_DIR}`);
})().catch((err) => {
  console.error('[ensure-python] FAILED:', err.message);
  process.exit(1);
});
