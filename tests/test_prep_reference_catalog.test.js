import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { collectReferences } = require(path.join(root, 'dev-tools', 'build_test_prep_reference_catalog.cjs'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'reference_catalog.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'test_prep_hub_source.jsx'), 'utf8');
const standardBuilder = fs.readFileSync(path.join(root, '_build_test_prep_hub_module.js'), 'utf8');
const releaseBuilder = fs.readFileSync(path.join(root, 'dev-tools', 'build_test_prep_hub_release.cjs'), 'utf8');

describe('test prep reference catalog', () => {
  it('provides readable publication metadata for the DOI collection', () => {
    const doiRecords = Object.entries(catalog).filter(([url]) => url.startsWith('https://doi.org/'));
    const resolved = doiRecords.filter(([, detail]) => detail.metadataSource === 'Crossref');
    expect(doiRecords.length).toBeGreaterThanOrEqual(200);
    expect(resolved.length).toBeGreaterThanOrEqual(140);
    for (const [, detail] of resolved) {
      expect(detail.title.length).toBeGreaterThan(8);
      expect(detail.summary.length).toBeGreaterThan(40);
      expect(detail.credibility.length).toBeGreaterThan(40);
    }
  });

  it('renders the title, organization, brief summary, and credibility explanation', () => {
    expect(source).toContain("TEST_PREP_REFERENCE_CATALOG[reference]");
    expect(source).toContain('Brief source summary:');
    expect(source).toContain('Why this source is credible:');
    expect(source).toContain('source.organization');
  });

  it('embeds the offline catalog in both hub builds', () => {
    expect(standardBuilder).toContain("const REFERENCE_CATALOG_SOURCE = path.join(ROOT, 'test_prep', 'reference_catalog.json');");
    expect(standardBuilder).toContain("const TEST_PREP_REFERENCE_CATALOG = ");
    expect(releaseBuilder).toContain("const referenceCatalogPath = path.join(root, 'test_prep', 'reference_catalog.json');");
    expect(releaseBuilder).toContain("const TEST_PREP_REFERENCE_CATALOG = ");
  });

  it('preserves item-bank metadata while retaining asset-authored fallback behavior', () => {
    const protectedUrl = 'https://example.test/item-bank-source';
    const assetUrl = 'https://example.test/asset-only-source';
    const canonicalDetail = {
      title: 'Canonical item-bank title',
      organization: 'Canonical item-bank organization',
      summary: 'Canonical item-bank summary',
      credibility: 'Canonical item-bank credibility',
      metadataSource: 'pack-authored',
    };
    const syntheticCatalog = {
      [protectedUrl]: canonicalDetail,
      [assetUrl]: { title: 'Earlier fallback title' },
    };
    const references = new Set();

    collectReferences({
      sourceDetails: [
        {
          url: protectedUrl,
          title: 'Duplicate asset title',
          organization: 'Duplicate asset organization',
          summary: 'Duplicate asset summary',
          credibility: 'Duplicate asset credibility',
        },
        {
          url: assetUrl,
          title: 'Asset-authored title',
          organization: 'Asset-authored organization',
          summary: 'Asset-authored summary',
          credibility: 'Asset-authored credibility',
        },
      ],
    }, references, syntheticCatalog, new Set([protectedUrl]));

    expect(syntheticCatalog[protectedUrl]).toEqual(canonicalDetail);
    expect(syntheticCatalog[assetUrl]).toMatchObject({
      title: 'Asset-authored title',
      organization: 'Asset-authored organization',
      metadataSource: 'pack-authored',
    });
    expect(references).toEqual(new Set([protectedUrl, assetUrl]));
  });
});
