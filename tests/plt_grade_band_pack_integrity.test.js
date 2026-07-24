import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const specs = require('../dev-tools/plt_grade_band_qa.config.cjs');
const { auditPackIntegrity } = require('../dev-tools/plt_grade_band_pack_integrity.cjs');
const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const load = (relative) => JSON.parse(read(relative));

const suites = [
  { key: 'plt_early_childhood_5621', code: '5621' },
  { key: 'plt_5_9_5623', code: '5623' },
  { key: 'plt_7_12_5624', code: '5624' },
].map((entry) => ({
  ...entry,
  spec: specs[entry.key],
  pack: load(`test_prep/${entry.key}_pack.json`),
}));

function audit(pack, spec) {
  const findings = [];
  const summary = auditPackIntegrity(pack, spec, (check, message, id) =>
    findings.push({ check, message, id }));
  return { summary, findings };
}

const correctAnswer = (pack, id) => {
  const item = pack.items.find((entry) => entry.id === id);
  return item.choices[item.answerIndex];
};

describe('PLT grade-band pack credential integrity', () => {
  it('reviews the 200-item source layer and all 500 released activities for all three credentials', () => {
    for (const { pack, spec } of suites) {
      expect(pack.items).toHaveLength(500);
      const { summary, findings } = audit(pack, spec);
      expect(findings).toEqual([]);
      expect(summary).toMatchObject({
        expectedCode: spec.code,
        sourceItemsReviewed: 200,
        allItemsReviewed: 500,
        packIdentityMisses: 0,
        sourceItemIdentityMisses: 0,
        foreignCodeOccurrences: 0,
        k6ContaminationOccurrences: 0,
        foreignBandOccurrences: 0,
        outOfBandOccurrences: 0,
        malformedBandOccurrences: 0,
        encodingCorruptionOccurrences: 0,
        negativeGates: 'pass',
      });
    }
  });

  it('durably recasts the shared physical-development and assessment examples without changing correct keys', () => {
    const early = suites.find((entry) => entry.code === '5621').pack;
    const middle = suites.find((entry) => entry.code === '5623').pack;
    const secondary = suites.find((entry) => entry.code === '5624').pack;
    const physicalAnswer = 'Provide safe movement, varied motor demands, accessible participation, appropriate breaks, and observation of individual needs while protecting instructional purpose.';

    expect(middle.items.find((item) => item.id === 'plt5623-b1-015').prompt)
      .toContain('learning in grades 5\u20139');
    expect(secondary.items.find((item) => item.id === 'plt5624-b1-015').prompt)
      .toContain('learning in grades 7\u201312');
    expect(early.items.find((item) => item.id === 'plt5621-b1-015').prompt)
      .toContain('learning in preschool\u2013grade 3');
    for (const [pack, id] of [
      [middle, 'plt5623-b1-015'], [secondary, 'plt5624-b1-015'],
      [early, 'plt5621-b1-015'],
    ]) expect(correctAnswer(pack, id)).toBe(physicalAnswer);

    const percentile = early.items.find((item) => item.id === 'plt5621-b1-073');
    expect(percentile.choices.join('\n')).toContain('grade 2.5');
    expect(percentile.choices.join('\n')).not.toContain('grade 7.5');
    expect(correctAnswer(early, percentile.id)).toBe('The score was as high as or higher than the scores of approximately 75 percent of the relevant norm group, not that 75 percent of items were correct.');

    const gradeEquivalent = early.items.find((item) => item.id === 'plt5621-b1-074');
    expect(gradeEquivalent.prompt).toMatch(/second grader.*grade-equivalent score of 3\.2/i);
    expect(gradeEquivalent.prompt).not.toMatch(/fourth grader|6\.2/i);
    expect(correctAnswer(early, gradeEquivalent.id)).toBe('On that test, the raw score matched the typical score of the referenced third-grade second-month group; it does not prove mastery of the third-grade curriculum or readiness for placement.');

    for (const { pack } of suites) {
      expect(JSON.stringify(pack.items)).not.toMatch(/\bgrades?\s+grades?\b|\bgrades?\s+(?:birth|preschool)\b/i);
    }
  });

  it('fails closed on foreign codes, K-6, doubled bands, and guided-derivative contamination', () => {
    const early = suites.find((entry) => entry.code === '5621');
    const middle = suites.find((entry) => entry.code === '5623');
    const secondary = suites.find((entry) => entry.code === '5624');

    const k6Pack = structuredClone(middle.pack);
    k6Pack.items.find((item) => item.id === 'plt5623-b1-015').prompt =
      'Which plan supports physical development and learning in grades K\u20136?';
    expect(audit(k6Pack, middle.spec).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'pack-foreign-band', id: 'plt5623-b1-015' }),
    ]));

    const foreignCodePack = structuredClone(early.pack);
    foreignCodePack.items[0].choices[0] = 'Use the PLT Grades 7\u201312 (5624) role instead.';
    expect(audit(foreignCodePack, early.spec).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'pack-foreign-code', id: foreignCodePack.items[0].id }),
    ]));

    const doubledBandPack = structuredClone(secondary.pack);
    doubledBandPack.items.find((item) => item.id === 'plt5624-b1-015').prompt =
      'What supports learning in grades grades 7\u201312?';
    expect(audit(doubledBandPack, secondary.spec).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'pack-grade-band', id: 'plt5624-b1-015' }),
    ]));

    const guidedPack = structuredClone(middle.pack);
    guidedPack.items.push({ ...structuredClone(guidedPack.items[0]), id: 'plt5623-guided-regression', prompt: 'Reconsider a K-6 classroom role.' });
    const guidedMutation = audit(guidedPack, middle.spec);
    expect(guidedMutation.summary.allItemsReviewed).toBe(501);
    expect(guidedMutation.summary.negativeGates).toBe('fail');
    expect(guidedMutation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'pack-foreign-band', id: 'plt5623-guided-regression' }),
    ]));
  });

  it('publishes zero-finding 500-activity QA with seven-file source/deploy parity', () => {
    const artifactSuffixes = [
      '_items.json', '_pack.json', '_learning_library.json', '_native_qa.json',
      '_native_qa.md', '_learning_library_qa.json', '_learning_library_qa.md',
    ];
    for (const { key } of suites) {
      const qa = load(`test_prep/${key}_native_qa.json`);
      expect(qa.summary).toMatchObject({ totalItems: 500, passedItems: 500, findings: [], status: 'pass' });
      expect(qa.summary.packIntegrity).toMatchObject({ sourceItemsReviewed: 200, allItemsReviewed: 500, negativeGates: 'pass' });
      expect(qa.summary.libraryIntegrity).toMatchObject({ negativeGates: 'pass' });
      for (const suffix of artifactSuffixes) {
        const name = key + suffix;
        expect(read(`desktop/web-app/public/test_prep/${name}`)).toBe(read(`test_prep/${name}`));
      }
    }
  });
});
