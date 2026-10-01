import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readText = (relativePath) => fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8');
const read = (relativePath) => JSON.parse(readText(relativePath));
const expectedIds = [
  'memory-aid-482b603596c65a36',
  'memory-aid-ff9ee0f88ec23c3c',
  'memory-aid-987b61706881a2c2',
  'memory-aid-864f21c56e777468',
  'memory-aid-0268cd33a4a6a6e2',
  'memory-aid-716f45f325772345',
  'memory-aid-89c4eeffaecadf77',
  'memory-aid-0b8549193274b34a',
  'memory-aid-387dbae0e9f5805b',
  'memory-aid-b1ff4834475cd4b8',
  'memory-aid-5d7c416a8764207e',
  'memory-aid-d6e2994344946855',
  'memory-aid-ce4adc51c2d4de03',
  'memory-aid-1c0abe04158c19c3',
  'memory-aid-1c6c42c0298ca5f4',
  'memory-aid-bd439c29c157b3b4',
  'memory-aid-ff349570c3d77b98',
  'memory-aid-b1fef52c48b087e8',
  'memory-aid-dddef0fb77b1e85d',
  'memory-aid-bb2b380a4f013810',
  'memory-aid-c03593684f409ca7',
  'memory-aid-2769357408996084',
  'memory-aid-10189232960afd2b',
  'memory-aid-333459badc77f327',
  'memory-aid-c69828a708ce1660',
];
const parallelPairs = [
  ['memory-aid-482b603596c65a36', 'memory-aid-dddef0fb77b1e85d'],
  ['memory-aid-b1ff4834475cd4b8', 'memory-aid-333459badc77f327'],
  ['memory-aid-ce4adc51c2d4de03', 'memory-aid-c03593684f409ca7'],
  ['memory-aid-d6e2994344946855', 'memory-aid-2769357408996084'],
  ['memory-aid-387dbae0e9f5805b', 'memory-aid-b1fef52c48b087e8'],
  ['memory-aid-0b8549193274b34a', 'memory-aid-10189232960afd2b'],
];

describe('EPPP memory-aid Wave 08 Domain 5', () => {
  const modulePath = 'dev-tools/eppp_memory_aid_wave08/domain_05.json';
  const module = read(modulePath);
  const catalog = read('test_prep/eppp_learning_library.json');
  const catalogDomainIds = new Set(catalog.memoryAids
    .filter((item) => item.domainId === 5)
    .map((item) => item.id));

  it('covers the exact fixed 25-ID Assessment and Diagnosis scope once', () => {
    expect(module).toMatchObject({
      schemaVersion: 1,
      domainId: 5,
      status: 'complete-source-reviewed-editorial-pass',
    });
    expect(module.items).toHaveLength(25);
    expect(new Set(module.items.map((item) => item.legacyId)).size).toBe(25);
    expect(module.items.map((item) => item.legacyId).sort()).toEqual([...expectedIds].sort());
    expect(expectedIds.every((id) => catalogDomainIds.has(id))).toBe(true);
  });

  it('provides substantive, directly sourced rewrites with conservative release gates', () => {
    for (const item of module.items) {
      expect(item.content.length, item.legacyId).toBeGreaterThan(300);
      expect(item.references, item.legacyId).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.references.length, item.legacyId).toBeGreaterThanOrEqual(1);
      expect(item.sourceDetails.every((source) => source.whyReputable.length > 100), item.legacyId).toBe(true);
      expect(item.references, item.legacyId).not.toContain('https://www.psychiatry.org/psychiatrists/practice/dsm/educational-resources/dsm-5-fact-sheets');
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(item.reviewMode).toBe('claim-level-source-and-editorial-correction');
      expect(item.independentExpertStatus).toBe('not-started');
      expect(item.productionStatus).toBe('not-production-validated');
      expect(item.reviewNote).toContain('cannot establish a diagnosis');
    }
    expect(new Set(module.items.flatMap((item) => item.references)).size).toBeGreaterThanOrEqual(25);
  });

  it('keeps every module byte ASCII-clean and rejects encoded punctuation or emoji', () => {
    const bytes = fs.readFileSync(resolve(process.cwd(), modulePath));
    const generatorBytes = fs.readFileSync(resolve(process.cwd(), 'dev-tools/eppp_memory_aid_wave08/build_domain_05.cjs'));
    expect(Array.from(bytes).every((byte) => byte <= 0x7f)).toBe(true);
    expect(Array.from(generatorBytes).every((byte) => byte <= 0x7f)).toBe(true);
    const text = bytes.toString('utf8');
    expect(text).not.toMatch(/[\u00c2\u00c3\u00e2\u00f0\ufffd]/u);
    expect(text).not.toMatch(/[\p{Extended_Pictographic}\uFE0F]/u);
    expect(text).not.toMatch(/&(?:mdash|ndash|nbsp|ldquo|rdquo|rsquo);/i);
  });

  it('keeps duplicate and parallel topics as distinct stable-ID rewrites', () => {
    const byId = new Map(module.items.map((item) => [item.legacyId, item]));
    for (const [firstId, secondId] of parallelPairs) {
      expect(byId.has(firstId)).toBe(true);
      expect(byId.has(secondId)).toBe(true);
      expect(byId.get(firstId).content).not.toBe(byId.get(secondId).content);
    }
    expect(module.items.filter((item) => item.title === 'Dissociative Disorders')).toHaveLength(2);
  });

  it('uses claim-specific authorities for diagnostic, instrument, and fairness assertions', () => {
    const byId = new Map(module.items.map((item) => [item.legacyId, item]));
    expect(byId.get('memory-aid-ff9ee0f88ec23c3c').references).toEqual(expect.arrayContaining([
      expect.stringContaining('pearsonassessments.com'),
      expect.stringContaining('riversideinsights.com'),
    ]));
    expect(byId.get('memory-aid-987b61706881a2c2').references[0]).toContain('ptsd.va.gov');
    expect(byId.get('memory-aid-716f45f325772345').references[0]).toContain('cdc.gov/autism/hcp/diagnosis');
    expect(byId.get('memory-aid-ce4adc51c2d4de03').references[0]).toContain('ncbi.nlm.nih.gov/books/NBK565474/table/table-3');
    expect(byId.get('memory-aid-c69828a708ce1660').references[0]).toContain('testingstandards.net');
    expect(byId.get('memory-aid-ff349570c3d77b98').references).toEqual(expect.arrayContaining([
      expect.stringContaining('upress.umn.edu/test-division/mmpi-3'),
      expect.stringContaining('r-pas.org/Home/About'),
      expect.stringContaining('parinc.com/products/NEO-PI-3-NU'),
    ]));
  });

  it('guards generation against canonical inventory drift without relying on mutable review status', () => {
    const generator = readText('dev-tools/eppp_memory_aid_wave08/build_domain_05.cjs');
    expect(generator).toContain('Domain 5 canonical inventory drift');
    expect(generator).not.toMatch(/filter\(\(entry\) => entry\.reviewStatus/);
    expect(generator).toContain('generic DSM fact-sheet fallback is not allowed');
    expect(generator).toContain('byte-clean ASCII-safe content');
    expect(generator).toContain('parallel-topic records must remain separate IDs with distinct rewrites');
    expect(generator).not.toMatch(/[\u00c2\u00c3\u00e2\u00f0\ufffd]/u);
  });
});
