'use strict';

/**
 * Curated misconception families and 4-stage remediation playbooks (24 total) for:
 * - plt_5_9_5623 (6 pairs, Praxis Principles of Learning and Teaching: Grades 5–9)
 * - plt_7_12_5624 (6 pairs, Praxis Principles of Learning and Teaching: Grades 7–12)
 * - educational_leadership_5412 (6 pairs, Praxis Educational Leadership: Administration and Supervision)
 * - school_librarian_5312 (6 pairs, Praxis School Librarian)
 */

const PLAYBOOK_META = {
  status: 'internal-remediation-playbook',
  reviewStatus: 'source-reviewed-editorial-pass',
  releaseEligible: false
};

const plt_5_9_5623 = {
  misconceptionFamilies: [
    {
      id: 'plt5623-formal-operational-assumption',
      label: 'Treating Middle Schoolers as Fully Formal Operational',
      description: 'Assuming grades 5–9 students have uniformly mastered abstract hypothetical-deductive reasoning and therefore stripping away visual models, physical manipulatives, worked examples, and concrete-to-abstract bridges during math, science, and social studies lessons.',
      remediationMove: 'Treat early adolescence as an uneven transition between concrete operational and formal operational thinking: anchor abstract rules in concrete representations, diagrams, and guided inquiry inside each learner\'s zone of proximal development before fading supports.',
      remediationPlaybookId: 'plt5623-playbook-formal-operational-assumption',
      itemIds: [
        'plt5623-b1-001',
        'plt5623-b1-002',
        'plt5623-b1-003',
        'plt5623-b1-004',
        'plt5623-b1-005',
        'plt5623-b1-006',
        'plt5623-b1-007',
        'plt5623-b1-009',
        'plt5623-b1-010',
        'plt5623-b1-011',
        'plt5623-b1-040',
        'plt5623-b1-042'
      ]
    },
    {
      id: 'plt5623-extrinsic-compliance-vs-autonomy-belonging',
      label: 'Relying on Extrinsic Compliance Over Adolescent Autonomy and Belonging',
      description: 'Trying to motivate grades 5–9 learners with public star charts, candy bribes, grade threats, or rigid teacher-only control instead of addressing young adolescents\' core developmental needs for structured choice, competence feedback, peer belonging, and identity exploration.',
      remediationMove: 'Shift from external compliance rewards to self-determination supports: offer bounded choices aligned to the same standard, frame effortful mastery feedback privately, and structure purposeful peer collaboration that honors social belonging.',
      remediationPlaybookId: 'plt5623-playbook-extrinsic-compliance-vs-autonomy-belonging',
      itemIds: [
        'plt5623-b1-002',
        'plt5623-b1-004',
        'plt5623-b1-005',
        'plt5623-b1-007',
        'plt5623-b1-008',
        'plt5623-b1-009',
        'plt5623-b1-010',
        'plt5623-b1-012',
        'plt5623-b1-035',
        'plt5623-b1-037',
        'plt5623-b1-042'
      ]
    },
    {
      id: 'plt5623-punitive-exclusion-vs-restorative-climate',
      label: 'Defaulting to Punitive Exclusion Instead of Restorative Classroom Climate',
      description: 'Responding to middle-grades off-task behavior, peer friction, or hallway conflict with public shaming, whole-class punishment, zero-tolerance office removals, or sarcasm rather than clear co-constructed norms, private redirection, and restorative repair.',
      remediationMove: 'Preserve student dignity and instructional time by teaching routines proactively, redirecting privately with calm proximity, examining the antecedent and function of behavior, and using restorative conferences to repair harm and re-engage the learner.',
      remediationPlaybookId: 'plt5623-playbook-punitive-exclusion-vs-restorative-climate',
      itemIds: [
        'plt5623-b1-005',
        'plt5623-b1-008',
        'plt5623-b1-009',
        'plt5623-b1-010',
        'plt5623-b1-012',
        'plt5623-b1-040',
        'plt5623-b1-067',
        'plt5623-b1-069',
        'plt5623-b1-088',
        'plt5623-b1-089',
        'plt5623-b1-091',
        'plt5623-b1-092'
      ]
    },
    {
      id: 'plt5623-one-size-worksheet-vs-interdisciplinary-udl',
      label: 'One-Size Worksheets Instead of Interdisciplinary UDL and EL/IEP Supports',
      description: 'Delivering identical dense text packets to every middle schooler or planning superficial "theme days" that dilute subject standards, while overlooking Universal Design for Learning options, WIDA/EL language scaffolds, and legally required IEP/504 accommodations.',
      remediationMove: 'Design backward from rigorous grade-level standards using UDL multiple means of representation and expression, keep interdisciplinary tasks authentically grounded in each discipline\'s objectives, and embed targeted EL and IEP scaffolds without lowering cognitive demand.',
      remediationPlaybookId: 'plt5623-playbook-one-size-worksheet-vs-interdisciplinary-udl',
      itemIds: [
        'plt5623-b1-031',
        'plt5623-b1-032',
        'plt5623-b1-033',
        'plt5623-b1-034',
        'plt5623-b1-035',
        'plt5623-b1-036',
        'plt5623-b1-037',
        'plt5623-b1-038',
        'plt5623-b1-039',
        'plt5623-b1-040',
        'plt5623-b1-041',
        'plt5623-b1-042'
      ]
    },
    {
      id: 'plt5623-holistic-impression-vs-analytic-rubrics',
      label: 'Holistic Impression Scoring Instead of Analytic Rubrics and Standards-Based Grading',
      description: 'Assigning a single global letter grade or conflating behavior, neatness, extra credit, and punitive zeros with academic mastery instead of using transparent analytic rubrics, aligned formative checks, and criterion-referenced evidence.',
      remediationMove: 'Match assessment format to the verb of the standard, score multi-component projects with an analytic rubric that yields actionable feedback by criterion, and separate work-habit reporting from standards-based mastery grades.',
      remediationPlaybookId: 'plt5623-playbook-holistic-impression-vs-analytic-rubrics',
      itemIds: [
        'plt5623-b1-061',
        'plt5623-b1-062',
        'plt5623-b1-063',
        'plt5623-b1-064',
        'plt5623-b1-065',
        'plt5623-b1-066',
        'plt5623-b1-067',
        'plt5623-b1-068',
        'plt5623-b1-069',
        'plt5623-b1-070',
        'plt5623-b1-071',
        'plt5623-b1-072'
      ]
    },
    {
      id: 'plt5623-ferpa-privacy-and-family-partnership',
      label: 'FERPA Digital Privacy Lapses and One-Way Family Communication',
      description: 'Posting identifiable middle-school grades or student work on unvetted apps, discussing a student\'s IEP or discipline details with unauthorized adults, or treating family outreach as one-way problem reporting in English-only jargon.',
      remediationMove: 'Protect educational records under FERPA and COPPA by vetting digital tools and limiting sharing to legitimate educational interest, while cultivating two-way, culturally responsive, home-language family partnerships before crises arise.',
      remediationPlaybookId: 'plt5623-playbook-ferpa-privacy-and-family-partnership',
      itemIds: [
        'plt5623-b1-081',
        'plt5623-b1-082',
        'plt5623-b1-083',
        'plt5623-b1-084',
        'plt5623-b1-085',
        'plt5623-b1-086',
        'plt5623-b1-087',
        'plt5623-b1-088',
        'plt5623-b1-089',
        'plt5623-b1-090',
        'plt5623-b1-091',
        'plt5623-b1-092'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'plt5623-playbook-formal-operational-assumption',
      familyId: 'plt5623-formal-operational-assumption',
      familyLabel: 'Treating Middle Schoolers as Fully Formal Operational',
      title: 'Bridge Concrete and Formal Operational Reasoning Across Grades 5–9',
      recognitionCue: 'A grades 5–9 vignette shows sixth- or seventh-graders stumbling over symbolic algebra, proportional reasoning, or abstract scientific variables, and a tempting distractor tells the teacher to assign more abstract drills because students are "old enough for formal operations."',
      repairQuestion: 'Does this instructional move give transitioning young adolescents a concrete-to-representational bridge into abstract reasoning inside their ZPD, or does it assume uniform formal-operational mastery?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot the developmental mismatch in the stem: identify whether students are struggling with symbolic abstraction, multi-variable control, or uneven cognitive maturity across the same grades 5–9 classroom.',
          requiredOutput: 'Name the concrete-to-abstract bottleneck and eliminate distractors that either water down grade-level goals or withhold visual/tactile scaffolds.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Connect Piaget\'s uneven concrete-to-formal transition with Vygotsky\'s ZPD scaffolding: Concrete model or familiar context → visual/diagrammatic representation → symbolic generalization with fading prompts.',
          requiredOutput: 'Write a 3-step Concrete → Representational → Abstract sequence for introducing a grades 5–9 concept such as solving two-step equations or modeling phase changes.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'An eighth-grade science class holds persistent misconceptions about density and fails when given only formula rearrangement worksheets. Compare four candidate lessons: silent textbook rereading, algebra-only drills, hands-on mass/volume graphing paired with conceptual discussion, and skipping quantitative calculations altogether.',
          requiredOutput: 'Select the scaffolded concrete-to-abstract lesson and explain in one sentence each why the other three choices fail developmental responsiveness or rigor.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Tackle a fresh grades 5–9 development item featuring wide variation in physical, cognitive, or executive-function readiness within the same middle-grades homeroom.',
          requiredOutput: 'Choose the response that pairs high cognitive expectations with explicit concrete models, think-alouds, and gradually faded ZPD scaffolds.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5623-playbook-extrinsic-compliance-vs-autonomy-belonging',
      familyId: 'plt5623-extrinsic-compliance-vs-autonomy-belonging',
      familyLabel: 'Relying on Extrinsic Compliance Over Adolescent Autonomy and Belonging',
      title: 'Replace Token Compliance with Adolescent Autonomy, Competence, and Belonging',
      recognitionCue: 'A middle-school engagement item describes apathetic or peer-conscious seventh-graders, and a distractor proposes public leaderboards, candy tokens, or threatening extra homework to force compliance.',
      repairQuestion: 'Does this strategy build intrinsic motivation through Self-Determination Theory (autonomy, competence, relatedness) and mastery goals, or does it rely on controlling extrinsic contingencies that backfire in early adolescence?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Audit each option for controlling extrinsic traps (public behavior/grade rankings, tangible bribes for tasks students already value, or performance-avoidance threats) versus autonomy-supportive design.',
          requiredOutput: 'Classify each distractor by motivation theory (overjustification effect, negative reinforcement, or social-comparison threat) and flag why young adolescents resist it.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Map Deci and Ryan\'s Self-Determination Theory plus Erikson\'s identity-versus-role-confusion stage onto middle-grades practice: bounded choice of topic or product (autonomy), private process-focused feedback (competence), and structured cooperative roles (relatedness).',
          requiredOutput: 'Draft three concrete classroom moves—one each for autonomy, competence, and belonging—that keep the academic standard identical across all students.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Contrast two responses to sixth-graders disengaging during an informational-writing unit: (A) offering raffle tickets for turning in silent solo drafts versus (B) letting students choose among four local community issues, co-creating a revision checklist, and holding structured peer-feedback triads.',
          requiredOutput: 'Explain using mastery-goal orientation and adolescent social-development principles why Option B sustains transfer and effort after external rewards disappear.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new PLT 5–9 motivation vignette involving test anxiety, learned helplessness, or reluctance to participate aloud in front of peers.',
          requiredOutput: 'Select the option that protects adolescent face, attributes growth to controllable strategies, and embeds meaningful voice and structured peer support.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5623-playbook-punitive-exclusion-vs-restorative-climate',
      familyId: 'plt5623-punitive-exclusion-vs-restorative-climate',
      familyLabel: 'Defaulting to Punitive Exclusion Instead of Restorative Classroom Climate',
      title: 'Choose Proactive Norms, Private Redirection, and Restorative Repair Over Exclusion',
      recognitionCue: 'A middle-school classroom-management scenario involves side chatter, defiance, or peer conflict, and distractors escalate immediately to public reprimands, removing recess for the whole class, or sending the student to the hallway/office.',
      repairQuestion: 'Does the teacher\'s response de-escalate privately, preserve instructional access, and teach or repair the expected behavior rather than triggering an adolescent power struggle or exclusionary removal?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Distinguish immediate safety emergencies from routine adolescent misbehavior (attention-seeking, task avoidance, or peer-status posturing) and spot distractors that use public shaming, group punishment, or instant removal.',
          requiredOutput: 'Identify the likely antecedent/function of the behavior in the stem and rule out any distractor that escalates in front of peers.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Build a least-intrusive escalation ladder for grades 5–9: proactive co-constructed norms and clear transitions → nonverbal proximity/cue → brief private check-in offering a dignified choice → logical or restorative conference that repairs classroom impact.',
          requiredOutput: 'Write a 4-tier middle-school response ladder showing the exact teacher move at each tier without sacrificing instructional flow.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A seventh-grader slams a binder and argues aloud during lab setup after struggling to read the directions. Decide between lecturing the student publicly, sending the student to the dean immediately, privately offering a 2-minute reset and visual checklist followed by a brief restorative check-in, or docking the whole lab group\'s grade.',
          requiredOutput: 'Justify the private de-escalation plus scaffolded re-entry choice and explain how it addresses both task frustration and classroom norms.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh grades 5–9 climate item covering classroom procedures, peer conflict resolution, or recurring off-task transitions.',
          requiredOutput: 'Pick the proactive, dignity-preserving, restorative intervention and reject exclusionary or whole-group punitive distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5623-playbook-one-size-worksheet-vs-interdisciplinary-udl',
      familyId: 'plt5623-one-size-worksheet-vs-interdisciplinary-udl',
      familyLabel: 'One-Size Worksheets Instead of Interdisciplinary UDL and EL/IEP Supports',
      title: 'Design Backward-Aligned Interdisciplinary UDL Lessons with EL and IEP Scaffolds',
      recognitionCue: 'A curriculum or differentiation prompt shows a diverse middle-school team (English learners, students with IEPs/504s, and advanced learners), and distractors either assign one uniform worksheet, segregate students into low-rigor busywork, or build a cutesy interdisciplinary theme that drops subject standards.',
      repairQuestion: 'Does this unit start from unpacked grade-level standards across each discipline and use UDL plus targeted EL/IEP scaffolds to broaden access without watering down rigor?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check the stem for two common traps: superficial interdisciplinary decoration (such as coloring medieval shields in math) and pseudo-differentiation that lowers cognitive targets instead of varying access, language support, or expression pathways.',
          requiredOutput: 'Flag which distractors violate standards alignment, interdisciplinary integrity, or least-restrictive UDL access.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply Understanding by Design (standards → aligned performance evidence → UDL learning plan) together with EL scaffolds (sentence frames, visuals, cognates, structured oral rehearsal) and IEP accommodations (accessible text formats, chunked directions, graphic organizers).',
          requiredOutput: 'Create a 3-row table mapping one middle-grades standard to a UDL access option, an EL academic-language scaffold, and an IEP accommodation that all preserve the exact same rigor.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'An ELA, science, and math grade-7 team plans a local watershed unit. Compare an aligned design (collecting real water-quality data in science, analyzing ratios/graphs in math, and writing evidence-based civic briefs in ELA with multimodal text supports) against a thematic crossword packet or giving ELs a lower-grade reading passage on a different topic.',
          requiredOutput: 'Explain how the aligned interdisciplinary UDL design preserves disciplinary rigor and specifies when targeted remediation beats blind repetition.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a PLT 5–9 planning item about preassessment grouping, digital resource selection, or co-teaching with a special educator or paraeducator.',
          requiredOutput: 'Select the backward-planned, UDL-aligned instructional move that uses preassessment data for flexible, temporary scaffolding.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5623-playbook-holistic-impression-vs-analytic-rubrics',
      familyId: 'plt5623-holistic-impression-vs-analytic-rubrics',
      familyLabel: 'Holistic Impression Scoring Instead of Analytic Rubrics and Standards-Based Grading',
      title: 'Use Analytic Rubrics, Aligned Evidence, and Standards-Based Grading in Grades 5–9',
      recognitionCue: 'An assessment item asks how to score a middle-school lab report, essay, or multimedia project—or how to report grades fairly—and distractors recommend a single holistic impression score, grading on a norm-referenced curve, or averaging zero scores for late work into mastery grades.',
      repairQuestion: 'Does this assessment choice match the cognitive verb of the objective, give students criterion-specific analytic feedback for revision, and report pure standards mastery without construct-irrelevant noise?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Diagnose the assessment flaw in the stem or distractors: holistic scoring when students need targeted revision feedback, norm-referenced ranking instead of criterion-referenced mastery, or high reliability paired with poor content validity.',
          requiredOutput: 'Name the exact assessment concept tested (formative vs summative vs diagnostic, analytic vs holistic rubric, validity vs reliability, or criterion vs norm referencing).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Separate assessment tools by job: diagnostic prechecks find root gaps → formative checks guide immediate reteaching → analytic rubrics break complex performances into teachable criteria → purposeful portfolios document growth against standards.',
          requiredOutput: 'State two concrete rules: when an analytic rubric beats a holistic rubric, and why attendance/neatness/extra credit must be reported separately from academic proficiency.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A grades 5–9 teacher assigns a persuasive speech with evidence, counterargument, and delivery goals, then gives only "82/100—good effort" plus a 10-point deduction for forgetting a cover sheet. Redesign the scoring and peer-review routine.',
          requiredOutput: 'Specify a 3-criterion analytic rubric aligned to the standard, one structured peer-assessment condition (calibrated exemplar + criterion checklist), and the fix for removing non-academic grade distortion.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new PLT 5–9 assessment scenario involving accommodation validity, anecdotal observation records, or selecting between selected-response and performance tasks.',
          requiredOutput: 'Choose the option that preserves construct validity, aligns directly with the target standard, and provides actionable criterion-referenced feedback.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5623-playbook-ferpa-privacy-and-family-partnership',
      familyId: 'plt5623-ferpa-privacy-and-family-partnership',
      familyLabel: 'FERPA Digital Privacy Lapses and One-Way Family Communication',
      title: 'Uphold FERPA Digital Privacy While Building Reciprocal Middle-Grades Family Partnerships',
      recognitionCue: 'A professional-responsibility scenario involves sharing student data on a free web app, discussing a student\'s grades or behavior with another parent or non-assigned teacher, or sending one-way deficit notices home only when a middle schooler fails.',
      repairQuestion: 'Does this action strictly protect personally identifiable student records under FERPA/COPPA while engaging caregivers as reciprocal, home-language partners in student growth?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Scan the vignette for legal-ethical red flags (unapproved third-party apps collecting student accounts under age 13, posting identifiable scores publicly, sharing IEP/discipline records without legitimate educational interest) and one-way family communication barriers.',
          requiredOutput: 'Identify the specific FERPA, COPPA, or communication-equity violation in each distractor before selecting the compliant option.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Pair legal compliance with proactive partnership: verify district data-privacy approval before digital onboarding, restrict record access to staff with legitimate educational interest, and replace jargon-heavy deficit calls with accessible, translated, two-way conferences that invite caregiver insights.',
          requiredOutput: 'Write a 2-part compliance-and-partnership checklist covering (1) digital/record privacy under FERPA and (2) reciprocal multilingual family conferencing.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A sixth-grade teacher wants to upload student essays with full names to a free AI-feedback website and email a group newsletter listing top honor-roll and missing-assignment students. Meanwhile, a caregiver who speaks Spanish works evening shifts and missed Open House.',
          requiredOutput: 'Detail the exact FERPA/COPPA correction for the digital tool and newsletter, and propose two flexible, translated, reciprocal ways to partner with the caregiver.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Answer a fresh PLT 5–9 professional-community item involving multidisciplinary team coordination, paraeducator supervision, peer-observation norms, or caregiver communication.',
          requiredOutput: 'Select the response that upholds student confidentiality, uses structured collaborative protocols, and treats families and support staff as informed partners.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const plt_7_12_5624 = {
  misconceptionFamilies: [
    {
      id: 'plt5624-passive-lecture-vs-disciplinary-literacy',
      label: 'Defaulting to Passive Lecture Over Disciplinary Literacy and Socratic Inquiry',
      description: 'Treating high school instruction as continuous teacher monologue and note-copying instead of apprentice-style disciplinary literacy—teaching adolescents how historians corroborate sources, scientists critique data, and literary analysts defend claims in structured Socratic discussion.',
      remediationMove: 'Chunk direct explanation into focused mini-lessons paired with explicit disciplinary reading, writing, and text-grounded seminar protocols where students generate and defend claims with domain-specific evidence.',
      remediationPlaybookId: 'plt5624-playbook-passive-lecture-vs-disciplinary-literacy',
      itemIds: [
        'plt5624-b1-001',
        'plt5624-b1-005',
        'plt5624-b1-007',
        'plt5624-b1-031',
        'plt5624-b1-032',
        'plt5624-b1-033',
        'plt5624-b1-036',
        'plt5624-b1-037',
        'plt5624-b1-039',
        'plt5624-b1-040',
        'plt5624-b1-042'
      ]
    },
    {
      id: 'plt5624-cognitive-overload-vs-worked-examples-retrieval',
      label: 'Inducing Cognitive Overload Instead of Using Worked Examples and Retrieval Practice',
      description: 'Dumping dense multi-step secondary procedures on novices all at once or endorsing passive rereading and cramming instead of managing working-memory load with worked examples, faded guidance, spaced retrieval practice, and metacognitive self-explanation.',
      remediationMove: 'Reduce extraneous cognitive load by pairing step-by-step worked examples with guided faded practice, then consolidate long-term transfer through low-stakes spaced retrieval, interleaving, and error-analysis reflection.',
      remediationPlaybookId: 'plt5624-playbook-cognitive-overload-vs-worked-examples-retrieval',
      itemIds: [
        'plt5624-b1-001',
        'plt5624-b1-002',
        'plt5624-b1-003',
        'plt5624-b1-004',
        'plt5624-b1-005',
        'plt5624-b1-006',
        'plt5624-b1-008',
        'plt5624-b1-034',
        'plt5624-b1-035',
        'plt5624-b1-038',
        'plt5624-b1-041'
      ]
    },
    {
      id: 'plt5624-unguided-discovery-vs-scaffolded-pbl',
      label: 'Launching Unguided Discovery Instead of Scaffolded PBL with Formative Checkpoints',
      description: 'Assigning open-ended secondary research or project-based learning with minimal prior knowledge, vague group roles, and a single end-of-month deadline—resulting in entrenched misconceptions, unequal group work, and decorative posters with weak conceptual mastery.',
      remediationMove: 'Anchor secondary inquiry and PBL in essential standards and baseline schema, assign individual accountability alongside interdependent roles, and embed staged formative checkpoints before students produce final artifacts.',
      remediationPlaybookId: 'plt5624-playbook-unguided-discovery-vs-scaffolded-pbl',
      itemIds: [
        'plt5624-b1-004',
        'plt5624-b1-007',
        'plt5624-b1-033',
        'plt5624-b1-035',
        'plt5624-b1-036',
        'plt5624-b1-039',
        'plt5624-b1-041',
        'plt5624-b1-042',
        'plt5624-b1-061',
        'plt5624-b1-065',
        'plt5624-b1-067',
        'plt5624-b1-068'
      ]
    },
    {
      id: 'plt5624-assessment-bias-construct-irrelevance-sem',
      label: 'Overlooking Assessment Bias, Construct Irrelevance, and SEM Interpretation',
      description: 'Treating a single standardized or teacher-made score as exact truth without accounting for standard error of measurement (SEM), mistaking score consistency (reliability) for measuring the right target (validity), or embedding culturally biased contexts and unreadable wording that distort measurement.',
      remediationMove: 'Audit secondary assessments for alignment, cultural/linguistic fairness, and construct-irrelevant variance, and interpret standardized scores as SEM confidence bands triangulated with classroom criterion-referenced evidence.',
      remediationPlaybookId: 'plt5624-playbook-assessment-bias-construct-irrelevance-sem',
      itemIds: [
        'plt5624-b1-061',
        'plt5624-b1-062',
        'plt5624-b1-063',
        'plt5624-b1-064',
        'plt5624-b1-065',
        'plt5624-b1-066',
        'plt5624-b1-067',
        'plt5624-b1-068',
        'plt5624-b1-069',
        'plt5624-b1-070',
        'plt5624-b1-071',
        'plt5624-b1-072'
      ]
    },
    {
      id: 'plt5624-iep-504-accommodation-vs-lowering-rigor',
      label: 'Confusing IEP/504 Accommodations with Lowering Secondary Rigor',
      description: 'Assuming an IEP or Section 504 plan allows a high school teacher to excuse core standards or simplify content into rote tasks—or conversely refusing legally mandated accommodations like extended time, assistive technology, or read-alouds out of a mistaken belief that they create an unfair advantage.',
      remediationMove: 'Distinguish accommodations (changing how a student accesses content or demonstrates mastery while keeping the exact grade-level standard intact) from modifications (altering the construct only when specified by an IEP team), and implement documented plans faithfully.',
      remediationPlaybookId: 'plt5624-playbook-iep-504-accommodation-vs-lowering-rigor',
      itemIds: [
        'plt5624-b1-004',
        'plt5624-b1-009',
        'plt5624-b1-010',
        'plt5624-b1-011',
        'plt5624-b1-012',
        'plt5624-b1-037',
        'plt5624-b1-038',
        'plt5624-b1-040',
        'plt5624-b1-070',
        'plt5624-b1-088',
        'plt5624-b1-092'
      ]
    },
    {
      id: 'plt5624-copyright-fair-use-ferpa-ethics',
      label: 'Copyright Fair-Use Myths, FERPA Breaches, and Professional Boundary Traps',
      description: 'Assuming any classroom copying is exempt from copyright, sharing confidential secondary student grades or health/counseling details casually, promising secrecy when a teen discloses abuse or self-harm, or crossing digital social-media boundaries with students.',
      remediationMove: 'Apply the four-factor fair-use test before copying works, enforce strict FERPA need-to-know confidentiality, follow immediate mandated-reporting laws without promising secrecy, and keep all student communication on transparent district-approved channels.',
      remediationPlaybookId: 'plt5624-playbook-copyright-fair-use-ferpa-ethics',
      itemIds: [
        'plt5624-b1-081',
        'plt5624-b1-082',
        'plt5624-b1-083',
        'plt5624-b1-084',
        'plt5624-b1-085',
        'plt5624-b1-086',
        'plt5624-b1-087',
        'plt5624-b1-088',
        'plt5624-b1-089',
        'plt5624-b1-090',
        'plt5624-b1-091',
        'plt5624-b1-092'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'plt5624-playbook-passive-lecture-vs-disciplinary-literacy',
      familyId: 'plt5624-passive-lecture-vs-disciplinary-literacy',
      familyLabel: 'Defaulting to Passive Lecture Over Disciplinary Literacy and Socratic Inquiry',
      title: 'Shift Secondary Classrooms from Lecture Coverage to Disciplinary Literacy and Socratic Inquiry',
      recognitionCue: 'A grades 7–12 lesson vignette depicts students passively copying slides or answering recall worksheets on complex texts/data, and distractors suggest talking faster to cover the syllabus or giving generic reading tips detached from the subject.',
      repairQuestion: 'Are secondary students actively practicing how experts in this discipline read, question, cite evidence, and debate claims, or are they passively recording teacher-delivered facts?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify whether the stem requires disciplinary thinking (historical sourcing/corroboration, scientific argumentation from data, mathematical proof, or literary critique) and flag distractors that collapse into passive lecture or generic recall.',
          requiredOutput: 'State the target disciplinary literacy practice and explain why slide-copying fails to build transfer in grades 7–12.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Restructure a 50-minute secondary block using interactive modeling → disciplined close analysis of primary sources or datasets → Socratic seminar with explicit talk stems, wait time, and text-based evidence norms.',
          requiredOutput: 'Outline a 3-part lesson flow showing how teacher modeling transitions to student-led, evidence-anchored discourse.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'An eleventh-grade history teacher lectures for 45 minutes on causes of World War I while students copy notes, yet essay claims lack primary-source corroboration. Redesign the lesson around two conflicting 1914 diplomatic excerpts and a fishbowl Socratic discussion.',
          requiredOutput: 'Specify the teacher\'s brief disciplinary sourcing think-aloud, two open-ended Socratic questions, and the accountability check ensuring every student participates.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a PLT 7–12 instructional-process scenario testing observable objectives, interdisciplinary rigor, or questioning techniques.',
          requiredOutput: 'Choose the option that engages adolescents in authentic disciplinary inquiry and evidence-based argumentation rather than teacher-dominated recitation.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5624-playbook-cognitive-overload-vs-worked-examples-retrieval',
      familyId: 'plt5624-cognitive-overload-vs-worked-examples-retrieval',
      familyLabel: 'Inducing Cognitive Overload Instead of Using Worked Examples and Retrieval Practice',
      title: 'Manage Adolescent Working Memory with Worked Examples, Fading, and Spaced Retrieval',
      recognitionCue: 'High school students look busy rereading notes, highlighting chapters, or floundering through a 20-problem homework sheet on a brand-new multi-step skill, and a distractor recommends longer massed practice or removing worked models too soon.',
      repairQuestion: 'Does this instructional sequence respect working-memory limits during initial acquisition (worked examples → faded guidance) and strengthen durable memory afterward (spaced retrieval and interleaving)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot cognitive-science traps in the choices: split-attention slides loaded with decorative clutter, premature unguided problem solving for novices, massed cramming, or passive rereading/highlighting that creates an illusion of competence.',
          requiredOutput: 'Label each weak distractor by its cognitive mechanism (extraneous load, expertise-reversal mismatch, or fluency illusion).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Link Sweller\'s Cognitive Load Theory with Dunlosky\'s high-utility learning strategies: annotated worked example → completion problem with faded steps → independent practice → spaced, interleaved low-stakes retrieval plus metacognitive error reflection.',
          requiredOutput: 'Write a concise two-phase rule distinguishing what novices need during initial encoding versus what they need for long-term transfer.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Tenth-grade chemistry students memorize stoichiometry steps for Friday\'s quiz but fail novel problems two weeks later when mixed with molarity items. Compare four interventions: assigning 30 identical stoichiometry drills, rereading textbook summaries, pairing worked-example comparison with weekly interleaved 3-question retrieval warm-ups, or giving open-note tests only.',
          requiredOutput: 'Select the worked-example plus interleaved retrieval design and explain why it repairs both transfer failure and forgetting.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh PLT 7–12 learning-theory item involving transfer to unfamiliar problem formats, metacognitive monitoring, or explicit multi-step instruction.',
          requiredOutput: 'Pick the sequence that scaffolds schema formation with explicit modeling/worked examples before shifting to spaced retrieval and varied transfer tasks.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5624-playbook-unguided-discovery-vs-scaffolded-pbl',
      familyId: 'plt5624-unguided-discovery-vs-scaffolded-pbl',
      familyLabel: 'Launching Unguided Discovery Instead of Scaffolded PBL with Formative Checkpoints',
      title: 'Turn Open-Ended Secondary Projects into Scaffolded PBL with Formative Checkpoints',
      recognitionCue: 'A secondary project or inquiry prompt turns students loose on a complex question with no background knowledge check, no role structure, and no milestone feedback until the final presentation day.',
      repairQuestion: 'Have students built the prerequisite conceptual schema, individual accountability, and mid-project formative checkpoints needed for inquiry or PBL to yield genuine mastery rather than surface activity?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Diagnose why unguided discovery stalls in grades 7–12: missing baseline knowledge, unchecked misconceptions during group work, social loafing without individual accountability, or grading aesthetic polish over target standards.',
          requiredOutput: 'Identify the missing structural safeguard (preassessment, explicit inquiry protocol, individual accountability, or mid-project formative gate) in the stem.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Design guided secondary PBL in four milestones: backward-aligned driving question and preassessment → explicit mini-lessons on prerequisite concepts → structured cooperative roles with individual mastery checkpoints → rubric-guided revision before public product.',
          requiredOutput: 'List three non-negotiable formative checkpoints a teacher must inspect before allowing a high school PBL team to move to final production.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A ninth-grade biology team spends two weeks building an elaborate ecosystem diorama while two group members cannot explain energy pyramids or trophic loss. Propose how to restructure the next PBL cycle.',
          requiredOutput: 'Specify how to pair a mid-unit individual concept check, calibrated peer feedback on an analytic rubric, and a teacher mini-lesson targeting the energy-transfer misconception.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new PLT 7–12 vignette asking when inquiry instruction is productive or how to distinguish a purposeful growth portfolio from a folder of completed projects.',
          requiredOutput: 'Choose the guided-inquiry or structured-PBL option that balances student agency with clear criteria, individual accountability, and iterative formative feedback.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5624-playbook-assessment-bias-construct-irrelevance-sem',
      familyId: 'plt5624-assessment-bias-construct-irrelevance-sem',
      familyLabel: 'Overlooking Assessment Bias, Construct Irrelevance, and SEM Interpretation',
      title: 'Eliminate Construct Irrelevance and Bias While Interpreting Scores Through SEM',
      recognitionCue: 'A secondary testing vignette shows a reliable exam that measures reading speed instead of physics, a word problem reliant on niche cultural idioms, or a school making high-stakes placement cuts from a single score difference inside the standard error of measurement (SEM).',
      repairQuestion: 'Does this test measure the exact intended standard without cultural, linguistic, or formatting bias—and are score decisions accounting for SEM and multiple data points?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Distinguish the three technical flaws tested on Praxis 5624: reliability without validity (consistent yet off-target), construct-irrelevant variance/bias (cultural assumptions or unnecessarily convoluted syntax blocking mastery display), and point-score overinterpretation ignoring SEM.',
          requiredOutput: 'Diagnose which psychometric flaw appears in the scenario and reject distractors that confuse consistency with validity or percentiles with percent correct.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Lock in core measurement rules: validity requires alignment to standards and removal of irrelevant barriers; SEM defines a confidence band around an observed score (observed score ± 1 SEM) showing overlapping scores are not meaningfully different; multiple measures beat single cut scores.',
          requiredOutput: 'Write a 2-sentence explanation of why two students scoring 492 and 498 on a test with an SEM of 10 cannot be placed into different course tracks based on that score alone.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'An algebra exam produces near-identical scores across two forms, yet several word problems use unfamiliar sailing terminology and multi-clause idioms that trip up multilingual ninth-graders who solve the same equations accurately in plain context.',
          requiredOutput: 'Classify the exam\'s reliability versus validity status, name the source of construct-irrelevant variance, and state the exact item-revision fix.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Answer a fresh PLT 7–12 assessment item comparing norm-referenced percentiles, criterion-referenced proficiency, rubric reliability, or score interpretation for parents.',
          requiredOutput: 'Select the psychometrically sound interpretation that respects validity, fairness, and SEM bands while avoiding biased or single-score high-stakes jumps.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5624-playbook-iep-504-accommodation-vs-lowering-rigor',
      familyId: 'plt5624-iep-504-accommodation-vs-lowering-rigor',
      familyLabel: 'Confusing IEP/504 Accommodations with Lowering Secondary Rigor',
      title: 'Implement IEP and 504 Accommodations Without Diluting Secondary Academic Standards',
      recognitionCue: 'A high school inclusion item shows a teacher either excusing a student with a 504/IEP from writing an analytical essay altogether or denying text-to-speech, extended time, or quiet testing because "college will not allow it."',
      repairQuestion: 'Does this support remove a disability-related access barrier while holding the student to the full grade-level construct (accommodation), or does it improperly alter the standard (unapproved modification) or violate legal rights?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Draw the legal and psychometric line between an accommodation (changes timing, setting, presentation, or response mode without changing what is measured) and a modification (changes the underlying standard or content complexity, authorized only by an IEP team).',
          requiredOutput: 'Classify each option in the stem as a valid accommodation, an unauthorized modification, or a legal refusal violating IDEA/Section 504.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply the construct-validity test for accommodations: if an objective measures historical argumentation rather than decoding fluency, audio-assisted reading removes a construct-irrelevant barrier and increases validity; if an objective measures decoding itself, read-aloud alters the construct.',
          requiredOutput: 'Give one secondary example where read-aloud is a valid accommodation (such as world history source analysis) and one where it alters the target construct (such as an independent decoding check).'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A tenth-grader with dysgraphia has a Section 504 plan granting speech-to-text dictation and 50% extended time on essays. Evaluate four teacher moves: grading only half the rubric criteria, denying dictation to "build grit," providing speech-to-text and extended time while scoring the full argument rubric, or substituting a multiple-choice quiz.',
          requiredOutput: 'Select the legally compliant, high-rigor accommodation and explain why the other three choices either violate Section 504 or reduce standards without authorization.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Tackle a fresh PLT 7–12 exceptional-learner or assessment-accommodation scenario involving co-teaching, assistive technology, or multidisciplinary IEP collaboration.',
          requiredOutput: 'Choose the move that faithfully implements IEP/504 accommodations, preserves grade-level rigor, and collaborates with specialists rather than acting unilaterally.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'plt5624-playbook-copyright-fair-use-ferpa-ethics',
      familyId: 'plt5624-copyright-fair-use-ferpa-ethics',
      familyLabel: 'Copyright Fair-Use Myths, FERPA Breaches, and Professional Boundary Traps',
      title: 'Navigate Copyright Fair Use, FERPA, Mandated Reporting, and Professional Boundaries',
      recognitionCue: 'A high school ethics item asks whether a teacher may photocopy an entire workbook for non-profit class use, DM a struggling senior on personal Instagram, discuss a student\'s depression with a curious parent volunteer, or keep a teen\'s abuse disclosure confidential upon request.',
      repairQuestion: 'Does this teacher action satisfy the four-factor fair-use test, FERPA confidentiality, immediate statutory mandated reporting, and transparent district-channel boundaries?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify which legal-ethical rule governs the vignette: Copyright Section 107 fair use (4 factors—not a blanket educational exemption), FERPA legitimate educational interest, state mandated-reporting duty (overrides student secrecy requests), or professional communication boundaries.',
          requiredOutput: 'Name the controlling legal standard and flag the exact myth embedded in each distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Memorize the four decision bright lines: (1) Fair use weighs purpose, nature, amount/substantiality, and market effect—never copy consumable workbooks or whole books to avoid buying; (2) FERPA bars disclosing identifiable records without consent except to officials with legitimate educational interest; (3) Mandated reporters never investigate alone or promise secrecy—report promptly through statutory channels; (4) Keep digital contact strictly on district-archived platforms.',
          requiredOutput: 'Write a 4-bullet quick-decision protocol matching each legal trigger to the required secondary teacher action.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Evaluate two bundled high school dilemmas: (A) copying 85% of a current copyright-protected AP review workbook to save department funds, and (B) a twelfth-grader asking to text the teacher\'s personal phone late at night after hinting at physical abuse at home.',
          requiredOutput: 'Explain why copying the workbook fails the amount and market-effect fair-use factors, and outline the exact boundary-safe, mandated-reporting sequence for the student disclosure.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a new PLT 7–12 professional-ethics vignette covering action research consent, peer-observation confidentiality, copyright/digital media, or student safety disclosures.',
          requiredOutput: 'Select the legally compliant, student-protective professional response and rule out convenience-driven or informal shortcuts.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const educational_leadership_5412 = {
  misconceptionFamilies: [
    {
      id: 'lead5412-solutions-before-root-cause-pdsa',
      label: 'Jumping to Solutions Before Root-Cause Analysis and PDSA Cycles',
      description: 'Reacting to declining test scores, attendance dips, or discipline spikes by immediately buying a new vendor program or issuing building-wide mandates before triangulating multiple data sources, diagnosing systemic root causes, articulating a theory of action, and testing small-scale PDSA changes.',
      remediationMove: 'Slow down the first administrative move: disaggregate multi-source data with stakeholders, run structured root-cause inquiry (such as 5 Whys or fishbone analysis), articulate an if-then theory of action, and pilot a small PDSA cycle before scaling.',
      remediationPlaybookId: 'lead5412-playbook-solutions-before-root-cause-pdsa',
      itemIds: [
        'lead5412-b1-001',
        'lead5412-b1-002',
        'lead5412-b1-003',
        'lead5412-b1-004',
        'lead5412-b1-005',
        'lead5412-b1-006',
        'lead5412-b1-007',
        'lead5412-b1-008',
        'lead5412-b1-009',
        'lead5412-b1-010',
        'lead5412-b1-011',
        'lead5412-b1-012'
      ]
    },
    {
      id: 'lead5412-coaching-walkthroughs-vs-formal-evaluation',
      label: 'Conflating Coaching Walkthroughs with Formal Due-Process Evaluation',
      description: 'Treating brief non-evaluative instructional walkthroughs or confidential peer-coaching notes as punitive personnel ratings—or conversely relying on vague hallway praise and informal warnings without rubric-aligned documentation, clear growth plans, and contractual due process when addressing persistent underperformance.',
      remediationMove: 'Keep formative walkthroughs and coaching distinct from summative personnel evaluation: use walkthrough trends to target job-embedded professional learning, and follow rubric-based evidence, written notice, targeted support plans, and progressive due process for formal evaluation.',
      remediationPlaybookId: 'lead5412-playbook-coaching-walkthroughs-vs-formal-evaluation',
      itemIds: [
        'lead5412-b1-018',
        'lead5412-b1-019',
        'lead5412-b1-020',
        'lead5412-b1-021',
        'lead5412-b1-022',
        'lead5412-b1-023',
        'lead5412-b1-024',
        'lead5412-b1-025',
        'lead5412-b1-026',
        'lead5412-b1-027',
        'lead5412-b1-028',
        'lead5412-b1-029'
      ]
    },
    {
      id: 'lead5412-schoolwide-averages-hiding-subgroup-gaps',
      label: 'Letting Schoolwide Averages Hide Subgroup Equity and Climate Gaps',
      description: 'Celebrating aggregate proficiency rates, overall graduation figures, or average climate survey scores while overlooking severe disparities affecting multilingual learners, students with disabilities, low-income students, or historically marginalized racial subgroups in achievement, advanced-course access, or discipline referrals.',
      remediationMove: 'Disaggregate every academic, attendance, access, and discipline indicator by student subgroup, audit systemic barriers rather than blaming students, and align MTSS tiers, culturally responsive practices, and resource allocation to close opportunity gaps.',
      remediationPlaybookId: 'lead5412-playbook-schoolwide-averages-hiding-subgroup-gaps',
      itemIds: [
        'lead5412-b1-041',
        'lead5412-b1-042',
        'lead5412-b1-043',
        'lead5412-b1-044',
        'lead5412-b1-045',
        'lead5412-b1-046',
        'lead5412-b1-047',
        'lead5412-b1-048',
        'lead5412-b1-049',
        'lead5412-b1-050',
        'lead5412-b1-051',
        'lead5412-b1-052'
      ]
    },
    {
      id: 'lead5412-title-i-supplanting-and-procurement-conflicts',
      label: 'Title I Supplanting Violations and Procurement Conflict-of-Interest Traps',
      description: 'Using restricted federal categorical funds (such as Title I or IDEA) to pay for core baseline expenses the district would otherwise fund with state/local dollars, splitting purchase orders to dodge competitive bidding, or failing to recuse and disclose personal or family vendor ties.',
      remediationMove: 'Enforce strict fiscal stewardship: verify that categorical grants supplement rather than supplant state/local obligations, calculate multi-year total cost of ownership, follow transparent competitive procurement thresholds, and require written disclosure plus full recusal on any conflict of interest.',
      remediationPlaybookId: 'lead5412-playbook-title-i-supplanting-and-procurement-conflicts',
      itemIds: [
        'lead5412-b1-060',
        'lead5412-b1-061',
        'lead5412-b1-075',
        'lead5412-b1-076',
        'lead5412-b1-077',
        'lead5412-b1-078',
        'lead5412-b1-079',
        'lead5412-b1-080',
        'lead5412-b1-081',
        'lead5412-b1-082',
        'lead5412-b1-083',
        'lead5412-b1-084'
      ]
    },
    {
      id: 'lead5412-student-rights-tinker-goss-title-ix-ferpa',
      label: 'Student-Rights Violations Across Tinker, Goss, Title IX, IDEA, and FERPA',
      description: 'Censoring peaceful student political expression without material disruption (Tinker), suspending students without notice and an opportunity to respond (Goss v. Lopez), handling peer sexual harassment informally instead of initiating Title IX procedures, delaying IDEA evaluations via MTSS, or disclosing identifiable records in breach of FERPA.',
      remediationMove: 'Apply constitutional and statutory bright lines before acting: protect non-disruptive student expression, guarantee Goss due process and IDEA manifestation safeguards, trigger formal Title IX coordinator notice and supportive measures immediately, and restrict FERPA records to authorized personnel and vetted vendors.',
      remediationPlaybookId: 'lead5412-playbook-student-rights-tinker-goss-title-ix-ferpa',
      itemIds: [
        'lead5412-b1-048',
        'lead5412-b1-059',
        'lead5412-b1-062',
        'lead5412-b1-063',
        'lead5412-b1-064',
        'lead5412-b1-065',
        'lead5412-b1-066',
        'lead5412-b1-067',
        'lead5412-b1-068',
        'lead5412-b1-069',
        'lead5412-b1-070',
        'lead5412-b1-094'
      ]
    },
    {
      id: 'lead5412-top-down-mandates-vs-distributed-plc-governance',
      label: 'Top-Down Mandates Over Distributed PLCs and Multilingual Community Governance',
      description: 'Drafting a school vision, schedule overhaul, or family policy behind closed doors and relying solely on one-way newsletters or vocal majority parents while sidelining teacher-led PLCs, governance roles, and underrepresented multilingual families.',
      remediationMove: 'Lead through distributed governance and reciprocal community partnership: share decision-making authority with structured PLCs, respect school-board policy lanes, audit advisory-group representation, remove time/language/access barriers, and close the feedback loop publicly.',
      remediationPlaybookId: 'lead5412-playbook-top-down-mandates-vs-distributed-plc-governance',
      itemIds: [
        'lead5412-b1-088',
        'lead5412-b1-089',
        'lead5412-b1-090',
        'lead5412-b1-091',
        'lead5412-b1-092',
        'lead5412-b1-093',
        'lead5412-b1-094',
        'lead5412-b1-095',
        'lead5412-b1-096',
        'lead5412-b1-097',
        'lead5412-b1-098',
        'lead5412-b1-099'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'lead5412-playbook-solutions-before-root-cause-pdsa',
      familyId: 'lead5412-solutions-before-root-cause-pdsa',
      familyLabel: 'Jumping to Solutions Before Root-Cause Analysis and PDSA Cycles',
      title: 'Run Root-Cause Inquiry, Theory of Action, and PDSA Pilots Before Scaling Initiatives',
      recognitionCue: 'A Praxis 5412 principal scenario reports a 12-point drop in math or rising ninth-grade failures, and appealing distractors rush to purchase an intervention software license, extend school hours, or mandate a new pacing guide as the "first step."',
      repairQuestion: 'Has the leadership team already diagnosed verified root causes across multiple data streams and tested a focused theory of action via a small PDSA cycle, or is this option jumping straight to an unverified full-scale fix?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot "premature-solution" distractors in strategic-leadership stems—purchasing programs, adding initiatives onto overloaded staff, or rewriting mission slogans before gathering diagnostic evidence and stakeholder input.',
          requiredOutput: 'Flag the skipped inquiry step (data triangulation, root-cause analysis, or small-scale pilot) that disqualifies the premature-solution option.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Lock in the PSEL continuous-improvement sequence: triangulate outcome, process, perception, and demographic data → diagnose root causes with staff → state an explicit if-then theory of action → run a bounded Plan-Do-Study-Act (PDSA) pilot with leading indicators before schoolwide rollout.',
          requiredOutput: 'Write one testable if-then theory of action and name one leading indicator that can be checked within 3 weeks of a PDSA pilot.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Ninth-grade Algebra I failure rates jumped from 14% to 29% in one semester. Compare four principal responses: mandating after-school tutoring immediately, buying a new digital math platform, convening the Algebra PLC to disaggregate failure patterns (attendance, prerequisite skills, grading practices) and piloting a targeted 4-week formative-reteach routine in two sections, or lowering pass cutoffs.',
          requiredOutput: 'Select the root-cause plus PDSA pilot option and explain why it avoids initiative overload and misaligned spending.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a fresh Praxis 5412 strategic-leadership item about mission revision, goal prioritization, engaging constructive dissent, or deciding when to adjust a strategic plan.',
          requiredOutput: 'Choose the disciplined, evidence-first continuous-improvement action grounded in root-cause inquiry and measurable progress monitoring.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'lead5412-playbook-coaching-walkthroughs-vs-formal-evaluation',
      familyId: 'lead5412-coaching-walkthroughs-vs-formal-evaluation',
      familyLabel: 'Conflating Coaching Walkthroughs with Formal Due-Process Evaluation',
      title: 'Separate Non-Evaluative Coaching Walkthroughs from Formal Due-Process Evaluation',
      recognitionCue: 'An instructional-leadership item mentions 10-minute walkthroughs, instructional coaches, or a struggling teacher, and distractors either dump walkthrough snapshots directly into summative ratings, ask a peer coach to spy for HR, or fire/non-renew a teacher without documented coaching and due process.',
      repairQuestion: 'Does this leadership move preserve trust and confidentiality in formative coaching/walkthroughs while honoring rubric-aligned evidence, targeted support, and contractual due process in formal evaluation?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Separate the two leadership lanes in every stem: (A) formative capacity-building (walkthrough trends, peer coaching confidentiality, job-embedded PD) versus (B) formal personnel evaluation (announced/unannounced full observations, rubric evidence, written improvement plans, due-process timelines).',
          requiredOutput: 'Identify which lane the scenario occupies and eliminate any distractor that weaponizes coaching data or skips due process.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Establish two strict guardrails: (1) instructional coaches keep individual teacher conversations confidential so coaching remains safe, sharing only aggregate trend themes; (2) when formal performance deficits persist, the principal—not the coach—gathers objective rubric evidence, holds clear written conferences, provides differentiated support, and follows district/contractual timelines.',
          requiredOutput: 'Write a 2-column chart contrasting walkthrough/coaching practices against formal evaluation/due-process requirements across purpose, confidentiality, and documentation.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Across 18 five-minute walkthroughs, a principal sees low student-talk ratios schoolwide and also notices one veteran teacher repeatedly dismissing struggling students during a formal observation. Decide how to use the walkthrough data and how to address the individual performance concern.',
          requiredOutput: 'Specify the aggregate, job-embedded PLC response for the walkthrough trend and the objective, rubric-based, due-process sequence for the individual teacher.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Answer a new Praxis 5412 instructional-leadership scenario covering actionable feedback, supporting a struggling novice teacher, evaluating PD transfer, or protecting coaching confidentiality.',
          requiredOutput: 'Select the option that pairs concrete, growth-oriented coaching with clear role boundaries and defensible formal evaluation protocols.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'lead5412-playbook-schoolwide-averages-hiding-subgroup-gaps',
      familyId: 'lead5412-schoolwide-averages-hiding-subgroup-gaps',
      familyLabel: 'Letting Schoolwide Averages Hide Subgroup Equity and Climate Gaps',
      title: 'Disaggregate Data by Subgroup to Uncover and Repair Systemic Equity Gaps',
      recognitionCue: 'A school reports a reassuring 82% overall proficiency or 91% attendance average, yet a hidden table or prompt clause hints at disproportionate suspensions, low AP/honors enrollment, or stagnant growth for multilingual learners, students with IEPs, or specific racial subgroups.',
      repairQuestion: 'Does this leadership response disaggregate outcomes by subgroup to diagnose institutional barriers—rather than resting on schoolwide averages or attributing gaps to student deficits?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Hunt for masked disparities inside aggregate metrics (achievement, referral rates, chronic absenteeism, gifted/AP placement, and climate surveys) and flag deficit-framed distractors that blame families or recommend lowering standards.',
          requiredOutput: 'Name the specific hidden subgroup disparity and identify the institutional practice (such as subjective discipline referrals or gatekeeping prerequisites) that must be audited.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply an equity-audit workflow: disaggregate data across intersectional subgroups → compare relative risk ratios (such as referral share vs enrollment share) → inspect adult practices, scheduling, and Tier 1 instructional access → reallocate supports and monitor subgroup closure quarterly.',
          requiredOutput: 'State the difference between equal per-pupil distribution and equitable need-based allocation, and give one concrete action for auditing subjective office referrals.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A middle school\'s overall climate survey is 79% positive, yet Black students represent 18% of enrollment and 46% of subjective "disrespect" referrals, while multilingual students have half the honors placement rate. Evaluate four leadership plans.',
          requiredOutput: 'Outline a coordinated response combining calibrated behavioral definitions, restorative Tier 1 climate routines, universal honors screening, and quarterly disaggregated PLC reviews.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh Praxis 5412 climate-and-cultural-leadership item addressing disproportionality, student voice, culturally responsive belonging, or coordinated student supports.',
          requiredOutput: 'Choose the systemic, data-disaggregated, culturally affirming intervention while rejecting aggregate complacency or punitive crackdowns.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'lead5412-playbook-title-i-supplanting-and-procurement-conflicts',
      familyId: 'lead5412-title-i-supplanting-and-procurement-conflicts',
      familyLabel: 'Title I Supplanting Violations and Procurement Conflict-of-Interest Traps',
      title: 'Prevent Title I Supplanting, Bid-Splitting, and Procurement Conflicts of Interest',
      recognitionCue: 'An organizational or ethical-leadership vignette features a principal using Title I funds to cover a required general-education teacher salary, dividing a $28,000 technology order into three $9,500 invoices to avoid board bidding, or sitting on a selection committee where a spouse\'s company submitted a bid.',
      repairQuestion: 'Does this fiscal decision preserve supplement-not-supplant grant rules, full competitive-bidding transparency, multi-year sustainability, and strict conflict-of-interest recusal?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot the three highest-frequency 5412 fiscal-ethics traps: using restricted categorical grants (Title I/IDEA/Perkins) to replace state/local baseline funding (supplanting), circumventing procurement thresholds (bid-splitting or sole-source favoritism), and undisclosed personal/familial vendor conflicts.',
          requiredOutput: 'Name the exact fiscal or ethical violation in the scenario and explain why "saving the school money" never justifies bypassing statutory rules.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply the three-part fiscal compliance test: (1) Would the district have to fund this core cost anyway without federal dollars? If yes, Title I cannot pay for it (supplement, never supplant); (2) Does total multi-year cost (licenses, training, maintenance, replacement) trigger competitive bidding and align with strategic priorities?; (3) Disclose any real or perceived conflict in writing and recuse completely from review and voting.',
          requiredOutput: 'Draft a 3-point pre-signature audit rule covering categorical fund legality, total-cost-of-ownership budgeting, and conflict-of-interest recusal.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A principal faces a local budget shortfall and considers moving a required grade-4 classroom teacher onto Title I funds while also purchasing robotics kits from a brother-in-law\'s firm via two separate purchase orders under the bid cap.',
          requiredOutput: 'Identify both legal/ethical violations, state the compliant alternative for Title I allocation, and specify the mandatory disclosure, recusal, and competitive-bidding steps.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh Praxis 5412 organizational- or ethical-leadership item involving strategic budgeting, vendor data agreements, cybersecurity stewardship, or defensible personnel selection.',
          requiredOutput: 'Select the transparent, policy-compliant, strategically aligned fiscal decision and reject shortcut or conflict-tainted distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'lead5412-playbook-student-rights-tinker-goss-title-ix-ferpa',
      familyId: 'lead5412-student-rights-tinker-goss-title-ix-ferpa',
      familyLabel: 'Student-Rights Violations Across Tinker, Goss, Title IX, IDEA, and FERPA',
      title: 'Enforce Constitutional and Statutory Protections Under Tinker, Goss, Title IX, IDEA, and FERPA',
      recognitionCue: 'A legal-ethical vignette tests silent student protest armbands, an immediate 5-day suspension without letting the student tell their side, a parent reporting peer sexual harassment, a parent requesting a special-education evaluation during MTSS, or a vendor/board member demanding identifiable student files.',
      repairQuestion: 'Which exact federal case or statute governs this student right (Tinker, Goss, Title IX, IDEA, or FERPA), and does the principal\'s move satisfy its mandatory procedural trigger?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Match the factual trigger in the stem to its controlling legal standard: student political speech → Tinker substantial disruption test; short-term suspension (up to 10 days) → Goss v. Lopez notice and opportunity to be heard; sex-based harassment → Title IX prompt coordinator notification and supportive measures; parent disability-evaluation request → IDEA Child Find (cannot delay for MTSS tiers); identifiable student records → FERPA consent or legitimate educational interest.',
          requiredOutput: 'Map the vignette\'s trigger to its exact legal authority and flag distractors that rely on informal handling or blanket administrative bans.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Distinguish key legal boundaries that Praxis 5412 tests directly: Tinker protects peaceful political expression unless substantial disruption is forecast (unlike lewd speech in Fraser or school-sponsored newspapers in Hazelwood); IDEA requires manifestation determination before disciplinary change of placement beyond 10 days and forbids using MTSS to delay a requested evaluation; FERPA requires formal data-privacy agreements before vendor access.',
          requiredOutput: 'Write a compact 5-line legal bright-line reference covering Tinker, Goss v. Lopez, Title IX, IDEA/MTSS, and FERPA.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Work through three rapid principal calls: (1) students wear quiet protest shirts advocating climate policy with zero classroom disruption; (2) a parent submits a written request for an IDEA evaluation while the child is in week 3 of Tier 2 reading; (3) a tenth-grader reports recurring unwanted sexual comments in the hallway.',
          requiredOutput: 'State the exact legally required immediate administrative action for each of the three calls and name the trap to avoid in each.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a new Praxis 5412 ethical-leadership scenario involving directives that conflict with law, internal FERPA sharing, vendor student-data contracts, or harassment response.',
          requiredOutput: 'Choose the lawfully defensible action that upholds student rights, triggers formal procedural safeguards, and documents objectively.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'lead5412-playbook-top-down-mandates-vs-distributed-plc-governance',
      familyId: 'lead5412-top-down-mandates-vs-distributed-plc-governance',
      familyLabel: 'Top-Down Mandates Over Distributed PLCs and Multilingual Community Governance',
      title: 'Lead Through Distributed PLCs, Governance Boundaries, and Multilingual Family Co-Design',
      recognitionCue: 'A community- or cultural-leadership item shows a principal unilaterally imposing a new master schedule, treating a vocal PTO subset as representative of all families, or responding defensively at a heated public meeting instead of facilitating structured, multilingual shared governance.',
      repairQuestion: 'Does this leadership approach build shared ownership through distributed teacher leadership, representative multilingual family input, transparent governance lanes, and a visible "you said → we did" feedback loop?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify unilateral or exclusionary traps: drafting vision/policy alone and announcing it via English-only email, holding meetings solely at 2:00 PM with no interpretation, debating individual student issues in public meetings, or stepping outside school-board governance policy.',
          requiredOutput: 'List the specific participation barrier, governance boundary breach, or top-down failure present in the weak options.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Combine distributed leadership (structured PLCs with shared norms and real instructional authority) with reciprocal community engagement: map community assets, audit advisory-committee demographics against school enrollment, offer flexible times/childcare/interpretation, and close every listening cycle with public follow-up.',
          requiredOutput: 'Design a 4-step reciprocal engagement protocol from barrier removal and multilingual outreach through transparent feedback-loop reporting.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'During a contentious community forum on a proposed bell-schedule change, a parent demands to know why a specific teacher received a poor review, while working multilingual families representing 40% of students are absent from the advisory committee.',
          requiredOutput: 'State how to redirect the confidential personnel question calmly within governance policy and specify three concrete actions to broaden representative multilingual participation before finalizing the schedule.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh Praxis 5412 community-engagement item covering crisis communication, strategic community partnerships, evidence-based advocacy, or advisory representation.',
          requiredOutput: 'Select the collaborative, equitable, governance-aligned leadership move that amplifies underrepresented voices and closes the accountability loop.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const school_librarian_5312 = {
  misconceptionFamilies: [
    {
      id: 'sl5312-stealth-weeding-vs-reconsideration-policy',
      label: 'Stealth Weeding or Quiet Removal Instead of Board Reconsideration Policy',
      description: 'Quietly pulling, hiding behind the desk, labeling with restrictive warnings, or "stealth weeding" a controversial title in response to an informal complaint or fear of controversy instead of following the district\'s board-approved selection and formal reconsideration policy while keeping the material accessible during review.',
      remediationMove: 'Uphold intellectual freedom and the Library Bill of Rights: never censor or quietly pull challenged materials; listen respectfully, share the written board-approved reconsideration procedure, keep the item on the shelf during formal review, and document objective selection criteria.',
      remediationPlaybookId: 'sl5312-playbook-stealth-weeding-vs-reconsideration-policy',
      itemIds: [
        'sl5312-b1-021',
        'sl5312-b1-022',
        'sl5312-b1-029',
        'sl5312-b1-030',
        'sl5312-b1-031',
        'sl5312-b1-032',
        'sl5312-b1-048',
        'sl5312-b1-049',
        'sl5312-b1-050',
        'sl5312-b1-051',
        'sl5312-b1-097',
        'sl5312-b1-098'
      ]
    },
    {
      id: 'sl5312-fixed-coverage-vs-flexible-cotaught-inquiry',
      label: 'Fixed-Coverage Scheduling Instead of Flexible Co-Taught Inquiry',
      description: 'Treating the school library solely as a fixed weekly rotation to cover classroom teachers\' planning periods—isolating library lessons from curriculum units—rather than advocating for flexible (or blended flexible) scheduling that enables point-of-need co-planning, co-teaching, and co-assessment of inquiry.',
      remediationMove: 'Align library access to curriculum needs through flexible scheduling and instructional collaboration: co-design inquiry objectives with classroom teachers, embed information-literacy instruction at the exact moment students research, and co-assess student learning.',
      remediationPlaybookId: 'sl5312-playbook-fixed-coverage-vs-flexible-cotaught-inquiry',
      itemIds: [
        'sl5312-b1-040',
        'sl5312-b1-041',
        'sl5312-b1-042',
        'sl5312-b1-043',
        'sl5312-b1-060',
        'sl5312-b1-061',
        'sl5312-b1-062',
        'sl5312-b1-063',
        'sl5312-b1-064',
        'sl5312-b1-065',
        'sl5312-b1-066',
        'sl5312-b1-067'
      ]
    },
    {
      id: 'sl5312-circulation-only-vs-needs-based-crew',
      label: 'Relying on Circulation-Only Metrics Instead of Needs-Based Collection and CREW Weeding',
      description: 'Buying books strictly by popularity lists or judging collection quality by raw book count and circulation totals alone while ignoring collection mapping to curriculum standards, diversity audits, average publication age, and systematic CREW/MUSTIE deselection.',
      remediationMove: 'Base collection development and deselection on comprehensive needs assessment: map holdings to curriculum and student demographics, verify authoritative professional reviews, apply CREW/MUSTIE criteria continuously, and tie budget proposals to documented learning gaps.',
      remediationPlaybookId: 'sl5312-playbook-circulation-only-vs-needs-based-crew',
      itemIds: [
        'sl5312-b1-001',
        'sl5312-b1-002',
        'sl5312-b1-003',
        'sl5312-b1-004',
        'sl5312-b1-009',
        'sl5312-b1-010',
        'sl5312-b1-021',
        'sl5312-b1-022',
        'sl5312-b1-023',
        'sl5312-b1-024',
        'sl5312-b1-029',
        'sl5312-b1-031'
      ]
    },
    {
      id: 'sl5312-educational-use-automatic-fair-use',
      label: 'Treating Educational Use as Automatic Fair Use',
      description: 'Advising teachers or students that nonprofit school projects automatically qualify for fair use—allowing wholesale scanning of workbooks, streaming personal consumer movie accounts for Friday reward days, or posting copyrighted images publicly without weighing the four Section 107 factors, TEACH Act limits, or open-license alternatives.',
      remediationMove: 'Coach faculty and students to evaluate all four fair-use factors (purpose/transformativeness, nature, amount/substantiality, and market effect), distinguish face-to-face instructional exemptions from reward entertainment, verify database/Creative Commons licenses, and model ethical attribution.',
      remediationPlaybookId: 'sl5312-playbook-educational-use-automatic-fair-use',
      itemIds: [
        'sl5312-b1-025',
        'sl5312-b1-026',
        'sl5312-b1-027',
        'sl5312-b1-028',
        'sl5312-b1-044',
        'sl5312-b1-045',
        'sl5312-b1-046',
        'sl5312-b1-047',
        'sl5312-b1-048',
        'sl5312-b1-050',
        'sl5312-b1-064',
        'sl5312-b1-066'
      ]
    },
    {
      id: 'sl5312-patron-privacy-and-cipa-overblocking',
      label: 'Violating Patron Circulation Privacy or Overblocking Under CIPA',
      description: 'Keeping permanent student checkout histories in the ILS, posting overdue lists with student names and book titles publicly, sharing a student\'s reading history with curious staff or non-authorized requestors, or configuring CIPA internet filters so aggressively that legitimate health, civic, and curriculum research is blocked with no prompt unblocking path.',
      remediationMove: 'Minimize data retention by purging circulation histories once items return, safeguard patron confidentiality under FERPA and ALA ethics, and implement CIPA filtering narrowly paired with digital-citizenship education and a fast, transparent site-unblocking protocol.',
      remediationPlaybookId: 'sl5312-playbook-patron-privacy-and-cipa-overblocking',
      itemIds: [
        'sl5312-b1-005',
        'sl5312-b1-007',
        'sl5312-b1-025',
        'sl5312-b1-027',
        'sl5312-b1-040',
        'sl5312-b1-042',
        'sl5312-b1-048',
        'sl5312-b1-049',
        'sl5312-b1-050',
        'sl5312-b1-051',
        'sl5312-b1-068',
        'sl5312-b1-070'
      ]
    },
    {
      id: 'sl5312-passive-warehouse-vs-aasl-udl-advocacy',
      label: 'Operating as a Passive Book Warehouse Instead of AASL Instructional, UDL, and Staffing Leadership',
      description: 'Confining the school librarian\'s role to shelving, checkouts, and static CRAAP checklists while missing opportunities to lead AASL Shared Foundations inquiry, teach lateral reading against online misinformation, design UDL-accessible spaces and collections, and advocate for staffing and budgets with student-learning impact data.',
      remediationMove: 'Position the school library as an active instructional hub grounded in AASL Shared Foundations: teach lateral reading and verification, embed UDL physical and digital accessibility, lead faculty professional learning, and present outcome-focused evidence to administrators and boards.',
      remediationPlaybookId: 'sl5312-playbook-passive-warehouse-vs-aasl-udl-advocacy',
      itemIds: [
        'sl5312-b1-044',
        'sl5312-b1-046',
        'sl5312-b1-068',
        'sl5312-b1-069',
        'sl5312-b1-070',
        'sl5312-b1-071',
        'sl5312-b1-089',
        'sl5312-b1-090',
        'sl5312-b1-093',
        'sl5312-b1-094',
        'sl5312-b1-097',
        'sl5312-b1-099'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'sl5312-playbook-stealth-weeding-vs-reconsideration-policy',
      familyId: 'sl5312-stealth-weeding-vs-reconsideration-policy',
      familyLabel: 'Stealth Weeding or Quiet Removal Instead of Board Reconsideration Policy',
      title: 'Follow Board-Approved Reconsideration Policy Instead of Stealth Weeding or Self-Censorship',
      recognitionCue: 'A parent, teacher, or administrator objects informally to a library book\'s themes and asks the librarian to quietly discard it during weeding, move it to a restricted shelf requiring permission slips, or skip buying similar titles to avoid complaints.',
      repairQuestion: 'Does this response honor the written board-approved reconsideration policy and preserve open access during review, or does it commit stealth censorship, prejudicial labeling, or self-censorship?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot disguised censorship traps in Praxis 5312 choices: "stealth weeding" a challenged title under the pretext of shelf space, slapping age/content warning stickers on books (prejudicial labeling), locking items behind the desk, or silently removing a book before the committee meets.',
          requiredOutput: 'Identify the exact intellectual-freedom violation in each distractor and distinguish objective CREW weeding from viewpoint-based removal.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Sequence the legally and ethically defensible challenge protocol: listen calmly without arguing → explain the board-approved selection policy and offer the written Request for Reconsideration form → notify the principal → keep the item circulating while a representative committee evaluates the work as a whole → abide by the formal board decision.',
          requiredOutput: 'Write a 5-step formal reconsideration workflow highlighting why the material stays accessible throughout committee review.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'An angry caregiver emails demanding immediate removal of a starred-review middle-grade novel by Friday, and an assistant principal suggests "just pulling it quietly for a month until things cool down."',
          requiredOutput: 'Draft the librarian\'s professional response to both the caregiver and the administrator grounded in board policy, ALA Library Bill of Rights principles, and documented selection reviews.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a fresh School Librarian 5312 item about book challenges, weeding policy disputes, or defending diverse collection acquisitions.',
          requiredOutput: 'Choose the policy-anchored, transparent reconsideration or objective-selection response while rejecting unilateral removal or self-censorship.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sl5312-playbook-fixed-coverage-vs-flexible-cotaught-inquiry',
      familyId: 'sl5312-fixed-coverage-vs-flexible-cotaught-inquiry',
      familyLabel: 'Fixed-Coverage Scheduling Instead of Flexible Co-Taught Inquiry',
      title: 'Advance Flexible Scheduling and Co-Taught Curriculum-Integrated Inquiry',
      recognitionCue: 'A library scheduling or teaching item depicts classes cycling through a rigid 30-minute weekly slot while classroom teachers leave for prep—leading to standalone library-skills worksheets—and a distractor accepts fixed coverage as easier to manage.',
      repairQuestion: 'Does this scheduling and instructional model connect information-literacy lessons directly to authentic classroom units through co-planning, co-teaching, and co-assessment at the point of need?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify signs of isolated library delivery (fixed planning-coverage blocks, isolated Dewey-decimal drills, teachers dropping off classes without co-planning) versus authentic collaborative inquiry aligned to content and AASL standards.',
          requiredOutput: 'Contrast the instructional impact of fixed coverage versus flexible or blended flexible scheduling on point-of-need research mastery.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply the full instructional-partner cycle (co-plan aligned objectives → co-teach search strategy and synthesis inside the content unit → co-assess the research process and final product) and use a phased transition (such as blended fixed-flex blocks or pilot grade-level partnerships) when a school currently runs a fixed schedule.',
          requiredOutput: 'List three concrete steps a librarian can propose to a principal to transition from rigid fixed scheduling toward flexible collaborative access.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Fifth-grade teachers send students to the library only during fixed Thursday prep blocks while assigning an unrelated state-history research paper in class, resulting in copy-pasted web paragraphs. Redesign the partnership.',
          requiredOutput: 'Outline a co-planned, co-taught 3-session inquiry sequence integrating state-history objectives, keyword/database search scaffolding, and a shared note-taking and citation rubric.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new Praxis 5312 teaching-and-learning item involving collaborative planning disagreements, standards alignment, or instructional leadership.',
          requiredOutput: 'Select the option that treats the librarian as an equal instructional co-planner and co-assessor delivering point-of-need inquiry instruction.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sl5312-playbook-circulation-only-vs-needs-based-crew',
      familyId: 'sl5312-circulation-only-vs-needs-based-crew',
      familyLabel: 'Relying on Circulation-Only Metrics Instead of Needs-Based Collection and CREW Weeding',
      title: 'Drive Collection Development and CREW Weeding Through Needs Assessment and Curriculum Mapping',
      recognitionCue: 'A collection-management vignette shows a librarian refusing to weed outdated 1998 astronomy or medical books to keep volume counts high, or allocating the entire budget to bestselling fiction based solely on raw circulation counts.',
      repairQuestion: 'Are acquisitions and deselection guided by curriculum mapping, demographic/diversity needs assessment, authoritative reviews, and CREW/MUSTIE criteria—not raw circulation totals or shelf-count inflation?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot collection-management traps: hoarding inaccurate or shabby books to inflate books-per-student ratios, relying solely on circulation counts while ignoring non-circulating curriculum gaps, or buying unreviewed donations and vendor bundles without aligning to selection policy.',
          requiredOutput: 'Flag which metric is misleading in the stem and name the missing collection-analysis evidence (curriculum map, average copyright age, diversity audit, or MUSTIE trigger).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Operationalize the CREW method and MUSTIE criteria (Misleading/factually inaccurate, Ugly/worn, Superseded by new edition, Trivial, Irrelevant to community/curriculum, Elsewhere readily available) alongside a continuous needs-assessment cycle linking curriculum changes and learner demographics directly to budget priorities.',
          requiredOutput: 'Write a concise MUSTIE decision check and explain why pruning outdated nonfiction typically increases overall library circulation and trust.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A library audit reveals an average 500s/600s science copyright year of 2004, strong graphic-novel circulation, zero dual-language nonfiction for a growing 22% multilingual population, and a principal asking for a zero-based budget rationale.',
          requiredOutput: 'Specify which holdings to weed using MUSTIE, which selection tools to consult for replacement titles, and how to tie the budget request directly to curriculum standards and learner needs.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh Praxis 5312 program-administration or organization-access scenario on collection development, cataloging discoverability, budget stewardship, or weeding disputes.',
          requiredOutput: 'Choose the evidence-based, curriculum-mapped, CREW-aligned collection decision over raw circulation or shelf-filling habits.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sl5312-playbook-educational-use-automatic-fair-use',
      familyId: 'sl5312-educational-use-automatic-fair-use',
      familyLabel: 'Treating Educational Use as Automatic Fair Use',
      title: 'Apply Four-Factor Fair Use, Licensing Terms, and Ethical Attribution Across the School',
      recognitionCue: 'A teacher or student asks whether a school can show a commercial streaming movie as an attendance reward, post scanned textbook chapters on a public website, or reuse copyrighted photographs in a published student podcast "because it is for education."',
      repairQuestion: 'Does this proposed use pass a balanced four-factor Section 107 fair-use analysis (or specific face-to-face/TEACH Act exemption and license terms), or is the option mistakenly assuming nonprofit schooling grants blanket immunity?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify copyright misconceptions in the stem: equating nonprofit education with automatic fair use, confusing face-to-face instructional movie clips (Section 110(1)) with entertainment reward screenings (which require a public performance license), or overlooking contract terms in streaming and database licenses.',
          requiredOutput: 'Name the specific copyright misconception and identify which of the four fair-use factors (purpose, nature, amount, market effect) cuts against the proposed use.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Teach the practical school-librarian copyright workflow: weigh all four Section 107 factors (emphasizing transformative educational purpose and zero market harm) → check existing library database permissions and Creative Commons/public-domain sources → distinguish classroom teaching from public web distribution or reward events → model complete ethical citation.',
          requiredOutput: 'Create a 4-factor fair-use check plus one clear rule distinguishing a curriculum-tied classroom film clip from an after-school or reward movie screening.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A middle-school club wants to stream a recent commercial animated film from a teacher\'s personal subscription as a Friday PBIS reward, while a ninth-grade class wants to publish an open podcast using full copyrighted pop songs as background music.',
          requiredOutput: 'Explain why neither use qualifies as fair use or Section 110(1) classroom exemption, and recommend the exact legal alternative (public performance license and Creative Commons/royalty-free audio with attribution) for each.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh Praxis 5312 item addressing intellectual property, digital citizenship, source attribution, or advising faculty on copyrighted instructional media.',
          requiredOutput: 'Select the ethically sound, four-factor-informed guidance that equips teachers and students with lawful alternatives rather than blanket bans or blanket exemptions.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sl5312-playbook-patron-privacy-and-cipa-overblocking',
      familyId: 'sl5312-patron-privacy-and-cipa-overblocking',
      familyLabel: 'Violating Patron Circulation Privacy or Overblocking Under CIPA',
      title: 'Protect Patron Circulation Confidentiality and Prevent CIPA Overblocking',
      recognitionCue: 'A scenario involves storing multi-year student checkout logs in the library catalog, emailing a homeroom teacher a list of specific book titles a student borrowed, or an E-rate CIPA web filter blocking reputable medical, LGBTQ+, or historical databases without an unblocking workflow.',
      repairQuestion: 'Does this policy minimize identifiable patron record retention under FERPA and ALA privacy ethics while calibrating CIPA filtering narrowly with prompt access restoration for legitimate research?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot dual access-and-privacy traps: retaining unnecessary circulation history or exposing borrowing records publicly (violating patron confidentiality and FERPA) and equating CIPA compliance with sweeping keyword blocks that chill legitimate inquiry.',
          requiredOutput: 'Flag whether the scenario\'s primary failure is a patron-privacy leak or CIPA overblocking, and eliminate distractors that ignore either legal duty.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply the two professional standards cleanly: (1) Privacy—configure the ILS to sever patron-item links automatically upon return, use private overdue notices without public title shaming, and follow board/legal procedures for any record request; (2) CIPA—block only statutory visual categories required for E-rate, pair filtering with digital-citizenship instruction, and maintain a rapid, transparent review/unblocking request process with IT.',
          requiredOutput: 'Write two actionable policy safeguards: one for ILS circulation-data minimization and one for preventing and promptly resolving CIPA overblocking.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A school\'s web filter blocks breast-cancer biology articles during a tenth-grade health project, and the library\'s ILS keeps every student\'s complete 4-year checkout log visible to student aides at the circulation desk.',
          requiredOutput: 'Specify the immediate IT-collaboration and unblocking protocol for the health research sites and the exact ILS privacy and student-aide permission fixes.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Answer a fresh Praxis 5312 information-access or organization-access question involving ILS configuration, confidential patron records, equitable internet access, or intellectual freedom.',
          requiredOutput: 'Choose the move that safeguards confidential patron records and preserves equitable, narrowly filtered access to curriculum and personal-inquiry resources.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sl5312-playbook-passive-warehouse-vs-aasl-udl-advocacy',
      familyId: 'sl5312-passive-warehouse-vs-aasl-udl-advocacy',
      familyLabel: 'Operating as a Passive Book Warehouse Instead of AASL Instructional, UDL, and Staffing Leadership',
      title: 'Lead with AASL Shared Foundations, Lateral Reading, UDL Access, and Evidence-Based Advocacy',
      recognitionCue: 'A leadership or information-literacy vignette shows a librarian staying behind the circulation desk, teaching outdated surface-level URL checks ("trust .org sites"), ignoring physical/digital accessibility barriers, or defending library funding with anecdotes instead of student-learning impact data.',
      repairQuestion: 'Does the librarian actively lead AASL inquiry, lateral-reading verification, UDL-accessible design, and outcome-driven advocacy—rather than functioning as a passive book custodian?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot passive-custodian and outdated-literacy distractors: relying on ".edu/.org" domain heuristics instead of lateral reading, retrofitting accessibility only after a complaint instead of proactive UDL, or arguing for staffing using book-shelving volume rather than instructional impact.',
          requiredOutput: 'Identify which active leadership pillar (AASL Shared Foundations, lateral reading, UDL accessibility, or evidence-based advocacy) the stem tests.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Integrate four modern school-librarian leadership practices: align lessons to AASL Shared Foundations (Inquire, Include, Collaborate, Curate, Explore, Engage); teach SIFT lateral reading (leave the site to verify the source and claims); apply UDL across physical signage, shelf height, audiobooks, and WCAG-accessible databases; and report co-taught learning outcomes and equity metrics to principals and boards.',
          requiredOutput: 'Write one crisp example of teaching lateral reading (replacing ".org" trust) and one outcome-based metric stronger than checkout count for advocating library staffing.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Facing a proposed 0.5 FTE staffing cut, a high school librarian also notices eleventh-graders citing a polished advocacy blog with a ".org" domain as an unbiased scientific source and students with visual/reading disabilities struggling to navigate print-only displays.',
          requiredOutput: 'Propose an integrated plan covering a co-taught SIFT lateral-reading mini-lesson, two UDL physical/digital accessibility upgrades, and an evidence-based advocacy brief linking co-taught inquiry gains to certified librarian staffing.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh Praxis 5312 item on source evaluation, differentiation and accessibility, faculty professional learning, or stakeholder advocacy.',
          requiredOutput: 'Select the proactive, AASL-aligned, UDL-accessible, evidence-driven leadership choice while rejecting passive warehouse or surface-checklist distractors.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

module.exports = {
  plt_5_9_5623,
  plt_7_12_5624,
  educational_leadership_5412,
  school_librarian_5312
};
