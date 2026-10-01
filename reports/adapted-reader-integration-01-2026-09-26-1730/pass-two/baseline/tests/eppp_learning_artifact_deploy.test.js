import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path, { resolve } from 'node:path';
import artifactSupport from '../dev-tools/eppp_learning_artifact_support.cjs';

const {
  collectReferencedReviewArtifacts,
  copyReferencedReviewArtifacts,
  resolveReferencedReviewArtifacts,
  safeArtifactFilename,
} = artifactSupport;

const json = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));

describe('EPPP learning-library artifact and visibility integration', () => {
  it('keeps current learner visibility aligned with the integrated runtime release gate', () => {
    const catalog = json('test_prep/eppp_learning_library.json');
    const qa = json('test_prep/eppp_learning_library_qa.json');
    const visible = catalog.flashcards.filter((card) => card.learnerVisible === true);
    const hidden = catalog.flashcards.filter((card) => card.learnerVisible !== true);

    expect(visible).toHaveLength(335);
    expect(hidden).toHaveLength(80);
    expect(catalog.summary).toMatchObject({
      sourceReviewedFlashcards: 415,
      retainedReviewedFlashcards: 335,
      retiredRedundantFlashcards: 80,
      releasedFlashcards: 335,
      learnerVisibleFlashcards: 335,
    });
    expect(catalog.flashcards.every((card) => card.learnerVisible === (
      card.reviewStatus === 'source-reviewed-editorial-pass'
      && card.contentDisposition !== 'retire-redundant'
    ))).toBe(true);
    expect(visible.every((card) => (
      card.reviewArtifactLearnerVisible === false
      && card.independentExpertStatus === 'not-started'
      && card.productionStatus === 'not-production-validated'
    ))).toBe(true);
    expect(hidden.every((card) => (
      card.contentDisposition === 'retire-redundant'
      && card.reviewArtifactLearnerVisible === false
    ))).toBe(true);
    expect(qa.standard.learnerVisibility).toContain('does not imply independent expert validation');
    expect(qa.findings.some((finding) => (
      finding.includes('335 retained source-reviewed flashcards are learner-visible')
      && finding.includes('does not claim independent expert validation')
    ))).toBe(true);
  });

  it('publishes every generated review-artifact reference byte-identically', () => {
    const catalog = json('test_prep/eppp_learning_library.json');
    const referenced = collectReferencedReviewArtifacts(catalog);

    expect(referenced).toHaveLength(30);
    expect(catalog.reviewArtifacts).toEqual(referenced);
    expect(catalog.summary.referencedReviewArtifacts).toBe(30);
    for (const filename of referenced) {
      expect(safeArtifactFilename(filename)).toBe(filename);
      const sourcePath = resolve(process.cwd(), 'test_prep', filename);
      const deployPath = resolve(process.cwd(), 'desktop/web-app/public/test_prep', filename);
      expect(fs.existsSync(sourcePath), `missing source ${filename}`).toBe(true);
      expect(fs.existsSync(deployPath), `missing deployment ${filename}`).toBe(true);
      expect(fs.readFileSync(deployPath).equals(fs.readFileSync(sourcePath)), filename).toBe(true);
    }
  });

  it('rejects unsafe or missing artifact references before copying a deterministic set', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-learning-artifacts-'));
    const sourceRoot = path.join(fixtureRoot, 'source');
    const deployRoot = path.join(fixtureRoot, 'deploy');
    fs.mkdirSync(sourceRoot, { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, 'one.json'), '{"one":true}\n');
    fs.writeFileSync(path.join(sourceRoot, 'two.json'), '{"two":true}\n');
    const catalog = {
      memoryAids: [{
        reviewArtifact: 'two.json',
        correctionArtifact: 'one.json',
        supersedesArtifact: 'two.json',
      }],
    };

    try {
      expect(collectReferencedReviewArtifacts(catalog)).toEqual(['one.json', 'two.json']);
      expect(resolveReferencedReviewArtifacts({ catalog, sourceRoot }).map((item) => item.filename))
        .toEqual(['one.json', 'two.json']);
      expect(copyReferencedReviewArtifacts({ catalog, sourceRoot, deployRoot }))
        .toEqual(['one.json', 'two.json']);
      expect(fs.readFileSync(path.join(deployRoot, 'one.json')))
        .toEqual(fs.readFileSync(path.join(sourceRoot, 'one.json')));
      expect(() => safeArtifactFilename('../escape.json')).toThrow(/Unsafe/);
      expect(() => safeArtifactFilename('nested/escape.json')).toThrow(/Unsafe/);
      expect(() => resolveReferencedReviewArtifacts({
        catalog: { flashcards: [{ reviewArtifact: 'missing.json' }] },
        sourceRoot,
      })).toThrow(/Missing EPPP learning review artifact/);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
