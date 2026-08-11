// Built-in engine platform coverage — 2026-08-04.
//
// The managed llama.cpp engine previously shipped Windows-only binary URLs, so
// the "Built-in private AI" first-run path errored on macOS with "llama-server
// was not found inside the downloaded engine archive" (win zips contain
// llama-server.exe; the darwin spawn path looks for llama-server). These pins
// hold the fix: per-platform URL sets, every first-party engine URL SHA-pinned,
// and an extractor that picks tar vs unzip from the archive extension
// (llama.cpp publishes .zip for Windows and .tar.gz for macOS).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(
  resolve(process.cwd(), 'desktop/runtime/alloflow-desktop-runtime.cjs'),
  'utf8',
);

describe('engine binary platform coverage', () => {
  it('publishes darwin and windows URL sets keyed by platform', () => {
    expect(src).toContain("const ENGINE_BINARY_URLS = process.platform === 'darwin'");
    expect(src).toMatch(/llama-b\d+-bin-macos-arm64\.tar\.gz/);
    expect(src).toMatch(/llama-b\d+-bin-macos-x64\.tar\.gz/);
    expect(src).toMatch(/llama-b\d+-bin-win-cpu-arm64\.zip/);
    expect(src).toMatch(/llama-b\d+-bin-win-cpu-x64\.zip/);
  });

  it('SHA-pins every first-party engine binary URL for both platforms', () => {
    const mapStart = src.indexOf('const FIRST_PARTY_DOWNLOAD_SHA256 = new Map([');
    const mapEnd = src.indexOf(']);', mapStart);
    expect(mapStart).toBeGreaterThan(-1);
    const map = src.slice(mapStart, mapEnd);
    // Every engine URL mentioned in ENGINE_BINARY_URLS must appear in the pin
    // map with a 64-hex sha — platform-conditional URLs may not lean on the
    // platform-dependent constant for their pins.
    const urls = [...src.matchAll(/https:\/\/github\.com\/ggml-org\/llama\.cpp\/releases\/download\/[^'"]+/g)]
      .map((m) => m[0]);
    const engineUrls = [...new Set(urls.filter((u) => /llama-b\d+-bin-/.test(u)))];
    expect(engineUrls.length).toBeGreaterThanOrEqual(4);
    for (const url of engineUrls) {
      const idx = map.indexOf(url);
      expect(idx, url + ' must be SHA-pinned').toBeGreaterThan(-1);
      const tail = map.slice(idx, idx + url.length + 90);
      expect(tail, url + ' pin must be a 64-hex sha').toMatch(/'[a-f0-9]{64}'/);
    }
  });

  it('extracts tar.gz archives with tar and keeps the archive extension on disk', () => {
    expect(src).toContain("const isTarball = /\\.(tar\\.gz|tgz)$/i.test(zipPath);");
    expect(src).toContain("spawn('tar', ['-xzf', zipPath, '-C', destDir])");
    expect(src).toContain("const archiveExt = /\\.(tar\\.gz|tgz)$/i.test(url) ? '.tar.gz' : '.zip';");
    // The unix spawn path must ensure the extracted server is executable.
    expect(src).toContain('fs.chmodSync(binary, 0o755)');
  });
});
