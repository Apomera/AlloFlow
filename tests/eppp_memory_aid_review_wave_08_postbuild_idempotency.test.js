import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EPPP memory-aid Wave 08 post-library-build idempotency', () => {
  it('composes byte-identically before and after a fixture reaches 255/255 reviewed', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-wave08-'));
    try {
      const catalogPath = path.join(tempRoot, 'library.json');
      const outputPath = path.join(tempRoot, 'wave08.json');
      const sourceCatalog = JSON.parse(fs.readFileSync(
        resolve(process.cwd(), 'test_prep/eppp_learning_library.json'),
        'utf8',
      ));
      const wave08Ids = new Set(JSON.parse(fs.readFileSync(
        resolve(process.cwd(), 'test_prep/eppp_memory_aid_review_wave_08.json'),
        'utf8',
      )).items.map((item) => item.legacyId));
      sourceCatalog.memoryAids = sourceCatalog.memoryAids.map((item) => (
        wave08Ids.has(item.id)
          ? { ...item, reviewStatus: 'review-required' }
          : item
      ));
      sourceCatalog.summary.sourceReviewedMemoryAids = 106;
      sourceCatalog.summary.releasedMemoryAids = 106;
      expect(sourceCatalog.memoryAids.filter((item) => item.reviewStatus === 'review-required')).toHaveLength(149);
      fs.writeFileSync(catalogPath, `${JSON.stringify(sourceCatalog, null, 2)}\n`, 'utf8');
      const env = {
        ...process.env,
        EPPP_WAVE08_CATALOG_PATH: catalogPath,
        EPPP_WAVE08_OUTPUT_PATH: outputPath,
      };
      const composer = resolve(process.cwd(), 'dev-tools/compose_eppp_memory_aid_review_wave_08.cjs');

      expect(() => execFileSync(process.execPath, [composer], {
        cwd: process.cwd(),
        env: {
          ...env,
          EPPP_WAVE08_CATALOG_PATH: path.join(tempRoot, 'missing-library.json'),
        },
        stdio: 'pipe',
      })).toThrow();

      execFileSync(process.execPath, [composer], { cwd: process.cwd(), env, stdio: 'pipe' });
      const before = fs.readFileSync(outputPath);

      // Disposable fixture simulation of the learning-library rebuild's integrated state.
      sourceCatalog.memoryAids = sourceCatalog.memoryAids.map((item) => ({
        ...item,
        reviewStatus: 'source-reviewed-editorial-pass',
      }));
      sourceCatalog.summary.sourceReviewedMemoryAids = 255;
      sourceCatalog.summary.releasedMemoryAids = 255;
      expect(sourceCatalog.memoryAids.filter((item) => item.reviewStatus === 'review-required')).toHaveLength(0);
      fs.writeFileSync(catalogPath, `${JSON.stringify(sourceCatalog, null, 2)}\n`, 'utf8');

      execFileSync(process.execPath, [composer], { cwd: process.cwd(), env, stdio: 'pipe' });
      const after = fs.readFileSync(outputPath);
      expect(after.equals(before)).toBe(true);
      const wave = JSON.parse(after.toString('utf8'));
      expect(wave.items).toHaveLength(149);
      expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(149);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
