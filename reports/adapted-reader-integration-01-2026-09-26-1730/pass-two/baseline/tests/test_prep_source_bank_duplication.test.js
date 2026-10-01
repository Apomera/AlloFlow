import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { contentKernel } from '../dev-tools/apply_test_prep_independent_additions.cjs';
import { topFrame } from '../dev-tools/authored_batch_originality_checks.cjs';

const root = path.join(import.meta.dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const baselinePath = path.join(root, 'tests', 'fixtures', 'test_prep_source_duplication_baseline.json');

function packFiles() {
  return fs.readdirSync(sourceDir)
    .filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_'))
    .sort();
}

function readPack(file) {
  return JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
}

// Guided banks are derived from the source items on purpose, so kernel reuse
// there is the design. Everything ahead of them is scored.
function scoredBanks(pack) {
  const guided = Math.max(0, Number(pack.guidedReviewItems) || 0);
  const scored = pack.items.slice(0, pack.items.length - guided);
  const size = Math.max(1, Number(pack.batchSize) || 100);
  const banks = [];
  for (let start = 0; start < scored.length; start += size) banks.push(scored.slice(start, start + size));
  return banks;
}

function duplicateItems(bank) {
  const groups = new Map();
  for (const item of bank) {
    const kernel = contentKernel(item);
    groups.set(kernel, (groups.get(kernel) || 0) + 1);
  }
  let total = 0;
  for (const count of groups.values()) if (count > 1) total += count;
  return total;
}

// The authored-batch originality gate only ever sees items.slice(200, 200+n).
// These assertions cover the range nothing else looks at, and they calibrate in
// both directions against real packs rather than only asserting health.
describe('source-bank duplication', () => {
  it('finds the shipped within-bank duplication the authored gate never sees', () => {
    // school_librarian_5312 is 25 topics crossed with 4 prompt frames: four
    // items per answer set, in one bank, all with the same key, distractors and
    // rationale.
    //
    // This deliberately does NOT assert a fixed count. It did originally, and
    // repairing one domain took bank 1 from 99 to 87 and failed the test - the
    // assertion decayed exactly as the defect was fixed, which is the wrong
    // signal. Regression is the ratchet's job
    // (tests/fixtures/test_prep_source_duplication_baseline.json). What belongs
    // here is that the detector still discriminates: this pack carries the
    // duplication and the others do not.
    const pack = readPack('school_librarian_5312_pack.json');
    const banks = scoredBanks(pack);
    const librarian = duplicateItems(banks[0]) + duplicateItems(banks[1]);
    expect(librarian).toBeGreaterThan(0);
    const others = packFiles()
      .filter((file) => !file.startsWith('school_librarian_5312'))
      .reduce((sum, file) => sum + scoredBanks(readPack(file))
        .reduce((inner, bank) => inner + duplicateItems(bank), 0), 0);
    expect(librarian).toBeGreaterThan(others);
    // Its own authored bank 3 is clean, which is the point: that range is gated.
    expect(duplicateItems(banks[2])).toBe(0);
  }, 60_000);

  it('reports zero within-bank duplicates for every other pack', () => {
    const offenders = [];
    for (const file of packFiles()) {
      if (file.startsWith('school_librarian_5312')) continue;
      const pack = readPack(file);
      const total = scoredBanks(pack).reduce((sum, bank) => sum + duplicateItems(bank), 0);
      if (total) offenders.push(file + ': ' + total);
    }
    expect(offenders).toEqual([]);
  }, 120_000);

  it('separates templated source prompts from healthy ones by a wide margin', () => {
    const shares = {};
    for (const file of packFiles()) {
      const banks = scoredBanks(readPack(file));
      shares[file.replace('_pack.json', '')] = Math.max(
        ...banks.map((bank) => topFrame(bank, (item) => item.prompt).share),
      );
    }
    // Templated: one prompt frame spans a quarter of a bank or more.
    expect(shares.school_librarian_5312).toBeGreaterThan(0.20);
    expect(shares.early_childhood_5025).toBeGreaterThan(0.20);
    // Healthy authoring shares terminology, not sentence frames.
    expect(shares.audiology_5343).toBeLessThan(0.10);
    expect(shares.speech_language_pathology_5331).toBeLessThan(0.10);
    expect(shares.educational_leadership_5412).toBeLessThan(0.10);
  }, 120_000);

  it('ratchets recorded duplication down only, and admits no new offender', () => {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const worsened = [];
    for (const file of packFiles()) {
      const stem = file.replace('_pack.json', '');
      const pack = readPack(file);
      const banks = scoredBanks(pack);
      const scored = banks.reduce((sum, bank) => sum + bank.length, 0);
      const rate = scored ? banks.reduce((sum, bank) => sum + duplicateItems(bank), 0) / scored : 0;
      const frame = Math.max(...banks.map((bank) => topFrame(bank, (item) => item.prompt).share));
      const recorded = baseline.packs[stem];
      if (!recorded) {
        // No inherited exemption for a pack the baseline has never seen.
        if (rate > 0) worsened.push(stem + ' is not in the baseline and ships duplicates');
        if (frame > 0.20) worsened.push(stem + ' is not in the baseline and is templated');
        continue;
      }
      if (rate > recorded.duplicateRate + 0.005) {
        worsened.push(stem + ' duplication rose from ' + recorded.duplicateRate + ' to ' + rate.toFixed(4));
      }
      if (frame > recorded.frameShare + 0.005) {
        worsened.push(stem + ' templating rose from ' + recorded.frameShare + ' to ' + frame.toFixed(4));
      }
    }
    expect(worsened).toEqual([]);
  }, 120_000);
});
