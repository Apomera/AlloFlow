import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import assetChecker from '../dev-tools/check_anatomy_clinical_assets.cjs';
const { checkClinicalAssets } = assetChecker;

describe('Anatomy Clinical Atlas assets', () => {
  it('keeps the licensed HRA model, ontology crosswalk, hashes, and public mirror aligned', () => {
    const result = checkClinicalAssets();
    expect(result.packCount).toBe(2);
    const kidney = result.packs.find((pack) => pack.id === 'hra-kidney-female-left-v1.3');
    const heart = result.packs.find((pack) => pack.id === 'hra-heart-female-v1.3');
    expect(kidney).toMatchObject({
      id: 'hra-kidney-female-left-v1.3',
      bytes: 1356736,
      crosswalkRows: 31,
    });
    expect(kidney.ontologyCount).toBeGreaterThan(5);
    expect(heart).toMatchObject({
      id: 'hra-heart-female-v1.3',
      bytes: 1745560,
      crosswalkRows: 17,
      ontologyCount: 17,
    });
    expect(result.tissueAtlasCount).toBe(1);
    expect(result.tissueAtlases[0]).toMatchObject({
      id: 'hra-kidney-renal-corpuscle-v1.4',
      bytes: 2006862,
      width: 4031,
      height: 3037,
      crosswalkRows: 142,
      ontologyCount: 9,
    });
  });

  it('keeps HRA attribution visible in the asset, NOTICES, and in-app credit surfaces', () => {
    const notices = fs.readFileSync(path.resolve(process.cwd(), 'THIRD_PARTY_LICENSES.md'), 'utf8');
    const about = fs.readFileSync(path.resolve(process.cwd(), 'view_info_modal_source.jsx'), 'utf8');
    const attribution = fs.readFileSync(path.resolve(process.cwd(), 'stem_lab/assets/anatomy/clinical-atlas/ATTRIBUTION.md'), 'utf8');

    expect(notices).toContain('Human Reference Atlas kidney v1.3');
    expect(about).toContain("name: 'Human Reference Atlas kidney v1.3'");
    expect(notices).toContain('Human Reference Atlas heart v1.3');
    expect(about).toContain("name: 'Human Reference Atlas heart v1.3'");
    expect(notices).toContain('Human Reference Atlas renal corpuscle FTU v1.4');
    expect(about).toContain("name: 'Human Reference Atlas renal corpuscle FTU v1.4'");
    expect(attribution).toContain('NLM Visible Human Dataset');
    expect(attribution).toContain('3D Reference Organ for Heart, Female v1.3');
    expect(attribution).toContain('HBM449.SHRV.225');
    expect(attribution).toContain('runtime centering, uniform scaling, and double-sided material rendering');
    expect(attribution).toContain('HRA renal corpuscle functional tissue unit v1.4');
    expect(attribution).toContain('HBM489.GJJK.324');
    expect(attribution).toContain('responsive framing, accessible concept controls');
  });
});
