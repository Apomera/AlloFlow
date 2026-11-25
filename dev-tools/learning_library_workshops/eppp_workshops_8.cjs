'use strict';

// Applied clinical case workshops for ASPPB EPPP Part 1: 8 original, unscored
// doctoral-level applied clinical-reasoning workshops (1 per official ASPPB
// EPPP Part 1 knowledge domain) aligned to verified catalog guidelines.

const REVIEW_STATUS = 'source-reviewed-editorial-pass';
const REVIEW_NOTE =
  'Independent applied clinical-reasoning practice; EPPP Part 1 is selected-response. Not an official ASPPB prompt, rubric, score, pass prediction, or clinical/legal determination. AlloFlow does not score written responses.';

const eppp_part_1 = {
  workshopLabel: 'Applied clinical case workshops',
  workshopPracticeNote:
    'Independent unscored applied clinical-reasoning workshops built to strengthen cross-domain synthesis across all eight ASPPB EPPP Part 1 knowledge domains. EPPP Part 1 is a selected-response examination; these workshops are original study exercises—not official ASPPB prompts, rubrics, scores, pass predictions, or clinical/legal determinations. AlloFlow does not score written responses.',
  workshops: [
    {
      id: 'eppp-workshop-01',
      taskType: 'Neuropsychological localization & psychopharmacology safety consult',
      title: 'Differentiate Fluent Aphasia and Lithium Toxicity from Bipolar Relapse',
      prompt:
        'Analyze an urgent behavioral-medicine consultation involving acute language disturbance and systemic medication toxicity to localize the neurological syndrome, identify pharmacokinetic drug interactions, and sequence immediate medical-prescriber safeguards.',
      stimulus:
        'Dr. Elena Morales (age 62, retired linguist with bipolar II disorder stable for 3 years on lithium carbonate 900 mg/day and fluoxetine 40 mg/day) is referred for "sudden manic thought disorder" 7 days after starting over-the-counter ibuprofen 800 mg three times daily for knee pain. Her speech flows effortlessly at roughly 145 words per minute with intact prosody, yet it is filled with semantic and phonemic paraphasias; she fails two-step auditory commands and phrase repetition while showing complete unawareness of communication errors. Physical observations and stat labs obtained before referral show a new coarse bilateral hand tremor, mild gait ataxia, nausea, and a morning trough serum lithium level of 1.7 mEq/L (up from 0.85 mEq/L four months ago). The referring clinic asks you to conduct a full neuropsychological battery today and advise her to immediately replace fluoxetine with another antidepressant.',
      estimatedMinutes: 20,
      taskParts: [
        'Differentiate the acute language presentation from primary psychotic thought disorder and nonfluent aphasia by mapping her fluency, comprehension, repetition, and anosognosia to the primary neuroanatomical region.',
        'Analyze the pharmacokinetic mechanisms behind both her 1.7 mEq/L lithium elevation after ibuprofen initiation and the clinical precautions governing any future change to fluoxetine.',
        'Sequence your immediate triage, interprofessional medical referral, scope-of-practice boundaries, and timing of deferred neuropsychological assessment.',
      ],
      planningFrame: [
        {
          label: 'Clinical & Empirical Evidence',
          guidance:
            'Anchor on effortless fluent paraphasic speech (~145 wpm), impaired auditory comprehension and repetition, anosognosia, coarse tremor, ataxia, nausea, 800 mg TID ibuprofen use, and serum lithium rising from 0.85 to 1.7 mEq/L.',
        },
        {
          label: 'Theoretical & Standards Framework',
          guidance:
            'Integrate left perisylvian language-network localization (Wernicke area / posterior superior temporal gyrus), NSAID-mediated renal clearance reduction of lithium, fluoxetine/norfluoxetine half-life and CYP2D6 inhibition, and non-prescribing psychologist scope limits.',
        },
        {
          label: 'Action & Formulation Plan',
          guidance:
            'Trigger immediate emergency medical/neurological evaluation for suspected acute left-hemisphere stroke and lithium toxicity, communicate objective findings to the prescriber, and postpone comprehensive neuropsychological testing.',
        },
        {
          label: 'Limits, Ethics & Follow-Up',
          guidance:
            'Avoid prescribing or directing unilateral medication changes, document urgent safety communication and handoff, and plan post-stabilization aphasia-adapted cognitive evaluation once medical clearance is confirmed.',
        },
      ],
      successCriteria: [
        'Accurately identifies Wernicke (fluent) aphasia with anosognosia localizing to the dominant left posterior superior temporal gyrus rather than manic flight of ideas or Broca nonfluent aphasia.',
        'Explains that high-dose ibuprofen reduces renal lithium clearance (precipitating toxic 1.7 mEq/L serum levels with coarse tremor, ataxia, and nausea) and notes fluoxetine/norfluoxetine long half-life and CYP2D6 interaction risks.',
        'Prioritizes immediate emergency medical/neurological evaluation over psychological testing because acute stroke and lithium toxicity are medical emergencies.',
        'Maintains strict scope-of-practice boundaries by coordinating directly with the prescribing physician rather than independently altering psychotropic regimens.',
      ],
      commonPitfalls: [
        'Misinterpreting fluent paraphasic speech and anosognosia as bipolar mania, loose associations, or malingered confusion because of her psychiatric history.',
        'Confusing Wernicke aphasia with Broca aphasia (which presents with effortful, telegraphic, nonfluent speech and relatively preserved comprehension).',
        'Administering a lengthy verbally loaded neuropsychological battery during acute medical instability and toxic encephalopathy.',
        'Advising the patient directly to abruptly switch off fluoxetine without medical oversight or washout planning for its long-acting metabolite norfluoxetine.',
      ],
      sampleOutline: [
        'Neurobehavioral localization: Fluent prosodic speech (~145 wpm) with paraphasias, impaired auditory comprehension and repetition, and anosognosia strongly indicate left posterior superior temporal gyrus (Wernicke) dysfunction requiring urgent stroke workup rather than psychiatric relapse.',
        'Psychopharmacology safety audit: Serum lithium of 1.7 mEq/L with coarse tremor, ataxia, and nausea reflects acute lithium toxicity likely precipitated by NSAID (ibuprofen) renal clearance inhibition; any subsequent fluoxetine adjustment must account for norfluoxetine prolonged elimination half-life and CYP2D6 inhibition.',
        'Immediate medical triage: Halt routine outpatient testing, facilitate urgent emergency medical and neurology evaluation, and alert the prescribing physician with documented objective behavioral and lab findings.',
        'Scope & post-acute follow-up: Stay within psychological scope of practice regarding medication orders, and schedule aphasia-appropriate neuropsychological rehabilitation assessment only after neurological and lithium stabilization.',
      ],
      references: [
        'https://www.nidcd.nih.gov/health/aphasia',
        'https://www.ncbi.nlm.nih.gov/books/NBK441951/',
        'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=803eab29-0d0a-4df0-b504-bcd85ec01ead&type=display',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'eppp-workshop-02',
      taskType: 'Operant contingency, interference & cognitive bias analysis',
      title: 'Disentangle Avoidance Maintenance, Proactive Interference, and Diagnostic Anchoring',
      prompt:
        'Evaluate a working adult presenting with escalating occupational avoidance and perceived "memory collapse" to separate operant maintenance cycles, memory-interference and arousal mechanisms, and clinical judgment biases.',
      stimulus:
        'Marcus (age 34, software project lead) seeks consultation for a 5-month history of panic-linked work avoidance and fear that he has "early executive dementia." Whenever critical client emails arrive, his subjective distress spikes to 85/100; immediately delegating or postponing the call drops distress to 25/100 within 10 minutes, and he now avoids 70% of client reviews. Two weeks after his company migrated from Platform A to Platform B, he repeatedly enters old Platform A keyboard shortcuts during new workflows and failed a timed certification exam after cramming on 4 hours of sleep—even though passive rereading left him predicting a 90% score (actual score: 58%). An outside clinician who saw him once while sleep-deprived concluded he has progressive neurocognitive decline without testing competing hypotheses.',
      estimatedMinutes: 15,
      taskParts: [
        'Diagram the classical and operant learning contingencies maintaining Marcus\'s client-call avoidance, distinguishing negative reinforcement from punishment.',
        'Explain his Platform B shortcut errors, exam failure under high sleep-deprived arousal, and 90%-vs.-58% prediction gap using memory interference, arousal-performance, and metacognitive principles.',
        'Critique the prior clinician\'s diagnostic reasoning biases and outline a behavioral and cognitive-learning intervention plan that replaces avoidance and passive study with testable strategies.',
      ],
      planningFrame: [
        {
          label: 'Clinical & Empirical Evidence',
          guidance:
            'Connect the 85-to-25/100 distress drop after delegation, old-to-new Platform A shortcut intrusions, 4-hour sleep-deprived exam breakdown, 90% vs. 58% calibration gap, and single-session dementia label.',
        },
        {
          label: 'Theoretical & Standards Framework',
          guidance:
            'Apply Mowrer two-factor theory (negative reinforcement of avoidance), proactive interference, Yerkes-Dodson inverted-U arousal effects on complex working memory, fluency-illusion metacognition, and anchoring/confirmation bias.',
        },
        {
          label: 'Action & Formulation Plan',
          guidance:
            'Design graduated exposure with response prevention for client calls, sleep and arousal stabilization, retrieval-practice/spaced learning to overcome proactive interference, and objective baseline tracking.',
        },
        {
          label: 'Limits, Ethics & Follow-Up',
          guidance:
            'Rule out medical or primary neurocognitive contributors systematically if deficits persist after sleep and anxiety normalize, and monitor functional work metrics rather than relying on subjective fear of decline.',
        },
      ],
      successCriteria: [
        'Accurately identifies immediate distress reduction (85 to 25/100) after postponing calls as negative reinforcement maintaining avoidance rather than negative punishment.',
        'Correctly classifies old Platform A shortcuts disrupting new Platform B execution as proactive interference (not retroactive interference) and links high sleep-deprived arousal to impaired complex task performance.',
        'Explains the 90%-predicted vs. 58%-actual exam gap as metacognitive miscalibration driven by passive rereading (fluency illusion) and names anchoring and confirmation bias in the outside clinician\'s premature dementia conclusion.',
        'Proposes cohesive interventions combining graduated in-vivo exposure/avoidance elimination, spaced retrieval practice with error feedback, and structured hypothesis-testing reassessment.',
      ],
      commonPitfalls: [
        'Mislabeling the avoidance loop as positive reinforcement or negative punishment instead of negative reinforcement (removal of an aversive anxiety state strengthening avoidance).',
        'Confusing proactive interference (old Platform A learning disrupting new Platform B recall) with retroactive interference (new learning disrupting old recall).',
        'Accepting the outside clinician\'s neurodegenerative hypothesis at face value without accounting for acute sleep deprivation, high arousal, and anchoring bias.',
        'Recommending more hours of passive rereading or temporary total work avoidance, which worsens both metacognitive illusion and operant avoidance strength.',
      ],
      sampleOutline: [
        'Learning-theory formulation: Critical emails act as conditioned threat cues triggering acute autonomic distress (85/100); delegating or delaying calls removes that aversive state (25/100), powerfully strengthening avoidance via negative reinforcement.',
        'Memory, arousal & metacognition: Old Platform A routines intruding on Platform B reflect proactive interference; acute sleep debt and high exam arousal shift Marcus past the optimal Yerkes-Dodson zone for complex working memory; passive rereading inflated his fluency-based readiness estimate (90% vs. 58%).',
        'Debiasing diagnostic formulation: Challenge the prior clinician\'s anchoring and confirmation bias by evaluating base rates, acute state confounds, and intact everyday functioning outside high-stress transitions.',
        'Intervention & calibration plan: Pair graduated client-call exposure (blocking avoidance relief) with sleep stabilization, spaced retrieval practice and self-testing on Platform B, and objective symptom/performance re-evaluation.',
      ],
      references: [
        'https://www.ncbi.nlm.nih.gov/sites/books/NBK459285/',
        'https://dictionary.apa.org/proactive-interference',
        'https://pubmed.ncbi.nlm.nih.gov/27809908/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'eppp-workshop-03',
      taskType: 'Culturally responsive formulation & intergroup bias audit',
      title: 'Reframe Minority Stress and Cultural Idioms Beyond Pathologizing Labels',
      prompt:
        'Audit a biased prior intake formulation for a multiply marginalized graduate student using the DSM-5-TR Cultural Formulation Interview, ecological multicultural guidelines, and social-cognitive attribution theory to craft a culturally humble alliance-repair plan.',
      stimulus:
        'Priyantha (age 29, first-generation Sri Lankan-American chemistry PhD candidate who identifies as gay) transfers to your clinic after a previous intake note labeled him "resistant, overly somatic, and paranoid." Over the past 9 months he has experienced persistent chest tightness, middle insomnia, and hypervigilance at work following repeated mocking comments about his accent and exclusion from first authorship on a manuscript he led. At home, he navigates strong filial obligations toward aging parents and conceals his sexual orientation from extended relatives to preserve family cohesion. During today\'s visit he speaks politely yet asks whether therapy will simply tell him he is "too sensitive" or pressure him to cut ties with his family.',
      estimatedMinutes: 15,
      taskParts: [
        'Analyze how correspondence bias (fundamental attribution error), diagnostic overshadowing, and cultural blind spots distorted the prior clinician\'s "resistant, somatic, and paranoid" labels.',
        'Apply the DSM-5-TR Cultural Formulation Interview (CFI) and an intersectional ecological framework to integrate distal/proximal minority stress, culturally patterned idioms of distress, and family values without stereotyping.',
        'Formulate an alliance- and cultural-rupture-repair plan that honors Priyantha\'s autonomy, differentiates adaptive vigilance from clinical paranoia, and targets modifiable stressors.',
      ],
      planningFrame: [
        {
          label: 'Clinical & Empirical Evidence',
          guidance:
            'Weigh documented 9-month workplace discrimination and authorship exclusion, somatic chest tightness and insomnia, family concealment stressors, and his explicit fear of being invalidated or pushed to sever family ties.',
        },
        {
          label: 'Theoretical & Standards Framework',
          guidance:
            'Apply APA Multicultural Guidelines (ecological intersectionality), DSM-5-TR CFI domains (cultural definition of problem, cause/context, coping, clinician-client relationship), minority stress theory, and attribution bias correction.',
        },
        {
          label: 'Action & Formulation Plan',
          guidance:
            'Acknowledge the prior clinical rupture non-defensively, explore Priyantha\'s own explanatory model and values, validate contextually grounded vigilance, and collaborate on stress regulation and workplace/relational advocacy choices.',
        },
        {
          label: 'Limits, Ethics & Follow-Up',
          guidance:
            'Avoid essentializing Sri Lankan or LGBTQ+ identities, coordinate medical rule-out for persistent chest tightness, and monitor alliance safety continuously through collaborative feedback.',
        },
      ],
      successCriteria: [
        'Identifies fundamental attribution error / correspondence bias in attributing context-driven guardedness and distress solely to dispositional "paranoia" and "resistance."',
        'Applies DSM-5-TR CFI domains and intersectional minority stress concepts (distal lab discrimination plus proximal vigilance and identity concealment) to contextualize somatic and emotional symptoms.',
        'Demonstrates cultural humility by addressing the prior therapeutic rupture openly and refusing to impose Eurocentric individuation norms (such as pressuring disclosure or family estrangement).',
        'Balances cultural contextualization with clinical thoroughness, including medical evaluation of chest tightness and collaborative coping/advocacy planning.',
      ],
      commonPitfalls: [
        'Treating guardedness after documented discrimination as persecutory delusion or paranoid personality traits rather than contextually understandable vigilance.',
        'Overcorrecting with cultural stereotypes—assuming every South Asian family is uniformly rejecting or prescribing immediate coming out as the sole marker of psychological health.',
        'Dismissing somatic chest tightness as "merely cultural" without encouraging appropriate primary-care medical evaluation alongside psychological care.',
        'Defending the previous clinician\'s chart note instead of validating Priyantha\'s concerns and repairing trust in the therapeutic relationship.',
      ],
      sampleOutline: [
        'Bias & chart audit: The prior "resistant, somatic, and paranoid" formulation reflects correspondence bias—over-attributing situational responses to accent microaggressions and authorship exclusion to internal pathology while misreading culturally common somatic expressions of distress.',
        'Intersectional CFI synthesis: Use the DSM-5-TR CFI to center Priyantha\'s definition of his distress, exploring how overlapping racialized, immigrant-generation, academic-power, and sexual-minority stressors interact with valued filial commitments.',
        'Alliance & rupture repair: Validate his caution directly, clarify that therapy will neither minimize real discrimination nor dictate family disclosure, and co-define goals aligned with his values.',
        'Integrated care & follow-up: Recommend medical rule-out for chest tightness, build targeted coping for minority-stress arousal and sleep, explore optional institutional ombuds/mentorship supports, and track alliance quality.',
      ],
      references: [
        'https://www.apa.org/about/policy/multicultural-guidelines',
        'https://www.psychiatry.org/getmedia/5cc5329d-3bd4-4c6a-bae1-dfd0d6496f44/APA-DSM5TR-CulturalFormulationInterview.pdf',
        'https://pubmed.ncbi.nlm.nih.gov/39901761/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'eppp-workshop-04',
      taskType: 'Lifespan neurocognitive differential & caregiver transition plan',
      title: 'Distinguish Normal Cognitive Aging from MCI and Support Autonomy-Preserving Care',
      prompt:
        'Differentiate expected lifespan cognitive aging from emerging neurocognitive decline in a high-education older adult, specify essential medical and affective rule-outs, and design a developmentally sensitive caregiver transition plan.',
      stimulus:
        'Arthur (age 76, retired high school history teacher with 16 years of education) is brought by his daughter Claire (age 48) because she fears "rapid-onset Alzheimer\'s." Over 14 months, Arthur has shown slower timed processing and occasional proper-noun tip-of-the-tongue pauses, yet his WAIS-IV Vocabulary (scaled score 14) and Information (13) remain strong. However, he missed two semiannual property-tax payments, became disoriented driving home from a familiar clinic last month, and scored 22/30 on the MoCA—losing 4 of 5 delayed-recall points even with semantic category cues. He manages basic self-care (bathing, dressing, meals) independently, while Claire—juggling teenagers and a full-time job—wants to take away his car keys and bank access this week, triggering angry withdrawal from Arthur.',
      estimatedMinutes: 20,
      taskParts: [
        'Distinguish which elements of Arthur\'s profile reflect normative cognitive aging versus objective warning signs of Mild Cognitive Impairment (MCI) or early Major Neurocognitive Disorder.',
        'Specify the medical, pharmacological, affective, and comprehensive neuropsychological evaluations needed before assigning a neurodegenerative diagnosis.',
        'Develop an autonomy-preserving, least-restrictive transition and family-consultation plan addressing Arthur\'s late-life psychosocial needs and Claire\'s caregiver strain.',
      ],
      planningFrame: [
        {
          label: 'Clinical & Empirical Evidence',
          guidance:
            'Contrast preserved crystallized knowledge (Vocabulary 14, Information 13) and intact basic ADLs against cue-resistant delayed recall loss (MoCA 22/30), missed property taxes, and familiar-route driving disorientation.',
        },
        {
          label: 'Theoretical & Standards Framework',
          guidance:
            'Apply lifespan fluid-vs.-crystallized aging trajectories, NIA-AA MCI vs. Major Neurocognitive Disorder functional thresholds (IADL independence), reversible delirium/depression rule-outs, and Erikson ego integrity vs. despair.',
        },
        {
          label: 'Action & Formulation Plan',
          guidance:
            'Coordinate primary-care reversible-cause labs and medication review, refer for education-normed neuropsychological evaluation and formal driving assessment, and structure stepped financial/navigation scaffolds.',
        },
        {
          label: 'Limits, Ethics & Follow-Up',
          guidance:
            'Avoid diagnosing Alzheimer disease from a MoCA screen alone, protect Arthur\'s dignity and participatory decision-making while managing real safety risks, and connect Claire to caregiver respite and education.',
        },
      ],
      successCriteria: [
        'Separates normal aging features (preserved crystallized vocabulary/knowledge, mild processing-speed and retrieval slowing that improves with cueing) from atypical amnestic encoding deficits (4/5 delayed recall lost despite cues).',
        'Evaluates the diagnostic boundary between MCI (preserved overall independence with compensatory effort) and Major Neurocognitive Disorder (interference with independent IADLs such as finances and navigation).',
        'Recommends thorough differential workup for reversible contributors (geriatric depression, B12/thyroid labs, sleep apnea, anticholinergic/sedative medications) plus education-adjusted neuropsychological testing.',
        'Replaces unilateral loss of autonomy with collaborative, least-restrictive safety planning (autopay/co-monitoring, objective driving evaluation) and caregiver burnout support for Claire.',
      ],
      commonPitfalls: [
        'Dismissing missed taxes, getting lost on a familiar route, and cue-resistant recall loss as "just normal aging" because his vocabulary and basic ADLs remain strong.',
        'Diagnosing Alzheimer disease definitively from a 22/30 MoCA screening score without medical rule-outs, longitudinal history, or formal neuropsychological assessment.',
        'Overlooking cognitive reserve—missing that a MoCA of 22/30 in a college-educated retired teacher represents a sharper drop from baseline than raw norms alone imply.',
        'Endorsing Claire\'s abrupt seizure of keys and accounts without an objective driving evaluation or collaborative dignity-preserving transition.',
      ],
      sampleOutline: [
        'Lifespan differential analysis: Intact Vocabulary (14), Information (13), and mild word-finding pauses fit preserved crystallized intelligence in normal aging, whereas cue-resistant delayed recall impairment (MoCA 22/30 despite 16 years of education), missed taxes, and familiar-route disorientation indicate suspected amnestic MCI or early Major Neurocognitive Disorder depending on IADL severity.',
        'Reversible rule-out & assessment plan: Coordinate medical review (metabolic, thyroid, B12, vascular risk, sleep, and anticholinergic/sedative burden), screen for late-life depression, and refer for comprehensive education-adjusted neuropsychological testing.',
        'Autonomy-preserving safety transition: Shift from all-or-nothing control to collaborative scaffolds—automated bill alerts or shared financial review, GPS/familiar-route limits pending an occupational-therapy driving evaluation, and written memory aids.',
        'Intergenerational & caregiver support: Support Arthur\'s sense of agency and ego integrity through active involvement in planning while linking Claire to caregiver psychoeducation, boundary setting, and community respite.',
      ],
      references: [
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC4015335/',
        'https://www.nia.nih.gov/health/health-care-professionals-information/assessing-cognitive-impairment-older-patients',
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC3312027/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'eppp-workshop-05',
      taskType: 'Psychometric base-rate, validity-scale & DSM-5-TR synthesis',
      title: 'Synthesize Low-Base-Rate Screening, MMPI-3 Overreporting Scales, and Mood Criteria',
      prompt:
        'Integrate screening classification accuracy, MMPI-3 validity and substantive scales, and structured clinical interview findings for an occupational disability examinee without committing base-rate neglect, premature malingering attribution, or DSM-5-TR threshold errors.',
      stimulus:
        'Devon (age 41, municipal transit operator seeking disability leave 4 months after a minor bus collision) undergoes an outpatient psychological evaluation. A clinic screener for severe somatic-dissociative disability (sensitivity 0.85, specificity 0.85, true setting base rate 2%) flags positive. On the MMPI-3, content-non-responsiveness scales are unremarkable (CRIN = 52T, TRIN = 54T), yet overreporting indicators are elevated (F-r = 94T, Fs = 86T) alongside RCd = 78T and SUI = 68T. On the SCID-5-CV, Devon endorses 4 weeks of depressed mood, anhedonia, middle insomnia, fatigue, and passive suicidal ideation, and recalls one 3-day period of decreased need for sleep and high energy 3 years ago with no functional impairment, psychosis, or hospitalization.',
      estimatedMinutes: 20,
      taskParts: [
        'Compute and interpret the screening test\'s positive predictive value (PPV) at a 2% base rate to explain why a positive flag cannot establish somatic-dissociative disability.',
        'Interpret the MMPI-3 validity profile (CRIN/TRIN vs. F-r/Fs) alongside RCd and SUI—explaining why elevated overreporting scales require multi-method corroboration rather than an automatic malingering label.',
        'Apply DSM-5-TR duration, severity, and exclusion criteria to formulate the working mood differential and prioritize immediate safety follow-up.',
      ],
      planningFrame: [
        {
          label: 'Clinical & Empirical Evidence',
          guidance:
            'Anchor on 0.85 sensitivity/specificity at 2% base rate (PPV ~10.4%), consistent responding (CRIN 52T, TRIN 54T), elevated F-r (94T)/Fs (86T), elevated RCd (78T)/SUI (68T), 4-week depressive syndrome, and 3-day historical activation.',
        },
        {
          label: 'Theoretical & Standards Framework',
          guidance:
            'Apply Bayes/base-rate PPV mechanics, APA Guidelines for Psychological Assessment and Evaluation, MMPI-3 validity-scale interpretation limits (genuine severe distress vs. noncredible reporting), and DSM-5-TR Major Depressive vs. Bipolar II criteria.',
        },
        {
          label: 'Action & Formulation Plan',
          guidance:
            'Conduct immediate structured suicide risk assessment for SUI 68T and passive ideation, corroborate self-report with collateral medical/work records and performance validity measures, and evaluate MDD vs. medical/post-collision contributors.',
        },
        {
          label: 'Limits, Ethics & Follow-Up',
          guidance:
            'Document interpretive caveats transparently per APA Standard 9.06, avoid inferring intentional malingering from self-report elevation alone, and verify whether any unrecorded longer hypomanic episodes exist.',
        },
      ],
      successCriteria: [
        'Correctly calculates or demonstrates that at a 2% base rate with 85% sensitivity and 85% specificity, PPV is approximately 10.4% (nearly 9 in 10 positive screens are false positives).',
        'Distinguishes consistent responding (normal CRIN/TRIN) from overreporting elevations (F-r 94T, Fs 86T), recognizing competing hypotheses (severe acute distress/cry for help vs. symptom exaggeration in a disability context) without equating elevation to malingering.',
        'Applies DSM-5-TR thresholds accurately: 4 weeks of core symptoms fits a provisional Major Depressive Episode pending medical/substance/validity rule-outs, whereas a single 3-day period without impairment falls short of the 4-consecutive-day Bipolar II hypomania requirement.',
        'Prioritizes immediate clinical follow-up on SUI = 68T and passive suicidal ideation regardless of overreporting concerns.',
      ],
      commonPitfalls: [
        'Assuming an 85% sensitive and 85% specific screener means Devon has an 85% probability of having severe somatic-dissociative disability (base-rate neglect).',
        'Declaring Devon a malingerer solely because F-r = 94T and Fs = 86T appear in a disability evaluation, ignoring genuine distress and the need for multi-method validity evidence.',
        'Diagnosing Bipolar II Disorder on the basis of a single 3-day energetic period that fails to meet the DSM-5-TR 4-day minimum duration criterion.',
        'Dismissing SUI = 68T and passive suicidal ideation as invalid exaggeration without conducting a direct suicide safety assessment.',
      ],
      sampleOutline: [
        'Base-rate & PPV audit: In 10,000 examinees at a 2% base rate (200 true cases, 9,800 non-cases), 85% sensitivity yields 170 true positives while 85% specificity yields 1,470 false positives—producing a PPV of 170 / 1,640 (~10.4%), so the screener alone has low confirmatory value.',
        'MMPI-3 validity synthesis: Normal CRIN (52T) and TRIN (54T) rule out random or fixed-response invalidity; F-r (94T) and Fs (86T) flag potential overreporting of psychological and somatic complaints that limits uncorroborated profile interpretation but does not by itself prove intentional malingering—requiring collateral records, clinical observation, and stand-alone validity data.',
        'DSM-5-TR differential: Four weeks of depressed mood, anhedonia, insomnia, and fatigue support provisional Major Depressive Disorder pending medical/concussion/substance exclusions, while the single 3-day activation episode falls short of the 4-day hypomania threshold for Bipolar II.',
        'Immediate safety & reporting ethics: Conduct an immediate structured suicide safety assessment given SUI = 68T and passive ideation, and write a balanced APA Standard 9.06 report stating score validity limits clearly.',
      ],
      references: [
        'https://www.apa.org/about/policy/guidelines-psychological-assessment-evaluation.pdf',
        'https://pubmed.ncbi.nlm.nih.gov/34065637/',
        'https://pubmed.ncbi.nlm.nih.gov/34991350/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'eppp-workshop-06',
      taskType: 'EBPP treatment sequencing, suicide safety & supervision consult',
      title: 'Integrate ERP, Motivational Interviewing, Suicide Safety Planning, and Supervision',
      prompt:
        'Coordinate evidence-based psychotherapy sequencing, acute outpatient suicide safety management, and competency-based clinical supervision for a doctoral intern navigating co-occurring OCD, alcohol misuse, and parallel process.',
      stimulus:
        'Maya (age 26, graduate nursing student) sees a doctoral psychology intern for severe contamination OCD (Y-BOCS = 27; 3.5 hours/day handwashing) and co-occurring alcohol misuse (6–8 drinks on 4 nights/week to blunt panic). She sits in the contemplation stage regarding alcohol ("I know drinking makes my anxiety rebound the next morning, yet I am terrified to stop"). At Session 3, Maya discloses escalating suicidal thoughts with a vague method ("taking leftover prescription pills at home"), denies intent today, and names her sister as a key protective anchor. In weekly supervision, the intern pleads for "an exact word-for-word script so I do not make a fatal mistake," mirroring Maya\'s rigid reassurance-seeking during sessions.',
      estimatedMinutes: 20,
      taskParts: [
        'Conduct an acute safety-management plan using a structured outpatient suicide safety assessment and collaborative lethal-means safety planning rather than non-evidence-based contracting.',
        'Sequence evidence-based interventions under the APA EBPP framework by matching Motivational Interviewing to Maya\'s contemplation stage and structuring inhibitory-learning Exposure and Response Prevention (ERP) for OCD.',
        'Formulate a competency-based supervision response that names and resolves the parallel process while supporting intern development and ensuring client safety.',
      ],
      planningFrame: [
        {
          label: 'Clinical & Empirical Evidence',
          guidance:
            'Integrate Y-BOCS 27 (3.5 hr/day rituals), 6–8 drinks 4x/week in contemplation stage, active-method suicidal ideation with leftover pills at home, protective sister tie, and the intern\'s script-seeking demand.',
        },
        {
          label: 'Theoretical & Standards Framework',
          guidance:
            'Apply NIMH Brief Suicide Safety Assessment (BSSA) and collaborative safety planning, APA EBPP three-legged stool, Transtheoretical Model + Motivational Interviewing, inhibitory-learning ERP, and APA Guidelines for Clinical Supervision.',
        },
        {
          label: 'Action & Formulation Plan',
          guidance:
            'Stabilize acute risk with lethal-means reduction and crisis contacts, use MI to explore alcohol ambivalence before action-focused reduction, launch collaborative ERP without reassurance accommodation, and unpack parallel process in supervision.',
        },
        {
          label: 'Limits, Ethics & Follow-Up',
          guidance:
            'Reject "no-suicide contracts," evaluate medically supervised withdrawal risk if heavy drinking ceases abruptly, maintain heightened supervisory oversight/documentation, and track Y-BOCS, drinking days, and safety weekly.',
        },
      ],
      successCriteria: [
        'Replaces ineffective "no-suicide contracts" with structured outpatient suicide safety assessment (NIMH BSSA), collaborative warning-sign/coping steps, sister/988 crisis supports, and lethal-means counseling for leftover pills.',
        'Matches Motivational Interviewing (evoking change talk, rolling with sustain talk) to Maya\'s contemplation stage rather than confrontational action demands, while noting medical consultation if alcohol withdrawal risk emerges.',
        'Selects inhibitory-learning Exposure and Response Prevention (ERP) as first-line OCD treatment, avoiding therapist reassurance rituals that negatively reinforce compulsions.',
        'Identifies the intern\'s urgent script demand as a parallel process mirroring Maya\'s intolerance of uncertainty, balancing warm reflective supervision with direct clinical-safety scaffolding.',
      ],
      commonPitfalls: [
        'Having Maya sign a "no-suicide contract" and assuming acute risk is resolved without addressing access to leftover pills at home.',
        'Using confrontational abstinence ultimatums with a contemplation-stage client, which reliably increases sustain talk and treatment dropout.',
        'Offering repeated verbal reassurance to Maya about contamination or giving the intern a rigid word-for-word script, reinforcing intolerance of uncertainty in both dyads.',
        'Ignoring medical safety around abrupt alcohol cessation or treating OCD with pure unstructured talk therapy while leaving 3.5-hour washing rituals unaddressed.',
      ],
      sampleOutline: [
        'Acute suicide safety triage: Complete a structured Brief Suicide Safety Assessment (ideation frequency, intent, preparatory behaviors, protective factors) and co-create a written safety plan incorporating internal coping, sister outreach, 988 Lifeline, and collaborative removal/securing of leftover prescription pills.',
        'EBPP treatment integration: Match Motivational Interviewing to Maya\'s contemplation stage around alcohol (exploring anxiety-rebound discrepancy and autonomy, coordinating medical guidance on safe reduction) alongside structured inhibitory-learning ERP targeting contamination hierarchies without reassurance accommodation.',
        'Supervision & parallel process: Name how the intern\'s urge for an exact safety script parallels Maya\'s compulsive certainty-seeking; provide concrete risk-protocol clarity to protect the client while coaching tolerance of clinical ambiguity and reflective formulation.',
        'Outcome monitoring & documentation: Document supervisory review and safety-plan updates in real time, coordinate interprofessional medical care as consented, and track weekly suicide risk, alcohol quantity/frequency, and Y-BOCS change.',
      ],
      references: [
        'https://www.apa.org/practice/guidelines/evidence-based-statement.html',
        'https://www.nimh.nih.gov/research/research-conducted-at-nimh/asq-toolkit-materials/adult-outpatient/adult-outpatient-brief-suicide-safety-assessment-guide',
        'https://www.apa.org/about/policy/guidelines-supervision.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'eppp-workshop-07',
      taskType: 'Clinical trial validity audit & statistical redesign',
      title: 'Audit Internal Validity Threats, Low Power, and Multiplicity in a Trauma Outcome Trial',
      prompt:
        'Conduct a methodological and statistical audit of a flawed community psychotherapy outcome study—identifying internal validity threats, Type I/Type II inferential errors, and an APA JARS-Quant-aligned longitudinal redesign.',
      stimulus:
        'A community clinic evaluates a new 12-week brief trauma group by recruiting 48 adults scoring in the top 10% on a PTSD checklist (baseline mean = 64/80) without randomization: the first 24 volunteers enter the new group and the next 24 receive treatment-as-usual (TAU). At Week 6, the city launches a free housing-stability stipend primarily accessed by the new group\'s neighborhood. By Week 12, 9 of 24 participants drop out of the new group (mostly those with high baseline dissociation) versus 2 of 24 in TAU. Using completer-only post-test independent t-tests across 6 outcome measures at unadjusted alpha = 0.05, the authors claim the non-significant primary result (d = 0.35, p = 0.24, achieved power = 0.21) "proves the two therapies are equivalent" while highlighting one secondary subscale (p = 0.041) as proof of superiority.',
      estimatedMinutes: 20,
      taskParts: [
        'Diagnose at least four major threats to internal validity in the trial\'s recruitment, assignment, concurrent events, and retention patterns.',
        'Critique the statistical analysis—specifically addressing Type II error/false equivalence, familywise Type I error inflation across six tests, and completer-only attrition bias.',
        'Specify a rigorous experimental and analytic redesign (randomization, a priori power, intent-to-treat mixed-effects or ANCOVA modeling, effect-size/CI reporting, and APA JARS-Quant transparency).',
      ],
      planningFrame: [
        {
          label: 'Clinical & Empirical Evidence',
          guidance:
            'Flag nonrandom sequential assignment, top-10% extreme-score entry (64/80), Week 6 neighborhood housing stipend, 37.5% vs. 8.3% differential dissociation dropout, 6 unadjusted t-tests, and d = 0.35 / p = 0.24 / power 0.21.',
        },
        {
          label: 'Theoretical & Standards Framework',
          guidance:
            'Apply Shadish-Cook-Campbell internal validity taxonomy, Neyman-Pearson power and Type I/II error logic, intent-to-treat missing-data principles, Wilkinson/APA Statistical Inference guidelines, and APA JARS-Quant standards.',
        },
        {
          label: 'Action & Formulation Plan',
          guidance:
            'Redesign with stratified randomization, a priori power calculation for a realistic effect size, pre-registered primary endpoint, linear mixed-effects or baseline-adjusted ANCOVA under ITT, and Holm-Bonferroni control for secondary outcomes.',
        },
        {
          label: 'Limits, Ethics & Follow-Up',
          guidance:
            'Require transparent CONSORT/JARS-Quant attrition flow reporting, effect sizes with 95% confidence intervals rather than bare p-values, and sensitivity analyses testing missing-not-at-random dropout.',
        },
      ],
      successCriteria: [
        'Correctly identifies selection bias, regression to the mean (top-10% extreme-score selection), history / selection-by-history interaction (Week 6 housing stipend), and differential attrition / experimental mortality (9/24 high-dissociation dropouts vs. 2/24).',
        'Explains why p = 0.24 with power = 0.21 reflects an underpowered study prone to Type II error—not proof of therapeutic equivalence (which requires an a priori equivalence margin and adequate power).',
        'Demonstrates that six unadjusted tests at alpha = 0.05 inflate familywise Type I error (to ~26.5%), rendering the isolated p = 0.041 secondary subscale unreliable without pre-specification and multiplicity adjustment.',
        'Recommends stratified randomization, intent-to-treat (ITT) longitudinal linear mixed-effects modeling or baseline-adjusted ANCOVA, a priori power planning, and effect sizes with 95% CIs under APA JARS-Quant.',
      ],
      commonPitfalls: [
        'Accepting a non-significant p = 0.24 as evidence that the new therapy and TAU are equivalent without noticing the 0.21 power and absence of an equivalence test.',
        'Relying on post-hoc observed power to rescue the design instead of conducting an a priori power analysis for a clinically meaningful effect size.',
        'Using last-observation-carried-forward (LOCF) or completer-only deletion as if they eliminate bias from selective dissociation-related dropout.',
        'Treating the single p = 0.041 secondary subscale as definitive clinical superiority despite six unadjusted comparisons and confounded housing-stipend history.',
      ],
      sampleOutline: [
        'Internal validity audit: Nonrandom sequential allocation introduces selection bias; recruiting only top-10% scorers (mean 64/80) invites regression to the mean; the Week 6 neighborhood housing stipend creates a selection-by-history confound; and 37.5% high-dissociation dropout in the new group vs. 8.3% in TAU introduces severe differential attrition.',
        'Statistical error critique: With achieved power of 0.21, failing to reject the null (d = 0.35, p = 0.24) indicates massive Type II error risk rather than equivalence; running 6 unadjusted t-tests inflates familywise alpha to ~0.265 (1 - 0.95^6), making the p = 0.041 secondary finding a likely Type I artifact amplified by completer bias.',
        'Experimental & analytic redesign: Implement stratified randomization (balancing baseline dissociation/site), pre-register one primary PTSD outcome with a priori power calculation (~128/arm for d = 0.35 at 80% power, two-tailed alpha = 0.05), and analyze all randomized participants via intent-to-treat linear mixed-effects modeling (or ANCOVA adjusting for baseline) with principled missing-data handling.',
        'Reporting standards: Follow APA JARS-Quant by reporting participant flow and reasons for attrition, standardized effect sizes with 95% confidence intervals, multiplicity adjustments for secondary endpoints, and sensitivity analyses.',
      ],
      references: [
        'https://apastyle.apa.org/jars/quantitative',
        'https://www.apa.org/pubs/journals/releases/amp-54-8-594.pdf',
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC3840331/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'eppp-workshop-08',
      taskType: 'APA Ethics Code, subpoena & forensic-boundary decision analysis',
      title: 'Navigate Duty-to-Protect, an Attorney Subpoena, and a Custody Dual-Role Request',
      prompt:
        'Sequence immediate legal-ethical actions when a long-term psychotherapy case simultaneously presents an imminent third-party threat, an attorney-issued subpoena for records and test items, and a request for a child-custody recommendation.',
      stimulus:
        'Dr. Jordan Alvarez has provided individual psychotherapy to Sam (age 38) for 14 months during a contentious divorce. Yesterday, Sam angrily declared he "knows where my ex-wife\'s new partner works and might wait in the parking lot with a tire iron tonight," then walked out 10 minutes early without answering callback attempts. Today, Dr. Alvarez receives an attorney-issued subpoena duces tecum from the ex-spouse\'s lawyer demanding Sam\'s entire clinical chart, psychotherapy notes, and raw MMPI-3 test items within 10 days—accompanied by neither a client-signed authorization nor a judge-signed court order. Meanwhile, Sam\'s own attorney emailed requesting a letter recommending that the court award Sam primary custody as the "fitter parent."',
      estimatedMinutes: 20,
      taskParts: [
        'Triage the imminent third-party threat first by detailing risk assessment, jurisdiction-specific duty-to-protect steps, and minimum-necessary confidentiality disclosure under APA Standard 4.05(b).',
        'Specify the exact legal and ethical procedure for responding to the attorney subpoena—distinguishing a subpoena from a court order, HIPAA satisfactory assurances, psychotherapy notes protections, and APA Standards 9.04 vs. 9.11 (test data vs. test materials).',
        'Resolve the custody recommendation request under APA Standard 3.05 (Multiple Relationships), Standard 9.01 (Bases for Assessments), and the Specialty Guidelines for Forensic Psychology.',
      ],
      planningFrame: [
        {
          label: 'Clinical & Empirical Evidence',
          guidance:
            'Separate three urgent facts: (1) specific threat with weapon and location ("parking lot with a tire iron tonight") + abrupt exit, (2) attorney subpoena lacking consent/court order asking for psychotherapy notes and MMPI-3 items, and (3) custody recommendation request from treating client\'s lawyer.',
        },
        {
          label: 'Theoretical & Standards Framework',
          guidance:
            'Apply APA Ethics Code Standards 3.05, 4.01, 4.05(b), 9.01, 9.04, and 9.11, HIPAA Privacy Rule satisfactory assurances and psychotherapy-notes rules, state Tarasoff/duty-to-protect statutes, and APA Specialty Guidelines for Forensic Psychology.',
        },
        {
          label: 'Action & Formulation Plan',
          guidance:
            'Act immediately on third-party safety per state law, consult risk-management/legal counsel, assert privilege and request written consent/protective order or court order before disclosing any subpoenaed records, and formally decline the custody-evaluator role.',
        },
        {
          label: 'Limits, Ethics & Follow-Up',
          guidance:
            'Never ignore a subpoena or release records solely on an attorney demand, limit any safety breach to the minimum necessary information, protect copyrighted test materials, and document all consultations and clinical rationales contemporaneously.',
        },
      ],
      successCriteria: [
        'Prioritizes immediate physical safety triage—re-attempting client contact, evaluating imminent third-party risk, consulting legal/risk management, and fulfilling jurisdiction-specific duty-to-protect/warn mandates with minimum necessary disclosure under APA Standard 4.05(b).',
        'Correctly distinguishes an attorney subpoena from a judge-signed court order: never ignores the subpoena, does not release records without client authorization, verified HIPAA satisfactory assurances/protective order, or a court order, and protects psychotherapy notes.',
        'Applies APA Standards 9.04 and 9.11 accurately by separating releaseable test data (under proper authorization/order) from protected copyrighted MMPI-3 test materials/items.',
        'Declines the child-custody recommendation to prevent an impermissible treating-versus-forensic dual role (APA Standard 3.05 & Forensic Guidelines) and notes that evaluating only one parent violates Standard 9.01.',
      ],
      commonPitfalls: [
        'Handling the paperwork subpoena first while delaying urgent safety action on a specific, same-night threat of violence with a weapon.',
        'Either ignoring an attorney subpoena completely (risking contempt) or immediately mailing the entire chart and MMPI-3 booklet without client release, HIPAA satisfactory assurances, or a court order.',
        'Writing a "supportive letter" recommending custody for Sam while serving as his treating therapist, creating an unethical multiple relationship and unsupported forensic opinion.',
        'Failing to distinguish psychotherapy notes and raw copyrighted test materials (Standard 9.11) from standard medical-record summaries and test data (Standard 9.04).',
      ],
      sampleOutline: [
        'Priority 1 — Imminent third-party safety: Attempt immediate clinical re-contact to assess risk and de-escalate; consult risk management/legal counsel and execute applicable state duty-to-protect steps (e.g., notifying law enforcement and/or the identifiable target) while disclosing only the minimum information necessary under APA Standard 4.05(b).',
        'Priority 2 — Attorney subpoena response: Do not ignore the subpoena and do not release records solely on an attorney\'s demand; contact Sam and his counsel to determine whether he will waive privilege or move to quash, require either written client authorization, verified HIPAA satisfactory assurances/qualified protective order, or a judge-signed court order, and object specifically to releasing psychotherapy notes and copyrighted MMPI-3 test items (APA Standards 9.04 and 9.11).',
        'Priority 3 — Treating vs. forensic boundary: Decline Sam\'s attorney\'s request for a custody recommendation under APA Standard 3.05, Standard 9.01, and the Specialty Guidelines for Forensic Psychology, explaining that a treating therapist cannot serve as an objective custody evaluator and has not assessed all relevant parties.',
        'Documentation & continuity: Record risk-assessment steps, legal/ethical consultations, written responses to both attorneys, and therapeutic boundary clarification with Sam.',
      ],
      references: [
        'https://www.apa.org/ethics/code',
        'https://www.hhs.gov/hipaa/for-professionals/faq/706/what-satisfactory-assurances-must-a-covered-entity-receive-before-it-responds-to-a-subpoena/index.html',
        'https://www.apa.org/practice/guidelines/forensic-psychology',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
  ],
};

module.exports = {
  eppp_part_1,
};
