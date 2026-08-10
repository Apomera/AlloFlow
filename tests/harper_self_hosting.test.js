import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const VERSION = '2.4.0';
const ASSET_ROOT = `vendor/harper/${VERSION}`;
const PUBLIC_ROOT = `desktop/web-app/public/${ASSET_ROOT}`;
const PAGE_FILE_LIMIT = 25 * 1024 * 1024;
const EXPECTED = {
  'index.js': {
    bytes: 152692,
    sha256: '720072fa23b7ae233eb5244a64ecc4e98149687565cfdca545e078bbbdf13578',
  },
  'BinaryModule-DTTQwokQ.js': {
    bytes: 96775,
    sha256: 'e0fa7d5eebd5f5459b356dfcfb54e09472da8a292f304a632a0647f960c481ac',
  },
  'harper_wasm_full_bg.wasm': {
    bytes: 18231217,
    sha256: '7ff4b501da808b9d196b0d216113e463ff4b0d2b7338ecd44df0aa77a37485a8',
  },
  LICENSE: {
    bytes: 11343,
    sha256: '516659b5ebca507444fa0fc6ed97a01863ce081c2a04771c6f0cd7befcef1008',
  },
};

const sourceFiles = [
  resolve(ROOT, 'view_export_preview_source.jsx'),
  resolve(ROOT, 'view_pdf_audit_source.jsx'),
];

const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');
const extractApplyHelper = (source) => {
  const start = source.indexOf('function _applyHarperTextReplacement');
  const end = source.indexOf('// end _applyHarperTextReplacement', start);
  if (start < 0 || end < 0) throw new Error('Writing Check Apply helper markers missing');
  return source.slice(start, end);
};

describe('self-hosted Harper 2.4.0 runtime', () => {
  for (const [name, expected] of Object.entries(EXPECTED)) {
    it(`${name} is pinned, below the Pages file limit, and byte-identical in the public mirror`, () => {
      const root = readFileSync(resolve(ROOT, ASSET_ROOT, name));
      const mirror = readFileSync(resolve(ROOT, PUBLIC_ROOT, name));
      expect(root.byteLength).toBe(expected.bytes);
      expect(root.byteLength).toBeLessThan(PAGE_FILE_LIMIT);
      expect(digest(root)).toBe(expected.sha256);
      expect(mirror.equals(root)).toBe(true);
    });
  }

  it('retains Harper Apache-2.0 attribution beside the vendored runtime', () => {
    const license = readFileSync(resolve(ROOT, ASSET_ROOT, 'LICENSE'), 'utf8');
    const notices = readFileSync(resolve(ROOT, 'THIRD_PARTY_LICENSES.md'), 'utf8');
    expect(license).toContain('Apache License');
    expect(license).toContain('Version 2.0');
    expect(notices).toContain('vendor/harper/2.4.0/');
    expect(notices).toContain('./vendor/harper/2.4.0/LICENSE');
  });

  it('uses one pinned AlloFlow-hosted WASM request and never references jsDelivr for Harper', () => {
    for (const sourcePath of sourceFiles) {
      const source = readFileSync(sourcePath, 'utf8');
      expect(source).toContain("const assetRoot = 'https://alloflow-cdn.pages.dev/vendor/harper/2.4.0'");
      expect(source).toContain("_imp(assetRoot + '/index.js')");
      expect(source).toContain("createBinaryModuleFromUrl(assetRoot + '/harper_wasm_full_bg.wasm', 'full')");
      expect(source).not.toContain('cdn.jsdelivr.net/npm/harper.js');
      expect(source).not.toContain("assetRoot + '/harper_wasm_bg.wasm'");
      expect(source).toContain('~18 MB');
      expect(source).not.toContain('~10 MB');
    }
  });

  it('ships the same production Apply helper in both panels', () => {
    const helpers = sourceFiles.map((sourcePath) => extractApplyHelper(readFileSync(sourcePath, 'utf8')));
    expect(helpers[1]).toBe(helpers[0]);
  });

  it('preserves empty-string removal suggestions while excluding nulls and duplicates', () => {
    for (const sourcePath of sourceFiles) {
      const source = readFileSync(sourcePath, 'utf8');
      expect(source).toContain('value != null && all.indexOf(value) === index');
      expect(source).not.toContain('.filter(Boolean).slice(0, 3)');
      expect(source).toContain("s || (t('export_preview.writing.remove') || '(remove)')");
    }
  });
});
