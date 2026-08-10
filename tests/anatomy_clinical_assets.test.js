import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import assetChecker from '../dev-tools/check_anatomy_clinical_assets.cjs';
const { checkClinicalAssets } = assetChecker;

describe('Anatomy Clinical Atlas assets', () => {
  it('keeps the licensed HRA model, ontology crosswalk, hashes, and public mirror aligned', () => {
    const result = checkClinicalAssets();
    expect(result.packCount).toBe(1);
    expect(result.packs[0]).toMatchObject({
      id: 'hra-kidney-female-left-v1.3',
      bytes: 1356736,
      crosswalkRows: 31,
    });
    expect(result.packs[0].ontologyCount).toBeGreaterThan(5);
  });

  it('keeps HRA attribution visible in the asset, NOTICES, and in-app credit surfaces', () => {
    const notices = fs.readFileSync(path.resolve(process.cwd(), 'THIRD_PARTY_LICENSES.md'), 'utf8');
    const about = fs.readFileSync(path.resolve(process.cwd(), 'view_info_modal_source.jsx'), 'utf8');
    const attribution = fs.readFileSync(path.resolve(process.cwd(), 'stem_lab/assets/anatomy/clinical-atlas/ATTRIBUTION.md'), 'utf8');

    expect(notices).toContain('Human Reference Atlas kidney v1.3');
    expect(about).toContain("name: 'Human Reference Atlas kidney v1.3'");
    expect(attribution).toContain('NLM Visible Human Dataset');
    expect(attribution).toContain('runtime centering, uniform scaling, and double-sided material rendering');
  });
});
