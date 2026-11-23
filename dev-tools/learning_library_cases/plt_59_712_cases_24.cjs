'use strict';

const APPLIED_CLASSROOM_CASE_LABELS = {
  schemaVersion: 1,
  label: 'Applied classroom case',
  presentationLabel: 'Classroom scenario',
  answerLabel: 'Best pedagogical decision',
  explanationLabel: 'Evidence-based rationale'
};

const plt_5_9_5623 = {
  'plt5623-ch-01-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Coaching Sixth-Grade Reciprocal Teaching and Self-Efficacy',
    clinicalDescription:
      'During a sixth-grade informational science reading unit, several students transitioning toward abstract reasoning freeze after one dense paragraph, close their books, and tell peers they are "just bad at science." They rarely check whether a section made sense or choose a repair strategy before giving up.',
    diagnosis:
      'Model reciprocal teaching roles through cognitive apprenticeship, provide a metacognitive self-monitoring checklist, and praise controllable strategy use.',
    explanation:
      'Explicitly modeling predicting, questioning, clarifying, and summarizing equips early adolescents to regulate comprehension and build Bandura mastery self-efficacy. Indefinitely replacing grade-level texts with simplified handouts or offering fixed-ability praise reinforces helplessness instead of transferable metacognition.'
  },
  'plt5623-ch-02-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Supporting Early Adolescent Identity and Perspective Taking',
    clinicalDescription:
      'In a seventh-grade advisory and literature circle exploring a civic dilemma, status-conscious students snicker at a peer\'s viewpoint. Quieter adolescents immediately withdraw from discussion to avoid embarrassment, even though their written reflections show thoughtful moral reasoning and genuine empathy.',
    diagnosis:
      'Co-construct respectful advisory norms, use structured perspective-taking protocols with written prep, and affirm competence privately.',
    explanation:
      'Early adolescent identity exploration heightens peer sensitivity alongside emerging moral reasoning, so predictable norms and low-risk rehearsal protect belonging while inviting diverse viewpoints. Public cold-calling or scolding the class for immaturity amplifies self-consciousness and shuts down authentic perspective taking.'
  },
  'plt5623-ch-03-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Sustaining Grade-Level Inquiry for Middle-Level English Learners',
    clinicalDescription:
      'In eighth-grade U.S. history, three intermediate-proficiency English learners interpret primary-source political cartoons insightfully in bilingual partner talk, yet hesitate to draft formal arguments. A colleague recommends excusing them from the essay task and assigning a simplified vocabulary matching sheet instead.',
    diagnosis:
      'Keep grade-level inquiry intact by pairing explicit language objectives with graphic organizers, argument frames, and structured peer rehearsal.',
    explanation:
      'Integrating explicit language objectives and visual scaffolds preserves rigorous historical thinking while ensuring meaningful grade-level access for multilingual learners. Substituting low-level matching worksheets conflates English proficiency with cognitive capability and deprives students of disciplinary growth.'
  },
  'plt5623-ch-04-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Addressing Task-Escape Behavior Through Replacement Skills',
    clinicalDescription:
      'Every time sixth-grade math shifts to multi-step independent word problems, a student with a 504 plan for ADHD cracks jokes, draws laughter, and gets sent to the hallway, missing the assignment entirely. Three weeks of repeated office referrals have doubled the disruption rate without improving work completion.',
    diagnosis:
      'Analyze antecedent triggers and escape consequences, chunk problems with brief check-ins, and explicitly teach a discreet break-card replacement skill.',
    explanation:
      'Viewing behavior as observable and contextual reveals that hallway removal inadvertently reinforces escape from overwhelming independent tasks. Proactive antecedent scaffolds, restorative climate check-ins, and a teachable replacement behavior build self-regulation where punitive exclusion only escalates avoidance.'
  },
  'plt5623-ch-05-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Using Backward Design on a Seventh-Grade Interdisciplinary Team',
    clinicalDescription:
      'A seventh-grade middle-level team across science, math, and ELA plans an interdisciplinary watershed unit. During the first planning meeting, teachers enthusiastically schedule a river diorama contest and poster fair before agreeing on shared standards, essential questions, or common mastery criteria.',
    diagnosis:
      'Lead backward planning by aligning shared standards across disciplines first, designing an authentic evidence task, and sequencing lessons toward it.',
    explanation:
      'Backward design ensures interdisciplinary teaming centers on coherent, standards-aligned understandings and observable transfer rather than disconnected thematic crafts. Picking engaging activities before defining acceptable evidence creates coverage gaps and leaves students unsure what disciplinary concepts actually matter.'
  },
  'plt5623-ch-06-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Replacing Static Ability Groups with Accountable Cooperation',
    clinicalDescription:
      'In eighth-grade physical science labs, permanent "high, middle, and low" tables have led one high-achieving student to run every calculation while teammates copy results. Meanwhile, a gifted learner eager for varied inquiry partners says she feels stuck doing the exact same clerical work for her group each week.',
    diagnosis:
      'Move to data-informed flexible grouping with defined cooperative roles, positive interdependence, and individual mastery accountability checks.',
    explanation:
      'Flexible grouping responsive to formative data avoids fixed tracking labels while stretching both gifted and developing learners. Pairing structured cooperative roles with individual exit checks prevents free-riding and verifies that every middle-level student builds independent conceptual understanding.'
  },
  'plt5623-ch-07-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Clarifying Fifth-Grade Fraction Explanations with Universal Checks',
    clinicalDescription:
      'After a fifteen-minute verbal explanation of adding unlike fractions, a fifth-grade teacher asks, "Does everyone get this?" Seeing four students nod, the teacher assigns twenty practice problems, only to find half the class added numerators and denominators straight across without finding common units.',
    diagnosis:
      'Reteach using visual fraction bars alongside symbolic steps, and run an all-student whiteboard check for understanding before independent practice.',
    explanation:
      'Linking concrete visual representations to concise verbal explanations bridges emerging formal-operational thinking, while universal response checks expose misconceptions before errors are rehearsed. Relying on "Does everyone get this?" samples only confident volunteers and conceals widespread confusion.'
  },
  'plt5623-ch-08-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Transforming Middle-Level Writing with Analytic Rubrics',
    clinicalDescription:
      'Seventh graders receive only letter grades and brief notes like "needs stronger flow" on argumentative essays, and peer editing sessions devolve into correcting spelling while missing unsupported claims. Drafts accumulate in classroom folders without students tracking growth across revisions.',
    diagnosis:
      'Share a standards-based analytic rubric with anchor exemplars, model criteria-focused peer checklists, and structure reflective growth portfolios.',
    explanation:
      'Analytic rubrics make standards-based grading criteria transparent, while guided peer checklists and portfolio reflections train students to evaluate claim-evidence quality. Holistic grades without explicit descriptors keep expectations opaque and trap revision at superficial proofreading.'
  },
  'plt5623-ch-09-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Interpreting Standardized Scores and Skewed Data for Families',
    clinicalDescription:
      'At a sixth-grade family conference, a caregiver sees a reading score of 8.2 grade equivalent and 84th percentile rank and requests immediate placement in eighth-grade ELA. Separately, the class\'s quiz mean dropped twelve points because two absent students still have temporary zeros entered.',
    diagnosis:
      'Explain norm-referenced percentiles and grade-equivalent limits clearly, report median and score spread, and use multiple measures to plan enrichment.',
    explanation:
      'A grade equivalent of 8.2 estimates how an eighth grader would perform on sixth-grade items, not mastery of eighth-grade curriculum, and percentiles rank peers rather than percent correct. Reporting the median alongside multiple classroom artifacts prevents outlier zeros from distorting family communication.'
  },
  'plt5623-ch-10-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Conducting Disciplined Action Research on Algebra Warmups',
    clinicalDescription:
      'Concerned by high error rates on multi-step equations, a ninth-grade algebra teacher pilots a six-week action research cycle using worked-example warmups across two classes. The teacher logs daily implementation notes and exit-ticket errors, though scheduling prevents a randomized control group.',
    diagnosis:
      'Analyze pre-post error patterns systematically, document implementation fidelity and local limitations, and refine the warmup routine iteratively.',
    explanation:
      'Structured classroom action research turns local student evidence into practical instructional improvement while staying honest about small-sample and non-randomized limitations. Overclaiming universal proof from one local cycle or abandoning systematic data for intuition undermines reflective practice.'
  },
  'plt5623-ch-11-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Coordinating Paraeducator Support to Foster IEP Independence',
    clinicalDescription:
      'In an inclusive sixth-grade social studies room, a paraeducator sits beside one student with an IEP every period, whispers answers during quizzes, and receives lesson materials only as class starts. Classmates rarely partner with the student because adult hovering signals separate expectations.',
    diagnosis:
      'Share weekly plans and IEP accommodations early, coach the paraeducator on fading prompts, and align support roles with the special educator.',
    explanation:
      'Proactive, role-aware coordination ensures paraeducators work under teacher direction to deliver legal accommodations while encouraging peer interaction and independent skill use. Handing over materials at the bell or allowing answer-feeding fosters prompt dependence and undermines inclusive access.'
  },
  'plt5623-ch-12-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Enforcing Lab Emergency Protocols and FERPA Privacy Boundaries',
    clinicalDescription:
      'During a seventh-grade science lab, a student gets a minor chemical splash on a forearm while a classmate pulls out a phone to film the incident. Later that afternoon, a colleague who does not teach the student emails asking for the injured student\'s medical health plan to discuss in the lounge.',
    diagnosis:
      'Execute the school\'s verified lab emergency site plan immediately, protect medical privacy under FERPA, and follow district incident-reporting policy.',
    explanation:
      'Immediate adherence to established site safety procedures protects physical well-being first, while restricting confidential health records strictly to officials with legitimate educational interest upholds FERPA. Improvising unverified responses or sharing student medical details casually violates legal and ethical duties.'
  }
};

const plt_7_12_5624 = {
  'plt5624-ch-01-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Retraining Study Strategies and Attribution in Tenth-Grade Chemistry',
    clinicalDescription:
      'Tenth-grade chemistry students spend hours highlighting and rereading notes before tests, yet still struggle on multi-step stoichiometry problems. Discouraged adolescents conclude they lack innate science talent, abandon homework, and show plummeting expectancy-value motivation mid-semester.',
    diagnosis:
      'Explicitly teach retrieval practice, exam-wrapper error analysis, and executive study planning to reframe setbacks around controllable strategies.',
    explanation:
      'Replacing passive rereading with active retrieval and metacognitive calibration strengthens self-regulation, accurate self-monitoring, and academic self-efficacy. Leaving fixed-ability attributions unchallenged erodes expectancy for success, whereas strategy attribution feedback restores persistent effort.'
  },
  'plt5624-ch-02-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Structuring Equitable Moral Inquiry in High School Civics',
    clinicalDescription:
      'During an eleventh-grade civics seminar on digital surveillance and constitutional rights, three vocal students reduce complex legal tensions to partisan slogans. Peers with nuanced ethical reasoning stay silent to avoid social backlash, stalling perspective taking and reflective dialogue.',
    diagnosis:
      'Establish evidence-based Socratic seminar protocols with rotating viewpoints, written prep, and equitable discourse norms rewarding reasoned inquiry.',
    explanation:
      'Secondary students advance principled moral reasoning and perspective taking when structured academic dialogue requires weighing competing claims with textual evidence in a psychologically safe room. Unstructured debate rewards social dominance and peer conformity rather than civic competence.'
  },
  'plt5624-ch-03-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Integrating Disciplinary Literacy for Secondary English Learners',
    clinicalDescription:
      'In ninth-grade biology, multilingual learners accurately model cellular respiration using lab diagrams yet lose substantial points on written lab conclusions due to dense academic syntax. A colleague suggests waiving all lab writing requirements for them so they can pass the course without stress.',
    diagnosis:
      'Embed disciplinary language objectives, bilingual glossaries, UDL sentence frames, and modeled lab-report structures inside grade-level biology.',
    explanation:
      'Pairing rigorous scientific inquiry with explicit disciplinary literacy scaffolds upholds meaningful access and prepares English learners for postsecondary writing demands. Waiving writing expectations lowers academic rigor, limits college and career readiness, and fails to develop essential language skills.'
  },
  'plt5624-ch-04-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'De-Escalating Secondary Task Avoidance Without Power Struggles',
    clinicalDescription:
      'In tenth-grade geometry, a student repeatedly scrolls on his phone and delivers sarcastic remarks right when complex geometric proofs are distributed. Public reprimands trigger heated power struggles that draw peer laughter and derail instruction for ten minutes every second period.',
    diagnosis:
      'Avoid public confrontations, track antecedent-consequence patterns, provide a starter proof scaffold, and privately coach a help-seeking routine.',
    explanation:
      'Functional behavior thinking distinguishes skill-gap avoidance reinforced by peer attention from mere defiance. Lowering initial antecedent barriers and teaching a face-saving replacement behavior protects adolescent dignity and restores equitable classroom engagement far better than escalating public reprimands.'
  },
  'plt5624-ch-05-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Anchoring High School Interdisciplinary PBL in Backward Planning',
    clinicalDescription:
      'An eleventh-grade economics and environmental science team designs a project-based unit proposing local transit reforms. Teachers begin by drafting an open-ended slide deck showcase before aligning dual-course standards, individual research milestones, or postsecondary-ready evaluation criteria.',
    diagnosis:
      'Plan the interdisciplinary PBL unit backward from shared course standards, authentic evidence criteria, and scaffolded research checkpoints.',
    explanation:
      'Backward design ensures secondary PBL builds transferable disciplinary knowledge and executive planning rather than turning into superficial slide decoration. Sequencing checkpoints directly from aligned standards prevents last-minute cramming and verifies each student\'s individual mastery.'
  },
  'plt5624-ch-06-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Using Spaced Interleaved Practice to Unlock Physics Transfer',
    clinicalDescription:
      'Twelfth-grade physics students solve kinematics worksheets accurately during blocked single-topic drills, yet freeze on cumulative unit exams when kinematics, Newton\'s laws, and energy conservation problems appear mixed together without chapter labels telling them which formula to pick.',
    diagnosis:
      'Replace massed blocked drills with spaced, interleaved retrieval practice, faded worked examples, and explicit cues for selecting problem schemas.',
    explanation:
      'Cognitive load and memory research show that massed single-topic practice fosters an illusion of mastery, whereas spacing and interleaving train students to discriminate among competing principles. Gradually fading scaffolds across varied problem contexts drives durable far transfer.'
  },
  'plt5624-ch-07-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Connecting Multiple Representations in Ninth-Grade Algebra Checks',
    clinicalDescription:
      'While teaching linear versus exponential growth in ninth-grade algebra, a teacher speeds through symbolic formulas verbally and calls solely on three eager front-row students. Independent exit slips reveal that most of the class still confuses constant growth ratios with constant additive differences.',
    diagnosis:
      'Link tables, graphs, and equations in clear chunked explanations, and use equitable all-student response checks to guide immediate reteaching.',
    explanation:
      'Coordinating multiple representations lowers extraneous cognitive load during abstract secondary math instruction, while universal checks uncover misconceptions across every learner before practice begins. Calling only on fast volunteers perpetuates inequitable discourse and conceals gaps until exams.'
  },
  'plt5624-ch-08-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Calibrating Senior Research Portfolios and Peer Assessment',
    clinicalDescription:
      'In eleventh-grade English, students assemble college-readiness research portfolios, yet two teachers grading the same benchmark essays assign scores differing by two full letter grades. Meanwhile, students treat peer workshops as brief compliment swaps without critiquing thesis rigor or evidence.',
    diagnosis:
      'Calibrate a shared analytic rubric using anchor papers across teachers, and require criteria-referenced peer feedback plus evidence-backed self-reflection.',
    explanation:
      'Joint rubric calibration strengthens inter-rater reliability and fairness, while structured peer and self-assessment cultivate independent evaluative judgment needed for postsecondary writing. Uncalibrated scoring introduces construct-irrelevant bias and turns portfolios into unexamined file folders.'
  },
  'plt5624-ch-09-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Auditing Benchmark Bias and Bimodal Distributions in History',
    clinicalDescription:
      'A tenth-grade world history team reviews common benchmark data where an unfamiliar cricket idiom embedded in a document prompt depressed scores for newcomer students. Simultaneously, a sharp bimodal score split makes the class mean of 76 percent look deceptively healthy on summary reports.',
    diagnosis:
      'Report median and score variation alongside item-level bias review, revise construct-irrelevant wording, and triangulate multiple valid measures.',
    explanation:
      'Inspecting median and dispersion prevents bimodal or skewed distributions from masking struggling subgroups, while removing culturally biased item wording protects construct validity. Relying on a single mean or misreading norm-referenced percentiles leads to flawed intervention and tracking decisions.'
  },
  'plt5624-ch-10-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Strengthening Departmental PLC Action Research Fidelity',
    clinicalDescription:
      'A high school social studies PLC notices weak primary-source corroboration across tenth-grade classes and pilots a shared sourcing protocol. Half the teachers skip the reflection step, yet the team compares grades from unaligned teacher-made quizzes and declares the intervention proven.',
    diagnosis:
      'Align PLC implementation norms and common formative prompts, examine pre-post evidence together, and explicitly weigh sample and fidelity limitations.',
    explanation:
      'Rigorous local action research depends on consistent implementation, aligned common assessments, and candid examination of confounding variables before scaling practices. Comparing mismatched quizzes across uneven delivery invalidates findings and stalls meaningful instructional improvement.'
  },
  'plt5624-ch-11-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Unifying Secondary Transition and UDL Support Across Specialists',
    clinicalDescription:
      'An eleventh-grade student with a learning disability and postsecondary college transition goals struggles in general-education chemistry. Currently, the transition specialist, school counselor, paraeducator, and classroom teacher each give conflicting guidance on assistive software and lab deadlines.',
    diagnosis:
      'Coordinate role-clear planning with the specialist, counselor, paraeducator, student, and family to unify UDL accommodations and self-advocacy goals.',
    explanation:
      'Effective secondary transition relies on coordinated, role-aware collaboration that aligns IEP accommodations, UDL tools, and student-led self-advocacy across settings. Siloed or contradictory messaging confuses adolescents and undermines legal and instructional support for postsecondary independence.'
  },
  'plt5624-ch-12-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Upholding Crisis Reporting, Copyright Limits, and Site Policy',
    clinicalDescription:
      'Before a high school robotics tournament, a coach uploads a full copyrighted commercial manual onto a public team drive. That same afternoon, a student discloses active self-harm ideation to the teacher and begs them to keep the conversation completely confidential.',
    diagnosis:
      'Follow mandatory reporting and suicide-safety site protocols immediately, remove full-text infringing copies under fair use, and verify local policy.',
    explanation:
      'Immediate student safety and legally mandated reporting override promises of confidentiality, requiring prompt activation of verified school emergency procedures. Simultaneously, copying an entire commercial work exceeds educational fair use, and jurisdictional verification keeps practice legally sound.'
  }
};

module.exports = {
  plt_5_9_5623,
  plt_7_12_5624
};
