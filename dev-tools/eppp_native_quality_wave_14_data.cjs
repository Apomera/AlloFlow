'use strict';

module.exports = {
  reviewedAt: '2026-07-25',
  reviewWave: 'eppp-native-quality-wave-14',
  warningCountsBefore: {
    totalItems: 1500,
    warningOnly: true,
    forbiddenAggregateChoices: 0,
    uniqueKeyStemLexicalLeakageCandidates: 154,
    asymmetricExtremeDistractorCandidates: 317,
    advancedDirectRecallCandidates: 22,
    semanticConceptDuplicatePairs: 262,
    semanticConceptDuplicateClusters: 125,
    editorialAnchorsWithActiveWarnings: 5,
    editorialAnchorsWithNoCurrentWarning: 5,
    priorityDocketItems: 20
  },
  revisions: [
    {
      id: 'eppp-v2-biological-045',
      expectedActionRank: 1,
      expectedAnswerIndex: 0,
      expectedPrompt: 'Complete the statement: Phantom limb pain demonstrates that:',
      prompt: 'Months after an amputation has healed, a patient reports severe sensations located in the missing hand. Moving a virtual image synchronized with attempted movement changes the experience. Which interpretation is most defensible?',
      choices: [
        'Persistent central representations and neural plasticity can generate a genuine sensory experience after the peripheral anatomy is absent',
        'Residual nociceptor activity in the healed stump is sufficient to explain the experience, making brain-level representation clinically irrelevant',
        'A vivid report in an absent body part indicates a belief-driven symptom rather than pain produced by physiological processing',
        'Cortical reorganization establishes a single causal mechanism that accounts for the presentation in each person with an amputation'
      ],
      rationale: 'Phantom limb pain is a genuine pain experience involving central body representation and plasticity after loss of peripheral anatomy. Peripheral nerve activity, spinal processing, cortical changes, and psychological factors may contribute in different cases, so the phenomenon supports a central contribution without establishing one universal mechanism.',
      choiceRationales: [
        'Phantom limb pain is a genuine pain experience involving central body representation and plasticity after loss of peripheral anatomy. Peripheral nerve activity, spinal processing, cortical changes, and psychological factors may contribute in different cases, so the phenomenon supports a central contribution without establishing one universal mechanism.',
        'Residual-limb and peripheral nerve processes can contribute, but they are not sufficient as a general explanation for a sensation localized to absent anatomy or for changes associated with altered visual-motor feedback. The case warrants a multilevel account rather than excluding central representation.',
        'Pain does not require current tissue injury at the experienced location, and an anatomically absent site does not make the report imaginary. Neural systems that represent the body can support a real percept even when their usual peripheral input has changed.',
        'Cortical reorganization is one investigated contributor, but studies also report preserved representations and effects from peripheral, spinal, and contextual processes. Treating one neural pattern as the same complete cause across patients exceeds the evidence.'
      ],
      references: [
        'https://pubmed.ncbi.nlm.nih.gov/29856366/'
      ],
      sourceDetails: [
        {
          url: 'https://pubmed.ncbi.nlm.nih.gov/29856366/',
          title: 'A Review of Current Theories and Treatments for Phantom Limb Pain',
          organization: 'Journal of Clinical Investigation and PubMed',
          summary: 'This peer-reviewed review synthesizes peripheral, spinal, cortical, and psychological accounts of phantom limb pain, including altered and preserved body representations, and evaluates the evidence and limitations of treatment mechanisms.',
          credibility: 'PubMed provides the U.S. National Library of Medicine record for a scholarly clinical review focused specifically on phantom limb pain. Its comparison of competing mechanisms supports a multilevel inference rather than a single-cause claim.'
        }
      ],
      sourceCheck: 'The review describes phantom pain as genuine and mechanistically heterogeneous, with evidence involving residual nerves, spinal pathways, cortical maps, body representation, and contextual factors. The keyed response therefore permits a central contribution while avoiding exclusivity or causal overstatement.',
      learningObjectiveId: 'biological-phantom-limb-multilevel-central-representation-inference',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'peripheral-sufficiency-reduction',
        'absent-anatomy-imaginary-pain-error',
        'single-cortical-mechanism-overclaim'
      ]
    },
    {
      id: 'eppp-v2-cognitive-affective-035',
      expectedActionRank: 2,
      expectedAnswerIndex: 0,
      expectedPrompt: 'Complete the statement: Gardner\'s theory of multiple intelligences includes:',
      prompt: 'A principal proposes labeling each student a visual, auditory, or kinesthetic learner and presenting course material in that assigned mode. Which response most accurately distinguishes the relevant theory from this proposal?',
      choices: [
        'The framework posits several relatively discrete intellectual capacities; it does not classify people by a fixed sensory learning style or establish a matching rule for instruction',
        'The framework treats modality preference as the main source of cognitive differences and predicts superior learning whenever teaching matches that preference',
        'The framework is a hierarchical psychometric model in which broad abilities are explained by a dominant general factor at the highest level',
        'The framework defines interpersonal and intrapersonal capacities as the perception, understanding, and regulation branches of an emotional-ability test'
      ],
      rationale: 'Gardner\'s multiple-intelligences framework proposes several relatively discrete intellectual capacities and broader profiles of strengths. Gardner has explicitly distinguished this proposal from fixed learning styles and from a rule that instruction should be matched to a preferred sensory modality. The theory is also distinct from hierarchical psychometric and emotional-intelligence models.',
      choiceRationales: [
        'Gardner\'s multiple-intelligences framework proposes several relatively discrete intellectual capacities and broader profiles of strengths. Gardner has explicitly distinguished this proposal from fixed learning styles and from a rule that instruction should be matched to a preferred sensory modality. The theory is also distinct from hierarchical psychometric and emotional-intelligence models.',
        'This response describes the meshing hypothesis associated with learning-style models, not Gardner\'s account of intellectual capacities. A preference for receiving information visually or auditorily is not equivalent to a spatial, musical, linguistic, or other proposed intelligence.',
        'A hierarchy culminating in general intelligence describes psychometric models that organize correlated cognitive abilities under broader factors. Gardner instead challenged a unitary conception by proposing relatively discrete capacities, although that independence has been empirically criticized.',
        'Interpersonal and intrapersonal intelligences concern understanding other people and oneself within Gardner\'s framework. Perceiving, understanding, and managing emotion are branches of a separate ability model and should not be substituted as Gardner\'s definition.'
      ],
      references: [
        'https://www.gse.harvard.edu/ideas/news/13/10/multiple-intelligences-are-not-learning-styles',
        'https://pubmed.ncbi.nlm.nih.gov/24234985/'
      ],
      sourceDetails: [
        {
          url: 'https://www.gse.harvard.edu/ideas/news/13/10/multiple-intelligences-are-not-learning-styles',
          title: 'Multiple Intelligences Are Not Learning Styles',
          organization: 'Harvard Graduate School of Education',
          summary: 'Howard Gardner explains that multiple intelligences concern distinct computational and intellectual capacities, whereas learning styles concern preferred approaches to material, and he rejects collapsing the two ideas into a sensory-matching prescription.',
          credibility: 'This Harvard Graduate School of Education resource presents the theory developer\'s direct clarification of a widespread misinterpretation. It is authoritative for what Gardner\'s framework claims, though it does not resolve independent empirical critiques.'
        },
        {
          url: 'https://pubmed.ncbi.nlm.nih.gov/24234985/',
          title: 'The Theory of Multiple Intelligences',
          organization: 'Annals of Dyslexia and PubMed',
          summary: 'Gardner\'s peer-reviewed theoretical article presents intelligence as several intellectual competences rather than a single undifferentiated capacity and discusses implications for understanding individual cognitive profiles.',
          credibility: 'PubMed supplies the U.S. National Library of Medicine record for this article authored by Howard Gardner. It provides approved scholarly provenance for the framework whose boundaries are clarified by the accompanying Harvard source.'
        }
      ],
      sourceCheck: 'Gardner\'s peer-reviewed article establishes the several-competence framework, while his Harvard clarification states that multiple intelligences and learning styles are different concepts and rejects assigning people a style and matching all content to it. The item does not present the framework as settled psychometric fact.',
      learningObjectiveId: 'cognitive-multiple-intelligences-versus-learning-styles',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'learning-style-meshing-conflation',
        'hierarchical-g-model-substitution',
        'emotional-ability-model-substitution'
      ]
    },
    {
      id: 'eppp-v2-cognitive-affective-056',
      expectedActionRank: 3,
      expectedAnswerIndex: 1,
      expectedPrompt: 'Which statement most accurately defines Sunk cost fallacy?',
      prompt: 'A research team has spent most of its grant on software that is performing poorly. A replacement is cheaper from today onward and is forecast to produce better data. Which choice avoids the bias illustrated by continuing merely to justify earlier spending?',
      choices: [
        'Keep the current system until its total lifetime expense equals the replacement price, so the accounting comparison includes the money already paid',
        'Treat the prior expenditure as irrecoverable and compare the options using their expected costs and benefits from the present decision point',
        'Select the replacement because changing course reduces anticipated regret, even if updated estimates later favor the current system',
        'Divide the remaining grant evenly between both systems so neither earlier commitment nor new forecast determines the final choice'
      ],
      rationale: 'A sunk cost is a past expenditure of money, time, or effort that cannot be recovered. Normative choice should compare prospective costs and benefits that differ between the available options. Continuing mainly to justify the earlier investment allows an irrelevant past cost to distort the current decision.',
      choiceRationales: [
        'Including money that cannot be recovered makes the prior commitment influence a choice it should not affect. The relevant comparison is what each option is expected to cost and deliver from now onward, not whether later spending makes historical totals look balanced.',
        'A sunk cost is a past expenditure of money, time, or effort that cannot be recovered. Normative choice should compare prospective costs and benefits that differ between the available options. Continuing mainly to justify the earlier investment allows an irrelevant past cost to distort the current decision.',
        'Regret can influence choice, but switching by rule to avoid an anticipated feeling is not the normative correction. The better response uses updated prospective evidence and remains open to either option if its future value changes.',
        'Splitting resources may feel neutral, yet it can waste funds on an inferior system and avoids making the forecast-based comparison. A compromise is not automatically unbiased merely because it reduces commitment to either alternative.'
      ],
      references: [
        'https://doi.org/10.1016/0749-5978(85)90049-4'
      ],
      sourceDetails: [
        {
          url: 'https://doi.org/10.1016/0749-5978(85)90049-4',
          title: 'The Psychology of Sunk Cost',
          organization: 'Organizational Behavior and Human Decision Processes',
          summary: 'Arkes and Blumer define the sunk-cost effect as a greater tendency to continue an endeavor after investing money, effort, or time and demonstrate the effect across field and experimental studies of consequential decisions.',
          credibility: 'This DOI identifies the foundational peer-reviewed empirical article by the researchers who named and experimentally examined the sunk-cost effect. It directly supports the distinction between irrecoverable investment and prospective value.'
        }
      ],
      sourceCheck: 'The foundational article defines the effect as increased commitment following prior investment. The scenario makes the earlier grant expenditure irrecoverable and supplies a prospective comparison, supporting a decision based on future differences rather than historical totals or emotion-management rules.',
      learningObjectiveId: 'cognitive-sunk-cost-prospective-decision-rule',
      cognitiveProcess: 'application',
      distractorDesign: [
        'historical-total-equalization',
        'regret-avoidance-substitution',
        'compromise-as-bias-correction'
      ]
    },
    {
      id: 'eppp-v2-intervention-001',
      expectedActionRank: 4,
      expectedAnswerIndex: 2,
      expectedPrompt: 'Complete the statement: Behavioral couples therapy for substance abuse primarily works by:',
      prompt: 'A cohabiting couple seeks treatment after one partner\'s alcohol use and repeated conflict have begun reinforcing each other. Both support a goal of stopping use and want conjoint work. Which plan best represents the indicated approach?',
      choices: [
        'Use communication and pleasant-activity exercises to reduce conflict, postponing direct attention to drinking until relationship satisfaction improves',
        'Have the nonusing partner monitor adherence and impose consequences for lapses while the clinician limits sessions to substance-use education',
        'Create a mutual recovery contract that supports abstinence while teaching both partners communication, positive-activity, and relationship skills',
        'Provide relapse-prevention counseling to the identified patient and meet separately with the partner for coping support outside the treatment sessions'
      ],
      rationale: 'Behavioral couples therapy integrates substance-focused and relationship-focused interventions. A recovery contract structures daily support for abstinence, while conjoint sessions build positive activities and communication skills. Treating either the substance use or the relationship in isolation misses the reciprocal processes the model targets.',
      choiceRationales: [
        'Relationship enhancement is a core component, but deferring direct work on alcohol use omits the recovery contract and partner-supported abstinence procedures. The model addresses the reciprocal cycle by targeting both domains during conjoint treatment.',
        'The partner participates in monitoring and encouragement, but the recovery contract is cooperative rather than a unilateral punishment system. Education and surveillance by themselves also omit the communication and positive-relationship components.',
        'Behavioral couples therapy integrates substance-focused and relationship-focused interventions. A recovery contract structures daily support for abstinence, while conjoint sessions build positive activities and communication skills. Treating either the substance use or the relationship in isolation misses the reciprocal processes the model targets.',
        'Individual relapse prevention and separate partner support may each be useful services, but this arrangement is not the conjoint behavioral model described. It does not use the couple interaction as a coordinated source of recovery support and relationship change.'
      ],
      references: [
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC3215582/'
      ],
      sourceDetails: [
        {
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3215582/',
          title: 'Behavioral Couples Therapy for Alcoholism and Drug Abuse',
          organization: 'PubMed Central and Journal of Substance Abuse Treatment',
          summary: 'O\'Farrell and Schein describe conjoint behavioral couples therapy as combining a daily recovery contract that supports abstinence with communication training, positive shared activities, and other methods for improving relationship functioning.',
          credibility: 'This peer-reviewed clinical article is available through the U.S. National Library of Medicine\'s PubMed Central archive and is authored by a principal developer of the treatment program. It directly describes its rationale and procedures.'
        }
      ],
      sourceCheck: 'The treatment description explicitly combines a daily recovery contract and partner support for abstinence with positive activities and communication training. The keyed plan contains both intervention families and avoids recasting the partner as a punisher or separating the conjoint work.',
      learningObjectiveId: 'intervention-bct-substance-recovery-contract-relationship-integration',
      cognitiveProcess: 'application',
      distractorDesign: [
        'relationship-only-sequencing',
        'partner-punishment-monitoring',
        'parallel-individual-treatment-substitution'
      ]
    },
    {
      id: 'eppp-v2-intervention-026',
      expectedActionRank: 5,
      expectedAnswerIndex: 3,
      expectedPrompt: 'Complete the statement: Implosive therapy (Stampfl) differs from flooding in that implosion:',
      prompt: 'A historical case describes prolonged, high-arousal imagined confrontation with feared scenes. The therapist intensifies the scenes by introducing hypothesized guilt, aggression, and rejection themes. Which feature most specifically identifies the procedure?',
      choices: [
        'The client progresses through a graded hierarchy while pairing each step with a practiced relaxation response',
        'The client remains in contact with a concrete feared situation until arousal declines, with the scene limited to realistic stimulus features',
        'The client confronts obsessional cues while refraining from the ritual that previously reduced short-term distress',
        'The imaginal exposure incorporates inferred psychodynamic conflict material in addition to the client\'s overt fear cues'
      ],
      rationale: 'Stampfl and Levis described implosive therapy as prolonged imaginal exposure informed by both learning theory and psychodynamic formulations. The therapist could add hypothesized unconscious conflict themes to overt fear material. Graded exposure with relaxation, concrete flooding, and exposure with response prevention are neighboring but distinct procedures.',
      choiceRationales: [
        'A graded hierarchy paired with relaxation describes systematic desensitization. Implosive work instead used intense imaginal confrontation and did not depend on reciprocal relaxation as the client moved through small exposure steps.',
        'Sustained contact with a realistic feared situation is consistent with flooding, which shares prolonged high-intensity exposure. Limiting the material to concrete cues omits the added psychodynamic themes that distinguish the historical implosive formulation.',
        'Preventing a ritual during confrontation with an obsessional cue describes exposure and response prevention. The defining feature in the case is not ritual blocking but therapist-generated symbolic and conflict-laden imagery within prolonged exposure.',
        'Stampfl and Levis described implosive therapy as prolonged imaginal exposure informed by both learning theory and psychodynamic formulations. The therapist could add hypothesized unconscious conflict themes to overt fear material. Graded exposure with relaxation, concrete flooding, and exposure with response prevention are neighboring but distinct procedures.'
      ],
      references: [
        'https://pubmed.ncbi.nlm.nih.gov/6076856/'
      ],
      sourceDetails: [
        {
          url: 'https://pubmed.ncbi.nlm.nih.gov/6076856/',
          title: 'Essentials of Implosive Therapy: A Learning-Theory-Based Psychodynamic Behavioral Therapy',
          organization: 'Journal of Abnormal Psychology and PubMed',
          summary: 'Stampfl and Levis present the original implosive-therapy formulation as a learning-theory-based behavioral method that also incorporates psychodynamic hypotheses and intense imagined material in treatment.',
          credibility: 'PubMed supplies the National Library of Medicine record for this peer-reviewed primary article written by the originators of implosive therapy. It is the most direct source for the historical procedure and its theoretical integration.'
        }
      ],
      sourceCheck: 'The primary article\'s title and treatment account explicitly combine learning theory with psychodynamic formulation. This supports identifying inferred conflict themes within intense imagery as the distinguishing feature, while the distractors map to systematic desensitization, flooding, and response prevention.',
      learningObjectiveId: 'intervention-implosion-differential-exposure-procedure',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'systematic-desensitization-substitution',
        'concrete-flooding-substitution',
        'exposure-response-prevention-substitution'
      ]
    },
    {
      id: 'eppp-v2-intervention-030',
      expectedActionRank: 6,
      expectedAnswerIndex: 3,
      expectedPrompt: 'Complete the statement: Neurofeedback (EEG biofeedback) involves:',
      prompt: 'During a training session, scalp electrodes record a selected signal and a display changes within moments when the trainee produces the target pattern. What is the most accurate interpretation of the intervention?',
      choices: [
        'The electrodes deliver stimulation that directly drives the target pattern, while the display documents the physiological response',
        'The recording functions as a diagnostic EEG, and repeated observation is expected to alter symptoms through increased clinician knowledge',
        'Improvement during the session verifies that the selected signal caused the clinical condition and that the protocol has established treatment efficacy',
        'A closed feedback loop uses measured neural activity as a contingent signal through which the participant practices self-regulation'
      ],
      rationale: 'Neurofeedback measures brain activity and returns information about a selected feature quickly enough for a participant to practice modifying it through feedback-based learning. Recording electrodes do not provide stimulation. Demonstrating signal regulation is also distinct from proving that the signal caused a disorder or that a protocol improves clinical outcomes.',
      choiceRationales: [
        'Standard EEG recording electrodes detect electrical activity rather than delivering a neuromodulatory current. Conflating measurement with stimulation changes the intervention into a different procedure and misstates the role of the contingent display.',
        'A diagnostic recording provides information for assessment but does not ordinarily create a contingent learning loop for the person being measured. Here the display changes in relation to the participant\'s current signal so that self-regulation can be practiced.',
        'Within-session change can show acquisition or task engagement, but it does not establish the signal as the cause of a disorder or demonstrate durable clinical benefit. Those claims require appropriate control conditions, outcomes, replication, and follow-up.',
        'Neurofeedback measures brain activity and returns information about a selected feature quickly enough for a participant to practice modifying it through feedback-based learning. Recording electrodes do not provide stimulation. Demonstrating signal regulation is also distinct from proving that the signal caused a disorder or that a protocol improves clinical outcomes.'
      ],
      references: [
        'https://pubmed.ncbi.nlm.nih.gov/28003656/'
      ],
      sourceDetails: [
        {
          url: 'https://pubmed.ncbi.nlm.nih.gov/28003656/',
          title: 'Closed-Loop Brain Training: The Science of Neurofeedback',
          organization: 'Nature Reviews Neuroscience and PubMed',
          summary: 'This multidisciplinary review describes neurofeedback as closed-loop training in which measured brain activity is translated into real-time sensory feedback to support learned self-regulation, and it discusses methodological and clinical-evidence challenges.',
          credibility: 'PubMed provides the National Library of Medicine record for this peer-reviewed Nature Reviews Neuroscience article by an international neurofeedback research group. Its scope directly covers mechanism, implementation, and evidentiary limits.'
        }
      ],
      sourceCheck: 'The review characterizes neurofeedback as closed-loop self-regulation of measured brain activity through real-time feedback and separates target engagement from therapeutic efficacy. The revised item tests that mechanism while rejecting stimulation, passive recording, and causal overreach.',
      learningObjectiveId: 'intervention-neurofeedback-closed-loop-mechanism-and-evidence-boundary',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'recording-stimulation-conflation',
        'diagnostic-monitoring-substitution',
        'target-engagement-efficacy-overclaim'
      ]
    },
    {
      id: 'eppp-v2-intervention-050',
      expectedActionRank: 7,
      expectedAnswerIndex: 3,
      expectedPrompt: 'Complete the statement: Functional analysis in behavior therapy identifies:',
      prompt: 'A clinician alternates brief test conditions. Hitting rises when difficult tasks are presented and produces a short break, but remains low during a play condition with attention and no demands. Which interpretation best uses these data?',
      choices: [
        'The physical form of hitting identifies its purpose, so similar-looking behavior in another setting should receive the same intervention',
        'Task presentation is the cause because it precedes hitting, making the consequence that follows the response unnecessary to the formulation',
        'Adult presence indicates an attention function because a clinician is nearby in both the test and comparison conditions',
        'The pattern suggests escape from tasks may reinforce hitting, so treatment can test that relation and teach an efficient appropriate request for a pause'
      ],
      rationale: 'The differentiated pattern suggests a social-negative-reinforcement function: task demands establish the value of escape, and a break contingent on hitting may maintain the response. Functional analysis evaluates behavior across controlled test and comparison conditions. A function-based plan can teach an appropriate communication response that accesses the same outcome.',
      choiceRationales: [
        'Topography describes what behavior looks like, not the environmental outcome maintaining it. Behaviors with similar form can serve different functions, and different responses can serve the same function, so intervention should not be transferred by appearance alone.',
        'The demand is an antecedent that may establish or signal the contingency, but maintenance depends on what the behavior produces. Removing the consequence from the formulation prevents analysis of whether escape strengthens responding across repeated opportunities.',
        'A person being present does not by itself establish attention as reinforcement, especially when attention is available in the low-response play condition. The differentiated variable is the task-and-break contingency, not mere proximity to an adult.',
        'The differentiated pattern suggests a social-negative-reinforcement function: task demands establish the value of escape, and a break contingent on hitting may maintain the response. Functional analysis evaluates behavior across controlled test and comparison conditions. A function-based plan can teach an appropriate communication response that accesses the same outcome.'
      ],
      references: [
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC2846577/'
      ],
      sourceDetails: [
        {
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2846577/',
          title: 'Clinical Application of Functional Analysis Methodology',
          organization: 'PubMed Central and Behavior Analysis in Practice',
          summary: 'This peer-reviewed clinical review explains functional analysis through controlled test and comparison conditions that manipulate antecedent and consequent events to identify reinforcement processes maintaining problem behavior and guide treatment.',
          credibility: 'The article is archived by PubMed Central and reviews the established Iwata functional-analysis methodology for clinical application. It directly supports interpreting differentiated demand and control conditions without inferring function from topography.'
        }
      ],
      sourceCheck: 'The review describes test conditions in which demands precede behavior and escape follows it, contrasted with control conditions, to evaluate social-negative reinforcement. The scenario reproduces that logic and supports a function-matched communication alternative rather than an antecedent-only inference.',
      learningObjectiveId: 'intervention-functional-analysis-escape-contingency-inference',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'topography-determines-function',
        'antecedent-only-causation',
        'adult-presence-attention-function'
      ]
    },
    {
      id: 'eppp-v2-intervention-068',
      expectedActionRank: 8,
      expectedAnswerIndex: 1,
      expectedPrompt: 'Complete the statement: Narrative therapy views problems as:',
      prompt: 'A client repeatedly says, "I am a failure." The therapist asks when "the Failure story" gains influence, explores occasions when the client acted from persistence, and elaborates a richer account organized around that value. Which process is most evident?',
      choices: [
        'Identify the global belief as a cognitive distortion, test its evidence, and replace it with a more proportionate self-evaluation',
        'Separate the difficulty from the person and develop neglected events into a preferred identity narrative',
        'Interpret the self-condemning statement as a defense against an unconscious conflict and work through its developmental origin',
        'Define a future in which the complaint has disappeared and scale present progress toward that solution while leaving identity language unchanged'
      ],
      rationale: 'Narrative therapy uses externalizing conversations to separate people from problem-saturated descriptions and examines the problem\'s effects, social context, and exceptions. Unique outcomes can then be linked across time and meaning to re-author a preferred identity story grounded in the person\'s values, skills, and commitments.',
      choiceRationales: [
        'Evidence testing and replacement of an overgeneralized belief are characteristic cognitive-therapy procedures. The therapist here changes the person-problem relationship and develops an alternative identity account rather than debating the literal accuracy of the thought.',
        'Narrative therapy uses externalizing conversations to separate people from problem-saturated descriptions and examines the problem\'s effects, social context, and exceptions. Unique outcomes can then be linked across time and meaning to re-author a preferred identity story grounded in the person\'s values, skills, and commitments.',
        'A psychodynamic formulation might interpret the statement in relation to defenses and developmental conflict. The described therapist instead names the problem as an external influence and privileges events that support a preferred account of identity.',
        'Future-focused questions and progress scaling are associated with solution-focused work and can also notice exceptions. The defining pattern here is externalizing identity language and elaborating neglected events into a re-authored self-narrative.'
      ],
      references: [
        'https://doi.org/10.1177/09731342241238096'
      ],
      sourceDetails: [
        {
          url: 'https://doi.org/10.1177/09731342241238096',
          title: 'Externalizing the Internalized: Exploring Externalizing Conversations in Narrative Therapy',
          organization: 'Psychological Studies and SAGE Publications',
          summary: 'This peer-reviewed article describes externalizing conversations as separating people from internalized problem identities, locating problems in context, and constructing preferred stories aligned with clients\' values, skills, and commitments.',
          credibility: 'The DOI provides a stable record for a recent peer-reviewed article focused specifically on the narrative-therapy process tested here. It synthesizes the White and Epston tradition and applies externalizing conversations in clinical work.'
        }
      ],
      sourceCheck: 'The article defines externalizing conversations as separating the person from internalized problem accounts and developing preferred stories in social context. The scenario combines this separation with unique outcomes and value-linked identity development, supporting the re-authoring interpretation.',
      learningObjectiveId: 'intervention-narrative-externalizing-and-reauthoring-process',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'cognitive-restructuring-substitution',
        'psychodynamic-conflict-substitution',
        'solution-focused-future-scaling-substitution'
      ]
    }
  ]
};
