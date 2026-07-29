import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const read = (path) => JSON.parse(fs.readFileSync(resolve(process.cwd(), path), 'utf8'));
const normalizeTitle = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const historicalArtifact = 'eppp_memory_aid_review_wave_06.json';
const correctionArtifact = 'eppp_memory_aid_correction_wave_01.json';

describe('EPPP memory-aid review wave 06', () => {
  const wave = read('test_prep/eppp_memory_aid_review_wave_06.json');
  const { wave: dataWave } = require('../dev-tools/eppp_memory_aid_review_wave_06_data.cjs');
  const catalog = read('test_prep/eppp_learning_library.json');
  const referenceCatalog = read('test_prep/reference_catalog.json');
  const correctionPath = resolve(process.cwd(), 'test_prep', correctionArtifact);
  const correctionWave = fs.existsSync(correctionPath) ? read(`test_prep/${correctionArtifact}`) : null;
  const correctionsById = new Map((correctionWave?.items || []).map((item) => [item.legacyId, item]));
  const priorWaves = [1, 2, 3, 4, 5].flatMap((number) => read(`test_prep/eppp_memory_aid_review_wave_0${number}.json`).items);
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
      'memory-aid-168fe4e72e3f17e6',
      'memory-aid-c4ee337cb0ae9dc8',
      'memory-aid-78b915258534fee0',
      'memory-aid-c7500759906c0d3a',
      'memory-aid-f293a976f53d77c4',
      'memory-aid-ce766db93fa89261',
      'memory-aid-de9d8582021d4d6f',
      'memory-aid-a359edc005601290',
      'memory-aid-8295b75dba628e08',
      'memory-aid-3b68cbcc671b7a26',
      'memory-aid-1814264164727316',
      'memory-aid-d47ad8a266aaee94',
      'memory-aid-060272889c689796',
      'memory-aid-8a12ab83499601e5',
      'memory-aid-77466b97050b1532',
      'memory-aid-3172661f20208f78',
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

  it('repairs biological and cognitive-developmental absolutes while retaining retrieval cues', () => {
    const hpa = wave.items.find((item) => item.title === 'HPA Axis in Stress');
    expect(hpa.content).toContain('CRH -> ACTH -> cortisol');
    expect(hpa.content).toContain('negative feedback');
    expect(hpa.content).toContain('elevated, blunted, shifted');
    expect(hpa.content).not.toMatch(/stuck ON|burns out|Result: Hippocampal damage/i);

    const neurology = wave.items.find((item) => item.title === 'TBI & Neurological Conditions');
    expect(neurology.content).toContain('loss of consciousness is not required');
    expect(neurology.content).toContain('focal, generalized, or unknown');
    expect(neurology.content).toContain('"Grand mal," "petit mal," and "simple/complex partial" are legacy terms');
    expect(neurology.content).toContain('imprecise label "pseudodementia"');
    expect(neurology.content).not.toMatch(/Generalized \(whole brain\)|Focal\/Partial|Depression can mimic dementia/i);

    const piaget = wave.items.find((item) => item.title === "Piaget's Stages");
    expect(piaget.content).toContain('not a developmental stopwatch');
    expect(piaget.content).toContain('ages are approximate');
    expect(piaget.content).toContain('substantial variability');

    const motivation = wave.items.find((item) => item.title === 'Motivation: Intrinsic vs Extrinsic');
    expect(motivation.content).toContain('conditional finding');
    expect(motivation.content).toContain('expected tangible rewards');
    expect(motivation.content).toContain('Positive competence-relevant feedback');
    expect(motivation.content).not.toContain('they STOP drawing');
  });

  it('adds cultural, forensic, gender, and attachment boundaries', () => {
    const multicultural = wave.items.find((item) => item.title === 'Multicultural Counseling Competencies');
    expect(multicultural.content).toContain('CONTEXT, POWER, and HUMILITY');
    expect(multicultural.content).toContain('within a named group vary');
    expect(multicultural.content).toContain('Ask the person');

    const competency = wave.items.find((item) => item.title === 'Competency to Stand Trial');
    expect(competency.content).toContain('CONSULT + UNDERSTAND');
    expect(competency.content).toContain('ultimate legal determination');
    expect(competency.content).toContain('restoration is not synonymous with medication');

    const gender = wave.items.find((item) => item.title === 'Gender Identity Development');
    expect(gender.content).toContain('four concepts separate');
    expect(gender.content).toContain('not a test that every child completes');
    expect(gender.content).toContain('Gender diversity itself is not a mental disorder');

    const attachment = wave.items.find((item) => item.title === 'Adult Attachment Styles');
    expect(attachment.content).toContain('ANXIETY x AVOIDANCE');
    expect(attachment.content).toContain('continuously');
    expect(attachment.content).toContain('not simply an "attachment type"');
    expect(attachment.content).not.toMatch(/~55%|~25%|clingy/i);
  });

  it('prevents assessment, diagnostic-culture, treatment, and common-factor shortcuts', () => {
    const mmpi = wave.items.find((item) => item.title === 'MMPI-2 Validity Scales');
    expect(mmpi.content).toContain('never a lie detector');
    expect(mmpi.content).toContain('An elevation is evidence about a response pattern, not a motive or diagnosis');
    expect(mmpi.content).toContain('do not mix cut scores');

    const cultural = wave.items.find((item) => item.title === 'Culture-Bound Syndromes');
    expect(cultural.content).toContain('CULTURAL CONCEPTS OF DISTRESS');
    expect(cultural.content).toContain('no one-to-one mapping');
    expect(cultural.content).toContain('Do not call one concept the "opposite"');

    const emdr = wave.items.find((item) => item.title === 'EMDR — Eye Movement Desensitization');
    expect(emdr.content).toContain('not a do-it-yourself script');
    expect(emdr.content).toContain('mechanism of action');
    expect(emdr.content).toContain('remain debated');
    expect(emdr.content).not.toContain('mimics REM sleep processing');

    const common = wave.items.find((item) => item.title === 'Common Factors in Therapy');
    expect(common.content).toContain('Common does not mean identical');
    expect(common.content).toContain('Delete the 40/30/15/15 pie chart');
    expect(common.content).toContain('not proof that all treatments');
  });

  it('replaces rigid statistical rules with model- and context-aware interpretation', () => {
    const assumptions = wave.items.find((item) => item.title === 'Parametric Test Assumptions');
    expect(assumptions.content).toContain('DESIGN -> MODEL -> RESIDUALS -> REMEDY');
    expect(assumptions.content).toContain('Welch procedures');
    expect(assumptions.content).toContain('not interchangeable assumption-free backups');
    expect(assumptions.content).not.toContain('If violated');

    const effect = wave.items.find((item) => item.title === 'Effect Size Interpretation');
    expect(effect.content).toContain('historical rough reference points');
    expect(effect.content).toContain('confidence interval');
    expect(effect.content).toContain('separate judgments');
    expect(effect.content).not.toMatch(/barely noticeable|very obvious difference/i);
  });

  it('makes record retention and privilege explicitly current, conditional, and jurisdiction-aware', () => {
    const records = wave.items.find((item) => item.title === 'Record Keeping & Documentation');
    expect(records.content).toContain('not an APA-mandated universal format');
    expect(records.content).toContain('archived by APA in 2019');
    expect(records.content).toContain('not a current universal retention law');
    expect(records.content).toContain('separately maintained psychotherapy notes');

    const privilege = wave.items.find((item) => item.title === 'Privilege & Exceptions');
    expect(privilege.content).toContain('not a universal exception list');
    expect(privilege.content).toContain('Jaffee did not create a nationwide checklist');
    expect(privilege.content).toContain('A subpoena is also not the same');
    expect(privilege.content).not.toContain('Tarasoff overrides privilege');
  });

  it('keeps Wave 06 reproducible and ordered immediately after Wave 05', () => {
    const output = execFileSync(process.execPath, ['dev-tools/repair_eppp_memory_aid_review_wave_06.cjs', '--check'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(output).toContain('current and guarded after Wave 05');

    const waveFiles = fs.readdirSync(resolve(process.cwd(), 'test_prep'))
      .filter((filename) => /^eppp_memory_aid_review_wave_\d+\.json$/i.test(filename))
      .sort((left, right) => Number(left.match(/_(\d+)\.json$/i)[1]) - Number(right.match(/_(\d+)\.json$/i)[1]));
    const waveSixIndex = waveFiles.indexOf('eppp_memory_aid_review_wave_06.json');
    expect(waveFiles[waveSixIndex - 1]).toBe('eppp_memory_aid_review_wave_05.json');

    const builder = fs.readFileSync(resolve(process.cwd(), 'dev-tools/build_eppp_learning_library.cjs'), 'utf8');
    expect(builder).toContain('function orderedMemoryAidWaveFiles(directory)');
    expect(builder).toContain('Memory-aid review waves must be contiguous from Wave 01');
    expect(builder).toContain("for (const filename of orderedMemoryAidWaveFiles(path.join(root, 'test_prep')))");
  });

  it('keeps source data and generated JSON free of mojibake', () => {
    expect(JSON.stringify(wave)).not.toMatch(/\uFFFD|\u00e2\u20ac|\u00c3/);
  });
});
