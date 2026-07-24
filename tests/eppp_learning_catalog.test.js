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
    expect(catalog.summary).toMatchObject({ chapters: 49, sections: 278, diagrams: 25, diagramPlacements: 58, knowledgeChecks: 109, flashcards: 415, memoryAids: 255 });
    expect(new Set(catalog.chapters.map((item) => item.id)).size).toBe(49);
    expect(catalog.knowledgeChecks).toHaveLength(109);
    expect(new Set(catalog.knowledgeChecks.map((item) => item.id)).size).toBe(109);
    expect(new Set(catalog.flashcards.map((item) => item.id)).size).toBe(415);
    expect(new Set(catalog.memoryAids.map((item) => item.id)).size).toBe(255);
  });

  it('keeps unreviewed content gated while recording complete provenance and learner structure', () => {
    expect(catalog.chapters.every((chapter) => ['review-required', 'source-reviewed-editorial-pass'].includes(chapter.reviewStatus) && chapter.legacySource)).toBe(true);
    expect(catalog.chapters.filter((chapter) => chapter.reviewStatus === 'source-reviewed-editorial-pass').map((chapter) => chapter.id)).toEqual(Array.from({ length: 49 }, (_, index) => 'ch-' + (index + 1)));
    expect(catalog.chapters.filter((chapter) => chapter.reviewStatus === 'review-required')).toHaveLength(0);
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
    expect(catalog.flashcards.filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass')).toHaveLength(415);
    expect(catalog.flashcards.filter((card) => card.reviewStatus === 'review-required')).toHaveLength(0);
    expect(catalog.flashcards.filter((card) => card.contentDisposition === 'retain-after-rewrite')).toHaveLength(336);
    expect(catalog.flashcards.filter((card) => card.contentDisposition === 'retire-redundant')).toHaveLength(79);
    expect(catalog.memoryAids.every((aid) => aid.title && aid.content && ['review-required', 'source-reviewed-editorial-pass', 'editorial-reviewed-source-pending'].includes(aid.reviewStatus))).toBe(true);
    expect(catalog.memoryAids.filter((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass')).toHaveLength(56);
    expect(catalog.memoryAids.filter((aid) => aid.reviewStatus === 'editorial-reviewed-source-pending')).toHaveLength(2);
    expect(catalog.memoryAids.filter((aid) => aid.reviewStatus === 'review-required')).toHaveLength(197);
    expect(catalog.summary).toMatchObject({
      releasedFlashcards: 336,
      releasedMemoryAids: 56,
      qaPassedKnowledgeChecks: 0,
      sourceReviewedKnowledgeChecks: 32,
      releasedKnowledgeChecks: 32,
      reviewRequiredKnowledgeChecks: 77,
    });
    expect(catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'source-reviewed-editorial-pass')).toHaveLength(32);
    expect(catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'review-required')).toHaveLength(77);
    expect(catalog.chapters.flatMap((chapter) => chapter.knowledgeChecks)).toHaveLength(32);
    expect(catalog.memoryAids.filter((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass').every((aid) => aid.sourceDetails.length > 0 && aid.sourceDetails.every((source) => source.title && source.url && source.whyReputable))).toBe(true);
    expect(catalog.diagrams.every((diagram) => diagram.hasSvg && diagram.description)).toBe(true);
    expect(qa.status).toBe('review-in-progress');
    expect(qa.summary).toMatchObject({ qaPassedChapters: 0, sourceReviewedChapters: 49, qaPassedFlashcards: 0, qaPassedMemoryAids: 0 });
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
    expect(diagrams).toContain('Validity is a unified argument about whether accumulated evidence and theory support a particular interpretation');
    expect(diagrams).toContain('Response processes:');
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
      diagramCount: 1,
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

  it('keeps Chapters 32-34 social and cultural claims bounded, current, and interactive', () => {
    const attitudesText = readText('test_prep/eppp_legacy/js/textbook_ch32.js');
    const aggressionText = readText('test_prep/eppp_legacy/js/textbook_ch33.js');
    const cultureText = readText('test_prep/eppp_legacy/js/textbook_ch34.js');
    const attitudes = catalog.chapters.find((item) => item.id === 'ch-32');
    const aggression = catalog.chapters.find((item) => item.id === 'ch-33');
    const culture = catalog.chapters.find((item) => item.id === 'ch-34');

    expect(attitudes).toMatchObject({ reviewStatus: 'source-reviewed-editorial-pass', sectionCount: 4, diagramCount: 1, knowledgeCheckCount: 3, referenceCount: 12, checks: { 'expert-review': 'pending-independent-social-cognition-attitudes-and-measurement-review' } });
    expect(aggression).toMatchObject({ reviewStatus: 'source-reviewed-editorial-pass', sectionCount: 4, diagramCount: 1, knowledgeCheckCount: 3, referenceCount: 11, checks: { 'expert-review': 'pending-independent-prosocial-aggression-and-relationship-science-review' } });
    expect(culture).toMatchObject({ reviewStatus: 'source-reviewed-editorial-pass', sectionCount: 5, diagramCount: 1, knowledgeCheckCount: 4, referenceCount: 12, checks: { 'expert-review': 'pending-independent-multicultural-cultural-formulation-and-identity-review' } });
    expect(attitudesText).toContain('Routes are not two fixed kinds of people');
    expect(attitudesText).toContain('not a lie detector');
    expect(attitudesText).toContain('Contextual hypothesis requiring assessment—not a diagnosis');
    expect(attitudesText).not.toContain('Produces <strong>lasting</strong> attitude change');
    expect(aggressionText).toContain('danger can attenuate or reverse it');
    expect(aggressionText).toContain('Frustration is one possible input, not a necessary or sufficient cause');
    expect(aggressionText).toContain('Never turn a classroom model into advice to enter an unsafe scene');
    expect(aggressionText).not.toContain('Frustration always leads to aggression');
    expect(cultureText).toContain('group result can guide a respectful question');
    expect(cultureText).toContain('multidimensional attitudinal model');
    expect(cultureText).toContain('assessment measures should not be the sole basis for diagnosis');
    expect(cultureText).not.toContain('Integration = best outcomes; Marginalization = worst');
    for (const id of ['ch-32', 'ch-33', 'ch-34']) expect(reviewOverrides.chapters[id].references.length).toBeGreaterThanOrEqual(11);
  });

  it('keeps Chapters 35-39 lifespan claims bounded, current, and interactive', () => {
    const texts = Object.fromEntries([35, 36, 37, 38, 39].map((number) => [number, readText(`test_prep/eppp_legacy/js/textbook_ch${number}.js`)]));
    const chapters = Object.fromEntries([35, 36, 37, 38, 39].map((number) => [number, catalog.chapters.find((item) => item.id === `ch-${number}`)]));

    expect(chapters[35]).toMatchObject({ reviewStatus: 'source-reviewed-editorial-pass', sectionCount: 5, diagramCount: 1, knowledgeCheckCount: 4, referenceCount: 9, checks: { 'expert-review': 'pending-independent-prenatal-infant-and-developmental-assessment-review' } });
    expect(chapters[36]).toMatchObject({ reviewStatus: 'source-reviewed-editorial-pass', sectionCount: 4, diagramCount: 1, knowledgeCheckCount: 3, referenceCount: 9, checks: { 'expert-review': 'pending-independent-attachment-development-and-family-systems-review' } });
    expect(chapters[37]).toMatchObject({ reviewStatus: 'source-reviewed-editorial-pass', sectionCount: 4, diagramCount: 1, knowledgeCheckCount: 3, referenceCount: 8, checks: { 'expert-review': 'pending-independent-developmental-cognition-and-neurodiversity-review' } });
    expect(chapters[38]).toMatchObject({ reviewStatus: 'source-reviewed-editorial-pass', sectionCount: 5, diagramCount: 3, knowledgeCheckCount: 4, referenceCount: 9, checks: { 'expert-review': 'pending-independent-adolescent-development-identity-and-moral-reasoning-review' } });
    expect(chapters[39]).toMatchObject({ reviewStatus: 'source-reviewed-editorial-pass', sectionCount: 4, diagramCount: 1, knowledgeCheckCount: 3, referenceCount: 10, checks: { 'expert-review': 'pending-independent-aging-neuropsychology-and-bereavement-review' } });
    expect(texts[35]).toContain('Apgar alone does <strong>not</strong> diagnose asphyxia');
    expect(texts[35]).toContain('surveillance tools, not diagnostic or screening instruments');
    expect(texts[36]).toContain('not proof of abuse');
    expect(texts[36]).toContain('no absolute age-2 cutoff');
    expect(texts[37]).toContain('Performance is evidence');
    expect(texts[37]).toContain('the task is not diagnostic or autism-specific');
    expect(texts[38]).toContain('not a two-part brain diagnosis');
    expect(texts[38]).toContain('not a birthday switch');
    expect(texts[39]).toContain('not synonymous with Pick disease');
    expect(texts[39]).toContain('does not support prescribing them as a universal sequence');
    for (const number of [35, 36, 37, 38, 39]) {
      expect(texts[number]).toContain('<strong>A:</strong>');
      expect(texts[number]).toContain('<strong>D:</strong>');
      expect(reviewOverrides.chapters[`ch-${number}`].references).toHaveLength(chapters[number].referenceCount);
    }
  });

  it('keeps native catalog and QA deployment copies synchronized', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library.json')).toEqual(catalog);
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library_qa.json')).toEqual(qa);
  });
});
