'use strict';

module.exports = {
  "reviewedAt": "2026-07-25",
  "reviewWave": "eppp-native-quality-wave-11",
  "warningCountsBefore": {
    "totalItems": 1500,
    "warningOnly": true,
    "forbiddenAggregateChoices": 0,
    "uniqueKeyStemLexicalLeakageCandidates": 166,
    "asymmetricExtremeDistractorCandidates": 339,
    "advancedDirectRecallCandidates": 23,
    "semanticConceptDuplicatePairs": 287,
    "semanticConceptDuplicateClusters": 128,
    "editorialAnchorsWithActiveWarnings": 5,
    "editorialAnchorsWithNoCurrentWarning": 5,
    "priorityDocketItems": 20
  },
  "revisions": [
    {
      "id": "eppp-b017-biological-1",
      "expectedActionRank": 1,
      "expectedAnswerIndex": 0,
      "expectedPrompt": "Developmental synaptic pruning refers to:",
      "prompt": "During adolescence, frequently coactivated cortical pathways become more efficient while less-used connections diminish. Which account best explains this developmental pattern?",
      "choices": [
        "Activity-dependent refinement stabilizes coactive synapses and weakens less-stabilized inputs as functional circuits mature",
        "Programmed neuronal apoptosis removes whole nerve cells in similar proportions across competing cortical networks",
        "Increasing myelination creates new junctions between axons and thereby accounts for the reduction in synaptic density",
        "A progressive neuropathological process damages connections, making the observed change evidence of degenerative decline"
      ],
      "rationale": "Developmental pruning is an activity-sensitive refinement process: correlated or effective inputs are preferentially stabilized, while a subset of weaker or less active synapses is weakened and eliminated. This reshapes circuit connectivity and differs from indiscriminate neuronal death, myelination, or a degenerative disease process.",
      "choiceRationales": [
        "Developmental pruning is an activity-sensitive refinement process: correlated or effective inputs are preferentially stabilized, while a subset of weaker or less active synapses is weakened and eliminated. This reshapes circuit connectivity and differs from indiscriminate neuronal death, myelination, or a degenerative disease process.",
        "Apoptosis removes whole cells, whereas the pattern describes selective remodeling among synaptic inputs that can leave the participating neurons intact. Cell-death signaling molecules may contribute to pruning mechanisms, but that does not make proportional neuronal apoptosis the explanatory process.",
        "Myelination improves the speed and reliability of impulse conduction along axons; it does not create synapses to explain a developmental decrease in synaptic density. Circuit refinement instead changes which existing inputs are maintained, strengthened, weakened, or removed.",
        "Aberrant pruning can be relevant to neurodevelopmental disorders, yet pruning also occurs as part of typical maturation. Interpreting a selective, activity-related developmental change as degenerative pathology confuses adaptive circuit remodeling with progressive neural injury."
      ],
      "references": [
        "https://doi.org/10.1038/s41583-021-00507-y"
      ],
      "sourceDetails": [
        {
          "url": "https://doi.org/10.1038/s41583-021-00507-y",
          "title": "Mechanisms Governing Activity-Dependent Synaptic Pruning in the Developing Mammalian CNS",
          "organization": "Nature Reviews Neuroscience",
          "summary": "Faust, Gunner, and Schafer review developmental removal of a subset of synapses while other connections are maintained or strengthened in response to changes in spontaneous and experience-driven neural activity.",
          "credibility": "This peer-reviewed Nature Reviews Neuroscience article synthesizes cellular, circuit, and developmental evidence for activity-dependent pruning. It is an authoritative scholarly review rather than a commercial or test-preparation summary."
        }
      ],
      "sourceCheck": "The reviewed neuroscience literature defines activity-dependent pruning as selective removal of some synapses with maintenance or strengthening of others as neural activity guides developing circuit organization, supporting the keyed mechanism and excluding indiscriminate cell loss.",
      "learningObjectiveId": "biological-activity-dependent-synaptic-refinement",
      "cognitiveProcess": "analysis",
      "distractorDesign": [
        "whole-neuron-apoptosis-substitution",
        "myelination-connectivity-substitution",
        "normal-development-pathology-conflation"
      ]
    },
    {
      "id": "eppp-b020-social-1",
      "expectedActionRank": 2,
      "expectedAnswerIndex": 1,
      "expectedPrompt": "In Berkowitz’s cognitive-neoassociation model, an aversive event can increase aggressive tendencies by:",
      "prompt": "After being shoved in a hot, crowded subway car, a commuter experiences diffuse unpleasant arousal and rapidly notices hostile thoughts and action impulses. In a cognitive-neoassociation account, which process occurs earliest?",
      "choices": [
        "Residual physiological activation is relabeled as anger after the commuter consciously decides that the stranger intended the contact",
        "Negative affect spreads activation through linked memories, bodily reactions, and fight-or-flight tendencies before differentiated appraisal",
        "Blocked access produces an expectation that confrontation will be rewarded because similar behavior previously restored personal control",
        "A deliberate hostile-intent judgment creates the aversive state and then supplies the associative material for an aggressive response"
      ],
      "rationale": "In Berkowitz's reformulated model, aversive stimulation first produces negative affect, which automatically activates associated ideas, memories, expressive-motor reactions, and rudimentary fight-or-flight tendencies. Subsequent attribution and higher-order appraisal can differentiate, intensify, inhibit, or redirect those initial tendencies.",
      "choiceRationales": [
        "This sequence resembles excitation-transfer or misattribution reasoning because it makes a conscious causal label the step that converts residual arousal into anger. Cognitive neoassociation places diffuse negative affect and spreading associative activation earlier, with differentiated attribution occurring later.",
        "In Berkowitz's reformulated model, aversive stimulation first produces negative affect, which automatically activates associated ideas, memories, expressive-motor reactions, and rudimentary fight-or-flight tendencies. Subsequent attribution and higher-order appraisal can differentiate, intensify, inhibit, or redirect those initial tendencies.",
        "Expecting aggression to be rewarded emphasizes reinforcement history and instrumental learning. Such learning can shape behavior, but the model highlighted here explains an early affective-associative pathway from aversive stimulation to anger-related and escape-related tendencies.",
        "Later appraisal can determine whether an event is interpreted as intentional and can strengthen or inhibit an emerging reaction. Reversing the sequence makes deliberate hostile attribution the source of the initial aversive affect rather than a later influence on activated associative networks."
      ],
      "references": [
        "https://pubmed.ncbi.nlm.nih.gov/2667009/"
      ],
      "sourceDetails": [
        {
          "url": "https://pubmed.ncbi.nlm.nih.gov/2667009/",
          "title": "Frustration-Aggression Hypothesis: Examination and Reformulation",
          "organization": "Psychological Bulletin and U.S. National Library of Medicine",
          "summary": "Berkowitz reformulates frustration-aggression theory by describing how aversive events produce negative affect and activate associatively linked thoughts, memories, physiological responses, and rudimentary action tendencies.",
          "credibility": "This is the PubMed record for Berkowitz's peer-reviewed Psychological Bulletin article, a foundational primary theoretical source for the cognitive-neoassociation sequence tested by the scenario."
        }
      ],
      "sourceCheck": "Berkowitz's peer-reviewed reformulation places negative affect and associative activation early in the response to aversive stimulation, while attribution and higher-order cognitive processing subsequently differentiate or regulate the initial tendencies.",
      "learningObjectiveId": "social-cognitive-neoassociation-process-sequence",
      "cognitiveProcess": "analysis",
      "distractorDesign": [
        "excitation-transfer-sequence-substitution",
        "instrumental-learning-substitution",
        "hostile-attribution-sequence-reversal"
      ]
    },
    {
      "id": "eppp-v3-professional-073",
      "expectedActionRank": 3,
      "expectedAnswerIndex": 0,
      "expectedPrompt": "When no appropriate services are available during an emergency, Standard 2.02 permits a psychologist to:",
      "prompt": "A rural generalist encounters a patient with acute suicide risk, and the nearest crisis specialist cannot assume the case until morning. The presentation exceeds the psychologist's usual practice area. What is the most defensible response under the competence provisions?",
      "choices": [
        "Provide limited stabilizing care to prevent denial of services, seek consultation or transfer, and end the expanded role when the crisis resolves or appropriate care becomes available",
        "Arrange transport after the specialist opens and avoid clinical contact tonight because the presentation falls beyond the psychologist's customary practice",
        "Begin a comprehensive specialty protocol and remain the treating clinician because crisis contact establishes sufficient competence for the continuing case",
        "Offer supportive contact through a standing long-term plan while postponing referral until the patient requests a clinician with specialized preparation"
      ],
      "rationale": "The emergency competence provision permits services beyond a psychologist's established competence when suitable care is unavailable and intervention is needed to prevent denial of care. The psychologist should limit work to the emergency need, use consultation and referral when feasible, and discontinue the expanded service when the emergency ends or appropriate services become available.",
      "choiceRationales": [
        "The emergency competence provision permits services beyond a psychologist's established competence when suitable care is unavailable and intervention is needed to prevent denial of care. The psychologist should limit work to the emergency need, use consultation and referral when feasible, and discontinue the expanded service when the emergency ends or appropriate services become available.",
        "The competence limitation matters, but it does not justify withholding feasible stabilizing assistance when delay could deny urgently needed care. A bounded response can address immediate safety while the psychologist arranges consultation, transfer, or access to a suitably qualified provider.",
        "Emergency involvement does not create broad or durable specialty competence. The scope should remain tied to the immediate need, and continuing treatment should transition to an appropriately qualified clinician rather than expanding into a comprehensive specialty course.",
        "The provision is time-limited by the emergency and the availability of appropriate services, not by whether the patient later requests a change. A standing long-term arrangement would extend the exception beyond its purpose and leave the competence concern unresolved."
      ],
      "references": [
        "https://www.apa.org/ethics/code#202"
      ],
      "sourceDetails": [
        {
          "url": "https://www.apa.org/ethics/code#202",
          "title": "Ethical Principles of Psychologists and Code of Conduct - Standard 2.02",
          "organization": "American Psychological Association",
          "summary": "APA Ethics Code Standard 2.02 addresses emergency services when psychologists lack established competence and suitable mental health services are unavailable, permitting bounded care needed to prevent denial of services.",
          "credibility": "The American Psychological Association publishes the operative professional Ethics Code. This section-specific official link is the primary source for the emergency competence exception, subject to applicable law and licensing requirements."
        }
      ],
      "sourceCheck": "The official APA standard permits emergency services beyond established competence when appropriate alternatives are unavailable so that care is not denied, and it limits that service to the duration of the emergency or until suitable care becomes available.",
      "learningObjectiveId": "professional-emergency-competence-bounded-care",
      "cognitiveProcess": "application",
      "distractorDesign": [
        "competence-based-abandonment-error",
        "emergency-contact-competence-overreach",
        "patient-request-termination-delay"
      ]
    },
    {
      "id": "eppp-v2-assessment-064",
      "expectedActionRank": 4,
      "expectedAnswerIndex": 0,
      "expectedPrompt": "Complete the statement: The Beck Depression Inventory-II (BDI-II) is a:",
      "prompt": "A client completes a 21-item questionnaire about depressive symptoms experienced during the prior two weeks. The clinician wants to track change and determine whether a depressive disorder is present. Which use of the result is most defensible?",
      "choices": [
        "Treat the total as a self-reported severity indicator for screening and monitoring, then use a broader diagnostic evaluation to establish a diagnosis",
        "Use the severity category as confirmation of major depressive disorder because symptom burden and diagnostic status are interchangeable at elevated scores",
        "Interpret the total as an observer-rated measure of functional capacity and infer occupational fitness apart from interview and collateral information",
        "Read the item pattern as a broad personality profile and compare stable trait elevations across domains before selecting a treatment approach"
      ],
      "rationale": "The BDI-II is a brief 21-item self-report inventory of depression symptom severity using a two-week timeframe. Its score can support screening and repeated measurement of symptom burden, but a self-report severity score does not independently establish a DSM diagnosis or answer a separate functional-capacity question.",
      "choiceRationales": [
        "The BDI-II is a brief 21-item self-report inventory of depression symptom severity using a two-week timeframe. Its score can support screening and repeated measurement of symptom burden, but a self-report severity score does not independently establish a DSM diagnosis or answer a separate functional-capacity question.",
        "A severity category summarizes endorsed symptom burden; it is not interchangeable with a diagnosis based on the full pattern, duration, impairment, exclusions, and clinical context. Elevated scores warrant appropriate evaluation rather than conversion into a stand-alone diagnostic conclusion.",
        "The respondent reports symptom experience directly, so the result is not an observer rating. Depression severity may relate to functioning, but occupational capacity requires evidence matched to that referral question rather than inference from a symptom total in isolation.",
        "The inventory targets current depressive symptom severity rather than a broad, stable trait configuration across personality domains. Treating its item pattern as a comprehensive personality profile changes both the construct and the intended interpretive purpose."
      ],
      "references": [
        "https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Beck-Depression-Inventory-II/p/100000159"
      ],
      "sourceDetails": [
        {
          "url": "https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Beck-Depression-Inventory-II/p/100000159",
          "title": "BDI-2 Beck Depression Inventory - Pearson Assessments",
          "organization": "Pearson Assessments",
          "summary": "Pearson describes the BDI-II as a brief self-report inventory with 21 symptom items, a two-week assessment timeframe, and uses that include assessing self-reported depression severity and supporting identification and monitoring.",
          "credibility": "Pearson is the instrument publisher and provides primary documentation for the BDI-II format, timeframe, administration, and intended uses. Publisher documentation does not by itself establish independent comparative validity or diagnostic sufficiency."
        }
      ],
      "sourceCheck": "Pearson's official instrument page identifies a 21-item brief self-report inventory measuring depression symptom severity over two weeks, supporting screening and monitoring use while not converting a questionnaire total into an independently sufficient diagnosis.",
      "learningObjectiveId": "assessment-bdi-severity-versus-diagnosis",
      "cognitiveProcess": "application",
      "distractorDesign": [
        "severity-diagnosis-conflation",
        "self-report-functional-capacity-overreach",
        "symptom-inventory-personality-substitution"
      ]
    },
    {
      "id": "eppp-v2-cognitive-affective-015",
      "expectedActionRank": 5,
      "expectedAnswerIndex": 0,
      "expectedPrompt": "Complete the statement: According to the dual-process theory, System 1 thinking is:",
      "prompt": "A physician first judges a rare diagnosis likely because a vivid recent case comes easily to mind. After reviewing base rates and working through the probabilities, the physician revises the judgment. Which account best distinguishes the two responses?",
      "choices": [
        "An autonomous default arose from salient associations, whereas a working-memory-demanding analytic process intervened during deliberate calculation",
        "The first judgment used rule-based hypothetical reasoning, whereas the revised judgment resulted from increased associative fluency",
        "Both judgments reflect one processing mode, with the added time serving to retrieve a larger store of factual medical knowledge",
        "The revised judgment shows that intuitive processing becomes more reliable as task complexity and concurrent cognitive load increase"
      ],
      "rationale": "Dual-process accounts distinguish rapid autonomous Type 1 processes that supply default responses from Type 2 processing that supports hypothetical reasoning and places substantial demands on working memory. The vivid case can cue an associative default, while deliberate use of base rates and probability calculations recruits the latter form of processing.",
      "choiceRationales": [
        "Dual-process accounts distinguish rapid autonomous Type 1 processes that supply default responses from Type 2 processing that supports hypothetical reasoning and places substantial demands on working memory. The vivid case can cue an associative default, while deliberate use of base rates and probability calculations recruits the latter form of processing.",
        "This reverses the characteristic allocation of processes. Rule-based hypothetical reasoning and explicit probability work are associated with higher-order Type 2 processing, while the readily available vivid example is more consistent with an associative default response.",
        "Additional time can permit memory retrieval, but the scenario specifically contrasts a salient associative default with effortful probability analysis. A one-mode account does not capture the distinction between autonomous processing and reasoning that depends heavily on working memory.",
        "Greater complexity and concurrent load tend to constrain resource-demanding analytic intervention rather than improve intuition by definition. Expertise can support useful intuitions in some environments, but that is different from claiming that added load makes the revised calculation intuitive."
      ],
      "references": [
        "https://doi.org/10.1177/1745691612460685"
      ],
      "sourceDetails": [
        {
          "url": "https://doi.org/10.1177/1745691612460685",
          "title": "Dual-Process Theories of Higher Cognition: Advancing the Debate",
          "organization": "Association for Psychological Science",
          "summary": "Evans and Stanovich distinguish rapid autonomous Type 1 processes that yield default responses from Type 2 processes that enable hypothetical reasoning and depend heavily on working-memory resources.",
          "credibility": "This peer-reviewed Perspectives on Psychological Science article directly develops and qualifies the dual-process framework. It is a primary theoretical review by leading researchers rather than an introductory secondary summary."
        }
      ],
      "sourceCheck": "Evans and Stanovich characterize Type 1 processing as rapid and autonomous and Type 2 processing as capable of intervening on defaults, supporting hypothetical thought, and loading heavily on working memory, which maps directly onto the scenario's two judgments.",
      "learningObjectiveId": "cognitive-dual-process-default-and-intervention",
      "cognitiveProcess": "analysis",
      "distractorDesign": [
        "type-one-type-two-sequence-reversal",
        "single-process-retrieval-explanation",
        "cognitive-load-intuition-enhancement-error"
      ]
    },
    {
      "id": "eppp-b004-professional-2",
      "expectedActionRank": 6,
      "expectedAnswerIndex": 3,
      "expectedPrompt": "Which statement best reflects APA Ethics Code Standard 3.05 on multiple relationships?",
      "prompt": "Before accepting a therapy referral, a psychologist learns that the prospective client is treasurer of a nonprofit whose board includes the psychologist's spouse. A financial dispute involving the board is foreseeable. What should guide the acceptance decision?",
      "choices": [
        "Whether the client signs a disclosure acknowledging the connection, because documented consent resolves the professional-risk analysis",
        "Whether the connection is sexual in nature, because financial and community ties fall beyond the relevant boundary concerns",
        "Whether the nonprofit and the spouse currently interact, postponing review of foreseeable conflicts until a dispute affects treatment",
        "Whether the dual roles could reasonably impair professional judgment or effectiveness, or expose the client to exploitation or harm"
      ],
      "rationale": "The ethics analysis is prospective and risk based. A multiple relationship should be avoided when it could reasonably be expected to impair objectivity, competence, or effectiveness, or otherwise risk exploitation or harm. The existence of overlapping roles is not dispositive, and disclosure or consent does not replace assessment of foreseeable consequences.",
      "choiceRationales": [
        "Disclosure can support transparency, yet consent does not neutralize a foreseeable risk to objectivity, effectiveness, exploitation, or welfare. The psychologist must evaluate the professional consequences of the connection rather than treating a signed acknowledgment as a safe harbor.",
        "Multiple-relationship concerns extend beyond sexual conduct and can arise through financial, organizational, family, supervisory, or community connections. The relevant question is the reasonably expected effect on professional work and client welfare, not the category of intimacy.",
        "The standard calls for attention to relationships that could reasonably be expected to create impairment, exploitation, or harm, so waiting for a dispute to materialize is too late. Foreseeable conflicts belong in the decision made before accepting the referral.",
        "The ethics analysis is prospective and risk based. A multiple relationship should be avoided when it could reasonably be expected to impair objectivity, competence, or effectiveness, or otherwise risk exploitation or harm. The existence of overlapping roles is not dispositive, and disclosure or consent does not replace assessment of foreseeable consequences."
      ],
      "references": [
        "https://www.apa.org/ethics/code#305"
      ],
      "sourceDetails": [
        {
          "url": "https://www.apa.org/ethics/code#305",
          "title": "Ethical Principles of Psychologists and Code of Conduct - Standard 3.05",
          "organization": "American Psychological Association",
          "summary": "APA Ethics Code Standard 3.05 defines multiple relationships and directs psychologists to avoid those reasonably expected to impair objectivity, competence, or effectiveness or to risk exploitation or harm.",
          "credibility": "The American Psychological Association publishes the operative professional Ethics Code. This section-specific official link is the primary source for evaluating multiple relationships, alongside governing law and licensing requirements."
        }
      ],
      "sourceCheck": "The official APA standard uses a prospective reasonable-expectation test focused on impaired objectivity, competence, effectiveness, exploitation, or harm; it does not make every overlap prohibited or treat consent as dispositive.",
      "learningObjectiveId": "professional-multiple-relationship-prospective-acceptance",
      "cognitiveProcess": "application",
      "distractorDesign": [
        "consent-safe-harbor-error",
        "sexual-relationship-scope-narrowing",
        "actual-conflict-waiting-error"
      ]
    },
    {
      "id": "eppp-v3-professional-055",
      "expectedActionRank": 7,
      "expectedAnswerIndex": 2,
      "expectedPrompt": "Under APA Ethics Code Standard 3.05, multiple relationships are:",
      "prompt": "Midway through therapy, a psychologist discovers that the client's new supervisor is the psychologist's business partner. Abruptly ending care could destabilize the client. Which response best addresses the newly recognized dual connection?",
      "choices": [
        "Continue the existing plan after documenting that the connection was unplanned at intake, since intent determines whether the situation creates an ethical concern",
        "Terminate at the next session because the emergence of a second role makes ongoing care ethically impermissible despite foreseeable clinical disruption",
        "Evaluate effects on judgment and welfare, take feasible steps to reduce impairment or harm, and reassess whether treatment can continue",
        "Obtain a written waiver from the client and defer further risk management unless an observable conflict develops in the business relationship"
      ],
      "rationale": "When a potentially harmful multiple relationship arises unexpectedly, the psychologist should assess its likely effects on objectivity, effectiveness, exploitation, and client welfare, then take reasonable steps to resolve or manage the situation with due regard for the affected person's interests. Neither abrupt termination nor consent alone substitutes for that analysis.",
      "choiceRationales": [
        "Lack of intent can explain how the overlap arose, but it does not determine whether the current arrangement threatens professional judgment, effectiveness, exploitation, or welfare. Once recognized, the psychologist must assess and address foreseeable effects rather than rely on intake history.",
        "Ending treatment may sometimes become appropriate, but reflexive termination can itself create clinical harm and ignores the need to evaluate available risk-reduction steps and continuity of care. The response should be guided by the client's interests and the actual foreseeable risks.",
        "When a potentially harmful multiple relationship arises unexpectedly, the psychologist should assess its likely effects on objectivity, effectiveness, exploitation, and client welfare, then take reasonable steps to resolve or manage the situation with due regard for the affected person's interests. Neither abrupt termination nor consent alone substitutes for that analysis.",
        "A waiver may document discussion but cannot transfer the psychologist's responsibility to assess and manage professional risk. Waiting for an observable conflict overlooks foreseeable impairment or harm that the psychologist can address before the business connection disrupts treatment."
      ],
      "references": [
        "https://www.apa.org/ethics/code#305"
      ],
      "sourceDetails": [
        {
          "url": "https://www.apa.org/ethics/code#305",
          "title": "Ethical Principles of Psychologists and Code of Conduct - Standard 3.05",
          "organization": "American Psychological Association",
          "summary": "APA Ethics Code Standard 3.05 defines multiple relationships and directs psychologists to avoid those reasonably expected to impair objectivity, competence, or effectiveness or to risk exploitation or harm.",
          "credibility": "The American Psychological Association publishes the operative professional Ethics Code. This section-specific official link is the primary source for evaluating multiple relationships, alongside governing law and licensing requirements."
        }
      ],
      "sourceCheck": "The APA code requires risk-focused analysis of multiple relationships and, when an unforeseen potentially harmful overlap arises, reasonable resolution with due regard for the affected person's interests, supporting management rather than intent, waiver, or reflexive termination rules.",
      "learningObjectiveId": "professional-unforeseen-multiple-relationship-management",
      "cognitiveProcess": "analysis",
      "distractorDesign": [
        "unplanned-overlap-excuse",
        "reflexive-termination-rule",
        "waiver-and-observed-conflict-delay"
      ]
    },
    {
      "id": "eppp-b028-intervention-2",
      "expectedActionRank": 8,
      "expectedAnswerIndex": 3,
      "expectedPrompt": "For obsessive-compulsive disorder, exposure and response prevention asks a client to:",
      "prompt": "A client with contamination obsessions washes for twenty minutes after touching public doorknobs. During collaborative treatment planning, which exercise most directly implements the core behavioral learning procedure?",
      "choices": [
        "Review evidence that public surfaces are safe until anxiety decreases, then touch a handle after the client reports adequate certainty",
        "Touch a handle and complete a shortened wash on a fixed schedule, gradually changing the ritual while preserving its relief function",
        "Shift attention to relaxation imagery whenever the urge rises, using a calm state as the prerequisite for contact with the feared surface",
        "Touch a selected handle, remain with uncertainty and distress, and refrain from washing or covert neutralizing for the agreed interval"
      ],
      "rationale": "Exposure and response prevention pairs planned confrontation with obsessional triggers with prevention of the usual compulsion, avoidance, reassurance, or covert neutralization. The client practices tolerating distress and uncertainty while learning that ritual performance is not required for the feared experience to be manageable.",
      "choiceRationales": [
        "Reviewing evidence can be part of cognitive work, but requiring reassurance and adequate certainty before contact preserves the rule that exposure is safe only after fear has been neutralized. The core exercise instead includes approaching the trigger while dropping ritualized certainty seeking.",
        "Shortening a ritual may be a negotiated intermediate step in some plans, yet completing the wash continues the negative-reinforcement cycle that the central procedure targets. Response prevention requires practice resisting the compulsion during and after the exposure.",
        "Relaxation can be useful in other contexts, but making calmness a prerequisite can turn it into a safety behavior that blocks learning about tolerating anxiety and uncertainty. The aim is not to erase distress before contact but to approach the trigger and refrain from neutralizing.",
        "Exposure and response prevention pairs planned confrontation with obsessional triggers with prevention of the usual compulsion, avoidance, reassurance, or covert neutralization. The client practices tolerating distress and uncertainty while learning that ritual performance is not required for the feared experience to be manageable."
      ],
      "references": [
        "https://www.nimh.nih.gov/news/science-updates/2024/my-life-with-ocd"
      ],
      "sourceDetails": [
        {
          "url": "https://www.nimh.nih.gov/news/science-updates/2024/my-life-with-ocd",
          "title": "My Life With OCD: Exposure and Response Prevention Treatment",
          "organization": "National Institute of Mental Health",
          "summary": "NIMH describes exposure and response prevention as safely contacting situations that trigger obsessions while resisting the associated compulsive response, including tolerating distress and delaying or refraining from rituals.",
          "credibility": "The National Institute of Mental Health is the U.S. federal agency for mental-health research. This official government page provides an accurate procedure-level description of ERP and a concrete example of exposure paired with response prevention."
        }
      ],
      "sourceCheck": "The NIMH description identifies the defining pairing used in the scenario: safe exposure to an obsession-triggering situation while preventing the associated compulsion and tolerating the resulting distress rather than neutralizing it.",
      "learningObjectiveId": "intervention-erp-exposure-with-response-prevention",
      "cognitiveProcess": "application",
      "distractorDesign": [
        "reassurance-before-exposure",
        "ritual-shaping-instead-of-prevention",
        "relaxation-safety-behavior-substitution"
      ]
    }
  ]
};
