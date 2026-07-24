import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(root, relativePath), 'utf8'));

const expectedDomains = {
  biological: 10,
  'cognitive-affective': 13,
  'social-cultural': 11,
  lifespan: 12,
  assessment: 16,
  intervention: 15,
  research: 7,
  professional: 16,
};

describe('EPPP 1,500-question curation release', () => {
  it('adds 500 template-v3 questions with complete feedback, source details, and provenance', () => {
    const bank = read('test_prep/eppp_native_items.json');
    const audit = read('test_prep/eppp_native_expansion_1500_audit.json');
    const added = bank.filter((item) => item.expansionBatch === 'native-1001-1500');

    expect(bank).toHaveLength(1500);
    expect(added).toHaveLength(500);
    expect(audit.summary).toMatchObject({
      addedItems: 500,
      totalItems: 1500,
      addedItemsPassingBuilderChecks: 500,
      addedItemsWithFourChoiceRationales: 500,
      addedItemsWithFullSourceDetails: 500,
      status: 'builder-pass',
    });
    expect(added.filter((item) => item.legacySourceId)).toHaveLength(481);
    expect(added.filter((item) => item.authoredSourceId)).toHaveLength(19);

    for (const item of added) {
      expect(item).toMatchObject({ templateVersion: 3, type: 'single-choice', reviewStatus: 'source-reviewed', qaStatus: 'qa-passed' });
      expect(item.id).toMatch(/^eppp-v3-/);
      expect(item.choices).toHaveLength(4);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((rationale) => rationale.length >= 80)).toBe(true);
      expect(item.sourceDetails).toHaveLength(item.references.length);
      expect(item.sourceDetails.every((source) => source.title.length >= 12 && source.credibility.length >= 100 && item.references.includes(source.url))).toBe(true);
      expect(['legacy-citation-url-reviewed', 'domain-topic-authoritative-source', 'author-created-primary-apa-source', 'item-specific-authoritative-source-review']).toContain(item.sourceReviewBasis);
      if (item.sourceReviewBasis !== 'item-specific-authoritative-source-review') {
        expect(item.sourceMatchScore).toBeGreaterThanOrEqual(item.domainId === 'professional' ? 0.05 : 0.15);
      } else {
        expect(item).not.toHaveProperty('sourceMatchScore');
      }
    }

    const changingLegalClaim = /Tarasoff|HIPAA|state law|licens|court|subpoena|mandated|abuse|legal|Goldwater/i;
    expect(added.filter((item) => item.domainId === 'professional' && item.legacySourceId).some((item) => changingLegalClaim.test(`${item.prompt} ${item.rationale}`))).toBe(false);
  });

  it('documents five additional independently selectable, blueprint-balanced banks', () => {
    const audit = read('test_prep/eppp_native_expansion_1500_audit.json');

    expect(audit.practiceBanks).toHaveLength(5);
    for (let bankNumber = 11; bankNumber <= 15; bankNumber += 1) {
      const rows = audit.items.filter((item) => item.practiceBank === bankNumber);
      const domainCounts = Object.fromEntries(Object.keys(expectedDomains).map((domainId) => [domainId, rows.filter((item) => item.domainId === domainId).length]));
      const bankAudit = audit.practiceBanks.find((bank) => bank.bankNumber === bankNumber);

      expect(rows).toHaveLength(100);
      expect(domainCounts).toEqual(expectedDomains);
      expect(bankAudit).toMatchObject({ items: 100, answerPositions: { A: 25, B: 25, C: 25, D: 25 } });
    }
  });

  it('publishes matching source and deployment curation records with no pending items', () => {
    const curation = read('test_prep/eppp_legacy/curation_1500.json');
    const deployed = read('prismflow-deploy/public/test_prep/eppp_legacy/curation_1500.json');

    expect(curation.summary).toMatchObject({
      targetItems: 1500,
      editorialQaPassedItems: 1500,
      legacySeededReauthoredItems: 1443,
      sourceAuthoredItems: 49,
      nativeOriginalItems: 8,
      pendingItems: 0,
      status: 'complete-editorial-qa',
    });
    expect(curation.batching).toMatchObject({ batchSize: 100, batches: 15 });
    expect(deployed).toEqual(curation);
  });
});