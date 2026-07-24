import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const sourceDir = resolve(process.cwd(), 'test_prep');
const deployDir = resolve(process.cwd(), 'desktop/web-app/public/test_prep');
const catalogText = fs.readFileSync(resolve(sourceDir, 'reference_catalog.json'), 'utf8');
const catalog = JSON.parse(catalogText);

const collectReferences = (value, output = new Set()) => {
  if (Array.isArray(value)) value.forEach((entry) => collectReferences(entry, output));
  else if (value && typeof value === 'object') Object.values(value).forEach((entry) => collectReferences(entry, output));
  else if (typeof value === 'string' && /^https:\/\/\S+$/i.test(value.trim())) output.add(value.trim());
  return output;
};

describe('learner-facing non-EPPP source catalog', () => {
  it('names and cleanly summarizes every cited source', () => {
    const references = new Set();
    const files = fs.readdirSync(sourceDir).filter((name) =>
      !name.startsWith('eppp_') && (name.endsWith('_pack.json') || name.endsWith('_learning_library.json'))
    );
    for (const file of files) collectReferences(JSON.parse(fs.readFileSync(resolve(sourceDir, file), 'utf8')), references);

    expect(references.size).toBeGreaterThan(100);
    for (const reference of references) {
      const detail = catalog[reference];
      expect(detail, reference).toBeTruthy();
      expect(detail.title.length, reference).toBeGreaterThanOrEqual(12);
      expect(detail.organization.length, reference).toBeGreaterThanOrEqual(4);
      expect(detail.summary.length, reference).toBeGreaterThanOrEqual(40);
      expect(detail.credibility.length, reference).toBeGreaterThanOrEqual(40);
      expect(detail.metadataSource, reference).not.toBe('url-derived-reviewed-fallback');
      expect(detail.title, reference).not.toMatch(/^Scholarly source \(DOI |^Referenced educational source$/i);
      expect(JSON.stringify(detail), reference).not.toMatch(/&(?:#\d+|#x[0-9a-f]+|[a-z]+);|(?:\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00e2\u20ac|\ufffd)/iu);
    }
  });

  it('publishes the same catalog in the deploy tree', () => {
    expect(fs.readFileSync(resolve(deployDir, 'reference_catalog.json'), 'utf8')).toBe(catalogText);
  });
});
