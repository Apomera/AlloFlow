'use strict';

// Applied practice case workshops for Praxis Special Education: Foundational Knowledge (5355)
// and Praxis Special Education: Behavioral Disorders and Emotional Disturbances (5372):
// 12 original, unscored applied case workshops (6 per library) aligned to official domains
// and verified catalog URLs.

const REVIEW_STATUS = 'source-reviewed-editorial-pass';
const REVIEW_NOTE =
  'Independent applied case-analysis practice; not an official ETS prompt, rubric, score, pass prediction, or eligibility/licensure determination. AlloFlow does not score written responses.';

const special_education_5355 = {
  workshopLabel: 'Applied SPED case workshops',
  workshopPracticeNote:
    'Independent applied special-education case workshops designed to build IDEA legal compliance, IEP/LRE planning, SDI/UDL instruction, MTSS assessment, and collaborative reasoning for Special Education (5355) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or licensure determinations.',
  workshops: [
    {
      id: 'sped5355-workshop-01',
      taskType: 'Nondiscriminatory evaluation & MTSS/CBM decision',
      title: 'Separate Second-Language Needs from SLD While Honoring Evaluation Timelines',
      prompt:
        'Analyze Sofia\'s Tier 2 reading CBM data, implementation logs, and multilingual history to recommend a legally compliant IDEA evaluation plan and immediate MTSS adjustments.',
      stimulus:
        'Sofia (Grade 4, Spanish home language, 2.5 years in U.S. schools, WIDA 2.7) reads 46 words correct per minute on English CBM (benchmark 94; slope 0.6/week over 7 weeks). Logs show she missed 8 of 21 Tier 2 sessions for ESL pullout. In Spanish she reads Grade 3 texts at 92% accuracy and solves oral math word problems accurately. Her mother emailed a written IDEA evaluation request yesterday, but the MTSS lead wants to wait 12 more weeks.',
      estimatedMinutes: 15,
      taskParts: [
        'Evaluate why the English CBM score and flat Tier 2 slope cannot by themselves confirm a Specific Learning Disability without auditing dosage fidelity and language-acquisition factors.',
        'Explain the IDEA Child Find and procedural response required after the mother\'s written evaluation request, including why MTSS cannot be used to delay or deny an initial evaluation.',
        'Design a nondiscriminatory, multidisciplinary evaluation plan under 34 CFR 300.304 alongside immediate Tier 2 schedule and English language scaffold repairs.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Contrast Sofia\'s 46 WRCM English probe and 0.6 slope against her 92% Spanish reading accuracy, oral math reasoning strength, WIDA 2.7 level, and 38% missed Tier 2 dosage (8 of 21 sessions).',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply IDEA 34 CFR 300.304 nondiscriminatory assessment mandates, OSEP guidance prohibiting RTI/MTSS delays to parent-requested evaluations, and the exclusionary factor for limited English proficiency.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Recommend bilingual or native-language reading evaluation, developmental language history interviews, peer-comparison norms, and deconflicted Tier 2 English vocabulary and decoding bridges.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Issue Prior Written Notice and obtain informed consent in Spanish, use a qualified bilingual evaluator or trained interpreter, and graph biweekly CBM progress with verified fidelity.',
        },
      ],
      successCriteria: [
        'Explicitly rejects delaying the mother\'s written evaluation request for 12 more weeks of MTSS and cites timely Prior Written Notice and informed parental consent.',
        'Identifies both compromised Tier 2 treatment integrity (8 missed sessions due to ESL pullout) and second-language proficiency as confounds in the English CBM data.',
        'Specifies valid native-language and bilingual assessment procedures under 34 CFR 300.304 rather than relying on English-normed scores alone.',
        'Pairs evaluation compliance with immediate schedule coordination and sheltered English instructional supports so Sofia does not lose reading time.',
      ],
      commonPitfalls: [
        'Agreeing with the MTSS lead to postpone IDEA evaluation until Sofia finishes a full 12-week Tier 2 cycle despite a written parent request.',
        'Treating the 46 WRCM English score as direct evidence of dyslexia without comparing Spanish literacy or similarly situated multilingual peers.',
        'Having an untrained bilingual paraprofessional informally translate English standardized test items during the evaluation.',
        'Halting Tier 2 reading and ESL instruction while the 60-day multidisciplinary evaluation timeline is underway.',
      ],
      sampleOutline: [
        'Data & fidelity audit: Sofia\'s 92% Spanish accuracy, WIDA 2.7 profile, and 8 missed Tier 2 sessions show that language transfer barriers and broken dosage confound her 0.6 WRCM/week slope.',
        'Legal timeline compliance: Respond promptly to the mother\'s written request with Spanish-language Prior Written Notice, procedural safeguards, and consent forms; initiate evaluation without waiting for extra MTSS weeks.',
        'Nondiscriminatory assessment battery: Pair a bilingual speech/school psychologist evaluation with Spanish and English phonics/comprehension measures, caregiver language history, and classroom observations.',
        'Concurrent instructional repair: Realign ESL and Tier 2 schedules to protect full dosage, target explicit English morphological and vocabulary transfer, and track biweekly CBM growth.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/d/300.304',
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/12',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sped5355-workshop-02',
      taskType: 'PLAAFP-to-IEP goal & SDI/accommodation alignment',
      title: 'Align Measurable IEP Goals and SDI Without Diluting Grade-Level Standards',
      prompt:
        'Revise a flawed draft IEP for a sixth-grade student with a Specific Learning Disability so present levels, measurable annual goals, specially designed instruction, and accommodations preserve grade-level rigor.',
      stimulus:
        'Marcus (Grade 6, SLD in reading comprehension and writing) decodes multisyllabic science terms at 93% accuracy with text-to-speech, scores 80% on literal questions, and scores 45% on text-dependent inference items. Baseline writing probes average 4 disconnected sentences without evidence. The draft goal states "Marcus will improve reading and writing by 80%" and proposes Grade 3 science worksheets instead of Grade 6 labs with SDI and accommodations.',
      estimatedMinutes: 15,
      taskParts: [
        'Diagnose the legal and instructional flaws in the draft IEP goal and explain why assigning Grade 3 science worksheets is an unwarranted curriculum modification rather than an accommodation.',
        'Draft a compliant, measurable annual reading-comprehension or written-expression goal linked directly to Marcus\'s baseline PLAAFP numbers (condition, observable behavior, criterion, timeframe).',
        'Specify evidence-based Specially Designed Instruction (SDI) and classroom/state-assessment accommodations that build independent inference and evidence-based writing in Grade 6 content.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Anchor the plan in Marcus\'s 93% TTS-supported decoding, 80% literal vs. 45% inference comprehension split, and 4-sentence baseline lacking textual citations.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply IDEA 34 CFR 300.320 IEP content standards, the distinction between construct-preserving accommodations and standard-lowering modifications, and WWC adolescent literacy practices.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Pair explicit inference and paragraph-structure SDI (modeling, graphic organizers, sentence frames) with Grade 6 science accommodations (TTS, chunked prompts, extended time).',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Define biweekly curriculum-based comprehension and rubric-scored writing probes, quarterly IEP progress reporting aligned to report cards, and state-assessment accommodation consistency.',
        },
      ],
      successCriteria: [
        'Clearly distinguishes accommodations (maintaining Grade 6 cognitive rigor) from modifications (lowering standards to Grade 3 worksheets that narrow graduation pathways).',
        'Writes a measurable annual goal tied directly to Marcus\'s 45% inference or 4-sentence baseline with explicit condition, skill, mastery criterion, and measurement schedule.',
        'Identifies concrete SDI methods (explicit comprehension strategy modeling, morphological/academic vocabulary work, structured writing routines) distinct from generic classroom accommodations.',
        'Aligns daily classroom accommodations with allowable state assessment supports and establishes objective progress-monitoring routines.',
      ],
      commonPitfalls: [
        'Keeping the vague "improve reading and writing by 80%" goal without specifying baseline performance, grade-level text conditions, or measurement tools.',
        'Approving Grade 3 science worksheets to reduce frustration, inadvertently denying Marcus access to the general Grade 6 curriculum.',
        'Listing accommodations like extended time or text-to-speech as though they substitute for Specially Designed Instruction in inference and writing.',
        'Adding accommodations exclusively for state testing that Marcus never practices during daily Grade 6 instruction.',
      ],
      sampleOutline: [
        'PLAAFP & goal audit: The draft goal lacks baseline anchors, observable criteria, and measurement procedures, while Grade 3 worksheets improperly modify content standards when Marcus shows 80% literal comprehension.',
        'Measurable goal redesign: Specify that given Grade 6 informational text with text-to-speech and a graphic organizer, Marcus will answer text-dependent inference questions with 80% accuracy across 4 of 5 consecutive biweekly probes within 36 instructional weeks.',
        'SDI vs. accommodations: Deliver explicit small-group SDI in question-answer relationships and claim-evidence-reasoning writing, paired with TTS, chunked lab protocols, and word banks in Grade 6 science.',
        'Progress tracking: Collect biweekly inference probes and analytic writing rubrics, review slope every 6 weeks, and mirror daily accommodations on state assessments.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/d/300.320',
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/29',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sped5355-workshop-03',
      taskType: 'LRE placement, UDL access & assistive technology',
      title: 'Restore LRE Access Through Assistive Technology and UDL Supplementary Aids',
      prompt:
        'Review a placement proposal for a fifth-grade student with cerebral palsy and dysarthria to determine how LRE mandates, IDEA assistive technology consideration, and UDL supports govern her instructional setting.',
      stimulus:
        'Priya (Grade 5, cerebral palsy with dysarthria and fine-motor fatigue) shows grade-level receptive vocabulary and 84% accuracy on Grade 5 fraction problems when responding via her speech-generating AAC tablet. She currently spends 70% of her day in a separate self-contained class solely because the Grade 5 room lacks an adjustable lap tray, switch-accessible math tools, and UDL response options. Her parents request full-day general education.',
      estimatedMinutes: 15,
      taskParts: [
        'Evaluate the current 70% self-contained placement against IDEA 34 CFR 300.114 LRE requirements and explain why administrative convenience or missing classroom equipment cannot justify removal.',
        'Apply the IDEA 34 CFR 300.324 special-factors mandate for assistive technology and communication to specify the supplementary aids, AAC integration, and UDL math scaffolds Priya needs in Grade 5.',
        'Outline a coordinated general-education transition, staff training, and progress-monitoring plan involving the SLP, OT, general educator, and family.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Highlight Priya\'s grade-level receptive skills and 84% AAC-supported fraction mastery to show her barrier is physical and environmental access rather than cognitive inability.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Cite IDEA 34 CFR 300.114 LRE presumption, supplementary aids and services before removal, and 34 CFR 300.324(a)(2) mandatory team consideration of communication and assistive technology.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Specify UDL multiple means of expression (AAC vocabulary pages for Grade 5 math, digital manipulatives, reduced handwriting load), ergonomic OT positioning, and push-in co-teaching.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Document AT devices and staff/family training directly in the IEP, track independent AAC participation and Grade 5 mastery data, and protect full inclusion in nonacademic periods.',
        },
      ],
      successCriteria: [
        'Identifies the current 70% separate placement as an LRE violation because removal stems from missing classroom equipment rather than unmet needs despite supplementary aids.',
        'Addresses mandatory IEP consideration of both communication needs and assistive technology devices/services (including staff training and device maintenance) under 34 CFR 300.324.',
        'Embeds concrete UDL representations and expression options (AAC math vocabulary, switch/tablet tools, ergonomic setup) that preserve Priya\'s active peer participation.',
        'Defines clear collaborative roles for the general educator, special educator, OT, and SLP with objective participation and academic outcome metrics.',
      ],
      commonPitfalls: [
        'Recommending that Priya stay in the self-contained classroom until the general educator independently figures out how to program her AAC tablet.',
        'Treating assistive technology solely as hardware delivery while omitting IDEA-covered AT services such as vocabulary customization, troubleshooting, and teacher coaching.',
        'Excusing Priya from collaborative math discourse because AAC responses take slightly longer than spoken replies.',
        'Placing Priya in general education without writing her ergonomic, AAC, and push-in supports explicitly into the IEP supplementary aids section.',
      ],
      sampleOutline: [
        'LRE determination: Because Priya achieves 84% on Grade 5 fractions using AAC, keeping her in a separate classroom for 70% of the day based on missing equipment violates 34 CFR 300.114.',
        'AT & UDL design: Document AAC math-vocabulary overlays, switch-accessible digital manipulatives, adjustable OT desk positioning, and extended response wait time under IEP supplementary aids.',
        'Team training & delivery: Schedule SLP and OT consultation to train Grade 5 staff and peers on AAC communication partners and deploy push-in special education support during complex labs.',
        'Access & outcome tracking: Monitor Priya\'s independent AAC turns per lesson, Grade 5 curriculum mastery, and fatigue levels every 3 weeks with family check-ins.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/b/300.114',
        'https://sites.ed.gov/idea/regs/b/d/300.324',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sped5355-workshop-04',
      taskType: 'FBA/BIP design & PBIS tiered integration',
      title: 'Replace Punitive Hallway Removals with a Function-Matched Math BIP',
      prompt:
        'Interpret ten days of classroom ABC observations and PBIS context data for a third-grade student with ADHD to design a proactive, function-matched Behavior Intervention Plan.',
      stimulus:
        'Devon (Grade 3, OHI for ADHD) snaps pencils, calls out, and leaves his seat during 20-minute independent multi-step math blocks. Across 10 ABC observations, 17 of 20 episodes began within 2 minutes of a 15-problem worksheet and ended with a clip-chart move down and 10-minute hallway removal. During partner math fluency games he stays engaged 88% of the time. Tier 1 PBIS expectations are posted on a chart but rarely taught or practiced.',
      estimatedMinutes: 15,
      taskParts: [
        'Formulate a testable functional hypothesis from the ABC pattern explaining how hallway removals unintentionally reinforce Devon\'s off-task behavior.',
        'Design a multi-component BIP aligned with PBIS that combines antecedent math scaffolds, explicit teaching of a functionally equivalent replacement behavior, and positive reinforcement.',
        'Establish an implementation fidelity checklist and daily behavioral-academic progress monitoring plan to evaluate whether both work completion and on-task engagement improve.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Link the 17 of 20 episodes triggered by 15-problem independent worksheets and terminated by 10-minute hallway removals against Devon\'s 88% engagement during partner games.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply functional behavior assessment principles, negative reinforcement (task escape) mechanics, WWC teacher-delivered behavioral intervention guidance, and explicit elementary math scaffolding.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Replace clip-chart hallway removals with chunked 3-problem math strips, concrete-representational worked examples, a taught break/help signal, and behavior-specific praise.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Track daily problems completed accurately, independent use of the help/break card, and off-task frequency alongside weekly adult fidelity checks on antecedent prompts and praise ratios.',
        },
      ],
      successCriteria: [
        'Correctly identifies escape from lengthy independent multi-step math tasks (negative reinforcement via hallway removal) as the primary hypothesized function.',
        'Eliminates punitive public clip-chart shaming and hallway removals that both reinforce escape and sever math instruction.',
        'Integrates academic math supports (chunked sets, worked examples, brief partner warm-ups) with explicit replacement-skill teaching (raising a help/check card) and dense reinforcement.',
        'Specifies measurable behavioral and math-completion targets plus adult fidelity monitoring to distinguish plan failure from inconsistent implementation.',
      ],
      commonPitfalls: [
        'Mislabeling Devon\'s calling out as attention-seeking without noting that 85% of episodes end in task escape during independent worksheets.',
        'Increasing punishment severity (longer hallway time or losing recess) instead of teaching an alternative escape/help response and lowering task friction.',
        'Designing a purely behavioral token chart while ignoring the instructional barrier of an unscaffolded 15-problem multi-step worksheet.',
        'Tracking only office referrals rather than daily replacement-skill usage, math accuracy, and staff fidelity.',
      ],
      sampleOutline: [
        'Functional hypothesis: When presented with a 15-problem independent multi-step math sheet, Devon snaps pencils and calls out to escape aversive task difficulty, reinforced by 10-minute hallway removals.',
        'Antecedent & Tier 1 PBIS repair: Reteach classroom math-block expectations positively, cut worksheets into 3-problem chunks with a worked model, and open with a 2-minute partner warm-up.',
        'Replacement & consequence plan: Explicitly teach Devon to flip a desk help/check card for 30-second coaching or a brief earned movement reset, paired with a 4-to-1 behavior-specific praise ratio and neutral non-removal redirection.',
        'Progress & fidelity tracking: Graph daily chunk completion, card requests, and off-task counts over 4 weeks alongside twice-weekly fidelity checks on teacher prompting and praise.',
      ],
      references: [
        'https://ies.ed.gov/ncee/wwc/practiceguide/31',
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/26',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sped5355-workshop-05',
      taskType: 'MDR discipline compliance & procedural safeguards',
      title: 'Enforce Manifestation Determination, PWN, and FAPE Continuity Rules',
      prompt:
        'Advise a middle school IEP team on mandatory IDEA discipline safeguards after an eighth-grade student with an IEP faces a suspension that exceeds ten cumulative school days.',
      stimulus:
        'Jordan (Grade 8, IEP for ED and SLD) has already served 8 out-of-school suspension days this semester. Today a substitute gave a surprise quiz without honoring Jordan\'s IEP quiet break pass or visual preview; Jordan shouted profanity and knocked over a desk. The assistant principal proposes an immediate 5-day suspension (13 cumulative days) and unilateral transfer to an alternative school with no team meeting or written notice.',
      estimatedMinutes: 15,
      taskParts: [
        'Determine whether the proposed 5-day suspension triggers a disciplinary change of placement under 34 CFR 300.530 and list the mandatory timelines for parent notification, Procedural Safeguards Notice, and Manifestation Determination Review (MDR).',
        'Apply both statutory MDR prongs to Jordan\'s case—highlighting the direct failure to implement his IEP break pass and visual preview—and state the required legal outcome.',
        'Detail the required FAPE service continuity, FBA/BIP review, and Prior Written Notice safeguards that prevent unilateral placement changes.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Note the 8 prior suspension days plus 5 proposed days (13 total, crossing the 10-day threshold) and the substitute\'s failure to provide Jordan\'s documented IEP break pass and visual preview.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply 34 CFR 300.530 (10-day change-of-placement rules, 10-school-day MDR deadline, two-prong manifestation test, return-to-placement mandate) and 34 CFR 300.504 procedural safeguards notice.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Convene the MDR team within 10 school days, find a manifestation under Prong 2 (and evaluate Prong 1), return Jordan to his placement, conduct/revise his FBA/BIP, and fix substitute IEP handoffs.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Provide same-day parent notice and procedural safeguards, guarantee FAPE services beginning on Day 11 of removal, issue PWN for any IEP revision, and block unilateral alternative transfers.',
        },
      ],
      successCriteria: [
        'Correctly calculates that 13 cumulative days triggers a change-of-placement review requiring same-day parental notification, Procedural Safeguards Notice, and an MDR within 10 school days.',
        'Applies both MDR prongs accurately, recognizing that failing to provide IEP-mandated supports (break pass and visual preview) establishes a direct manifestation under Prong 2.',
        'States that when conduct is a manifestation (and no weapon, drug, or serious bodily injury special circumstance exists), Jordan must return to his placement unless the parent and LEA agree to a change via the BIP.',
        'Requires immediate remediation of IEP implementation gaps (including substitute folders/training), FBA/BIP revision, and FAPE continuity starting on Day 11.',
      ],
      commonPitfalls: [
        'Allowing the assistant principal to transfer Jordan unilaterally to an alternative school without an IEP team decision or parent agreement.',
        'Treating the knocked-over desk as a 45-school-day "special circumstance" removal when no weapon, controlled substance, or serious bodily injury occurred.',
        'Focusing the MDR solely on whether Jordan\'s disability caused the outburst while overlooking Prong 2 (direct result of the school\'s failure to implement the IEP).',
        'Omitting FAPE educational services during removals beyond 10 school days or forgetting to send the Procedural Safeguards Notice on the decision date.',
      ],
      sampleOutline: [
        'Change-of-placement trigger: Adding 5 days to 8 prior days reaches 13 cumulative days; on the date of the disciplinary decision, notify Jordan\'s parent and deliver the Procedural Safeguards Notice under 34 CFR 300.504.',
        'Two-prong MDR analysis: Within 10 school days, relevant IEP team members review data; because the substitute omitted IEP-required break and preview supports, Prong 2 (direct result of failure to implement the IEP) is met immediately.',
        'Mandatory remedies: Return Jordan to his agreed placement, immediately correct IEP implementation with substitute-ready accommodation protocols, and conduct or update his FBA and BIP.',
        'FAPE & PWN safeguards: Guarantee educational services starting on the 11th cumulative day of removal and issue Prior Written Notice before any team-agreed IEP or BIP modification.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/e/300.530',
        'https://sites.ed.gov/idea/regs/b/e/300.504',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sped5355-workshop-06',
      taskType: 'Co-teaching, paraprofessional supervision & transition',
      title: 'Rebuild Co-Teaching Roles, Fade Para Dependence, and Launch Age-16 Transition',
      prompt:
        'Restructure collaborative instruction, paraprofessional support, and secondary transition planning for a tenth-grade student whose inclusive program has drifted into prompt dependency and missing transition compliance.',
      stimulus:
        'Elena (Grade 10, turning 16 next month, Intellectual Disability) attends co-taught biology and English with a 1-to-1 paraprofessional. Walkthroughs show the special educator circulates passively ("one teach, one assist") while the aide writes Elena\'s lab answers and whispers every step, isolating her from peers. Her draft age-16 IEP lacks transition assessments, measurable postsecondary goals, and any vocational agency planning.',
      estimatedMinutes: 15,
      taskParts: [
        'Redesign the co-teaching partnership using higher-impact models (such as station, parallel, or alternative teaching) so the special educator delivers authentic SDI rather than serving as a classroom aide.',
        'Establish a paraprofessional supervision and prompt-fading plan that clarifies ethical role boundaries, stops the aide from completing Elena\'s work, and builds natural peer supports.',
        'Bring Elena\'s age-16 IEP into compliance with IDEA 34 CFR 300.320(b) secondary transition mandates—including age-appropriate assessments, measurable postsecondary goals, course of study, and student-led participation.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Address the three walkthrough gaps together: passive "one teach, one assist" co-teaching, paraprofessional over-prompting/scribing that blocks peer ties, and absent age-16 transition components.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply IDEA 34 CFR 300.320(b) transition requirements (in effect by age 16, updated annually), LRE natural-support principles under 34 CFR 300.116, and teacher-directed paraprofessional supervision standards.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Schedule weekly co-planning for station/parallel teaching, implement a least-to-most prompt-fading matrix for the paraprofessional, and administer interest/adaptive transition assessments with Elena.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Obtain parental consent before inviting outside vocational rehabilitation agencies, invite Elena to her IEP meeting, and track independent task initiation and peer interaction rates monthly.',
        },
      ],
      successCriteria: [
        'Replaces overused "one teach, one assist" routines with structured co-teaching models and shared planning that preserve licensed special-educator delivery of SDI.',
        'Sets explicit paraprofessional boundaries (supporting access rather than completing lab work) paired with a concrete prompt-fading and peer-partnering plan.',
        'Includes all required IDEA age-16 transition elements: age-appropriate transition assessments, measurable postsecondary goals (training/education, employment, and as appropriate independent living), aligned transition services, and course of study.',
        'Notes the legal requirement to invite Elena to her transition IEP meeting and obtain prior written consent from parents (or adult student) before inviting outside agencies.',
      ],
      commonPitfalls: [
        'Delegating lesson design, grading, or SDI planning to the paraprofessional rather than providing structured teacher supervision and fading schedules.',
        'Writing generic postsecondary goals ("Elena wants a job") without tying them to age-appropriate transition assessments and measurable annual IEP goals.',
        'Inviting a state vocational rehabilitation counselor to the IEP meeting without first securing written parental consent.',
        'Abruptly removing the paraprofessional overnight without teaching Elena self-monitoring checklists and training natural peer supports first.',
      ],
      sampleOutline: [
        'Co-teaching overhaul: Shift from passive "one teach, one assist" to planned station and parallel teaching in biology and English so both teachers share instructional authority and deliver SDI.',
        'Paraprofessional fading: Train the paraprofessional on least-to-most prompting, move seating back during peer lab work, replace scribing with visual checklists/assistive tools, and audit prompt levels biweekly.',
        'Age-16 transition compliance: Administer vocational interest and adaptive skill assessments with Elena and her family, draft measurable postsecondary education/employment/independent-living goals, and align her high school course of study.',
        'Student voice & agency consent: Coach Elena to co-lead part of her IEP meeting and secure written parental consent before inviting vocational rehabilitation representatives.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/d/300.320',
        'https://sites.ed.gov/idea/regs/b/b/300.116',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
  ],
};

const special_education_behavior_emotional_5372 = {
  workshopLabel: 'Applied EBD case workshops',
  workshopPracticeNote:
    'Independent applied behavioral and emotional-support case workshops designed to build FBA/BIP design, function-matched intervention, trauma-informed de-escalation, and IDEA discipline-safeguard reasoning for Special Education: EBD (5372) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or licensure determinations.',
  workshops: [
    {
      id: 'ebd5372-workshop-01',
      taskType: 'Dual-function ABC & setting-event FBA',
      title: 'Separate Escape and Attention Functions Across Morning and Afternoon Routines',
      prompt:
        'Analyze scatterplot and direct ABC data for a fifth-grade student with EBD to formulate separate functional hypotheses, address biological/home setting events, and replace a failing one-size-fits-all point-loss system.',
      stimulus:
        'Caleb (Grade 5, EBD) loses points under one response-cost chart all day. Ten days of ABC and scatterplot data reveal two patterns: at 9:15 AM independent writing, paper-tearing and chair-tipping occur 8 of 10 days—peaking Mondays and Thursdays after late caregiver shifts and skipped breakfast—ending in hallway removal. At 1:30 PM hallway and art transitions, loud teasing draws peer laughter and 45-second teacher lectures.',
      estimatedMinutes: 15,
      taskParts: [
        'Write two separate, observable competing-behavior functional statements distinguishing the 9:15 AM setting-event/escape chain from the 1:30 PM peer-and-adult attention chain.',
        'Explain why the single response-cost point-loss chart fails in both contexts and how hallway removals and 45-second lectures inadvertently maintain the problem behaviors.',
        'Recommend distinct, function-matched antecedent, teaching, and consequence strategies for morning writing and afternoon transitions.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Separate the 9:15 AM cluster (skipped breakfast/fatigue setting events, independent writing trigger, hallway-removal escape) from the 1:30 PM cluster (unstructured transition trigger, peer laughter and 45-second lecture attention).',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply functional behavioral assessment principles (setting events, antecedents, behavior, maintaining consequences), competing-behavior pathways, and WWC elementary behavioral intervention evidence.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Neutralize morning setting events (breakfast check-in, chunked writing starters, earned help/break pass) while redesigning afternoon transitions (structured helper role, brief neutral cues, peer-earned recognition).',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Track morning and afternoon rates separately on daily behavioral logs, verify adult fidelity on eliminating 45-second lectures and hallway removals, and partner nonjudgmentally with caregivers.',
        },
      ],
      successCriteria: [
        'Explicitly distinguishes two separate behavioral functions—morning task escape compounded by fatigue/hunger setting events vs. afternoon peer and adult attention.',
        'Explains the exact reinforcement traps: hallway removal negatively reinforces morning tearing, while 45-second lectures positively reinforce afternoon teasing.',
        'Proposes setting-event neutralization (non-stigmatizing breakfast access and Monday/Thursday soft check-in) alongside separate morning and afternoon replacement behaviors.',
        'Specifies separate period-by-period data tracking so progress in one routine is not masked by totals from the other.',
      ],
      commonPitfalls: [
        'Assigning a single global function ("Caleb wants control") across both morning writing and afternoon transitions.',
        'Ignoring the Monday/Thursday sleep and nutrition setting events or blaming caregivers instead of building dignified school check-in supports.',
        'Keeping hallway removals or lengthy verbal lectures in place while simply raising the point-loss penalty.',
        'Averaging morning and afternoon incident counts into one daily score that obscures whether each function-specific strategy is working.',
      ],
      sampleOutline: [
        'Dual functional hypotheses: Morning paper-tearing and chair-tipping are maintained by escape from independent writing (amplified by Monday/Thursday fatigue and skipped breakfast); afternoon teasing is maintained by peer laughter and adult lecture attention.',
        'Reinforcement-trap audit: Uniform point loss teaches no replacement skill, hallway removals reward escape, and 45-second reprimands deliver rich attention.',
        'Matched morning & afternoon plans: Offer a discreet breakfast Check-In, sentence frames, and a break/help card at 9:15 AM; assign a structured transition leadership role, pre-correct expectations, minimize reprimands to 5-second neutral prompts, and build positive peer recognition at 1:30 PM.',
        'Disaggregated monitoring: Graph morning escape episodes, afternoon attention episodes, and replacement-skill usage separately with weekly fidelity reviews.',
      ],
      references: [
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/31',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5372.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ebd5372-workshop-02',
      taskType: 'DRA, DRI & FCT replacement-skill engineering',
      title: 'Engineer an FCT and Differential Reinforcement Plan for Escape-Maintained Math Disruption',
      prompt:
        'Design a function-matched replacement teaching and differential reinforcement plan for a fourth-grade student whose math-block profanity and throwing are maintained by task escape.',
      stimulus:
        'Brianna (Grade 4, EBD) yells profanity and sweeps fraction tiles off her desk during timed independent math work (6 episodes weekly). A completed FBA confirmed escape from multi-step fraction tasks and slow help access (4-minute average wait). Her current plan uses verbal reprimands and losing Friday free time, yet weekly disruptions rose from 4 to 6 over a month and she completes fewer than 20% of assigned problems.',
      estimatedMinutes: 15,
      taskParts: [
        'Design a Functional Communication Training (FCT) protocol specifying an explicit, low-effort replacement request (help or brief break) that produces faster, more reliable reinforcement than yelling or throwing tiles.',
        'Integrate Differential Reinforcement of Alternative Behavior (DRA) and Incompatible Behavior (DRI) with extinction of escape-maintained disruption and antecedent math supports.',
        'Map out a systematic schedule-thinning plan so Brianna transitions from immediate dense reinforcement to realistic classroom wait times and sustained independent math completion.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Center the plan on the verified escape function, the 4-minute teacher wait barrier, the spike from 4 to 6 weekly episodes under Friday privilege loss, and under 20% item completion.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply matching-law efficiency principles (replacement behavior must require less effort and yield quicker payoff than problem behavior), FCT, DRA/DRI, and WWC K-5 behavioral guidance.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Teach a laminated two-sided "Help / 2-Min Reset" card with immediate initial honor (under 20 seconds), remove timed-drill pressure, model fraction steps, and reinforce active tile use (DRI).',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Plan proactively for a temporary extinction burst, graph daily FCT requests vs. disruptions and math completion, and thin break frequency only after 80% stable mastery.',
        },
      ],
      successCriteria: [
        'Designs an FCT replacement skill that is simpler, faster, and more reliably reinforced than profanity or sweeping tiles, directly resolving the 4-minute wait barrier.',
        'Pairs DRA (reinforcing card use and math-step completion) and DRI (reinforcing hands-on structured tile use or self-checking) with withholding escape following disruption.',
        'Addresses antecedent instructional friction (removing timed stress, pre-teaching fraction steps, chunking sets) so Brianna can experience genuine academic success.',
        'Includes an explicit schedule-thinning sequence (introducing a visual wait timer and gradually raising completed problems per break) plus extinction-burst readiness.',
      ],
      commonPitfalls: [
        'Telling Brianna to "raise your hand and wait patiently" while keeping the 4-minute response delay that makes profanity far more efficient.',
        'Honoring Brianna\'s FCT break card inconsistently or only after she has already started yelling, which chains escalation to escape.',
        'Withholding reinforcement until Friday afternoon instead of delivering immediate, function-matched reinforcement during the math block.',
        'Leaving Brianna permanently on unlimited breaks without a data-based thinning rule tied to math accuracy and tolerance for brief waits.',
      ],
      sampleOutline: [
        'FCT replacement design: Teach and rehearse a desk "Help / 2-Minute Reset" card during calm practice; honor requests within 15 seconds during acquisition so communication beats throwing tiles.',
        'Antecedent & DRA/DRI pairing: Replace timed drills with 3-item chunked fraction strips and worked examples; reinforce appropriate tile manipulation and card use immediately while calmly prompting card use instead of rewarding profanity with task removal.',
        'Extinction-burst preparation: Brief staff to remain calm, ensure safety, avoid lecturing, and reinforce the first appropriate request immediately if disruptions briefly spike.',
        'Thinning & monitoring: Once disruptions drop to 1 or fewer weekly and card use is independent for 2 weeks, introduce a 1-minute visual wait timer and shift breaks to earned completion milestones while graphing daily math accuracy.',
      ],
      references: [
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/31',
        'https://praxis.ets.org/test/special-education-teaching-students-with-behavioral-disorders-and-emotional-disturbances-5372.html',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ebd5372-workshop-03',
      taskType: 'Trauma-informed de-escalation & crisis safety safeguards',
      title: 'Replace Restrictive Door-Blocking with Trauma-Informed De-Escalation',
      prompt:
        'Design a phased acting-out cycle de-escalation protocol and legal-ethical safety plan for a seventh-grade student with EBD and complex trauma after staff nearly used an unauthorized physical restraint.',
      stimulus:
        'Malik (Grade 7, EBD with documented complex trauma) shows reliable early agitation cues—pulling his hood up, pacing near the back counter, jaw clenching, and muttering "back off"—4 to 6 minutes before overturning desks. Last week two untrained adults stepped between Malik and the door, gave rapid public ultimatums, touched his shoulder, and discussed a prone hold even though classmates had already exited and no one faced imminent physical harm.',
      estimatedMinutes: 15,
      taskParts: [
        'Analyze how adult crowding, doorway blocking, shoulder contact, and public ultimatums accelerated Malik\'s escalation through the acting-out cycle and conflicted with trauma-informed safety principles.',
        'Build a phase-by-phase individualized crisis and de-escalation protocol covering calm, trigger, agitation, acceleration, peak, de-escalation, and recovery stages.',
        'State the strict legal and ethical boundaries governing physical restraint and seclusion (including why prone restraint is prohibited), plus mandatory post-incident debriefing, documentation, and family notification.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Use Malik\'s 4-to-6-minute early warning window (hood up, pacing, clenched jaw) and the clear adult triggers (blocked exit, crowding, shoulder touch, rapid ultimatums) to anchor prevention.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply Colvin\'s acting-out cycle, trauma-informed co-regulation principles, U.S. Department of Education restraint/seclusion restraint-as-last-resort principles, and IDEA 34 CFR 300.530 BIP review duties.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Designate one calm lead adult, preserve physical space and an unblocked safe-exit route, offer two low-demand regulation choices at agitation, clear peers at peak, and delay academic demands until recovery.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Prohibit prone/supine/mechanical restraints and punitive seclusion, restrict emergency physical holds strictly to imminent serious physical harm by certified staff, and mandate same-day family notice and IEP team BIP review.',
        },
      ],
      successCriteria: [
        'Maps concrete staff actions to each phase of the acting-out cycle, focusing heavily on early agitation cues during the 4-to-6-minute prevention window.',
        'Removes trauma triggers by establishing one calm speaker, non-threatening side posture, zero unsolicited touch, unblocked egress, and simple concrete choices.',
        'Correctly states restraint and seclusion safeguards: emergency last resort only for imminent danger of serious physical harm, never for property destruction or noncompliance, never prone restraint, and never as a planned behavioral intervention.',
        'Requires structured post-crisis recovery, restorative repair only after full physiological regulation, incident documentation, parent notification, and IEP team FBA/BIP updating.',
      ],
      commonPitfalls: [
        'Treating overturned desks or profanity alone as legal justification for physical restraint when peers are safe and no imminent bodily harm exists.',
        'Trying to lecture, process emotions, or assign disciplinary consequences while Malik is still in peak or early de-escalation.',
        'Allowing multiple adults to talk simultaneously, hover over Malik, or block the doorway to assert authority.',
        'Writing emergency physical restraint into Malik\'s routine BIP as a standard consequence rather than strengthening proactive trauma-informed supports.',
      ],
      sampleOutline: [
        'Escalation audit: Blocking the doorway, touching Malik\'s shoulder, and firing public ultimatums triggered a trauma fight-or-flight response during his 4-to-6-minute agitation window.',
        'Phased de-escalation protocol: At early agitation cues, one designated staff member lowers voice, gives 6 feet of space, leaves the exit clear, and offers a pre-agreed cool-down pass or silent walk; at peak, clear peers quietly and prioritize safety without arguing.',
        'Restraint & seclusion boundaries: Enforce strict prohibition of prone holds and punitive seclusion; permit certified crisis intervention solely for imminent serious physical harm, never for property damage or defiance.',
        'Recovery & system review: Allow quiet sensory recovery before brief restorative debriefing, notify Malik\'s caregiver immediately if any crisis protocol activates, train all Grade 7 staff, and reconvene the IEP team to update his BIP.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/e/300.530',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5372.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ebd5372-workshop-04',
      taskType: 'Academic-behavior reciprocity & SRSD/self-monitoring',
      title: 'Break Task-Avoidance Writing Cycles Through SRSD and Self-Monitoring',
      prompt:
        'Design an integrated academic-behavioral intervention for a sixth-grade student with EBD whose persuasive-writing avoidance persisted despite a seat-time token economy.',
      stimulus:
        'Tessa (Grade 6, EBD with written-expression deficits) argues persuasively in oral class debates yet refuses English essays 4 of 5 days by dropping her head, debating rubric wording, and tearing drafts. Baseline probes show 18-word disorganized paragraphs with 0 counterarguments. A token chart rewarding "staying in seat" raised seat time to 86%, but written output stayed flat at 20 words and tearing episodes resumed once prompts grew longer.',
      estimatedMinutes: 15,
      taskParts: [
        'Explain the academic-behavior reciprocity breakdown demonstrated by Tessa\'s 86% seat time paired with flat 20-word drafts and resurgent draft-tearing.',
        'Outline a Self-Regulated Strategy Development (SRSD) instructional sequence (such as POW+TREE) adapted to capitalize on Tessa\'s strong oral argumentation skills.',
        'Pair SRSD with a student-operated self-monitoring, self-graphing, and positive feedback routine that promotes independent generalization across writing classes.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Contrast Tessa\'s strong oral debate skills and 86% token-driven seat time against her 18-to-20-word written baseline, 0 counterarguments, and 4-of-5-day essay avoidance.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply academic-behavior reciprocity principles, SRSD six-stage explicit strategy instruction, student self-monitoring/self-regulation research, and behavior-specific feedback standards.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Shift reinforcement from passive compliance to strategy steps using SRSD (develop background, discuss, model with think-alouds, memorize POW+TREE, support with oral-to-text bridges, fade to independent performance).',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Have Tessa self-graph essay elements (topic, reasons, counterargument, ending) and total words written twice weekly while coaching frustration self-talk and checking fidelity across teachers.',
        },
      ],
      successCriteria: [
        'Explains clearly why rewarding passive seat-time compliance failed: without explicit writing-strategy instruction, the underlying skill deficit continues to trigger escape and frustration.',
        'Structures SRSD across its core instructional stages—including explicit teacher think-aloud modeling of both writing planning and coping self-statements before fading scaffolds.',
        'Leverages Tessa\'s documented oral debate strength (such as oral rehearsal, speech-to-text planning, or graphic organizer dictation) as an instructional bridge to structured essays.',
        'Incorporates student self-monitoring checklists and visual self-graphing of essay elements and quality rather than relying solely on adult-managed token points.',
      ],
      commonPitfalls: [
        'Tightening the seat-time token economy or deducting points for torn drafts without teaching an explicit essay-planning strategy.',
        'Handing Tessa a graphic organizer worksheet and expecting independent use without modeling, guided practice, and mnemonic memorization.',
        'Lowering the writing expectation to one-sentence fill-in-the-blank sheets instead of building Grade 6 persuasive structure from her oral debate strengths.',
        'Measuring success only by quiet compliance rather than tracking essay elements, counterarguments, word count, and generalization to social studies.',
      ],
      sampleOutline: [
        'Reciprocity analysis: Tessa\'s 86% seat time with stagnant 20-word drafts proves compliance contingencies cannot solve a skill-based writing deficit; avoidance returns whenever essay length rises.',
        'SRSD instructional plan: Teach POW+TREE through the six SRSD stages, beginning with oral debate-to-organizer bridges and explicit teacher think-alouds that model coping self-statements ("I can list two reasons first").',
        'Self-monitoring & reinforcement: Replace passive seat tokens with a student checklist and bar graph tracking completed TREE elements, counterarguments, and calm help-seeking paired with behavior-specific praise.',
        'Generalization & progress rules: Fade graphic prompts as Tessa hits 4 of 5 essay elements across 3 consecutive probes, then transfer the POW+TREE routine to Grade 6 social studies claims.',
      ],
      references: [
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/31',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5372.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ebd5372-workshop-05',
      taskType: 'ED eligibility vs. social maladjustment & MDR basis of knowledge',
      title: 'Apply IDEA Emotional Disturbance Criteria and Basis-of-Knowledge Discipline Protections',
      prompt:
        'Resolve a high school eligibility and discipline dispute involving a ninth-grade student with chronic internalizing distress, recent truancy, and a proposed 12-day suspension while evaluation is pending.',
      stimulus:
        'Darius (Grade 9) has a 14-month record of persistent sadness, nurse visits for somatic headaches, peer withdrawal, and a GPA drop from 3.1 to 1.4. Last month his mother emailed the principal requesting an IDEA evaluation after two truancy citations and teacher referral logs. Before testing finished, Darius shoved a peer who mocked his family; a dean labels him "socially maladjusted" and proposes a 12-day suspension without an MDR.',
      estimatedMinutes: 15,
      taskParts: [
        'Distinguish IDEA Emotional Disturbance eligibility criteria from the social maladjustment exclusion using Darius\'s 14-month longitudinal data, explaining why truancy or a fight does not disqualify a student who also meets ED criteria.',
        'Analyze why the school has a "basis of knowledge" under IDEA discipline regulations (34 CFR 300.534 / 300.530) despite Darius not yet having a finalized IEP, and identify the immediate procedural protections triggered.',
        'Outline the required next steps for completing a nondiscriminatory multidisciplinary evaluation, conducting the MDR, and coordinating interim educational and mental-health supports.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Weigh the 14-month internalizing and academic trajectory (persistent sadness, somatic headaches, withdrawal, 3.1 to 1.4 GPA drop) alongside the mother\'s written evaluation email and teacher referral logs.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply federal Emotional Disturbance criteria (long period, marked degree, adverse educational effect, pervasive unhappiness/depression and physical symptoms/fears), the social maladjustment rule, and basis-of-knowledge MDR protections.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Halt the unilateral 12-day removal without MDR, expedite the multidisciplinary evaluation, convene an MDR within 10 school days, and launch school counseling plus academic recovery supports.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Deliver Procedural Safeguards Notice immediately, guard against subjective bias in labeling externalizing anger as mere delinquency, and guarantee FAPE continuity if removal exceeds 10 days.',
        },
      ],
      successCriteria: [
        'Accurately explains that IDEA excludes students who are socially maladjusted ONLY if they do not also meet Emotional Disturbance criteria—Darius\'s 14-month sadness, somatic symptoms, withdrawal, and GPA decline directly align with ED indicators.',
        'Identifies that the mother\'s written evaluation request and documented teacher concerns establish IDEA "basis of knowledge," entitling Darius to full 34 CFR 300.530 MDR and change-of-placement protections.',
        'Rejects the dean\'s unilateral 12-day suspension without MDR and notes the requirement for an expedited evaluation if requested during disciplinary action.',
        'Recommends multimethod, culturally responsive evaluation (clinical/school interviews, multi-informant rating scales, observations, attendance/health records) paired with supportive trauma-sensitive interventions.',
      ],
      commonPitfalls: [
        'Accepting the dean\'s claim that two truancy citations and a hallway shove prove social maladjustment and automatically bar Emotional Disturbance eligibility.',
        'Concluding Darius has zero IDEA discipline protections simply because his initial eligibility meeting has not happened yet.',
        'Determining ED eligibility prematurely from a single checklist before completing a full multidisciplinary evaluation.',
        'Overlooking somatic complaints and internalizing depression because the disciplinary incident involved a brief externalizing shove.',
      ],
      sampleOutline: [
        'ED vs. social maladjustment: IDEA excludes social maladjustment only absent Emotional Disturbance; Darius\'s 14-month depression, somatic headaches, withdrawal, and 3.1-to-1.4 GPA decline demonstrate chronic, marked adverse educational impact across multiple ED criteria.',
        'Basis-of-knowledge safeguard: The mother\'s written evaluation request and staff referral logs establish district basis of knowledge, triggering full 34 CFR 300.530 protections against a 12-day suspension without an MDR.',
        'Compliance sequence: Immediately issue Procedural Safeguards Notice, block unilateral removal beyond 10 days without a 10-school-day MDR, and complete an expedited multidisciplinary evaluation.',
        'Supportive programming: Pair school-based mental health check-ins, safety planning around peer taunting, and targeted Grade 9 credit-recovery scaffolds with ongoing family collaboration.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/e/300.530',
        'https://praxis.ets.org/test/special-education-teaching-students-with-behavioral-disorders-and-emotional-disturbances-5372.html',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ebd5372-workshop-06',
      taskType: 'Wraparound interagency & family-centered re-entry',
      title: 'Coordinate a Strengths-Based Wraparound Re-Entry Plan Across Home, School, and Clinic',
      prompt:
        'Design a culturally responsive, legally compliant wraparound transition plan for an eighth-grade student with EBD returning from inpatient psychiatric stabilization amid fragmented agency communication.',
      stimulus:
        'Chloe (Grade 8, EBD) returns Monday after 3 weeks of inpatient psychiatric stabilization. Her grandmother (legal guardian) works two hourly shifts and avoids school meetings after blame-focused calls. Chloe sees an outpatient therapist, a psychiatrist adjusting morning medication causing first-period drowsiness, and a diversion caseworker, yet no releases exist and staff lack a CICO or makeup-work plan.',
      estimatedMinutes: 15,
      taskParts: [
        'Establish a legally compliant information-sharing and scheduling structure that respects FERPA/HIPAA signed releases, protects guardian confidentiality, and eliminates participation barriers for Chloe\'s grandmother.',
        'Design a strengths-based wraparound re-entry plan connecting school Check-In/Check-Out (CICO), first-period medication-fatigue accommodations, phased academic catch-up, and shared early-warning safety cues.',
        'Define clear interagency roles, generalization routines across home and school, and objective 30-day review metrics that monitor attendance, emotional safety, and caregiver trust.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Address every fragmentation point: 3-week psychiatric return, guardian\'s two hourly jobs and prior negative meetings, morning medication drowsiness, absent releases, and missing school CICO/makeup plan.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply wraparound family-voice and natural-support principles, FERPA and HIPAA reciprocal written-consent rules, IEP team re-entry review duties, and Tier 2/3 behavioral support fidelity.',
        },
        {
          label: 'Intervention plan',
          guidance:
            'Offer flexible phone/evening planning with the grandmother, secure targeted two-way releases, launch soft-landing CICO with a trusted adult, adjust first-period demands, and align crisis triggers with the therapist.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Limit shared data to need-to-know educational/safety goals, ensure Chloe helps choose her trusted adult and coping tools, and review attendance, CICO points, and family feedback at Days 10 and 30.',
        },
      ],
      successCriteria: [
        'Requires specific, informed written releases of information from Chloe\'s legal guardian (grandmother) before exchanging educational (FERPA) or clinical (HIPAA) records with outside providers.',
        'Removes caregiver barriers through flexible meeting formats, strengths-first communication, and genuine shared decision-making rather than deficit-based reporting.',
        'Addresses concrete re-entry needs directly: first-period medication drowsiness adjustments, prioritized essential makeup work instead of a punitive pileup, trusted-adult CICO, and aligned crisis safety steps.',
        'Centers Chloe\'s own voice in selecting coping signals and tracks measurable 30-day re-entry indicators (attendance, CICO stability, safe pass use, and caregiver communication satisfaction).',
      ],
      commonPitfalls: [
        'Calling Chloe\'s outpatient therapist or psychiatrist to exchange behavioral details before obtaining signed written guardian releases.',
        'Scheduling an inflexible mid-morning school meeting and documenting the grandmother as "uncooperative" when her hourly shifts prevent attendance.',
        'Overwhelming Chloe on Day 1 with 3 weeks of unprioritized makeup worksheets or penalizing first-period drowsiness as defiance.',
        'Sharing sensitive psychiatric hospitalization details broadly with all building staff instead of restricting need-to-know safety plans to designated IEP implementers.',
      ],
      sampleOutline: [
        'Family-centered engagement & privacy: Contact Chloe\'s grandmother with a strengths-based welcome, offer flexible early-morning/video/phone scheduling, and obtain targeted written FERPA/HIPAA releases before coordinating with her therapist, psychiatrist, and caseworker.',
        'School re-entry scaffolding: Convene an IEP review to add a trusted-adult CICO routine, non-punitive first-period movement/check-in accommodations for medication fatigue, and a trimmed essential-standards makeup schedule.',
        'Interagency alignment: Map one shared crisis/early-warning protocol with the outpatient clinician and Chloe so school staff recognize calming cues and know exact escalation contacts without over-sharing confidential clinical history.',
        'Outcome & trust review: Track daily attendance, CICO regulation scores, safe-pass usage, and brief weekly positive guardian check-ins, reconvening the wraparound team at Days 10 and 30.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/e/300.530',
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/31',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
  ],
};

module.exports = {
  special_education_5355,
  special_education_behavior_emotional_5372,
};
