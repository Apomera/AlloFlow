import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const canonicalHtml = resolve(root, 'verapdf/verapdf_validator.html');
const canonicalJar = resolve(root, 'verapdf/verapdf-cli.jar');
const publicHtml = resolve(root, 'desktop/web-app/public/verapdf/verapdf_validator.html');
const publicJar = resolve(root, 'desktop/web-app/public/verapdf/verapdf-cli.jar');
const buildSource = readFileSync(resolve(root, 'build.js'), 'utf8');
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

describe('veraPDF deploy assets', () => {
  it('keeps veraPDF in the companion-asset build allowlist', () => {
    const block = buildSource.match(/const COMPANION_ASSET_DIRS = \[([\s\S]*?)\n\];/);
    expect(block, 'COMPANION_ASSET_DIRS should exist').not.toBeNull();
    expect(block[1]).toMatch(/['"]verapdf['"]/);
  });

  it('keeps the canonical validator and CLI JAR intact', () => {
    expect(existsSync(canonicalHtml)).toBe(true);
    expect(existsSync(canonicalJar)).toBe(true);
    const html = readFileSync(canonicalHtml, 'utf8');
    expect(html).toContain('Independent PDF/UA-1 validator');
    expect(html).toContain('cheerpjInit');
    expect(html).not.toContain('<div id="alloflow-loader"');
    expect(statSync(canonicalJar).size).toBeGreaterThan(1_000_000);
    expect([...readFileSync(canonicalJar).subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('ships byte-identical validator HTML and CLI JAR in the public artifact', () => {
    expect(existsSync(publicHtml), 'public validator HTML is missing').toBe(true);
    expect(existsSync(publicJar), 'public veraPDF CLI JAR is missing').toBe(true);
    expect(sha256(publicHtml)).toBe(sha256(canonicalHtml));
    expect(sha256(publicJar)).toBe(sha256(canonicalJar));
  });

  it('would reject the HTTP-200 AlloFlow shell that masked the missing route', () => {
    const publicValidator = readFileSync(publicHtml, 'utf8');
    expect(publicValidator).toContain("type: 'verapdf-ready'");
    expect(publicValidator).toContain('boot();');
    expect(publicValidator).not.toContain('AlloFlow | Adaptive UDL Platform');
  });
});
