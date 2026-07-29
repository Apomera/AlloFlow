'use strict';

const apaEthicsCode = {
  url: 'https://www.apa.org/ethics/code',
  title: 'Ethical Principles of Psychologists and Code of Conduct',
  organization: 'American Psychological Association',
  summary: 'APA Ethics Code Standard 9.08 bars psychologists from basing assessment or intervention decisions or recommendations on results that are outdated for the current purpose or on measures that are obsolete and not useful for that purpose.',
  credibility: 'The American Psychological Association publishes and maintains the official ethics code for psychologists. This primary professional source directly controls the two current-purpose restrictions applied in the item, while law and licensing rules remain separate authorities.',
};

const duplicateClusterIds = ['eppp-b004-professional-1'];

module.exports = {
  reviewedAt: '2026-07-28',
  reviewWave: 'eppp-native-quality-wave-22',
  selectionContract: {
    lexicalIds: [],
    duplicateClusterIds,
    expectedKeyDistribution: [0, 1, 0, 0],
    expectedDomainsCovered: 1,
    warningCeilings: {
      forbiddenAggregateChoices: 0,
      uniqueKeyStemLexicalLeakageCandidates: 55,
      asymmetricExtremeDistractorCandidates: 120,
      advancedDirectRecallCandidates: 7,
      semanticConceptDuplicatePairs: 82,
      semanticConceptDuplicateClusters: 46,
    },
  },
  warningCountsBefore: {
    totalItems: 1500,
    warningOnly: true,
    forbiddenAggregateChoices: 0,
    uniqueKeyStemLexicalLeakageCandidates: 55,
    asymmetricExtremeDistractorCandidates: 120,
    advancedDirectRecallCandidates: 7,
    semanticConceptDuplicatePairs: 83,
    semanticConceptDuplicateClusters: 47,
    editorialAnchorsWithActiveWarnings: 2,
    editorialAnchorsWithNoCurrentWarning: 8,
    priorityDocketItems: 20,
  },
  warningCountContext: {
    before: 'Current post-wave-21 and post-campaign diagnostic snapshot containing the final deep-campaign selected-warning pair.',
    after: 'Wave 22 is authored and tested through an isolated replay; canonical and deployed banks, catalogs, diagnostics, and audits are intentionally not rebuilt in this change.',
    interpretation: 'The single-item tranche separates an ethics competence item from its duplicate partner by testing a current-purpose decision under APA Ethics Code Standard 9.08, with the protected B key retained.',
  },
  revisions: [
    {
      id: 'eppp-b004-professional-1',
      expectedAnswerIndex: 1,
      expectedPrompt: 'Under APA Ethics Code Standard 2.01, the boundaries of a psychologist’s competence are based primarily on the psychologist’s:',
      prompt: 'An insurer asks a psychologist in 2026 to decide whether an adult presently meets disability criteria. The file contains a well-administered cognitive evaluation from 2014, but the person sustained a neurological injury several years later. The insurer requests a recommendation from the old scores. What is the best response under APA Ethics Code Standard 9.08?',
      choices: [
        'Use the scores because proper administration when collected makes them adequate for a later disability decision',
        'Decline to base the decision on the historical scores and seek information suited to the referral purpose',
        'Reject the scores whenever a newer test edition exists, treating edition status as the controlling consideration',
        'Issue the recommendation from the scores if the insurer and client acknowledge their age in a signed statement',
      ],
      rationale: 'Standard 9.08(a) directs psychologists not to base assessment or intervention decisions or recommendations on data or test results that are outdated for the current purpose. The intervening neurological injury makes the historical scores inadequate for this new disability decision, so the psychologist should obtain information suited to the referral rather than rely on those scores.',
      choiceRationales: [
        'Sound administration establishes the quality of the evaluation at the time it was conducted, but it does not make the resulting scores suitable for a different decision years later. Standard 9.08 asks whether results remain appropriate for the current purpose.',
        'Standard 9.08(a) directs psychologists not to base assessment or intervention decisions or recommendations on data or test results that are outdated for the current purpose. The intervening neurological injury makes the historical scores inadequate for this new disability decision, so the psychologist should obtain information suited to the referral rather than rely on those scores.',
        'Standard 9.08 distinguishes results that are outdated for a purpose from measures that are obsolete and not useful for that purpose. The appearance of a newer edition is relevant evidence, but edition status by itself is not the complete current-purpose analysis presented here.',
        'Disclosure can communicate limitations, but agreement by the client or insurer does not make outdated results an adequate basis for a professional recommendation. The psychologist retains responsibility for using information appropriate to the decision.',
      ],
      references: [apaEthicsCode.url],
      sourceDetails: [{ ...apaEthicsCode }],
      sourceCheck: 'The official APA Ethics Code states the two Standard 9.08 restrictions: decisions and recommendations may not rest on results outdated for the current purpose or on measures that are obsolete and not useful for that purpose. The revision applies the first restriction without turning test age into an automatic expiration rule.',
      learningObjectiveId: 'professional-apply-standard-9-08-to-outdated-results-for-a-new-purpose',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'historical-administration-as-permanent-sufficiency',
        'new-edition-as-mechanical-expiration',
        'consent-disclosure-as-cure-for-outdated-results',
      ],
    },
  ],
};
