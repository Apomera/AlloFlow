import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { selectPackStems } = require('../dev-tools/test_prep_pack_selection.cjs');
const root = path.resolve(import.meta.dirname, '..');
const stems = ['parapro', 'audiology_5343', 'school_librarian_5312'];
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

describe('scoped test-prep recovery', () => {
  it('preserves full pipeline scope unless a registered pack is selected', () => {
    expect(selectPackStems([], stems)).toEqual(stems);
    expect(selectPackStems(['--check'], stems, ['--check'])).toEqual(stems);
    expect(selectPackStems(['--pack', 'audiology_5343'], stems)).toEqual(['audiology_5343']);
    expect(selectPackStems(['--pack=school_librarian_5312', '--pack=parapro'], stems))
      .toEqual(['parapro', 'school_librarian_5312']);
  });

  it.each([
    ['--pack'], ['--pack='], ['--pack', '../audiology_5343'],
    ['--pack', 'missing'], ['--pak', 'audiology_5343'],
    ['--pack=parapro', '--pack', 'parapro'], ['--check'],
  ])('rejects malformed or unsupported selection %j', (...args) => {
    expect(() => selectPackStems(args, stems)).toThrow();
  });

  it('validates exact review evidence before scoped writes and leaves other packs untouched', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-pack-recovery-'));
    const copy = relative => {
      const destination = path.join(fixture, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(root, relative), destination);
    };
    const run = (script, args = []) => execFileSync(process.execPath,
      ['dev-tools/' + script, '--pack', 'audiology_5343', ...args],
      { cwd: fixture, encoding: 'utf8', stdio: 'pipe' });
    try {
      for (const name of [
        'apply_test_prep_independent_additions.cjs', 'expand_test_prep_packs_to_500.cjs',
        'test_prep_pack_selection.cjs', 'test_prep_guided_expansion_core.cjs',
        'test_prep_guided_expansion_core_base.cjs',
        'authored_batch_originality_checks.cjs',
      ]) copy('dev-tools/' + name);
      for (const name of ['test_prep_independent_additions_manifest.json',
        'audiology_5343_batch3.json', 'audiology_5343_batch3.review.json']) copy('dev-tools/authored/' + name);
      for (const name of ['audiology_5343_pack.json', 'audiology_5343_items.json',
        'audiology_5343_learning_library.json', 'audiology_5343_native_qa.json', 'audiology_5343_native_qa.md']) {
        copy('test_prep/' + name);
      }
      const protectedPaths = [];
      for (const dir of ['test_prep', 'desktop/web-app/public/test_prep']) {
        fs.mkdirSync(path.join(fixture, dir), { recursive: true });
        for (const name of ['parapro_pack.json', 'parapro_items.json']) {
          const file = path.join(fixture, dir, name);
          fs.writeFileSync(file, '{"sentinel":"unselected pack must not be read or rewritten"}\n');
          protectedPaths.push(file);
        }
      }
      const beforeProtected = protectedPaths.map(digest);
      const packPath = path.join(fixture, 'test_prep/audiology_5343_pack.json');
      const originalItems = JSON.parse(fs.readFileSync(packPath)).items;
      const beforePack = digest(packPath);
      const reviewPath = path.join(fixture, 'dev-tools/authored/audiology_5343_batch3.review.json');
      const reviewBytes = fs.readFileSync(reviewPath);
      const tamperedReview = JSON.parse(reviewBytes);
      tamperedReview.artifactBinding.sha256 = '0'.repeat(64);
      fs.writeFileSync(reviewPath, JSON.stringify(tamperedReview));
      expect(() => run('apply_test_prep_independent_additions.cjs')).toThrow(/hash-bound review evidence failed/);
      expect(digest(packPath)).toBe(beforePack);
      expect(protectedPaths.map(digest)).toEqual(beforeProtected);
      fs.writeFileSync(reviewPath, reviewBytes);
      expect(run('apply_test_prep_independent_additions.cjs', ['--check'])).toContain('for 1 pack');
      expect(digest(packPath)).toBe(beforePack);
      run('apply_test_prep_independent_additions.cjs');
      run('expand_test_prep_packs_to_500.cjs');
      const pack = JSON.parse(fs.readFileSync(packPath));
      expect(pack.items.slice(0, 200)).toEqual(originalItems.slice(0, 200));
      expect(pack.items.slice(300)).toEqual(originalItems.slice(300));
      const reviewFields = new Set(['assistantReviewStatus', 'examItemStatus', 'reviewStatus', 'qaStatus',
        'assistantReviewedAt', 'independentBatchId', 'independentBatchNumber', 'reviewMethod']);
      const authoredContent = item => Object.fromEntries(Object.entries(item)
        .filter(([key]) => !reviewFields.has(key)));
      expect(pack.items.map(authoredContent)).toEqual(originalItems.map(authoredContent));
      expect(pack.items).toHaveLength(500);
      expect(pack.items.slice(200, 300).every(item =>
        item.examItemStatus === 'assistant-approved-as-independent-practice-item'
          && item.reviewStatus === 'assistant-reviewed-independent-practice-item')).toBe(true);
      expect(pack.independentAdditionReview.status).toBe('integrated-final-expansion');
      expect(pack.assistantReview.independentBatchEvidence[0].artifactBindings[0].sha256)
        .toBe(JSON.parse(reviewBytes).artifactBinding.sha256);
      expect(pack.sections.map(section => section.kind))
        .toEqual(['source-diagnostic', 'source-diagnostic', 'independent-diagnostic', 'guided-review', 'guided-review']);
      expect(protectedPaths.map(digest)).toEqual(beforeProtected);
      for (const name of ['audiology_5343_pack.json', 'audiology_5343_items.json',
        'audiology_5343_native_qa.json', 'audiology_5343_native_qa.md']) {
        expect(digest(path.join(fixture, 'desktop/web-app/public/test_prep', name)))
          .toBe(digest(path.join(fixture, 'test_prep', name)));
      }
      expect(fs.readFileSync(reviewPath)).toEqual(reviewBytes);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  }, 20000);
});
