'use strict';

const revisions = {
  'eppp-b003-intervention-2': {
    expectedAnswerIndex: 3,
    difficulty: 'intermediate',
    sourceCheck: 'Sue, Arredondo, and McDavis directly organize multicultural counseling competence around counselor self-awareness, understanding client worldviews, and culturally appropriate intervention strategies; the revised item applies that framework without treating demographic membership as an individual formulation.',
    feedbackDesign: ['demographic-protocol-essentialism', 'reactive-common-factors-universalism', 'shifted-cultural-learning-responsibility'],
    prompt: 'A psychologist is preparing to treat a client whose cultural background and explanatory model of distress differ from the psychologist\'s. Which preparation plan most completely applies Sue, Arredondo, and McDavis\'s multicultural counseling competencies?',
    choices: {
      0: 'Select a culture-specific protocol from demographic information and apply it consistently to avoid differential treatment',
      1: 'Prioritize common therapeutic factors and invite discussion of culture after it becomes a barrier to progress',
      2: 'Ask the client to provide the cultural education needed for treatment before the psychologist seeks consultation',
      3: 'Examine personal assumptions, learn the client\'s worldview and relevant context, and adapt intervention skills collaboratively',
    },
    rationale: 'Multicultural counseling competence integrates awareness of the clinician\'s assumptions and biases, knowledge of the client\'s worldview and context, and skill in using culturally appropriate interventions. Demographic information cannot determine an individual client\'s worldview, and client feedback informs care but does not replace the psychologist\'s responsibility for reflection, consultation, and skill development.',
    references: ['https://doi.org/10.1002/j.1556-6676.1992.tb01642.x'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1002/j.1556-6676.1992.tb01642.x',
        title: 'Multicultural Counseling Competencies and Standards: A Call to the Profession',
        organization: 'Journal of Counseling & Development, Wiley',
        summary: 'Sue, Arredondo, and McDavis develop multicultural counseling competencies across counselor self-awareness, understanding culturally different client worldviews, and culturally appropriate intervention strategies.',
        credibility: 'This valid DOI identifies a foundational peer-reviewed article written by the developers of the framework and directly supports the three competency areas applied in the question; later models expand the framework without displacing its historical role.',
      },
    ],
    qualityFlags: [
      'Replaces three overtly incompetent alternatives with plausible partial approaches involving protocol selection, common factors, and reliance on client education.',
      'Uses an application vignette and preserves individual assessment rather than inferring worldview from demographic membership.',
    ],
    incorrectFeedback: {
      0: 'A culture-specific protocol may be useful when evidence and the individual assessment support it, but demographic membership cannot establish worldview or treatment fit by itself. This plan emphasizes general cultural knowledge while omitting self-examination and collaborative adaptation.',
      1: 'Common therapeutic factors are relevant across orientations, but waiting for culture to become an obstacle treats context as an optional concern. The cited framework calls for proactive attention to clinician assumptions, the client\'s worldview, and culturally responsive practice.',
      2: 'Client feedback is essential for understanding how identity and context shape care, but making the client responsible for the psychologist\'s cultural education shifts a professional obligation. Feedback should be supplemented by reflection, relevant knowledge, consultation, and responsive skills.',
    },
  },
  'eppp-b004-intervention-1': {
    expectedAnswerIndex: 1,
    difficulty: 'intermediate',
    sourceCheck: 'Shedler\'s peer-reviewed synthesis describes attention to affect, avoidance, recurring themes, interpersonal relations, past experience, and the therapy relationship as characteristic emphases of contemporary psychodynamic technique rather than techniques unique to that orientation.',
    feedbackDesign: ['contingency-management-substitution', 'person-centered-nondirectivity', 'cognitive-restructuring-substitution'],
    prompt: 'During early sessions, a client repeatedly arrives late after meetings in which anger toward a supervisor was discussed and then describes similar cycles of conflict and withdrawal in past close relationships. Which therapist response most directly reflects a contemporary psychodynamic focus?',
    choices: {
      0: 'Create a reward schedule for punctuality and defer discussion of the repeated relational pattern',
      1: 'Explore affect, lateness as possible avoidance, recurring relational patterns, and their emergence in therapy',
      2: 'Offer unconditional positive regard while avoiding hypotheses about patterns outside the client\'s immediate awareness',
      3: 'Challenge the automatic belief that supervisors are critical and assign a thought record for the next meeting',
    },
    rationale: 'Contemporary psychodynamic work characteristically explores affect, possible avoidance, recurring interpersonal themes, past experience, and their expression in the therapy relationship. The therapist would investigate rather than assume that the lateness is avoidance, so the formulation remains collaborative and open to alternative explanations.',
    references: ['https://doi.org/10.1037/a0018378'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1037/a0018378',
        title: 'The Efficacy of Psychodynamic Psychotherapy',
        organization: 'American Psychologist, American Psychological Association',
        summary: 'Shedler synthesizes outcome and comparative process research and describes characteristic psychodynamic emphases, including affect, avoidance, recurring patterns, interpersonal experience, and the therapy relationship.',
        credibility: 'This DOI identifies a peer-reviewed review in the APA\'s flagship journal by a psychodynamic psychotherapy scholar; its explicit account of contemporary technique directly supports the model distinction tested by the vignette.',
      },
    ],
    qualityFlags: [
      'Replaces definition-level strawmen with plausible behavioral, person-centered, and cognitive interventions.',
      'Qualifies lateness as possible avoidance so the question tests exploration rather than unsupported interpretation.',
    ],
    incorrectFeedback: {
      0: 'Contingency management may be appropriate when a defined behavior is the selected treatment target, but using it here would bypass the affective and relational material emphasized in the stem. It does not examine what the lateness may mean or how it relates to the repeated pattern.',
      2: 'Unconditional positive regard is central to person-centered therapy and can support an alliance in many orientations. Deliberately avoiding pattern hypotheses, however, leaves the recurring relationships, affect, and possible avoidance in this vignette unexplored.',
      3: 'A thought record is useful in cognitive therapy when identifying and testing automatic thoughts is the selected change mechanism. The stem instead foregrounds repetition across relationships, affect, and behavior in the therapeutic context, so cognitive restructuring is not the closest model-specific focus.',
    },
  },
  'eppp-b003-professional-1': {
    expectedAnswerIndex: 1,
    difficulty: 'intermediate',
    sourceCheck: 'The APA Ethics Office still identifies the 2002 Ethics Code with its 2010 and 2017 amendments as the published code in 2026, and Standard 2.06(b) calls for appropriate measures plus a determination about whether affected duties should be limited, suspended, or terminated.',
    feedbackDesign: ['complaint-threshold-misconception', 'premature-caseload-transfer', 'consent-as-competence-remedy'],
    prompt: 'After several recent medical episodes, a psychologist notices missed details in sessions and believes the condition may be interfering with adequate performance. No client has complained. What is the best initial course under the currently operative APA Ethics Code Standard 2.06(b)?',
    choices: {
      0: 'Continue the full caseload while monitoring privately until a documented error establishes impairment',
      1: 'Use appropriate assistance or consultation, then decide whether to limit, suspend, or terminate affected duties',
      2: 'Arrange an immediate caseload transfer before consulting about how the condition affects professional functioning',
      3: 'Disclose the diagnosis to current clients and continue unchanged when they consent',
    },
    rationale: 'Standard 2.06(b) calls for appropriate measures, such as professional consultation or assistance, followed by a reasoned determination about whether work-related duties should be limited, suspended, or terminated. A complaint is not required, but the response should be proportionate to the actual interference and coordinated with obligations such as continuity of care. The APA Ethics Code does not replace applicable licensing law.',
    references: [
      'https://www.apa.org/ethics/code',
      'https://www.apa.org/ethics/',
    ],
    sourceDetails: [
      {
        url: 'https://www.apa.org/ethics/code',
        title: 'Ethical Principles of Psychologists and Code of Conduct',
        organization: 'American Psychological Association',
        summary: 'The published APA Ethics Code contains Standard 2.06, which addresses personal problems that may interfere with adequate work and the measures psychologists consider in response.',
        credibility: 'The American Psychological Association is the issuing body for this professional code, making its official code page the primary source for APA-governed ethical standards; the code is not a substitute for jurisdiction-specific statutes or licensing rules.',
      },
      {
        url: 'https://www.apa.org/ethics/',
        title: 'American Psychological Association Ethics Office',
        organization: 'American Psychological Association',
        summary: 'The APA Ethics Office page provides the code\'s adoption and amendment history and identifies the code currently published by the association while revision work continues.',
        credibility: 'This is the association\'s official ethics office and the authoritative organizational source for confirming current code status, amendment history, ethics resources, and the ongoing code-revision process as of 2026.',
      },
    ],
    qualityFlags: [
      'Corrects the prior implication that limiting, suspending, or terminating duties necessarily follows awareness of any potentially interfering health problem.',
      'Distinguishes APA ethics from jurisdiction-specific law and preserves continuity-of-care analysis.',
    ],
    incorrectFeedback: {
      0: 'The absence of a complaint does not remove responsibility once a personal problem may be interfering with adequate performance. Monitoring can accompany a response when risk is uncertain, but waiting for a confirmed error omits the consultation or assistance and duty review contemplated by Standard 2.06(b).',
      2: 'A rapid transfer may become necessary when safe and competent care cannot continue, but Standard 2.06(b) calls for a proportionate determination among possible duty changes. Moving the caseload before assessing functional impact can also disregard clinical urgency, continuity, and abandonment concerns.',
      3: 'Relevant disclosure and informed consent may be needed during some changes in care, but client agreement cannot make impaired practice competent or satisfy the psychologist\'s independent professional duty. Disclosing a personal diagnosis may also reveal more information than the transition requires.',
    },
  },
  'eppp-b003-professional-2': {
    expectedAnswerIndex: 3,
    difficulty: 'intermediate',
    sourceCheck: 'The official APA policy page states that the revised Guidelines for the Practice of Telepsychology were approved by the Council of Representatives in August 2024 and addresses competence, informed consent, data security, emergencies, and interjurisdictional practice.',
    feedbackDesign: ['encryption-as-sufficient-plan', 'provider-location-jurisdiction-shortcut', 'vendor-responsibility-transfer'],
    prompt: 'A psychologist intends to provide ongoing video therapy to a client who will regularly connect from another state. Which response best reflects APA\'s telepsychology guidelines approved in 2024?',
    choices: {
      0: 'Confirm that the platform encrypts sessions, then use existing in-person consent and licensure procedures without modification',
      1: 'Obtain telepsychology consent and review licensure requirements in the psychologist\'s state, treating the client\'s travel as incidental',
      2: 'Ask the platform vendor to manage privacy and emergencies because a business-associate agreement transfers those professional responsibilities',
      3: 'Confirm competence and suitability, tailored consent, data security, emergency plans, and legal authorization in relevant jurisdictions',
    },
    rationale: 'The 2024 APA guidelines emphasize integrated planning for competence and appropriateness, informed consent, privacy and data security, emergencies, and interjurisdictional practice. Secure technology or a vendor agreement addresses part of that planning but does not displace the psychologist\'s responsibilities. The guidelines are aspirational professional guidance; applicable laws, regulations, and licensing rules remain controlling.',
    references: ['https://www.apa.org/about/policy/telepsychology-revisions'],
    sourceDetails: [
      {
        url: 'https://www.apa.org/about/policy/telepsychology-revisions',
        title: 'APA Guidelines for the Practice of Telepsychology',
        organization: 'American Psychological Association',
        summary: 'The revised guidelines address psychologist competence, service suitability, informed consent, privacy and data security, emergencies, interjurisdictional practice, assessment, supervision, and emerging technologies.',
        credibility: 'This official APA policy page identifies the guidelines as approved by the APA Council of Representatives in August 2024 and links the complete guidance; it is authoritative professional guidance but does not supersede governing law or licensure rules.',
      },
    ],
    qualityFlags: [
      'Replaces the superseded PDF path with the stable official APA policy landing page for the Council-approved 2024 guidelines.',
      'Separates aspirational APA guidance from binding jurisdictional practice requirements.',
      'Uses three plausible partial plans instead of obviously unsafe remote-practice alternatives.',
    ],
    incorrectFeedback: {
      0: 'Encryption is an important data-security safeguard, but a secure platform does not make ordinary consent or licensure review sufficient. Remote services create modality-specific limitations and risks and may trigger requirements where the client and psychologist are physically located.',
      1: 'The psychologist\'s location matters, but reviewing that jurisdiction while treating client travel as incidental leaves a central interjurisdictional issue unresolved. Practice authority must account for the client\'s physical location and the particular cross-border arrangement.',
      2: 'A vendor agreement can support privacy compliance and clarify contractual responsibilities, but it does not transfer the psychologist\'s duties for platform evaluation, informed consent, emergency preparation, documentation, or competent service delivery.',
    },
  },
  'eppp-b007-social-1': {
    expectedAnswerIndex: 0,
    difficulty: 'intermediate',
    sourceCheck: 'The Mezulis, Abramson, Hyde, and Hankin meta-analysis directly supports the tendency to make more internal, stable, and global attributions for positive than negative events and documents substantial developmental and cultural variation in the bias.',
    feedbackDesign: ['external-locus-overgeneralization', 'actor-observer-asymmetry', 'availability-frequency-judgment'],
    prompt: 'A supervisor attributes her team\'s successful launch to her leadership but explains a failed launch as the result of an unpredictable client. Which interpretation best fits this attribution pattern?',
    choices: {
      0: 'It is self-serving because causal credit shifts toward the self after success and away from the self after failure',
      1: 'It reflects an external locus of control because the failed outcome is attributed to a force outside the supervisor',
      2: 'It reflects actor-observer asymmetry because the supervisor explains personal behavior by referring to the situation',
      3: 'It reflects the availability heuristic because the recent client problem is easy for the supervisor to recall',
    },
    rationale: 'The attribution changes with outcome valence: the favorable outcome receives an internal explanation, whereas the unfavorable outcome receives a situational explanation. This differs from a consistently external control orientation, an actor-observer comparison, or a recall-based probability judgment. The tendency varies across people and cultures, and one example does not establish the supervisor\'s motive.',
    references: ['https://doi.org/10.1037/0033-2909.130.5.711'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1037/0033-2909.130.5.711',
        title: 'Is There a Universal Positivity Bias in Attributions? A Meta-Analytic Review of Individual, Developmental, and Cultural Differences in the Self-Serving Attributional Bias',
        organization: 'Psychological Bulletin, American Psychological Association',
        summary: 'Mezulis and colleagues synthesize 266 studies and examine the magnitude, distribution, developmental variation, and cultural variation of self-serving attributional patterns.',
        credibility: 'This valid DOI identifies a peer-reviewed meta-analysis in a leading APA review journal and directly supports both the positive-versus-negative attribution pattern and the rationale\'s qualification that its strength varies across populations.',
      },
    ],
    qualityFlags: [
      'Replaces the Miller and Ross historical critique as the sole citation with a meta-analysis that directly supports the full attribution pattern.',
      'Uses one event pair to distinguish outcome-valence attribution from locus of control, actor-observer asymmetry, and availability.',
    ],
    incorrectFeedback: {
      1: 'An external locus of control is a broader tendency to view outcomes as governed by forces outside the person. Here the supervisor claims personal causation for the favorable result, so the explanations vary with outcome valence rather than remaining consistently external.',
      2: 'Actor-observer asymmetry contrasts situational explanations for one\'s own behavior with dispositional explanations for another person\'s behavior. This vignette compares how the same supervisor explains a success and a failure, so outcome valence is the critical change.',
      3: 'The availability heuristic affects frequency or probability judgments when easily recalled examples feel more common or likely. The supervisor is not estimating how often an event occurs; the issue is where responsibility is placed following favorable versus unfavorable outcomes.',
    },
  },
  'eppp-b007-social-2': {
    expectedAnswerIndex: 2,
    difficulty: 'intermediate',
    sourceCheck: 'Pettigrew and Tropp synthesized 713 independent samples from 515 studies and found that intergroup contact typically relates to lower prejudice, while equal status, cooperation, common goals, and institutional support strengthen effects without serving as necessary conditions.',
    feedbackDesign: ['unfavorable-contact-overgeneralization', 'self-selection-as-complete-explanation', 'allport-conditions-as-prerequisites'],
    prompt: 'A university is designing an intergroup-contact program to reduce prejudice. Which prediction is most consistent with Pettigrew and Tropp\'s meta-analysis?',
    choices: {
      0: 'Because threatening encounters can backfire, the evidence does not support an average prejudice-reduction association across settings',
      1: 'The average association largely reflects lower-prejudice participants seeking contact, with rigorous designs showing a weaker pattern',
      2: 'Contact generally predicts better intergroup attitudes; structured conditions strengthen the effect but are not prerequisites',
      3: 'Benefits are expected mainly when equal status, cooperation, common goals, and institutional support coincide',
    },
    rationale: 'The meta-analysis of 713 independent samples from 515 studies found that intergroup contact typically relates to lower prejudice and that the pattern was stronger in more rigorous research. Equal status, cooperation, common goals, and institutional support facilitate positive effects but are not necessary in each instance. The result is probabilistic rather than a guarantee for a particular encounter or program.',
    references: ['https://doi.org/10.1037/0022-3514.90.5.751'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1037/0022-3514.90.5.751',
        title: 'A Meta-Analytic Test of Intergroup Contact Theory',
        organization: 'Journal of Personality and Social Psychology, American Psychological Association',
        summary: 'Pettigrew and Tropp synthesize 515 studies with 713 independent samples to test the average contact-prejudice association, methodological alternatives, and the role of structured contact conditions.',
        credibility: 'This valid DOI identifies a large peer-reviewed meta-analysis in a leading social-psychology journal and directly supports the average association, the research-rigor finding, and the distinction between facilitative and necessary conditions.',
      },
    ],
    qualityFlags: [
      'Replaces conspicuous absolute claims with plausible boundary-condition, self-selection, and prerequisite misconceptions.',
      'Frames the finding probabilistically so the item does not imply that a particular contact experience must reduce prejudice.',
    ],
    incorrectFeedback: {
      0: 'Negative or threatening encounters can increase tension, so contact quality matters when designing a program. The meta-analysis nevertheless found an overall inverse relationship between contact and prejudice across a large literature, making the conclusion of no average benefit too strong.',
      1: 'Self-selection is a legitimate concern in observational contact studies and should temper causal interpretation. Pettigrew and Tropp examined methodological rigor and found that the overall pattern persisted and was stronger in experimental and other rigorous designs.',
      3: 'Allport\'s four conditions are useful design features, and their combination can strengthen outcomes. The meta-analysis did not find that the complete set must be present in a contact situation, so treating the four-part structure as a prerequisite overstates the evidence.',
    },
  },
};

module.exports = { revisions };
