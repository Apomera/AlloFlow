import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const require = createRequire(import.meta.url);
const canonicalBank = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'eppp_native_items.json'), 'utf8'));
const canonicalCatalog = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'reference_catalog.json'), 'utf8'));
const sourcePackPath = path.join(root, 'test_prep', 'eppp_part_one_pack.json');
const deployPackPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_part_one_pack.json');
const { EXPECTED_ORDER_SHA256, arrangeBalancedBatches, orderSha256 } = require(path.join(root, 'dev-tools', 'build_eppp_part_one_pack.cjs'));

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function extract(moduleText, startMarker, nextMarker) {
  const start = moduleText.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(moduleText.indexOf(startMarker, start + 1)).toBe(-1);
  const dataStart = start + startMarker.length;
  const next = moduleText.indexOf(nextMarker, dataStart);
  expect(next).toBeGreaterThan(dataStart);
  const separator = moduleText.lastIndexOf(';', next);
  expect(moduleText.slice(separator + 1, next).trim()).toBe('');
  return JSON.parse(moduleText.slice(dataStart, separator));
}

describe('targeted EPPP runtime synchronization', () => {
  it('keeps the reference catalog embedded while omitting EPPP Part 1 payload markers from both runtimes', () => {
    const sourceModule = fs.readFileSync(path.join(root, 'test_prep_hub_module.js'), 'utf8');
    const deployModule = fs.readFileSync(path.join(root, 'desktop/web-app/public/test_prep_hub_module.js'), 'utf8');
    expect(deployModule).toBe(sourceModule);

    for (const moduleText of [sourceModule, deployModule]) {
      expect(extract(
        moduleText,
        'const TEST_PREP_REFERENCE_CATALOG = ',
        'const EPPP_INTEGRATED_2027_PREVIEW_PACK = ',
      )).toEqual(canonicalCatalog);
      expect(moduleText).not.toContain('EPPP_NATIVE_ITEMS');
      expect(moduleText).not.toContain('EPPP_PART_ONE_SCAFFOLD');
    }
  });

  it('publishes a deploy-identical lazy pack with the exact deterministic canonical item arrangement', () => {
    const sourceBytes = fs.readFileSync(sourcePackPath);
    const deployBytes = fs.readFileSync(deployPackPath);
    const pack = JSON.parse(sourceBytes.toString('utf8'));

    expect(deployBytes.equals(sourceBytes)).toBe(true);
    expect(pack.id).toBe('eppp-part-one');
    expect(pack.items).toEqual(arrangeBalancedBatches(canonicalBank));
    expect(orderSha256(pack.items)).toBe(EXPECTED_ORDER_SHA256);
  });

  it('binds the lazy registry and manifest descriptor to the exact published pack bytes', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'pack_registry.json'), 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'pack_manifest.json'), 'utf8'));
    const entry = registry.entries.find((candidate) => candidate.id === 'eppp-part-one');
    const descriptor = manifest.entries.find((candidate) => candidate.id === 'eppp-part-one');
    const sourceBytes = fs.readFileSync(sourcePackPath);

    expect(entry).toMatchObject({
      loadMode: 'lazy',
      visibility: 'public',
      sourcePath: 'test_prep/eppp_part_one_pack.json',
    });
    expect(entry.embedded).toBeUndefined();
    expect(descriptor).toMatchObject({
      loadMode: 'lazy',
      packUrl: './test_prep/eppp_part_one_pack.json',
      itemCount: 1500,
      domainCount: 8,
    });
    expect(descriptor.sha256).toBe(sha256(sourceBytes));
  });
});
