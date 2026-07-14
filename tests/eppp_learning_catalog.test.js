import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
const readText = (relativePath) => fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('EPPP native learning-library catalog', () => {
  const catalog = read('test_prep/eppp_learning_library.json');
  const qa = read('test_prep/eppp_learning_library_qa.json');
  const reviewOverrides = read('test_prep/eppp_learning_review_overrides.json');

  it('catalogs the complete preserved learning library with stable unique IDs', () => {
    expect(catalog.summary).toMatchObject({ chapters: 49, sections: 278, diagrams: 25, diagramPlacements: 57, knowledgeChecks: 98, flashcards: 415, memoryAids: 255 });
    expect(new Set(catalog.chapters.map((item) => item.id)).size).toBe(49);
    expect(new Set(catalog.flashcards.map((item) => item.id)).size).toBe(415);
    expect(new Set(catalog.memoryAids.map((item) => item.id)).size).toBe(255);
  });

  it('keeps unreviewed content gated while recording complete provenance and learner structure', () => {
    expect(catalog.chapters.every((chapter) => ['review-required', 'source-reviewed-editorial-pass'].includes(chapter.reviewStatus) && chapter.legacySource)).toBe(true);
    expect(catalog.chapters.filter((chapter) => chapter.reviewStatus === 'source-reviewed-editorial-pass').map((chapter) => chapter.id)).toEqual(['ch-1', 'ch-2', 'ch-3', 'ch-4', 'ch-5', 'ch-6', 'ch-7', 'ch-8', 'ch-9', 'ch-10', 'ch-11', 'ch-12', 'ch-13', 'ch-14', 'ch-15', 'ch-16', 'ch-17', 'ch-18', 'ch-19', 'ch-20', 'ch-21', 'ch-22', 'ch-23', 'ch-24', 'ch-25', 'ch-26', 'ch-27', 'ch-28', 'ch-29', 'ch-30', 'ch-31', 'ch-47', 'ch-49']);
    expect(catalog.chapters.filter((chapter) => chapter.reviewStatus === 'review-required')).toHaveLength(16);
    expect(catalog.chapters.find((chapter) => chapter.id === 'ch-12')).toMatchObject({ diagramCount: 1, checks: { 'expert-review': 'pending-independent-review' } });
    const psychometrics = catalog.chapters.find((chapter) => chapter.id === 'ch-1');
    expect(psychometrics).toMatchObject({
      reviewStatus: 'source-reviewed-editorial-pass',
      diagramCount: 2,
      checks: { 'expert-review': 'pending-independent-psychometrics-review' },
    });
    expect(reviewOverrides.chapters['ch-1'].references).toHaveLength(7);
    expect(psychometrics.sections.filter((section) => section.hasKnowledgeCheck)).toHaveLength(2);
    expect(catalog.chapters.flatMap((chapter) => chapter.sections)).toHaveLength(278);
    expect(catalog.flashcards.every((card) => card.front && card.back && ['review-required', 'source-reviewed-editorial-pass'].includes(card.reviewStatus))).toBe(true);
    expect(catalog.flashcards.filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass')).toHaveLength(9);
    expect(catalog.flashcards.filter((card) => card.reviewStatus === 'review-required')).toHaveLength(406);
    expect(catalog.memoryAids.every((aid) => aid.title && aid.content && ['review-required', 'source-reviewed-editorial-pass', 'editorial-reviewed-source-pending'].includes(aid.reviewStatus))).toBe(true);
    expect(catalog.memoryAids.filter((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass')).toHaveLength(8);
    expect(catalog.memoryAids.filter((aid) => aid.reviewStatus === 'editorial-reviewed-source-pending')).toHaveLength(2);
    expect(catalog.memoryAids.filter((aid) => aid.reviewStatus === 'review-required')).toHaveLength(245);
    expect(catalog.diagrams.every((diagram) => diagram.hasSvg && diagram.description)).toBe(true);
    expect(qa.status).toBe('review-in-progress');
    expect(qa.summary).toMatchObject({ qaPassedChapters: 0, sourceReviewedChapters: 33, qaPassedFlashcards: 0, qaPassedMemoryAids: 0 });
  });

  it('keeps Chapter 1 psychometric claims qualified and interaction metadata intact', () => {
    const chapter = readText('test_prep/eppp_legacy/js/textbook_ch5_1.js');
    const diagrams = readText('test_prep/eppp_legacy/js/textbook_diagrams.js');

    expect(chapter).toContain('current EPPP Part 1');
    expect(chapter).toContain('conditional SEM');
    expect(chapter).toContain('midpoint between the lower asymptote');
    expect(chapter).toContain('model fits and calibrations are placed on a common scale');
    expect(chapter).toContain('content, exposure, and stopping constraints');
    expect(chapter).toContain('|r<sub>xy</sub>|');
    expect(chapter).not.toContain('item parameters are sample-independent');
    expect(chapter).not.toContain('Restriction of range always');
    expect(diagrams).toContain('Validity is a unified argument for an intended score interpretation and use');
    expect(diagrams).toContain('Face credibility (not validity evidence)');
  });

  it('keeps Chapter 2 cognitive-assessment claims qualified and interaction metadata intact', () => {
    const chapter = readText('test_prep/eppp_legacy/js/textbook_ch5_2.js');
    const cognitiveAssessment = catalog.chapters.find((item) => item.id === 'ch-2');

    expect(cognitiveAssessment).toMatchObject({
      reviewStatus: 'source-reviewed-editorial-pass',
      diagramCount: 1,
      checks: { 'expert-review': 'pending-independent-cognitive-assessment-review' },
    });
    expect(cognitiveAssessment.sections.filter((section) => section.hasKnowledgeCheck)).toHaveLength(2);
    expect(reviewOverrides.chapters['ch-2'].references.length).toBeGreaterThanOrEqual(12);
    expect(chapter).toContain('validated version and interpret it with');
    expect(chapter).toContain('should not automatically be equated with malingering');
    expect(chapter).toContain('Do <em>not</em> mechanically subtract a fixed number of points');
    expect(chapter).toContain('currently operationalizes developmental onset as before age 22');
    expect(chapter).toContain('Lack of embodiment in software must not be equated with intellectual disability');
    expect(chapter).not.toContain('90% sensitivity vs. MMSE');
    expect(chapter).not.toContain('true score of 67');
    expect(chapter).not.toContain('Scores below expected range suggest insufficient effort or deliberate faking');
    expect(chapter).not.toContain('Profound intellectual disability in the practical domain');
  });

  it('keeps Chapter 3 personality-assessment claims versioned, contextual, and interactive', () => {
    const chapter = readText('test_prep/eppp_legacy/js/textbook_ch5_3.js');
    const personality = catalog.chapters.find((item) => item.id === 'ch-3');

    expect(personality).toMatchObject({
      reviewStatus: 'source-reviewed-editorial-pass',
      diagramCount: 1,
      checks: { 'expert-review': 'pending-independent-personality-assessment-review' },
    });
    expect(personality.sections.filter((section) => section.hasKnowledgeCheck)).toHaveLength(2);
    expect(reviewOverrides.chapters['ch-3'].references.length).toBeGreaterThanOrEqual(9);
    expect(chapter).toContain('scale names omit -r');
    expect(chapter).toContain('do not independently reveal motive, dishonesty, malingering');
    expect(chapter).toContain('NEO Personality Inventory-3 Normative Update');
    expect(chapter).toContain('neither globally valid nor globally invalid');
    expect(chapter).toContain('There is no universally best instrument');
    expect(chapter).not.toContain('Classic "faking bad" pattern');
    expect(chapter).not.toContain('massively inflated pathology scores');
    expect(chapter).not.toContain('Classification accuracy near chance');
    expect(chapter).not.toContain('every prompt I receive is arguably a <em>projective stimulus</em>');
  });

  it('keeps Chapter 4 behavioral-assessment inference cautious, current, and interactive', () => {
    const chapter = readText('test_prep/eppp_legacy/js/textbook_ch4.js');
    const behavioral = catalog.chapters.find((item) => item.id === 'ch-4');

    expect(behavioral).toMatchObject({
      reviewStatus: 'source-reviewed-editorial-pass',
      diagramCount: 2,
      checks: { 'expert-review': 'pending-independent-behavioral-assessment-review' },
    });
    expect(behavioral.sections.filter((section) => section.hasKnowledgeCheck)).toHaveLength(2);
    expect(reviewOverrides.chapters['ch-4'].references).toHaveLength(10);
    expect(chapter).toContain('Observed consequence = hypothesis');
    expect(chapter).toContain('FBA is therefore broader than descriptive recording alone');
    expect(chapter).toContain('original Iwata arrangement');
    expect(chapter).toContain('not a truth detector');
    expect(chapter).toContain('does not eliminate recall error');
    expect(chapter).not.toContain('the answer is always one of these four');
    expect(chapter).not.toContain('Tangible (Play)');
    expect(chapter).not.toContain('Eliminates retrospective recall bias');
    expect(chapter).not.toContain('Evidence-based for tension headaches, migraine, chronic pain, hypertension, and anxiety');
    expect(chapter).not.toContain("I don’t experience the consequences");
  });

  it('keeps Chapter 29 executive-function, calibration, and self-regulation claims qualified and interactive', () => {
    const chapter = readText('test_prep/eppp_legacy/js/textbook_ch29.js');
    const metacognition = catalog.chapters.find((item) => item.id === 'ch-29');

    expect(metacognition).toMatchObject({
      reviewStatus: 'source-reviewed-editorial-pass',
      sectionCount: 5,
      diagramCount: 1,
      knowledgeCheckCount: 4,
      referenceCount: 14,
      checks: { 'expert-review': 'pending-independent-cognitive-neuropsychology-and-metacognition-review' },
    });
    expect(reviewOverrides.chapters['ch-29'].references).toHaveLength(14);
    expect(chapter).toContain('task-impurity problem');
    expect(chapter).toContain('there is no switch that flips at age 25');
    expect(chapter).toContain('A single confident error does not diagnose a Dunning-Kruger effect');
    expect(chapter).toContain('d</em> = 0.06 and nonsignificant');
    expect(chapter).toContain('does not uniquely prove that every unattended message is fully analyzed');
    expect(chapter).toContain('One low score is not a diagnosis, a lesion localizer');
    expect(chapter).not.toContain('controlled primarily by the <strong>prefrontal cortex</strong>');
    expect(chapter).not.toContain('This explains adolescent risk-taking and impulsivity');
    expect(chapter).not.toContain('lack the metacognitive skill to recognize their own incompetence');
    expect(chapter).not.toContain('Self-regulation = strongest predictor of child outcomes');
    expect(chapter).not.toContain('SES was a confounding variable that accounted for much of the predictive validity');
  });

  it('keeps Chapter 30 attribution, culture, and expectancy claims qualified and interactive', () => {
    const chapter = readText('test_prep/eppp_legacy/js/textbook_ch30.js');
    const attribution = catalog.chapters.find((item) => item.id === 'ch-30');

    expect(attribution).toMatchObject({
      reviewStatus: 'source-reviewed-editorial-pass',
      sectionCount: 4,
      diagramCount: 1,
      knowledgeCheckCount: 3,
      referenceCount: 13,
      checks: { 'expert-review': 'pending-independent-social-cultural-and-forensic-psychology-review' },
    });
    expect(reviewOverrides.chapters['ch-30'].references).toHaveLength(13);
    expect(chapter).toContain('entity or stimulus attribution');
    expect(chapter).toContain('meta-analysis of 173 studies found essentially no overall asymmetry');
    expect(chapter).toContain('Culture is not a binary');
    expect(chapter).toContain('Responsibility for sexual assault lies with the person who committed it');
    expect(chapter).toContain('does not justify saying that any random “bloomer” label guarantees dramatic IQ growth');
    expect(chapter).toContain('Mixed or missing cues');
    expect(chapter).not.toContain('This bias is NOT about malice');
    expect(chapter).not.toContain('FAE is primarily a Western/individualistic phenomenon');
    expect(chapter).not.toContain('those students actually improved more');
    expect(chapter).not.toContain('Hard to override even with contradictory later information');
  });

  it('keeps Chapter 31 social-influence claims conditional, nondiagnostic, and interactive', () => {
    const chapter = readText('test_prep/eppp_legacy/js/textbook_ch31.js');
    const socialInfluence = catalog.chapters.find((item) => item.id === 'ch-31');

    expect(socialInfluence).toMatchObject({
      reviewStatus: 'source-reviewed-editorial-pass',
      sectionCount: 4,
      diagramCount: 2,
      knowledgeCheckCount: 3,
      referenceCount: 16,
      checks: { 'expert-review': 'pending-independent-social-cultural-and-research-methods-review' },
    });
    expect(reviewOverrides.chapters['ch-31'].references).toHaveLength(16);
    expect(chapter).toContain('dissented on roughly two thirds');
    expect(chapter).toContain('simulated shock generator');
    expect(chapter).toContain('In that baseline condition, 26 of 40 participants (65%)');
    expect(chapter).toContain('It is not clean proof that random assignment to a guard role automatically produces abuse');
    expect(chapter).toContain('social identity model of deindividuation effects (SIDE)');
    expect(chapter).toContain('danger can attenuate or reverse it');
    expect(chapter).toContain('give a specific bystander a concrete task');
    expect(chapter).toContain('Option A is wrong');
    expect(chapter).not.toContain('450V (lethal)');
    expect(chapter).not.toContain('one ally is the most powerful conformity reducer');
    expect(chapter).not.toContain('Reduced in collectivist cultures');
    expect(chapter).not.toContain('More bystanders = <em>less</em> individual help');
    expect(chapter).not.toContain('Guards became abusive; prisoners became passive');
    expect(chapter).not.toContain('power of the SITUATION, not disposition');
  });

  it('keeps native catalog and QA deployment copies synchronized', () => {
    expect(read('prismflow-deploy/public/test_prep/eppp_learning_library.json')).toEqual(catalog);
    expect(read('prismflow-deploy/public/test_prep/eppp_learning_library_qa.json')).toEqual(qa);
  });
});
