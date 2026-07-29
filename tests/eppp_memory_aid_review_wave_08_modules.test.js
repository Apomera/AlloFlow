import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));

describe('EPPP memory-aid Wave 08 domain-module contract', () => {
  const manifest = read('dev-tools/eppp_memory_aid_wave08/manifest.json');
  const catalog = read('test_prep/eppp_learning_library.json');
  const catalogById = new Map(catalog.memoryAids.map((item) => [item.id, item]));
  const allModuleIds = Object.values(manifest.domains).flatMap((entry) =>
    read(`dev-tools/eppp_memory_aid_wave08/${entry.module}`).items.map((item) => item.legacyId),
  );

  it('partitions the fixed 149-item Wave 08 scope across eight disjoint domain counts', () => {
    expect(Object.values(manifest.domains).reduce((sum, entry) => sum + entry.expectedItems, 0)).toBe(149);
    expect(Object.keys(manifest.domains)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(allModuleIds).toHaveLength(149);
    expect(new Set(allModuleIds).size).toBe(149);
    expect(allModuleIds.every((id) => catalogById.has(id))).toBe(true);
  });

  for (const domainId of [1, 2, 5]) {
    it(`requires an explicit, directly sourced record for every fixed-scope Domain ${domainId} ID`, () => {
      const entry = manifest.domains[String(domainId)];
      const module = read(`dev-tools/eppp_memory_aid_wave08/${entry.module}`);
      expect(module.items.every((item) => catalogById.get(item.legacyId)?.domainId === domainId)).toBe(true);
      expect(module.items).toHaveLength(entry.expectedItems);
      for (const item of module.items) {
        expect(catalogById.has(item.legacyId)).toBe(true);
        expect(item.content.length).toBeGreaterThan(180);
        expect(item.content).not.toMatch(/[\p{Extended_Pictographic}\uFE0F]|&(?:mdash|ndash|nbsp);|â€”|â€“|â†’|Â /u);
        expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
        expect(item.references.length).toBeGreaterThanOrEqual(1);
        expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
        expect(item.independentExpertStatus).toBe('not-started');
        expect(item.productionStatus).toBe('not-production-validated');
      }
    });
  }

  it('recognizes the concurrently completed Domain 5 module', () => {
    for (const domainId of [5]) {
      expect(manifest.domains[String(domainId)].status).toBe('complete');
    }
  });
});
