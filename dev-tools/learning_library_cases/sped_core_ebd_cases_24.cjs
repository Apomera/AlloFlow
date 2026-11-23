'use strict';

const SPED_CASE_LABELS = {
  schemaVersion: 1,
  label: 'Applied SPED case',
  presentationLabel: 'Case scenario',
  answerLabel: 'Best professional decision',
  explanationLabel: 'Evidence-based rationale'
};

const special_education_5355 = {
  'sp5355-ch-01-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Aligning Functional Math With Age-Respectful Strengths',
    clinicalDescription:
      'A 15-year-old ninth grader with moderate intellectual disability excels at visual inventory sorting and wants to work in the school cafe, yet her team assigns preschool cartoon coin worksheets. She disengages during desk drills and fails to generalize counting skills during actual lunch purchases.',
    diagnosis:
      'Replace juvenile worksheets with age-respectful campus cafe budgeting, digital checkout tools, and community generalization routines.',
    explanation:
      'Strengths-based, chronological-age-respectful instruction preserves adolescent dignity while pairing authentic learner interests with systematic generalization across real environments. Infantilizing materials erode motivation and violate core CEC expectations without teaching transferable functional skills.'
  },
  'sp5355-ch-02-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Supporting Co-Occurring Intellectual, Adaptive, and ADHD Needs',
    clinicalDescription:
      'A fourth grader with mild intellectual disability and co-occurring ADHD decodes at a second-grade level, struggles to sequence locker and schedule transitions, and loses focus during 30-minute silent math blocks. Several staff suggest a self-contained placement based solely on his eligibility category.',
    diagnosis:
      'Keep the student in general education with chunked SDI, visual adaptive routines, executive scaffolds, and structured movement breaks.',
    explanation:
      'IDEA mandates individualized services driven by present levels across academic, adaptive, and attention needs rather than placement stereotypes tied to a disability label. Addressing co-occurring executive and adaptive demands inside the LRE builds independence without unnecessary segregation.'
  },
  'sp5355-ch-03-section-03': {
    ...SPED_CASE_LABELS,
    title: 'Ensuring Seizure Safety Through Lawful IHP Delegation',
    clinicalDescription:
      'A sixth grader with tonic-clonic epilepsy and an Individualized Healthcare Plan joins a general education science lab and an overnight nature trip. An untrained paraprofessional volunteers to carry and administer emergency rescue medication, while a colleague suggests excusing the student from the trip.',
    diagnosis:
      'Coordinate with the school nurse to follow the IHP, verify lawful staff delegation and emergency training, and ensure full safe participation.',
    explanation:
      'Health-related emergency procedures require school nurse oversight, documented training, and state-compliant delegation rather than informal staff volunteering. Excluding a student from labs or field trips because of a manageable health condition denies FAPE and violates LRE and Section 504 access rights.'
  },
  'sp5355-ch-04-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Building Measurable Postsecondary Transition Goals From Data',
    clinicalDescription:
      'At an annual IEP meeting for a 16-year-old tenth grader with a specific learning disability in reading and writing, the draft transition page states only that he will "get a good job after graduation." No interest inventories, vocational probes, or student interviews were completed prior to the meeting.',
    diagnosis:
      'Conduct age-appropriate transition assessments with the student and family to craft measurable postsecondary goals and aligned IEP services.',
    explanation:
      'Under IDEA, secondary transition plans starting by age 16 must rest on age-appropriate transition assessments and specify measurable postsecondary goals in education or training, employment, and independent living as needed. Vague, adult-written placeholders fail to align annual goals with real outcomes.'
  },
  'sp5355-ch-05-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Pairing Access Accommodations With Targeted Decoding SDI',
    clinicalDescription:
      'A fifth grader with SLD reads grade-level science passages aloud at 84% accuracy, omitting multisyllabic suffixes and confusing vowel teams, yet answers 88% of comprehension questions when text is read aloud. A colleague recommends replacing grade-level science standards with second-grade summaries.',
    diagnosis:
      'Provide text-to-speech accommodations for grade-level science while delivering explicit SDI in multisyllabic decoding and self-monitoring.',
    explanation:
      'Accommodations remove decoding barriers without lowering grade-level rigor, whereas curriculum modifications alter expectations and should not replace access supports when listening comprehension is strong. Pairing assistive access with error-informed decoding and metacognitive SDI accelerates independence.'
  },
  'sp5355-ch-06-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Restoring BIP Implementation Fidelity Before Changing Placement',
    clinicalDescription:
      'A seventh grader with an escape-maintained BIP increases from one to six office referrals weekly after a midyear co-teaching schedule shift. Fidelity logs reveal adults omit his proactive precorrection and scheduled break card 70% of the time and issue loud public warnings during early agitation.',
    diagnosis:
      'Retrain all staff to restore BIP implementation fidelity, apply calm private de-escalation at early warning signs, and review safety triggers.',
    explanation:
      'Intervention outcomes cannot be judged valid when core proactive components are implemented inconsistently. Restoring treatment fidelity and neutral de-escalation respects the student\'s safety plan and prevents escalating placement restrictions driven by adult execution gaps rather than learner nonresponse.'
  },
  'sp5355-ch-07-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Combining Norm-Referenced Scores With Criterion Probes',
    clinicalDescription:
      'An IEP team reviews a third grader whose norm-referenced reading composite sits at a standard score of 76 (5th percentile) alongside teacher notes calling him "unmotivated" during literacy centers. The team struggles to translate these results into measurable PLAAFP baselines and annual goals.',
    diagnosis:
      'Supplement norm-referenced standing with criterion-referenced skill probes and operationally defined observations to set PLAAFP baselines.',
    explanation:
      'Norm-referenced tests compare relative peer standing for eligibility but do not pinpoint exact instructional mastery gaps, while vague labels like "unmotivated" lack objective measurement. Pairing criterion-referenced probes with operationally defined observations yields actionable, measurable IEP goals.'
  },
  'sp5355-ch-08-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Preventing RTI Delays After a Written Parent Evaluation Request',
    clinicalDescription:
      'Parents of a second-grade multilingual learner submit a signed written request for an initial IDEA evaluation due to persistent decoding delays and daily elopement during writing. Because the student has received only four weeks of Tier 2 RTI support, the principal asks to wait 12 weeks for Tier 3 data.',
    diagnosis:
      'Issue Prior Written Notice, obtain consent, and launch a nondiscriminatory evaluation with FBA and language checks alongside MTSS supports.',
    explanation:
      'Federal IDEA regulations prohibit using RTI or MTSS to delay or deny an initial evaluation once a disability is suspected or parents request testing. Running a timely, culturally and linguistically nondiscriminatory evaluation and FBA concurrently with tiered supports protects both FAPE and parent rights.'
  },
  'sp5355-ch-09-section-03': {
    ...SPED_CASE_LABELS,
    title: 'Using CBM Error Analysis to Shift an Instructional Target',
    clinicalDescription:
      'Five consecutive weekly math CBM probes for a fourth grader with an IEP goal in multi-digit subtraction remain flat below the aimline (8, 9, 8, 9, and 8 digits correct). Fidelity logs confirm 100% dosage, and error analysis shows he consistently subtracts the smaller digit from the larger across columns.',
    diagnosis:
      'Maintain the ambitious IEP goal and adjust SDI to target conceptual regrouping using explicit concrete-representational-abstract modeling.',
    explanation:
      'When implementation fidelity is verified high yet repeated CBM trend lines fall flat below the aimline, data-based individualization requires changing the instructional target or method rather than lowering expectations. Error analysis reveals a systematic regrouping misconception that CRA instruction fixes.'
  },
  'sp5355-ch-10-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Upholding MDR Safeguards and Auditing Discipline Equity',
    clinicalDescription:
      'A middle school equity review shows Black male students with IEPs face suspension at 3.2 times the peer rate. An eighth grader with an IEP reaches his 11th cumulative day of out-of-school suspension this year for hallway defiance, and leadership plans another five-day removal without convening the team.',
    diagnosis:
      'Halt unilateral exclusion, issue PWN, hold a Manifestation Determination Review within 10 school days with FBA review, and audit bias.',
    explanation:
      'Removing a student with an IEP beyond 10 cumulative school days constituting a pattern triggers IDEA disciplinary safeguards, including PWN, an MDR within 10 school days, and FBA or BIP action. Pairing legal compliance with disproportionality audits counters cultural bias in subjective office referrals.'
  },
  'sp5355-ch-11-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Coordinating Co-Teaching, Paraprofessionals, and Related Services',
    clinicalDescription:
      'In a fifth-grade inclusive classroom, a general educator asks the special educator and paraprofessional to pull three students with IEPs to a back table daily while the SLP removes them during core math. Shared data show these students miss 40% of Tier 1 instruction and rarely generalize AAC targets.',
    diagnosis:
      'Implement station or parallel co-teaching, supervise planned paraprofessional fading, and integrate push-in related services via shared data.',
    explanation:
      'Interprofessional collaboration requires shared ownership of all learners, clearly defined educator-supervised paraprofessional roles to prevent prompt dependence, and related-service schedules that protect core access. Using common classroom data helps teams align speech and academic goals inside authentic routines.'
  },
  'sp5355-ch-12-section-03': {
    ...SPED_CASE_LABELS,
    title: 'Executing Mandatory Reporting Without Crossing Role Boundaries',
    clinicalDescription:
      'During morning check-in, a third grader with a speech-language impairment reveals fresh linear bruises on his forearms, whispers that his caregiver struck him with a belt the previous night, and begs the special educator to stay silent. A colleague urges calling the caregiver first to verify the story.',
    diagnosis:
      'File an immediate mandatory report with child protective services per state law and district protocol without questioning the caregiver.',
    explanation:
      'Special educators are legally mandated reporters who must report reasonable suspicion of abuse directly to designated authorities rather than conducting personal investigations or alerting alleged perpetrators. Acting promptly within professional boundaries safeguards child welfare while keeping sensitive facts confidential.'
  }
};

const special_education_behavior_emotional_5372 = {
  'ebd5372-ch-01-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Distinguishing Cultural Discourse Norms From Oppositional Behavior',
    clinicalDescription:
      'A newly enrolled seventh grader experiencing housing instability uses lively overlapping banter common in his home community during group work and looks down when corrected. After three verbal clashes in two weeks, a teacher requests immediate transfer to a self-contained EBD unit for "oppositional defiant disorder."',
    diagnosis:
      'Avoid informal clinical labels, examine cultural and contextual setting events, and teach norms using least-intensive non-coercive supports.',
    explanation:
      'Educators must not diagnose psychiatric disorders or misinterpret culturally grounded discourse and ecological stressors as EBD. Applying preventive, culturally responsive instruction and equitable disciplinary safeguards addresses classroom expectations without coercive escalation or premature restrictive placement.'
  },
  'ebd5372-ch-02-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Balancing Trauma Setting Events, Function, and Clinical Referral',
    clinicalDescription:
      'A ninth grader with Emotional Disturbance and a documented trauma history bolts from English whenever cold-called to read aloud, muttering that he is worthless and disclosing recurring nightmares and passive hopelessness. Staff label his exits "manipulative" and propose public privilege revocation.',
    diagnosis:
      'Use label-free ABC data to address escape triggers privately, eliminate shaming, and make a scope-bound referral for mental health screening.',
    explanation:
      'Trauma history acts as a critical setting event that intensifies perceived threat, yet effective intervention still requires label-free functional analysis of immediate classroom escape triggers. Avoiding public humiliation protects dignity while referring acute internalizing distress to qualified school clinicians.'
  },
  'ebd5372-ch-03-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Protecting LRE Rigor Against Unilateral Removal After Outbursts',
    clinicalDescription:
      'Following two loud verbal outbursts during tenth-grade Algebra, an administrator proposes moving a student with EBD from his co-taught class to an isolated online credit-recovery room with simplified packets. The student holds a 78% quiz average, and the IEP team has not reviewed or revised his BIP.',
    diagnosis:
      'Prevent unilateral placement removal, convene the IEP team to revise data-backed BIP supports in Algebra, and maintain grade-level rigor.',
    explanation:
      'IDEA prohibits unilateral placement changes outside the IEP process and requires exhausting supplementary aids and function-based plan revisions before moving to a more restrictive setting. Preserving high-expectation curriculum equity honors the student\'s academic capability and LRE entitlement.'
  },
  'ebd5372-ch-04-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Eliminating Public Clip Charts to Break Power Struggles',
    clinicalDescription:
      'In a fourth-grade classroom using a wall-mounted red-yellow-green clip chart, a student with EBD escalates from quiet fidgeting to overturning desks every time his clip drops in front of classmates. Each incident ends in a loud verbal power struggle and hallway exclusion lasting 30 minutes.',
    diagnosis:
      'Replace public clip charts with precorrection, behavior-specific praise, private dignity-preserving redirection, and neutral choices.',
    explanation:
      'Public behavior-shaming systems trigger threat responses, peer stigma, and escalating coercive power struggles for students with EBD. Shifting to preventive PBIS routines, high positive-to-corrective ratios, and quiet private redirections maintains instructional inclusion and emotional safety.'
  },
  'ebd5372-ch-05-section-03': {
    ...SPED_CASE_LABELS,
    title: 'Teaching Interoceptive Self-Regulation Before Sensory Overload',
    clinicalDescription:
      'ABC logs for a fifth grader with EBD and auditory sensitivity show jaw clenching, rapid breathing, and pacing five minutes before loud cafeteria transitions and timed math checks, followed by explosive yelling when ordered to sit still. Staff currently wait until shouting starts before intervening.',
    diagnosis:
      'Teach interoceptive early-warning recognition paired with a visual coping menu, scheduled movement breaks, and predictable noise supports.',
    explanation:
      'Waiting until crisis peaks misses the physiological precursor window when self-regulation can actually succeed. Explicitly rehearsing body-cue awareness, structured sensory accommodations, and student-selected coping menus during calm states builds durable emotional regulation and prevents escalation.'
  },
  'ebd5372-ch-06-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Interrupting Academic Escape Cycles While Retaining Rigor',
    clinicalDescription:
      'Direct observations show a sixth grader with EBD and co-occurring reading difficulties tears up his worksheet and curses within three minutes of independent grade-level social studies reading, resulting in hallway removal. Some team members suggest excusing him from grade-level social studies content.',
    diagnosis:
      'Keep grade-level standards while adding chunked reading scaffolds, audio access, DRA for task initiation, and private corrective feedback.',
    explanation:
      'Sending a student to the hallway during frustrating reading tasks negatively reinforces disruptive escape while widening academic gaps. Combining accessible explicit instruction, non-humiliating error feedback, and differential reinforcement for starting work interrupts the escape cycle without lowering expectations.'
  },
  'ebd5372-ch-07-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Preserving Communication Access Through Functional Communication Training',
    clinicalDescription:
      'An eighth grader with EBD and pragmatic language deficits swears at teachers when stuck on multi-step writing prompts. Staff respond by confiscating his speech-to-text tablet as a consequence and demanding silent compliance before he may request help, causing work refusal to triple across classes.',
    diagnosis:
      'Preserve uninterrupted assistive tool access and implement FCT to teach, reinforce, and generalize respectful help and break requests.',
    explanation:
      'Revoking communication or writing accommodations as punishment violates access rights and strips away the very tool that lowers frustration. Functional Communication Training replaces profanity with a socially acceptable, functionally equivalent request reinforced across teachers without coercive demands.'
  },
  'ebd5372-ch-08-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Fading Prompt Dependence With Private Self-Monitoring Logs',
    clinicalDescription:
      'An eleventh grader with EBD stays on task 85% of the period when a paraprofessional sits beside him giving constant verbal prompts, yet drops to 20% and shuts down whenever the adult steps away or deducts points on a front whiteboard for off-task moments.',
    diagnosis:
      'Fade adult proximity systematically using task-analyzed checklists, a private self-monitoring log, and DRO or DRA for independent intervals.',
    explanation:
      'Continuous one-to-one adult prompting breeds prompt dependence and adolescent stigma, while public punitive point loss triggers withdrawal and resentment. Pairing structured task analysis with age-dignified private self-monitoring and differential reinforcement transfers behavioral control to the learner.'
  },
  'ebd5372-ch-09-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Preventing Single-Score Bias in EBD Eligibility Assessment',
    clinicalDescription:
      'A school team considers Emotional Disturbance eligibility for a fifth-grade bilingual student based solely on one teacher rating scale (T-score 74) and informal remarks shared in the staff lounge. Parent ratings fall in the average range, and no direct classroom observations have been completed.',
    diagnosis:
      'Protect confidentiality, reject single-score decisions, and collect triangulated direct observations and culturally valid multi-source data.',
    explanation:
      'IDEA prohibits basing eligibility on any single measure or source and requires nondiscriminatory assessment across settings, informants, and languages. Objective, operationally defined observations mitigate observer bias and ensure team decisions reflect verified cross-context evidence rather than lounge rumors.'
  },
  'ebd5372-ch-10-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Applying the Social Maladjustment Rule With Equity Safeguards',
    clinicalDescription:
      'A ninth grader is referred for Emotional Disturbance eligibility after planned peer-group truancy and off-campus shoplifting. Multi-source evaluation data show grade-level work when present, warm family and peer ties, and no persistent depression, anxiety, or school-based emotional impairment.',
    diagnosis:
      'Do not qualify social maladjustment alone as ED under IDEA; verify multi-source data, run an FBA, and link Tier 2 or community supports.',
    explanation:
      'IDEA explicitly excludes social maladjustment from Emotional Disturbance unless an underlying qualifying ED characteristic also adversely affects educational performance. Grounding eligibility in converging data rather than subjective labels protects against disproportionality while still offering proactive supports.'
  },
  'ebd5372-ch-11-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Stopping Unlawful Seclusion and Enforcing Crisis Safeguards',
    clinicalDescription:
      'After a third grader with EBD sweeps pencils off his desk and yells without threatening harm to himself or others, staff lock him alone in an unmonitored storage closet for 25 minutes. No parent notification or incident report is filed because staff describe the removal as a "cool-down timeout."',
    diagnosis:
      'End unlawful seclusion immediately, enforce restraint and seclusion reporting safeguards, notify parents, and build an FBA-based crisis plan.',
    explanation:
      'Locking a non-dangerous child alone in an unmonitored room constitutes unlawful seclusion and aversive exclusion, violating CEC ethics and safety standards. Restraint or seclusion is restricted strictly to imminent serious physical danger with continuous monitoring, full reporting, debriefing, and BIP revision.'
  },
  'ebd5372-ch-12-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Partnering With Families Through Interpreters and Clear Boundaries',
    clinicalDescription:
      'A Vietnamese-speaking mother of a seventh grader with EBD misses two daytime meetings because of factory shifts. Team members blame "weak home discipline," propose having her tenth-grade nephew translate the IEP meeting, and ask the special educator to recommend lowering the student\'s ADHD medication.',
    diagnosis:
      'Schedule a qualified interpreter at an accessible time, avoid family blame, use wraparound consent for clinicians, and keep medical boundaries.',
    explanation:
      'IDEA requires meaningful parent participation via qualified, impartial interpreters rather than minor relatives, and CEC ethics forbid educators from giving medical dosage advice outside their scope. Strengths-based scheduling and release-backed wraparound coordination with clinicians strengthen student outcomes.'
  }
};

module.exports = {
  special_education_5355,
  special_education_behavior_emotional_5372
};
