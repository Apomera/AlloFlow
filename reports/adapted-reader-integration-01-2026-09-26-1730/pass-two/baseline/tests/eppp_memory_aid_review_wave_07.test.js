import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const read = (path) => JSON.parse(fs.readFileSync(resolve(process.cwd(), path), 'utf8'));
const normalizeTitle = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const historicalArtifact = 'eppp_memory_aid_review_wave_07.json';
const correctionArtifact = 'eppp_memory_aid_correction_wave_01.json';

describe('EPPP memory-aid review wave 07', () => {
  const wave = read('test_prep/eppp_memory_aid_review_wave_07.json');
  const { wave: dataWave } = require('../dev-tools/eppp_memory_aid_review_wave_07_data.cjs');
  const catalog = read('test_prep/eppp_learning_library.json');
  const referenceCatalog = read('test_prep/reference_catalog.json');
  const correctionPath = resolve(process.cwd(), 'test_prep', correctionArtifact);
  const correctionWave = fs.existsSync(correctionPath) ? read(`test_prep/${correctionArtifact}`) : null;
  const correctionsById = new Map((correctionWave?.items || []).map((item) => [item.legacyId, item]));
  const priorWaves = [1, 2, 3, 4, 5, 6].flatMap((number) => read(`test_prep/eppp_memory_aid_review_wave_0${number}.json`).items);
  const catalogById = new Map(catalog.memoryAids.map((aid) => [aid.id, aid]));
  const titleCounts = new Map();
  for (const aid of catalog.memoryAids) {
    const key = normalizeTitle(aid.title);
    titleCounts.set(key, (titleCounts.get(key) || 0) + 1);
  }

  const correctionFor = (item, target) => {
    if (target.reviewArtifact !== correctionArtifact) return null;
    expect(correctionWave?.waveId).toBe('eppp-memory-aid-correction-wave-01');
    const correction = correctionsById.get(item.legacyId);
    expect(correction).toBeTruthy();
    expect(correction.expectedTitle).toBe(item.title);
    expect(correction.supersedesArtifact).toBe(historicalArtifact);
    expect(correction.domainId).toBe(item.domainId);
    return correction;
  };

  it('matches the guarded data module and preserves stable IDs across later corrections', () => {
    expect(wave).toEqual(dataWave);
    expect(wave.summary).toEqual({ items: 16, domains: 8, itemsPerDomain: 2 });
    expect(wave.items.map((item) => item.legacyId)).toEqual([
      'memory-aid-730cbc71c6ece58c',
      'memory-aid-2434cc8073eef0b4',
      'memory-aid-5b8768222163c497',
      'memory-aid-c537c5186122fa72',
      'memory-aid-3d1a213773c50a1a',
      'memory-aid-f118803317aafbc5',
      'memory-aid-cf7fd0ed8fcd3826',
      'memory-aid-a61699e2115580b8',
      'memory-aid-78b130d558ed2778',
      'memory-aid-e92318963f68f340',
      'memory-aid-2d807ddedc9112e8',
      'memory-aid-14b0b315bdb75195',
      'memory-aid-ea2cef981bbaa657',
      'memory-aid-5994feb6db338df9',
      'memory-aid-ecaf8cdc679550e9',
      'memory-aid-2f43626024671c85',
    ]);

    const priorIds = new Set(priorWaves.map((item) => item.legacyId));
    for (let domainId = 1; domainId <= 8; domainId += 1) {
      expect(wave.items.filter((item) => item.domainId === domainId)).toHaveLength(2);
    }
    for (const item of wave.items) {
      const target = catalogById.get(item.legacyId);
      expect(target).toBeTruthy();
      expect(target.domainId).toBe(item.domainId);
      const correction = correctionFor(item, target);
      const currentTitle = correction ? correction.title : item.title;
      expect(target.title).toBe(currentTitle);
      expect(titleCounts.get(normalizeTitle(currentTitle))).toBe(1);
      expect(priorIds.has(item.legacyId)).toBe(false);
    }
  });

  it('supports pre-rebuild, numbered-wave, and explicitly superseded correction states', () => {
    const states = wave.items.map((item) => {
      const target = catalogById.get(item.legacyId);
      if (target.reviewStatus === 'review-required') return 'pending';
      expect(target.reviewStatus).toBe('source-reviewed-editorial-pass');
      if (target.reviewArtifact === historicalArtifact) {
        expect(target.title).toBe(item.title);
        expect(target.content).toBe(item.content);
        expect(target.references).toEqual(item.references);
        return 'applied';
      }
      const correction = correctionFor(item, target);
      expect(correction).toBeTruthy();
      expect(target.title).toBe(correction.title);
      expect(target.content).toBe(correction.content);
      expect(target.references).toEqual(correction.references);
      return 'corrected';
    });
    const uniqueStates = new Set(states);
    if (uniqueStates.has('pending')) {
      expect(uniqueStates).toEqual(new Set(['pending']));
    } else {
      expect([...uniqueStates].every((state) => ['applied', 'corrected'].includes(state))).toBe(true);
    }
  });

  it('provides complete claim-level provenance without claiming independent expert validation', () => {
    expect(wave.status).toContain('independent-expert-review-pending');
    for (const item of wave.items) {
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(item.reviewDate).toBe('2026-07-28');
      expect(item.reviewMode).toBe('claim-level-source-and-editorial-review');
      expect(item.content.length).toBeGreaterThanOrEqual(600);
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.references.length).toBeGreaterThanOrEqual(2);
      for (const source of item.sourceDetails) {
        expect(source.title).toBeTruthy();
        expect(source.organization).toBeTruthy();
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.whyReputable.length).toBeGreaterThanOrEqual(100);
        const existing = referenceCatalog[source.url];
        if (existing) {
          expect(existing.title).toBeTruthy();
          expect(existing.credibility).toBeTruthy();
        }
      }
    }
    expect(wave.safeguards.join(' ')).toContain('do not constitute independent qualified expert');
  });

  it('bounds medication, circadian, reinforcement, and extinction retrieval rules', () => {
    const medication = wave.items.find((item) => item.title === 'Psychotropic Medication Classes');
    expect(medication.content).toContain('does not prescribe a drug');
    expect(medication.content).toContain('FDA removed the Clozapine REMS in 2025');
    expect(medication.content).toContain('not zero risk or universal superiority');

    const circadian = wave.items.find((item) => item.title === 'Circadian Rhythms & Sleep Disorders');
    expect(circadian.content).toContain('not "three built-in clocks."');
    expect(circadian.content).toContain('not a separate "awakening clock"');
    expect(circadian.content).toContain('timing is part of the intervention');

    const schedules = wave.items.find((item) => item.title === 'Schedules of Reinforcement');
    expect(schedules.content).toContain('WHAT advances it');
    expect(schedules.content).toContain('weekly paycheck is not automatically FI');
    expect(schedules.content).toContain('not a universal rate or persistence formula');

    const extinction = wave.items.find((item) => item.title === 'Extinction & Spontaneous Recovery');
    expect(extinction.content).toContain('does not make behavior "die."');
    expect(extinction.content).toContain('it is not required');
    expect(extinction.content).toContain('renewal');
    expect(extinction.content).toContain('reinstatement');
  });

  it('replaces social, developmental, diagnostic, and treatment absolutes with evidence boundaries', () => {
    const bias = wave.items.find((item) => item.title === 'Cognitive Biases in Clinical Judgment');
    expect(bias.content).toContain('Prevalence, Alternatives, Updates, Systems, Evidence');
    expect(bias.content).toContain('not diagnoses of a clinician');
    expect(bias.content).toContain('merely naming a bias does not reliably remove it');

    const prejudice = wave.items.find((item) => item.title === 'Prejudice & Discrimination Interventions');
    expect(prejudice.content).toContain('not four guaranteed prejudice reducers');
    expect(prejudice.content).toContain('publication bias concerns');
    expect(prejudice.content).toContain('cannot certify a diversity program');

    const prenatal = wave.items.find((item) => item.title === 'Prenatal Development & Teratogens');
    expect(prenatal.content).toContain('TIME x DOSE x AGENT x SUSCEPTIBILITY');
    expect(prenatal.content).toContain('rule of thumb, not a guarantee');
    expect(prenatal.content).toContain('Do not stop a prescribed medication');

    const aging = wave.items.find((item) => item.title === 'Aging & Cognitive Changes');
    expect(aging.content).toContain('SELECTIVE CHANGE + WIDE VARIATION');
    expect(aging.content).toContain('group trends');
    expect(aging.content).toContain('no single sign proves dementia');

    const iq = wave.items.find((item) => item.title === 'IQ Score Interpretation');
    expect(iq.content).toContain('interpretation still begins with the manual');
    expect(iq.content).toContain('mathematical approximations, not diagnoses');
    expect(iq.content).toContain('report its confidence interval');
    expect(iq.content).toContain('do not measure every valued human ability');

    const fnd = wave.items.find((item) => item.title === 'Conversion Disorder (Functional Neurological)');
    expect(fnd.content).toContain('not "stress converted into symptoms."');
    expect(fnd.content).toContain('positive clinical features');
    expect(fnd.content).toContain('Psychological stress');
    expect(fnd.content).toContain('is not required');
  });

  it('updates intervention, validity, single-case, legal, and end-of-life claims', () => {
    const tokens = wave.items.find((item) => item.title === 'Token Economy & Contingency Management');
    expect(tokens.content).toContain('six interacting elements');
    expect(tokens.content).toContain('not a required component of every token economy');
    expect(tokens.content).toContain('assent');

    const dbt = wave.items.find((item) => item.title === 'DBT — Dialectical Behavior Therapy');
    expect(dbt.content).toContain('Comprehensive outpatient DBT is more than a skills list');
    expect(dbt.content).toContain('DBT-informed');
    expect(dbt.content).toContain('not the only evidence-supported treatment');

    const validity = wave.items.find((item) => item.title === 'Validity Types');
    expect(validity.content).toContain('Replace "four types of validity"');
    expect(validity.content).toContain('The test itself does not possess four permanent validity badges');
    expect(validity.content).toContain('Response-process evidence');

    const singleCase = wave.items.find((item) => item.title === 'Single-Subject Research Designs');
    expect(singleCase.content).toContain('not a magic ABA label');
    expect(singleCase.content).toContain('not automatically "best,"');
    expect(singleCase.content).toContain('level, trend, variability, immediacy, overlap, and consistency');

    const tarasoff = wave.items.find((item) => item.title === 'Tarasoff Ruling — Complete');
    expect(tarasoff.content).toContain('California case anchor');
    expect(tarasoff.content).toContain('not a current multistate decision rule');
    expect(tarasoff.content).toContain('current jurisdiction controls');

    const endOfLife = wave.items.find((item) => item.title === 'End-of-Life Ethical Issues');
    expect(endOfLife.content).toContain('capacity');
    expect(endOfLife.content).toContain('competence');
    expect(endOfLife.content).toContain('February 2026');
    expect(endOfLife.content).toContain('"APA has no official position" is outdated');
  });

  it('keeps Wave 07 reproducible, ordered, and visible in the generated QA report', () => {
    const output = execFileSync(process.execPath, ['dev-tools/repair_eppp_memory_aid_review_wave_07.cjs', '--check'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(output).toContain('current and guarded after Wave 06');

    const waveFiles = fs.readdirSync(resolve(process.cwd(), 'test_prep'))
      .filter((filename) => /^eppp_memory_aid_review_wave_\d+\.json$/i.test(filename))
      .sort((left, right) => Number(left.match(/_(\d+)\.json$/i)[1]) - Number(right.match(/_(\d+)\.json$/i)[1]));
    const waveSevenIndex = waveFiles.indexOf('eppp_memory_aid_review_wave_07.json');
    expect(waveFiles[waveSevenIndex - 1]).toBe('eppp_memory_aid_review_wave_06.json');

    const builder = fs.readFileSync(resolve(process.cwd(), 'dev-tools/build_eppp_learning_library.cjs'), 'utf8');
    expect(builder).toContain('function orderedMemoryAidWaveFiles(directory)');
    expect(builder).toContain('Memory-aid review waves must be contiguous from Wave 01');
    expect(builder).toContain('${catalog.summary.sourceReviewedMemoryAids} of ${catalog.summary.memoryAids} memory aids have source-review records');
    expect(builder).toContain('independent qualified expert validation is still pending');
  });

  it('keeps source data and generated JSON free of mojibake', () => {
    expect(JSON.stringify(wave)).not.toMatch(/\uFFFD|\u00e2\u20ac|\u00c3/);
  });
});
