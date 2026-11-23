'use strict';

const APPLIED_CLASSROOM_CASE_LABELS = {
  schemaVersion: 1,
  label: 'Applied classroom case',
  presentationLabel: 'Classroom scenario',
  answerLabel: 'Best pedagogical decision',
  explanationLabel: 'Evidence-based rationale'
};

const plt_early_childhood_5621 = {
  'plt5621-ch-01-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Building Math Self-Efficacy and Self-Talk in First Grade',
    clinicalDescription:
      'During two-digit addition with base-ten blocks, several first graders erase their entire paper whenever regrouping stalls and whisper, "I am bad at math." They skip checking their models and wait passively for the teacher to fix errors, showing fragile self-efficacy and limited strategy monitoring.',
    diagnosis:
      'Model think-aloud self-talk with picture strategy checklists, scaffold proximal mastery steps, and give specific effort-and-strategy feedback.',
    explanation:
      'Pairing Vygotsky-aligned private speech prompts with Bandura mastery experiences teaches young learners to monitor steps and attribute growth to controllable strategies. Offering empty praise like "You are so smart" or solving the task for them undermines resilience and independent self-regulation.'
  },
  'plt5621-ch-02-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Aligning Pre-K Routines and Guided Play to Development',
    clinicalDescription:
      'A 40-minute seated phonics worksheet block in a four-year-old Pre-K class triggers tears, fidgeting, and wandering, yet the same children sustain 20 minutes of rich vocabulary and counting during grocery-store dramatic play. A colleague advises extending quiet seatwork to build kindergarten readiness.',
    diagnosis:
      'Embed literacy and counting goals into guided play centers, brief movement transitions, and predictable visual routines suited to young learners.',
    explanation:
      'Early childhood development thrives on active exploration, gross-motor movement, and responsive routines that match emerging executive attention. Forcing prolonged passive seatwork misinterprets readiness and heightens frustration rather than nurturing durable symbolic and social-emotional growth.'
  },
  'plt5621-ch-03-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Ensuring Meaningful Grade-Level Science Access for Young ELs',
    clinicalDescription:
      'Three second-grade Spanish-speaking English learners accurately sequence butterfly life-cycle cards during partner work, yet stay silent during whole-group discussions. To reduce frustration, a classroom volunteer hands them simplified coloring pages while peers write grade-level science observations.',
    diagnosis:
      'Pair grade-level science standards with explicit language objectives, labeled visual anchor charts, sentence frames, and structured partner talk.',
    explanation:
      'Asset-based UDL supports and explicit language scaffolds uphold rigorous grade-level thinking while expanding academic English production. Replacing core science inquiry with coloring worksheets lowers expectations, blocks conceptual growth, and fails to provide meaningful multilingual participation.'
  },
  'plt5621-ch-04-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Redesigning Kindergarten Space and Routines for Self-Management',
    clinicalDescription:
      'Congestion around a cluttered cubby and sink triggers pushing during every kindergarten transition, and a child with sensory sensitivities bolts when the loud cleanup bell rings. Moving clothespins down a public behavior chart has increased crying without reducing transition conflicts.',
    diagnosis:
      'Reorganize room traffic flow with clear center boundaries, add a visual countdown timer and calm-down area, and teach replacement cleanup routines.',
    explanation:
      'Proactive physical design and explicitly practiced self-management routines remove antecedent bottlenecks while teaching functional replacement skills that build autonomy. Public clip charts shame young children and escalate avoidance without addressing environmental triggers or self-regulation needs.'
  },
  'plt5621-ch-05-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Using Preassessment and Vetted Resources in Third-Grade Planning',
    clinicalDescription:
      'Before a standards-based local habitats unit, a quick preassessment shows six third graders already explain food chains accurately while five lack core habitat vocabulary. A free online slide deck features cute clip art, but contains inaccurate species facts and dense, inaccessible paragraphs.',
    diagnosis:
      'Reject inaccurate materials in favor of vetted accessible texts, and use preassessment data to plan targeted vocabulary remediation and inquiry enrichment.',
    explanation:
      'Backward design links clear standards and diagnostic evidence to both rigorous resource evaluation and flexible instructional pathways. Teaching one lockstep track from unvetted cute worksheets leaves foundational misconceptions unaddressed while capping growth for students already showing mastery.'
  },
  'plt5621-ch-06-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Replacing Fixed Ability Tables with Accountable Cooperative Groups',
    clinicalDescription:
      'During a second-grade measurement project in fixed ability groups, one strong writer completes the whole poster while two peers watch off-task, and emerging readers remain assigned to the same low-expectation table all semester with minimal peer interaction or independent transfer.',
    diagnosis:
      'Form flexible, skill-matched cooperative groups with clear student roles, shared interdependence goals, and individual recording sheets.',
    explanation:
      'Structured cooperative learning pairs positive interdependence with individual accountability so every learner practices target skills during gradual release. Flexible grouping prevents the stigma and narrowed expectations of permanent tracking while adapting promptly as mastery shifts.'
  },
  'plt5621-ch-07-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Tightening Explanations and Whole-Class Checks in First Grade',
    clinicalDescription:
      'After a fast verbal explanation of two-digit subtraction, the teacher asks, "Does everyone understand?" and moves on when two front-row volunteers nod. Five minutes into independent work, 14 of 20 first graders subtract the smaller digit from the larger regardless of top or bottom placement.',
    diagnosis:
      'Model subtraction with concrete-to-visual steps, contrasting examples and non-examples, and check every student on mini-whiteboards with wait time.',
    explanation:
      'Clear multimodal explanations paired with all-student checks for understanding expose misconceptions before independent practice cements procedural errors. Asking "Does everyone get it?" samples only eager volunteers and gives false assurance while most learners remain confused.'
  },
  'plt5621-ch-08-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Protecting Construct Validity and IEP Accommodations in Science',
    clinicalDescription:
      'A third-grade unit targets explaining how magnets attract and repel, yet the summative test relies on dense multi-paragraph passages and deducts points for spelling. The teacher considers denying a student his documented IEP read-aloud accommodation out of concern that reading items aloud is unfair.',
    diagnosis:
      'Align items strictly to the science construct, provide the legally required IEP read-aloud accommodation, and give criterion-focused feedback.',
    explanation:
      'Valid assessment isolates the target science standard rather than measuring unrelated decoding or spelling speed, and IDEA mandates implementing documented IEP accommodations to remove construct-irrelevant barriers. Withholding a required accommodation violates federal law and distorts score meaning.'
  },
  'plt5621-ch-09-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Clarifying Percentiles, Grade Equivalents, and Skewed Class Data',
    clinicalDescription:
      'At spring conferences, a second-grade parent thinks a 60th percentile reading rank means a failing 60% score, while another assumes a 4.2 grade-equivalent score warrants skipping straight to fourth-grade math. Meanwhile, two extreme low outliers pull the class mean well below the typical score.',
    diagnosis:
      'Explain percentiles as norm-group standing and grade equivalents as second-grade item performance, and share the class median alongside score spread.',
    explanation:
      'Clear measurement communication prevents misplacement: percentile ranks show relative peer standing rather than percent correct, and grade equivalents do not prove mastery of higher-grade standards. Reporting the median with variation avoids outlier distortion when summarizing skewed class results.'
  },
  'plt5621-ch-10-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Engaging in Job-Embedded Mentor Coaching for Interactive Read-Alouds',
    clinicalDescription:
      'After a one-day workshop on interactive read-alouds, a first-year kindergarten teacher tries one open-ended prompt once, sees noisy blurting, and abandons the strategy. Her mentor offers a four-week observation and co-planning cycle, but the new teacher hesitates because she fears evaluative judgment.',
    diagnosis:
      'Partner in non-evaluative mentor observation cycles centered on one questioning goal, analyze student talk patterns, and refine routines iteratively.',
    explanation:
      'Sustained job-embedded learning through peer observation, modeling, and reflective debriefing reliably shifts classroom practice far more than isolated workshops. Framing mentoring as confidential formative inquiry rather than high-stakes evaluation accelerates early-career instructional growth.'
  },
  'plt5621-ch-11-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Coordinating SLP, Paraeducator, and Family Support in Inclusion Pre-K',
    clinicalDescription:
      'In an inclusive Pre-K room, a paraeducator begins rewriting a child\'s speech targets during play centers without consulting the teacher or speech-language pathologist. Meanwhile, the child\'s parents report hearing conflicting guidance about pull-out sessions and using a core communication board at home.',
    diagnosis:
      'Hold brief weekly alignment huddles with the SLP and paraeducator, clarify instructional versus implementation roles, and send unified family updates.',
    explanation:
      'Coordinated interdisciplinary support keeps goal design within licensed specialist and teacher scope while empowering paraeducators with clear, consistent cueing routines. Shared communication aligns home and school communication supports and strengthens reciprocal family trust under IDEA.'
  },
  'plt5621-ch-12-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Following Site Emergency Plans and Mandated Reporting in First Grade',
    clinicalDescription:
      'During a tornado drill, a substitute aide asks whether to text parents personally from the hallway and leave a child\'s rescue inhaler inside a classroom backpack. Later that afternoon, the first-grade teacher notices unexplained patterned bruising on a student\'s arm and considers questioning the parent first.',
    diagnosis:
      'Follow verified site emergency protocols with student medical kits and rosters, safeguard FERPA privacy, and file a mandated report per state law.',
    explanation:
      'Student safety requires strict adherence to official site emergency procedures, uninterrupted access to life-saving medications, and direct reporting of suspected abuse to designated child-protection authorities. Informal parent investigations or unauthorized personal texts jeopardize safety and breach legal duties.'
  }
};

const plt_k6_5622 = {
  'plt5622-ch-01-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Teaching Metacognitive Problem-Solving Routines in Fifth Grade',
    clinicalDescription:
      'When facing multi-step fraction word problems, several fifth graders copy a neighbor\'s numbers immediately or declare they lack a "math brain" despite solid computation fluency. Work samples reveal students never pause to estimate reasonableness or check whether their equation matches the problem context.',
    diagnosis:
      'Teach a plan-monitor-evaluate metacognitive routine using worked examples, error analysis, and personal goal tracking to strengthen self-efficacy.',
    explanation:
      'Explicit metacognitive modeling paired with Bandura mastery feedback and peer strategy analysis builds self-regulation and transfer to unfamiliar multi-step tasks. Assigning additional timed computation worksheets leaves strategic planning gaps intact and reinforces fixed-ability beliefs.'
  },
  'plt5622-ch-02-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Supporting Competence and Perspective-Taking in Fourth Grade',
    clinicalDescription:
      'During Erikson\'s industry-versus-inferiority period, a formerly enthusiastic fourth grader hides writing drafts and teases peers after noticing slower reading fluency than tablemates. Recess conflicts also flare because several students argue rules are fair only when outcomes favor their team.',
    diagnosis:
      'Protect dignity with private growth-tracked goals, facilitate structured perspective-taking discussions, and co-create classroom fairness norms.',
    explanation:
      'Upper-elementary learners experience heightened peer comparison alongside emerging reciprocity in moral reasoning. Private mastery tracking nurtures healthy competence while guided perspective-taking connects rules to shared community impact, avoiding the shame triggered by public score comparisons.'
  },
  'plt5622-ch-03-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Leveraging L1 Literacy and Academic Scaffolds for a Fifth-Grade EL',
    clinicalDescription:
      'A newly arrived fifth grader with strong prior schooling in Arabic solves decimal operations rapidly on paper, yet is pulled out of core social studies daily for beginner phonics software and excluded from a civic-debate project because her spoken English is still emerging.',
    diagnosis:
      'Keep her in core grade-level inquiry using bilingual glossaries, graphic organizers, paired language objectives, and structured partner rehearsals.',
    explanation:
      'Meaningful grade-level access treats first-language literacy and conceptual mastery as cognitive assets while scaffolding academic English discourse. Pulling a literate newcomer out of core subjects for primary phonics software restricts opportunity to learn and underestimates her intellectual readiness.'
  },
  'plt5622-ch-04-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Proactive Workshop Design and 504 Self-Management in Sixth Grade',
    clinicalDescription:
      'Sixth-grade writing workshop breaks down as students crowd around one device cart, queue at the teacher\'s desk for directions, and drift off-task. A student with a Section 504 plan for ADHD repeatedly disrupts peers to escape long unchunked drafting blocks when expectations feel overwhelming.',
    diagnosis:
      'Distribute supply stations, post visual task checklists, chunk drafting with self-monitoring timers, and embed structured topic choices per the 504 plan.',
    explanation:
      'Proactive physical organization, UDL executive-function supports, and meaningful learner agency directly address the escape function of disruptive behavior while honoring Section 504 accommodations. Withholding recess or issuing repeated public warnings fails to remove environmental and task barriers.'
  },
  'plt5622-ch-05-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Differentiating Ecosystem Remediation and Enrichment from Preassessment',
    clinicalDescription:
      'A preassessment for a fourth-grade ecosystems standard shows eight students already trace energy across producers, consumers, and decomposers, while seven confuse food webs with animal shelters. A colleague recommends assigning extra drill sheets to early finishers and marching the whole class through the textbook.',
    diagnosis:
      'Use preassessment data to run targeted visual-model remediation while offering high-ceiling ecosystem investigations built on vetted science sources.',
    explanation:
      'Standards-aligned backward design pairs diagnostic preassessment with purposeful tiering: remediation repairs foundational schemas while authentic enrichment deepens conceptual inquiry rather than piling on busywork. Lockstep textbook pacing bores advanced learners and leaves core misconceptions unresolved.'
  },
  'plt5622-ch-06-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Structuring Interdependence and Accountability in a Fifth-Grade Jigsaw',
    clinicalDescription:
      'During a fifth-grade social studies jigsaw on regional economies, groups of four receive one blank chart with no defined roles or individual checkpoints. Two vocal students finish the entire display while a quiet peer with a writing IEP contributes little and struggles on the subsequent unit check.',
    diagnosis:
      'Structure expert-and-home jigsaw groups with explicit interdependent roles, accessible note frames, and an individual synthesis check.',
    explanation:
      'Research-backed cooperative learning combines positive interdependence with individual accountability and UDL note scaffolds so every student actively processes disciplinary content. Assigning one shared group score without role structure enables unequal participation and hides individual learning gaps.'
  },
  'plt5622-ch-07-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Connecting a Teachable Moment to Formative Reteaching in Third Grade',
    clinicalDescription:
      'Midway through a third-grade lesson on weather bar graphs, a sudden hailstorm hits outside and students excitedly debate how hail forms. Meanwhile, yesterday\'s exit slips showed 15 of 22 students still misread the graph\'s vertical scale when intervals count by twos instead of ones.',
    diagnosis:
      'Capture live hailstorm observations as a brief inquiry hook, then immediately pivot to reteaching interval scale reading using student-collected data.',
    explanation:
      'Responsive instruction integrates authentic teachable moments into standards-aligned goals while acting promptly on formative monitoring evidence to resolve misconceptions. Ignoring student curiosity forfeits high engagement, whereas abandoning scale-reading instruction leaves a verified skill gap unaddressed.'
  },
  'plt5622-ch-08-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Shifting Sixth-Grade Writing from Holistic Scores to Analytic Rubrics',
    clinicalDescription:
      'Sixth graders receive only a single holistic score out of 100 on persuasive essays with "Good effort, add detail" at the top. During peer review, partners write "Looks great!" without inspecting claim clarity, cited evidence, or counterarguments, and revision drafts barely change.',
    diagnosis:
      'Co-construct an analytic rubric with clear level descriptors, model evidence-based peer feedback stems, and guide portfolio self-assessment.',
    explanation:
      'Analytic rubrics break complex writing into transparent criteria that help students diagnose specific strengths and gaps, deliver actionable peer feedback, and document growth across portfolio drafts. Vague holistic numbers and unguided peer compliments yield minimal metacognitive revision.'
  },
  'plt5622-ch-09-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Upholding Multiple Measures and Fairness in Gifted-Service Decisions',
    clinicalDescription:
      'A school review committee proposes exiting a multilingual fourth grader from gifted-enrichment services solely because her score dipped on one timed, culturally narrow verbal screening test, even though her math problem-solving portfolio, science investigations, and classroom observations show advanced reasoning.',
    diagnosis:
      'Advocate for a multiple-measures body of evidence, flag potential linguistic and cultural item bias, and share balanced growth data with her family.',
    explanation:
      'Measurement fairness and validity prohibit high-stakes placement decisions grounded in a single timed test susceptible to construct-irrelevant language or cultural variance. Triangulating standardized data with authentic portfolios and accessible family communication ensures equitable, defensible decisions.'
  },
  'plt5622-ch-10-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Refocusing a Fifth-Grade PLC on Peer Observation and Student Work',
    clinicalDescription:
      'Fifth-grade math scores dip after adopting a new conceptual curriculum, yet weekly PLC meetings stall into venting about student motivation instead of inspecting instructional choices. One veteran proposes hiring an outside speaker for a single afternoon lecture to boost scores.',
    diagnosis:
      'Launch a job-embedded PLC inquiry cycle featuring peer lesson observations, structured student-work analysis, and iterative scaffolding adjustments.',
    explanation:
      'Sustained job-embedded professional learning anchored in collaborative analysis of student evidence and peer classroom observation drives measurable instructional improvement. Deficit-focused venting and one-off external talks rarely change daily questioning, modeling, or student outcomes.'
  },
  'plt5622-ch-11-section-03': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Aligning Specialists and Fading Paraeducator Prompts in Third Grade',
    clinicalDescription:
      'A third grader with a reading IEP and behavior plan receives pull-out literacy support, occupational therapy sensory breaks, and push-in math paraeducator assistance. Providers use conflicting verbal cues, and the paraeducator sits beside the child nonstop, triggering prompt dependence and peer isolation.',
    diagnosis:
      'Convene a brief multidisciplinary alignment huddle to unify cues, coach the paraeducator on systematic prompt fading, and coordinate family updates.',
    explanation:
      'Effective collaboration aligns specialist routines with core classroom expectations while training paraeducators to fade adult proximity so students build authentic independence and peer belonging. Contradictory cueing and constant hovering fragment skill generalization and foster learned helplessness.'
  },
  'plt5622-ch-12-section-04': {
    ...APPLIED_CLASSROOM_CASE_LABELS,
    title: 'Verifying Local Law, FERPA Privacy, and Lockdown Protocol in Sixth Grade',
    clinicalDescription:
      'A sixth-grade teacher newly relocated from another state assumes her former state\'s copyright rules, medical field-trip forms, and 48-hour abuse-reporting window still apply. During a lockdown drill, she leaves student IEP folders open on her desk and cracks the door to inspect hallway noise.',
    diagnosis:
      'Follow site lockdown procedures without opening doors, lock confidential IEP files under FERPA, and verify current state and district legal mandates.',
    explanation:
      'Professional safety and legal compliance vary across jurisdictions and require strict execution of site emergency procedures, secure FERPA handling of disability records, and verified state reporting timelines. Relying on out-of-state assumptions or casual drill habits endangers students and breaches law.'
  }
};

module.exports = {
  plt_early_childhood_5621,
  plt_k6_5622
};
