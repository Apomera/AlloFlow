import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const canonicalBank = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'eppp_native_items.json'), 'utf8'));
const canonicalCatalog = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'reference_catalog.json'), 'utf8'));

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
  it('embeds the canonical bank and reference catalog in both AlloFlow runtime copies', () => {
    for (const relativePath of [
      'test_prep_hub_module.js',
      'desktop/web-app/public/test_prep_hub_module.js',
    ]) {
      const moduleText = fs.readFileSync(path.join(root, relativePath), 'utf8');
      expect(extract(
        moduleText,
        'const TEST_PREP_REFERENCE_CATALOG = ',
        'const EPPP_NATIVE_ITEMS = ',
      )).toEqual(canonicalCatalog);
      expect(extract(
        moduleText,
        'const EPPP_NATIVE_ITEMS = ',
        'const EPPP_INTEGRATED_2027_PREVIEW_PACK = ',
      )).toEqual(canonicalBank);
    }
  });
});
