import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const packPath = resolve(root, 'test_prep/ap_us_history_foundation_pilot.json');
const libraryPath = resolve(root, 'test_prep/ap_us_history_foundation_pilot_learning_library.json');
const qaPath = resolve(root, 'test_prep/ap_us_history_foundation_pilot_qa.json');
const manifestPath = resolve(root, 'test_prep/pack_manifest.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

const pack = readJson(packPath);
const library = readJson(libraryPath);
const qa = readJson(qaPath);

describe('AP U.S. History internal foundation pilot', () => {
  it('declares a current-framework, unofficial, internal foundation slice', () => {
    expect(pack.id).toBe('ap-us-history-foundation-pilot');
    expect(pack.version).toBe('0.1.0-internal-preview');
    expect(pack.status).toBe('preview');
    expect(pack.visibility).toBe('internal');
    expect(pack.released).toBe(false);
    expect(pack.releaseGates.releaseEligible).toBe(false);
    expect(pack.domains).toHaveLength(9);
    expect(pack.historicalThinkingSkills).toHaveLength(6);
    expect(pack.blueprint.targetExamYear).toBeNull();
    expect(pack.capabilities.stimulusGroupsIncluded).toBe(false);
    expect(pack.capabilities.constructedResponseIncluded).toBe(false);
  });

  it('contains 600 original items with five-item coverage for every current framework topic', () => {
    const periodCounts = countBy(pack.items.map((item) => item.domainId));
    const skillCounts = countBy(pack.items.map((item) => item.practiceId));
    const reasoningCounts = countBy(pack.items.map((item) => item.reasoningProcess));
    const topicCounts = countBy(pack.items.flatMap((item) => item.topicIds));
    const topicIds = new Set(pack.items.flatMap((item) => item.topicIds));

    expect(pack.items).toHaveLength(600);
    expect(Object.values(periodCounts)).toEqual([41, 47, 74, 80, 69, 80, 85, 84, 40]);
    expect(Object.keys(skillCounts).sort()).toEqual(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
    expect(pack.blueprint.officialFrameworkTopicCount).toBe(105);
    expect(topicIds.size).toBe(105);
    expect(Object.values(topicCounts).filter((count) => count >= 2)).toHaveLength(105);
    expect(Object.values(topicCounts).filter((count) => count >= 3)).toHaveLength(105);
    expect(Object.values(topicCounts).filter((count) => count >= 4)).toHaveLength(105);
    expect(Object.values(topicCounts).filter((count) => count >= 5)).toHaveLength(105);
    expect(Object.values(topicCounts).filter((count) => count >= 6)).toHaveLength(75);
    expect(Object.values(topicCounts).filter((count) => count >= 7)).toHaveLength(0);
    expect(pack.blueprint.depthCoverage).toMatchObject({
      status: 'complete-second-layer',
      depthSliceCount: 2,
      additionalDepthItemCount: 100,
      additionalDepthTopicCount: 98,
      topicsWithAtLeastTwoItems: 105,
      topicsWithThreeOrMoreItems: 105,
      topicsWithFourOrMoreItems: 105,
      topicsWithFiveOrMoreItems: 105,
      singleItemTopicCount: 0,
    });
    expect(pack.blueprint.balanceCoverage).toMatchObject({
      status: 'third-layer-skill-balance',
      itemCount: 60,
      topicCount: 60,
      topicsWithAtLeastThreeItems: 105,
      topicsWithAtLeastFourItems: 105,
      topicsWithAtLeastFiveItems: 105,
    });
    expect(pack.blueprint.completionCoverage).toMatchObject({
      status: 'complete-third-layer',
      itemCount: 40,
      topicCount: 35,
      topicsWithAtLeastThreeItems: 105,
      topicsWithAtLeastFourItems: 105,
      topicsWithAtLeastFiveItems: 105,
    });
    expect(pack.blueprint.fourthLayerCoverage).toMatchObject({
      status: 'complete-fourth-layer',
      itemCount: 100,
      topicCount: 100,
      topicsWithAtLeastFourItems: 105,
      topicsWithAtLeastFiveItems: 105,
    });
    expect(pack.blueprint.fifthLayerCoverage).toMatchObject({
      status: 'fifth-layer-balance',
      itemCount: 80,
      topicCount: 80,
      topicsWithAtLeastFourItems: 105,
      topicsWithAtLeastFiveItems: 105,
      topicsWithAtLeastSixItems: 75,
    });
    expect(pack.blueprint.fifthLayerCompletionCoverage).toMatchObject({
      status: 'complete-fifth-layer',
      itemCount: 40,
      topicCount: 40,
      topicsWithAtLeastFiveItems: 105,
      topicsWithAtLeastSixItems: 75,
    });
    expect(pack.blueprint.sixthLayerCoverage).toMatchObject({
      status: 'sixth-layer-balance',
      itemCount: 60,
      topicCount: 60,
      topicsWithAtLeastFiveItems: 105,
      topicsWithAtLeastSixItems: 75,
      topicsWithAtLeastSevenItems: 0,
    });
    expect(reasoningCounts).toEqual({ comparison: 206, causation: 213, 'continuity-change': 181 });
    expect(pack.reasoningDistribution).toMatchObject(reasoningCounts);
    expect(pack.items.every((item) => item.type === 'single-choice' && item.choices.length === 4 && item.choiceRationales.length === 4)).toBe(true);
    expect(pack.items.every((item) => new RegExp(`^${item.practiceId.slice(1)}\\.[A-Z]$`).test(item.skillId))).toBe(true);
    expect(pack.items.every((item) => item.provenance === 'native-original' && item.releaseEligible === false)).toBe(true);
    expect(pack.answerPositionDistribution).toEqual({ 0: 150, 1: 150, 2: 150, 3: 150 });
  });

  it('provides nine chapters, structured lessons, study aids, and unscored workshops', () => {
    expect(library.chapters).toHaveLength(9);
    expect(library.chapters.every((chapter) => chapter.sections.length === 3 && chapter.knowledgeChecks.length === 3)).toBe(true);
    expect(library.chapters.every((chapter) => chapter.sections.every((section) => section.contentBlocks.length >= 5 && section.examples.length >= 2 && section.nonExamples.length >= 2))).toBe(true);
    expect(library.flashcards).toHaveLength(27);
    expect(library.memoryAids).toHaveLength(9);
    expect(library.diagrams).toHaveLength(9);
    expect(library.constructedResponseWorkshops).toHaveLength(3);
    expect(library.constructedResponseWorkshops.every((workshop) => workshop.unscored && !workshop.automatedScoring && !workshop.scorePrediction && !workshop.releaseEligible)).toBe(true);
    expect(library.summary).toMatchObject({ chapters: 9, sections: 27, knowledgeChecks: 27, flashcards: 27, memoryAids: 9, constructedResponseWorkshops: 3 });
  });

  it('passes deterministic QA and binds byte-identical deployment mirrors', () => {
    expect(qa.automatedAssessment.automatedQaStatus).toBe('pass');
    expect(qa.automatedAssessment.structuralFindings).toEqual([]);
    expect(qa.independentHumanReview.releaseReady).toBe(false);
    expect(qa.deploymentParity.every((parity) => parity.status === 'pass')).toBe(true);

    const manifest = readJson(manifestPath);
    const entry = manifest.entries.find((candidate) => candidate.id === pack.id);
    expect(entry).toMatchObject({ loadMode: 'lazy', visibility: 'internal', itemCount: 600, domainCount: 9 });
    expect(entry.sha256).toBe(sha256(packPath));
    expect(entry.learningLibrarySha256).toBe(sha256(libraryPath));
    expect(entry.nativeQaSha256).toBe(sha256(qaPath));
  });
});
