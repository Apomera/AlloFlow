import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const paddedChoiceText = 'Under the conditions in the question, the best response is ';
const wordCount = (value) => String(value).trim().split(/\s+/).filter(Boolean).length;
const supersedingReviewWaveById = new Map([
  ['eppp-v3-assessment-061', 'eppp-native-quality-wave-19'],
  ['eppp-v3-intervention-060', 'eppp-native-quality-wave-16'],
  ['eppp-v3-professional-030', 'eppp-native-quality-wave-06'],
  ['eppp-v3-assessment-062', 'eppp-native-quality-wave-07'],
  ['eppp-v3-intervention-069', 'eppp-native-quality-wave-07'],
  ['eppp-v3-professional-041', 'eppp-native-quality-wave-09'],
  ['eppp-v3-professional-055', 'eppp-native-quality-wave-11'],
  ['eppp-v3-intervention-062', 'eppp-native-quality-wave-12'],
  ['eppp-v3-social-cultural-055', 'eppp-native-quality-wave-12'],
  ['eppp-v3-intervention-064', 'eppp-native-quality-wave-12'],
]);

describe('EPPP native quality repair wave 02', () => {
  it('records completion of the entire 113-item deep-rewrite queue', () => {
    const audit = json('test_prep/eppp_native_quality_audit_wave_02.json');
    expect(audit.summary).toEqual({
      totalItems: 1500,
      queuedItemsReviewed: 113,
      choiceSetsRewritten: 113,
      promptsReframedToReduceDuplicationOrCorrectScope: 19,
      rationalesSubstantivelyRevised: 25,
      sourceRecordsRepaired: 6,
      remainingMechanicallyPaddedItems: 0,
      remainingParallelChoiceFindings: 0,
      status: 'pass',
    });
    expect(audit.domainCounts).toEqual({ assessment: 22, 'cognitive-affective': 20, intervention: 11, lifespan: 11, professional: 38, 'social-cultural': 11 });
    expect(audit.rewrittenItemIds).toHaveLength(113);
    expect(new Set(audit.rewrittenItemIds).size).toBe(113);
  });

  it('keeps every rewritten set natural, parallel, and fully explained', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const audit = json('test_prep/eppp_native_quality_audit_wave_02.json');
    const byId = new Map(bank.map((item) => [item.id, item]));
    expect(bank.some((item) => item.choices.some((choice) => choice.includes(paddedChoiceText)))).toBe(false);
    for (const id of audit.rewrittenItemIds) {
      const item = byId.get(id);
      expect(item, id).toBeTruthy();
      expect(item.wordingReviewStatus, id).toBe('editorial-deep-rewrite-pass');
      expect(item.wordingReviewWave, id).toBe(
        supersedingReviewWaveById.get(id) || 'eppp-native-quality-wave-02',
      );
      expect(item.choices, id).toHaveLength(4);
      expect(new Set(item.choices.map((choice) => choice.toLowerCase())), id).toHaveLength(4);
      expect(item.choiceRationales, id).toHaveLength(4);
      expect(item.choiceRationales.every((feedback) => feedback.length >= 80), id).toBe(true);
      const lengths = item.choices.map(wordCount);
      const answerLength = lengths[item.answerIndex];
      const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
      const ratio = Math.max(...lengths) / Math.max(1, Math.min(...lengths));
      expect(answerLength - longestDistractor, id).toBeLessThanOrEqual(2);
      expect(ratio, id).toBeLessThanOrEqual(1.8);
    }
  });

  it('repairs the broken flashbulb DOI and uses primary APA ethics provenance', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const byId = new Map(bank.map((item) => [item.id, item]));
    const flashbulb = byId.get('eppp-v3-cognitive-affective-046');
    expect(flashbulb.references).toEqual(['https://doi.org/10.1016/0010-0277(77)90018-X']);
    expect(flashbulb.sourceDetails[0].title).toContain('Brown, R., & Kulik, J. (1977)');
    expect(flashbulb.sourceDetails[0].credibility).toContain('peer-reviewed');
    const ethicsCode = byId.get('eppp-v3-professional-060');
    expect(ethicsCode.references).toEqual(['https://www.apa.org/ethics/code']);
    expect(ethicsCode.sourceDetails[0].title).toBe('Ethical Principles of Psychologists and Code of Conduct');
    expect(ethicsCode.sourceDetails[0].organization).toBe('American Psychological Association');
    expect(ethicsCode.sourceDetails[0].credibility).toMatch(/primary source/i);
    expect(ethicsCode.choices[ethicsCode.answerIndex]).toContain('2002');
  });

  it('reframes changing legal claims as stable APA ethics concepts', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const byId = new Map(bank.map((item) => [item.id, item]));
    const consent = byId.get('eppp-v3-professional-031');
    expect(consent.prompt).toContain('lacks capacity to give informed consent');
    expect(consent.rationale).toContain('Standard 3.10');
    const confidentiality = byId.get('eppp-v3-professional-033');
    expect(confidentiality.prompt).toContain('identifiable material');
    expect(confidentiality.rationale).toContain('Standard 4.07');
    expect([consent, confidentiality].some((item) => /state law|licens|court|subpoena|mandated|legal/i.test(item.prompt + ' ' + item.rationale))).toBe(false);
  });

  it('publishes every rewritten learner record in the lazy runtime asset', () => {
    const bank = json('test_prep/eppp_native_items.json');
    const audit = json('test_prep/eppp_native_quality_audit_wave_02.json');
    const pack = json('test_prep/eppp_part_one_pack.json');
    const canonical = new Map(bank.map((item) => [item.id, item]));
    const runtime = new Map(pack.items.map((item) => [item.id, item]));

    expect(pack.id).toBe('eppp-part-one');
    expect(pack.items).toHaveLength(1500);
    for (const id of audit.rewrittenItemIds) {
      const expected = canonical.get(id);
      const actual = runtime.get(id);
      for (const field of ['prompt', 'choices', 'answerIndex', 'rationale', 'choiceRationales', 'references']) {
        expect(actual[field], id + ' ' + field).toEqual(expected[field]);
      }
    }
    expect(read('desktop/web-app/public/test_prep/eppp_part_one_pack.json')).toBe(read('test_prep/eppp_part_one_pack.json'));
    expect(read('desktop/web-app/public/test_prep_hub_module.js')).toBe(read('test_prep_hub_module.js'));
    for (const modulePath of ['test_prep_hub_module.js', 'desktop/web-app/public/test_prep_hub_module.js']) {
      const moduleText = read(modulePath);
      expect(moduleText).not.toContain('EPPP_NATIVE_ITEMS');
      expect(moduleText).not.toContain('EPPP_PART_ONE_SCAFFOLD');
    }
  });
  it('publishes exact source/deployment mirrors and deterministic regeneration', () => {
    for (const name of ['eppp_native_items.json', 'eppp_native_quality_audit_wave_02.json', 'eppp_native_quality_audit_wave_02.md', 'eppp_native_qa.json', 'eppp_native_qa.md']) {
      expect(read(`desktop/web-app/public/test_prep/${name}`)).toBe(read(`test_prep/${name}`));
    }
    expect(read('dev-tools/build_eppp_1500_expansion.cjs')).toContain("runReplayScript('./repair_eppp_native_quality_wave_02.cjs')");
  });
});
