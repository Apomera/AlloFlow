'use strict';

/**
 * Original AP-exam-authentic worked examples and misconception guidance for:
 * - ap_psychology_pilot (15 sections)
 * - ap_us_government_foundation_pilot (15 sections)
 * - ap_us_history_foundation_pilot (27 sections)
 * Total: 57 sections.
 */

const ap_psychology_pilot = {
  'ap-psych-ch-01-section-01': {
    workedExample: {
      prompt:
        'A twin study finds a 0.72 heritability estimate for spatial reasoning in suburban teens. A journalist claims 72% of any individual teen\'s score is fixed by DNA. Evaluate that claim using AP research principles.',
      steps: [
        'Step 1: Identify heritability as a population-level statistic estimating the proportion of observed trait variance linked to genetic differences within a specific group and environment.',
        'Step 2: Apply heredity-environment interaction and research-design limits: twin concordance studies are correlational, and high heritability within one uniform environment does not rule out environmental effects on mean scores.',
        'Step 3: Conclude that the journalist misinterprets a group variance statistic as individual genetic determinism; enriching spatial training could still shift every teen\'s performance upward.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'A heritability estimate of 70% means 70% of a single person\'s trait comes directly from their genes.',
        repair: 'Heritability describes variance across a population in a given environment, never the genetic percentage inside one individual\'s score.',
      },
      {
        misconception: 'Strong genetic heritability proves that educational or environmental interventions cannot change the trait.',
        repair: 'Even highly heritable traits such as height shift substantially across generations when nutrition, health, or instruction improves.',
      },
    ],
  },

  'ap-psych-ch-01-section-02': {
    workedExample: {
      prompt:
        'After taking a beta-blocker that binds to adrenergic receptors without activating them, a violinist feels calmer before an audition. Explain the synaptic and autonomic mechanisms involved.',
      steps: [
        'Step 1: Classify the beta-blocker as a competitive antagonist at postsynaptic receptors normally activated by norepinephrine and epinephrine during sympathetic nervous system arousal.',
        'Step 2: Trace the neural pathway: blocking receptor binding prevents ligand-gated ion channels from depolarizing target cells to threshold, dampening downstream sympathetic fight-or-flight responses such as elevated heart rate.',
        'Step 3: Conclude that the drug reduces physiological stage fright by inhibiting postsynaptic receptor activation rather than halting presynaptic action potentials altogether.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Stronger stimuli cause individual neurons to fire larger or faster action potentials down the axon.',
        repair: 'Action potentials obey the all-or-none law; stimulus intensity is coded by firing frequency and the number of recruited neurons, not spike height.',
      },
      {
        misconception: 'Neurotransmitters physically cross into the postsynaptic neuron and travel directly down its axon.',
        repair: 'Neurotransmitters diffuse across the synaptic gap, bind briefly to receptors to open ion channels, and are cleared by reuptake or enzymes.',
      },
    ],
  },

  'ap-psych-ch-01-section-03': {
    workedExample: {
      prompt:
        'A night-shift nurse who sleeps only four hours daily struggles to recall new medication dosages and stops noticing the hum of hallway ventilators within minutes. Explain both phenomena biologically.',
      steps: [
        'Step 1: Identify the circadian disruption via the suprachiasmatic nucleus (SCN) and melatonin misalignment, alongside truncated NREM-3 slow-wave and REM sleep needed for memory consolidation.',
        'Step 2: Apply sensory transduction and sensory adaptation: auditory hair cells initially transduce ventilator vibrations, then decrease firing responsiveness under constant, unchanging stimulation.',
        'Step 3: Conclude that reduced NREM-3/REM sleep impairs hippocampal-cortical consolidation of medication facts, while sensory adaptation filters out steady ventilator noise so attention stays free for alarms.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'REM sleep is the deepest, least active sleep stage because the sleeper\'s muscles are immobilized.',
        repair: 'REM is paradoxical sleep with waking-like cortical brain waves and vivid dreaming despite brainstem-induced muscle atonia; NREM-3 has the slowest delta waves.',
      },
      {
        misconception: 'Absolute threshold means the faintest stimulus a person can detect 100% of the time in a lab.',
        repair: 'Psychophysicists define absolute threshold as the minimum stimulus energy detected 50% of the time, because sensitivity fluctuates with fatigue and expectations.',
      },
    ],
  },

  'ap-psych-ch-02-section-01': {
    workedExample: {
      prompt:
        'After watching local news cover three rare shark attacks, a coastal swimmer cancels a beach trip while driving carelessly to the store. Explain the swimmer\'s risk judgment and perceptual filtering.',
      steps: [
        'Step 1: Identify the availability heuristic (judging event likelihood by how vividly examples come to mind) alongside top-down schema-driven threat perception.',
        'Step 2: Contrast vivid news coverage with statistical base rates: dramatic shark footage is rapidly retrieved from memory, overriding higher actual probabilities of traffic injury and narrowing selective attention.',
        'Step 3: Conclude that reliance on the availability heuristic distorts probability estimates, causing the swimmer to overestimate rare sensational hazards while underestimating routine everyday risks.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Bottom-up and top-down processing are mutually exclusive modes that never operate during the same task.',
        repair: 'Real-world perception blends both simultaneously: sensory features drive bottom-up assembly while schemas and expectations guide top-down interpretation.',
      },
      {
        misconception: 'The representativeness heuristic is simply remembering vivid examples from recent media reports.',
        repair: 'Recall ease defines the availability heuristic; representativeness judges likelihood by matching a target to a mental prototype while ignoring base rates.',
      },
    ],
  },

  'ap-psych-ch-02-section-02': {
    workedExample: {
      prompt:
        'Students who quiz themselves on Spanish verbs outperform peers who reread notes, yet one student later confuses newly learned French verbs with older Spanish forms. Explain both memory outcomes.',
      steps: [
        'Step 1: Identify retrieval practice (the testing effect) as a long-term memory enhancer and retroactive interference as the mechanism disrupting older Spanish vocabulary.',
        'Step 2: Apply cognitive memory principles: active recall strengthens retrieval cues and consolidation more than passive rereading, whereas new French verb encoding competes with and overwrites access to prior Spanish traces.',
        'Step 3: Conclude that spaced self-testing builds durable retrieval pathways, while studying similar languages back-to-back invites retroactive interference unless cues are made distinct.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Proactive interference happens when newly learned material erases memories you encoded last year.',
        repair: 'Proactive interference works forward in time: old memories disrupt recall of new material, whereas retroactive interference works backward from new to old.',
      },
      {
        misconception: 'Long-term memory stores events like a video recording that stays accurate if a witness feels confident.',
        repair: 'Memory is reconstructive; post-event misinformation and schemas can alter details while leaving witness confidence artificially high.',
      },
    ],
  },

  'ap-psych-ch-02-section-03': {
    workedExample: {
      prompt:
        'A newly designed college-readiness exam produces nearly identical scores when students retake it two weeks later, yet scores show almost zero correlation with first-year GPA. Evaluate its psychometric quality.',
      steps: [
        'Step 1: Distinguish test-retest reliability (consistency of scores across administrations) from predictive criterion validity (how well scores forecast future academic performance).',
        'Step 2: Apply psychometric logic: high repeat consistency demonstrates strong test-retest reliability, but near-zero correlation with first-year GPA shows the exam lacks predictive validity for college readiness.',
        'Step 3: Conclude that because reliability is necessary but not sufficient for validity, admissions officers cannot justify using this test to forecast college achievement without revising its content.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'If a standardized test yields consistent scores across repeated sittings, it must also be valid.',
        repair: 'A measure can be reliably wrong; high reliability only confirms repeatable results, whereas validity requires evidence that the test measures its target construct.',
      },
      {
        misconception: 'Aptitude tests measure pure innate intelligence unaffected by schooling, while achievement tests measure learning.',
        repair: 'Both aptitude and achievement tests reflect prior educational experience; aptitude exams aim to predict future performance, while achievement exams assess mastered content.',
      },
    ],
  },

  'ap-psych-ch-03-section-01': {
    workedExample: {
      prompt:
        'A cross-sectional study finds 20-year-olds solve timed digital puzzles faster than 70-year-olds and concludes aging sharply destroys reasoning. Critique this inference using developmental design concepts.',
      steps: [
        'Step 1: Identify the study as a cross-sectional design comparing different age cohorts at one time point, creating a major risk of cohort effects.',
        'Step 2: Apply developmental methodology: 20-year-olds grew up with digital interfaces and formal computer training, confounding generational exposure with biological age while overlooking crystallized intelligence gains.',
        'Step 3: Conclude that a longitudinal or sequential design tracking the same individuals over decades is needed to separate true age-related processing changes from generational cohort differences.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Cross-sectional studies prove how an individual naturally changes as they grow older over time.',
        repair: 'Cross-sectional designs compare separate birth cohorts at one moment, so generational differences in education or technology can mimic aging effects.',
      },
      {
        misconception: 'Longitudinal studies eliminate every methodological flaw because they follow the same people for years.',
        repair: 'Longitudinal designs avoid cohort confounds across groups, but they remain vulnerable to selective attrition, practice effects, and high cost.',
      },
    ],
  },

  'ap-psych-ch-03-section-02': {
    workedExample: {
      prompt:
        'A driver fastens the seat belt immediately to silence an annoying dashboard chime, and weeks later feels tense whenever a similar chime sounds in a store. Distinguish both conditioning processes.',
      steps: [
        'Step 1: Identify fastening the seat belt as negative reinforcement in operant conditioning, because a voluntary behavior increases when it removes an aversive stimulus (the chime).',
        'Step 2: Identify feeling tense at the store chime as classical conditioning with stimulus generalization: the car chime became associated with alarm tension and transferred to a similar sound.',
        'Step 3: Conclude that voluntary escape behavior maintained by removing a noxious chime reflects negative reinforcement, while automatic emotional tension to a similar cue reflects classical generalization.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Negative reinforcement is a form of punishment that decreases unwanted behavior by adding something unpleasant.',
        repair: 'All reinforcement increases behavior; negative reinforcement strengthens a response by removing an aversive stimulus, whereas positive punishment adds one to weaken behavior.',
      },
      {
        misconception: 'Extinction permanently erases a classically conditioned association from the learner\'s nervous system.',
        repair: 'Extinction suppresses rather than erases learning, which is why a conditioned response often reappears after a rest period during spontaneous recovery.',
      },
    ],
  },

  'ap-psych-ch-03-section-03': {
    workedExample: {
      prompt:
        'A commuter rides as a passenger along a new bus route for months without driving, then navigates the exact detours flawlessly on her first day behind the wheel. Explain the learning process shown.',
      steps: [
        'Step 1: Identify latent learning and cognitive map formation, classically demonstrated by Tolman\'s maze-running rats that learned spatial layouts without immediate reinforcement.',
        'Step 2: Apply cognitive-learning principles: passive exposure built an internal spatial representation (cognitive map) that remained hidden until an incentive—driving herself—triggered its demonstration.',
        'Step 3: Conclude that learning can occur cognitively without immediate overt reinforcement or motor practice, challenging strict radical behaviorist claims that reinforcement is required for acquisition.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Observational learning automatically occurs whenever someone watches another person perform a behavior.',
        repair: 'Bandura\'s model requires attention, retention, motor reproduction ability, and motivation; watching a model without motivation or capability will not yield performance.',
      },
      {
        misconception: 'Any neutral stimulus can be classically conditioned to any unconditioned response with equal ease.',
        repair: 'Biological preparedness constrains conditioning; organisms rapidly form taste aversions linking flavors to nausea, but rarely link bright lights or tones to illness.',
      },
    ],
  },

  'ap-psych-ch-04-section-01': {
    workedExample: {
      prompt:
        'After a committee unanimously approves a flawed budget because no member wants to upset the chair, an outsider blames the members\' "low intelligence." Diagnose both social-psychological phenomena.',
      steps: [
        'Step 1: Identify the committee\'s premature consensus as groupthink, driven by high cohesion, a directive leader, and pressure for unanimity that suppresses dissent.',
        'Step 2: Identify the outsider\'s judgment as the fundamental attribution error (FAE): overemphasizing stable dispositional traits ("low intelligence") while ignoring powerful situational pressures inside the meeting.',
        'Step 3: Conclude that appointing a devil\'s advocate and anonymous voting counteract groupthink, while weighing situational norms prevents the fundamental attribution error.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Cognitive dissonance occurs whenever someone feels angry after another person disagrees with their opinion.',
        repair: 'Cognitive dissonance is internal psychological tension caused by inconsistency between one\'s own attitudes and voluntarily chosen actions, motivating attitude rationalization.',
      },
      {
        misconception: 'Group polarization means a group splits into two hostile factions holding opposite extreme views.',
        repair: 'Group polarization shifts an already like-minded group\'s average attitude toward a more extreme version of its initial leaning after discussion.',
      },
    ],
  },

  'ap-psych-ch-04-section-02': {
    workedExample: {
      prompt:
        'A shy ninth-grader expects classmates to reject her, avoids club fairs, and thus receives few invitations—confirming her belief that peers are unfriendly. Explain this cycle using social-cognitive theory.',
      steps: [
        'Step 1: Identify Bandura\'s concept of reciprocal determinism within the social-cognitive perspective on personality.',
        'Step 2: Map the three mutually interacting factors: internal cognitions (expecting rejection), behavior (avoiding club fairs), and social environment (receiving fewer peer invitations) continuously reinforce one another.',
        'Step 3: Conclude that personality expression is neither solely an unchanging trait nor purely environmental conditioning; changing one element—such as joining a small club—can shift the entire feedback loop.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The Big Five trait model labels people into rigid binary categories like purely introvert or purely extravert.',
        repair: 'Big Five dimensions (OCEAN) are continuous spectra on which most people score near the middle rather than at extreme categorical poles.',
      },
      {
        misconception: 'Projective tests like the Rorschach inkblot have stronger reliability and validity than standardized inventories.',
        repair: 'Empirically derived self-report inventories like the Big Five or MMPI generally show higher reliability and criterion validity than loosely scored projective tests.',
      },
    ],
  },

  'ap-psych-ch-04-section-03': {
    workedExample: {
      prompt:
        'A student who loves sketching cartoons stops drawing for fun once a local shop starts paying her per comic, then feels calm before an art contest after reframing nerves as excitement. Explain both shifts.',
      steps: [
        'Step 1: Identify the overjustification effect in motivation (extrinsic pay undermining pre-existing intrinsic interest) and cognitive appraisal in emotion.',
        'Step 2: Apply theory: expected tangible rewards shift perceived causality from internal enjoyment to external payment, while Schachter-Singer and Lazarus frameworks show reappraising physiological arousal alters emotional experience.',
        'Step 3: Conclude that unexpected praise preserves intrinsic motivation better than contingent pay, and reappraising arousal as challenge rather than threat supports adaptive emotional regulation.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Adding an extrinsic reward always adds on top of intrinsic motivation to maximize long-term effort.',
        repair: 'When an activity is already intrinsically enjoyable, expected tangible rewards can trigger the overjustification effect and reduce later voluntary engagement.',
      },
      {
        misconception: 'Cultural display rules prove that people in different cultures cannot recognize basic facial expressions.',
        repair: 'Basic facial expressions show substantial cross-cultural recognition, whereas display rules govern social norms about when to amplify, mask, or suppress emotions.',
      },
    ],
  },

  'ap-psych-ch-05-section-01': {
    workedExample: {
      prompt:
        'Facing an unexpected layoff, one worker updates her resume and attends networking fairs while another practices paced breathing while waiting for a family biopsy result. Evaluate each coping strategy.',
      steps: [
        'Step 1: Identify primary and secondary stress appraisal (evaluating threat and perceived controllability) alongside problem-focused versus emotion-focused coping.',
        'Step 2: Match strategy to stressor controllability: job searching is a controllable challenge well suited to problem-focused coping, whereas awaiting a medical test result is temporarily uncontrollable and suited to emotion-focused regulation.',
        'Step 3: Conclude that neither coping style is universally superior; psychological resilience depends on matching problem-focused action to controllable stressors and emotion-focused skills plus social support to uncontrollable ones.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Emotion-focused coping is always unhealthy avoidance, while problem-focused coping is always the best choice.',
        repair: 'Emotion-focused coping such as reappraisal or relaxation is adaptive when a stressor cannot yet be changed, whereas rigid problem-solving can heighten frustration.',
      },
      {
        misconception: 'All physiological stress activation harms the body immediately and should be eliminated completely.',
        repair: 'Short-term sympathetic activation mobilizes energy and focus for acute demands; health damage stems mainly from prolonged chronic HPA-axis cortisol elevation.',
      },
    ],
  },

  'ap-psych-ch-05-section-02': {
    workedExample: {
      prompt:
        'A college sophomore reports intense sadness for three days after failing a midterm, while another reports six weeks of anhedonia, insomnia, and missed classes alongside panic attacks. Apply clinical diagnostic criteria.',
      steps: [
        'Step 1: Apply DSM-5-TR classification criteria—symptom cluster, minimum duration, clinically significant distress or functional impairment, and cultural/situational context—plus the concept of comorbidity.',
        'Step 2: Contrast the two cases: three days of situational sadness lacks the two-week duration and pervasive impairment required for major depressive disorder, whereas the second student meets duration/impairment thresholds and shows possible anxiety comorbidity.',
        'Step 3: Conclude that differential assessment using a biopsychosocial approach prevents pathologizing normal grief or academic disappointment while ensuring comorbid conditions receive comprehensive care.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Feeling anxious or down for a few days after a setback automatically qualifies as a clinical disorder.',
        repair: 'Diagnosis requires a persistent cluster of symptoms causing significant distress or functional impairment over a defined timeframe, not brief normal reactions.',
      },
      {
        misconception: 'Using the medical or biological model means psychological and social factors have no role in mental disorders.',
        repair: 'Modern clinical psychology relies on the biopsychosocial approach, recognizing that genetic vulnerability interacts with thought patterns, trauma, and social environment.',
      },
    ],
  },

  'ap-psych-ch-05-section-03': {
    workedExample: {
      prompt:
        'A clinic advertises a new anxiety app after 80% of 40 self-selected users feel calmer after six weeks, with no comparison group. Critique this causal claim and propose an ethical evaluation design.',
      steps: [
        'Step 1: Identify internal validity threats in an uncontrolled single-group pretest-posttest study: spontaneous remission, placebo expectancy, regression to the mean, and self-selection bias.',
        'Step 2: Design a randomized controlled trial (RCT) randomly assigning consenting participants to the app versus an active placebo or wait-list control, with blinded outcome raters and APA ethical safeguards.',
        'Step 3: Conclude that without random assignment and a control group, the clinic cannot attribute improvement to the app; ethical evaluation requires informed consent, confidentiality, and cultural responsiveness.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'If most clients improve after starting a therapy, that outcome proves the therapy caused their recovery.',
        repair: 'Without random assignment to a control or placebo comparison group, improvement may reflect spontaneous remission, regression to the mean, or expectancy effects.',
      },
      {
        misconception: 'Informed consent allows researchers to drop confidentiality once a participant signs the intake form.',
        repair: 'APA ethical standards require ongoing voluntary withdrawal rights, protection of participant confidentiality, and debriefing whenever minor deception is used.',
      },
    ],
  },
};

const ap_us_government_foundation_pilot = {
  'ap-usg-ch-01-section-01': {
    workedExample: {
      prompt:
        'A state passes a voter-approved ballot initiative raising the minimum wage while national business coalitions simultaneously lobby Congress to block federal increases. Identify the two democratic models illustrated.',
      steps: [
        'Step 1: Define participatory democracy (broad direct citizen involvement in policymaking) and pluralist democracy (competing organized interest groups bargaining across institutions to shape policy).',
        'Step 2: Apply each model to the scenario: the state ballot initiative lets citizens vote directly on law, whereas rival labor and business coalitions lobbying Congress exemplify group-based pluralist competition.',
        'Step 3: Conclude that U.S. governance blends democratic models—grounded in Lockean natural rights and popular sovereignty—by combining direct state-level participation with pluralist and elite pressures nationally.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The U.S. Constitution creates a direct participatory democracy at the national level through federal referendums.',
        repair: 'The Constitution establishes a representative republic; participatory mechanisms like initiatives and referendums operate at the state and local levels.',
      },
      {
        misconception: 'Pluralist democracy and elite democracy mean the same thing because both involve organized political actors.',
        repair: 'Pluralism emphasizes dispersed competition among diverse interest groups, whereas elite theory argues that wealthy or well-connected minorities dominate policy outcomes.',
      },
    ],
  },

  'ap-usg-ch-01-section-02': {
    workedExample: {
      prompt:
        'During ratification, an Anti-Federalist warns that a distant national legislature will swallow state authority via the Necessary and Proper Clause. Contrast Brutus No. 1 with Madison\'s rebuttal in Federalist No. 10.',
      steps: [
        'Step 1: Identify Brutus No. 1\'s core argument that a large republic cannot genuinely represent diverse local interests and that broad federal clauses will lead to consolidated tyranny.',
        'Step 2: Contrast this with Madison\'s Federalist No. 10: a large, extended republic dilutes the danger of majority factions by multiplying competing interests and filtering views through elected representatives.',
        'Step 3: Conclude that while Federalist No. 10 defended an extended republic alongside Federalist No. 51\'s checks and balances, Anti-Federalist critiques succeeded in securing the Bill of Rights.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'In Federalist No. 10, James Madison argues that the Constitution will eliminate political factions entirely.',
        repair: 'Madison writes that eliminating factions would destroy liberty, so an extended republic must instead control their mischievous effects through competing interests.',
      },
      {
        misconception: 'The Great Compromise settled the dispute over counting enslaved people for representation and taxation.',
        repair: 'The Great (Connecticut) Compromise created a bicameral Congress balancing population and state equality; the Three-Fifths Compromise addressed counting enslaved people.',
      },
    ],
  },

  'ap-usg-ch-01-section-03': {
    workedExample: {
      prompt:
        'Congress invokes the Commerce Clause to ban possession of electronic devices near municipal parks without showing economic impact. Evaluate the law\'s constitutionality using McCulloch v. Maryland and U.S. v. Lopez.',
      steps: [
        'Step 1: Contrast the constitutional precedents: McCulloch v. Maryland (1819) upheld broad implied powers under the Necessary and Proper Clause and Supremacy Clause, whereas United States v. Lopez (1995) limited Commerce Clause reach.',
        'Step 2: Apply Lopez\'s reasoning to the park ban: just as carrying a gun in a school zone was not an economic activity substantially affecting interstate commerce, banning park devices lacks a direct commercial nexus.',
        'Step 3: Conclude that the Supreme Court would likely strike down the statute as exceeding Congress\'s enumerated commerce power and intruding on state police powers reserved under the Tenth Amendment.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Categorical grants give states broad discretion to spend federal dollars however state officials prefer.',
        repair: 'Categorical grants carry strict federal conditions and narrow spending rules; block grants give states broader flexibility within a general policy area.',
      },
      {
        misconception: 'United States v. Lopez expanded Congress\'s implied powers under the Necessary and Proper Clause.',
        repair: 'McCulloch v. Maryland expanded implied federal powers, whereas United States v. Lopez curbed Congress by ruling the Gun-Free School Zones Act exceeded Commerce Clause limits.',
      },
    ],
  },

  'ap-usg-ch-02-section-01': {
    workedExample: {
      prompt:
        'A partisan energy bill passes the House in two days under a closed rule, then stalls for months in the Senate despite 54 senators supporting it. Explain how chamber rules produce this divergence.',
      steps: [
        'Step 1: Identify institutional differences between chambers: the House Rules Committee sets strict debate time and amendment limits (closed rules), while the Senate allows unlimited debate and amendments.',
        'Step 2: Apply Senate procedure: a minority can mount a filibuster or place a hold, requiring 60 senators to invoke cloture before a simple majority of 54 can bring the bill to a final floor vote.',
        'Step 3: Conclude that bicameralism and distinct chamber rules make the House majoritarian and rapid while turning the Senate into a deliberative body that empowers minority bargaining.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'A filibuster can be used by minority-party members in both the House of Representatives and the Senate.',
        repair: 'Only the Senate permits filibusters due to its tradition of unlimited debate; the House Rules Committee tightly caps debate time on bills.',
      },
      {
        misconception: 'Congress can easily slash mandatory spending like Social Security during annual discretionary appropriations.',
        repair: 'Mandatory spending is governed by permanent entitlement formulas, so reducing it requires amending underlying eligibility statutes rather than routine annual appropriations.',
      },
    ],
  },

  'ap-usg-ch-02-section-02': {
    workedExample: {
      prompt:
        'After Congress rejects a border funding bill, the president issues an executive order redirecting agency funds, and a federal court enjoins the order. Connect Federalist No. 70, Federalist No. 78, and Marbury v. Madison.',
      steps: [
        'Step 1: Cite Federalist No. 70\'s defense of an energetic single executive able to act decisively alongside Federalist No. 78\'s vision of an independent judiciary guarding constitutional limits.',
        'Step 2: Apply Marbury v. Madison (1803) and separation of powers: while presidents use executive orders to direct agencies, judicial review empowers courts to invalidate executive actions exceeding statutory or Article I appropriations authority.',
        'Step 3: Conclude that constitutional checks balance executive energy with congressional power of the purse and judicial review, though courts still rely on executive enforcement and respect stare decisis.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Executive orders carry the same permanence as federal statutes and cannot be undone by future presidents.',
        repair: 'Executive orders rest on constitutional or delegated statutory authority; a future president can revoke them immediately, and Congress or courts can override them.',
      },
      {
        misconception: 'Judicial review is explicitly enumerated in Article III of the original U.S. Constitution.',
        repair: 'Article III does not name judicial review directly; Chief Justice Marshall established it as constitutional doctrine in Marbury v. Madison, building on Federalist No. 78.',
      },
    ],
  },

  'ap-usg-ch-02-section-03': {
    workedExample: {
      prompt:
        'Following a clean-water statute, the EPA publishes a proposed chemical limit for public comment, while an industry group urges a House oversight subcommittee to cut the agency\'s enforcement budget. Explain the policy dynamics.',
      steps: [
        'Step 1: Identify bureaucratic discretionary rulemaking under notice-and-comment procedures alongside congressional oversight through the power of the purse and committee hearings.',
        'Step 2: Trace the iron triangle / issue network interactions: Congress delegates technical implementation to agency experts, regulated industries participate in comment periods, and oversight committees check agency discretion.',
        'Step 3: Conclude that bureaucratic accountability operates through competing access points—statutes, appropriations, presidential appointments, and judicial review of arbitrary rules—rather than agency autonomy alone.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Federal agencies pass their own independent laws without needing any statutory authority from Congress.',
        repair: 'Agencies exercise delegated discretionary authority granted by congressional statutes, and courts strike down regulations that exceed their statutory mandate.',
      },
      {
        misconception: 'The president can fire the head of any federal bureaucratic agency at will without legal restriction.',
        repair: 'Cabinet secretaries serve at the president\'s pleasure, but heads of independent regulatory commissions generally have statutory for-cause removal protections.',
      },
    ],
  },

  'ap-usg-ch-03-section-01': {
    workedExample: {
      prompt:
        'A public high school principal suspends students for wearing silent blue ribbons protesting a state tax policy, even though classes continue without disruption. Analyze the suspension using Tinker v. Des Moines.',
      steps: [
        'Step 1: Identify the constitutional issue as symbolic political speech protected under the First Amendment Free Speech Clause, incorporated against public school officials via the Fourteenth Amendment.',
        'Step 2: Apply the Tinker v. Des Moines (1969) standard: public schools may not censor non-disruptive student symbolic speech unless officials show evidence of a material and substantial disruption to schoolwork.',
        'Step 3: Conclude that because silent ribbons caused no classroom disorder, the suspension violates the First Amendment—unlike school-sponsored prayer barred under the Establishment Clause in Engel v. Vitale.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Engel v. Vitale banned individual students from praying privately or voluntarily on public school grounds.',
        repair: 'Engel v. Vitale barred state-sponsored, official school prayer under the Establishment Clause; voluntary, non-disruptive private student prayer remains protected.',
      },
      {
        misconception: 'Civil liberties and civil rights are interchangeable terms referring to government welfare programs.',
        repair: 'Civil liberties protect individual freedoms from government intrusion (such as speech or religion), whereas civil rights protect groups from unequal treatment or discrimination.',
      },
    ],
  },

  'ap-usg-ch-03-section-02': {
    workedExample: {
      prompt:
        'A city bans residents from keeping handguns at home for self-defense, arguing the Second Amendment restricts only Congress. Evaluate the city\'s defense using McDonald v. Chicago and selective incorporation.',
      steps: [
        'Step 1: Identify the constitutional doctrine of selective incorporation through the Fourteenth Amendment\'s Due Process Clause, which applies fundamental Bill of Rights protections to state and local governments.',
        'Step 2: Apply McDonald v. Chicago (2010): the Supreme Court held that the Second Amendment right to keep and bear arms for self-defense is fundamental and therefore binds states and municipalities, not just Congress.',
        'Step 3: Conclude that the city\'s defense fails under McDonald, just as Gideon v. Wainwright (1963) incorporated the Sixth Amendment right to counsel to guarantee procedural due process in state felony trials.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Selective incorporation applied the entire Bill of Rights to every state in one single Supreme Court decision.',
        repair: 'The Court incorporated specific fundamental rights gradually, case by case, through the Fourteenth Amendment\'s Due Process Clause—and some provisions remain unincorporated.',
      },
      {
        misconception: 'Procedural due process and substantive due process ask the exact same legal question about a statute.',
        repair: 'Procedural due process examines whether the government used fair steps (notice, counsel, hearing), whereas substantive due process asks whether the law infringes a fundamental right itself.',
      },
    ],
  },

  'ap-usg-ch-03-section-03': {
    workedExample: {
      prompt:
        'A state maintains separate public law schools for Black and white students and argues facilities are equal. Connect Brown v. Board of Education, the Fourteenth Amendment, and Letter from Birmingham Jail.',
      steps: [
        'Step 1: Identify the Fourteenth Amendment\'s Equal Protection Clause and the holding of Brown v. Board of Education (1954), which overturned Plessy v. Ferguson\'s "separate but equal" doctrine in public education.',
        'Step 2: Apply constitutional reasoning and social-movement context: state-mandated racial segregation is inherently unequal, and as Dr. King argued in Letter from Birmingham Jail, nonviolent direct action pressures stalled institutions to enforce equal rights.',
        'Step 3: Conclude that the separate law school violates the Equal Protection Clause, illustrating how litigation, grassroots organizing, and statutes like the Civil Rights Act of 1964 jointly advance minority rights.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Brown v. Board of Education immediately integrated all Southern public schools in the autumn of 1954.',
        repair: 'Massive resistance delayed desegregation for years until federal enforcement, the Civil Rights Act of 1964, and later court mandates compelled compliance.',
      },
      {
        misconception: 'The Equal Protection Clause forbids the government from ever classifying citizens into different legal groups.',
        repair: 'Government routinely classifies citizens (such as driving ages); courts apply strict scrutiny to suspect classes like race, while routine laws only need a rational basis.',
      },
    ],
  },

  'ap-usg-ch-04-section-01': {
    workedExample: {
      prompt:
        'Survey data show voters who came of age during the 2008 recession favor stronger financial regulation across decades, while children of partisan activists mirror their parents\' party ID. Explain both socialization forces.',
      steps: [
        'Step 1: Identify political socialization as the lifelong process through which individuals acquire political attitudes, distinguishing family transmission from generational and lifecycle effects.',
        'Step 2: Apply the evidence: parental modeling is the strongest early agent of partisan identity, while major historical events during young adulthood create lasting generational cohort impressions.',
        'Step 3: Conclude that durable American political culture values—such as individualism and equality of opportunity—interact with family, peers, media, and formative events to produce diverging policy priorities.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'American political culture means almost all citizens hold the same liberal or conservative policy preferences.',
        repair: 'Political culture refers to shared core ideals like rule of law and liberty, which liberals and conservatives interpret differently in concrete policy debates.',
      },
      {
        misconception: 'Lifecycle effects and generational effects describe the same cause of attitude differences between age groups.',
        repair: 'Lifecycle effects arise from aging milestones like retirement or homeownership, whereas generational effects stem from shared historical events experienced during youth.',
      },
    ],
  },

  'ap-usg-ch-04-section-02': {
    workedExample: {
      prompt:
        'A national random-sample poll of 1,000 likely voters shows Candidate A at 51% and Candidate B at 48% with a +/-3% margin of error, while an online click poll gives Candidate A 74%. Evaluate both polls.',
      steps: [
        'Step 1: Check scientific polling standards: probability sampling, representative weighting, neutral question wording, and margin of error (sampling error).',
        'Step 2: Compare the two datasets: the +/-3% margin means Candidate A\'s true support lies roughly between 48% and 54% and Candidate B\'s between 45% and 51% (a statistical tie), whereas the online click poll suffers severe self-selection bias.',
        'Step 3: Conclude that journalists cannot call Candidate A the leader from the scientific poll because intervals overlap, and must discard the unscientific online poll entirely.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'A 3-percentage-point lead in a poll with a +/-3% margin of error guarantees the leading candidate is ahead.',
        repair: 'Each candidate\'s estimate carries +/-3% uncertainty, so overlapping intervals (48%-54% vs. 45%-51%) indicate a statistical dead heat rather than a clear lead.',
      },
      {
        misconception: 'Surveying 50,000 volunteers on a website is more accurate than a random probability sample of 1,000 adults.',
        repair: 'A larger non-random sample only magnifies selection bias; scientific accuracy depends on random probability sampling and unbiased question wording, not raw click volume.',
      },
    ],
  },

  'ap-usg-ch-04-section-03': {
    workedExample: {
      prompt:
        'During an economic downturn, one senator proposes cutting corporate taxes and easing regulations, while another advocates federally funded infrastructure jobs alongside Federal Reserve rate cuts. Distinguish the policy frameworks.',
      steps: [
        'Step 1: Distinguish fiscal policy (Congress and the president adjusting taxes and federal spending) from monetary policy (the independent Federal Reserve adjusting interest rates and money supply).',
        'Step 2: Connect proposals to ideology: cutting taxes and deregulating reflects conservative supply-side theory favoring private markets, whereas deficit-financed public jobs reflect liberal Keynesian demand-side fiscal stimulus.',
        'Step 3: Conclude that ideological coalitions battle over fiscal tools in Congress, while the Federal Reserve operates independently to balance inflation and employment through monetary policy.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Congress and the president directly set interest rates as part of annual federal fiscal policy.',
        repair: 'Fiscal policy involves taxing and spending by Congress and the president; the independent Federal Reserve conducts monetary policy via interest rates and money supply.',
      },
      {
        misconception: 'Libertarians agree with conservatives on both free-market economics and government enforcement of social norms.',
        repair: 'Libertarians favor minimal government in both economic and personal spheres, aligning with conservatives on markets but often with liberals on personal autonomy.',
      },
    ],
  },

  'ap-usg-ch-05-section-01': {
    workedExample: {
      prompt:
        'After a state adopts automatic voter registration and mail-in ballots, turnout rises among young voters—who vote against the incumbent governor after two years of rising rent. Identify the voting model and institutional factor.',
      steps: [
        'Step 1: Identify structural voting access rules (registration reforms reducing voting costs) alongside the retrospective voting model (evaluating incumbents based on recent economic performance).',
        'Step 2: Connect institutional rules to participation: automatic registration and mail ballots lower administrative barriers that historically depressed youth turnout, while punishing the governor over rent hikes exemplifies retrospective judgment.',
        'Step 3: Conclude that turnout depends on both demographic traits and state election laws, and voters combine retrospective, prospective, rational-choice, and party-line cues at the ballot box.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The Fifteenth and Nineteenth Amendments alone immediately eliminated all state barriers to voting.',
        repair: 'Poll taxes, literacy tests, and intimidation persisted for decades until the Twenty-Fourth Amendment and the Voting Rights Act of 1965 enforced federal voting access.',
      },
      {
        misconception: 'Prospective voting means rewarding or punishing an incumbent solely for their past record in office.',
        repair: 'Judging an incumbent by past performance is retrospective voting; prospective voting chooses candidates based on expected future policies and promises.',
      },
    ],
  },

  'ap-usg-ch-05-section-02': {
    workedExample: {
      prompt:
        'An environmental group struggles to recruit dues-paying members despite broad support for clean air, so it offers member-only park tours and files federal amicus briefs. Explain both strategies.',
      steps: [
        'Step 1: Identify the free-rider problem facing public-interest groups and the selective benefits used to overcome it, plus litigation via amicus curiae ("friend of the court") briefs.',
        'Step 2: Apply interest-group theory: because clean air is a non-excludable collective good, exclusive park tours create a material/solidary incentive to join, while amicus briefs supply legal arguments to judges.',
        'Step 3: Conclude that unlike political parties—which nominate candidates to win elections across broad coalitions—interest groups focus on narrow policy goals through lobbying, selective incentives, and litigation.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Interest groups and political parties perform the exact same primary function of running candidates on ballots.',
        repair: 'Political parties nominate candidates under a party label to win office and govern, whereas interest groups seek to influence policy without formally running candidates.',
      },
      {
        misconception: 'Lobbying consists mainly of bribing lawmakers with personal cash payments in exchange for votes.',
        repair: 'Direct bribery is illegal; lobbying primarily involves providing specialized policy research, constituent mobilization, draft bill language, and legal campaign support.',
      },
    ],
  },

  'ap-usg-ch-05-section-03': {
    workedExample: {
      prompt:
        'A presidential nominee campaigns heavily in six swing states, supported by a Super PAC spending unlimited funds independently on TV ads that trigger cable news coverage of inflation. Explain the rules and media effect.',
      steps: [
        'Step 1: Identify the winner-take-all Electoral College incentive, independent expenditures enabled by Citizens United v. FEC (2010), and media agenda setting.',
        'Step 2: Apply constitutional and electoral rules: winner-take-all state allocation concentrates visits in competitive battlegrounds, Citizens United protected corporate/union independent spending as First Amendment speech (without direct candidate coordination), and intensive coverage elevates inflation as a top voter priority.',
        'Step 3: Conclude that electoral math, campaign finance doctrine, and fragmented news media jointly dictate where candidates campaign, how outside groups spend, and which issues dominate voter evaluations.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Citizens United v. FEC eliminated all federal limits on direct donations from corporations to candidates.',
        repair: 'Citizens United protected unlimited independent expenditures by corporations, unions, and Super PACs, while leaving bans on direct corporate donations to campaigns intact.',
      },
      {
        misconception: 'Horse-race journalism focuses deeply on comparing candidates\' detailed legislative policy platforms.',
        repair: 'Horse-race journalism emphasizes polling margins, fundraising totals, and campaign strategy—who is winning or losing—often crowding out substantive policy analysis.',
      },
    ],
  },
};

const ap_us_history_foundation_pilot = {
  'apush-ch-01-section-01': {
    workedExample: {
      prompt:
        'Compare how the Pueblo peoples of the arid Southwest and the Haudenosaunee (Iroquois) of the Eastern Woodlands adapted politically and economically to their environments before 1492.',
      steps: [
        'Step 1: Contextualize pre-Columbian North America as home to hundreds of distinct Indigenous nations whose societies reflected both ecological adaptation and deliberate political choices.',
        'Step 2: Apply historical comparison: Pueblo communities built irrigation canals and adobe towns anchored in maize farming, whereas the Haudenosaunee combined Three Sisters agriculture with hunting, longhouse villages, and a five-nation political confederacy.',
        'Step 3: Conclude that maize spread supported sedentary life in both regions, yet distinct political institutions and resource strategies refute any single homogeneous model of "Native society."',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Before 1492, Indigenous peoples across North America lived uniformly as small nomadic hunting bands.',
        repair: 'Pre-Columbian societies ranged from permanent farming cities like Cahokia and Pueblo towns to semi-sedentary woodlands confederacies and mobile Plains hunters.',
      },
      {
        misconception: 'Environment alone completely determined every political and cultural practice of Indigenous nations.',
        repair: 'Ecology shaped available resources, but Indigenous peoples actively modified landscapes (such as controlled burns and irrigation) and built varied diplomatic systems.',
      },
    ],
  },

  'apush-ch-01-section-02': {
    workedExample: {
      prompt:
        'A 1493 letter from Christopher Columbus to Spanish royal officials promises vast gold reserves and rapid Christian conversion in the Caribbean. Analyze how audience and purpose shape this source for an APUSH DBQ.',
      steps: [
        'Step 1: Situate the letter within early European Atlantic expansion driven by state competition, bullion-seeking mercantilism, Catholic missionary zeal, and maritime innovations like the caravel and astrolabe.',
        'Step 2: Apply HIPP sourcing (audience and purpose): writing directly to patrons King Ferdinand and Queen Isabella, Columbus had strong financial incentives to exaggerate gold abundance and portray Taíno peoples as easily subordinated.',
        'Step 3: Conclude that while the letter accurately reveals Spanish imperial motives ("gold, God, and glory"), historians must cross-check its claims against evidence of Taíno resistance and demographic realities.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'European voyages to the Americas began simply out of disinterested scientific curiosity about geography.',
        repair: 'Exploration was financed primarily by competing monarchs and merchants seeking Asian trade routes, precious metals, territorial prestige, and Catholic expansion.',
      },
      {
        misconception: 'European technological advantages meant Indigenous polities played no active role in early conquest.',
        repair: 'Spanish forces relied heavily on Indigenous allies—such as Tlaxcalans opposing the Aztec Empire—alongside epidemic disease to topple major American states.',
      },
    ],
  },

  'apush-ch-01-section-03': {
    workedExample: {
      prompt:
        'Explain one demographic consequence in the Americas and one economic consequence in Europe or Africa resulting from the Columbian Exchange and Spanish colonial labor systems between 1492 and 1607.',
      steps: [
        'Step 1: Identify the Columbian Exchange as an asymmetrical transatlantic transfer of pathogens, crops, livestock, and coerced labor linked directly to European conquest.',
        'Step 2: Apply historical causation: Old World diseases such as smallpox decimated Indigenous populations lacking immunity, while American silver and nutrient-dense crops (potatoes, maize) fueled European population growth and helped drive demand for enslaved African labor as encomienda labor collapsed.',
        'Step 3: Conclude that "exchange" obscures violent coercion: biological devastation, racialized casta hierarchies, and the transatlantic slave trade were intertwined engines of Atlantic colonial wealth.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The Columbian Exchange benefited Indigenous Americans and Europeans roughly equally through mutual trade.',
        repair: 'While New World crops boosted Old World populations, introduced Old World diseases and forced labor systems caused catastrophic Indigenous demographic collapse.',
      },
      {
        misconception: 'Spanish colonists abandoned coerced labor immediately after Bartolomé de las Casas criticized the encomienda.',
        repair: 'Reform laws like the New Laws of 1542 faced colonial resistance; Spain shifted toward the repartimiento and expanded African chattel slavery rather than ending coercion.',
      },
    ],
  },

  'apush-ch-02-section-01': {
    workedExample: {
      prompt:
        'Compare the demographic patterns and labor economies of the Chesapeake and New England colonies between 1607 and 1700, explaining one major cause of their divergence.',
      steps: [
        'Step 1: Anchor the comparison in Period 2 British colonial regionalization: Virginia/Maryland (Chesapeake) versus Massachusetts Bay/Plymouth (New England).',
        'Step 2: Trace causal mechanisms: the Chesapeake\'s warm climate and fertile soil drew predominantly young single male migrants to cultivate cash-crop tobacco using indentured servants and increasingly enslaved Africans, while New England\'s rocky soil and Puritan religious motives produced family migration, longer lifespans, town meetings, and mixed farming/maritime trade.',
        'Step 3: Conclude that differing founding motives, migration demographics, and local ecologies produced sharply contrasting social hierarchies and community institutions across British North America.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Puritans migrated to Massachusetts Bay to establish universal religious freedom for every denomination.',
        repair: 'Puritans sought freedom to practice their own Reformed faith and expelled dissenters like Roger Williams and Anne Hutchinson to preserve religious orthodoxy.',
      },
      {
        misconception: 'Enslaved Africans formed the majority labor force in Jamestown immediately upon the colony\'s founding in 1607.',
        repair: 'Chesapeake tobacco planters relied primarily on white indentured servants through most of the 1600s, shifting decisively to African chattel slavery after Bacon\'s Rebellion (1676).',
      },
    ],
  },

  'apush-ch-02-section-02': {
    workedExample: {
      prompt:
        'Explain why British Navigation Acts passed in the 1650s–1660s did not prevent widespread colonial smuggling or the growth of colonial self-government before 1754.',
      steps: [
        'Step 1: Define mercantilism as an imperial policy aiming to enrich the mother country by channeling colonial raw materials and trade exclusively through British ships and ports.',
        'Step 2: Distinguish statutory regulation from actual enforcement: because Britain was preoccupied with European wars and domestic politics, it practiced "salutary neglect," allowing colonial merchants to trade illicitly and colonial assemblies to exercise de facto tax power.',
        'Step 3: Conclude that lax imperial enforcement before 1754 fostered colonial economic autonomy and political expectations of self-rule, setting up sharp conflict once Britain tightened enforcement after 1763.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Salutary neglect meant Britain had passed no trade regulations governing its American colonies before 1763.',
        repair: 'Parliament enacted strict Navigation Acts starting in 1651, but imperial officials enforced them inconsistently during periods of salutary neglect.',
      },
      {
        misconception: 'Mercantilism encouraged free trade so colonies could buy and sell freely with any European empire.',
        repair: 'Mercantilism restricted colonial commerce to benefit the imperial center, requiring enumerated goods like tobacco and sugar to ship through British ports.',
      },
    ],
  },

  'apush-ch-02-section-03': {
    workedExample: {
      prompt:
        'Analyze how Virginia\'s 1662 hereditary slavery statute and the 1739 Stono Rebellion together demonstrate both legal entrenchment of chattel slavery and enslaved people\'s resistance.',
      steps: [
        'Step 1: Identify the legal transformation of slavery in British North America through statutes like Virginia\'s 1662 law (partus sequitur ventrem), which made a child\'s enslaved status follow the mother\'s condition.',
        'Step 2: Balance structure with agency: codifying hereditary racialized bondage secured planter wealth, yet enslaved Africans resisted both overtly—as in South Carolina\'s armed 1739 Stono Rebellion—and covertly through work slowdowns, flight, and preserving Gullah linguistic and cultural traditions.',
        'Step 3: Conclude that colonial slave codes grew harsher precisely in response to ongoing enslaved resistance, revealing a continuous struggle over labor, autonomy, and survival.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Slavery in colonial America was confined exclusively to the Southern plantation colonies.',
        repair: 'Slavery was legal in all thirteen British colonies; Northern port cities like New York and Newport also relied on enslaved labor and profited heavily from Atlantic slave commerce.',
      },
      {
        misconception: 'Because armed revolts like Stono were rare, enslaved people generally accepted bondage without resistance.',
        repair: 'Overt rebellions carried lethal odds, so enslaved people resisted daily through feigned illness, tool breaking, escape, clandestine literacy, and cultural retention.',
      },
    ],
  },

  'apush-ch-03-section-01': {
    workedExample: {
      prompt:
        'Explain how Britain\'s victory in the Seven Years\' War (1754–1763) transformed imperial policy and turned colonial disputes over parliamentary taxation into a constitutional crisis.',
      steps: [
        'Step 1: Contextualize the 1763 turning point: expelling France from mainland North America left Britain with massive war debt and vast western lands requiring defense against Indigenous coalitions like Pontiac\'s Rebellion.',
        'Step 2: Trace causation: Britain ended salutary neglect through the Proclamation of 1763 and direct revenue taxes (Stamp Act, Townshend Acts), which colonists opposed by rejecting Parliament\'s claim of "virtual representation" in favor of consent through local assemblies.',
        'Step 3: Conclude that colonial resistance escalated from petitions and boycotts to independence because colonists viewed unconsented taxation as a threat to English constitutional liberties, even while women, Indigenous nations, and enslaved people remained largely excluded.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'American colonists rebelled primarily because British tax rates were higher than taxes paid in Britain.',
        repair: 'Colonists paid lower taxes than Britons at home; the core dispute was constitutional authority—whether an unrepresented Parliament could levy direct revenue taxes.',
      },
      {
        misconception: 'Most colonists demanded complete independence from Britain immediately after the Stamp Act of 1765.',
        repair: 'Throughout the 1760s and early 1770s, most Patriots sought reconciliation and restoration of rights within the British Empire until bloodshed and Common Sense shifted opinion in 1776.',
      },
    ],
  },

  'apush-ch-03-section-02': {
    workedExample: {
      prompt:
        'Evaluate how Shays\' Rebellion (1786–1787) exposed structural weaknesses of the Articles of Confederation and shaped the compromises embedded in the 1787 U.S. Constitution.',
      steps: [
        'Step 1: Identify key structural limits of the Articles of Confederation: a unicameral Congress lacking the power to levy taxes, regulate interstate commerce, or maintain a standing national force—despite achieving the Northwest Ordinance of 1787.',
        'Step 2: Connect Shays\' Rebellion to constitutional reform: indebted Massachusetts farmers shutting down courts alarmed elites who feared federal helplessness, prompting the Philadelphia Convention to craft a stronger central government balanced by federalism, separation of powers, the Great Compromise, and the Three-Fifths Compromise.',
        'Step 3: Conclude that while the Constitution stabilized national finance and authority, its compromises protected slavery and left political citizenship restricted mostly to propertied white men.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The Articles of Confederation achieved nothing positive and failed in every policy domain before 1787.',
        repair: 'Despite fiscal flaws, the Confederation Congress ended the Revolutionary War and passed the Northwest Ordinance (1787), organizing western lands and banning slavery there.',
      },
      {
        misconception: 'The Declaration of Independence served as the binding legal constitution of the United States after 1776.',
        repair: 'The Declaration stated revolutionary ideals and justified separation; the Articles of Confederation (1781) and later the U.S. Constitution (1789) established national governing law.',
      },
    ],
  },

  'apush-ch-03-section-03': {
    workedExample: {
      prompt:
        'Compare the positions of Alexander Hamilton\'s Federalists and Thomas Jefferson\'s Democratic-Republicans regarding the First Bank of the United States and the French Revolution in the 1790s.',
      steps: [
        'Step 1: Frame the First Party System around competing visions of constitutional interpretation, political economy, and foreign alignment during Washington\'s and Adams\'s presidencies.',
        'Step 2: Compare both issues precisely: Hamilton invoked loose construction (Necessary and Proper Clause) to charter a national bank promoting commerce and favored British trade stability, whereas Jefferson favored strict construction, an agrarian republic, and sympathy for revolutionary France.',
        'Step 3: Conclude that domestic economic policy and European wars reinforced each other to solidify durable political parties, culminating in the Alien and Sedition Acts crisis and the peaceful 1800 transfer of power.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The Federalist Party of the 1790s and the Democratic-Republicans map neatly onto today\'s exact party platforms.',
        repair: 'First Party System divisions centered on 1790s banking, strict vs. loose construction, and Britain vs. France, and should never be equated simplistically with modern parties.',
      },
      {
        misconception: 'George Washington\'s Farewell Address permanently kept the United States isolated from all international trade.',
        repair: 'Washington warned against permanent political and military alliances—especially in European wars—while explicitly supporting commercial trade relations abroad.',
      },
    ],
  },

  'apush-ch-04-section-01': {
    workedExample: {
      prompt:
        'Analyze how the completion of the Erie Canal (1825) and the spread of the cotton gin reshaped regional economic specialization and household labor in the United States between 1800 and 1848.',
      steps: [
        'Step 1: Define the Market Revolution as the integration of transportation (canals, steamboats, railroads), communication (telegraph), and factory production linking once-local economies into national markets.',
        'Step 2: Trace regional causation: the Erie Canal slashed shipping costs between Midwestern grain farms and Northeastern cities like New York, while Eli Whitney\'s cotton gin expanded enslaved-labor cotton production in the South that supplied Northern textile mills such as Lowell.',
        'Step 3: Conclude that market integration heightened regional interdependence while deepening sectional divides over wage labor versus enslaved labor and separating paid workplace production from the middle-class domestic sphere.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The Market Revolution transformed only the industrial North while leaving the agricultural South isolated.',
        repair: 'Southern cotton plantations were deeply integrated into the Market Revolution, supplying Northern and British mills and relying on Northern shipping, credit, and insurance.',
      },
      {
        misconception: 'Eli Whitney\'s cotton gin reduced the South\'s reliance on enslaved labor by making cotton processing easier.',
        repair: 'By making short-staple cotton hugely profitable, the cotton gin dramatically accelerated westward plantation expansion and the domestic slave trade.',
      },
    ],
  },

  'apush-ch-04-section-02': {
    workedExample: {
      prompt:
        'Evaluate the extent to which the Age of Jackson (1824–1840) expanded American democracy, using universal white male suffrage, the Bank War, and the Indian Removal Act (1830) as evidence.',
      steps: [
        'Step 1: Establish a nuanced APUSH thesis recognizing real democratic expansion for white men alongside sharp executive centralization and racial/gender exclusion.',
        'Step 2: Weigh contrasting evidence: states dropped property requirements for white male voters and fostered mass campaigning, yet Jackson vetoed the Second Bank of the United States as an aristocratic monopoly while enforcing the Indian Removal Act despite Cherokee legal victory in Worcester v. Georgia (1832).',
        'Step 3: Conclude that Jacksonian democracy widened white male political participation while simultaneously disenfranchising free Black men in several states, excluding women, and violently dispossessing Indigenous nations on the Trail of Tears.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Andrew Jackson supported weak executive power and strict states\' rights in every constitutional conflict.',
        repair: 'While Jackson opposed federal internal improvements and the national bank, he forcefully asserted federal supremacy against South Carolina during the Nullification Crisis.',
      },
      {
        misconception: 'Expanded white male suffrage during the 1820s–1830s coincided with expanding voting rights for free Black men and women.',
        repair: 'As states eliminated property tests for white men, several Northern states simultaneously added explicit racial or gender restrictions stripping free Black men of the vote.',
      },
    ],
  },

  'apush-ch-04-section-03': {
    workedExample: {
      prompt:
        'Explain how the Second Great Awakening catalyzed both the immediate abolition movement and the early women\'s rights movement culminating in the 1848 Seneca Falls Convention.',
      steps: [
        'Step 1: Contextualize the Second Great Awakening as an evangelical revival emphasizing free will, moral perfectionism, and individual responsibility to combat social sin.',
        'Step 2: Trace causal links across reform networks: inspired by revivalist morality, activists like William Lloyd Garrison, Frederick Douglass, and Angelina Grimké formed voluntary societies demanding immediate emancipation, while women barred from speaking or leadership at antislavery conventions organized the Seneca Falls Declaration of Sentiments.',
        'Step 3: Conclude that religious revivalism supplied rhetoric and organizational tools for antebellum reform, though entrenched legal patriarchy and Southern proslavery defense prevented immediate structural equality.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Most antebellum Northern whites supported immediate abolition and racial equality by the 1830s.',
        repair: 'Immediate abolitionists were an unpopular minority even in the North, frequently facing anti-abolitionist mobs, press destruction, and congressional gag rules.',
      },
      {
        misconception: 'The Seneca Falls Convention of 1848 quickly secured women\'s suffrage across the Northern states.',
        repair: 'Seneca Falls launched an organized national women\'s rights movement, but nationwide women\'s suffrage was not achieved until the Nineteenth Amendment in 1920.',
      },
    ],
  },

  'apush-ch-05-section-01': {
    workedExample: {
      prompt:
        'Explain how the Mexican-American War (1846–1848) and the Kansas-Nebraska Act (1854) turned territorial expansion into an irreconcilable sectional crisis over slavery.',
      steps: [
        'Step 1: Contextualize Manifest Destiny as an ideology justifying westward expansion across Indigenous and Mexican lands, reopening the dormant federal question of slavery in new territories.',
        'Step 2: Trace escalation: the Mexican Cession provoked the Wilmot Proviso and fragile Compromise of 1850 (with its harsh Fugitive Slave Act), while the 1854 Kansas-Nebraska Act repealed the Missouri Compromise line via popular sovereignty, triggering "Bleeding Kansas" and shattering the Second Party System.',
        'Step 3: Conclude that legislative compromises temporarily postponed secession while inflaming distrust—especially after Dred Scott v. Sandford (1857) denied Congress power to ban slavery in territories and fueled the rise of the Republican Party.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The Compromise of 1850 resolved sectional tensions permanently until Abraham Lincoln\'s election in 1860.',
        repair: 'The Compromise of 1850 deepened Northern outrage through the stricter Fugitive Slave Act, and the 1854 Kansas-Nebraska Act quickly unraveled its fragile truce.',
      },
      {
        misconception: 'The newly formed Republican Party of the 1850s ran on immediately abolishing slavery inside Southern states.',
        repair: 'The Free-Soil Republican platform opposed the expansion of slavery into western territories, stopping short of immediate constitutional abolition in existing slave states.',
      },
    ],
  },

  'apush-ch-05-section-02': {
    workedExample: {
      prompt:
        'Analyze how the Emancipation Proclamation (1863) and African American military service transformed Union war aims and laid the groundwork for the Thirteenth Amendment (1865).',
      steps: [
        'Step 1: Situate Union war aims in 1861 as preserving the Union, before wartime realities and self-emancipation by enslaved people fleeing to Union lines forced policy evolution.',
        'Step 2: Apply strategic and constitutional analysis: issued under Lincoln\'s commander-in-chief war powers, the Emancipation Proclamation freed enslaved people in rebelling states (sparing loyal border states), deterred British/French intervention, and authorized nearly 200,000 Black soldiers in the U.S. Colored Troops.',
        'Step 3: Conclude that because a wartime proclamation might be challenged after peace, Congress and the states ratified the Thirteenth Amendment to abolish slavery permanently nationwide.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The Emancipation Proclamation immediately freed every enslaved person across the entire United States in 1863.',
        repair: 'As a military war measure, the Proclamation applied only to rebelling Confederate areas, excluding loyal Union border states until the Thirteenth Amendment passed in 1865.',
      },
      {
        misconception: 'Enslaved people waited passively for Union politicians to grant them freedom during the Civil War.',
        repair: 'Hundreds of thousands self-emancipated by fleeing to Union lines ("contrabands"), depriving the Confederacy of labor and pressing federal officials toward emancipation.',
      },
    ],
  },

  'apush-ch-05-section-03': {
    workedExample: {
      prompt:
        'Evaluate continuity and change in the citizenship rights of African Americans during Reconstruction (1865–1877), contrasting constitutional amendments with postwar Southern realities.',
      steps: [
        'Step 1: Identify transformative legal change: the Fourteenth Amendment guaranteed birthright citizenship and equal protection, while the Fifteenth Amendment barred racial restrictions on male suffrage, enabling Black voters to elect hundreds of officeholders and build churches and schools.',
        'Step 2: Trace persistent structural limits and backlash: sharecropping trapped many freedpeople in debt, while Black Codes, Ku Klux Klan terror, restrictive Supreme Court rulings, and fading Northern resolve undermined enforcement.',
        'Step 3: Conclude that although the Compromise of 1877 ended federal military protection and ushered in Jim Crow disenfranchisement, the Reconstruction Amendments remained enduring constitutional tools for twentieth-century civil rights victories.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The Fifteenth Amendment granted voting rights to all formerly enslaved people regardless of gender.',
        repair: 'The Fifteenth Amendment barred voting discrimination by race, color, or previous servitude, but omitted sex—splitting the women\'s suffrage movement over ratification.',
      },
      {
        misconception: 'Reconstruction failed simply because freedpeople lacked political organization or educational initiative.',
        repair: 'Freedpeople rapidly built schools, churches, and high voter turnout; Reconstruction collapsed due to violent white Southern Redeemer terrorism and Northern political retreat.',
      },
    ],
  },

  'apush-ch-06-section-01': {
    workedExample: {
      prompt:
        'Explain how federal railroad subsidies, the Homestead Act (1862), and the Dawes Severalty Act (1887) worked together to transform the American West and erode Indigenous sovereignty.',
      steps: [
        'Step 1: Reject the "empty frontier" myth by situating the post-Civil War West as home to sovereign Plains and Southwestern Indigenous nations targeted by coordinated federal expansion policies.',
        'Step 2: Connect economic policy to dispossession: Pacific Railway Act land grants linked western ranches, mines, and Homestead farms to Eastern markets while accelerating bison slaughter, and the Dawes Act broke up communal tribal reservations into individual plots to force assimilation and sell "surplus" land to settlers.',
        'Step 3: Conclude that western settlement was heavily state-sponsored rather than purely rugged individualism, stripping roughly two-thirds of remaining tribal lands by the early twentieth century despite Indigenous military and cultural resistance.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Western expansion succeeded purely through laissez-faire private initiative without federal government help.',
        repair: 'Federal land grants to railroads, Homestead allotments, and U.S. Army campaigns against Indigenous nations were decisive state interventions driving western settlement.',
      },
      {
        misconception: 'The Dawes Act of 1887 protected tribal land ownership by guaranteeing communal reservations in perpetuity.',
        repair: 'The Dawes Act dismantled communal tribal landholding into individual allotments to compel assimilation, transferring tens of millions of acres out of Indigenous control.',
      },
    ],
  },

  'apush-ch-06-section-02': {
    workedExample: {
      prompt:
        'Compare vertical integration under Andrew Carnegie with horizontal integration under John D. Rockefeller, and explain how rapid industrial growth reshaped Gilded Age cities.',
      steps: [
        'Step 1: Define corporate consolidation strategies of the Second Industrial Revolution: Carnegie Steel controlled every production stage from iron mines to railroads (vertical integration), while Standard Oil absorbed rival refineries into a dominant trust (horizontal integration).',
        'Step 2: Distinguish aggregate output from social distribution: mass production lowered consumer steel and kerosene prices and enriched industrialists defending Social Darwinism or the Gospel of Wealth, yet low wages, overcrowded urban tenements, and machine politics (such as Tammany Hall) spurred settlement-house reform like Jane Addams\'s Hull House.',
        'Step 3: Conclude that Gilded Age industrial capitalism generated unprecedented national output while widening wealth inequality and fueling early calls for antitrust and municipal regulation.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Vertical integration and horizontal integration both mean buying out direct competitors in the same industry.',
        repair: 'Buying out competing firms is horizontal integration (Rockefeller); vertical integration (Carnegie) means controlling supply, transport, and distribution stages of one product.',
      },
      {
        misconception: 'The Sherman Antitrust Act of 1890 immediately broke up major Gilded Age industrial trusts.',
        repair: 'Early Supreme Court rulings like U.S. v. E.C. Knight weakened antitrust enforcement against manufacturers, and courts initially used the act more often against labor unions.',
      },
    ],
  },

  'apush-ch-06-section-03': {
    workedExample: {
      prompt:
        'Explain why industrial employers welcomed "New Immigrants" in the late nineteenth century even as nativist legislation like the Chinese Exclusion Act (1882) and anti-strike injunctions intensified.',
      steps: [
        'Step 1: Contextualize post-1880 migration: millions of Southern and Eastern European immigrants and Asian laborers entered industrial factories, mines, and railroads, creating vibrant urban ethnic enclaves alongside nativist anxiety.',
        'Step 2: Analyze the coexistence of labor demand and nativism: employers relied on abundant immigrant labor to keep wages low and fragment union solidarity, while native-born workers and political elites blamed newcomers for wage competition or radicalism—prompting the Chinese Exclusion Act (1882) and federal injunctions crushing strikes like Pullman (1894).',
        'Step 3: Conclude that Gilded Age labor conflict pitted unions (inclusive Knights of Labor vs. skilled-craft AFL) against a business-friendly federal judiciary while exposing deep ethnic and racial divisions within the working class.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The Knights of Labor and the American Federation of Labor shared identical membership rules and goals.',
        repair: 'The Knights of Labor welcomed unskilled workers, women, and Black laborers for broad reform; the AFL organized mostly white male skilled craft workers for wages and hours.',
      },
      {
        misconception: 'Federal authorities stayed strictly neutral during major Gilded Age strikes such as 1877 and Pullman.',
        repair: 'Presidents and federal courts repeatedly intervened on management\'s side by deploying federal troops and issuing anti-strike injunctions to keep railroads running.',
      },
    ],
  },

  'apush-ch-07-section-01': {
    workedExample: {
      prompt:
        'Evaluate how Progressive Era reforms (1890–1920) expanded federal and state regulatory capacity while simultaneously reflecting significant exclusions regarding race and social control.',
      steps: [
        'Step 1: Identify Progressive goals: using investigative journalism (muckrakers like Upton Sinclair and Ida Tarbell) and expert-led government to curb corporate monopoly, unsafe products, and political corruption.',
        'Step 2: Balance institutional achievements with exclusions: reforms produced the Pure Food and Drug Act, Federal Reserve, initiative/referendum, and the 16th–19th Amendments, yet most mainstream white Progressives ignored Jim Crow lynching—leaving Ida B. Wells and W.E.B. Du Bois\'s NAACP to fight racial terror—and some backed eugenics or restrictive literacy tests.',
        'Step 3: Conclude that Progressivism permanently expanded the activist regulatory state, but its diverse coalitions pursued reform in ways that often reinforced racial segregation and elite control.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The Progressive movement was a single unified party that championed racial integration and civil rights.',
        repair: 'Progressives spanned both major parties and varied widely; many Southern and national Progressives accepted or actively defended Jim Crow segregation alongside economic reforms.',
      },
      {
        misconception: 'Muckrakers like Upton Sinclair aimed primarily to shut down the entire capitalist market system permanently.',
        repair: 'Most Progressives sought to regulate and stabilize industrial capitalism through consumer safety, antitrust enforcement, and labor laws rather than abolish private enterprise.',
      },
    ],
  },

  'apush-ch-07-section-02': {
    workedExample: {
      prompt:
        'Compare the arguments of expansionists and the Anti-Imperialist League over U.S. annexation of the Philippines after the 1898 Spanish-American War, connecting the debate to national identity.',
      steps: [
        'Step 1: Situate 1898 as a watershed in U.S. foreign policy when victory over Spain yielded Puerto Rico, Guam, and the Philippines, triggering a bloody Philippine-American War.',
        'Step 2: Compare competing rationales: imperialists cited Alfred Thayer Mahan\'s naval power thesis, Asian export markets, and paternalistic racial duty, whereas Anti-Imperialist League critics argued ruling overseas subjects without consent violated the Declaration of Independence—though some critics also voiced nativist fears of nonwhite annexation.',
        'Step 3: Conclude that overseas empire forced Americans to confront whether a constitutional republic could govern colonies, a tension echoed later in World War I debates over Wilson\'s League of Nations.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'All members of the Anti-Imperialist League opposed Philippine annexation out of commitment to racial equality.',
        repair: 'Some anti-imperialists defended self-determination, but others opposed annexation out of nativist fears of incorporating nonwhite populations or competing Asian labor.',
      },
      {
        misconception: 'The United States retreated into complete global isolation with no international diplomacy during the 1920s.',
        repair: 'Although the Senate rejected the League of Nations, the 1920s U.S. actively engaged abroad via the Washington Naval Conference, Dawes Plan loans, and Kellogg-Briand Pact.',
      },
    ],
  },

  'apush-ch-07-section-03': {
    workedExample: {
      prompt:
        'Analyze how the New Deal and World War II mobilization jointly expanded federal power and economic opportunity while producing sharp civil-liberties contradictions on the home front.',
      steps: [
        'Step 1: Connect the 1930s New Deal (relief, recovery, reform via agencies like the WPA, FDIC, and Social Security) to the massive wartime industrial surge of World War II.',
        'Step 2: Apply comparison and contradiction: New Deal social insurance reshaped the federal safety net yet excluded agricultural and domestic workers, while WWII mobilization ended the Depression and opened war jobs even as Executive Order 9066 incarcerated over 110,000 Japanese Americans.',
        'Step 3: Conclude that the 1933–1945 era forged the modern federal welfare and national-security state, while home-front inequities spurred the Double V campaign and postwar civil rights organizing.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'New Deal programs alone ended the Great Depression and restored full employment by 1936.',
        repair: 'The New Deal relieved suffering and reformed banking and labor, but mass unemployment persisted through the 1937 recession until WWII defense mobilization achieved full employment.',
      },
      {
        misconception: 'Executive Order 9066 detained only Japanese immigrants who lacked U.S. citizenship during World War II.',
        repair: 'Roughly two-thirds of the over 110,000 people forcibly removed to incarceration camps were native-born U.S. citizens (Nisei), upheld at the time in Korematsu v. United States (1944).',
      },
    ],
  },

  'apush-ch-08-section-01': {
    workedExample: {
      prompt:
        'Explain how U.S. containment policy evolved from economic aid in Western Europe to military and covert interventions in Asia and the Middle East between 1947 and 1975.',
      steps: [
        'Step 1: Define containment (articulated by George Kennan and formalized in the 1947 Truman Doctrine) as the postwar strategy to prevent Soviet geopolitical and ideological expansion without direct superpower war.',
        'Step 2: Trace regional variation: in Europe, the Marshall Plan and NATO rebuilt stable democratic allies, whereas in Korea, Vietnam, Iran (1953), and Guatemala (1954), U.S. policymakers applied military force or covert coups—often misreading local anti-colonial nationalism solely as Moscow-directed communism.',
        'Step 3: Conclude that containment blended diplomacy, aid, alliances, and armed conflict across Cold War crises before Nixon\'s détente with China and the USSR signaled a pragmatic shift in the 1970s.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Containment policy meant invading the Soviet Union directly to roll back communism across Eastern Europe.',
        repair: 'Containment aimed to block further Soviet expansion through alliances, aid, and proxy deterrence rather than launching direct military invasion of the Soviet bloc.',
      },
      {
        misconception: 'Cold War crises in developing nations were caused solely by Soviet manipulation rather than local politics.',
        repair: 'Postcolonial leaders in Vietnam, Iran, and Latin America pursued local nationalist and land-reform agendas that superpowers often misinterpreted through a rigid bipolar lens.',
      },
    ],
  },

  'apush-ch-08-section-02': {
    workedExample: {
      prompt:
        'Evaluate how grassroots activism and federal intervention interacted to dismantle legal segregation between 1954 and 1965, and explain one major limitation that persisted afterward.',
      steps: [
        'Step 1: Trace the two-track civil rights strategy: NAACP legal victories like Brown v. Board of Education (1954) paired with local direct action—the Montgomery Bus Boycott, SNCC sit-ins, Freedom Rides, Birmingham, and Selma.',
        'Step 2: Show causation between grassroots pressure and federal law: televised violent backlash against peaceful marchers compelled Congress and President Johnson to pass the Civil Rights Act of 1964 and Voting Rights Act of 1965, inspiring parallel organizing by Chicano farmworkers (UFW), women (NOW), Indigenous activists (AIM), and LGBTQ+ activists.',
        'Step 3: Conclude that while federal statutes ended de jure Jim Crow segregation, de facto residential segregation, redlining, and economic disparities persisted nationwide, fueling urban unrest and Black Power critiques.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Federal presidents and Congress initiated civil rights laws on their own without grassroots pressure.',
        repair: 'Federal action followed sustained local organizing, boycotts, sit-ins, and voter drives whose public confrontations made inaction politically untenable.',
      },
      {
        misconception: 'Racial segregation and discrimination existed only under Southern Jim Crow laws prior to 1965.',
        repair: 'Northern and Western cities enforced entrenched de facto segregation through federal redlining, restrictive housing covenants, and unequal school funding.',
      },
    ],
  },

  'apush-ch-08-section-03': {
    workedExample: {
      prompt:
        'Analyze how the Vietnam War and President Lyndon Johnson\'s Great Society jointly reshaped debates over executive authority, liberalism, and political coalitions between 1964 and 1974.',
      steps: [
        'Step 1: Connect domestic and foreign policy in the 1960s: the Great Society expanded New Deal liberalism through Medicare, Medicaid, Head Start, and anti-poverty programs, while the 1964 Gulf of Tonkin Resolution authorized sweeping presidential escalation in Vietnam.',
        'Step 2: Trace the resulting political realignment: mounting casualties, the 1968 Tet Offensive, and the Pentagon Papers produced a "credibility gap" prompting the 1973 War Powers Act, while war inflation squeezed Great Society funding and cultural clashes over antiwar protests and social norms fractured the New Deal Democratic coalition.',
        'Step 3: Conclude that simultaneous Vietnam disillusionment, stagflation, and backlash against liberal social change eroded public trust in government and fueled conservative mobilization into the 1970s.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Congress formally declared war on North Vietnam before U.S. combat troops deployed in 1965.',
        repair: 'Congress never formally declared war; the 1964 Gulf of Tonkin Resolution granted broad presidential war authority, later checked by the 1973 War Powers Act.',
      },
      {
        misconception: 'Most American youth in the late 1960s joined radical communes and universally opposed the Vietnam War.',
        repair: 'The counterculture was highly visible in media, but young Americans were politically diverse, and support for traditional values and conservative youth groups also grew rapidly.',
      },
    ],
  },

  'apush-ch-09-section-01': {
    workedExample: {
      prompt:
        'Evaluate the extent to which the Reagan administration (1981–1989) succeeded in rolling back the size and scope of the federal government created by the New Deal and Great Society.',
      steps: [
        'Step 1: Contextualize the 1980 conservative coalition uniting economic supply-siders, Sun Belt suburbanites, Cold War hawks, and evangelical voters (such as the Moral Majority) behind Ronald Reagan.',
        'Step 2: Measure real policy change against continuity: Reagan enacted sweeping marginal income tax cuts (1981), industry deregulation, and union pushback (PATCO), yet sharp defense spending increases expanded federal deficits and broad bipartisan support kept core entitlements like Social Security and Medicare intact.',
        'Step 3: Conclude that Reaganism shifted political discourse rightward and slowed new domestic welfare expansion, representing a partial conservative realignment rather than the dismantling of the federal state.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Reagan\'s supply-side tax cuts eliminated the federal budget deficit and abolished Social Security.',
        repair: 'Tax cuts paired with major Cold War military expansion tripled the national debt during the 1980s, and popular entitlements like Social Security and Medicare survived.',
      },
      {
        misconception: 'The conservative resurgence appeared suddenly in 1980 with no prior grassroots organization.',
        repair: 'Modern conservatism built steadily over decades from Barry Goldwater\'s 1964 campaign, Sun Belt growth, think tanks, tax revolts like Proposition 13, and religious mobilization.',
      },
    ],
  },

  'apush-ch-09-section-02': {
    workedExample: {
      prompt:
        'Explain how post-1980 economic globalization, digital technology, and migration reshaped regional power and political debates across the Rust Belt and Sun Belt.',
      steps: [
        'Step 1: Identify structural shifts since 1980: global trade agreements like NAFTA (1994), digital computing/internet industries, and sustained immigration shaped by the 1965 Immigration and Nationality Act.',
        'Step 2: Apply regional comparison: while aggregate GDP grew and finance/tech hubs boomed, manufacturing offshoring hollowed out unionized Rust Belt industrial towns even as domestic and international migrants swelled Sun Belt cities, shifting electoral votes southward and westward.',
        'Step 3: Conclude that national economic averages concealed sharp regional and income divergence, fueling contemporary debates over free trade, automation, wage stagnation, and immigration policy.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Post-1980 manufacturing job losses were caused entirely by foreign trade agreements like NAFTA.',
        repair: 'Trade liberalization contributed to factory offshoring, but automation, robotics, and domestic shifts toward service and technology sectors also drove steep industrial job declines.',
      },
      {
        misconception: 'Post-1965 U.S. immigration came predominantly from Northern and Western Europe just as in the 1840s.',
        repair: 'Abolishing national-origins quotas in 1965 shifted immigration heavily toward Latin America and Asia, transforming American demographics and urban culture.',
      },
    ],
  },

  'apush-ch-09-section-03': {
    workedExample: {
      prompt:
        'Analyze how the end of the Cold War (1989–1991) and the September 11, 2001 attacks altered U.S. foreign policy priorities and domestic debates over national security and civil liberties.',
      steps: [
        'Step 1: Frame the post-Cold War transition: the Soviet Union\'s 1991 collapse left the United States the sole superpower, shifting focus from bipolar containment to regional crises (Persian Gulf War, Balkans) and transnational terrorism.',
        'Step 2: Apply causation to post-9/11 policy: the 2001 attacks triggered the War on Terror—including invasions of Afghanistan (2001) and Iraq (2003)—and domestic legislation like the USA PATRIOT Act expanding surveillance powers and creating the Department of Homeland Security.',
        'Step 3: Conclude that twenty-first-century U.S. history reflects enduring tension between unilateral global intervention versus multilateral limits abroad, and between counterterrorism security and Fourth Amendment privacy rights at home.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'The collapse of the Soviet Union in 1991 ended major U.S. overseas military deployments permanently.',
        repair: 'Despite post-Cold War hopes for a "peace dividend," U.S. forces intervened repeatedly in the Persian Gulf, Somalia, the Balkans, Afghanistan, and Iraq.',
      },
      {
        misconception: 'The USA PATRIOT Act passed unanimously without any subsequent constitutional debate over civil liberties.',
        repair: 'Although enacted with broad post-9/11 majorities, its warrantless metadata collection and expanded surveillance triggered sustained legal challenges and bipartisan privacy reforms.',
      },
    ],
  },
};

module.exports = {
  ap_psychology_pilot,
  ap_us_government_foundation_pilot,
  ap_us_history_foundation_pilot,
};
