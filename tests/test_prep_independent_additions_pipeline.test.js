import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { canonical, validPackVersion } = require('../dev-tools/apply_test_prep_independent_additions.cjs');

describe('manifest-backed independent test-prep additions', () => {
  it('preserves arithmetic operators in content canonicalization', () => {
    const forms = ['12 - 5', '12 + 5', '12 * 5', '12 / 5', '12 \u00d7 5', '12 \u00f7 5', '12 \u2264 5', '12 \u2265 5', '12 \u2260 5'];
    expect(new Set(forms.map((value) => canonical(value))).size).toBe(forms.length - 2);
    expect(canonical('12 * 5')).toBe(canonical('12 \u00d7 5'));
    expect(canonical('12 / 5')).toBe(canonical('12 \u00f7 5'));
    expect(canonical('x - 2')).not.toBe(canonical('x + 2'));
  });

  it('keeps --check read-only across every manifest pack source and deploy artifact', () => {
    const manifest = JSON.parse(fs.readFileSync(
      path.join(root, 'dev-tools', 'authored', 'test_prep_independent_additions_manifest.json'),
      'utf8',
    ));
    const targets = Object.keys(manifest.packs).sort().flatMap((stem) =>
      ['test_prep', 'desktop/web-app/public/test_prep'].flatMap((dir) =>
        [`${dir}/${stem}_pack.json`, `${dir}/${stem}_items.json`],
      ),
    );
    const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
    const before = Object.fromEntries(targets.map((file) => [file, digest(file)]));
    execFileSync(process.execPath, ['dev-tools/apply_test_prep_independent_additions.cjs', '--check'], {
      cwd: root,
      stdio: 'pipe',
    });
    expect(Object.fromEntries(targets.map((file) => [file, digest(file)]))).toEqual(before);
  }, 20000);

  it('registers exact hash-bound 100-item banks for every one-bank manifest pack', () => {
    const authoredDir = path.join(root, 'dev-tools', 'authored');
    const manifest = JSON.parse(fs.readFileSync(path.join(authoredDir, 'test_prep_independent_additions_manifest.json'), 'utf8'));
    for (const stem of [
      'early_childhood_5025',
      'audiology_5343',
      'school_librarian_5312',
      'educational_leadership_5412',
      'school_counselor_5422',
    ]) {
      const batches = manifest.packs[stem];
      expect(batches).toHaveLength(1);
      expect(batches[0]).toMatchObject({
        id: 'independent-diagnostic-batch-3',
        reviewEvidenceProfile: 'hash-bound-independent-cross-review-v1',
      });
      const itemBytes = fs.readFileSync(path.join(authoredDir, batches[0].files[0]));
      const items = JSON.parse(itemBytes);
      const review = JSON.parse(fs.readFileSync(path.join(authoredDir, batches[0].reviewReports[0]), 'utf8'));
      expect(items).toHaveLength(100);
      expect(review.itemCount).toBe(100);
      expect(review.artifactBinding).toEqual({
        algorithm: 'sha256',
        sha256: crypto.createHash('sha256').update(itemBytes).digest('hex'),
      });
      const lineByLineReview = Object.values(review.checks).find(
        (check) => Array.isArray(check?.reviewedItemIds),
      );
      expect(lineByLineReview.reviewedItemIds).toEqual(items.map((item) => item.id));
      expect(review.integration).toMatchObject({
        packId: batches[0].expectedPackId,
        batchNumber: 3,
        expectedInsertionTier: 'assistant-authored-independent',
        expectedDiagnosticBankSize: 100,
      });
    }
  });

  it('keeps registered pack titles credential-specific and versions semantic after expansion', () => {
    for (const [stem, credential] of [
      ['early_childhood_5025', 'Early Childhood Education (5025)'],
      ['audiology_5343', 'Audiology (5343)'],
      ['school_librarian_5312', 'School Librarian (5312)'],
      ['educational_leadership_5412', 'Educational Leadership: Administration and Supervision (5412)'],
      ['school_counselor_5422', 'School Counselor (5422)'],
    ]) {
      const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', `${stem}_pack.json`), 'utf8'));
      expect(pack.title).toContain(credential);
      expect(pack.title).toMatch(/200 Source Questions \+ 100 Independent Practice Questions \+ 200 Guided Review$/);
      expect(validPackVersion(pack.version)).toBe(true);
      expect(pack).toMatchObject({
        sourceQuestionItems: 200,
        assistantAuthoredIndependentItems: 100,
        independentPracticeItems: 300,
        guidedReviewItems: 200,
        sourceDiagnosticBatchCount: 2,
        assistantAuthoredIndependentBatchCount: 1,
        independentDiagnosticBatchCount: 3,
        guidedReviewBatchCount: 2,
        learningActivityBankCount: 5,
      });
    }
  });
});
