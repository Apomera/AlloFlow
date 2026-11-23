'use strict';

/**
 * Curated misconception families and 4-stage remediation playbooks (36 total) for:
 * - special_education_5355 (6 pairs)
 * - special_education_behavior_emotional_5372 (6 pairs)
 * - special_education_early_childhood_5692 (6 pairs; strictly respects Part C IFSP / Part B IEP scope wording)
 * - special_education_intellectual_disabilities_5322 (6 pairs)
 * - special_education_learning_disabilities_5383 (6 pairs)
 * - special_education_severe_profound_5547 (6 pairs)
 */

const PLAYBOOK_META = {
  status: 'internal-remediation-playbook',
  reviewStatus: 'source-reviewed-editorial-pass',
  releaseEligible: false
};

const special_education_5355 = {
  misconceptionFamilies: [
    {
      id: 'sp5355-accommodations-vs-modifications',
      label: 'Conflating Accommodations with Curriculum Modifications',
      description: 'Treating changes that alter grade-level academic standards, reduce target concepts, or change grading criteria as accommodations, or withholding legitimate access accommodations such as text-to-speech, extended time, or graphic organizers out of concern that they lower academic rigor.',
      remediationMove: 'Apply the construct-preservation test before choosing a support: if the student demonstrates mastery of the exact same grade-level standard through an adjusted presentation, response, setting, or timing format, it is an accommodation; if the target skill, standard complexity, or mastery criterion changes, it is a modification.',
      remediationPlaybookId: 'sp5355-playbook-accommodations-vs-modifications',
      itemIds: [
        'sp5355-b1-027',
        'sp5355-b1-028',
        'sp5355-b1-029',
        'sp5355-b1-030',
        'sp5355-b1-031',
        'sp5355-b1-032',
        'sp5355-b1-033',
        'sp5355-b1-034',
        'sp5355-b1-035',
        'sp5355-b1-036',
        'sp5355-b1-037',
        'sp5355-b1-038'
      ]
    },
    {
      id: 'sp5355-lre-continuum-and-fape-placement',
      label: 'Equating LRE with Automatic Full Inclusion or Category-Based Placement',
      description: 'Assuming Least Restrictive Environment (LRE) requires 100% general education placement regardless of whether the student makes appropriate progress toward FAPE, or assigning a self-contained or resource room based on a disability label or building staffing instead of individual IEP needs.',
      remediationMove: 'Evaluate placement only after IEP goals and supplementary aids and services are defined, starting in general education and moving along the IDEA continuum of alternative placements solely to the extent required for meaningful educational benefit.',
      remediationPlaybookId: 'sp5355-playbook-lre-continuum-and-fape-placement',
      itemIds: [
        'sp5355-b1-027',
        'sp5355-b1-028',
        'sp5355-b1-029',
        'sp5355-b1-030',
        'sp5355-b1-031',
        'sp5355-b1-032',
        'sp5355-b1-082',
        'sp5355-b1-083',
        'sp5355-b1-084',
        'sp5355-b1-085',
        'sp5355-b1-086',
        'sp5355-b1-087'
      ]
    },
    {
      id: 'sp5355-idea-timelines-pwn-and-consent',
      label: 'Mixing Up IDEA Timelines, Informed Consent Boundaries, and PWN Triggers',
      description: 'Delaying an initial evaluation until tiered RTI cycles finish, treating parent consent to evaluate as consent to begin special education services, misremembering federal 60-day evaluation and 30-day IEP meeting deadlines, or failing to issue Prior Written Notice (PWN) when refusing a parent request.',
      remediationMove: 'Track each IDEA procedural safeguard as a separate legal gate: written informed consent for initial evaluation starts the 60-calendar-day clock (unless state law sets a shorter window), separate written consent is required before initial placement, and PWN is mandatory whenever the district proposes or refuses to initiate or change identification, evaluation, placement, or FAPE.',
      remediationPlaybookId: 'sp5355-playbook-idea-timelines-pwn-and-consent',
      itemIds: [
        'sp5355-b1-082',
        'sp5355-b1-083',
        'sp5355-b1-084',
        'sp5355-b1-085',
        'sp5355-b1-086',
        'sp5355-b1-087',
        'sp5355-b1-088',
        'sp5355-b1-089',
        'sp5355-b1-090',
        'sp5355-b1-091',
        'sp5355-b1-092',
        'sp5355-b1-093'
      ]
    },
    {
      id: 'sp5355-mdr-discipline-and-fba-bip-links',
      label: 'Applying Routine Discipline Rules Without Manifestation Determination Safeguards',
      description: 'Treating a disciplinary removal exceeding 10 consecutive school days or a pattern of short-term removals over 10 cumulative days as a standard suspension, overlooking the two-prong Manifestation Determination Review (MDR) questions, or misapplying the 45-school-day Interim Alternative Educational Setting (IAES) rule.',
      remediationMove: 'Trigger an MDR within 10 school days of any disciplinary change of placement, test both IDEA prongs (direct/substantial relation to disability and direct result of IEP implementation failure), return the student with an FBA/BIP if either prong is yes, and limit unilateral 45-school-day IAES removals strictly to weapons, drugs, or serious bodily injury.',
      remediationPlaybookId: 'sp5355-playbook-mdr-discipline-and-fba-bip-links',
      itemIds: [
        'sp5355-b1-007',
        'sp5355-b1-008',
        'sp5355-b1-009',
        'sp5355-b1-010',
        'sp5355-b1-011',
        'sp5355-b1-012',
        'sp5355-b1-088',
        'sp5355-b1-089',
        'sp5355-b1-090',
        'sp5355-b1-091',
        'sp5355-b1-092',
        'sp5355-b1-093'
      ]
    },
    {
      id: 'sp5355-assessment-bias-and-eligibility-vs-progress',
      label: 'Misusing Norm-Referenced Tests for Progress Monitoring or Ignoring Cultural and Linguistic Bias',
      description: 'Using broad norm-referenced achievement batteries to guide weekly instructional adjustments instead of curriculum-based measurement (CBM), relying on a single test score for IDEA eligibility, or interpreting normal second-language acquisition and cultural communication patterns as a disability.',
      remediationMove: 'Match every instrument to its psychometric purpose (norm-referenced for peer comparison, criterion-referenced for standard mastery, CBM for frequent progress monitoring), require multiple nondiscriminatory measures administered in the student\'s native language or most accurate communication mode, and rule out limited English proficiency before eligibility.',
      remediationPlaybookId: 'sp5355-playbook-assessment-bias-and-eligibility-vs-progress',
      itemIds: [
        'sp5355-b1-059',
        'sp5355-b1-060',
        'sp5355-b1-061',
        'sp5355-b1-062',
        'sp5355-b1-063',
        'sp5355-b1-064',
        'sp5355-b1-065',
        'sp5355-b1-066',
        'sp5355-b1-067',
        'sp5355-b1-068',
        'sp5355-b1-069',
        'sp5355-b1-070'
      ]
    },
    {
      id: 'sp5355-disability-characteristics-and-iep-alignment',
      label: 'Writing Unmeasurable IEP Goals Disconnected from PLAAFP and Misusing Co-Teaching or Paraprofessionals',
      description: 'Drafting broad, label-driven IEP goals without baseline PLAAFP impact data or observable mastery criteria, treating co-teaching as permanent One Teach, One Assist, or delegating initial lesson design and primary instructional decision-making to a paraprofessional.',
      remediationMove: 'Anchor every annual IEP goal directly to an observable PLAAFP deficit using condition, measurable behavior, and mastery criterion; select co-teaching models (Station, Parallel, Alternative, Team Teaching) to maximize active instruction; and restrict paraprofessionals to teacher-planned, supervised support.',
      remediationPlaybookId: 'sp5355-playbook-disability-characteristics-and-iep-alignment',
      itemIds: [
        'sp5355-b1-001',
        'sp5355-b1-002',
        'sp5355-b1-003',
        'sp5355-b1-004',
        'sp5355-b1-005',
        'sp5355-b1-006',
        'sp5355-b1-007',
        'sp5355-b1-008',
        'sp5355-b1-009',
        'sp5355-b1-010',
        'sp5355-b1-011',
        'sp5355-b1-012'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'sp5355-playbook-accommodations-vs-modifications',
      familyId: 'sp5355-accommodations-vs-modifications',
      familyLabel: 'Conflating Accommodations with Curriculum Modifications',
      title: 'Apply the Construct-Preservation Test to Separate Accommodations from Modifications',
      recognitionCue: 'A 5355 scenario describes a classroom or testing support—such as audio read-aloud, reducing ten problems to five covering fewer skills, or grading only content ideas—and asks whether it preserves grade-level standards or alters the assessed construct.',
      repairQuestion: 'After this support is applied, is the student still being held to the exact same grade-level academic construct and mastery standard, or has the learning expectation itself been reduced or substituted?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify the target construct being taught or tested in the vignette (for example, reading decoding versus science concept comprehension) and inspect whether the proposed support changes access or changes the standard.',
          requiredOutput: 'Label the target academic construct and flag any distractor that either mislabels a standard reduction as an accommodation or restricts an access tool that leaves the construct intact.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Sort supports along the four accommodation categories (presentation, response, setting, timing/scheduling) versus curriculum modifications (altered content depth, simplified learning goals, reduced standard coverage, modified grading scale) and verify alignment with state assessment rules.',
          requiredOutput: 'Write a two-column rule contrasting when text-to-speech is a valid accommodation (math or science assessment) versus when it alters the measured construct (oral decoding fluency assessment).'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Classify four IEP supports for a sixth-grade student with dyslexia: (a) providing audiobooks for a social studies unit, (b) reducing a 20-word spelling list to 8 simpler second-grade words, (c) dictating a history essay via speech-to-text, and (d) replacing a multi-step fraction test with single-digit addition.',
          requiredOutput: 'Assign each support to Accommodation or Modification and explain in one sentence per item how the grade-level standard is preserved or altered.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5355 IEP-team item where a general education teacher asks whether letting a student use a multiplication chart or shortened assignment compromises fairness, then pick the legally and instructionally sound recommendation.',
          requiredOutput: 'Select the response that matches IEP-documented accommodations to daily instruction and testing without unilaterally modifying standards or creating an accommodation-only test surprise.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sp5355-playbook-lre-continuum-and-fape-placement',
      familyId: 'sp5355-lre-continuum-and-fape-placement',
      familyLabel: 'Equating LRE with Automatic Full Inclusion or Category-Based Placement',
      title: 'Sequence IEP Goals, Supplementary Aids, and the IDEA LRE Continuum Before Placement',
      recognitionCue: 'A placement vignette tempts you either to keep a student in general education with zero documented progress just to maximize inclusion, or to jump straight to a self-contained classroom because of a disability label or district program structure.',
      repairQuestion: 'Has the IEP team first written individualized goals and tested supplementary aids and services in general education before considering a more restrictive setting along the IDEA continuum to guarantee FAPE?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check the stem for two legal traps: predetermination by disability category or administrative convenience, and treating LRE as a single fixed location rather than a continuum anchored to FAPE progress (Endrew F. standard).',
          requiredOutput: 'Identify whether the distractor commits category-based predetermination or ignores FAPE benefit in the current environment.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Order the statutory IEP decision sequence (PLAAFP → measurable annual goals → services and supplementary aids → LRE placement determination) and map the IDEA continuum from general education with supports to resource, separate class, separate school, residential, and home/hospital.',
          requiredOutput: 'State why placement is always the final IEP decision and list three supplementary aids and services that must be considered before removing a student from general education.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Evaluate two scenarios: (1) a principal says all newly identified fourth graders with autism attend the district\'s self-contained cluster site, and (2) an IEP team sees a student failing to progress in general education reading even with co-teaching and AT and considers targeted pull-out decoding instruction.',
          requiredOutput: 'Explain why scenario 1 violates IDEA LRE predetermination rules and how scenario 2 properly uses the continuum while preserving general education participation in non-reading periods.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh 5355 placement item asking what the IEP team must document when proposing part-time resource services for a student with significant academic needs.',
          requiredOutput: 'Choose the option that documents why satisfactory education cannot be achieved in general education even with supplementary aids and services, plus the exact extent of nonparticipation.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sp5355-playbook-idea-timelines-pwn-and-consent',
      familyId: 'sp5355-idea-timelines-pwn-and-consent',
      familyLabel: 'Mixing Up IDEA Timelines, Informed Consent Boundaries, and PWN Triggers',
      title: 'Lock In IDEA Statutory Clocks, Dual Consent Gates, and Prior Written Notice Rules',
      recognitionCue: 'An item mentions a parent submitting a written evaluation request, revoking consent, requesting a new service the school declines, or waiting for RTI cycles to conclude before testing.',
      repairQuestion: 'Which exact IDEA procedural safeguard is triggered right now—evaluation consent, placement consent, Prior Written Notice (PWN), or a federal statutory timeline—and what action is legally prohibited?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot the exact procedural trigger in the prompt (initial referral, parent refusal/revocation of consent, proposed or refused IEP change, triennial re-evaluation) and flag any distractor that stalls evaluation for RTI or skips written notice.',
          requiredOutput: 'Name the triggered IDEA safeguard and identify the procedural violation embedded in the tempting distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Map the core federal IDEA clocks and consent rules: 60 calendar days from written consent to initial evaluation completion (unless state law is shorter), 30 calendar days from eligibility to initial IEP meeting, annual IEP review, 3-year re-evaluation, separate written consent for evaluation versus initial services, and parent right to revoke consent in writing (ending services after PWN, with no due-process override for initial services).',
          requiredOutput: 'Create a 4-line procedural reference table pairing each event (parent referral, district refusal, initial placement, parent revocation) with the required notice, consent rule, and deadline.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Determine the legally compliant response to three cases: (a) a parent requests an evaluation in writing while the child is in week 3 of Tier 2 RTI, (b) a parent signs evaluation consent so the school starts pull-out services immediately after testing, and (c) the team declines a parent\'s request for an assistive device.',
          requiredOutput: 'Specify the exact IDEA-compliant step for each case, explicitly noting where PWN or separate written consent is required.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5355 procedural-safeguards vignette involving either an Independent Educational Evaluation (IEE) at public expense or parent revocation of special education services.',
          requiredOutput: 'Select the option that follows IDEA\'s exact legal duty (either fund the IEE or file due process without unnecessary delay; honor written revocation with PWN and cease services).'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sp5355-playbook-mdr-discipline-and-fba-bip-links',
      familyId: 'sp5355-mdr-discipline-and-fba-bip-links',
      familyLabel: 'Applying Routine Discipline Rules Without Manifestation Determination Safeguards',
      title: 'Execute the IDEA 10-Day Change-of-Placement, MDR Two-Prong, and IAES Decision Tree',
      recognitionCue: 'A student with an IEP accumulates repeated short-term suspensions or faces a long-term suspension/expulsion, and distractors either treat the removal like any nondisabled student or skip the FBA/BIP return-to-placement requirement.',
      repairQuestion: 'Does this removal exceed 10 consecutive school days or create a pattern over 10 cumulative days, and what must follow from each outcome of the two-prong Manifestation Determination Review (MDR)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Count consecutive and cumulative suspension days in the vignette and check whether the incident involves one of IDEA\'s three 45-school-day special circumstances (weapons, illegal drugs/controlled substances, or serious bodily injury at school or a school function).',
          requiredOutput: 'State whether a disciplinary change of placement has occurred and whether the 45-school-day IAES exception applies.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply the two MDR prongs within 10 school days: (1) was the conduct caused by or directly and substantially related to the disability, or (2) was it the direct result of the LEA\'s failure to implement the IEP? Contrast the mandatory next steps for a "yes" finding (immediate return to placement unless special circumstances or parent agrees, plus FBA and BIP creation/review) versus a "no" finding (same discipline as peers, but FAPE services continue starting day 11).',
          requiredOutput: 'Outline the branching outcomes for MDR-Yes, MDR-No, and 45-school-day IAES, including continuation of FAPE services.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Walk through two discipline cases: (a) a student with ADHD and EBD hits 12 cumulative suspension days across similar classroom-escape incidents and the team learns the BIP was never shared with the substitute teacher, and (b) a student with SLD brings a weapon to campus.',
          requiredOutput: 'Determine the MDR ruling for case (a) via prong 2 and specify the exact placement, FBA/BIP, and FAPE actions for both case (a) and case (b).'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new 5355 legal scenario where an administrator wants to suspend a student with an IEP for 15 days without educational services because the offense violated the zero-tolerance code of conduct.',
          requiredOutput: 'Choose the legally required IEP-team action (convene MDR within 10 school days and maintain FAPE services beyond day 10) and reject zero-tolerance exclusion distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sp5355-playbook-assessment-bias-and-eligibility-vs-progress',
      familyId: 'sp5355-assessment-bias-and-eligibility-vs-progress',
      familyLabel: 'Misusing Norm-Referenced Tests for Progress Monitoring or Ignoring Cultural and Linguistic Bias',
      title: 'Match Assessment Purpose and Nondiscriminatory Safeguards to IDEA Decisions',
      recognitionCue: 'An assessment item asks how to monitor biweekly IEP reading growth or evaluate a multilingual student, and distractors offer a standardized norm-referenced battery, a single IQ score, or English-only testing.',
      repairQuestion: 'Does the decision require peer comparison, standard mastery, or frequent growth sensitivity—and how does the evaluation prevent cultural, linguistic, or sensory bias from masquerading as disability?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify the decision context (universal screening, eligibility evaluation, diagnostic skill pinpointing, or ongoing IEP progress monitoring) and inspect the student\'s home language, cultural background, and sensory/motor access needs.',
          requiredOutput: 'State the exact assessment decision and flag any distractor that uses an insensitive norm-referenced score for weekly tracking or tests an emergent bilingual solely in English.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Differentiate norm-referenced tests (rank against peer sample; low instructional sensitivity), criterion-referenced tests (measure mastery of defined objectives), and CBM/CBA (brief, repeated probes sensitive to weekly growth), alongside IDEA nondiscriminatory evaluation rules (multiple measures, native language/mode unless clearly not feasible, trained interpreters, no single procedure as sole criterion).',
          requiredOutput: 'Map each assessment type to its valid use and list three safeguards required before determining eligibility for a culturally and linguistically diverse student.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Select the right assessment plan for two students: (1) a fifth grader with an IEP reading-fluency goal whose teacher needs data every two weeks, and (2) a newly arrived Spanish-speaking third grader scoring low on an English vocabulary subtest.',
          requiredOutput: 'Recommend CBM oral-reading-fluency probes with aimline graphing for student 1, and bilingual/native-language evaluation plus language-dominance and opportunity-to-learn review for student 2.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5355 assessment vignette testing reliability, validity, standard error of measurement (SEM), or disproportionate representation.',
          requiredOutput: 'Select the response that interprets scores using confidence bands and multiple converging data sources rather than a single raw score or grade equivalent.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sp5355-playbook-disability-characteristics-and-iep-alignment',
      familyId: 'sp5355-disability-characteristics-and-iep-alignment',
      familyLabel: 'Writing Unmeasurable IEP Goals Disconnected from PLAAFP and Misusing Co-Teaching or Paraprofessionals',
      title: 'Align PLAAFP Baselines, Measurable IEP Goals, Co-Teaching Models, and Paraprofessional Scope',
      recognitionCue: 'A planning or collaboration item offers an IEP goal with vague verbs ("understand," "improve"), defaults co-teachers to One Teach, One Assist every day, or lets a paraprofessional create and grade independent lessons.',
      repairQuestion: 'Does every IEP goal trace directly to a quantified PLAAFP need with observable mastery criteria, and are licensed teachers—not paraprofessionals—owning instructional design across active co-teaching structures?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Audit the draft IEP goal for missing PLAAFP linkage, non-observable verbs, or missing mastery/timeframe criteria, and audit team roles for passive co-teaching or unauthorized paraprofessional delegation.',
          requiredOutput: 'Pinpoint the exact missing IEP-goal element or collaboration role boundary violation in the stem.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply the four-part measurable goal formula (Condition + Observable Behavior + Mastery Criterion + Timeframe/Measurement Method) anchored to PLAAFP baseline data, match co-teaching models to instructional purpose (Parallel/Station for lower student-teacher ratio, Alternative for targeted preteaching/remediation, Team for dual modeling), and clarify paraprofessional duties (reinforcing teacher-planned instruction and collecting data under direct supervision).',
          requiredOutput: 'Rewrite a vague goal ("Student will improve paragraph writing") into a complete measurable annual goal and pair two co-teaching models with their best classroom use cases.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Fix two collaboration breakdowns: (a) a special educator stands at the back of an inclusive algebra class circulating silently all semester, and (b) a general educator asks a paraprofessional to introduce a brand-new reading comprehension unit and modify the test for three IEP students.',
          requiredOutput: 'Propose an active co-teaching shift (such as Station or Alternative Teaching with shared planning) for (a) and reassign initial instruction and test modification to the licensed teachers while specifying the paraprofessional\'s supervised reinforcement role in (b).'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh 5355 item asking which IEP component or collaborative practice best ensures alignment between student needs and classroom delivery.',
          requiredOutput: 'Choose the option that links quantitative PLAAFP data to measurable goals, active co-teaching parity, and legally compliant paraprofessional supervision.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const special_education_behavior_emotional_5372 = {
  misconceptionFamilies: [
    {
      id: 'ebd5372-topography-vs-function-fba',
      label: 'Intervening on Behavior Topography Instead of FBA-Identified Function',
      description: 'Selecting behavior interventions based on what a disruptive behavior looks like (such as shouting, tearing paper, or walking out) rather than analyzing Antecedent-Behavior-Consequence (ABC) data to identify the maintaining function (escape/avoidance, attention, tangible access, or automatic sensory stimulation).',
      remediationMove: 'Always identify the hypothesized function from ABC patterns before choosing a consequence: removing a student who acts out to escape difficult math tasks negatively reinforces the problem behavior, whereas teaching an appropriate escape/help request paired with antecedent task supports breaks the cycle.',
      remediationPlaybookId: 'ebd5372-playbook-topography-vs-function-fba',
      itemIds: [
        'ebd5372-b1-071',
        'ebd5372-b1-072',
        'ebd5372-b1-073',
        'ebd5372-b1-074',
        'ebd5372-b1-075',
        'ebd5372-b1-076',
        'ebd5372-b1-077',
        'ebd5372-b1-078',
        'ebd5372-b1-079',
        'ebd5372-b1-080',
        'ebd5372-b1-081',
        'ebd5372-b1-082'
      ]
    },
    {
      id: 'ebd5372-fct-and-differential-reinforcement',
      label: 'Confusing DRA, DRI, DRO, and Functional Communication Training (FCT)',
      description: 'Mixing up differential reinforcement procedures (DRA, DRI, DRO, DRL) or attempting planned ignoring and extinction without teaching a functionally equivalent, lower-effort replacement response through Functional Communication Training (FCT).',
      remediationMove: 'Match the differential reinforcement procedure to the exact behavioral goal (DRA reinforces an appropriate alternative serving the same function, DRI reinforces a physically incompatible behavior, DRO reinforces absence of the target behavior over an interval) and pair extinction with immediate FCT reinforcement so the replacement beats the problem behavior in effort and speed.',
      remediationPlaybookId: 'ebd5372-playbook-fct-and-differential-reinforcement',
      itemIds: [
        'ebd5372-b1-019',
        'ebd5372-b1-020',
        'ebd5372-b1-021',
        'ebd5372-b1-022',
        'ebd5372-b1-023',
        'ebd5372-b1-024',
        'ebd5372-b1-025',
        'ebd5372-b1-026',
        'ebd5372-b1-027',
        'ebd5372-b1-028',
        'ebd5372-b1-029',
        'ebd5372-b1-030'
      ]
    },
    {
      id: 'ebd5372-deescalation-and-restraint-safeguards',
      label: 'Escalating Crisis Cycles or Misusing Seclusion and Restraint as Behavior Plans',
      description: 'Using verbal confrontation, public reprimands, or academic problem-solving during the agitation, acceleration, or peak phases of Colvin\'s acting-out cycle, or embedding physical restraint and seclusion as routine BIP consequences rather than last-resort emergency safety measures.',
      remediationMove: 'Align adult response to the exact acting-out phase (quiet prompts and choices in agitation; calm space, minimal talk, and safety clearance at peak; non-punitive debriefing only in recovery) and restrict physical restraint or seclusion strictly to imminent risk of serious physical harm by trained staff with immediate documentation, parent notification, and post-incident review.',
      remediationPlaybookId: 'ebd5372-playbook-deescalation-and-restraint-safeguards',
      itemIds: [
        'ebd5372-b1-088',
        'ebd5372-b1-089',
        'ebd5372-b1-090',
        'ebd5372-b1-091',
        'ebd5372-b1-092',
        'ebd5372-b1-093',
        'ebd5372-b1-094',
        'ebd5372-b1-095',
        'ebd5372-b1-096',
        'ebd5372-b1-097',
        'ebd5372-b1-098',
        'ebd5372-b1-099'
      ]
    },
    {
      id: 'ebd5372-internalizing-and-trauma-vs-defiance',
      label: 'Overlooking Internalizing EBD and Trauma Responses as Willful Defiance',
      description: 'Associating Emotional and Behavioral Disorders exclusively with loud externalizing conduct while missing severe anxiety, depression, somatic complaints, and social withdrawal, or misinterpreting trauma-triggered hyperarousal and IDEA\'s social-maladjustment exclusion clause.',
      remediationMove: 'Screen systematically for internalizing distress alongside externalizing behaviors, apply IDEA\'s five Emotional Disturbance criteria (requiring duration, marked degree, and adverse educational impact, while recognizing that students with social maladjustment still qualify if they also have an emotional disturbance), and respond to trauma triggers with predictable safety routines and cognitive-behavioral coping supports.',
      remediationPlaybookId: 'ebd5372-playbook-internalizing-and-trauma-vs-defiance',
      itemIds: [
        'ebd5372-b1-001',
        'ebd5372-b1-002',
        'ebd5372-b1-003',
        'ebd5372-b1-004',
        'ebd5372-b1-005',
        'ebd5372-b1-006',
        'ebd5372-b1-007',
        'ebd5372-b1-008',
        'ebd5372-b1-009',
        'ebd5372-b1-010',
        'ebd5372-b1-011',
        'ebd5372-b1-012'
      ]
    },
    {
      id: 'ebd5372-academic-instruction-and-self-monitoring',
      label: 'Separating Behavior Control from Explicit Academic and Self-Management Instruction',
      description: 'Withholding rigorous grade-level instruction until behavior is fully compliant, ignoring academic skill deficits that trigger escape-maintained outbursts, or keeping students permanently dependent on teacher-run token economies without fading into self-monitoring and social-skills generalization.',
      remediationMove: 'Pair proactive academic supports (high opportunities to respond, behavior-specific praise at a 4:1 positive-to-corrective ratio, chunked tasks, precorrection) with explicit cognitive-behavioral self-management (self-monitoring, self-evaluation, self-reinforcement) and coached generalization across classrooms.',
      remediationPlaybookId: 'ebd5372-playbook-academic-instruction-and-self-monitoring',
      itemIds: [
        'ebd5372-b1-045',
        'ebd5372-b1-046',
        'ebd5372-b1-047',
        'ebd5372-b1-048',
        'ebd5372-b1-049',
        'ebd5372-b1-050',
        'ebd5372-b1-051',
        'ebd5372-b1-052',
        'ebd5372-b1-053',
        'ebd5372-b1-054',
        'ebd5372-b1-055',
        'ebd5372-b1-056'
      ]
    },
    {
      id: 'ebd5372-behavior-data-measurement-and-mdr',
      label: 'Selecting Mismatched Behavioral Recording Systems or Neglecting BIP Fidelity in MDR',
      description: 'Using event (frequency) recording for continuous or indistinct behaviors instead of duration, latency, or interval sampling, or evaluating disciplinary removals without verifying whether the student\'s BIP was implemented with fidelity before blaming the student.',
      remediationMove: 'Match the direct-observation metric to the target dimension (frequency/rate for discrete countable acts, duration for episode length, latency for start delay, whole-interval for behaviors to increase, partial-interval for behaviors to decrease, momentary time sampling for classroom on-task checks) and audit BIP implementation fidelity during every progress review and MDR.',
      remediationPlaybookId: 'ebd5372-playbook-behavior-data-measurement-and-mdr',
      itemIds: [
        'ebd5372-b1-071',
        'ebd5372-b1-072',
        'ebd5372-b1-073',
        'ebd5372-b1-074',
        'ebd5372-b1-075',
        'ebd5372-b1-076',
        'ebd5372-b1-088',
        'ebd5372-b1-089',
        'ebd5372-b1-090',
        'ebd5372-b1-091',
        'ebd5372-b1-092',
        'ebd5372-b1-093'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'ebd5372-playbook-topography-vs-function-fba',
      familyId: 'ebd5372-topography-vs-function-fba',
      familyLabel: 'Intervening on Behavior Topography Instead of FBA-Identified Function',
      title: 'Trace ABC Contingencies to Function Before Designing Any BIP Intervention',
      recognitionCue: 'A 5372 vignette describes a student who curses, throws books, or leaves the room during independent writing, and a tempting distractor recommends sending the student to the office or hallway time-out.',
      repairQuestion: 'What happens immediately after the behavior in the ABC data—does the student gain attention/tangibles or escape an aversive demand—and would the proposed consequence accidentally reinforce that exact function?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Separate the behavior\'s topography (what it looks like) from its ABC pattern (setting event → immediate antecedent → behavior → maintaining consequence) and check whether any answer choice hands the student the exact outcome maintaining the behavior.',
          requiredOutput: 'State the hypothesized behavioral function (escape, attention, tangible, or automatic) and identify which distractor unintentionally reinforces it.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Build a three-part competing-behavior pathway aligned to function: antecedent modification (prevent the trigger), functionally equivalent replacement behavior (teach an easier way to get the same outcome), and consequence shift (reinforce the replacement while discontinuing reinforcement of the target behavior).',
          requiredOutput: 'Write one antecedent change, one replacement skill, and one consequence change for an escape-maintained work-refusal pattern.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Compare two students who both flip desks: Student A flips desks only during timed reading aloud and is sent to the counselor\'s office; Student B flips desks during quiet seatwork and peers laugh while the teacher lectures for five minutes.',
          requiredOutput: 'Contrast the maintaining function for Student A (negative reinforcement via task escape) versus Student B (positive reinforcement via peer/adult attention) and prescribe a distinct BIP move for each.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5372 FBA case where an FBA hypothesis is tested across settings, then pick the first intervention step aligned to the ABC summary statement.',
          requiredOutput: 'Choose the function-matched antecedent and replacement intervention while eliminating topography-driven punitive time-out choices.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ebd5372-playbook-fct-and-differential-reinforcement',
      familyId: 'ebd5372-fct-and-differential-reinforcement',
      familyLabel: 'Confusing DRA, DRI, DRO, and Functional Communication Training (FCT)',
      title: 'Select the Exact Differential Reinforcement Schedule and Pair Extinction with FCT',
      recognitionCue: 'An item contrasts DRA, DRI, DRO, DRL, and FCT, or proposes planned ignoring alone for a high-intensity attention-seeking or escape-maintained behavior without teaching a replacement request.',
      repairQuestion: 'Which exact behavioral relationship is being reinforced (same-function alternative, physically incompatible act, or zero-occurrence interval), and have we taught a faster, lower-effort communicative replacement?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Inspect the intervention mechanics in each answer choice to see whether it targets a physically incompatible action (DRI), a functionally equivalent alternative (DRA/FCT), total absence of the behavior during an interval (DRO), or reduced rate (DRL), and flag extinction-only choices that invite an extinction burst.',
          requiredOutput: 'Label the reinforcement schedule shown in the stem and flag any distractor that uses extinction without teaching a replacement behavior.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Distinguish DRA (such as raising a hand or tapping a break card instead of calling out), DRI (such as keeping hands folded in lap, which is physically impossible while hitting), DRO (reinforcing every 5-minute interval free of profanity regardless of what else occurs), and FCT (explicitly teaching and immediately honoring a communicative request matched to the FBA function before gradually thinning the schedule).',
          requiredOutput: 'Write a concise 4-row rule differentiating DRA, DRI, DRO, and FCT, including one classroom example and one common pitfall for each.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Design the FCT and differential reinforcement plan for a seventh grader who shouts insults to obtain a 2-minute break from lengthy writing tasks, deciding how to prompt the replacement break card, honor it initially on a dense schedule, and handle an initial extinction burst.',
          requiredOutput: 'Specify the exact DRA/FCT response, initial continuous reinforcement schedule, extinction safety check, and systematic thinning rule.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh 5372 item asking which differential reinforcement procedure best reduces out-of-seat wandering by reinforcing seated task completion.',
          requiredOutput: 'Select DRI (seated work is physically incompatible with out-of-seat wandering) and justify why DRO or punishment alone is less precise.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ebd5372-playbook-deescalation-and-restraint-safeguards',
      familyId: 'ebd5372-deescalation-and-restraint-safeguards',
      familyLabel: 'Escalating Crisis Cycles or Misusing Seclusion and Restraint as Behavior Plans',
      title: 'Match De-Escalation to the Acting-Out Cycle and Enforce Restraint Safety Limits',
      recognitionCue: 'A student is visibly escalating (pacing, clenched fists, yelling) or in crisis peak, and distractors suggest lecturing about rules, issuing ultimatums, blocking exits, or writing seclusion/restraint into a proactive BIP.',
      repairQuestion: 'Which phase of Colvin\'s acting-out cycle is the student in right now, and does the proposed adult move reduce arousal and protect physical safety without unlawfully using restraint or seclusion for noncompliance?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Locate the student\'s exact stage on the 7-phase acting-out cycle (Calm → Trigger → Agitation → Acceleration → Peak → De-escalation → Recovery) and spot adult escalators (raised voice, hovering, public power struggles, premature processing) or unlawful restraint triggers (property damage without bodily danger, verbal defiance).',
          requiredOutput: 'Name the current crisis phase and flag any distractor that either escalates confrontation or violates restraint/seclusion emergency criteria.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Pair each crisis phase with its evidence-based staff action: Calm (teach coping skills), Trigger/Agitation (empathy, space, two structured choices, low-demand redirection), Acceleration (step back, calm neutral tone, pause verbal debating), Peak (focus solely on immediate physical safety, clear bystanders, summon trained crisis team), De-escalation (simple independent calming task, no lecturing), Recovery (supportive debrief and problem-solving); reserve physical restraint strictly for imminent danger of serious physical harm with continuous monitoring, immediate parent notice, written report, and BIP review.',
          requiredOutput: 'Map the adult priority for Agitation, Peak, and Recovery, and list the three mandatory legal/ethical conditions governing emergency physical restraint.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Sequence the teacher\'s actions when a high school student with EBD slams a laptop shut, paces rapidly near the door, and mutters threats after receiving a low quiz grade—contrasting what to do immediately versus after the student calms down 20 minutes later.',
          requiredOutput: 'Detail the low-arousal Agitation response (space, neutral voice, brief choice of quiet corner or nurse/counselor pass) and delay restorative problem-solving until the Recovery phase.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new 5372 ethics item where a team considers adding a locked quiet room to a student\'s BIP for repeated refusal to follow directions.',
          requiredOutput: 'Reject seclusion as a planned consequence for noncompliance and select proactive antecedent supports, FBA/BIP revision, and emergency-only safety protocols.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ebd5372-playbook-internalizing-and-trauma-vs-defiance',
      familyId: 'ebd5372-internalizing-and-trauma-vs-defiance',
      familyLabel: 'Overlooking Internalizing EBD and Trauma Responses as Willful Defiance',
      title: 'Identify Internalizing EBD, Trauma Triggers, and IDEA Social-Maladjustment Nuances',
      recognitionCue: 'A vignette features a quiet student with frequent nurse visits, perfectionistic shutdowns, flat affect, or sudden panic after loud hallway transitions—or tests whether a student with conduct problems can ever qualify under IDEA Emotional Disturbance.',
      repairQuestion: 'Are we screening for covert internalizing distress and trauma-informed safety needs rather than reacting only to overt disruption, and how does IDEA\'s social-maladjustment clause actually work?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Scan the vignette for internalizing indicators (withdrawal, somatic complaints, excessive worry, self-deprecation, school avoidance), trauma-linked fight/flight/freeze cues, and legal traps claiming any student with conduct disorder is automatically excluded from IDEA.',
          requiredOutput: 'Classify the presentation as internalizing, externalizing, or mixed, and flag any misconception about willful defiance or blanket social-maladjustment exclusion.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Review IDEA\'s Emotional Disturbance definition (at least one of five characteristics over a long period of time, to a marked degree, adversely affecting educational performance; includes schizophrenia; excludes socially maladjusted students ONLY if they do not also exhibit an emotional disturbance) and connect internalizing/trauma profiles to multi-gate screening (such as SRSS-IE) and trauma-informed predictability.',
          requiredOutput: 'State the three duration/severity/impact qualifiers for IDEA Emotional Disturbance and explain the exact legal boundary of the social-maladjustment exclusion.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Analyze two students: (1) a quiet eighth grader whose grades drop sharply alongside daily stomachaches, tearfulness, and avoidance of group work; (2) a student in foster care who bolts from the classroom whenever a teacher raises their voice unexpectedly.',
          requiredOutput: 'Recommend systematic internalizing screening and CBT/coping-skill IEP supports for student 1, and trauma-informed antecedent predictability, safe-space signal, and co-regulation routines for student 2.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5372 characteristics item asking why girls and quiet students with depression or anxiety are historically under-identified for EBD services.',
          requiredOutput: 'Select the explanation centered on referral bias toward overt classroom disruption and endorse universal multi-informant screening that captures internalizing symptoms.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ebd5372-playbook-academic-instruction-and-self-monitoring',
      familyId: 'ebd5372-academic-instruction-and-self-monitoring',
      familyLabel: 'Separating Behavior Control from Explicit Academic and Self-Management Instruction',
      title: 'Integrate High-Engagement Instruction with Self-Monitoring and Generalization',
      recognitionCue: 'An instructional item either postpones core curriculum until behavior improves, ignores frustrational-level work triggering outbursts, or relies permanently on teacher-delivered tokens without building student self-regulation.',
      repairQuestion: 'Is the instructional plan actively preventing behavior through matched task difficulty and high engagement while systematically transferring behavioral control from the teacher to the student?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check whether the scenario\'s behavioral flare-ups coincide with academic frustration, low rates of active responding, or teacher-dependent reinforcement systems that collapse the moment the student enters a general education room.',
          requiredOutput: 'Identify the missing academic-engagement lever or self-management generalization bridge in the scenario.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Connect evidence-based instructional prevention (interspersing known and new items, behavioral momentum, high opportunities to respond, 4:1 behavior-specific praise, guided notes) to the four-step self-management transfer sequence (teach target definition → student self-monitors with cue → accuracy match with teacher → fade external tokens while practicing across settings).',
          requiredOutput: 'Explain how high-probability request sequences and student self-monitoring reduce escape-maintained disruption and promote cross-classroom generalization.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Redesign a sixth-grade inclusion social studies block where a student with EBD earns teacher-tracked points in the resource room but refuses work and argues during 25-minute silent reading in general education.',
          requiredOutput: 'Specify two instructional modifications/scaffolds (chunked guided reading with high-p momentum and choice of response mode) plus a self-monitoring checklist faded from 5-minute intervals to end-of-period check-ins.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh 5372 instruction item asking how to ensure a newly taught anger-management or social-skills strategy actually transfers from a small counseling group into lunchroom and hallway conflicts.',
          requiredOutput: 'Choose natural-setting practice, peer/adult prompting cues, and self-evaluation across multiple exemplars rather than isolated worksheet discussions.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ebd5372-playbook-behavior-data-measurement-and-mdr',
      familyId: 'ebd5372-behavior-data-measurement-and-mdr',
      familyLabel: 'Selecting Mismatched Behavioral Recording Systems or Neglecting BIP Fidelity in MDR',
      title: 'Choose Exact Direct-Observation Metrics and Verify BIP Fidelity Before Placement Changes',
      recognitionCue: 'An assessment item gives a target behavior—such as tantrum length, time to start work, or continuous humming—and asks for the best recording method, OR proposes a more restrictive placement without checking whether the current BIP was implemented consistently.',
      repairQuestion: 'Which exact behavioral dimension (count, length, start delay, or interval estimate) matches the target behavior, and do we have fidelity data proving the BIP was actually delivered before altering placement?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Inspect the operational definition of the behavior for four clues: clear start/end boundaries, high versus low frequency, time-until-initiation, or continuous duration—and check whether adult implementation fidelity was measured.',
          requiredOutput: 'Identify the target behavioral dimension and flag any recording tool that distorts that dimension (such as frequency counting for continuous off-task staring).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Match each recording method to its exact measurement property: Event/Frequency (discrete, countable acts of uniform length), Rate (frequency divided by observation time when session lengths vary), Duration (how long an episode lasts), Latency (time from teacher directive to compliance start), Partial-Interval (best for behaviors to decrease; may overestimate), Whole-Interval (best for behaviors to increase; may underestimate), Momentary Time Sampling (practical for busy classrooms checking on-task engagement).',
          requiredOutput: 'Match five EBD classroom behaviors (swearing, crying episodes, starting math after cue, sustained seatwork, rocking) to their single most accurate recording system.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Audit a case where a ninth grader with EBD is recommended for a separate day school after three weeks on a new BIP, yet classroom logs show the check-in/check-out mentor met only twice and teachers delivered breaks inconsistently.',
          requiredOutput: 'Explain why low treatment integrity invalidates calling the BIP ineffective, specify how to measure BIP fidelity directly, and outline the MDR prong-2 implication if disciplinary removals occurred.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new 5372 progress-monitoring vignette requiring selection of an interval sampling method for a high-rate continuous vocalization during 30-minute ELA blocks.',
          requiredOutput: 'Select partial-interval recording (or momentary time sampling when teaching simultaneously) and explain why raw frequency counts would be unreliable.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const special_education_early_childhood_5692 = {
  misconceptionFamilies: [
    {
      id: 'se5692-part-c-natural-environments-and-ifsp',
      label: 'Treating Part C Natural Environments as Clinic Pull-Out and Child-Only Outcomes',
      description: 'Assuming IDEA Part C early intervention (birth to age 3) belongs in segregated therapy clinics with child-only academic objectives, rather than family-centered Part C IFSP outcomes embedded in natural environments (home and community routines) with written justification required whenever a non-natural setting is proposed.',
      remediationMove: 'Anchor every birth-to-3 decision in IDEA Part C statutory rules: complete initial evaluation and the Part C IFSP within 45 calendar days of referral, write functional family-directed outcomes, deliver services in natural environments where peers without disabilities participate, review every 6 months, and require formal justification for any pull-out setting.',
      remediationPlaybookId: 'se5692-playbook-part-c-natural-environments-and-ifsp',
      itemIds: [
        'se5692-b1-085',
        'se5692-b1-086',
        'se5692-b1-087',
        'se5692-b1-088',
        'se5692-b1-089',
        'se5692-b1-090',
        'se5692-b1-091',
        'se5692-b1-092',
        'se5692-b1-093',
        'se5692-b1-094',
        'se5692-b1-095',
        'se5692-b1-096'
      ]
    },
    {
      id: 'se5692-age-3-part-c-to-part-b-transition',
      label: 'Missing Age-3 Part C to Part B Transition Timelines and Eligibility Shifts',
      description: 'Waiting until a toddler turns three to begin preschool transition planning, assuming Part C eligibility automatically qualifies a child for Part B preschool special education without re-evaluation, or confusing Part C natural environments with Part B Least Restrictive Environment (LRE) preschool placements.',
      remediationMove: 'Initiate the Part C to Part B transition conference at least 90 calendar days (and up to 9 months) before the child\'s third birthday with family consent so eligibility determination and Part B IEP goals are in effect by age 3 with zero service gap.',
      remediationPlaybookId: 'se5692-playbook-age-3-part-c-to-part-b-transition',
      itemIds: [
        'se5692-b1-067',
        'se5692-b1-068',
        'se5692-b1-069',
        'se5692-b1-070',
        'se5692-b1-071',
        'se5692-b1-072',
        'se5692-b1-085',
        'se5692-b1-086',
        'se5692-b1-087',
        'se5692-b1-088',
        'se5692-b1-089',
        'se5692-b1-090'
      ]
    },
    {
      id: 'se5692-authentic-play-based-assessment',
      label: 'Replacing Authentic Play-Based Assessment with Rigid Table-Top Standardized Testing',
      description: 'Evaluating infants, toddlers, and preschoolers exclusively through single-sitting norm-referenced table tasks in unfamiliar clinic rooms, or mistaking brief developmental screeners for comprehensive multidisciplinary eligibility evaluations.',
      remediationMove: 'Separate developmental screening (brief risk flagging) from comprehensive evaluation, and prioritize authentic, multi-source assessment—transdisciplinary play-based assessment, structured caregiver interviews, and curriculum-embedded observation across familiar daily routines.',
      remediationPlaybookId: 'se5692-playbook-authentic-play-based-assessment',
      itemIds: [
        'se5692-b1-047',
        'se5692-b1-048',
        'se5692-b1-049',
        'se5692-b1-050',
        'se5692-b1-051',
        'se5692-b1-052',
        'se5692-b1-053',
        'se5692-b1-054',
        'se5692-b1-055',
        'se5692-b1-056',
        'se5692-b1-057',
        'se5692-b1-058'
      ]
    },
    {
      id: 'se5692-routines-based-embedded-instruction',
      label: 'Using Isolated Drill Worksheets Instead of Routines-Based Embedded Instruction',
      description: 'Pulling young children out of natural play and caregiving routines for repetitive flashcard drills or adult-directed worksheets rather than embedding Part C IFSP outcomes and Part B IEP goals into meaningful play centers, mealtimes, and transitions.',
      remediationMove: 'Embed high-frequency learning trials inside child-preferred daily routines using naturalistic instructional strategies—milieu teaching, mand-model, incidental teaching, constant time delay, and peer-mediated play—mapped on an activity-by-objective matrix.',
      remediationPlaybookId: 'se5692-playbook-routines-based-embedded-instruction',
      itemIds: [
        'se5692-b1-022',
        'se5692-b1-023',
        'se5692-b1-024',
        'se5692-b1-025',
        'se5692-b1-026',
        'se5692-b1-027',
        'se5692-b1-028',
        'se5692-b1-029',
        'se5692-b1-030',
        'se5692-b1-031',
        'se5692-b1-032',
        'se5692-b1-033'
      ]
    },
    {
      id: 'se5692-family-coaching-and-transdisciplinary-teaming',
      label: 'Confusing Expert-Driven Direct Therapy with Family-Centered Coaching and Transdisciplinary Roles',
      description: 'Delivering fragmented multidisciplinary pull-out therapy where specialists work directly with the child while caregivers watch passively, instead of coaching families to build everyday competence and using transdisciplinary role release through a Primary Service Provider (PSP).',
      remediationMove: 'Center every intervention visit on family-identified priorities, practice the coaching cycle (joint planning, observation, guided caregiver action, reflection, feedback), and distinguish multidisciplinary silos from transdisciplinary role release where one lead provider integrates team strategies.',
      remediationPlaybookId: 'se5692-playbook-family-coaching-and-transdisciplinary-teaming',
      itemIds: [
        'se5692-b1-067',
        'se5692-b1-068',
        'se5692-b1-069',
        'se5692-b1-070',
        'se5692-b1-071',
        'se5692-b1-072',
        'se5692-b1-073',
        'se5692-b1-074',
        'se5692-b1-075',
        'se5692-b1-076',
        'se5692-b1-077',
        'se5692-b1-078'
      ]
    },
    {
      id: 'se5692-early-development-red-flags-and-corrected-age',
      label: 'Misinterpreting Prematurity Adjusted Age, Cross-Domain Milestones, and Home-Language Growth',
      description: 'Evaluating premature infants under age 2 against chronological age instead of corrected (adjusted) age, advising bilingual families to stop speaking their home language to prevent confusion, or overlooking how motor, sensory, and attachment differences ripple across all developmental domains.',
      remediationMove: 'Calculate corrected age for children born preterm (under 37 weeks gestation) through age 24 months, affirm home-language maintenance because dual-language exposure does not cause language disorder, and evaluate motor, sensory, social-emotional, cognitive, and communication domains as an interdependent system.',
      remediationPlaybookId: 'se5692-playbook-early-development-red-flags-and-corrected-age',
      itemIds: [
        'se5692-b1-001',
        'se5692-b1-002',
        'se5692-b1-003',
        'se5692-b1-004',
        'se5692-b1-005',
        'se5692-b1-006',
        'se5692-b1-007',
        'se5692-b1-008',
        'se5692-b1-009',
        'se5692-b1-010',
        'se5692-b1-011',
        'se5692-b1-012'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'se5692-playbook-part-c-natural-environments-and-ifsp',
      familyId: 'se5692-part-c-natural-environments-and-ifsp',
      familyLabel: 'Treating Part C Natural Environments as Clinic Pull-Out and Child-Only Outcomes',
      title: 'Enforce IDEA Part C Natural Environments, 45-Day Clocks, and Family-Centered IFSP Outcomes',
      recognitionCue: 'A birth-to-3 vignette recommends transporting an 18-month-old to a specialized clinic for isolated speech therapy, writes academic-style child goals without family priorities, or confuses the Part C 45-day evaluation-to-IFSP timeline with the Part B 60-day clock.',
      repairQuestion: 'Is the child under age 3 (IDEA Part C), and does the plan embed family-prioritized Part C IFSP outcomes inside natural home or community routines within the 45-day timeline?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check the child\'s age first (birth to 3 = IDEA Part C; ages 3 to 5 = IDEA Part B Section 619) and flag distractors that propose clinic-based pull-out without written justification or omit family concerns, priorities, and resources.',
          requiredOutput: 'Identify the governing IDEA Part (Part C versus Part B) and pinpoint the natural-environment or family-outcome violation in the distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Contrast Part C IFSP statutory anchors (45 calendar days from referral to initial IFSP meeting, 6-month periodic reviews, annual IFSP rewrite, service coordinator assignment, family-centered outcomes in natural environments) against Part B IEP structures (60-day evaluation, 30-day IEP meeting, annual IEP review, school-age LRE continuum).',
          requiredOutput: 'Write a 4-point comparison pairing Part C IFSP timelines, setting mandate, outcome focus, and review frequency with Part B IEP counterparts.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Revise a poorly drafted birth-to-3 objective ("Elena will point to 10 flashcard nouns during clinic speech sessions") into a compliant natural-environment Part C IFSP outcome tied to the parents\' priority of calmer dinner routines.',
          requiredOutput: 'Draft a functional, routines-embedded Part C IFSP outcome stating what Elena and her family will do during mealtime, plus the exact written justification required if any non-natural setting were ever considered.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh 5692 legal vignette where a toddler\'s physical therapist proposes moving sessions from the child\'s neighborhood childcare center to a hospital gym for staff scheduling convenience.',
          requiredOutput: 'Reject staff-convenience pull-out and select coaching embedded in the neighborhood childcare routine alongside typically developing peers.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'se5692-playbook-age-3-part-c-to-part-b-transition',
      familyId: 'se5692-age-3-part-c-to-part-b-transition',
      familyLabel: 'Missing Age-3 Part C to Part B Transition Timelines and Eligibility Shifts',
      title: 'Execute the Age-3 Part C to Part B Transition Sequence Without Eligibility or Service Gaps',
      recognitionCue: 'A vignette involves a 2-year-old approaching age 3 whose team waits until the birthday month to notify the school district, assumes Part C eligibility transfers automatically into preschool special education, or omits parent consent before LEA notification where state opt-out applies.',
      repairQuestion: 'Was the transition conference scheduled at least 90 days (up to 9 months) before age 3 so the LEA can evaluate under Part B criteria and have Part B IEP goals active on the third birthday?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check the child\'s chronological age in months (27 to 36 months signals transition planning) and spot timeline traps (waiting until age 3) or automatic-eligibility myths (assuming a Part C IFSP automatically becomes a Part B IEP).',
          requiredOutput: 'Flag the timeline or eligibility error in the stem and specify the exact lead-time window required under IDEA.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Sequence the five statutory transition milestones: (1) write transition steps into the Part C IFSP, (2) notify the LEA and SEA (subject to state opt-out policy) at least 90 days before age 3, (3) convene the joint Part C/LEA/family transition conference 90 days to 9 months prior to age 3 with family approval, (4) obtain parent consent and conduct Part B eligibility evaluation, and (5) implement Part B IEP goals by the child\'s third birthday (or connect to community programs if ineligible).',
          requiredOutput: 'Map the 5-step transition timeline backward from the third birthday, noting how Part B eligibility criteria differ from Part C developmental-delay criteria.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Plan the transition calendar for a 27-month-old receiving home-based Part C services whose family worries about moving into an inclusive Head Start classroom with Part B supports.',
          requiredOutput: 'Specify the exact month to convene the transition conference, the family\'s role in choosing transition goals, the Part B evaluation consent step, and how Part B LRE favors inclusive preschool with itinerant supports before segregated classrooms.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new 5692 scenario where a 34-month-old\'s parents ask why the school district is conducting a new evaluation when the child already had a Part C evaluation at 14 months.',
          requiredOutput: 'Select the accurate explanation that Part C and Part B have distinct federal/state eligibility standards and require current multidisciplinary data to determine Part B eligibility and draft Part B IEP goals.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'se5692-playbook-authentic-play-based-assessment',
      familyId: 'se5692-authentic-play-based-assessment',
      familyLabel: 'Replacing Authentic Play-Based Assessment with Rigid Table-Top Standardized Testing',
      title: 'Prioritize Authentic Play-Based and Routine-Embedded Early Childhood Assessment',
      recognitionCue: 'An assessment stem describes a toddler or preschooler shutting down during an unfamiliar table-top test, or asks whether a 10-minute screening checklist (such as ASQ-3 or M-CHAT-R/F) can establish IDEA eligibility.',
      repairQuestion: 'Does this evaluation capture the child\'s genuine functional competence through familiar play, routines, and caregiver partnership—and are we keeping brief screeners strictly separate from comprehensive eligibility decisions?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Distinguish the assessment purpose in the stem (developmental screening, eligibility diagnosis, program planning, or progress monitoring) and spot ecological-validity threats (unfamiliar examiner, timed table drills, single-instrument eligibility).',
          requiredOutput: 'Name the assessment purpose and identify why the rigid standardized or screener-only distractor fails DEC Recommended Practices.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Align DEC Recommended Practices for Assessment: use brief parent-completed screeners only to trigger follow-up referral, combine Transdisciplinary Play-Based Assessment (TPBA) with caregiver interviews and natural-routine observations across settings, use curriculum-based measures (such as AEPS or HELP) to write Part C IFSP outcomes and Part B IEP goals, and apply informed clinical opinion when standardized tools fail to capture a young child\'s true delay.',
          requiredOutput: 'Contrast the purpose and output of a developmental screener, a norm-referenced diagnostic test, and a transdisciplinary play-based curriculum assessment.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A 3-year-old refuses to stack blocks or point to pictures during a psychologist\'s table-top test, yet her parent reports she builds towers and uses two-word phrases at home. Design the corrective evaluation plan.',
          requiredOutput: 'Recommend authentic play-based observation with a familiar caregiver present, routines-based interview data, and informed clinical opinion across home and preschool settings rather than scoring the refusal as severe cognitive delay.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5692 assessment vignette where a preschool screener flags possible social-communication delays and asks for the team\'s immediate next step.',
          requiredOutput: 'Choose partnering with the family to discuss findings and obtain written informed consent for a comprehensive multidisciplinary evaluation rather than diagnosing or placing from the screener alone.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'se5692-playbook-routines-based-embedded-instruction',
      familyId: 'se5692-routines-based-embedded-instruction',
      familyLabel: 'Using Isolated Drill Worksheets Instead of Routines-Based Embedded Instruction',
      title: 'Embed Naturalistic Learning Opportunities Inside Daily Early Childhood Routines',
      recognitionCue: 'A curriculum item suggests pulling a 3- or 4-year-old away from dramatic play to complete isolated letter-tracing worksheets or repetitive flashcard trials instead of weaving targeted communication, motor, or social trials into snack, centers, and outdoor play.',
      repairQuestion: 'How can the teacher distribute high-frequency, child-initiated learning trials for Part C IFSP outcomes and Part B IEP goals right inside natural daily routines using naturalistic instructional prompts?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Examine whether the distractor isolates the child from peers and natural reinforcers (massed table drills, passive worksheets) versus embedding targeted trials into motivating daily routines.',
          requiredOutput: 'Flag the decontextualized drill distractor and identify the natural routine and motivating consequence available in the stem.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Match four naturalistic embedded strategies to their classroom triggers: environmental arrangement (placing preferred toys in sight but out of reach to elicit requests), expectant waiting/time delay (pausing silently for 5 seconds before prompting), mand-model (offering a verbal prompt or choice and modeling the target), and incidental teaching (following the child\'s lead to elaborate a response), organized via an embedded activity matrix.',
          requiredOutput: 'Build a 3-row activity matrix showing how one expressive-language goal and one fine-motor goal are practiced naturally during snack, block center, and arrival/cubby time.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A 4-year-old with developmental delay has a Part B IEP goal to produce two-word requests ("open box," "more paint"). Replace a 15-minute picture-card drill with an embedded plan across art and snack routines.',
          requiredOutput: 'Describe two environmental arrangements (tightly sealed paint jars, small cracker portions), the exact expectant-wait and mand-model prompt sequence, and natural reinforcement (getting the paint or snack immediately).'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh 5692 curriculum vignette asking how to promote peer interaction and turn-taking for a preschooler with autism during inclusive free play.',
          requiredOutput: 'Select peer-mediated play supports, visual turn-taking cues, and adult-facilitated naturalistic prompting inside preferred centers rather than solitary adult-led social-skills worksheets.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'se5692-playbook-family-coaching-and-transdisciplinary-teaming',
      familyId: 'se5692-family-coaching-and-transdisciplinary-teaming',
      familyLabel: 'Confusing Expert-Driven Direct Therapy with Family-Centered Coaching and Transdisciplinary Roles',
      title: 'Apply Family-Centered Coaching and Transdisciplinary Role Release Across Early Teams',
      recognitionCue: 'A collaboration item shows an early interventionist sitting on the floor with a toy bag doing direct 45-minute therapy while the parent washes dishes in another room, or mixes up multidisciplinary, interdisciplinary, and transdisciplinary teaming models.',
      repairQuestion: 'Does the service model build the family\'s capacity to support learning between visits through active coaching and coordinated transdisciplinary role release rather than fragmented specialist silos?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify the teaming model in the stem (multidisciplinary = separate evaluations and isolated therapy; interdisciplinary = separate assessments with shared planning; transdisciplinary = joint assessment, cross-discipline coaching, and role release via a Primary Service Provider) and spot expert-model caregiver passivity.',
          requiredOutput: 'Label the teaming model depicted and flag any choice that sidelines parents or fragments care across uncoordinated specialists.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Sequence the five evidence-based early-childhood coaching components (joint planning → observation → caregiver action/practice with real home materials → reflection → targeted feedback) and clarify how cultural humility, family-systems thinking, and interpreters preserve equitable partnership.',
          requiredOutput: 'Contrast one expert-directed home visit with a family-centered coaching visit using the child\'s own everyday toys and routines.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A toddler receives OT, PT, and SLP input, and the mother says having three different therapists visit weekly feels overwhelming and contradictory. Redesign service delivery using a transdisciplinary Primary Service Provider (PSP) model.',
          requiredOutput: 'Explain how one PSP delivers weekly routine-based coaching while receiving regular consultation and role-release training from the other specialists, ensuring unified family support.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh 5692 family-partnership vignette where a family\'s cultural mealtime practice (spoon-feeding a 2-year-old) conflicts with a therapist\'s self-feeding worksheet.',
          requiredOutput: 'Select the culturally responsive move—respectfully exploring the family\'s values and co-selecting mutually meaningful independence routines rather than overriding family culture.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'se5692-playbook-early-development-red-flags-and-corrected-age',
      familyId: 'se5692-early-development-red-flags-and-corrected-age',
      familyLabel: 'Misinterpreting Prematurity Adjusted Age, Cross-Domain Milestones, and Home-Language Growth',
      title: 'Use Corrected Age for Preterm Infants and Honor Home Language and Cross-Domain Links',
      recognitionCue: 'A child-development vignette introduces an infant born at 28 weeks gestation now 10 months old, a bilingual toddler mixing two languages, or a child whose visual/motor impairment restricts exploration and speech.',
      repairQuestion: 'Have we adjusted for prematurity under 24 months, distinguished healthy dual-language development from true delay, and traced how one sensory or motor barrier affects adjacent developmental domains?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Scan the vignette for gestational age at birth (prematurity under 37 weeks), bilingual home exposure, or cross-domain interactions (such as how low muscle tone limits reaching, object permanence exploration, and social turn-taking).',
          requiredOutput: 'Identify the developmental factor (preterm correction, dual-language acquisition, or cross-domain ripple) that the distractor misinterprets.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply three foundational early-development rules: (1) Corrected Age = Chronological Age minus weeks premature (calculated from 40 weeks) through 24 months when interpreting milestones; (2) bilingualism and code-switching do not cause speech-language delay—assess total conceptual vocabulary across both languages and encourage rich home-language input; (3) monitor early red flags (no social smile by 3 months, no babbling/pointing by 12 months, loss of previously acquired skills at any age).',
          requiredOutput: 'Compute the corrected age for a 12-month-old born at 32 weeks gestation and state the clinical rule for evaluating vocabulary in a dual-language toddler.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Respond to two caregiver questions: (a) a parent of a 20-month-old bilingual child asks whether switching to English-only at home will speed up expressive speech, and (b) a parent of a 9-month-old born 10 weeks early worries the baby is not pulling to stand yet.',
          requiredOutput: 'Advise maintaining the fluent home language while evaluating across both languages in (a), and compute the 6.5-month corrected age to frame developmentally accurate motor expectations and supportive play in (b).'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5692 development item describing a 16-month-old who stopped using previously spoken words and avoids joint attention, then pick the immediate professional recommendation.',
          requiredOutput: 'Flag developmental regression and absent joint attention as urgent red flags requiring immediate multidisciplinary evaluation and medical/audiological follow-up rather than a "wait and see" response.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const special_education_intellectual_disabilities_5322 = {
  misconceptionFamilies: [
    {
      id: 'id5322-aaidd-three-prong-and-supports-model',
      label: 'Diagnosing Intellectual Disability by IQ Cutoff Alone Instead of the AAIDD Three-Prong Criteria',
      description: 'Treating an IQ score below 70 as sufficient to diagnose Intellectual Disability while overlooking concurrent significant limitations in adaptive behavior (conceptual, social, and practical domains) and developmental-period onset, or grouping students by IQ label instead of the AAIDD intensity-of-supports model.',
      remediationMove: 'Verify all three mandatory AAIDD/IDEA criteria—significantly subaverage intellectual functioning (roughly two standard deviations below the mean with standard error of measurement), concurrent adaptive behavior deficits across conceptual/social/practical skills, and developmental-period onset—and plan services by needed support intensity (intermittent, limited, extensive, pervasive).',
      remediationPlaybookId: 'id5322-playbook-aaidd-three-prong-and-supports-model',
      itemIds: [
        'id5322-b1-001',
        'id5322-b1-002',
        'id5322-b1-003',
        'id5322-b1-004',
        'id5322-b1-005',
        'id5322-b1-006',
        'id5322-b1-007',
        'id5322-b1-008',
        'id5322-b1-009',
        'id5322-b1-010',
        'id5322-b1-011',
        'id5322-b1-012'
      ]
    },
    {
      id: 'id5322-diagnostic-overshadowing-and-medical-comms',
      label: 'Diagnostic Overshadowing That Attributes Medical, Sensory, or Emotional Changes to ID',
      description: 'Dismissing abrupt behavioral changes, fatigue, irritability, self-injury, or skill regression as inherent features of a student\'s intellectual disability instead of investigating unexpressed physical pain, medication side effects, seizure activity, hearing or vision loss, or co-occurring mental health conditions.',
      remediationMove: 'Treat any sudden change in behavior, alertness, or baseline performance as a red flag requiring immediate medical, sensory, medication, and environmental rule-out before attributing it to intellectual disability or designing a behavior-reduction plan.',
      remediationPlaybookId: 'id5322-playbook-diagnostic-overshadowing-and-medical-comms',
      itemIds: [
        'id5322-b1-007',
        'id5322-b1-008',
        'id5322-b1-009',
        'id5322-b1-010',
        'id5322-b1-011',
        'id5322-b1-012',
        'id5322-b1-087',
        'id5322-b1-088',
        'id5322-b1-089',
        'id5322-b1-090',
        'id5322-b1-091',
        'id5322-b1-092'
      ]
    },
    {
      id: 'id5322-task-analysis-and-chaining-selection',
      label: 'Mismatching Task Analysis with Forward, Backward, or Total-Task Chaining',
      description: 'Teaching complex multi-step academic or daily-living routines as a single undifferentiated prompt, or defaulting blindly to forward chaining when backward chaining delivers immediate natural reinforcement on the final step or total-task chaining matches a student who already completes scattered steps.',
      remediationMove: 'Validate a discrete, observable step-by-step task analysis first, then select backward chaining when immediate natural completion reinforcement motivates a beginner, forward chaining when early steps are easiest to secure, or total-task presentation when the student already performs multiple steps across the sequence.',
      remediationPlaybookId: 'id5322-playbook-task-analysis-and-chaining-selection',
      itemIds: [
        'id5322-b1-045',
        'id5322-b1-046',
        'id5322-b1-047',
        'id5322-b1-048',
        'id5322-b1-049',
        'id5322-b1-050',
        'id5322-b1-051',
        'id5322-b1-052',
        'id5322-b1-053',
        'id5322-b1-054',
        'id5322-b1-055',
        'id5322-b1-056'
      ]
    },
    {
      id: 'id5322-prompt-hierarchy-and-prompt-fading',
      label: 'Creating Prompt Dependence by Failing to Fade Prompts Systematically',
      description: 'Delivering continuous verbal reminders, hovering gestures, or full physical hand-over-hand guidance on every trial without a systematic fading plan, leaving the student waiting for adult prompts instead of responding to natural environmental cues.',
      remediationMove: 'Select an evidence-based response-prompting system—constant or progressive time delay (0-second errorless trials → 4-second delay), least-to-most prompting for partially acquired skills, or most-to-least fading for novel/safety-critical steps—and track unprompted independence to transfer stimulus control to natural cues.',
      remediationPlaybookId: 'id5322-playbook-prompt-hierarchy-and-prompt-fading',
      itemIds: [
        'id5322-b1-019',
        'id5322-b1-020',
        'id5322-b1-021',
        'id5322-b1-022',
        'id5322-b1-023',
        'id5322-b1-024',
        'id5322-b1-025',
        'id5322-b1-026',
        'id5322-b1-027',
        'id5322-b1-028',
        'id5322-b1-029',
        'id5322-b1-030'
      ]
    },
    {
      id: 'id5322-aa-aas-eligibility-and-alternate-standards',
      label: 'Over-Assigning Alternate Assessments (AA-AAS) Based on Disability Label Alone',
      description: 'Automatically assigning every student with an intellectual disability to Alternate Assessments Based on Alternate Academic Achievement Standards (AA-AAS) solely because of their IDEA category or below-grade test scores, without checking eligibility for the most significant cognitive disabilities or disclosing graduation-diploma impacts to parents.',
      remediationMove: 'Restrict AA-AAS strictly to the small proportion of students with the most significant cognitive disabilities who require extensive, direct individualized instruction and substantial supports to achieve measurable gains on grade-aligned alternate standards, and always inform parents in writing of diploma implications.',
      remediationPlaybookId: 'id5322-playbook-aa-aas-eligibility-and-alternate-standards',
      itemIds: [
        'id5322-b1-071',
        'id5322-b1-072',
        'id5322-b1-073',
        'id5322-b1-074',
        'id5322-b1-075',
        'id5322-b1-076',
        'id5322-b1-077',
        'id5322-b1-078',
        'id5322-b1-079',
        'id5322-b1-080',
        'id5322-b1-081',
        'id5322-b1-082'
      ]
    },
    {
      id: 'id5322-age-appropriate-cbi-and-transition',
      label: 'Using Infantile Materials and Neglecting Generalization, CBI, and Postsecondary Transition',
      description: 'Giving adolescents with intellectual disabilities preschool-themed worksheets instead of chronologically age-appropriate materials, rehearsing life skills only in artificial classroom simulations without Community-Based Instruction (CBI), or writing compliance-only transition plans without student self-determination and adult-agency linkages.',
      remediationMove: 'Use chronologically age-appropriate materials aligned to functional and grade-level standards, teach directly in authentic community settings using multiple exemplars to secure generalization, and build student-led postsecondary transition plans (by age 16 under IDEA, or younger per state rule) backed by age-appropriate transition assessments and agency linkages.',
      remediationPlaybookId: 'id5322-playbook-age-appropriate-cbi-and-transition',
      itemIds: [
        'id5322-b1-087',
        'id5322-b1-088',
        'id5322-b1-089',
        'id5322-b1-090',
        'id5322-b1-091',
        'id5322-b1-092',
        'id5322-b1-093',
        'id5322-b1-094',
        'id5322-b1-095',
        'id5322-b1-096',
        'id5322-b1-097',
        'id5322-b1-098'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'id5322-playbook-aaidd-three-prong-and-supports-model',
      familyId: 'id5322-aaidd-three-prong-and-supports-model',
      familyLabel: 'Diagnosing Intellectual Disability by IQ Cutoff Alone Instead of the AAIDD Three-Prong Criteria',
      title: 'Verify All Three AAIDD Diagnostic Prongs and Plan by Intensity of Supports',
      recognitionCue: 'A 5322 case presents a student with an IQ score of 68 who demonstrates strong everyday adaptive skills (or a student with an IQ of 72 whose SEM band overlaps 70 alongside major adaptive deficits) and tempts you to decide eligibility from the IQ number alone.',
      repairQuestion: 'Are all three prongs satisfied—intellectual functioning (interpreting SEM), concurrent conceptual/social/practical adaptive limitations, and developmental-period onset—and are services planned by individualized support intensity rather than IQ tier?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check the case data for all three required diagnostic components (IQ with confidence band, standardized adaptive behavior scores across conceptual/social/practical domains, and onset before age 22 under AAIDD 12th ed. or age 18 in legacy state rules) and spot any distractor that treats IQ as a rigid standalone cutoff.',
          requiredOutput: 'Audit which of the three prongs are met or missing in the vignette and flag any rigid-IQ-cutoff or label-driven placement distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Map the three adaptive behavior domains (Conceptual: literacy, money, time; Social: interpersonal skills, gullibility, rule-following; Practical: daily living, health care, travel, occupational skills) and pair them with the four AAIDD support-intensity levels (Intermittent, Limited, Extensive, Pervasive).',
          requiredOutput: 'Write one school example for each adaptive domain and explain why two students with identical IQ scores can require totally different support intensities.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Evaluate two referral profiles: Student A has a Full Scale IQ of 69 but age-appropriate adaptive functioning across home, school, and peer settings; Student B has an IQ of 73 (SEM +/- 4), significant deficits in practical and conceptual adaptive scales, and documented early developmental delays.',
          requiredOutput: 'Explain why Student A does NOT meet ID criteria (missing concurrent adaptive deficit) while Student B warrants full multidisciplinary review considering SEM and adaptive limitations.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh 5322 item asking how an IEP team should classify and organize instructional supports for a newly identified middle schooler with Down syndrome.',
          requiredOutput: 'Choose individualized support-intensity planning across environments rather than assigning a blanket classroom based on mild/moderate/severe IQ bands.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'id5322-playbook-diagnostic-overshadowing-and-medical-comms',
      familyId: 'id5322-diagnostic-overshadowing-and-medical-comms',
      familyLabel: 'Diagnostic Overshadowing That Attributes Medical, Sensory, or Emotional Changes to ID',
      title: 'Rule Out Medical, Sensory, and Mental Health Causes Before Attributing Changes to ID',
      recognitionCue: 'A student with an intellectual disability who is normally cheerful suddenly hits their ear, refuses lunch, falls asleep in class, or shows sharp skill regression—and distractors assume it is "typical ID behavior" or jump straight to punitive consequences.',
      repairQuestion: 'Could this sudden change in behavior, alertness, or performance be signaling untreated pain, medication side effects, seizures, sensory loss, or a co-occurring psychiatric condition masked by diagnostic overshadowing?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot abrupt baseline shifts (sudden aggression, ear-hitting, lethargy, withdrawal, loss of previously mastered skills) and recognize diagnostic overshadowing whenever a distractor blames the student\'s intellectual disability without investigating physical or mental health causes.',
          requiredOutput: 'Name the baseline shift in the vignette and identify the diagnostic-overshadowing error in the distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply the four-domain rule-out protocol for sudden behavioral or cognitive change in students with ID: (1) acute pain/illness (dental, ear infection, GI distress), (2) medication changes or side effects (sedation, irritability), (3) neurological/sensory shifts (absence seizures, progressive hearing/vision loss common in syndromes such as Down or Fragile X), and (4) co-occurring emotional/psychiatric distress (anxiety, depression, trauma).',
          requiredOutput: 'List the immediate team communication sequence (school nurse, family consultation, medical/audiological/vision referral) prior to revising a behavior plan.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A nonverbal tenth grader with moderate ID suddenly starts slapping his jaw, refusing preferred snacks, and pushing away staff during morning math. Contrast a diagnostic-overshadowing reaction with an evidence-based response.',
          requiredOutput: 'Prioritize immediate school-nurse screening and parent contact to evaluate dental pain or ear infection rather than assuming task-escape defiance or writing a punishment contingency.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5322 vignette describing a student with Down syndrome whose reading participation drops steadily over two months alongside turning one ear toward the speaker.',
          requiredOutput: 'Select immediate audiological and vision screening collaboration with the family and nurse before attributing declining performance to cognitive plateau.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'id5322-playbook-task-analysis-and-chaining-selection',
      familyId: 'id5322-task-analysis-and-chaining-selection',
      familyLabel: 'Mismatching Task Analysis with Forward, Backward, or Total-Task Chaining',
      title: 'Match Validated Task Analyses to Forward, Backward, or Total-Task Chaining',
      recognitionCue: 'An instructional item asks how to teach a multi-step routine—such as making a microwave lunch, washing hands, using a debit card, or solving a multi-step math routine—and distractors pick the wrong chaining direction for the learner\'s profile.',
      repairQuestion: 'Which steps of the validated task analysis can the student already perform, and will immediate natural completion reinforcement (backward), early-step momentum (forward), or full-sequence prompting (total-task) yield the fastest mastery?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check the student\'s single-opportunity or multiple-opportunity baseline probe across the task analysis to see whether they know zero steps, need quick contact with the finished product, or already perform several scattered steps.',
          requiredOutput: 'State the learner\'s baseline pattern across the task steps and flag any distractor that teaches the entire complex routine unsegmented or picks a mismatched chaining direction.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Differentiate the three chaining strategies: Forward Chaining (teach step 1 to mastery, adult completes remaining steps; strong when initial steps are simple and build momentum), Backward Chaining (adult completes all steps except the final step so the learner immediately accesses the natural terminal reinforcer—such as eating the snack or wearing the zipped jacket), and Total-Task Chaining (learner attempts every step in sequence on each trial with individualized prompts only on unmastered steps; best when the student already knows several steps).',
          requiredOutput: 'Write a 3-row selection rule pairing Forward, Backward, and Total-Task Chaining with their ideal learner baseline and reinforcement advantage.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Match two students to the best chaining procedure: (a) a student who gets frustrated quickly and gives up when learning to brew hot cocoa from a 9-step sequence, and (b) a student who already completes 6 of 10 steps of setting a cafeteria workstation independently.',
          requiredOutput: 'Assign backward chaining to student (a) so they immediately finish and drink the cocoa after mastering step 9, and total-task chaining to student (b) with targeted prompts only on the 4 missing steps.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh 5322 vignette asking how to verify whether a drafted task analysis for using a laundromat washer is ready for instruction.',
          requiredOutput: 'Select performing or observing a competent peer execute the steps in the actual setting and collecting a baseline probe to validate step granularity before teaching.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'id5322-playbook-prompt-hierarchy-and-prompt-fading',
      familyId: 'id5322-prompt-hierarchy-and-prompt-fading',
      familyLabel: 'Creating Prompt Dependence by Failing to Fade Prompts Systematically',
      title: 'Transfer Stimulus Control to Natural Cues Through Systematic Prompt Fading',
      recognitionCue: 'A student with an intellectual disability sits passively until a paraprofessional taps the desk, repeats "What\'s next?", or guides their hand—showing prompt dependence rather than genuine skill deficit.',
      repairQuestion: 'What natural environmental cue should trigger this behavior, and which exact systematic prompt-fading protocol (time delay, least-to-most, or most-to-least) will shift control off the adult and onto that natural cue?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Inspect the vignette for prompt-dependence signs (the student waits for eye contact, verbal cues, or physical touch before acting) and remember that verbal prompts are often the hardest to fade.',
          requiredOutput: 'Identify the artificial adult prompt currently controlling the behavior and name the natural stimulus cue that should replace it.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Sequence the prompt hierarchy from least to most intrusive (Natural Cue → Indirect Verbal/Gesture → Visual/Model → Direct Verbal → Partial Physical → Full Physical) and match three fading protocols: Constant Time Delay (0-second errorless trials followed by fixed 4-second delay before the controlling prompt), Least-to-Most (give the learner a chance to respond at each level before increasing assistance), and Most-to-Least (begin with full errorless support for new/safety-critical skills and systematically drop down the hierarchy).',
          requiredOutput: 'Explain how 0-second to 4-second constant time delay prevents errors early while giving the learner space to beat the prompt and earn stronger reinforcement for unprompted responses.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A seventh grader with ID reads sight words accurately whenever the paraprofessional points and gives the first sound, but freezes silently when looking at a cafeteria menu alone. Build a prompt-fading plan.',
          requiredOutput: 'Replace continuous verbal/pointing cues with constant time delay (0-second model trials → 4-second wait), reinforce unprompted responses differentially, and fade adult proximity using a visual checklist.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a new 5322 instructional-environment item asking how a teacher should coach a paraprofessional who habitually completes zippering and locker opening for a student.',
          requiredOutput: 'Choose training the paraprofessional to pause 4 to 5 seconds after the natural cue, use the least intrusive prompt needed, and step back physically as soon as the student initiates.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'id5322-playbook-aa-aas-eligibility-and-alternate-standards',
      familyId: 'id5322-aa-aas-eligibility-and-alternate-standards',
      familyLabel: 'Over-Assigning Alternate Assessments (AA-AAS) Based on Disability Label Alone',
      title: 'Apply Strict AA-AAS Participation Criteria and Protect General-Curriculum Access',
      recognitionCue: 'An assessment item suggests moving a student with mild intellectual disability onto the state Alternate Assessment Based on Alternate Academic Achievement Standards (AA-AAS) simply because they read two grades below peers or carry an ID eligibility label.',
      repairQuestion: 'Does this student truly have the most significant cognitive disability requiring extensive direct individualized instruction on grade-aligned alternate standards—and have parents been informed of diploma consequences?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check the vignette for improper AA-AAS rationales (disability category alone, expected low score on general assessment, English-learner status, poor attendance, or behavioral challenges) versus genuine participation criteria.',
          requiredOutput: 'Flag the unlawful or over-broad rationale for AA-AAS placement in the distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Lock in the federal ESSA/IDEA AA-AAS guardrails: (1) IEP team decision guided by state participation guidelines (not disability label), (2) reserved for students with the most significant cognitive disabilities (contextualized by ESSA\'s 1% state participation cap, though never a hard individual quota), (3) aligned to grade-level academic content standards with reduced depth/breadth/complexity (not separate pre-K content), and (4) mandatory parent notification about how AA-AAS affects regular high school diploma eligibility.',
          requiredOutput: 'List three factors that can NEVER justify AA-AAS placement and three mandatory elements the IEP team must verify and document when AA-AAS is appropriate.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Decide assessment participation for two fifth graders with ID: Student 1 has mild ID, reads at a third-grade level with text-to-speech, and works on grade-5 content with accommodations; Student 2 has significant cognitive and communication disabilities requiring pervasive supports and individualized grade-5 alternate standards.',
          requiredOutput: 'Assign Student 1 to the general state assessment with IEP accommodations and Student 2 to AA-AAS with documented parent notification and grade-5-aligned alternate standards.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5322 accountability item asking what happens if a state approaches the ESSA 1% cap while an IEP team determines a specific student clearly meets all AA-AAS criteria.',
          requiredOutput: 'Select the legally accurate principle: the 1% threshold is a state-level accountability cap that NEVER overrides an individual IEP team\'s data-based participation decision.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'id5322-playbook-age-appropriate-cbi-and-transition',
      familyId: 'id5322-age-appropriate-cbi-and-transition',
      familyLabel: 'Using Infantile Materials and Neglecting Generalization, CBI, and Postsecondary Transition',
      title: 'Design Age-Appropriate CBI, Generalization Plans, and Student-Led Transition',
      recognitionCue: 'A secondary vignette hands a 16-year-old cartoon phonics worksheets, practices grocery checkout solely with plastic classroom coins, or writes a transition plan without the student\'s voice, age-appropriate assessments, or adult-agency links.',
      repairQuestion: 'Are the materials chronologically respectful, are skills taught in real community settings across multiple exemplars for generalization, and is the student actively driving measurable postsecondary transition goals?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check the student\'s chronological age against the materials and tasks proposed, and look for simulation-only instruction (no transfer to real community environments) or missing IDEA transition components (postsecondary education/training, employment, independent living where appropriate).',
          requiredOutput: 'Identify the age-appropriateness, generalization, or IDEA transition compliance gap in the scenario.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Combine three evidence-based practices for adolescents with ID: (1) Chronological Age-Appropriateness (adapted graphic novels, smartphone budgeting apps, real workplace menus rather than preschool themes), (2) Generalization & CBI (train in real stores/transit/workplaces, use General Case Instruction across varied cashiers/machines/lighting, teach self-management cues), and (3) IDEA Postsecondary Transition (in effect by age 16 or younger per state rule, based on age-appropriate transition assessments, student-led IEP participation, and outside-agency invitations with parent/adult-student consent).',
          requiredOutput: 'Specify how General Case Instruction during CBI solves the classroom-simulation transfer failure and name the three required IDEA postsecondary transition domains.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Upgrade a 17-year-old\'s IEP plan that currently uses kindergarten counting bears for money practice and states a vague transition goal ("will get a job after high school").',
          requiredOutput: 'Replace counting bears with real currency/debit-card CBI next-dollar practice across three community stores, and rewrite the transition goal into a measurable employment goal paired with a Vocational Rehabilitation (VR) referral (with consent) and a work-based learning course of study.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh 5322 transition vignette where a student with ID wants to work in an animal shelter, yet staff want to assign her to the school\'s pre-set cafeteria-cleaning crew.',
          requiredOutput: 'Choose honoring student self-determination through situational vocational assessment and community job-sampling aligned to the student\'s expressed preferences and strengths.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const special_education_learning_disabilities_5383 = {
  misconceptionFamilies: [
    {
      id: 'ld5383-sld-exclusionary-criteria-and-ell',
      label: 'Ignoring SLD Exclusionary Criteria and Mistaking Lack of Instruction or ELL Status for SLD',
      description: 'Qualifying a student for Specific Learning Disability (SLD) without ruling out IDEA exclusionary factors—lack of appropriate instruction in reading or math, limited English proficiency, vision/hearing/motor disabilities, intellectual disability, emotional disturbance, or cultural/environmental/economic disadvantage—or falsely insisting an IQ-achievement discrepancy is federally mandatory.',
      remediationMove: 'Audit every SLD referral against both IDEA statutory guardrails: document appropriate core instruction and rule out all exclusionary factors as the primary cause (comparing emergent bilinguals against true language peers and native-language performance), and remember states must permit RTI or alternative research-based processes and may never mandate an IQ-achievement discrepancy.',
      remediationPlaybookId: 'ld5383-playbook-sld-exclusionary-criteria-and-ell',
      itemIds: [
        'ld5383-b1-072',
        'ld5383-b1-073',
        'ld5383-b1-074',
        'ld5383-b1-075',
        'ld5383-b1-076',
        'ld5383-b1-077',
        'ld5383-b1-078',
        'ld5383-b1-079',
        'ld5383-b1-080',
        'ld5383-b1-081',
        'ld5383-b1-082',
        'ld5383-b1-083'
      ]
    },
    {
      id: 'ld5383-rti-fidelity-and-evaluation-delay',
      label: 'Using RTI to Delay Parent-Requested Evaluations or Judging Nonresponse Without Fidelity Data',
      description: 'Telling families that a student must finish additional weeks of Tier 2 or Tier 3 Response to Intervention (RTI) before an IDEA initial evaluation can start, or declaring a student an "instructional nonresponder" when Tier 1 and Tier 2 interventions lacked documented implementation fidelity, dosage, and evidence-based alignment.',
      remediationMove: 'Follow OSEP Memo 11-07 strictly: RTI can never delay or deny a parent-requested IDEA initial evaluation (run RTI concurrently while evaluating or issue PWN if refusing), and verify Tier 1/Tier 2 fidelity checklists, attendance, and dosage before interpreting weak growth as intrinsic SLD.',
      remediationPlaybookId: 'ld5383-playbook-rti-fidelity-and-evaluation-delay',
      itemIds: [
        'ld5383-b1-084',
        'ld5383-b1-085',
        'ld5383-b1-086',
        'ld5383-b1-087',
        'ld5383-b1-088',
        'ld5383-b1-089',
        'ld5383-b1-090',
        'ld5383-b1-091',
        'ld5383-b1-092',
        'ld5383-b1-093',
        'ld5383-b1-094',
        'ld5383-b1-095'
      ]
    },
    {
      id: 'ld5383-cra-math-sequence-and-dyscalculia',
      label: 'Skipping the Concrete-Representational-Abstract (CRA) Progression in Math Remediation',
      description: 'Jumping straight into abstract symbolic algorithms, keyword tricks ("more means add"), or untaught timed fact sheets for students with math learning disabilities (dyscalculia) instead of explicitly bridging Concrete manipulatives, Representational drawings, and Abstract symbols alongside Schema-Based Instruction (SBI).',
      remediationMove: 'Teach foundational number sense, fractions, and algebraic operations through explicit Concrete → Representational → Abstract (CRA) modeling with simultaneous math-language fade-in, and replace fragile keyword lists with Schema-Based Instruction that teaches underlying word-problem structures.',
      remediationPlaybookId: 'ld5383-playbook-cra-math-sequence-and-dyscalculia',
      itemIds: [
        'ld5383-b1-044',
        'ld5383-b1-045',
        'ld5383-b1-046',
        'ld5383-b1-047',
        'ld5383-b1-048',
        'ld5383-b1-049',
        'ld5383-b1-050',
        'ld5383-b1-051',
        'ld5383-b1-052',
        'ld5383-b1-053',
        'ld5383-b1-054',
        'ld5383-b1-055'
      ]
    },
    {
      id: 'ld5383-srsd-writing-and-executive-scaffolds',
      label: 'Correcting Surface Mechanics Instead of Explicit SRSD Writing and Executive Strategy Instruction',
      description: 'Responding to written-expression LD and dysgraphia with red-pen spelling corrections, unguided essay prompts, or isolated grammar drills rather than teaching Self-Regulated Strategy Development (SRSD), cognitive mnemonics, and assistive technology such as speech-to-text or word prediction.',
      remediationMove: 'Implement the six recursive SRSD stages (develop background knowledge, discuss it, model it with think-alouds, memorize it, support it, independent performance) using genre mnemonics (such as POW+TREE) paired with transcription scaffolds and explicit self-regulation.',
      remediationPlaybookId: 'ld5383-playbook-srsd-writing-and-executive-scaffolds',
      itemIds: [
        'ld5383-b1-018',
        'ld5383-b1-019',
        'ld5383-b1-020',
        'ld5383-b1-021',
        'ld5383-b1-022',
        'ld5383-b1-023',
        'ld5383-b1-024',
        'ld5383-b1-025',
        'ld5383-b1-026',
        'ld5383-b1-027',
        'ld5383-b1-028',
        'ld5383-b1-029'
      ]
    },
    {
      id: 'ld5383-cbm-progress-monitoring-and-decision-rules',
      label: 'Making Instructional Changes Without CBM Trendlines and Data-Based Decision Rules',
      description: 'Judging IEP reading, writing, or math responsiveness from subjective teacher impressions, quarterly report-card grades, or one erratic quiz score instead of frequent Curriculum-Based Measurement (CBM) probes graphed against an aimline with clear decision rules.',
      remediationMove: 'Graph brief, standardized CBM probes weekly or biweekly against a baseline-to-goal aimline, apply the 4-point decision rule (4 consecutive points below aimline → intensify or alter instruction with a phase-change line; 4 consecutive points above → raise the goal), and use diagnostic error analysis to choose the exact instructional change.',
      remediationPlaybookId: 'ld5383-playbook-cbm-progress-monitoring-and-decision-rules',
      itemIds: [
        'ld5383-b1-044',
        'ld5383-b1-045',
        'ld5383-b1-046',
        'ld5383-b1-047',
        'ld5383-b1-048',
        'ld5383-b1-049',
        'ld5383-b1-072',
        'ld5383-b1-073',
        'ld5383-b1-074',
        'ld5383-b1-075',
        'ld5383-b1-076',
        'ld5383-b1-077'
      ]
    },
    {
      id: 'ld5383-phonological-core-and-secondary-accommodation',
      label: 'Treating Dyslexia as a Visual Reversal Problem or Replacing Remediation with Accommodations Alone',
      description: 'Misattributing dyslexia to seeing letters backward and prescribing colored overlays or eye exercises instead of explicit structured literacy targeting the phonological-orthographic core deficit, or giving secondary students audiobooks and extended time while abandoning direct decoding, morphology, and study-strategy instruction.',
      remediationMove: 'Target dyslexia as a neurobiological language-based deficit in phonological processing and rapid orthographic mapping using explicit, systematic, cumulative structured literacy (phonemic awareness, phonics, syllable types, morphology), while pairing secondary access accommodations (audiobooks/TTS) with ongoing skill remediation.',
      remediationPlaybookId: 'ld5383-playbook-phonological-core-and-secondary-accommodation',
      itemIds: [
        'ld5383-b1-001',
        'ld5383-b1-002',
        'ld5383-b1-003',
        'ld5383-b1-004',
        'ld5383-b1-005',
        'ld5383-b1-006',
        'ld5383-b1-007',
        'ld5383-b1-008',
        'ld5383-b1-009',
        'ld5383-b1-010',
        'ld5383-b1-011',
        'ld5383-b1-012'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'ld5383-playbook-sld-exclusionary-criteria-and-ell',
      familyId: 'ld5383-sld-exclusionary-criteria-and-ell',
      familyLabel: 'Ignoring SLD Exclusionary Criteria and Mistaking Lack of Instruction or ELL Status for SLD',
      title: 'Apply IDEA SLD Exclusionary Rules and Separate Language Difference from Disability',
      recognitionCue: 'An eligibility vignette describes a student who missed half the year due to mobility, attended a school without systematic core reading instruction, or recently arrived as an English learner—yet a distractor rushes to qualify the student for SLD based on low English test scores alone.',
      repairQuestion: 'Have we verified adequate opportunity to learn and ruled out all IDEA SLD exclusionary causes (lack of instruction, limited English proficiency, sensory/motor/ID/ED, environmental disadvantage) as the primary driver?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Scan the referral profile for exclusionary red flags (frequent absences, disrupted schooling, weak Tier 1 core instruction, emerging English proficiency, uncorrected vision/hearing issues) and check whether any distractor claims IDEA mandates a severe IQ-achievement discrepancy.',
          requiredOutput: 'Identify the specific exclusionary factor or discrepancy-model myth present in the vignette.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Anchor IDEA\'s SLD determination requirements: (1) inadequate achievement across one or more of the eight SLD domains (oral expression, listening comprehension, written expression, basic reading, reading fluency, reading comprehension, math calculation, math problem-solving), (2) documented appropriate instruction by qualified personnel plus repeated progress data, (3) ruling out exclusionary factors as the primary cause, and (4) states cannot require an IQ-achievement discrepancy and must allow RTI or pattern of strengths and weaknesses (PSW).',
          requiredOutput: 'State how a team distinguishes an English learner with normal second-language acquisition from an English learner who genuinely has an SLD (persistent difficulty in BOTH L1 and L2 relative to true language peers despite strong instruction).'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Evaluate two third-grade referrals: Case A moved across four schools in two years, missed phonics instruction, and jumped two grade levels during six weeks of explicit tutoring; Case B received three years of quality bilingual instruction, struggles with phonemic segmentation in both Spanish and English, and shows flat growth relative to bilingual peers.',
          requiredOutput: 'Rule Case A ineligible for SLD due to lack of appropriate instruction and rapid instructional response, while explaining why Case B\'s cross-linguistic evidence supports SLD eligibility.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5383 eligibility item where a district psychologist refuses to consider RTI progress data because the student\'s IQ and reading scores lack a 15-point discrepancy.',
          requiredOutput: 'Select the IDEA-compliant correction that federal law prohibits requiring a severe discrepancy and permits RTI-based SLD identification alongside comprehensive evaluation data.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ld5383-playbook-rti-fidelity-and-evaluation-delay',
      familyId: 'ld5383-rti-fidelity-and-evaluation-delay',
      familyLabel: 'Using RTI to Delay Parent-Requested Evaluations or Judging Nonresponse Without Fidelity Data',
      title: 'Protect Parent Evaluation Rights Under OSEP Rules and Audit RTI Treatment Fidelity',
      recognitionCue: 'A parent submits a signed written request for an IDEA evaluation while their child is in Tier 2 RTI, and a distractor tells the parent they must wait 8 to 12 more weeks until Tier 3 concludes—or labels the student a nonresponder despite spotty intervention delivery.',
      repairQuestion: 'Did the school respond immediately to the parent\'s evaluation request without using RTI as a gatekeeper, and did the team verify intervention fidelity, dosage, and alignment before calling the student a nonresponder?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Look for two high-frequency 5383 traps: using RTI stages to postpone an IDEA evaluation after a parent request, and interpreting flat Tier 2 scores without checking whether the intervention actually happened as designed.',
          requiredOutput: 'Flag whether the stem violates OSEP\'s anti-delay mandate or skips RTI implementation-fidelity verification.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Separate the legal rule from the instructional audit: (1) Legally (OSEP Memo 11-07), when a parent requests an initial evaluation, the LEA must promptly seek consent and evaluate within IDEA timelines (continuing RTI concurrently) OR issue Prior Written Notice explaining why it refuses to evaluate; (2) Instructionally, valid RTI nonresponse requires verified core Tier 1 adequacy (at least 80% proficient), evidence-based Tier 2/3 protocol, trained provider, scheduled dosage/attendance, and fidelity observation checklists.',
          requiredOutput: 'Write a two-part checklist: the exact legal step triggered by a parent evaluation request during RTI, and four fidelity indicators required before declaring Tier 2 nonresponse.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Analyze a fourth-grade RTI file showing zero reading growth over 8 weeks of Tier 2: logs reveal the group met only 9 of 24 planned sessions, group size swelled to 11 students, and the paraprofessional skipped the phonics decoding segment.',
          requiredOutput: 'Explain why this data cannot validate SLD nonresponse and specify the immediate fidelity repairs (smaller group, consistent dosage, strict adherence to the validated decoding protocol) while noting that if the parent requests an evaluation, the school still cannot delay it.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh 5383 legal/RTI item where a principal instructs teachers to tell parents the district policy requires 18 weeks of documented MTSS before accepting any special education referral.',
          requiredOutput: 'Identify the blanket 18-week policy as an IDEA violation and select immediate parent-referral processing with concurrent tiered supports.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ld5383-playbook-cra-math-sequence-and-dyscalculia',
      familyId: 'ld5383-cra-math-sequence-and-dyscalculia',
      familyLabel: 'Skipping the Concrete-Representational-Abstract (CRA) Progression in Math Remediation',
      title: 'Scaffold Math LD Remediation Through Explicit CRA Bridges and Schema-Based Instruction',
      recognitionCue: 'A student with math LD (dyscalculia) reverses regrouping steps, misapplies fraction rules, or grabs numbers randomly in word problems—and distractors prescribe timed flashcard drills, keyword posters ("altogether = add"), or repetitive symbolic worksheets.',
      repairQuestion: 'Have we explicitly linked Concrete manipulatives → Representational visual models → Abstract notation for the concept, and taught word-problem schemas rather than misleading keywords?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Inspect the student\'s math error pattern (place-value/regrouping breakdown, fraction magnitude confusion, or multi-step word-problem misinterpretation) and flag distractors that rely on rote abstract memorization or brittle keyword shortcuts.',
          requiredOutput: 'Identify the conceptual math bottleneck and explain why the keyword or abstract-drill distractor fails students with math LD.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Map the explicit CRA sequence (Concrete: base-ten blocks, fraction tiles, algebra tiles with think-aloud → Representational: number lines, bar/tape diagrams, area drawings tied directly to the manipulatives → Abstract: numeric equations introduced alongside visuals before fading supports) plus Schema-Based Instruction (Additive: Total, Difference, Change; Multiplicative: Equal Groups, Comparison, Ratios/Proportions).',
          requiredOutput: 'Outline a 3-stage CRA lesson sequence for subtracting across zeros or comparing unlike fractions, and show why "altogether" fails on a missing-part word problem compared to a Total schema.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A fifth grader with dyscalculia writes 1/3 + 1/4 = 2/7 and adds every number whenever a word problem includes the word "more." Design the two-part remediation move.',
          requiredOutput: 'Use fraction strips and number-line area models (CRA) to anchor common-unit meaning before symbolic common denominators, and teach the Difference/Comparison schema using a visual diagram instead of keyword matching.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5383 math-instruction vignette asking for the strongest evidence-based sequence to move a middle schooler with math LD from solving one-step equations with algebra tiles to symbolic notation.',
          requiredOutput: 'Select explicit representational bridging (drawing tile diagrams paired directly with written algebraic steps and verbal think-alouds) before independent abstract practice.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ld5383-playbook-srsd-writing-and-executive-scaffolds',
      familyId: 'ld5383-srsd-writing-and-executive-scaffolds',
      familyLabel: 'Correcting Surface Mechanics Instead of Explicit SRSD Writing and Executive Strategy Instruction',
      title: 'Teach Writing Explicitly via SRSD Stages, Genre Mnemonics, and Assistive Technology',
      recognitionCue: 'A student with dysgraphia or written-expression LD produces two disorganized sentences with numerous spelling errors, and distractors focus on copying corrected spelling words ten times or assigning extra journal prompts without planning scaffolds.',
      repairQuestion: 'Does the writing intervention explicitly teach planning, drafting, and self-regulation through all six SRSD stages while separating transcription barriers from compositional ideation via assistive technology?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Distinguish transcription bottlenecks (handwriting fluency, spelling mechanics) from executive/compositional bottlenecks (generating ideas, organizing genre elements, revising) and spot distractors that grade surface errors without teaching a cognitive strategy.',
          requiredOutput: 'Diagnose whether the student\'s primary barrier is transcription, genre organization, or both, and flag any surface-correction-only distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Sequence the six recursive Self-Regulated Strategy Development (SRSD) stages (1. Develop Background Knowledge → 2. Discuss It → 3. Model It with explicit self-talk → 4. Memorize It → 5. Support It collaboratively with gradual release → 6. Independent Performance), pairing genre mnemonics (POW+TREE for persuasive writing, POW+WWW What=2 How=2 for narrative, STOP+DARE for secondary essays) with self-monitoring goal graphs and AT (speech-to-text, word prediction, graphic-organizer software).',
          requiredOutput: 'Map each of the six SRSD stages to one concrete teacher action and specify when speech-to-text lowers cognitive load for a student with severe dysgraphia.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A seventh grader with SLD in written expression speaks eloquently about climate solutions but freezes when asked to write a 3-paragraph persuasive argument and omits counterclaims. Build an SRSD + AT intervention.',
          requiredOutput: 'Specify modeling POW+TREE (or STOP+DARE) with explicit self-statements, graphic-organizer planning, speech-to-text or word-prediction drafting to bypass transcription fatigue, and a self-scored checklist targeting all genre parts before editing conventions.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh 5383 writing item asking which stage of SRSD is missing when a teacher hands out a POW+TREE poster and expects students to write independently the very next day.',
          requiredOutput: 'Identify the skipped teacher modeling (think-aloud with self-regulation), strategy memorization, and scaffolded collaborative support stages before independent performance.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ld5383-playbook-cbm-progress-monitoring-and-decision-rules',
      familyId: 'ld5383-cbm-progress-monitoring-and-decision-rules',
      familyLabel: 'Making Instructional Changes Without CBM Trendlines and Data-Based Decision Rules',
      title: 'Apply CBM Aimlines, the 4-Point Decision Rule, and Diagnostic Error Analysis',
      recognitionCue: 'A progress-monitoring graph shows four consecutive weekly CBM data points falling below the aimline (or four above), or a teacher proposes waiting until the end of the grading period to adjust a failing reading intervention.',
      repairQuestion: 'What do the graphed CBM trendline and 4-point decision rule dictate right now, and which specific skill error in the probes should drive our Data-Based Individualization (DBI) change?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Read the CBM graph mechanics first (baseline median of 3 probes, aimline connecting baseline to annual goal, vertical phase-change lines, and consecutive points relative to the aimline) and spot distractors that rely on single-point noise or delay changes for months.',
          requiredOutput: 'State whether the student\'s recent CBM points fall above, along, or below the aimline and flag any distractor that ignores the graphed trend.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Lock in Data-Based Individualization (DBI) and CBM decision rules: (1) administer brief, standardized, equivalent-difficulty probes on a consistent schedule (weekly/biweekly), (2) 4 consecutive data points BELOW the aimline → conduct diagnostic error analysis and intensify/adapt instruction (dosage, group size, explicitness, skill focus) while drawing a vertical phase-change line, (3) 4 consecutive data points ABOVE the aimline → raise the goal or fade intensity, and (4) never switch probes to easier grade levels arbitrarily without resetting the goal/trendline.',
          requiredOutput: 'State the exact instructional action for 4 points below aimline, 4 points above aimline, and 1 single dip due to illness.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A fourth grader\'s oral reading fluency CBM shows 4 straight weekly probes below the aimline; error analysis reveals 85% of errors occur on multisyllabic vowel-team and closed-syllable words rather than single-syllable CVC words. Decide the DBI adaptation.',
          requiredOutput: 'Draw a vertical phase-change line, keep the CBM monitoring schedule intact, and shift intervention time from timed repeated reading to explicit multisyllabic decoding and syllable-division instruction.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh 5383 assessment item asking why Maze or Oral Reading Fluency (ORF) CBM probes are preferred over chapter unit tests for monitoring annual IEP reading goals.',
          requiredOutput: 'Choose CBM\'s standardized equivalence across alternate forms, brevity, and high sensitivity to incremental skill growth over time.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ld5383-playbook-phonological-core-and-secondary-accommodation',
      familyId: 'ld5383-phonological-core-and-secondary-accommodation',
      familyLabel: 'Treating Dyslexia as a Visual Reversal Problem or Replacing Remediation with Accommodations Alone',
      title: 'Target the Phonological Core of Dyslexia and Pair Access Accommodations with Remediation',
      recognitionCue: 'A case involves a student with dyslexia who reverses b/d or struggles to decode science textbooks in ninth grade, and distractors offer colored lenses/vision therapy or drop reading remediation entirely in favor of audiobooks alone.',
      repairQuestion: 'Does our plan directly remediate the phonological-orthographic language deficit through explicit structured literacy while using accommodations to protect grade-level content access without replacing instruction?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot two pervasive LD myths in distractors: (1) framing dyslexia as a visual/eye-tracking defect treatable by colored overlays or vision exercises, and (2) treating secondary accommodations (audiobooks, extended time) as a substitute for direct reading/writing remediation.',
          requiredOutput: 'Flag the neurobiological myth or accommodation-only trap embedded in the distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Ground remediation in the phonological-core deficit model of dyslexia: deliver explicit, systematic, cumulative, diagnostic structured literacy (phoneme-grapheme mapping, six syllable types, morphological analysis of Greek/Latin roots and affixes for older readers, fluency, and syntax) AND pair it with grade-level content access accommodations (text-to-speech, audio textbooks, graphic organizers, content-enhancement routines) so secondary students build both reading skill and background knowledge.',
          requiredOutput: 'Explain why b/d reversals in early grades reflect fragile orthographic-phonological memory rather than backward vision, and design a dual-track plan (remediation + access) for a high schooler with dyslexia.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A tenth grader with dyslexia has strong listening comprehension (85th percentile) but reads biology text at a fifth-grade decoding level. Evaluate two proposals: (A) give audiobooks only and remove reading goals, vs. (B) provide audio access in biology plus 30 minutes of explicit multisyllabic/morphological decoding and content-enhancement study strategies.',
          requiredOutput: 'Justify why Proposal B delivers FAPE by preserving rigorous biology access while still closing the underlying decoding and morphological gap.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5383 characteristics vignette where a parent asks the IEP team to fund tinted overlays and eye-tracking software to cure their third grader\'s dyslexia.',
          requiredOutput: 'Respond respectfully using peer-reviewed evidence: decline unproven visual-training therapies via informed collaboration and direct IEP resources toward explicit phonological-orthographic structured literacy.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const special_education_severe_profound_5547 = {
  misconceptionFamilies: [
    {
      id: 'sp5547-presumed-competence-and-communication-intent',
      label: 'Violating Presumed Competence or Requiring Cognitive Prerequisites Before AAC',
      description: 'Withholding Augmentative and Alternative Communication (AAC) until a student proves object permanence, cause-and-effect mastery, or picture-matching skills (the debunked candidacy/prerequisite model), or dismissing presymbolic cues such as eye gaze, vocalizations, and muscle-tone shifts as non-communicative.',
      remediationMove: 'Operate from the Principle of Presumed Competence and the Communication Bill of Rights: apply zero cognitive prerequisites for AAC access, treat every presymbolic movement, gaze shift, or vocalization as potentially communicative, and immediately shape intentionality through responsive partner interaction.',
      remediationPlaybookId: 'sp5547-playbook-presumed-competence-and-communication-intent',
      itemIds: [
        'sp5547-b1-001',
        'sp5547-b1-002',
        'sp5547-b1-003',
        'sp5547-b1-004',
        'sp5547-b1-005',
        'sp5547-b1-006',
        'sp5547-b1-007',
        'sp5547-b1-008',
        'sp5547-b1-009',
        'sp5547-b1-010',
        'sp5547-b1-011',
        'sp5547-b1-012'
      ]
    },
    {
      id: 'sp5547-aac-aided-language-and-core-vocab',
      label: 'Limiting AAC to Snack Requesting Instead of Core Vocabulary and Aided Language Modeling',
      description: 'Restricting a student\'s AAC system to fringe nouns for food requesting ("more," "cracker"), relying on intrusive hand-over-hand forcing to press icons, or leaving the device locked on a shelf during academic and social routines instead of modeling robust core vocabulary via Aided Language Stimulation.',
      remediationMove: 'Ensure 24/7 accessible AAC across all settings using high-frequency core vocabulary (go, stop, want, not, like, help, different) paired with relevant fringe words, model language naturally on the student\'s system (Aided Language Input) across varied functions (protesting, commenting, greeting, questioning), and use respectful hand-under-hand or expectant waiting rather than hand-over-hand compliance.',
      remediationPlaybookId: 'sp5547-playbook-aac-aided-language-and-core-vocab',
      itemIds: [
        'sp5547-b1-030',
        'sp5547-b1-031',
        'sp5547-b1-032',
        'sp5547-b1-033',
        'sp5547-b1-034',
        'sp5547-b1-035',
        'sp5547-b1-036',
        'sp5547-b1-037',
        'sp5547-b1-038',
        'sp5547-b1-039',
        'sp5547-b1-040',
        'sp5547-b1-041'
      ]
    },
    {
      id: 'sp5547-partial-participation-and-embedded-access',
      label: 'Equating Inclusion with Full Independent Mastery Instead of the Principle of Partial Participation',
      description: 'Excluding students with severe, profound, or multiple disabilities from general education classes, labs, or community routines because they cannot execute every step independently, rather than designing meaningful roles via the Principle of Partial Participation, switch/AT access, peer supports, and embedded IEP goals.',
      remediationMove: 'Apply the Principle of Partial Participation: analyze the natural general education or community routine, identify which steps the student can perform directly or with assistive technology/adaptations, embed individualized IEP goals inside shared activities, and coach peers as collaborative partners rather than passive helpers.',
      remediationPlaybookId: 'sp5547-playbook-partial-participation-and-embedded-access',
      itemIds: [
        'sp5547-b1-007',
        'sp5547-b1-008',
        'sp5547-b1-009',
        'sp5547-b1-010',
        'sp5547-b1-011',
        'sp5547-b1-012',
        'sp5547-b1-030',
        'sp5547-b1-031',
        'sp5547-b1-032',
        'sp5547-b1-033',
        'sp5547-b1-034',
        'sp5547-b1-035'
      ]
    },
    {
      id: 'sp5547-ihp-medical-delegation-and-positioning',
      label: 'Performing Unauthorized Medical Procedures Outside an IHP or Neglecting Positioning and Seizure Safety',
      description: 'Allowing teachers or paraprofessionals to perform specialized health procedures (tracheostomy suctioning, G-tube bolus feeding, emergency seizure medication) without a school-nurse-developed Individualized Healthcare Plan (IHP), legal delegation, and verified competency training—or overlooking OT/PT positioning schedules, skin-integrity checks, and safe mechanical/two-person transfers.',
      remediationMove: 'Follow strict medical-delegation and safety boundaries: require a current written IHP and Emergency Action Plan authored by the licensed school nurse with documented delegation and competency verification before any staff member performs healthcare tasks, rotate positioning per OT/PT schedules to prevent pressure sores/contractures, and follow exact seizure-safety and safe-lifting protocols.',
      remediationPlaybookId: 'sp5547-playbook-ihp-medical-delegation-and-positioning',
      itemIds: [
        'sp5547-b1-081',
        'sp5547-b1-082',
        'sp5547-b1-083',
        'sp5547-b1-084',
        'sp5547-b1-085',
        'sp5547-b1-086',
        'sp5547-b1-087',
        'sp5547-b1-088',
        'sp5547-b1-089',
        'sp5547-b1-090',
        'sp5547-b1-091',
        'sp5547-b1-092'
      ]
    },
    {
      id: 'sp5547-ecological-assessment-and-dynamic-observation',
      label: 'Using Floor-Effect Standardized Scores Instead of Ecological Inventory and Dynamic Assessment',
      description: 'Declaring a student with severe or multiple disabilities "untestable" because standardized norm-referenced IQ or achievement tests produce basal floor effects, instead of conducting ecological inventories, discrepancy analyses, systematic preference assessments, Communication Matrix profiles, and sensory-channel evaluations (including Cortical Visual Impairment and tactile access).',
      remediationMove: 'Replace invalid norm-referenced floor scores with ecological assessment (inventorying current/future environments and discrepancy-analyzing needed adaptations), systematic stimulus preference assessments, Communication Matrix mapping, and functional vision/hearing/motor access evaluations to build actionable IEP targets.',
      remediationPlaybookId: 'sp5547-playbook-ecological-assessment-and-dynamic-observation',
      itemIds: [
        'sp5547-b1-062',
        'sp5547-b1-063',
        'sp5547-b1-064',
        'sp5547-b1-065',
        'sp5547-b1-066',
        'sp5547-b1-067',
        'sp5547-b1-068',
        'sp5547-b1-069',
        'sp5547-b1-070',
        'sp5547-b1-071',
        'sp5547-b1-072',
        'sp5547-b1-073'
      ]
    },
    {
      id: 'sp5547-supported-decision-making-and-adult-transition',
      label: 'Defaulting to Full Guardianship Instead of Supported Decision-Making and Person-Centered Transition',
      description: 'Advising families that plenary (full) guardianship is automatically required when a student with severe disabilities turns 18 rather than presenting least-restrictive alternatives such as Supported Decision-Making (SDM), or planning adult life around segregated facility slots without person-centered planning (MAPS/PATH) and early adult-services linkages.',
      remediationMove: 'Inform students and families at least one year before the age of majority about transfer of IDEA rights and the full continuum of decision-making supports (Supported Decision-Making agreements, power of attorney, healthcare proxy, representative payee, limited guardianship before plenary guardianship), and anchor adult transition in person-centered planning plus early Medicaid waiver, developmental disability agency, and customized-employment referrals.',
      remediationPlaybookId: 'sp5547-playbook-supported-decision-making-and-adult-transition',
      itemIds: [
        'sp5547-b1-068',
        'sp5547-b1-069',
        'sp5547-b1-070',
        'sp5547-b1-071',
        'sp5547-b1-072',
        'sp5547-b1-073',
        'sp5547-b1-087',
        'sp5547-b1-088',
        'sp5547-b1-089',
        'sp5547-b1-090',
        'sp5547-b1-091',
        'sp5547-b1-092'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'sp5547-playbook-presumed-competence-and-communication-intent',
      familyId: 'sp5547-presumed-competence-and-communication-intent',
      familyLabel: 'Violating Presumed Competence or Requiring Cognitive Prerequisites Before AAC',
      title: 'Honor Presumed Competence and Reject AAC Cognitive Prerequisites',
      recognitionCue: 'A 5547 team member argues that a student with profound multiple disabilities is "not ready" for an eye-gaze SGD or tactile symbols until they pass a cause-and-effect switch test, or ignores subtle body-state cues as random reflexes.',
      repairQuestion: 'Are we presuming competence with zero cognitive prerequisites for AAC access, and responding consistently to presymbolic cues so the learner discovers communicative power?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot candidacy-model gatekeeping (demanding object permanence, picture discrimination, or verbal imitation before introducing AAC) and identify presymbolic communicative behaviors in the vignette (eye gaze, head turn, facial brightening, breath change, vocalization).',
          requiredOutput: 'Flag the debunked prerequisite barrier in the distractor and list the student\'s observable presymbolic communicative signals.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply the National Joint Committee (NJC) Communication Bill of Rights and the progression from pre-intentional behavior → intentional presymbolic communication → concrete/tactile symbols → abstract symbols/speech-generating devices, explaining how consistent partner responsiveness builds intentionality rather than waiting for readiness.',
          requiredOutput: 'Write a two-part clinical principle explaining why zero-exclusion AAC access accelerates—never inhibits—natural speech and cognitive engagement.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A 7-year-old with cerebral palsy and Cortical Visual Impairment (CVI) widens her eyes and kicks her right foot when music stops, yet staff say she is too low-functioning for an AAC evaluation. Design the immediate team response.',
          requiredOutput: 'Initiate an interdisciplinary AAC/AT evaluation (SLP, OT, TVI) matching access to her reliable motor/visual channels (such as high-contrast tactile symbols or single-message switch with CVI lighting accommodations) and create a Personal Communication Dictionary for all partners.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh 5547 item where a parent worries that introducing a tablet speech-generating device will stop their non-speaking child from ever learning to talk.',
          requiredOutput: 'Select the research-grounded response reassuring the parent that AAC supports and often enhances natural vocalization while providing immediate dignity and communication access.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sp5547-playbook-aac-aided-language-and-core-vocab',
      familyId: 'sp5547-aac-aided-language-and-core-vocab',
      familyLabel: 'Limiting AAC to Snack Requesting Instead of Core Vocabulary and Aided Language Modeling',
      title: 'Build Robust Core-Vocabulary AAC Through Aided Language Stimulation Across Functions',
      recognitionCue: 'A student\'s communication board contains only six snack icons, staff physically push the student\'s finger onto buttons hand-over-hand, or the SGD stays packed in a backpack during inclusive science and lunch.',
      repairQuestion: 'Does the student have continuous access to flexible core vocabulary across multiple communicative functions—and are communication partners modeling on the system naturally without intrusive hand-over-hand forcing?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Audit the AAC implementation in the vignette for four common breakdowns: snack-request-only fringe boards, hand-over-hand physical compliance, device unavailability across settings, and expecting the student to use a symbol system no adult ever models.',
          requiredOutput: 'Identify the exact AAC implementation error in the stem and state which communicative functions (commenting, protesting, requesting help, asking questions, social greeting) are missing.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Contrast Core Vocabulary (roughly 80% of daily speech—flexible pronouns, verbs, descriptors like "more," "stop," "go," "not," "help," "turn," usable in every room) with Fringe Vocabulary (activity-specific nouns), and apply Aided Language Input/Stimulation (partners point to symbols while speaking naturally, wait expectantly 10+ seconds, honor every spontaneous attempt, and use respectful hand-under-hand guidance only when invited by learners with visual/motor needs).',
          requiredOutput: 'Map four high-utility core words across three different school contexts (art, science, recess) and explain why modeling without demanding immediate repetition builds authentic AAC fluency.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A tenth grader uses a high-tech eye-gaze SGD only to request juice during break time; during English class his device is turned off because "it distracts the class." Redesign his daily AAC plan.',
          requiredOutput: 'Require continuous mounted SGD access throughout English, add literature core/fringe phrases ("I think," "disagree," "read more," character names), train teachers and peers in Aided Language Modeling, and give a 10-second response pause.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a new 5547 item asking why teaching a student to activate "stop" or "all done" on an AAC device is an essential first target alongside requesting preferred items.',
          requiredOutput: 'Select honoring the right to refuse/protest safely, which empowers self-advocacy and replaces frustration-driven challenging behavior.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sp5547-playbook-partial-participation-and-embedded-access',
      familyId: 'sp5547-partial-participation-and-embedded-access',
      familyLabel: 'Equating Inclusion with Full Independent Mastery Instead of the Principle of Partial Participation',
      title: 'Operationalize Partial Participation, Adapted Access, and Embedded IEP Goals',
      recognitionCue: 'A vignette excludes a student with severe disabilities from a general education biology lab, choir, or school store because they cannot read the lab manual or manipulate fine glassware independently.',
      repairQuestion: 'Which meaningful steps of this shared activity can the student execute directly or through switch/AT adaptations and peer collaboration under the Principle of Partial Participation?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot the "all-or-nothing mastery" fallacy—assuming that inability to complete 100% of a task independently justifies segregating the student into an isolated classroom or having an aide sit passively beside them doing the task for them.',
          requiredOutput: 'Flag the all-or-nothing exclusion or adult-velcro trap in the distractor and locate the shared classroom routine.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Run the four-step Partial Participation design process: (1) list the natural sequence peers follow in the general education or community routine, (2) identify steps the student performs independently, (3) engineer individualized adaptations for remaining steps (switch-activated blender/timer, adapted grip, partner-assisted scanning, simplified visual steps, natural peer collaboration), and (4) embed measurable IEP communication, motor, and grade-aligned academic goals directly into those moments.',
          requiredOutput: 'Explain how Partial Participation differs from passive physical presence (sitting in the back watching) and how natural peer supports reduce adult-aide stigma.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Design a Partial Participation plan for a sixth grader with profound intellectual and motor disabilities joining an inclusive science lab on plant growth where peers measure soil, water seedlings, and log observations.',
          requiredOutput: 'Assign authentic active roles: activating a switch-adapted battery water pump to water the group\'s plant, choosing the observation picture/core-word label ("tall," "wet") via eye gaze or big-mac switch to report group findings, and sharing lab turns with trained peers.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5547 inclusion item asking how to embed a student\'s IEP goal for activating a choice switch inside a general education music class.',
          requiredOutput: 'Choose an authentic musical role (using a switch-adapted instrument or selecting the next class song on a step-by-step communicator during chorus transitions) rather than pulling the student into the hallway to drill switch hits.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sp5547-playbook-ihp-medical-delegation-and-positioning',
      familyId: 'sp5547-ihp-medical-delegation-and-positioning',
      familyLabel: 'Performing Unauthorized Medical Procedures Outside an IHP or Neglecting Positioning and Seizure Safety',
      title: 'Follow Nurse-Directed IHP Delegation, Safe Transfers, Positioning, and Seizure Protocols',
      recognitionCue: 'A teacher or paraprofessional is asked to administer rectal or intranasal rescue seizure medication, suction a tracheostomy, or feed via G-tube based on an informal parent note—or leaves a non-ambulatory student in one wheelchair position all day.',
      repairQuestion: 'Is this medical or physical care task authorized inside a current nurse-authored IHP with verified state-legal delegation and competency training, and are positioning, skin-integrity, and seizure-safety protocols strictly followed?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Scan the vignette for healthcare scope-of-practice violations (untrained staff performing invasive procedures, acting on verbal parent requests without physician orders/nurse IHP), unsafe one-person lifts, or dangerous seizure myths (putting objects in the mouth, restraining convulsing limbs).',
          requiredOutput: 'Identify the exact medical-delegation, positioning, or emergency-safety hazard in the distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Anchor four non-negotiable health and physical safety standards: (1) Medical Delegation (requires physician orders, school-nurse-authored IHP and Emergency Care Plan, compliance with the state Nurse Practice Act, documented hands-on competency sign-off, and ongoing RN supervision), (2) Positioning & Mobility (follow OT/PT positioning schedules across wheelchair, stander, and side-lyer to protect respiration, digestion, and skin integrity; inspect for redness; use two-person or mechanical Hoyer lifts), (3) Feeding/Swallowing Safety (strict dysphagia diet textures, upright alignment, aspiration red-flag alerts), and (4) Seizure First Aid (ease safely to floor, turn on side, cushion head, time duration, never place anything in mouth or restrain, follow IHP rescue-med/911 triggers).',
          requiredOutput: 'State the three prerequisites before a teacher can legally perform a delegated medical procedure and list the four immediate safety steps during a tonic-clonic seizure.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A parent hands a special education teacher a new bottle of liquid seizure medication at morning drop-off and asks the teacher to give it if the student stares blankly for two minutes. Specify the legally and medically safe response.',
          requiredOutput: 'Route the medication immediately to the school nurse, verify written physician orders and signed parent authorization, update the student\'s IHP/Seizure Action Plan, and complete formal nurse-delegated training before any classroom administration.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh 5547 physical-care vignette where a paraprofessional notices persistent redness over a non-ambulatory student\'s hip after a long wheelchair block.',
          requiredOutput: 'Select immediate repositioning per OT/PT plan, alerting the school nurse and family to prevent pressure ulcer breakdown, and reviewing seating cushion alignment with OT/PT.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sp5547-playbook-ecological-assessment-and-dynamic-observation',
      familyId: 'sp5547-ecological-assessment-and-dynamic-observation',
      familyLabel: 'Using Floor-Effect Standardized Scores Instead of Ecological Inventory and Dynamic Assessment',
      title: 'Conduct Ecological Inventories, Preference Assessments, and Sensory-Channel Evaluations',
      recognitionCue: 'An assessment item shows a student with profound multiple disabilities scoring at the absolute floor of a norm-referenced IQ battery ("untestable"), and asks how the team should gather valid PLAAFP data to drive meaningful IEP goals.',
      repairQuestion: 'How do we gather ecologically valid functional data—through ecological inventories, discrepancy analysis, systematic preference assessment, Communication Matrix mapping, and functional sensory evaluations—instead of stopping at floor-effect test scores?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify why standardized norm-referenced instruments break down for students with severe/profound or sensory-motor disabilities (floor effects, motor/verbal response bias, lack of instructional utility) and spot distractors that label a student "untestable."',
          requiredOutput: 'Explain the validity failure of the norm-referenced distractor and name the functional assessment domain needed (environment, preference, communication, or sensory channel).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Match four high-yield severe-disabilities assessment tools to their exact instructional output: (1) Ecological Inventory & Discrepancy Analysis (catalogs current/future environments → sub-environments → activities → natural peer steps → student discrepancy → instruction or adaptation plan), (2) Systematic Preference Assessment (single-stimulus, paired-choice, or MSWO to empirically identify potent reinforcers), (3) Communication Matrix (maps expressive modes across 7 levels from pre-intentional to language), and (4) Functional Vision/Learning Media & Audiological Assessment (distinguishes ocular vs. Cortical Visual Impairment, optimal visual field, lighting, and tactile/auditory access).',
          requiredOutput: 'Pair each of the four tools with one concrete IEP decision it informs.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A newly enrolled 9-year-old with deaf-blindness and severe motor impairment arrives with a report reading "unable to establish basal; cognitive functioning untestable." Design a four-part comprehensive evaluation plan.',
          requiredOutput: 'Combine a Functional Vision/Hearing and Learning Media Assessment (TVI/TOD), a tactile/micro-switch preference assessment, a Communication Matrix with family input, and an Ecological Inventory of classroom, cafeteria, and mobility routines.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a new 5547 assessment vignette asking how to determine whether a student with profound disabilities who does not reach for toys prefers vibration, music, or warm light as a reinforcer.',
          requiredOutput: 'Select a systematic single-stimulus (or paired-choice) preference assessment tracking observable approach/affective indicators (smiling, orienting, sustained vocalization, reduced withdrawal) across repeated trials.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'sp5547-playbook-supported-decision-making-and-adult-transition',
      familyId: 'sp5547-supported-decision-making-and-adult-transition',
      familyLabel: 'Defaulting to Full Guardianship Instead of Supported Decision-Making and Person-Centered Transition',
      title: 'Center Dignity of Risk, Supported Decision-Making, and Interagency Adult Transition',
      recognitionCue: 'A secondary transition team tells parents they must file for full legal guardianship before their 17-year-old with severe disabilities turns 18, or defaults the student to a segregated day program without person-centered planning or early Medicaid/adult-agency links.',
      repairQuestion: 'Have we informed the student and family about Supported Decision-Making and least-restrictive legal options before guardianship, while using person-centered planning and early adult-agency linkages to build a self-determined adult life?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot paternalistic transition traps: treating plenary guardianship as mandatory at age 18, excluding a non-speaking student from their own transition meeting, or waiting until graduation month to contact adult developmental-disability agencies (which often have multi-year waitlists).',
          requiredOutput: 'Identify the autonomy, transfer-of-rights, or interagency-timing breakdown in the distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Sequence the least-restrictive adult-transition safeguards: (1) notify student and parents at least one year before age of majority regarding IDEA transfer of rights, (2) present the decision-making continuum from least to most restrictive (Supported Decision-Making agreements → educational/healthcare proxy or power of attorney → representative payee → limited guardianship → plenary guardianship only as last resort), (3) use Person-Centered Planning (MAPS, PATH, Essential Lifestyle Planning) incorporating the student\'s AAC/communication preferences, and (4) initiate interagency linkages early (with written consent) for Medicaid Home and Community-Based Services (HCBS) waivers, state DD agencies, Vocational Rehabilitation/customized employment, and SSI/ABLE financial planning.',
          requiredOutput: 'Order four decision-making options from least to most restrictive and explain why Medicaid HCBS waiver and DD-agency referrals must start years before age 21/22 exit.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Parents of a 17-year-old with profound ID and complex medical needs tell the IEP team they heard they must obtain full guardianship to stay involved in IEP meetings and doctor visits after age 18. Draft the team\'s accurate, respectful guidance.',
          requiredOutput: 'Clarify that IDEA requires transfer-of-rights notice (never mandating guardianship), outline least-restrictive options such as Supported Decision-Making and healthcare/educational power of attorney alongside legal-aid consultation, and invite the student via AAC/visual preference boards to co-lead a PATH person-centered plan.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a 5547 transition vignette asking how a transition coordinator should pursue employment for a 20-year-old with multiple disabilities who uses a wheelchair and eye-gaze AAC.',
          requiredOutput: 'Select Discovery and Customized Employment carved around the student\'s strengths, assistive technology, and natural workplace supports in competitive integrated settings rather than defaulting to sheltered workshops.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

module.exports = {
  special_education_5355,
  special_education_behavior_emotional_5372,
  special_education_early_childhood_5692,
  special_education_intellectual_disabilities_5322,
  special_education_learning_disabilities_5383,
  special_education_severe_profound_5547
};
